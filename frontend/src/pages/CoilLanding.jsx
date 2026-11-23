import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Code2,
  FileText,
  Film,
  GraduationCap,
  Languages,
  Layers,
  Mic,
  Moon,
  PawPrint,
  Play,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Users,
} from 'lucide-react';

import { COIL_TRANSLATIONS } from '../coilLandingI18n';
import { DEFAULT_LANGUAGE, formatMessage, LANGUAGE_OPTIONS } from '../i18n';

const LANGUAGE_STORAGE_KEY = 'vetqz-language';
const THEME_STORAGE_KEY = 'vetqz-theme';

const FEATURE_ICONS = {
  upload: FileText,
  topics: Layers,
  modes: CheckCircle2,
  calibration: SlidersHorizontal,
  sources: BookOpen,
  history: Mic,
};

function getInitialLanguage() {
  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved === 'pt-BR' || saved === 'es-CL') return saved;
  return window.navigator.language?.toLowerCase().startsWith('es')
    ? 'es-CL'
    : DEFAULT_LANGUAGE;
}

function getInitialTheme() {
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  return saved === 'light' ? 'light' : 'dark';
}

function getInitials(name) {
  const parts = name.trim().split(/\s+/).filter((part) => /^[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ]/i.test(part));
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function VideoSlot({
  src,
  youtubeEmbedUrl,
  title,
  poster,
  fallbackText,
  pendingTitle,
  pendingDescription,
}) {
  const [unavailable, setUnavailable] = useState(false);

  if (youtubeEmbedUrl) {
    return (
      <iframe
        src={youtubeEmbedUrl}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className="w-full aspect-video rounded-lg bg-surface-0 block border-0"
      />
    );
  }

  if (unavailable) {
    return (
      <div className="w-full aspect-video rounded-lg border border-dashed border-border-default bg-surface-0 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-11 h-11 rounded-full bg-teal-500/10 border border-teal-400/25 flex items-center justify-center text-teal-400">
          <Film className="w-5 h-5" aria-hidden="true" />
        </div>
        <p className="mt-3 text-sm font-700 text-text-1">{pendingTitle}</p>
        <p className="mt-1.5 text-xs text-text-3 max-w-md leading-relaxed">{pendingDescription}</p>
      </div>
    );
  }

  return (
    <video
      controls
      preload="metadata"
      poster={poster}
      className="w-full aspect-video rounded-lg bg-surface-0 block"
    >
      <source src={src} type="video/mp4" onError={() => setUnavailable(true)} />
      {fallbackText}
    </video>
  );
}

export default function CoilLanding() {
  const [language, setLanguage] = useState(getInitialLanguage);
  const [theme, setTheme] = useState(getInitialTheme);
  const copy = COIL_TRANSLATIONS[language] || COIL_TRANSLATIONS[DEFAULT_LANGUAGE];
  const [activeScreenId, setActiveScreenId] = useState(copy.features.screens[0].id);
  const isLight = theme === 'light';

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.title = copy.meta.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', copy.meta.description);
  }, [copy.meta.description, copy.meta.title, language]);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  const activeScreen =
    copy.features.screens.find((screen) => screen.id === activeScreenId)
    || copy.features.screens[0];

  return (
    <div className="min-h-screen flex flex-col bg-surface-0 text-text-1">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface-0/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <a href="#top" className="flex items-center gap-2.5 shrink-0">
              <span className="w-8 h-8 rounded-lg bg-teal-500/15 border border-teal-400/25 flex items-center justify-center">
                <PawPrint className="w-4 h-4 text-teal-400" aria-hidden="true" />
              </span>
              <span className="font-['Plus_Jakarta_Sans'] font-700 text-lg tracking-tight text-text-1">
                vetQz
              </span>
            </a>
            <span className="hidden md:inline-flex items-center rounded-md border border-border-default bg-surface-1 px-2.5 py-0.5 text-[11px] font-600 text-text-2">
              COIL UFSM × UST · 2026
            </span>
          </div>

          <nav className="hidden lg:flex items-center gap-5 text-xs font-600 text-text-2" aria-label="Seções">
            <a href="#contextualizacao" className="hover:text-text-1 transition-colors">
              {copy.nav.context}
            </a>
            <a href="#funcionalidades" className="hover:text-text-1 transition-colors">
              {copy.nav.system}
            </a>
            <a href="#validacao" className="hover:text-text-1 transition-colors">
              {copy.nav.validation}
            </a>
            <a href="#demonstracao" className="hover:text-text-1 transition-colors">
              {copy.nav.demo}
            </a>
            <a href="#sobre" className="hover:text-text-1 transition-colors">
              {copy.nav.about}
            </a>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setTheme(isLight ? 'dark' : 'light')}
              aria-label={isLight ? copy.nav.switchToDark : copy.nav.switchToLight}
              title={isLight ? copy.nav.switchToDark : copy.nav.switchToLight}
              className="w-9 h-9 rounded-lg border border-border-subtle bg-surface-1 flex items-center justify-center text-text-2 hover:text-text-1 hover:border-border-default transition-colors"
            >
              {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <div
              className="flex items-center rounded-lg border border-border-subtle bg-surface-1 p-0.5"
              role="group"
              aria-label={copy.nav.languageSelector}
            >
              <Languages className="w-3.5 h-3.5 text-text-3 mx-1.5" aria-hidden="true" />
              {LANGUAGE_OPTIONS.map((opt) => {
                const active = opt.value === language;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLanguage(opt.value)}
                    aria-pressed={active}
                    aria-label={formatMessage(copy.nav.switchTo, { language: opt.name })}
                    className={`px-2 py-1 rounded-md text-xs font-['Plus_Jakarta_Sans'] font-700 transition-colors ${
                      active
                        ? 'bg-teal-500 text-surface-0'
                        : 'text-text-3 hover:text-text-1'
                    }`}
                  >
                    {opt.shortLabel}
                  </button>
                );
              })}
            </div>

            <a href="/" className="btn-primary !py-2 !px-3.5 text-xs sm:text-sm">
              <span>{copy.nav.accessApp}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Academic Presentation Header / Abstract */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-14 sm:pt-12 sm:pb-16">
          <div className="border-b border-border-subtle pb-8">
            <p className="inline-flex items-center gap-2 text-xs font-700 uppercase tracking-[0.14em] text-teal-400">
              <GraduationCap className="w-4 h-4" aria-hidden="true" />
              {copy.hero.eyebrow}
            </p>

            <h1 className="mt-4 text-3xl sm:text-4xl lg:text-[2.65rem] font-800 leading-[1.12] tracking-[-0.03em] text-text-1 max-w-4xl text-pretty">
              {copy.hero.title}
            </h1>

            <p className="mt-3 text-sm sm:text-base text-text-2 max-w-3xl leading-relaxed text-pretty">
              {copy.hero.subtitle}
            </p>
          </div>

          <div className="mt-8 grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-10 items-start">
            <div className="space-y-6">
              <div className="card p-5 sm:p-6">
                <h2 className="text-xs font-700 uppercase tracking-[0.14em] text-teal-400">
                  {copy.hero.abstractLabel}
                </h2>
                <p className="mt-2.5 text-sm sm:text-base text-text-2 leading-relaxed text-pretty">
                  {copy.hero.abstractText}
                </p>
              </div>

              <dl className="card divide-y divide-border-subtle overflow-hidden">
                {copy.hero.metadata.map((row) => (
                  <div key={row.label} className="px-5 py-3.5 grid sm:grid-cols-[150px_1fr] gap-1 sm:gap-4 text-sm">
                    <dt className="font-600 text-text-3">{row.label}</dt>
                    <dd className="font-500 text-text-1">{row.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="flex flex-col sm:flex-row gap-3">
                <a href="/" className="btn-primary">
                  <span>{copy.hero.accessApp}</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </a>
                <a href="#demonstracao" className="btn-secondary">
                  <Play className="w-4 h-4 text-teal-400" aria-hidden="true" />
                  <span>{copy.hero.watchDemo}</span>
                </a>
              </div>
            </div>

            <figure className="card p-3 sm:p-4">
              <img
                src="/images/app/08-multiple-choice-result.png"
                alt={copy.hero.figureCaption}
                className="w-full rounded-lg border border-border-subtle block"
              />
              <figcaption className="mt-3 text-xs text-text-3 leading-relaxed">
                {copy.hero.figureCaption}
              </figcaption>
            </figure>
          </div>
        </section>

        {/* 1. Problem Context */}
        <section id="contextualizacao" className="border-t border-border-subtle py-14 sm:py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-700 uppercase tracking-[0.16em] text-teal-400">
                {copy.context.eyebrow}
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-800 text-text-1">
                {copy.context.title}
              </h2>
            </div>

            <div className="mt-8 grid md:grid-cols-3 gap-4">
              {copy.context.cards.map((card, index) => (
                <article key={card.title} className="card p-5 sm:p-6">
                  <span className="text-xs font-700 text-teal-400">0{index + 1}</span>
                  <h3 className="mt-2 text-base font-700 text-text-1">{card.title}</h3>
                  <p className="mt-2 text-sm text-text-2 leading-relaxed text-pretty">
                    {card.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 2. System Features + Interactive Figures */}
        <section id="funcionalidades" className="border-t border-border-subtle py-14 sm:py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-700 uppercase tracking-[0.16em] text-teal-400">
                {copy.features.eyebrow}
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-800 text-text-1">
                {copy.features.title}
              </h2>
              <p className="mt-3 text-sm sm:text-base text-text-2 text-pretty">
                {copy.features.description}
              </p>
            </div>

            <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {copy.features.items.map((item) => {
                const Icon = FEATURE_ICONS[item.id] || Sparkles;
                return (
                  <article key={item.id} className="card p-5 sm:p-6">
                    <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-400/20 flex items-center justify-center text-teal-400">
                      <Icon className="w-4.5 h-4.5" aria-hidden="true" />
                    </div>
                    <h3 className="mt-4 text-base font-700 text-text-1">{item.title}</h3>
                    <p className="mt-2 text-sm text-text-3 leading-relaxed text-pretty">
                      {item.description}
                    </p>
                  </article>
                );
              })}
            </div>

            <div className="mt-12 card p-5 sm:p-7">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-700 text-text-1">
                    {copy.features.galleryTitle}
                  </h3>
                  <p className="mt-1 text-sm text-text-3">{copy.features.gallerySubtitle}</p>
                </div>
                <div className="flex flex-wrap gap-2" role="tablist" aria-label={copy.features.galleryTitle}>
                  {copy.features.screens.map((screen) => {
                    const selected = screen.id === activeScreen.id;
                    return (
                      <button
                        key={screen.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => setActiveScreenId(screen.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-600 transition-colors border ${
                          selected
                            ? 'bg-teal-500/15 border-teal-400/40 text-teal-400'
                            : 'bg-surface-0 border-border-subtle text-text-3 hover:text-text-1'
                        }`}
                      >
                        {screen.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 grid lg:grid-cols-[1.35fr_0.65fr] gap-6 items-center">
                <div className="overflow-hidden rounded-xl border border-border-default bg-surface-0">
                  <img
                    src={activeScreen.image}
                    alt={activeScreen.title}
                    className="w-full h-auto block"
                  />
                </div>
                <div className="space-y-4">
                  <span className="inline-flex items-center rounded-md border border-teal-400/25 bg-teal-500/10 px-2.5 py-1 text-xs font-600 text-teal-400">
                    {activeScreen.label}
                  </span>
                  <h4 className="text-lg font-700 text-text-1">{activeScreen.title}</h4>
                  <p className="text-sm text-text-2 leading-relaxed text-pretty">
                    {activeScreen.caption}
                  </p>
                  <a href="/" className="btn-secondary w-full sm:w-auto">
                    <span>{copy.nav.accessApp}</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Chilean Validation & Co-design */}
        <section id="validacao" className="border-t border-border-subtle py-14 sm:py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-700 uppercase tracking-[0.16em] text-gold-400">
                {copy.validation.eyebrow}
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-800 text-text-1">
                {copy.validation.title}
              </h2>
              <p className="mt-3 text-sm sm:text-base text-text-2 text-pretty">
                {copy.validation.description}
              </p>
            </div>

            <div className="mt-8 grid md:grid-cols-2 gap-5">
              {copy.validation.cards.map((card, index) => (
                <article key={card.title} className="card p-6">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-600 border ${
                      index === 0
                        ? 'border-success/30 bg-success/10 text-success'
                        : 'border-gold-400/30 bg-gold-400/10 text-gold-400'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" aria-hidden="true" />
                    {card.badge}
                  </span>
                  <h3 className="mt-4 text-lg font-700 text-text-1">{card.title}</h3>
                  <p className="mt-2 text-sm text-text-2 leading-relaxed text-pretty">
                    {card.text}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-5 card p-5 sm:p-6 grid md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
              <div className="rounded-lg border border-border-subtle bg-surface-0 p-4">
                <p className="text-[11px] font-700 uppercase tracking-[0.14em] text-text-3">
                  {copy.validation.evolutionFromLabel}
                </p>
                <p className="mt-1 text-sm font-500 text-text-2">
                  {copy.validation.evolutionFromText}
                </p>
              </div>
              <div className="hidden md:flex w-9 h-9 rounded-full bg-surface-2 border border-border-subtle items-center justify-center text-teal-400">
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="rounded-lg border border-teal-400/30 bg-teal-500/10 p-4">
                <p className="text-[11px] font-700 uppercase tracking-[0.14em] text-teal-400">
                  {copy.validation.evolutionToLabel}
                </p>
                <p className="mt-1 text-sm font-600 text-text-1">
                  {copy.validation.evolutionToText}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Demo Video */}
        <section id="demonstracao" className="border-t border-border-subtle py-14 sm:py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-8 items-center">
              <div>
                <p className="text-xs font-700 uppercase tracking-[0.16em] text-teal-400">
                  {copy.demo.eyebrow}
                </p>
                <h2 className="mt-2 text-2xl sm:text-3xl font-800 text-text-1">
                  {copy.demo.title}
                </h2>
                <p className="mt-3 text-sm sm:text-base text-text-2 leading-relaxed text-pretty">
                  {copy.demo.description}
                </p>
                <ul className="mt-6 space-y-2.5">
                  {copy.demo.chapters.map((chapter, idx) => (
                    <li key={chapter} className="flex items-start gap-2.5 text-sm text-text-2">
                      <span className="mt-0.5 w-5 h-5 rounded-md bg-teal-500/15 border border-teal-400/25 text-teal-400 text-[11px] font-700 flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span>{chapter}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card-elevated p-2.5 sm:p-3 overflow-hidden">
                <VideoSlot
                  src={copy.demo.videoSrc}
                  youtubeEmbedUrl={copy.demo.youtubeEmbedUrl}
                  title={copy.demo.title}
                  poster={copy.demo.posterSrc}
                  fallbackText={copy.demo.fallbackText}
                  pendingTitle={copy.demo.pendingTitle}
                  pendingDescription={copy.demo.pendingDescription}
                />
              </div>
            </div>
          </div>
        </section>

        {/* 5. About, COIL Context, Making Of Video, Teams & Architecture */}
        <section id="sobre" className="border-t border-border-subtle py-14 sm:py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
            <div className="max-w-2xl">
              <p className="text-xs font-700 uppercase tracking-[0.16em] text-teal-400">
                {copy.about.eyebrow}
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-800 text-text-1">
                {copy.about.title}
              </h2>
              <p className="mt-3 text-sm sm:text-base text-text-2 leading-relaxed text-pretty">
                {copy.about.description}
              </p>
            </div>

            {/* Academic Institutions Table */}
            <div>
              <h3 className="text-base font-700 text-text-1 mb-4">
                {copy.about.institutionsTableTitle}
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {copy.about.institutions.map((inst) => (
                  <div key={inst.university} className="card p-5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-700 uppercase tracking-[0.12em] text-teal-400">
                        {inst.country} · {inst.city}
                      </span>
                    </div>
                    <h4 className="text-base font-700 text-text-1">{inst.university}</h4>
                    <p className="text-xs font-600 text-text-2">{inst.courses}</p>
                    <p className="text-xs text-text-3">{inst.subject}</p>
                    <p className="pt-2 border-t border-border-subtle text-xs text-text-2 leading-relaxed">
                      {inst.role}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Making Of Video */}
            <div className="card p-5 sm:p-7 grid lg:grid-cols-[1.15fr_0.85fr] gap-7 items-center">
              <div className="overflow-hidden rounded-xl border border-border-default bg-surface-0">
                <VideoSlot
                  src={copy.about.videoSrc}
                  youtubeEmbedUrl={copy.about.youtubeEmbedUrl}
                  title={copy.about.makingOfTitle}
                  poster={copy.about.posterSrc}
                  fallbackText={copy.demo.fallbackText}
                  pendingTitle={copy.about.pendingTitle}
                  pendingDescription={copy.about.pendingDescription}
                />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 rounded-md border border-gold-400/25 bg-gold-400/10 px-3 py-1 text-xs font-600 text-gold-400">
                  <Film className="w-3.5 h-3.5" aria-hidden="true" />
                  {copy.about.makingOfBadge}
                </div>
                <h3 className="mt-4 text-xl font-700 text-text-1">{copy.about.makingOfTitle}</h3>
                <p className="mt-2 text-sm text-text-2 leading-relaxed text-pretty">
                  {copy.about.makingOfDescription}
                </p>
              </div>
            </div>

            {/* Binational Teams */}
            <div>
              <div className="flex items-center gap-2 text-teal-400">
                <Users className="w-4 h-4" aria-hidden="true" />
                <h3 className="text-xl font-700 text-text-1">{copy.about.teamsTitle}</h3>
              </div>
              <p className="mt-1 text-sm text-text-3">{copy.about.teamsSubtitle}</p>

              <div className="mt-6 grid md:grid-cols-2 gap-5">
                {[
                  { team: copy.about.ust, accent: 'gold' },
                  { team: copy.about.ufsm, accent: 'teal' },
                ].map(({ team, accent }) => {
                  const isGold = accent === 'gold';
                  return (
                    <div key={team.institution} className="card p-6 space-y-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-[11px] font-700 border ${
                              isGold
                                ? 'border-gold-400/30 bg-gold-400/10 text-gold-400'
                                : 'border-teal-400/30 bg-teal-500/10 text-teal-400'
                            }`}
                          >
                            {team.country}
                          </span>
                          <h4 className="mt-2 text-lg font-700 text-text-1">{team.institution}</h4>
                          <p className="text-xs text-text-3 mt-0.5">{team.focus}</p>
                        </div>
                        <GraduationCap
                          className={`w-5 h-5 shrink-0 ${isGold ? 'text-gold-400' : 'text-teal-400'}`}
                          aria-hidden="true"
                        />
                      </div>

                      <div>
                        <p className="text-[11px] font-700 uppercase tracking-[0.14em] text-text-3 mb-2.5">
                          {team.studentsLabel}
                        </p>
                        <div className="grid sm:grid-cols-2 gap-2.5">
                          {team.students.map((student) => (
                            <div
                              key={student}
                              className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-0 px-3 py-2.5"
                            >
                              <span
                                aria-hidden="true"
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-['Plus_Jakarta_Sans'] font-700 shrink-0 ${
                                  isGold
                                    ? 'bg-gold-400/15 text-gold-400 border border-gold-400/30'
                                    : 'bg-teal-500/15 text-teal-400 border border-teal-400/30'
                                }`}
                              >
                                {getInitials(student)}
                              </span>
                              <span className="text-xs font-600 text-text-1 leading-snug">
                                {student}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-border-subtle">
                        <p className="text-[11px] font-700 uppercase tracking-[0.14em] text-text-3 mb-2">
                          {team.advisorsLabel}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {team.advisors.map((advisor) => (
                            <span
                              key={advisor}
                              className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-2 px-3 py-1.5 text-xs font-600 text-text-1"
                            >
                              <span
                                aria-hidden="true"
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-700 ${
                                  isGold
                                    ? 'bg-gold-400/20 text-gold-400'
                                    : 'bg-teal-500/20 text-teal-400'
                                }`}
                              >
                                {getInitials(advisor)}
                              </span>
                              {advisor}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Architecture summary */}
            <div>
              <div className="flex items-center gap-2 text-teal-400">
                <Code2 className="w-4 h-4" aria-hidden="true" />
                <h3 className="text-lg font-700 text-text-1">{copy.about.stackTitle}</h3>
              </div>
              <div className="mt-4 grid md:grid-cols-3 gap-4">
                {copy.about.stack.map((layer) => (
                  <div key={layer.name} className="card p-5">
                    <h4 className="text-sm font-700 text-teal-400">{layer.name}</h4>
                    <p className="mt-2 text-xs text-text-3 leading-relaxed text-pretty">
                      {layer.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Bottom Access Section */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
          <div className="card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-800 text-text-1">{copy.cta.title}</h2>
              <p className="mt-2 text-sm text-text-2 max-w-xl text-pretty">
                {copy.cta.description}
              </p>
            </div>
            <a href="/" className="btn-primary shrink-0">
              <span>{copy.cta.button}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-border-subtle">
        <div className="max-w-6xl mx-auto px-6 py-5 text-center text-xs text-text-3">
          {copy.footer}
        </div>
      </footer>
    </div>
  );
}
