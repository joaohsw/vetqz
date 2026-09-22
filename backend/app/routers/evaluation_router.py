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

import json
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.config import settings
from app.localization import api_message
from app.schemas.evaluation import EvaluateAnswerResponse
from app.schemas.difficulty import DEFAULT_DIFFICULTY, Difficulty
from app.schemas.language import DEFAULT_LANGUAGE, SupportedLanguage
from app.services.gemini_service import evaluate_answer
from app.services.auth_service import require_current_user
from app.services.pdf_service import normalize_document_chunks, validate_source_excerpt
from app.services.supabase_client import get_supabase_client
from app.services.storage_service import delete_audio, upload_audio

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


def get_source_reference(
    document_id: str | None,
    chunk_index: int | None,
    source_excerpt: str | None,
    user_id: str,
) -> dict | None:
    """Recupera a fonte diretamente do documento, sem confiar no cliente."""
    if not document_id:
        return None

    try:
        supabase = get_supabase_client()
        result = (
            supabase.table("documents")
            .select("chunks")
            .eq("id", document_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not result.data:
            return None
        raw_chunks = result.data[0]["chunks"]
        raw_chunks = json.loads(raw_chunks) if isinstance(raw_chunks, str) else raw_chunks
        chunks = normalize_document_chunks(raw_chunks)
        if chunk_index is not None and 0 <= chunk_index < len(chunks):
            chunk = chunks[chunk_index]
            return {
                "excerpt": validate_source_excerpt(source_excerpt, str(chunk["text"])),
                "page_number": chunk["page_number"],
            }

        # Questões recuperadas do histórico não guardavam o índice do trecho,
        # mas guardam uma citação curta. Localizamos a citação no PDF do aluno
        # para manter a fonte confiável ao refazer a mesma questão.
        if source_excerpt:
            normalized_excerpt = " ".join(source_excerpt.split()).casefold()
            for chunk in chunks:
                chunk_text = str(chunk["text"])
                normalized_chunk_text = " ".join(chunk_text.split()).casefold()
                if normalized_excerpt in normalized_chunk_text:
                    return {
                        "excerpt": validate_source_excerpt(source_excerpt, chunk_text),
                        "page_number": chunk["page_number"],
                    }
        return None
    except Exception as error:
        print(f"[vetQz] Unable to load source reference: {error}")
        return None


def get_owned_study_session(study_session_id: str | None, user_id: str) -> str | None:
    """Aceita somente uma sessão que pertença ao aluno que está respondendo."""
    if not study_session_id:
        return None

    result = (
        get_supabase_client()
        .table("study_sessions")
        .select("id")
        .eq("id", study_session_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sessão de estudo não encontrada.",
        )
    return result.data[0]["id"]


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
    difficulty: Difficulty = Form(DEFAULT_DIFFICULTY),
    document_id: str | None = Form(None),
    chunk_index: int | None = Form(None),
    source_excerpt: str | None = Form(None),
    study_session_id: str | None = Form(None),
    topic_title: str | None = Form(None),
    question_position: int | None = Form(None),
    retry_attempt_id: str | None = Form(None),
    audio: UploadFile | None = File(None),
    user_id: str = Depends(require_current_user),
):
    """
    Pipeline de avaliação:
    1. (Opcional) Valida e salva o áudio no Storage.
    2. Envia question + reference_answer + student_answer ao Gemini.
    3. Persiste a sessão na tabela quiz_sessions.
    4. Retorna score, feedback e model_answer.
    """
    audio_path = None
    source = get_source_reference(document_id, chunk_index, source_excerpt, user_id)
    if question_position is not None and question_position < 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A posição da pergunta deve começar em 1.",
    )
    owned_study_session_id = get_owned_study_session(study_session_id, user_id)
    previous_attempt = None
    if retry_attempt_id:
        retry_result = (
            get_supabase_client()
            .table("quiz_sessions")
            .select("id, study_session_id, audio_path")
            .eq("id", retry_attempt_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not retry_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="A tentativa que você quer refazer não foi encontrada.",
            )
        previous_attempt = retry_result.data[0]
        if not owned_study_session_id or previous_attempt.get("study_session_id") != owned_study_session_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A tentativa não pertence à sessão de estudo informada.",
            )

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
            difficulty=difficulty,
        )
    except Exception as e:
        if audio_path:
            try:
                delete_audio(audio_path)
            except Exception:
                pass
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=api_message(language, 'answer_evaluation', error=str(e)),
        )

    # --- PERSISTÊNCIA DA SESSÃO ---
    try:
        supabase = get_supabase_client()
        session_document_id = document_id if source else None
        attempt_data = {
            "user_id": user_id,
            "document_id": session_document_id,
            "study_session_id": owned_study_session_id,
            "topic_title": topic_title,
            "question_position": question_position,
            "question": question,
            "reference_answer": reference_answer,
            "student_answer": student_answer,
            "score": gemini_result.get("score", 0),
            "feedback": gemini_result.get("feedback", ""),
            "model_answer": gemini_result.get("model_answer", ""),
            "audio_path": audio_path,
            "audio_expires_at": (
                (datetime.now(UTC) + timedelta(days=settings.material_retention_days)).isoformat()
                if audio_path else None
            ),
            "source_excerpt": source["excerpt"] if source else None,
            "source_page": source["page_number"] if source else None,
        }
        if retry_attempt_id:
            (
                supabase.table("quiz_sessions")
                .update(attempt_data)
                .eq("id", retry_attempt_id)
                .eq("user_id", user_id)
                .execute()
            )
            previous_audio_path = previous_attempt.get("audio_path") if previous_attempt else None
            if previous_audio_path and previous_audio_path != audio_path:
                try:
                    delete_audio(previous_audio_path)
                except Exception:
                    pass
        else:
            supabase.table("quiz_sessions").insert(attempt_data).execute()
    except Exception as e:
        if audio_path:
            try:
                delete_audio(audio_path)
            except Exception:
                pass
        # Não bloqueia o retorno se a persistência falhar
        print(f"⚠️ Erro ao salvar sessão no banco: {e}")

    return EvaluateAnswerResponse(
        score=gemini_result.get("score", 0),
        feedback=gemini_result.get("feedback", ""),
        strengths=gemini_result.get("strengths", []),
        improvements=gemini_result.get("improvements", []),
        next_step=gemini_result.get("next_step", ""),
        model_answer=gemini_result.get("model_answer", ""),
        source=source,
    )
