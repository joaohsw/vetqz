"""Dependência de autenticação para endpoints que manipulam dados do aluno."""

from fastapi import Header, HTTPException, status

from app.services.supabase_client import get_supabase_client


def require_current_user(
    authorization: str | None = Header(default=None),
) -> str:
    """Valida o JWT do Supabase e retorna o UUID do usuário autenticado."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação necessária para acessar seus materiais.",
        )

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão inválida. Entre novamente para continuar.",
        )

    try:
        response = get_supabase_client().auth.get_user(token)
        user = response.user if response else None
    except Exception:
        user = None

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão inválida ou expirada. Entre novamente para continuar.",
        )

    return str(user.id)
