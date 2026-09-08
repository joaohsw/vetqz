/** Feedback formativo com fonte rastreável e próxima ação baseada na nota. */

import { useState } from 'react';
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  ChevronDown,
  RefreshCw,
  Target,
  TrendingUp,
} from 'lucide-react';
import { getTranslations } from '../i18n';

/** Card section that expands/collapses with a smooth height transition (no native details "pop"). */
function Collapsible({ summary, summaryClassName = '', defaultOpen = true, className = '', children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`card p-6 animate-enter ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={`w-full flex items-center justify-between gap-2 text-left cursor-pointer text-xs font-['Plus_Jakarta_Sans'] font-600 uppercase tracking-widest ${summaryClassName}`}
      >
        <span className="flex items-center gap-2">{summary}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-text-3 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="pt-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function getScoreStyle(score, labels) {
  if (score >= 8) return { text: 'text-success', stroke: 'oklch(0.65 0.15 160)', label: labels.excellent };
  if (score >= 6) return { text: 'text-teal-400', stroke: 'oklch(0.65 0.13 185)', label: labels.good };
  if (score >= 4) return { text: 'text-gold-400', stroke: 'oklch(0.75 0.12 85)', label: labels.fair };
  return { text: 'text-danger', stroke: 'oklch(0.65 0.2 25)', label: labels.review };
}

function ScoreCircle({ score, labels }) {
  const { text, stroke, label } = getScoreStyle(score, labels);
  const circumference = 283;
  const offset = circumference - (score / 10) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-surface-3)" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="45" fill="none" stroke={stroke} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset} className="animate-score"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-['Plus_Jakarta_Sans'] font-800 ${text}`}>{score.toFixed(1)}</span>
        </div>
      </div>
      <p className={`mt-2 text-sm font-500 ${text}`}>{label}</p>
    </div>
  );
}

function SourceCard({ source, copy }) {
  if (!source) return null;
  const page = source.page_number
    ? copy.sourcePage.replace('{page}', source.page_number)
    : copy.sourcePageUnavailable;

  return (
    <Collapsible
      summaryClassName="text-teal-400"
      summary={(
        <>
          <BookOpen className="w-3.5 h-3.5" />
          {copy.source}
        </>
      )}
    >
      <blockquote className="border-l-2 border-teal-500/40 pl-3 text-sm text-text-2 leading-relaxed max-h-32 overflow-y-auto">
        “{source.excerpt}”
      </blockquote>
      <p className="text-xs text-text-3 mt-3">{page}</p>
    </Collapsible>
  );
}

function RecommendedAction({ score, copy, onRetryQuestion, onAnotherQuestionSameTopic, onContinue, isLastQuestion }) {
  let content;
  let secondaryAction = null;
  if (score < 6) {
    content = {
      title: copy.recommendations.review.title,
      description: copy.recommendations.review.description,
      label: copy.recommendations.review.action,
      icon: RefreshCw,
      onClick: onRetryQuestion,
    };
    secondaryAction = {
      label: isLastQuestion ? copy.recommendations.advance.lastAction : copy.recommendations.review.continueAction,
      onClick: onContinue,
    };
  } else if (score < 8) {
    content = {
      title: copy.recommendations.practice.title,
      description: copy.recommendations.practice.description,
      label: copy.recommendations.practice.action,
      icon: RefreshCw,
      onClick: onAnotherQuestionSameTopic,
    };
  } else {
    content = {
      title: copy.recommendations.advance.title,
      description: isLastQuestion ? copy.recommendations.advance.lastDescription : copy.recommendations.advance.description,
      label: isLastQuestion ? copy.recommendations.advance.lastAction : copy.recommendations.advance.action,
      icon: ArrowRight,
      onClick: onContinue,
    };
  }
  const Icon = content.icon;

  return (
    <Collapsible
      className="border-teal-500/20"
      summaryClassName="text-teal-400"
      summary={(
        <>
          <Target className="w-3.5 h-3.5" />
          {copy.recommendedAction}
        </>
      )}
    >
      <p className="text-sm font-600 text-text-1">{content.title}</p>
      <p className="text-sm text-text-3 leading-relaxed mt-1">{content.description}</p>
      <button type="button" id="recommended-action-btn" onClick={content.onClick} className="btn-primary w-full mt-4">
        <Icon className="w-4 h-4" />
        {content.label}
      </button>
      {secondaryAction && (
        <button
          type="button"
          id="continue-after-review-btn"
          onClick={secondaryAction.onClick}
          className="btn-secondary w-full mt-2"
        >
          <ArrowRight className="w-4 h-4" />
          {secondaryAction.label}
        </button>
      )}
    </Collapsible>
  );
}

export default function ResultCard({
  score,
  feedback,
  modelAnswer,
  source,
  onRetryQuestion,
  onAnotherQuestionSameTopic,
  onContinue,
  isLastQuestion,
  language,
}) {
  const copy = getTranslations(language).result;
  if (score === null || score === undefined) return null;

  return (
    <div className="space-y-3 stagger">
      <Collapsible summaryClassName="text-teal-400" summary={copy.title}>
        <ScoreCircle score={score} labels={copy.scoreLabels} />
      </Collapsible>

      {feedback && (
        <Collapsible
          summaryClassName="text-gold-400"
          summary={(
            <>
              <TrendingUp className="w-3.5 h-3.5" />
              {copy.feedback}
            </>
          )}
        >
          <p className="text-sm text-text-2 leading-relaxed whitespace-pre-line text-pretty">{feedback}</p>
        </Collapsible>
      )}

      {modelAnswer && (
        <Collapsible
          summaryClassName="text-teal-400"
          summary={(
            <>
              <BookMarked className="w-3.5 h-3.5" />
              {copy.modelAnswer}
            </>
          )}
        >
          <p className="text-sm text-text-2 leading-relaxed whitespace-pre-line text-pretty">{modelAnswer}</p>
        </Collapsible>
      )}

      <SourceCard source={source} copy={copy} />

      <RecommendedAction
        score={score}
        copy={copy}
        onRetryQuestion={onRetryQuestion}
        onAnotherQuestionSameTopic={onAnotherQuestionSameTopic}
        onContinue={onContinue}
        isLastQuestion={isLastQuestion}
      />
    </div>
  );
}
