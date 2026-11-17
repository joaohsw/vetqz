/**
 * MultipleChoiceOptions — interactive option selector and read-only answer review.
 */

import { CheckCircle2, Circle, XCircle } from 'lucide-react';
import { getTranslations } from '../i18n';

export default function MultipleChoiceOptions({
  options = [],
  selectedOptionId = null,
  onSelect,
  disabled = false,
  correctOptionId = null,
  name = 'multiple-choice-option',
  language,
}) {
  const copy = getTranslations(language);
  const isReviewMode = Boolean(correctOptionId);

  if (!options.length) return null;

  if (isReviewMode) {
    return (
      <ul className="space-y-2" aria-label={copy.multipleChoice.optionsReview}>
        {options.map((option) => {
          const isSelected = option.id === selectedOptionId;
          const isCorrect = option.id === correctOptionId;
          const isWrongSelection = isSelected && !isCorrect;

          let containerClass = 'border-border-subtle bg-surface-0/60 text-text-3';
          let badgeClass = 'bg-surface-2 text-text-3 border border-border-subtle';
          if (isCorrect) {
            containerClass = 'border-success/50 bg-success/10 text-text-1';
            badgeClass = 'bg-success/20 text-success border border-success/40';
          } else if (isWrongSelection) {
            containerClass = 'border-danger/50 bg-danger/10 text-text-1';
            badgeClass = 'bg-danger/20 text-danger border border-danger/40';
          }

          return (
            <li
              key={option.id}
              className={`rounded-lg border p-3 transition-colors ${containerClass}`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`w-7 h-7 rounded-md text-xs font-['Plus_Jakarta_Sans'] font-700 flex items-center justify-center shrink-0 ${badgeClass}`}
                >
                  {option.id}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed text-pretty">{option.text}</p>
                  {(isCorrect || isSelected) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-600">
                      {isCorrect && (
                        <span className="inline-flex items-center gap-1 text-success">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          {copy.multipleChoice.correctOption}
                        </span>
                      )}
                      {isSelected && (
                        <span
                          className={`inline-flex items-center gap-1 ${
                            isCorrect ? 'text-teal-400' : 'text-danger'
                          }`}
                        >
                          {!isCorrect && <XCircle className="w-3.5 h-3.5" aria-hidden="true" />}
                          {copy.multipleChoice.yourChoice}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="card p-5 space-y-3 animate-enter">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-['Plus_Jakarta_Sans'] font-600 text-text-2 uppercase tracking-widest flex items-center gap-1.5">
          <Circle className="w-3.5 h-3.5 text-teal-400" aria-hidden="true" />
          {copy.multipleChoice.title}
        </h3>
      </div>

      <div
        role="radiogroup"
        aria-label={copy.multipleChoice.title}
        className="space-y-2"
      >
        {options.map((option) => {
          const isSelected = option.id === selectedOptionId;
          return (
            <label
              key={option.id}
              className={`flex items-start gap-3 rounded-lg border p-3.5 transition-colors ${
                disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
              } ${
                isSelected
                  ? 'border-teal-500/50 bg-teal-500/15'
                  : 'border-border-subtle bg-surface-0 hover:bg-surface-2 hover:border-border-default'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.id}
                checked={isSelected}
                disabled={disabled}
                onChange={() => onSelect?.(option.id)}
                className="sr-only"
              />
              <span
                className={`w-7 h-7 rounded-md text-xs font-['Plus_Jakarta_Sans'] font-700 flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-teal-500 text-surface-0'
                    : 'bg-surface-2 text-text-2 border border-border-subtle'
                }`}
              >
                {option.id}
              </span>
              <span className={`text-sm leading-relaxed text-pretty pt-0.5 ${isSelected ? 'text-text-1 font-500' : 'text-text-2'}`}>
                {option.text}
              </span>
            </label>
          );
        })}
      </div>

      <p className="text-xs text-text-3">{copy.multipleChoice.selectHint}</p>
    </div>
  );
}
