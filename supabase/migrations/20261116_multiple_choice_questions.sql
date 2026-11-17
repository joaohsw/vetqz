-- Migração aditiva: adiciona suporte a modo de questões na sessão e questões de múltipla escolha.
-- Registros anteriores permanecem válidos com padrão descritivo.

alter table public.study_sessions
  add column if not exists question_mode text not null default 'descriptive'
    check (question_mode in ('descriptive', 'multiple_choice', 'mixed'));

alter table public.quiz_sessions
  add column if not exists question_type text not null default 'descriptive'
    check (question_type in ('descriptive', 'multiple_choice')),
  add column if not exists options jsonb,
  add column if not exists correct_option_id text,
  add column if not exists selected_option_id text;
