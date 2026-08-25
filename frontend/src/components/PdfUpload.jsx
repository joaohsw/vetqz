/**
 * PdfUpload — PDF upload with drag-and-drop.
 *
 * Clean drop zone with icon placeholder, validation feedback,
 * no emoji, proper disabled/loading states.
 */

import { Upload, FileText, X, AlertCircle, ArrowRight } from 'lucide-react';
import { useFileUpload } from '../hooks/useFileUpload';

export default function PdfUpload({ onUpload, isUploading = false }) {
  const { file, error, isDragging, onFileChange, onDragOver, onDragLeave, onDrop, clearFile } =
    useFileUpload();

  const handleSubmit = () => {
    if (file && onUpload) {
      onUpload(file);
    }
  };

  return (
    <div className="animate-enter">
      {/* Drop zone */}
      <div
        id="pdf-drop-zone"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`
          card relative p-10 text-center cursor-pointer
          transition-all duration-200 ease-out
          ${isDragging ? 'border-teal-400 bg-teal-500/5' : ''}
          ${error ? 'border-danger/40' : ''}
        `}
      >
        <input
          id="pdf-file-input"
          type="file"
          accept=".pdf,application/pdf"
          onChange={onFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />

        {!file ? (
          <div className="flex flex-col items-center gap-4">
            <div className={`
              w-14 h-14 rounded-xl border-2 border-dashed flex items-center justify-center
              transition-colors duration-200
              ${isDragging
                ? 'border-teal-400 text-teal-400'
                : 'border-border-default text-text-3'
              }
            `}>
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="font-['Plus_Jakarta_Sans'] font-600 text-text-1">
                {isDragging ? 'Solte o arquivo aqui' : 'Arraste um PDF ou clique para selecionar'}
              </p>
              <p className="text-sm text-text-3 mt-1">
                Apenas PDF, até 15 MB
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-teal-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate text-text-1">{file.name}</p>
              <p className="text-xs text-text-3">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              id="pdf-clear-btn"
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="p-1.5 rounded-md hover:bg-surface-3 transition-colors text-text-3 hover:text-text-2"
              disabled={isUploading}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 flex items-start gap-2 text-sm text-danger bg-danger-muted/20 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit */}
      {file && !error && (
        <button
          id="pdf-upload-btn"
          onClick={handleSubmit}
          disabled={isUploading}
          className="btn-primary w-full mt-4"
        >
          {isUploading ? (
            <>
              <span className="spinner" />
              Processando...
            </>
          ) : (
            <>
              Enviar e processar
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
