# Prompt de implementação — login do vetQz

Implemente a página e o fluxo inicial de autenticação do **vetQz** neste repositório.

Antes de alterar qualquer arquivo, leia integralmente o código relacionado e preserve as convenções existentes. Não trate esta tarefa como um mockup isolado: a tela deve funcionar com o Supabase Auth e integrar-se ao ciclo de sessão da aplicação.

## Contexto técnico confirmado

- Frontend: React 19, Vite 8, Tailwind CSS 4, `lucide-react` e `@supabase/supabase-js` 2.x.
- Backend: FastAPI e Supabase/PostgreSQL.
- Não há React Router e a aplicação atual possui uma única área principal. Não instale um roteador apenas para esta tarefa.
- O cliente público do Supabase já existe em `frontend/src/lib/supabase.js` e usa `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- `frontend/src/App.jsx` já controla idioma e tema, com persistência em `localStorage`.
- `frontend/src/components/Layout.jsx` fornece cabeçalho, marca, seletores de tema/idioma e rodapé.
- `frontend/src/i18n.js` centraliza todas as mensagens em `pt-BR` e `es-CL`.
- `frontend/src/index.css` e os componentes atuais definem o design system. Reutilize os tokens e classes existentes; não crie uma identidade visual paralela.
- O backend usa `service_role` e seus endpoints ainda não validam JWT nem isolam registros por usuário. Esta tarefa deve deixar isso claro e não pode afirmar que os dados do backend estão protegidos apenas porque existe uma tela de login.

## Decisão de arquitetura

Use o **Supabase Auth para os dois modos de entrada**:

1. Usuário cadastrado: `supabase.auth.signInWithPassword({ email, password })`.
2. Convidado: `supabase.auth.signInAnonymously()`.

Não implemente o convidado como um booleano em estado local ou como um simples bypass da tela. Uma sessão anônima real fornece um `user.id`, usa o papel `authenticated` do Supabase e permite evoluir depois para RLS e conversão de conta.

No frontend, crie uma camada pequena de autenticação baseada em Context + hook, responsável por:

- recuperar a sessão inicial;
- assinar `supabase.auth.onAuthStateChange`;
- expor `session`, `user`, `isAnonymous`, `isLoading`, `signIn`, `signInAsGuest` e `signOut`;
- cancelar a subscription no cleanup;
- impedir o flash da Home antes de a sessão inicial ser resolvida.

Como não há rotas, faça o gate no nível de `App.jsx`: enquanto carrega, mostre um estado de carregamento coerente; sem sessão, renderize Login; com sessão, renderize Home. Mantenha tema e idioma disponíveis antes e depois da autenticação.

## Escopo funcional obrigatório

Crie `frontend/src/pages/Login.jsx` e os arquivos de autenticação estritamente necessários.

A tela deve conter:

- wordmark/contexto visual consistente com o vetQz, sem duplicar desnecessariamente o cabeçalho que já estiver no `Layout`;
- título e descrição curtos, voltados a estudantes de Anatomia Veterinária;
- formulário com `email` e `password`;
- labels visíveis, `autocomplete="email"` e `autocomplete="current-password"`;
- botão primário "Entrar";
- separador textual "ou";
- botão secundário "Continuar como convidado";
- texto breve e honesto avisando que uma sessão de convidado é temporária e pode ser perdida ao sair, limpar os dados do navegador ou trocar de dispositivo;
- alternância acessível para mostrar/ocultar senha usando ícones `Eye`/`EyeOff`, sem remover a label acessível;
- mensagens de erro junto ao formulário com `role="alert"`;
- estado de loading independente para login e convidado, bloqueando submissão dupla;
- submissão por Enter;
- foco coerente e navegação completa por teclado.

Ao autenticar, a Home deve aparecer sem reload manual. Inclua na área autenticada do cabeçalho uma ação discreta de sair. Para convidados, identifique o estado com texto curto (por exemplo, "Convidado"), sem expor UUID. Ao sair, use `supabase.auth.signOut({ scope: 'local' })` e retorne ao Login.

Inclua autocadastro na mesma página, com alternância clara entre entrar e criar conta, confirmação de senha, mínimo de 8 caracteres e tratamento do fluxo de confirmação por e-mail. Use `supabase.auth.signUp()` e mantenha mensagens neutras que não facilitem enumeração de usuários. Não adicione OAuth ou recuperação de senha nesta entrega, nem crie links ou botões sem comportamento.

## Direção visual obrigatória

Siga a linguagem já documentada no CSS: **Warm Humanist × Modern Tool**.

- Fundo e superfícies: `surface-0`, `surface-1` e `surface-2`.
- Primária: teal; acento gold apenas se houver função clara e de forma comedida.
- Texto: `text-1`, `text-2` e `text-3`.
- Bordas: `border-subtle` e `border-default`.
- Tipografia: Plus Jakarta Sans em títulos e DM Sans no corpo.
- Raios: 12 px nos cards, 8 px em inputs e botões.
- Movimento: somente feedback funcional, `ease-out`, entre 200 e 400 ms; respeite `prefers-reduced-motion` se adicionar nova animação.
- Reutilize `.card`, `.input-field`, `.btn-primary`, `.btn-secondary`, `.spinner`, `.animate-enter` e o focus ring global quando aplicável.
- Não use gradientes, glassmorphism, ilustrações genéricas, emojis, branco/preto puros ou sombras fortes.
- Não transforme a tela em um painel largo. Use uma coluna central legível, aproximadamente `max-w-md`, integrada ao shell `max-w-2xl` existente.
- Em telas pequenas, preserve margens, áreas de toque e a leitura dos controles de idioma/tema; não permita overflow horizontal.
- A tela precisa funcionar igualmente nos temas escuro e claro.

## Internacionalização e texto

Não escreva texto de interface diretamente nos componentes. Adicione uma seção `login` e, se necessário, novas chaves de `layout` em **ambos** os idiomas de `frontend/src/i18n.js`.

Use português brasileiro natural e espanhol chileno natural. Cubra no i18n:

- título, descrição e labels;
- placeholders apenas se agregarem valor, sem substituir labels;
- entrar, continuar como convidado, sair e identificação do convidado;
- separador;
- mostrar/ocultar senha;
- estados de carregamento;
- aviso da sessão temporária;
- validações locais;
- erros de autenticação apresentados ao usuário.

Não exiba mensagens técnicas cruas retornadas pelo Supabase. Mapeie pelo menos credenciais inválidas, email inválido, rate limit, falha de rede e erro desconhecido para mensagens localizadas e seguras. Registre detalhes técnicos somente de forma apropriada para desenvolvimento, sem tokens, senha ou dados sensíveis.

## Regras de estado e segurança

- Valide campos obrigatórios e formato básico do email antes de chamar o Supabase.
- Nunca persista senha manualmente.
- Nunca use nem exponha `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- Não armazene um segundo token ou uma cópia da sessão em uma chave própria de `localStorage`; deixe o cliente Supabase gerenciar a persistência.
- Não apague indiscriminadamente o `localStorage` no logout, pois idioma e tema devem permanecer.
- Se as variáveis públicas do Supabase estiverem ausentes, apresente erro controlado; não deixe a aplicação quebrar silenciosamente.
- A opção anônima precisa estar habilitada no dashboard do Supabase. Documente essa configuração e recomende CAPTCHA/Turnstile e revisão dos limites para evitar abuso.
- Documente que usuários anônimos também usam o papel `authenticated` e devem ser diferenciados pelo claim `is_anonymous` quando futuras policies precisarem disso.

## Limite desta entrega e preparação do backend

O foco desta tarefa é a página de login e o gerenciamento correto da sessão no frontend. Não faça uma migração de banco especulativa sem o schema versionado.

Entretanto, prepare as chamadas de `frontend/src/lib/api.js` para enviar `Authorization: Bearer <access_token>` de forma centralizada e sem quebrar `FormData`. Obtenha o token da sessão vigente no momento da requisição; não o congele no carregamento do módulo.

Registre na documentação técnica um follow-up obrigatório: validar o JWT do Supabase no FastAPI, adicionar `user_id` a `documents` e `quiz_sessions`, eliminar acesso cruzado por `document_id`, criar migrations e policies RLS, e reduzir o uso de `service_role` ao mínimo. Até esse trabalho existir, descreva o gate como controle de acesso da interface, não como proteção completa da API.

## Organização esperada

Prefira uma estrutura pequena e compatível com o projeto, por exemplo:

```text
frontend/src/
  auth/
    AuthContext.jsx
    useAuth.js
  pages/
    Login.jsx
```

Evite componentes excessivamente fragmentados. Extraia apenas o que tiver responsabilidade própria e reutilização real. Preserve o fluxo atual da Home e não mova seu estado sem necessidade.

## Critérios de aceitação

Considere a tarefa concluída somente quando:

1. Uma sessão existente é restaurada sem mostrar o Login brevemente.
2. Sem sessão, o Login aparece dentro da linguagem visual atual.
3. Email/senha corretos autenticam e abrem a Home.
4. Erros de formulário e de autenticação são localizados, acessíveis e não técnicos.
5. "Continuar como convidado" cria uma sessão anônima real e abre a Home.
6. O autocadastro valida e-mail, senha e confirmação e chama `signUp()` sem persistir a senha.
7. Com confirmação de e-mail ativa, a interface orienta o usuário sem revelar se a conta já existe; sem confirmação, a sessão autenticada abre a Home.
8. Loading impede cliques e requests duplicados.
9. Logout local retorna ao Login e preserva idioma e tema.
10. Trocar PT/ES atualiza imediatamente todo o Login.
11. Tema claro/escuro funciona no Login sem cores fora do design system.
12. A interface funciona a partir de 320 px, por teclado e com foco visível.
13. O token atual é enviado ao FastAPI em todas as chamadas da API.
14. `npm run lint` e `npm run build` passam sem novos warnings ou erros.
15. Não há secrets, tokens, senhas ou UUIDs expostos na interface, código ou logs.
16. A documentação lista os passos manuais do Supabase e a pendência de proteção do backend.

## Revisão final obrigatória

Antes de entregar:

- leia o diff completo;
- procure textos hardcoded fora do i18n;
- teste login válido, credencial inválida, convidado, refresh com sessão, logout e troca de idioma/tema;
- confira mobile e desktop nos dois temas;
- execute lint e build;
- relate arquivos alterados, validações executadas, configurações manuais necessárias e riscos que permaneceram;
- não diga que a API está protegida enquanto a validação server-side e o isolamento por usuário não estiverem implementados.
