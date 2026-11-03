"""Dependência de autenticação para endpoints que manipulam dados do aluno."""

from fastapi import Header, HTTPException, Query, status

from app.localization import api_message, resolve_language
from app.services.supabase_client import get_supabase_client


def require_current_user(
    authorization: str | None = Header(default=None),
    accept_language: str | None = Header(default=None),
    language: str | None = Query(default=None),
) -> str:
    """Valida o JWT do Supabase e retorna o UUID do usuário autenticado."""
    resolved_language = resolve_language(language, accept_language)
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=api_message(resolved_language, "auth_required"),
        )

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=api_message(resolved_language, "invalid_session"),
        )

    try:
        response = get_supabase_client().auth.get_user(token)
        user = response.user if response else None
    except Exception:
        user = None

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=api_message(resolved_language, "expired_session"),
        )

    return str(user.id)
