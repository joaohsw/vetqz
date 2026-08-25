/**
 * PdfUpload — Componente de upload de PDF com drag-and-drop.
 *
 * SEGURANÇA: Validação client-side de MIME type e tamanho (primeira camada).
 * O backend (pdf_router.py) realiza validação adicional.
 */

import { Upload, FileText, X, AlertCircle, Check } from 'lucide-react';
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
    <div className="animate-slide-up">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <FileText className="w-5 h-5 text-emerald-400" />
        Upload do Material
      </h2>

      {/* Drop zone */}
      <div
        id="pdf-drop-zone"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`
          glass-card relative p-8 text-center cursor-pointer
          transition-all duration-300 ease-out
          ${isDragging
            ? 'border-emerald-400 bg-emerald-500/10 scale-[1.02]'
            : 'hover:border-emerald-500/50 hover:bg-bg-glass'
          }
          ${error ? 'border-danger/50' : ''}
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
          <div className="flex flex-col items-center gap-3">
            <div className={`
              w-16 h-16 rounded-2xl flex items-center justify-center
              transition-all duration-300
              ${isDragging
                ? 'bg-emerald-500/20 scale-110'
                : 'bg-bg-glass'
              }
            `}>
              <Upload className={`w-7 h-7 transition-colors ${isDragging ? 'text-emerald-400' : 'text-text-secondary'}`} />
            </div>
            <div>
              <p className="font-medium text-text-primary">
                {isDragging ? 'Solte o arquivo aqui' : 'Arraste seu PDF ou clique para selecionar'}
              </p>
              <p className="text-sm text-text-muted mt-1">
                Apenas PDF • Máximo 15MB
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-sm text-text-secondary">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              id="pdf-clear-btn"
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              disabled={isUploading}
            >
              <X className="w-4 h-4 text-text-secondary" />
            </button>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-3 flex items-start gap-2 text-sm text-danger bg-danger/10 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload button */}
      {file && !error && (
        <button
          id="pdf-upload-btn"
          onClick={handleSubmit}
          disabled={isUploading}
          className={`
            mt-4 w-full py-3 px-6 rounded-xl font-semibold text-white
            transition-all duration-300
            ${isUploading
              ? 'bg-emerald-600/50 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98]'
            }
            flex items-center justify-center gap-2
          `}
        >
          {isUploading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processando PDF...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Enviar e Processar
            </>
          )}
        </button>
      )}
    </div>
  );
}
