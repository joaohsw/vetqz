-- Migração aditiva: cria campos e índices sem editar nem excluir registros atuais.
-- PDFs e áudios novos são temporários; o histórico pedagógico é preservado.

alter table public.documents
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz,
  add column if not exists original_size_bytes bigint;

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  document_filename text not null,
  topic_titles jsonb not null default '[]'::jsonb,
  planned_question_count smallint not null check (planned_question_count between 1 and 20),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  feedback_mode text not null check (feedback_mode in ('immediate', 'final')),
  language text not null check (language in ('pt-BR', 'es-CL')),
  status text not null default 'active' check (status in ('active', 'completed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.quiz_sessions
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists document_id uuid references public.documents(id) on delete set null,
  add column if not exists study_session_id uuid references public.study_sessions(id) on delete set null,
  add column if not exists topic_title text,
  add column if not exists question_position smallint check (question_position is null or question_position >= 1),
  add column if not exists source_excerpt text,
  add column if not exists source_page integer check (source_page is null or source_page >= 1),
  add column if not exists audio_expires_at timestamptz;

create table if not exists public.upload_intents (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  original_size_bytes bigint not null check (original_size_bytes > 0),
  storage_path text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

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
create index if not exists study_sessions_user_started_at_idx
  on public.study_sessions (user_id, started_at desc);
create index if not exists study_sessions_document_id_idx
  on public.study_sessions (document_id);
create index if not exists quiz_sessions_study_session_id_idx
  on public.quiz_sessions (study_session_id);
create index if not exists upload_intents_user_id_idx
  on public.upload_intents (user_id);
create index if not exists upload_intents_expiration_idx
  on public.upload_intents (expires_at);

alter table public.upload_intents enable row level security;
alter table public.study_sessions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'upload_intents'
      and policyname = 'upload_intents_owner_select'
  ) then
    create policy upload_intents_owner_select on public.upload_intents
      for select to authenticated
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'study_sessions'
      and policyname = 'study_sessions_owner_select'
  ) then
    create policy study_sessions_owner_select on public.study_sessions
      for select to authenticated
      using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'materials_insert_from_upload_intent'
  ) then
    create policy materials_insert_from_upload_intent on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'materials'
        and exists (
          select 1
          from public.upload_intents
          where upload_intents.user_id = (select auth.uid())
            and upload_intents.storage_path = 'materials/' || name
            and upload_intents.expires_at > now()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'materials_update_from_upload_intent'
  ) then
    create policy materials_update_from_upload_intent on storage.objects
      for update to authenticated
      using (
        bucket_id = 'materials'
        and exists (
          select 1 from public.upload_intents
          where upload_intents.user_id = (select auth.uid())
            and upload_intents.storage_path = 'materials/' || name
            and upload_intents.expires_at > now()
        )
      )
      with check (
        bucket_id = 'materials'
        and exists (
          select 1
          from public.upload_intents
          where upload_intents.user_id = (select auth.uid())
            and upload_intents.storage_path = 'materials/' || name
            and upload_intents.expires_at > now()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'materials_select_from_upload_intent'
  ) then
    create policy materials_select_from_upload_intent on storage.objects
      for select to authenticated
      using (
        bucket_id = 'materials'
        and exists (
          select 1
          from public.upload_intents
          where upload_intents.user_id = (select auth.uid())
            and upload_intents.storage_path = 'materials/' || name
            and upload_intents.expires_at > now()
        )
      );
  end if;
end
$$;
