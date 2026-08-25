"""
Configuração centralizada do backend.

Usa pydantic-settings para carregar variáveis de ambiente de forma type-safe.
Todas as credenciais sensíveis ficam exclusivamente no .env do backend.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Variáveis de ambiente do backend.
    
    SEGURANÇA:
    - SUPABASE_SERVICE_ROLE_KEY e GEMINI_API_KEY jamais devem ser
      expostos ao frontend ou logs.
    - ALLOWED_ORIGINS deve conter apenas origens confiáveis.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Supabase
    supabase_url: str
    supabase_service_role_key: str

    # Google Gemini
    gemini_api_key: str

    # CORS — string separada por vírgula, ex: "http://localhost:5173,https://vetqz.com"
    allowed_origins: str = "http://localhost:5173"

    # Limites de upload
    max_pdf_size_mb: int = 15
    max_audio_size_mb: int = 10

    @property
    def allowed_origins_list(self) -> list[str]:
        """Converte a string de origens em lista."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]

    @property
    def max_pdf_size_bytes(self) -> int:
        return self.max_pdf_size_mb * 1024 * 1024

    @property
    def max_audio_size_bytes(self) -> int:
        return self.max_audio_size_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    """Singleton cacheado das settings."""
    return Settings()


# Instância global para imports diretos
settings = get_settings()
