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

## Retenção de materiais

O vetQz mantém PDFs e gravações de áudio por sete dias. O PDF é enviado pelo
navegador diretamente ao Supabase Storage, sem passar pelo limite de 4,5 MB da
Vercel. O histórico da sessão
(pergunta, nota, feedback, resposta-modelo e fonte) continua disponível, sem
reter o arquivo original. A limpeza automática é configurada em
`backend/vercel.json` e requer a variável de ambiente `CRON_SECRET` na Vercel.

Antes de publicar esta versão, execute a migration
`supabase/migrations/20260921_hybrid_material_retention.sql` no SQL Editor do
Supabase. Ela apenas adiciona campos e índices para propriedade do material e
prazo de expiração, além das políticas de upload direto; não edita nem remove
registros existentes.

## Licença

MIT
