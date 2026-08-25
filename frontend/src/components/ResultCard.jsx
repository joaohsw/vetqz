/**
 * ResultCard — Exibe os resultados da avaliação.
 *
 * Mostra score circular animado, feedback detalhado e resposta exemplar em accordion.
 */

import { Trophy, TrendingUp, BookMarked, ChevronDown } from 'lucide-react';
import { useState } from 'react';

/**
 * Retorna cor do score baseada na faixa de nota.
 */
function getScoreColor(score) {
  if (score >= 8) return { text: 'text-emerald-400', stroke: '#34D399', bg: 'bg-emerald-500/10' };
  if (score >= 6) return { text: 'text-blue-400', stroke: '#60A5FA', bg: 'bg-blue-500/10' };
  if (score >= 4) return { text: 'text-warning', stroke: '#F59E0B', bg: 'bg-warning/10' };
  return { text: 'text-danger', stroke: '#EF4444', bg: 'bg-danger/10' };
}

/**
 * Retorna emoji e label do score.
 */
function getScoreLabel(score) {
  if (score >= 9) return { emoji: '🏆', label: 'Excelente!' };
  if (score >= 7) return { emoji: '🎯', label: 'Muito bom!' };
  if (score >= 5) return { emoji: '📚', label: 'Bom, mas pode melhorar' };
  if (score >= 3) return { emoji: '💪', label: 'Continue estudando' };
  return { emoji: '📖', label: 'Revise o conteúdo' };
}

/**
 * Componente de score circular SVG animado.
 */
function ScoreCircle({ score }) {
  const colors = getScoreColor(score);
  const { emoji, label } = getScoreLabel(score);

  // SVG circle math: r=45, C=2πr≈283
  const circumference = 283;
  const offset = circumference - (score / 10) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
          />
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke={colors.stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="animate-score-fill"
            style={{ '--score-offset': offset }}
          />
        </svg>
        {/* Score value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl">{emoji}</span>
          <span className={`text-2xl font-bold ${colors.text}`}>
            {score.toFixed(1)}
          </span>
        </div>
      </div>
      <p className={`mt-2 text-sm font-medium ${colors.text}`}>
        {label}
      </p>
    </div>
  );
}

export default function ResultCard({ score, feedback, modelAnswer }) {
  const [showModelAnswer, setShowModelAnswer] = useState(false);

  if (score === null || score === undefined) return null;

  const colors = getScoreColor(score);

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Score card */}
      <div className="glass-card p-6 gradient-border">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-6">
          <Trophy className="w-4 h-4" />
          Resultado
        </h3>

        <ScoreCircle score={score} />
      </div>

      {/* Feedback card */}
      {feedback && (
        <div className="glass-card p-6">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-400 uppercase tracking-wider mb-3">
            <TrendingUp className="w-4 h-4" />
            Feedback
          </h4>
          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
            {feedback}
          </p>
        </div>
      )}

      {/* Model answer (accordion) */}
      {modelAnswer && (
        <div className="glass-card overflow-hidden">
          <button
            id="model-answer-toggle"
            onClick={() => setShowModelAnswer(!showModelAnswer)}
            className="w-full p-6 flex items-center justify-between text-left hover:bg-bg-glass transition-colors"
          >
            <h4 className="flex items-center gap-2 text-sm font-semibold text-emerald-400 uppercase tracking-wider">
              <BookMarked className="w-4 h-4" />
              Resposta Exemplar
            </h4>
            <ChevronDown
              className={`w-4 h-4 text-text-secondary transition-transform duration-300 ${showModelAnswer ? 'rotate-180' : ''}`}
            />
          </button>

          <div
            className={`
              overflow-hidden transition-all duration-300 ease-out
              ${showModelAnswer ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
            `}
          >
            <div className="px-6 pb-6 text-sm text-text-secondary leading-relaxed whitespace-pre-line">
              {modelAnswer}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
