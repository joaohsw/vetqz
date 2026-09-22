/** Consulta o servidor em cada restauração; compartilha apenas chamadas em andamento. */
export function createTopicLoader(readSaved, analyze) {
  const pending = new Map();
  return function loadTopics(documentId, language, userId) {
    const key = JSON.stringify([userId, documentId, language]);
    if (!pending.has(key)) {
      const request = Promise.resolve()
        .then(() => readSaved(documentId, language))
        .then((saved) => saved ?? analyze(documentId, language))
        .finally(() => pending.delete(key));
      pending.set(key, request);
    }
    return pending.get(key);
  };
}
