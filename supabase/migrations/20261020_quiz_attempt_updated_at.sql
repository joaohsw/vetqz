-- Preserve legacy timestamps; future updates record when the evaluation changed.
alter table public.quiz_sessions add column if not exists updated_at timestamptz;

create or replace function public.touch_quiz_attempt_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

drop trigger if exists quiz_attempt_updated_at on public.quiz_sessions;
create trigger quiz_attempt_updated_at
before insert or update on public.quiz_sessions
for each row execute function public.touch_quiz_attempt_updated_at();
