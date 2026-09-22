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

## Processamento de PDFs e cache de assuntos

O limite padrão continua em **25 MB** no frontend e no backend
(`MAX_PDF_SIZE_MB` permanece configurável). O PDF vai somente para o Storage
privado; o Gemini recebe texto. Nenhum modelo, plano pago ou serviço novo foi
adicionado. A geração de perguntas continua recebendo apenas o chunk escolhido,
com validação da citação e referência à página original.

Antes de iniciar esta versão da API, aplique também
[`20260922_document_topic_analysis.sql`](supabase/migrations/20260922_document_topic_analysis.sql)
no Supabase, após a migration de retenção. Ela adiciona `documents.topic_analysis`
como JSONB nullable e um lease de análise. As políticas RLS existentes não são
alteradas; leituras e gravações da API continuam filtradas por documento e usuário.
O RPC do lease só pode ser executado pelo `service_role` do backend.
A migration não é executada automaticamente pela aplicação.

- **Cache bilíngue:** uma chamada pede assuntos em `pt-BR` e `es-CL`. Cada assunto
  tem um único ID e conjunto de `chunk_indices`, compartilhado pelas traduções.
  O JSONB guarda `is_veterinary`, idiomas, versões e SHA-256 dos chunks.
  Veja o [exemplo de formato](docs/examples/topic-analysis.json).
- **Validação no servidor:** `POST /api/analyze-topics` mantém o contrato
  `{ topics, is_veterinary }`, retornando somente o idioma solicitado. Ele consulta
  e valida o cache antes de chamar o Gemini, inclusive quando o frontend pede
  análise diretamente. Documentos antigos com cache ausente/NULL e chunks de texto
  continuam aceitos; seus chunks não são regravados nem reordenados.
- **Restauração:** `GET /api/documents/{document_id}/topics?language=pt-BR` retorna
  o mesmo formato ou `null` quando não há resultado válido naquele idioma. Nunca
  chama IA. O frontend usa essa consulta ao restaurar materiais ou continuar
  sessões e só faz POST em caso de miss. Consultas simultâneas no navegador são
  compartilhadas por usuário, documento e idioma; resultados não ficam em um
  cache local permanente que poderia ignorar uma mudança de versão.
- **Tradução ausente:** o POST traduz apenas os títulos e resumos faltantes.
  Os índices são preservados pelo código. Se a tradução falhar, retorna erro e
  mantém a análise original salva para permitir nova tentativa sem reenviar o PDF.
- **Concorrência:** um lease atômico no Supabase evita análises simultâneas entre
  workers. Expira em 120 segundos; a chamada à IA tem prazo total de 90 segundos.
  Uma requisição concorrente aguarda até 20 segundos por um resultado salvo e,
  se necessário, recebe HTTP 503 com `Retry-After: 2`. Falhas liberam o lease;
  uma instância encerrada inesperadamente deixa o lease expirar.

Para invalidar mapas após alterações de limpeza/chunking, incremente
`PDF_PROCESSING_VERSION` em `pdf_service.py`. Para alterações no prompt ou no
formato de análise, incremente `TOPIC_ANALYSIS_VERSION` em `topic_cache.py`.
Uma mudança no texto/ordem/páginas/offsets dos chunks também invalida o cache pelo
hash. A invalidação é preguiçosa: a próxima solicitação recalcula o mapa. Chunks
legados permanecem intactos para preservar citações e sessões existentes.

### Limpeza e chunking

A limpeza é determinística e conservadora. Remove margens curtas repetidas em
pelo menos três páginas e 60% das páginas não vazias; números de página isolados
nas extremidades; excesso de espaços/quebras; páginas e parágrafos longos
exatamente duplicados; e sumários com estrutura reconhecível. Páginas vazias ficam
como posições vazias na extração, preservando a numeração original dos chunks.

Soft hyphens são removidos. Para hifenização de fim de linha com hífen comum,
a palavra é reunida sem hífen quando a forma inteira também aparece no material;
em casos ambíguos, a quebra é retirada e o hífen é preservado. Essa escolha evita
alterar compostos anatômicos. Definições curtas repetidas, números no corpo,
listas/tabelas e usos acadêmicos de “índice” não são tratados como ruído.

Os chunks buscam aproximadamente 1.000 caracteres, preferindo limites de
parágrafos e frases próximos do alvo (70–120%). Frases excepcionalmente longas
podem ser divididas entre palavras; palavras nunca são partidas. O overlap é de
até 200 caracteres em frases completas quando útil à continuidade do parágrafo,
sem atravessar páginas. Novos chunks guardam `page_number`, `start_char` e
`end_char`. Para assuntos, offsets ou coincidências exatas em chunks legados
removem overlap comprovado. Trechos duplicados são enviados uma vez com seus
índices originais agrupados; índices não são renumerados.

### Validação local e estimativa de tokens

Os testes usam doubles locais de Supabase/Gemini, sem consumir cotas ou chamar
serviços externos. Não verificam a aplicação da migration em um banco remoto.
Com as dependências de `backend/requirements.txt` instaladas:

```powershell
cd backend
.\venv\Scripts\python.exe -m unittest discover -s tests -v
.\venv\Scripts\python.exe -m tests.benchmark_pdf_processing
cd ../frontend
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run build
npm run lint
```

Em Linux/macOS, substitua `.\venv\Scripts\python.exe` pelo Python do ambiente
virtual. Não há novas variáveis de ambiente obrigatórias.

O benchmark reproduzível usa **15 páginas sintéticas**, incluindo margens,
sumário, página vazia e uma página duplicada. O texto de entrada cai de 32.318
para 24.240 caracteres (**25,0%**); usando a aproximação de quatro caracteres por
token, de 8.080 para 6.060 tokens. Produzir os dois idiomas com uma única análise
reduz esse texto em **62,5%** frente a duas análises antigas. Em cache hits,
o consumo do Gemini é **zero**. Apenas retirar o overlap fixo antigo aproxima-se
de 20% de economia em textos longos. A economia real depende do PDF; os números
não incluem instruções, marcadores dos trechos nem tokens de saída bilíngue e
não foram medidos com o tokenizer do Gemini.

## Licença

MIT
