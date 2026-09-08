# Autenticação do vetQz

O frontend usa Supabase Auth para manter dois tipos de sessão:

- novos usuários criam uma conta com e-mail e senha;
- usuários permanentes entram com e-mail e senha;
- convidados entram como usuários anônimos do Supabase.

Uma sessão anônima possui `user.id` e access token próprios, mas não pode ser recuperada depois que o usuário sai, limpa os dados do navegador ou troca de dispositivo. Usuários anônimos assumem o papel `authenticated`; quando uma policy precisar diferenciá-los, use o claim `is_anonymous` do JWT.

## Configuração no Supabase

1. Em **Authentication > Providers**, mantenha o provedor de e-mail e a criação de novos usuários habilitados.
2. Defina se o projeto exigirá confirmação de e-mail. Quando habilitada, o usuário recebe uma mensagem e só entra depois de confirmar o cadastro.
3. Em **Authentication > URL Configuration**, configure a Site URL de produção e adicione `http://localhost:5173/**` às Redirect URLs para desenvolvimento.
4. Configure SMTP próprio antes da produção. O serviço de e-mail padrão do Supabase é indicado apenas para testes e possui limites baixos.
5. Em **Authentication > Providers > Anonymous Sign-Ins**, habilite entradas anônimas.
6. Configure CAPTCHA ou Cloudflare Turnstile para cadastro e acesso anônimo, e revise os rate limits antes de disponibilizar o sistema publicamente.
7. Confirme que `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão definidos no ambiente do frontend. Nunca use a service role key no frontend.

O cliente Supabase gerencia a persistência da sessão. Tema e idioma continuam em chaves próprias no `localStorage` e não são removidos no logout.

## Limite de segurança atual

O gate de autenticação atual controla a entrada na interface e envia o access token vigente no header `Authorization` das chamadas ao FastAPI. O backend, porém, ainda usa um cliente com `service_role` e não valida esse JWT. Portanto, a API ainda não deve ser considerada protegida por usuário.

Antes de armazenar dados pessoais ou disponibilizar histórico por conta, é obrigatório:

1. validar o JWT do Supabase em todas as rotas protegidas do FastAPI;
2. adicionar `user_id` a `documents` e `quiz_sessions` por migrations versionadas;
3. garantir que buscas por `document_id` também verifiquem o proprietário;
4. criar e testar policies RLS para usuários permanentes e anônimos;
5. reduzir o uso de `service_role` ao mínimo necessário.
