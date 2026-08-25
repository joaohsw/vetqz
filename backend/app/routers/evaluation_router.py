"""
Evaluation Router — endpoint de avaliação de respostas via Gemini.

Suporta dois modos:
1. Texto: O aluno envia a resposta digitada (JSON body).
2. Áudio: O aluno envia um arquivo de áudio (multipart/form-data).
   - No MVP, o áudio é armazenado e o aluno deve também fornecer texto.
   - Futuramente, integrar transcrição automática (Whisper/Gemini).

SEGURANÇA:
- Validação de MIME type e tamanho do áudio.
- Delimitadores XML nos prompts do Gemini.
"""

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.config import settings
from app.schemas.evaluation import EvaluateAnswerRequest, EvaluateAnswerResponse
from app.services.gemini_service import evaluate_answer
from app.services.supabase_client import get_supabase_client
from app.services.storage_service import upload_audio

router = APIRouter()

# MIME types válidos para áudio
ALLOWED_AUDIO_TYPES = {"audio/webm", "audio/wav", "audio/mp4", "audio/mpeg", "audio/ogg"}


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
        # Validação de MIME type
        if audio.content_type not in ALLOWED_AUDIO_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Formato de áudio não suportado: {audio.content_type}. "
                       f"Formatos aceitos: {', '.join(ALLOWED_AUDIO_TYPES)}",
            )

        # Validação de tamanho
        audio_bytes = await audio.read()
        if len(audio_bytes) > settings.max_audio_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Áudio excede o limite de {settings.max_audio_size_mb}MB.",
            )

        # Upload ao Storage
        try:
            audio_path = upload_audio(audio_bytes, audio.content_type or "audio/webm")
        except Exception as e:
            # Não bloqueia a avaliação se o upload falhar
            print(f"⚠️ Erro ao salvar áudio no Storage: {e}")

    # --- AVALIAÇÃO VIA GEMINI ---
    try:
        gemini_result = await evaluate_answer(
            question=question,
            reference_answer=reference_answer,
            student_answer=student_answer,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erro ao avaliar resposta com o Gemini: {str(e)}",
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
