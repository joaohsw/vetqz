/**
 * useFileUpload — Hook de upload de arquivo com validação client-side.
 *
 * SEGURANÇA: Validação de MIME type e tamanho no client (primeira camada).
 * O backend realiza validação adicional (segunda camada).
 */

import { useState, useCallback } from 'react';
import { formatMessage, getTranslations } from '../i18n';

const MAX_PDF_SIZE_MB = 50;
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf'];

export function useFileUpload(language) {
  const copy = getTranslations(language);
  const [file, setFile] = useState(null);
  const [errorInfo, setErrorInfo] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  /**
   * Valida o arquivo selecionado.
   * @param {File} selectedFile
   * @returns {Object|null} Descritor do erro ou null se válido.
   */
  const validateFile = useCallback((selectedFile) => {
    if (!selectedFile) return { code: 'noFile' };

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      return { code: 'unsupported', type: selectedFile.type || '' };
    }

    if (selectedFile.size > MAX_PDF_SIZE_BYTES) {
      return {
        code: 'tooLarge',
        size: (selectedFile.size / 1024 / 1024).toFixed(1),
        limit: MAX_PDF_SIZE_MB,
      };
    }

    return null;
  }, []);

  const error = errorInfo
    ? errorInfo.code === 'noFile'
      ? copy.pdfUpload.errors.noFile
      : errorInfo.code === 'unsupported'
        ? formatMessage(copy.pdfUpload.errors.unsupported, {
            type: errorInfo.type || copy.pdfUpload.errors.unknownType,
          })
        : formatMessage(copy.pdfUpload.errors.tooLarge, {
            size: errorInfo.size,
            limit: errorInfo.limit,
          })
    : null;

  /**
   * Processa um arquivo (de input ou drag-and-drop).
   */
  const handleFile = useCallback(
    (selectedFile) => {
      const validationError = validateFile(selectedFile);
      if (validationError) {
        setErrorInfo(validationError);
        setFile(null);
        return false;
      }
      setErrorInfo(null);
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
    setErrorInfo(null);
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
