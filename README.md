# vetQz

> Plataforma gamificada de trivia e avaliação oral para estudantes de Anatomia Veterinária, baseada em IA.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite + TailwindCSS |
| Backend | Python 3.11+ / FastAPI |
| Database | Supabase (PostgreSQL) |
| IA | Google Gemini 3.5 Flash-Lite |

## Estrutura

```
vetqz/
├── backend/           # API FastAPI
│   ├── app/
│   │   ├── schemas/   # Modelos Pydantic
│   │   ├── services/  # Lógica de negócio
│   │   └── routers/   # Endpoints
│   ├── main.py
│   └── index.py       # Entrypoint da Vercel
└── frontend/          # React + Vite
    └── src/
        ├── components/
        ├── hooks/
        ├── lib/
        └── pages/
```

## Licença

MIT
