import assert from 'node:assert/strict';
import test from 'node:test';
import { createTopicLoader } from '../src/lib/topic-loader.js';

test('restauração usa assuntos salvos e revalida a versão no servidor', async () => {
  const saved = { topics: [{ id: 'topic-1', chunk_indices: [0, 2] }], is_veterinary: false };
  let reads = 0;
  const load = createTopicLoader(async () => { reads += 1; return saved; }, () => assert.fail('análise desnecessária'));
  assert.deepEqual(await load('doc', 'pt-BR', 'user'), saved);
  assert.deepEqual(await load('doc', 'pt-BR', 'user'), saved);
  assert.equal(reads, 2);
});

test('documento antigo ou versão inválida pede análise uma vez durante chamadas concorrentes', async () => {
  let analyses = 0;
  const load = createTopicLoader(async () => null, async (id, language) => {
    analyses += 1;
    return { id, language, topics: [] };
  });
  const results = await Promise.all([load('doc', 'es-CL', 'user'), load('doc', 'es-CL', 'user')]);
  assert.deepEqual(results[0], results[1]);
  assert.equal(analyses, 1);
  assert.equal(results[0].language, 'es-CL');
});

test('usuários e idiomas não compartilham requisições pendentes', async () => {
  let reads = 0;
  const load = createTopicLoader(async () => { reads += 1; return {}; }, () => assert.fail());
  await Promise.all([load('doc', 'pt-BR', 'a'), load('doc', 'es-CL', 'a'), load('doc', 'pt-BR', 'b')]);
  assert.equal(reads, 3);
});

test('falha na consulta não dispara análise e permite tentar novamente', async () => {
  let reads = 0;
  const load = createTopicLoader(async () => {
    if (++reads === 1) throw new Error('unauthorized');
    return { topics: [] };
  }, () => assert.fail());
  await assert.rejects(load('doc', 'pt-BR', 'user'), /unauthorized/);
  assert.deepEqual(await load('doc', 'pt-BR', 'user'), { topics: [] });
});
