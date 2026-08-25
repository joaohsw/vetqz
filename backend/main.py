"""
vetQz Backend — FastAPI Application Entrypoint

Configura CORS, registra routers e expõe a aplicação ASGI.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import pdf_router, question_router, evaluation_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle hook — inicializa recursos na startup."""
    print(f"[vetQz] API starting on allowed origins: {settings.allowed_origins_list}")
    yield
    print("[vetQz] API shutting down.")


app = FastAPI(
    title="vetQz API",
    description="API para geração de perguntas e avaliação oral em Anatomia Veterinária",
    version="0.1.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# SEGURANÇA: CORS configurado com origens explícitas.
# Em produção, substituir por domínio real. Nunca usar allow_origins=["*"].
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Registra routers com prefixo /api
app.include_router(pdf_router.router, prefix="/api", tags=["PDF"])
app.include_router(question_router.router, prefix="/api", tags=["Questions"])
app.include_router(evaluation_router.router, prefix="/api", tags=["Evaluation"])


@app.get("/health")
async def health_check():
    """Endpoint de health check."""
    return {"status": "ok", "service": "vetqz-api"}
