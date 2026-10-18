# Autenticação do vetQz

O frontend usa Supabase Auth para manter dois tipos de sessão:

- novos usuários criam uma conta com e-mail e senha;
- usuários permanentes entram com e-mail e senha;
- convidados entram como usuários anônimos do Supabase.

Uma sessão anônima possui `user.id` e access token próprios, mas não pode ser recuperada depois que o usuário sai, limpa os dados do navegador ou troca de dispositivo. Usuários anônimos assumem o papel `authenticated`; quando uma policy precisar diferenciá-los, use o claim `is_anonymous` do JWT.

## Configuração no Supabase

1. Em **Authentication > Providers**, mantenha o provedor de e-mail e a criação de novos usuários habilitados.
2. Defina se o projeto exigirá confirmação de e-mail. Quando habilitada, o usuário recebe uma mensagem e só entra depois de confirmar o cadastro.
3. Em **Authentication > URL Configuration**, defina **Site URL** como `https://vetqz.vercel.app/` e adicione `https://vetqz.vercel.app/` às **Redirect URLs**. Em projetos usados também para desenvolvimento, mantenha `http://localhost:5173/**` apenas como URL adicional, nunca como Site URL de produção.
4. Configure SMTP próprio antes da produção. O serviço de e-mail padrão do Supabase é indicado apenas para testes e possui limites baixos.
5. Em **Authentication > Providers > Anonymous Sign-Ins**, habilite entradas anônimas.
6. Configure CAPTCHA ou Cloudflare Turnstile para cadastro e acesso anônimo, e revise os rate limits antes de disponibilizar o sistema publicamente.
7. Confirme que `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão definidos no ambiente do frontend. Nunca use a service role key no frontend.

O cliente Supabase gerencia a persistência da sessão. Tema e idioma continuam em chaves próprias no `localStorage` e não são removidos no logout.

## Redirecionamento de confirmação

Defina `VITE_SITE_URL=https://vetqz.vercel.app` no frontend e reconstrua o bundle.
O cadastro envia essa origem em `emailRedirectTo`. Sem a variável, builds de
produção usam o domínio canônico acima; em desenvolvimento, usam a origem local.
URLs locais, inválidas ou sem HTTPS não são aceitas como destino de produção.

Isso **não altera o painel do Supabase**: uma URL fora da allowlist pode cair na
Site URL configurada pelo provedor. Definir `SITE_URL` no `.env` do FastAPI não
configura o Supabase hospedado. As chaves `anon` e `service_role` não substituem
acesso ao painel ou um token da Management API para essa alteração.

No template de confirmação, mantenha o link de verificação `{{ .ConfirmationURL }}`;
remova URLs localhost fixas. Templates personalizados devem respeitar
`{{ .RedirectTo }}` após validar o token. Valide com um novo cadastro e um novo
e-mail após alterar o painel; mensagens já emitidas não são reescritas.

Referência: https://supabase.com/docs/guides/auth/redirect-urls

## Autorização da API

O frontend envia o access token no header `Authorization`. As rotas de estudo
usam `require_current_user`, que valida a sessão no Supabase, e filtram documentos,
sessões e tentativas por `user_id`. O backend usa `service_role`, portanto esses
filtros de propriedade devem permanecer em todas as operações. Essa chave fica
exclusivamente no ambiente do backend.

O upload direto usa a sessão do aluno e as policies de `upload_intents`/Storage
da migration de retenção. A migration precisa estar aplicada também para
convidados, que recebem o papel `authenticated` com identidade própria.
