/**
 * API Client — wrapper para chamadas ao backend FastAPI.
 *
 * Usa o proxy do Vite em dev (/api → localhost:8000/api).
 * Em produção, usa VITE_API_BASE_URL.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Upload de PDF para o backend.
 * @param {File} file - Arquivo PDF selecionado pelo usuário.
 * @returns {Promise<Object>} - { document_id, filename, num_pages, chunks[] }
 */
export async function uploadPdf(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/api/upload-pdf`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
    throw new Error(error.detail || `Erro ${response.status}`);
  }

  return response.json();
}

/**
 * Gera uma pergunta com base no documento.
 * @param {string} documentId - UUID do documento.
 * @param {number|null} chunkIndex - Índice do chunk (opcional).
 * @returns {Promise<Object>} - { question, reference_answer, chunk_used }
 */
export async function generateQuestion(documentId, chunkIndex = null) {
  const body = { document_id: documentId };
  if (chunkIndex !== null) body.chunk_index = chunkIndex;

  const response = await fetch(`${API_BASE}/api/generate-question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
    throw new Error(error.detail || `Erro ${response.status}`);
  }

  return response.json();
}

/**
 * Avalia a resposta do aluno.
 * @param {Object} params
 * @param {string} params.question - Pergunta apresentada.
 * @param {string} params.referenceAnswer - Resposta de referência.
 * @param {string} params.studentAnswer - Resposta do aluno (texto).
 * @param {Blob|null} params.audioBlob - Gravação de áudio (opcional).
 * @returns {Promise<Object>} - { score, feedback, model_answer }
 */
export async function evaluateAnswer({ question, referenceAnswer, studentAnswer, audioBlob = null }) {
  const formData = new FormData();
  formData.append('question', question);
  formData.append('reference_answer', referenceAnswer);
  formData.append('student_answer', studentAnswer);

  if (audioBlob) {
    formData.append('audio', audioBlob, 'recording.webm');
  }

  const response = await fetch(`${API_BASE}/api/evaluate-answer`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
    throw new Error(error.detail || `Erro ${response.status}`);
  }

  return response.json();
}
