/**
 * ResultCard — Evaluation results display.
 *
 * Animated SVG score circle, feedback card, expandable model answer.
 * No emoji — score label is text-only with color coding.
 */

import { TrendingUp, BookMarked, ChevronDown } from 'lucide-react';
import { useState } from 'react';

/** Score color bands — oklch-derived, consistent with design system */
function getScoreStyle(score) {
  if (score >= 8) return { text: 'text-success', stroke: 'oklch(0.65 0.15 160)', label: 'Excelente' };
  if (score >= 6) return { text: 'text-teal-400', stroke: 'oklch(0.65 0.13 185)', label: 'Bom' };
  if (score >= 4) return { text: 'text-gold-400', stroke: 'oklch(0.75 0.12 85)', label: 'Regular' };
  return { text: 'text-danger', stroke: 'oklch(0.65 0.2 25)', label: 'Precisa revisar' };
}

/** Animated SVG score circle */
function ScoreCircle({ score }) {
  const { text, stroke, label } = getScoreStyle(score);
  const circumference = 283; // 2 * π * 45
  const offset = circumference - (score / 10) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke="var(--color-surface-3)"
            strokeWidth="6"
          />
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke={stroke}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="animate-score"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-['Plus_Jakarta_Sans'] font-800 ${text}`}>
            {score.toFixed(1)}
          </span>
        </div>
      </div>
      <p className={`mt-2 text-sm font-500 ${text}`}>{label}</p>
    </div>
  );
}

export default function ResultCard({ score, feedback, modelAnswer }) {
  const [showModelAnswer, setShowModelAnswer] = useState(false);

  if (score === null || score === undefined) return null;

  return (
    <div className="space-y-3 stagger">
      {/* Score */}
      <div className="card p-6 animate-enter">
        <h3 className="text-xs font-['Plus_Jakarta_Sans'] font-600 text-teal-400 uppercase tracking-widest mb-6">
          Resultado
        </h3>
        <ScoreCircle score={score} />
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="card p-6 animate-enter">
          <h4 className="text-xs font-['Plus_Jakarta_Sans'] font-600 text-gold-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" />
            Feedback
          </h4>
          <p className="text-sm text-text-2 leading-relaxed whitespace-pre-line text-pretty">
            {feedback}
          </p>
        </div>
      )}

      {/* Model answer — accordion */}
      {modelAnswer && (
        <div className="card overflow-hidden animate-enter">
          <button
            id="model-answer-toggle"
            onClick={() => setShowModelAnswer(!showModelAnswer)}
            className="w-full p-6 flex items-center justify-between text-left hover:bg-surface-2 transition-colors"
          >
            <h4 className="text-xs font-['Plus_Jakarta_Sans'] font-600 text-teal-400 uppercase tracking-widest flex items-center gap-2">
              <BookMarked className="w-3.5 h-3.5" />
              Resposta Exemplar
            </h4>
            <ChevronDown
              className={`w-4 h-4 text-text-3 transition-transform duration-200 ${showModelAnswer ? 'rotate-180' : ''}`}
            />
          </button>

          <div
            className={`
              overflow-hidden transition-all duration-300 ease-out
              ${showModelAnswer ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
            `}
          >
            <div className="px-6 pb-6 text-sm text-text-2 leading-relaxed whitespace-pre-line text-pretty">
              {modelAnswer}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
