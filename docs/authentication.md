# Autenticação do vetQz

O frontend usa Supabase Auth para manter dois tipos de sessão:

- usuários permanentes entram com e-mail e senha;
- convidados entram como usuários anônimos do Supabase.

Uma sessão anônima possui `user.id` e access token próprios, mas não pode ser recuperada depois que o usuário sai, limpa os dados do navegador ou troca de dispositivo. Usuários anônimos assumem o papel `authenticated`; quando uma policy precisar diferenciá-los, use o claim `is_anonymous` do JWT.

## Configuração no Supabase

1. Em **Authentication > Providers**, mantenha o provedor de e-mail habilitado.
2. Em **Authentication > Providers > Anonymous Sign-Ins**, habilite entradas anônimas.
3. Configure CAPTCHA ou Cloudflare Turnstile para o fluxo anônimo e revise os rate limits do projeto antes de disponibilizá-lo publicamente.
4. Confirme que `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão definidos no ambiente do frontend. Nunca use a service role key no frontend.

O cliente Supabase gerencia a persistência da sessão. Tema e idioma continuam em chaves próprias no `localStorage` e não são removidos no logout.

## Limite de segurança atual

O gate de autenticação atual controla a entrada na interface e envia o access token vigente no header `Authorization` das chamadas ao FastAPI. O backend, porém, ainda usa um cliente com `service_role` e não valida esse JWT. Portanto, a API ainda não deve ser considerada protegida por usuário.

Antes de armazenar dados pessoais ou disponibilizar histórico por conta, é obrigatório:

1. validar o JWT do Supabase em todas as rotas protegidas do FastAPI;
2. adicionar `user_id` a `documents` e `quiz_sessions` por migrations versionadas;
3. garantir que buscas por `document_id` também verifiquem o proprietário;
4. criar e testar policies RLS para usuários permanentes e anônimos;
5. reduzir o uso de `service_role` ao mínimo necessário.
