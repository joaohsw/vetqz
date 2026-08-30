/**
 * API Client — wrapper para chamadas ao backend FastAPI.
 *
 * Usa o proxy do Vite em dev (/api → localhost:8000/api).
 * Em produção, usa VITE_API_BASE_URL.
 */

import { DEFAULT_LANGUAGE, formatMessage, getTranslations } from '../i18n';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function throwApiError(response, language) {
  const copy = getTranslations(language);
  const error = await response.json().catch(() => ({ detail: copy.api.unknownError }));
  const detail = typeof error.detail === 'string' ? error.detail : copy.api.unknownError;
  throw new Error(
    detail || formatMessage(copy.api.requestError, { status: response.status })
  );
}

/**
 * Upload de PDF para o backend.
 * @param {File} file - Arquivo PDF selecionado pelo usuário.
 * @returns {Promise<Object>} - { document_id, filename, num_pages, chunks[] }
 */
export async function uploadPdf(file, language = DEFAULT_LANGUAGE) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('language', language);

  const response = await fetch(`${API_BASE}/api/upload-pdf`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    await throwApiError(response, language);
  }

  return response.json();
}

/**
 * Identifica os assuntos reais da unidade antes do início da sessão.
 * @returns {Promise<Object>} - { topics: [{ id, title, summary, chunk_indices }] }
 */
export async function analyzeTopics(documentId, language = DEFAULT_LANGUAGE) {
  const response = await fetch(`${API_BASE}/api/analyze-topics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_id: documentId, language }),
  });

  if (!response.ok) {
    await throwApiError(response, language);
  }

  return response.json();
}

/**
 * Gera uma pergunta com base no documento.
 * @param {string} documentId - UUID do documento.
 * @param {number|null} chunkIndex - Índice do chunk (opcional).
 * @returns {Promise<Object>} - { question, reference_answer, chunk_used }
 */
export async function generateQuestion(documentId, {
  chunkIndex = null,
  chunkIndices = null,
  topicTitle = null,
  language = DEFAULT_LANGUAGE,
} = {}) {
  const body = { document_id: documentId, language };
  if (chunkIndex !== null) body.chunk_index = chunkIndex;
  if (chunkIndices !== null) body.chunk_indices = chunkIndices;
  if (topicTitle) body.topic_title = topicTitle;

  const response = await fetch(`${API_BASE}/api/generate-question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    await throwApiError(response, language);
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
 * @param {string} params.documentId - Documento que originou a pergunta.
 * @param {number} params.chunkIndex - Trecho usado para gerar a pergunta.
 * @param {string} params.sourceExcerpt - Citação curta usada para fundamentar a pergunta.
 * @returns {Promise<Object>} - nota, feedback estruturado, resposta-modelo e fonte.
 */
export async function evaluateAnswer({
  question,
  referenceAnswer,
  studentAnswer,
  audioBlob = null,
  documentId = null,
  chunkIndex = null,
  sourceExcerpt = null,
  language = DEFAULT_LANGUAGE,
}) {
  const formData = new FormData();
  formData.append('question', question);
  formData.append('reference_answer', referenceAnswer);
  formData.append('student_answer', studentAnswer);
  formData.append('language', language);
  if (documentId) formData.append('document_id', documentId);
  if (Number.isInteger(chunkIndex)) formData.append('chunk_index', String(chunkIndex));
  if (sourceExcerpt) formData.append('source_excerpt', sourceExcerpt);

  if (audioBlob) {
    formData.append('audio', audioBlob, 'recording.webm');
  }

  const response = await fetch(`${API_BASE}/api/evaluate-answer`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    await throwApiError(response, language);
  }

  return response.json();
}
