"""Testes offline: credenciais fictícias, nenhum serviço externo é utilizado."""

import os

os.environ["SUPABASE_URL"] = "https://offline-test.supabase.co"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "offline-test-key"
os.environ["GEMINI_API_KEY"] = "offline-test-key"
