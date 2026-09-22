/**
 * API Client — wrapper para chamadas ao backend FastAPI.
 *
 * Usa o proxy do Vite em dev (/api → localhost:8000/api).
 * Em produção, usa VITE_API_BASE_URL.
 */

import { DEFAULT_LANGUAGE, formatMessage, getTranslations } from '../i18n';
import { uploadPdfDirectly } from './pdf-storage';
import { supabase } from './supabase';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers);
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Unable to read the current session for an API request.', error);
  }
  if (data.session?.access_token) {
    headers.set('Authorization', `Bearer ${data.session.access_token}`);
  }

  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

async function throwApiError(response, language) {
  const copy = getTranslations(language);
  const error = await response.json().catch(() => ({ detail: copy.api.unknownError }));
  const detail = typeof error.detail === 'string' ? error.detail : copy.api.unknownError;
  throw new Error(
    detail || formatMessage(copy.api.requestError, { status: response.status })
  );
}

/**
 * Cria uma autorização curta, envia o PDF direto ao Storage e pede o processamento.
 * @param {File} file - Arquivo PDF selecionado pelo usuário.
 * @param {Function} onProgress - Recebe o percentual de upload quando disponível.
 * @returns {Promise<Object>} - { document_id, filename, num_pages, num_chunks }
 */
export async function uploadPdf(file, language = DEFAULT_LANGUAGE, onProgress = null) {
  const intentResponse = await apiFetch('/api/upload-intents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, size_bytes: file.size, language }),
  });

  if (!intentResponse.ok) {
    await throwApiError(intentResponse, language);
  }

  const intent = await intentResponse.json();
  await uploadPdfDirectly(file, intent.storage_path, onProgress);

  const response = await apiFetch('/api/process-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ upload_id: intent.upload_id, language }),
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
  const response = await apiFetch('/api/analyze-topics', {
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
  difficulty = 'medium',
  language = DEFAULT_LANGUAGE,
} = {}) {
  const body = { document_id: documentId, difficulty, language };
  if (chunkIndex !== null) body.chunk_index = chunkIndex;
  if (chunkIndices !== null) body.chunk_indices = chunkIndices;
  if (topicTitle) body.topic_title = topicTitle;

  const response = await apiFetch('/api/generate-question', {
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
  studySessionId = null,
  topicTitle = null,
  questionPosition = null,
  retryAttemptId = null,
  difficulty = 'medium',
  language = DEFAULT_LANGUAGE,
}) {
  const formData = new FormData();
  formData.append('question', question);
  formData.append('reference_answer', referenceAnswer);
  formData.append('student_answer', studentAnswer);
  formData.append('difficulty', difficulty);
  formData.append('language', language);
  if (documentId) formData.append('document_id', documentId);
  if (Number.isInteger(chunkIndex)) formData.append('chunk_index', String(chunkIndex));
  if (sourceExcerpt) formData.append('source_excerpt', sourceExcerpt);
  if (studySessionId) formData.append('study_session_id', studySessionId);
  if (topicTitle) formData.append('topic_title', topicTitle);
  if (Number.isInteger(questionPosition)) {
    formData.append('question_position', String(questionPosition));
  }
  if (retryAttemptId) formData.append('retry_attempt_id', retryAttemptId);

  if (audioBlob) {
    formData.append('audio', audioBlob, 'recording.webm');
  }

  const response = await apiFetch('/api/evaluate-answer', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    await throwApiError(response, language);
  }

  return response.json();
}

/**
 * Remove um documento e seu PDF do storage.
 * @param {string} documentId - UUID do documento a remover.
 * @param {string} language - Idioma para mensagens de erro.
 */
export async function deleteDocument(documentId, language = DEFAULT_LANGUAGE) {
  const response = await apiFetch(`/api/documents/${documentId}?language=${language}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    await throwApiError(response, language);
  }
}

/**
 * Lista PDFs temporários ainda disponíveis para a conta atual.
 */
export async function listMaterials(language = DEFAULT_LANGUAGE) {
  const response = await apiFetch('/api/materials');

  if (!response.ok) {
    await throwApiError(response, language);
  }

  return response.json();
}

/** Registra a configuração de uma sessão para o histórico do aluno. */
export async function createStudySession({
  documentId,
  topicTitles,
  plannedQuestionCount,
  difficulty = 'medium',
  feedbackMode = 'immediate',
  language = DEFAULT_LANGUAGE,
}) {
  const response = await apiFetch('/api/study-sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      document_id: documentId,
      topic_titles: topicTitles,
      planned_question_count: plannedQuestionCount,
      difficulty,
      feedback_mode: feedbackMode,
      language,
    }),
  });

  if (!response.ok) {
    await throwApiError(response, language);
  }
  return response.json();
}

/** Marca a sessão como concluída ao terminar a última pergunta. */
export async function completeStudySession(studySessionId, language = DEFAULT_LANGUAGE) {
  const response = await apiFetch(`/api/study-sessions/${studySessionId}/complete`, {
    method: 'POST',
  });

  if (!response.ok) {
    await throwApiError(response, language);
  }
}

/** Lista sessões e desempenho recente para o histórico da conta. */
export async function listStudyHistory(language = DEFAULT_LANGUAGE) {
  const response = await apiFetch('/api/study-sessions');

  if (!response.ok) {
    await throwApiError(response, language);
  }
  return response.json();
}
