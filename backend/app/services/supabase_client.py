"""
Supabase Client — conexão segura usando service role key.

SEGURANÇA:
- A service_role_key bypassa RLS e tem acesso total ao banco.
- Este client deve ser usado APENAS no backend, nunca exposto ao frontend.
- O frontend usa a anon_key com RLS habilitado.
"""

from functools import lru_cache

from supabase import create_client, Client

from app.config import settings


@lru_cache
def get_supabase_client() -> Client:
    """
    Retorna um client Supabase singleton com service role privileges.
    Cacheado para reusar a conexão entre requests.
    """
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )
