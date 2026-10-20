# Auditoria das médias de estudo

Resumo e histórico usam a apuração persistida do backend. A média considera uma
avaliação vigente por posição válida da sessão, incluindo zero, e exclui notas
ausentes, não finitas ou fora de 0 a 10. O denominador é a quantidade dessas notas,
nunca o total planejado. Sem notas, a média é `null`. O backend usa Decimal e
ROUND_HALF_UP para uma casa decimal; as telas apenas formatam por idioma.

O resumo consulta `/api/study-sessions/{id}` depois da conclusão. Falhas nessa
consulta mantêm a tela de respostas e permitem repetir a operação. Ao editar,
a nota persistida continua vigente até o novo salvamento; a sessão não pode ser
finalizada com edição pendente. O menu de conta é desmontado ao fechar e consulta
novamente o histórico a cada abertura; não foi necessário mudar esse ciclo.

Duplicatas por posição são selecionadas por `updated_at`, com fallback para
`created_at`, e desempate pelo ID. A contagem de registros substituídos fica
explícita em `superseded_attempt_count`; nenhum registro é apagado. Sem uma data
de atualização antiga, esse critério é determinístico, mas não prova qual foi a
última edição histórica. Tentativas sem posição válida ficam disponíveis em
`legacy_unplaced_attempts`, fora da média, com aviso nas duas telas. Não há uma
associação segura dessas respostas com as questões atuais.

A leitura das tentativas percorre páginas de 200 linhas com ordenação por ID.
Isso resolve truncamento por limite de resposta, sem oferecer snapshot transacional
entre páginas em caso de alterações concorrentes.

## Migração

Aplicar `supabase/migrations/20261020_quiz_attempt_updated_at.sql` antes de publicar
o backend: a consulta passa a selecionar a nova coluna. A migração adiciona uma
coluna anulável e um trigger para novos inserts/updates, sem backfill ou exclusão.
Não recupera datas de edição que nunca foram registradas. Ela não foi executada
em produção por esta auditoria.

## Evidências e regressões

As causas confirmadas no código anterior eram a agregação de todas as linhas no
histórico versus uma entrada por posição na restauração do frontend e as regras
independentes `round`/`toFixed` (por exemplo, 2,25). A remoção local ao começar uma
edição também fazia o conjunto local divergir do persistido. O risco de limite de
resposta foi reproduzido com um mock paginado; não houve inspeção do banco real.

O contrato em `docs/examples/study-metrics-contract.json` é conferido pelo teste
do endpoint (inclusive o bloco `revised`: troca de 0 por 9 → 8,7 com três
respondidas, mantendo ID e posição) e consumido pelos testes de interface das
duas telas, inclusive num fluxo retomado fora de ordem com edição salva. Os testes cobrem
zero, substituição, sessões parciais, arredondamento, duplicatas, paginação,
isolamento por usuário/sessão e retomada. Os mocks de consulta agora aplicam
ordenação, limite e intervalo em vez de ignorar essas operações.
