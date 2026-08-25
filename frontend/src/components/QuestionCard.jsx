/**
 * QuestionCard — Exibe a pergunta gerada pela IA.
 *
 * Inclui animação de entrada, texto da pergunta, e botão de nova pergunta.
 */

import { HelpCircle, RefreshCw, BookOpen } from 'lucide-react';

export default function QuestionCard({
  question,
  chunkUsed = '',
  onNewQuestion,
  isLoading = false,
}) {
  // Skeleton loader durante carregamento
  if (isLoading) {
    return (
      <div className="glass-card p-6 gradient-border animate-slide-up">
        <div className="flex items-center gap-2 mb-4">
          <div className="skeleton w-5 h-5 rounded" />
          <div className="skeleton w-40 h-5" />
        </div>
        <div className="space-y-3">
          <div className="skeleton w-full h-5" />
          <div className="skeleton w-4/5 h-5" />
          <div className="skeleton w-3/5 h-5" />
        </div>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="glass-card p-6 gradient-border animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-400 uppercase tracking-wider">
          <HelpCircle className="w-4 h-4" />
          Pergunta
        </h3>
        <button
          id="new-question-btn"
          onClick={onNewQuestion}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-emerald-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-bg-glass"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Nova Pergunta
        </button>
      </div>

      {/* Question text */}
      <p className="text-lg font-medium leading-relaxed text-text-primary">
        {question}
      </p>

      {/* Chunk context (collapsed by default) */}
      {chunkUsed && (
        <details className="mt-4 group">
          <summary className="flex items-center gap-2 text-xs text-text-muted cursor-pointer hover:text-text-secondary transition-colors select-none">
            <BookOpen className="w-3.5 h-3.5" />
            Ver trecho do material usado
          </summary>
          <div className="mt-2 p-3 rounded-lg bg-bg-glass text-xs text-text-secondary leading-relaxed max-h-32 overflow-y-auto">
            {chunkUsed}
          </div>
        </details>
      )}
    </div>
  );
}
