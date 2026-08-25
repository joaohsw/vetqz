/**
 * useFileUpload — Hook de upload de arquivo com validação client-side.
 *
 * SEGURANÇA: Validação de MIME type e tamanho no client (primeira camada).
 * O backend realiza validação adicional (segunda camada).
 */

import { useState, useCallback } from 'react';

const MAX_PDF_SIZE_MB = 15;
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf'];

export function useFileUpload() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  /**
   * Valida o arquivo selecionado.
   * @param {File} selectedFile
   * @returns {string|null} Mensagem de erro ou null se válido.
   */
  const validateFile = useCallback((selectedFile) => {
    if (!selectedFile) return 'Nenhum arquivo selecionado.';

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      return `Tipo de arquivo não suportado: ${selectedFile.type || 'desconhecido'}. Apenas PDF é aceito.`;
    }

    if (selectedFile.size > MAX_PDF_SIZE_BYTES) {
      return `Arquivo muito grande (${(selectedFile.size / 1024 / 1024).toFixed(1)}MB). Limite: ${MAX_PDF_SIZE_MB}MB.`;
    }

    return null;
  }, []);

  /**
   * Processa um arquivo (de input ou drag-and-drop).
   */
  const handleFile = useCallback(
    (selectedFile) => {
      const validationError = validateFile(selectedFile);
      if (validationError) {
        setError(validationError);
        setFile(null);
        return false;
      }
      setError(null);
      setFile(selectedFile);
      return true;
    },
    [validateFile]
  );

  /**
   * Handler para input[type=file] onChange.
   */
  const onFileChange = useCallback(
    (event) => {
      const selectedFile = event.target.files?.[0];
      if (selectedFile) handleFile(selectedFile);
    },
    [handleFile]
  );

  /**
   * Handlers para drag-and-drop.
   */
  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFile = e.dataTransfer?.files?.[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile]
  );

  /**
   * Remove o arquivo selecionado.
   */
  const clearFile = useCallback(() => {
    setFile(null);
    setError(null);
  }, []);

  return {
    file,
    error,
    isDragging,
    onFileChange,
    onDragOver,
    onDragLeave,
    onDrop,
    clearFile,
  };
}
