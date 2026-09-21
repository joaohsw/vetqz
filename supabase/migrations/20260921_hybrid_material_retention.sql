-- Migração aditiva: cria campos e índices sem editar nem excluir registros atuais.
-- PDFs e áudios novos são temporários; o histórico pedagógico é preservado.

alter table public.documents
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz,
  add column if not exists original_size_bytes bigint;

alter table public.quiz_sessions
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists document_id uuid references public.documents(id) on delete set null,
  add column if not exists source_excerpt text,
  add column if not exists source_page integer check (source_page is null or source_page >= 1),
  add column if not exists audio_expires_at timestamptz;

create index if not exists documents_user_expires_at_idx
  on public.documents (user_id, expires_at desc);
create index if not exists documents_expiration_idx
  on public.documents (expires_at)
  where expires_at is not null;
create index if not exists quiz_sessions_user_id_idx
  on public.quiz_sessions (user_id);
create index if not exists quiz_sessions_audio_expiration_idx
  on public.quiz_sessions (audio_expires_at)
  where audio_path is not null and audio_expires_at is not null;
create index if not exists quiz_sessions_document_id_idx
  on public.quiz_sessions (document_id);
