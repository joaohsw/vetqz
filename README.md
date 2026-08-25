# 🐾 vetQz

> Plataforma gamificada de trivia e avaliação oral para estudantes de Anatomia Veterinária, baseada em IA.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite + TailwindCSS |
| Backend | Python 3.11+ / FastAPI |
| Database | Supabase (PostgreSQL) |
| IA | Google Gemini 3.5 Flash-Lite |

## Pré-requisitos

- **Node.js** 18+ e **npm** 9+
- **Python** 3.11+
- Conta no **Supabase** (projeto criado)
- **Google AI Studio** API Key (Gemini)

## Setup

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/vetqz.git
cd vetqz
```

### 2. Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edite o .env com suas credenciais

uvicorn main:app --reload
```

O backend estará em `http://localhost:8000`. Docs interativos em `/docs`.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edite o .env com suas credenciais

npm run dev
```

O frontend estará em `http://localhost:5173`.

## Estrutura

```
vetqz/
├── backend/           # API FastAPI
│   ├── app/
│   │   ├── schemas/   # Modelos Pydantic
│   │   ├── services/  # Lógica de negócio
│   │   └── routers/   # Endpoints
│   └── main.py
└── frontend/          # React + Vite
    └── src/
        ├── components/
        ├── hooks/
        ├── lib/
        └── pages/
```

## Licença

MIT
