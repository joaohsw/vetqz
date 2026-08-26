"""
Evaluation Router — endpoint de avaliação de respostas via Gemini.

Suporta dois modos:
1. Texto: O aluno envia a resposta digitada.
2. Áudio: O aluno envia um arquivo de áudio (multipart/form-data).
   - O navegador gera uma transcrição editável antes do envio.
   - O backend armazena o áudio e avalia a transcrição revisada.

SEGURANÇA:
- Validação de MIME type e tamanho do áudio.
- Delimitadores XML nos prompts do Gemini.
"""

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.config import settings
from app.localization import api_message
from app.schemas.evaluation import EvaluateAnswerResponse
from app.schemas.language import DEFAULT_LANGUAGE, SupportedLanguage
from app.services.gemini_service import evaluate_answer
from app.services.supabase_client import get_supabase_client
from app.services.storage_service import upload_audio

router = APIRouter()

# MIME types válidos para áudio
ALLOWED_AUDIO_TYPES = {"audio/webm", "audio/wav", "audio/mp4", "audio/mpeg", "audio/ogg"}


def normalize_content_type(content_type: str | None) -> str:
    """Remove parâmetros como ';codecs=opus' antes de validar o MIME type."""
    return (content_type or "").split(";", 1)[0].strip().lower()


async def read_validated_audio(
    audio: UploadFile,
    language: SupportedLanguage,
) -> tuple[bytes, str]:
    """Valida formato/tamanho e retorna os bytes com o MIME normalizado."""
    content_type = normalize_content_type(audio.content_type)
    if content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=api_message(
                language,
                'unsupported_audio',
                content_type=audio.content_type,
                allowed_types=', '.join(sorted(ALLOWED_AUDIO_TYPES)),
            ),
        )

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=api_message(language, 'empty_audio'),
        )

    if len(audio_bytes) > settings.max_audio_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=api_message(language, 'audio_too_large', limit=settings.max_audio_size_mb),
        )

    return audio_bytes, content_type


@router.post(
    "/evaluate-answer",
    response_model=EvaluateAnswerResponse,
    summary="Avalia a resposta do aluno",
    description="Compara a resposta do aluno com a referência usando Gemini e retorna score + feedback.",
)
async def evaluate_answer_endpoint(
    question: str = Form(...),
    reference_answer: str = Form(...),
    student_answer: str = Form(...),
    language: SupportedLanguage = Form(DEFAULT_LANGUAGE),
    audio: UploadFile | None = File(None),
):
    """
    Pipeline de avaliação:
    1. (Opcional) Valida e salva o áudio no Storage.
    2. Envia question + reference_answer + student_answer ao Gemini.
    3. Persiste a sessão na tabela quiz_sessions.
    4. Retorna score, feedback e model_answer.
    """
    audio_path = None

    # --- VALIDAÇÃO E UPLOAD DO ÁUDIO (opcional) ---
    if audio and audio.filename:
        audio_bytes, content_type = await read_validated_audio(audio, language)

        # Upload ao Storage
        try:
            audio_path = upload_audio(audio_bytes, content_type)
        except Exception as e:
            # Não bloqueia a avaliação se o upload falhar
            print(f"⚠️ Erro ao salvar áudio no Storage: {e}")

    # --- AVALIAÇÃO VIA GEMINI ---
    try:
        gemini_result = await evaluate_answer(
            question=question,
            reference_answer=reference_answer,
            student_answer=student_answer,
            language=language,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=api_message(language, 'answer_evaluation', error=str(e)),
        )

    # --- PERSISTÊNCIA DA SESSÃO ---
    try:
        supabase = get_supabase_client()
        supabase.table("quiz_sessions").insert({
            "question": question,
            "reference_answer": reference_answer,
            "student_answer": student_answer,
            "score": gemini_result.get("score", 0),
            "feedback": gemini_result.get("feedback", ""),
            "model_answer": gemini_result.get("model_answer", ""),
            "audio_path": audio_path,
        }).execute()
    except Exception as e:
        # Não bloqueia o retorno se a persistência falhar
        print(f"⚠️ Erro ao salvar sessão no banco: {e}")

    return EvaluateAnswerResponse(
        score=gemini_result.get("score", 0),
        feedback=gemini_result.get("feedback", ""),
        model_answer=gemini_result.get("model_answer", ""),
    )
