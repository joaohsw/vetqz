/**
 * QuestionCard — Displays the AI-generated question.
 *
 * Clean card with accent border, expandable source context.
 * Skeleton loader during generation.
 */

import { RefreshCw, BookOpen } from 'lucide-react';

export default function QuestionCard({
  question,
  chunkUsed = '',
  onNewQuestion,
  isLoading = false,
}) {
  if (isLoading) {
    return (
      <div className="card p-6 animate-enter">
        <div className="skeleton w-32 h-4 mb-5" />
        <div className="space-y-3">
          <div className="skeleton w-full h-4" />
          <div className="skeleton w-4/5 h-4" />
          <div className="skeleton w-3/5 h-4" />
        </div>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="card card-accent p-6 animate-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-['Plus_Jakarta_Sans'] font-600 text-teal-400 uppercase tracking-widest">
          Pergunta
        </h3>
        <button
          id="new-question-btn"
          onClick={onNewQuestion}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs text-text-3 hover:text-teal-400 transition-colors px-2 py-1 rounded-md hover:bg-surface-2"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          Nova
        </button>
      </div>

      {/* Question */}
      <p className="text-lg font-['Plus_Jakarta_Sans'] font-600 leading-relaxed text-text-1 text-pretty">
        {question}
      </p>

      {/* Source context */}
      {chunkUsed && (
        <details className="mt-5 group">
          <summary className="flex items-center gap-1.5 text-xs text-text-3 cursor-pointer hover:text-text-2 transition-colors select-none">
            <BookOpen className="w-3 h-3" />
            Ver trecho do material
          </summary>
          <div className="mt-2 p-3 rounded-lg bg-surface-0 text-xs text-text-3 leading-relaxed max-h-28 overflow-y-auto border border-border-subtle">
            {chunkUsed}
          </div>
        </details>
      )}
    </div>
  );
}
