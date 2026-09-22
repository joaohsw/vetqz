-- Cache no próprio documento: herda propriedade, RLS e retenção existentes.
-- NULL representa documentos anteriores à migration, ainda não analisados.
alter table public.documents
  add column if not exists topic_analysis jsonb,
  add column if not exists topic_analysis_lock_id uuid,
  add column if not exists topic_analysis_lock_until timestamptz;

comment on column public.documents.topic_analysis is
  'Mapa de assuntos com version, processing_version, chunks_sha256, is_veterinary e topics com traduções pt-BR/es-CL e índices compartilhados.';

-- Lease atômico evita análise simultânea em diferentes workers/serverless.
-- Invoker e execução exclusiva pelo backend; nenhuma policy RLS é alterada.
create or replace function public.claim_topic_analysis(
  document_id uuid, owner_id uuid, lock_id uuid
) returns boolean
language sql
security invoker
set search_path = ''
as $$
  with claimed as (
    update public.documents
    set topic_analysis_lock_id = lock_id,
        topic_analysis_lock_until = now() + interval '120 seconds'
    where id = document_id and user_id = owner_id
      and (topic_analysis_lock_until is null or topic_analysis_lock_until < now())
    returning id
  )
  select exists (select 1 from claimed);
$$;

revoke all on function public.claim_topic_analysis(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_topic_analysis(uuid, uuid, uuid) to service_role;
