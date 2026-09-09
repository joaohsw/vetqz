import {
  AudioLines,
  ArrowRight,
  Check,
  FileText,
  Mic,
  Sparkles,
  Upload,
} from 'lucide-react';

import { getTranslations } from '../i18n';

export default function Landing({ language, onCreateAccount, onSignIn }) {
  const copy = getTranslations(language).landing;

  const steps = [
    { icon: Upload, title: copy.steps.upload.title, description: copy.steps.upload.description },
    { icon: Mic, title: copy.steps.answer.title, description: copy.steps.answer.description },
    { icon: Sparkles, title: copy.steps.improve.title, description: copy.steps.improve.description },
  ];

  return (
    <div className="landing-shell max-w-6xl mx-auto animate-enter">
      <section className="landing-hero grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center py-8 sm:py-14 lg:py-20">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-500/10 px-3 py-1.5 text-xs font-600 text-teal-400">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            {copy.eyebrow}
          </div>

          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-[3.5rem] font-800 leading-[1.05] tracking-[-0.045em] text-text-1 text-pretty">
            {copy.title}{' '}
            <span className="landing-highlight">{copy.titleHighlight}</span>
          </h1>
          <p className="mt-5 max-w-lg text-base sm:text-lg leading-relaxed text-text-2 text-pretty">
            {copy.description}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3">
            <button type="button" onClick={onCreateAccount} className="btn-primary landing-primary sm:w-auto">
              {copy.primaryAction}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={onSignIn} className="btn-secondary sm:w-auto">
              {copy.secondaryAction}
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-text-3">
            {copy.reassurance.map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-teal-400" aria-hidden="true" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <ProductPreview copy={copy.preview} />
      </section>

      <section className="border-t border-border-subtle py-16 sm:py-20" aria-labelledby="how-it-works-title">
        <div className="max-w-xl">
          <p className="text-xs font-700 uppercase tracking-[0.16em] text-teal-400">
            {copy.howItWorksEyebrow}
          </p>
          <h2 id="how-it-works-title" className="mt-2 text-2xl sm:text-3xl font-800 text-text-1">
            {copy.howItWorksTitle}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-text-3 text-pretty">
            {copy.howItWorksDescription}
          </p>
        </div>

        <div className="mt-9 grid md:grid-cols-3 gap-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article key={step.title} className="landing-step card p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-400/15 flex items-center justify-center text-teal-400">
                    <Icon className="w-4.5 h-4.5" aria-hidden="true" />
                  </div>
                  <span className="font-['Plus_Jakarta_Sans'] text-xs font-700 text-text-3">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-base font-700 text-text-1">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-3 text-pretty">{step.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="pb-10 sm:pb-16">
        <div className="landing-cta rounded-2xl border border-border-subtle px-6 py-8 sm:px-9 sm:py-9 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-800 text-text-1">{copy.ctaTitle}</h2>
            <p className="mt-2 text-sm text-text-3">{copy.ctaDescription}</p>
          </div>
          <button type="button" onClick={onCreateAccount} className="btn-primary shrink-0">
            {copy.primaryAction}
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}

function ProductPreview({ copy }) {
  return (
    <div className="landing-preview-wrap relative max-w-xl mx-auto w-full" aria-label={copy.ariaLabel}>
      <div className="landing-glow" aria-hidden="true" />
      <div className="landing-preview relative rounded-2xl border border-border-default bg-surface-1 p-3 sm:p-4 shadow-2xl">
        <div className="flex items-center justify-between px-1 pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-teal-500/15 flex items-center justify-center shrink-0">
              <FileText className="w-3.5 h-3.5 text-teal-400" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-600 text-text-1 truncate">{copy.file}</p>
              <p className="text-[0.65rem] text-text-3">{copy.topic}</p>
            </div>
          </div>
          <span className="rounded-full bg-success/10 px-2 py-1 text-[0.65rem] font-600 text-success">
            {copy.ready}
          </span>
        </div>

        <div className="py-5 sm:py-6 px-2 sm:px-3">
          <p className="text-[0.65rem] font-700 uppercase tracking-[0.14em] text-teal-400">
            {copy.questionLabel}
          </p>
          <p className="mt-2 text-base sm:text-lg font-600 leading-snug text-text-1 text-pretty">
            {copy.question}
          </p>
        </div>

        <div className="rounded-xl bg-surface-0 border border-border-subtle p-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-surface-0 shrink-0">
              <Mic className="w-4 h-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 h-6" aria-hidden="true">
                {[9, 15, 11, 20, 14, 23, 17, 10, 19, 13, 8, 16, 11, 6].map((height, index) => (
                  <span
                    key={`${height}-${index}`}
                    className="landing-wave flex-1 max-w-2 rounded-full bg-teal-400"
                    style={{ height }}
                  />
                ))}
              </div>
              <p className="mt-1 text-[0.65rem] text-text-3">{copy.recording}</p>
            </div>
            <AudioLines className="w-4 h-4 text-text-3" aria-hidden="true" />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[auto_1fr] gap-3 rounded-xl border border-teal-400/20 bg-teal-500/8 p-3.5">
          <div className="w-11 h-11 rounded-full border-2 border-teal-400 flex items-center justify-center font-['Plus_Jakarta_Sans'] text-sm font-800 text-teal-400">
            8.7
          </div>
          <div className="min-w-0 self-center">
            <p className="text-xs font-700 text-text-1">{copy.feedbackTitle}</p>
            <p className="mt-0.5 text-[0.7rem] leading-relaxed text-text-3">{copy.feedback}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
