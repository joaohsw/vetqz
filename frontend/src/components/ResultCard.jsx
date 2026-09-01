/** Feedback formativo com fonte rastreável e próxima ação baseada na nota. */

import {
  ArrowRight,
  BookMarked,
  BookOpen,
  RefreshCw,
  Target,
  TrendingUp,
} from 'lucide-react';
import { getTranslations } from '../i18n';

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
    <div className="card p-6 animate-enter">
      <h4 className="text-xs font-['Plus_Jakarta_Sans'] font-600 text-teal-400 uppercase tracking-widest mb-3 flex items-center gap-2">
        <BookOpen className="w-3.5 h-3.5" />
        {copy.source}
      </h4>
      <blockquote className="border-l-2 border-teal-500/40 pl-3 text-sm text-text-2 leading-relaxed max-h-32 overflow-y-auto">
        “{source.excerpt}”
      </blockquote>
      <p className="text-xs text-text-3 mt-3">{page}</p>
    </div>
  );
}

function RecommendedAction({ score, copy, onRetryQuestion, onAnotherQuestionSameTopic, onContinue, isLastQuestion }) {
  let content;
  if (score < 6) {
    content = {
      title: copy.recommendations.review.title,
      description: copy.recommendations.review.description,
      label: copy.recommendations.review.action,
      icon: RefreshCw,
      onClick: onRetryQuestion,
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
    <div className="card p-6 animate-enter border-teal-500/20">
      <h4 className="text-xs font-['Plus_Jakarta_Sans'] font-600 text-teal-400 uppercase tracking-widest mb-3 flex items-center gap-2">
        <Target className="w-3.5 h-3.5" />
        {copy.recommendedAction}
      </h4>
      <p className="text-sm font-600 text-text-1">{content.title}</p>
      <p className="text-sm text-text-3 leading-relaxed mt-1">{content.description}</p>
      <button type="button" id="recommended-action-btn" onClick={content.onClick} className="btn-primary w-full mt-4">
        <Icon className="w-4 h-4" />
        {content.label}
      </button>
    </div>
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
      <div className="card p-6 animate-enter">
        <h3 className="text-xs font-['Plus_Jakarta_Sans'] font-600 text-teal-400 uppercase tracking-widest mb-6">{copy.title}</h3>
        <ScoreCircle score={score} labels={copy.scoreLabels} />
      </div>

      {modelAnswer && (
        <div className="card p-6 animate-enter">
          <h4 className="text-xs font-['Plus_Jakarta_Sans'] font-600 text-teal-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <BookMarked className="w-3.5 h-3.5" />
            {copy.modelAnswer}
          </h4>
          <p className="text-sm text-text-2 leading-relaxed whitespace-pre-line text-pretty">{modelAnswer}</p>
        </div>
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

      {feedback && (
        <details className="card p-6 animate-enter">
          <summary className="cursor-pointer text-xs font-['Plus_Jakarta_Sans'] font-600 text-gold-400 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" />
            {copy.feedback}
          </summary>
          <p className="pt-4 text-sm text-text-2 leading-relaxed whitespace-pre-line text-pretty">{feedback}</p>
        </details>
      )}
    </div>
  );
}
