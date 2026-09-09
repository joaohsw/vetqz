/**
 * Layout — Application shell.
 *
 * Quiet header with wordmark, no emoji, no gradient text.
 * Follows Warm Humanist × Modern Tool language.
 */

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Languages,
  ListTree,
  LogOut,
  MessageSquare,
  Moon,
  PawPrint,
  Sun,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import { formatMessage, getTranslations, LANGUAGE_OPTIONS } from '../i18n';

export default function Layout({
  children,
  language,
  onLanguageChange,
  theme,
  onThemeChange,
  session = null,
  user = null,
  isAnonymous = false,
  onSignOut,
  studyProgressKey = 'upload',
}) {
  const copy = getTranslations(language);
  const isLight = theme === 'light';
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const userLabel = isAnonymous ? copy.layout.guest : user?.email || copy.layout.signedIn;

  useEffect(() => {
    if (!isAccountMenuOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsAccountMenuOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  const handleSignOut = async () => {
    if (isSigningOut || !onSignOut) return;

    setIsSigningOut(true);
    setSignOutFailed(false);
    try {
      await onSignOut();
      setIsAccountMenuOpen(false);
    } catch {
      setSignOutFailed(true);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border-subtle">
        {session ? (
          <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                id="account-menu-btn"
                type="button"
                onClick={() => {
                  setSignOutFailed(false);
                  setIsAccountMenuOpen(true);
                }}
                aria-label={copy.layout.openAccountMenu}
                aria-expanded={isAccountMenuOpen}
                aria-controls="account-sidebar"
                title={copy.layout.openAccountMenu}
                className="w-10 h-10 rounded-xl border border-border-subtle bg-surface-1 flex items-center justify-center text-text-2 transition-colors hover:bg-surface-2 hover:border-border-default hover:text-text-1 shrink-0"
              >
                <UserRound className="w-5 h-5" aria-hidden="true" />
              </button>
              <span className="h-6 w-px bg-border-subtle shrink-0" aria-hidden="true" />
              <Brand />
            </div>

            <StudyProgress copy={copy} activeKey={studyProgressKey} />

            <SettingsControls
              copy={copy}
              language={language}
              onLanguageChange={onLanguageChange}
              isLight={isLight}
              onThemeChange={onThemeChange}
              className="justify-self-end"
            />
          </div>
        ) : (
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <Brand />
            <SettingsControls
              copy={copy}
              language={language}
              onLanguageChange={onLanguageChange}
              isLight={isLight}
              onThemeChange={onThemeChange}
            />
          </div>
        )}
      </header>

      {session && isAccountMenuOpen && (
        <AccountSidebar
          copy={copy}
          userLabel={userLabel}
          isAnonymous={isAnonymous}
          isSigningOut={isSigningOut}
          signOutFailed={signOutFailed}
          onClose={() => setIsAccountMenuOpen(false)}
          onSignOut={handleSignOut}
        />
      )}

      {/* Main content */}
      <main className="flex-1 px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle">
        <div className="max-w-6xl mx-auto px-6 py-4 text-center text-xs text-text-3">
          vetQz &middot; {copy.layout.footer}
        </div>
      </footer>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center justify-center gap-2.5">
      <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center shrink-0">
        <PawPrint className="w-5 h-5 text-surface-0" aria-hidden="true" />
      </div>
      <span className="max-[359px]:hidden font-['Plus_Jakarta_Sans'] text-lg font-800 tracking-tight text-text-1">
        vetQz
      </span>
    </div>
  );
}

function StudyProgress({ copy, activeKey }) {
  const steps = [
    { key: 'upload', label: copy.home.steps.upload, icon: Upload },
    { key: 'setup', label: copy.home.steps.setup, icon: ListTree },
    { key: 'answer', label: copy.home.steps.answer, icon: MessageSquare },
    { key: 'summary', label: copy.home.steps.summary, icon: BarChart3 },
  ];
  const activeIndex = steps.findIndex((step) => step.key === activeKey);

  return (
    <nav className="hidden lg:flex items-center gap-1" aria-label={copy.home.progress}>
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = index === activeIndex;
        const isDone = index < activeIndex;

        return (
          <div key={step.key} className="flex items-center gap-1">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-500 transition-all duration-200 ${
                isActive
                  ? 'bg-teal-500/15 text-teal-400'
                  : isDone
                    ? 'text-teal-400/60'
                    : 'text-text-3'
              }`}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <ArrowRight
                className={`w-3 h-3 ${isDone ? 'text-teal-400/40' : 'text-border-subtle'}`}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

function SettingsControls({
  copy,
  language,
  onLanguageChange,
  isLight,
  onThemeChange,
  className = '',
}) {
  return (
    <div className={`flex items-center gap-2 shrink-0 ${className}`}>
      <div
        className="flex items-center gap-1 rounded-lg border border-border-subtle bg-surface-1 p-1"
        role="group"
        aria-label={copy.layout.themeSelector}
      >
        <button
          id="theme-dark-btn"
          type="button"
          onClick={() => onThemeChange('dark')}
          aria-pressed={!isLight}
          aria-label={copy.layout.switchToDark}
          className={`flex items-center justify-center w-6 h-6 rounded-md transition-colors ${
            !isLight
              ? 'bg-teal-500 text-surface-0'
              : 'text-text-3 hover:text-text-1 hover:bg-surface-2'
          }`}
        >
          <Moon className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
        <button
          id="theme-light-btn"
          type="button"
          onClick={() => onThemeChange('light')}
          aria-pressed={isLight}
          aria-label={copy.layout.switchToLight}
          className={`flex items-center justify-center w-6 h-6 rounded-md transition-colors ${
            isLight
              ? 'bg-teal-500 text-surface-0'
              : 'text-text-3 hover:text-text-1 hover:bg-surface-2'
          }`}
        >
          <Sun className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      <div
        className="flex items-center gap-1 rounded-lg border border-border-subtle bg-surface-1 p-1"
        role="group"
        aria-label={copy.layout.languageSelector}
      >
        <Languages className="hidden sm:block w-3.5 h-3.5 text-text-3 ml-1" aria-hidden="true" />
        {LANGUAGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            id={`language-${option.shortLabel.toLowerCase()}-btn`}
            type="button"
            onClick={() => onLanguageChange(option.value)}
            aria-pressed={language === option.value}
            aria-label={formatMessage(copy.layout.switchTo, { language: option.name })}
            className={`px-2 py-1 rounded-md text-xs font-600 transition-colors ${
              language === option.value
                ? 'bg-teal-500 text-surface-0'
                : 'text-text-3 hover:text-text-1 hover:bg-surface-2'
            }`}
          >
            {option.shortLabel}
          </button>
        ))}
      </div>
    </div>
  );
}

function AccountSidebar({
  copy,
  userLabel,
  isAnonymous,
  isSigningOut,
  signOutFailed,
  onClose,
  onSignOut,
}) {
  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <button
        type="button"
        onClick={onClose}
        className="account-sidebar-backdrop absolute inset-0 bg-surface-0/70 backdrop-blur-[2px]"
        aria-label={copy.layout.closeAccountMenu}
        tabIndex={-1}
      />

      <aside
        id="account-sidebar"
        className="account-sidebar relative h-full w-[min(20rem,calc(100vw-2rem))] border-r border-border-subtle bg-surface-1 shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-sidebar-title"
      >
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between gap-4">
          <h2 id="account-sidebar-title" className="text-base font-700 text-text-1">
            {copy.layout.accountMenu}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.layout.closeAccountMenu}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-text-3 transition-colors hover:bg-surface-2 hover:text-text-1"
            autoFocus
          >
            <X className="w-4.5 h-4.5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5">
          <div className="rounded-xl border border-border-subtle bg-surface-0 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 flex items-center justify-center text-teal-400 shrink-0">
              <UserRound className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-3">
                {isAnonymous ? copy.layout.guest : copy.layout.signedIn}
              </p>
              <p className="mt-0.5 text-sm font-600 text-text-1 truncate" title={userLabel}>
                {userLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Future account navigation items can be added in this flexible area. */}
        <div className="flex-1" />

        <div className="p-5 border-t border-border-subtle">
          {signOutFailed && (
            <p className="mb-3 text-xs text-danger" role="alert">
              {copy.layout.signOutError}
            </p>
          )}
          <button
            id="sign-out-btn"
            type="button"
            onClick={onSignOut}
            disabled={isSigningOut}
            className="btn-secondary w-full"
          >
            {isSigningOut ? (
              <span className="spinner w-4 h-4" aria-hidden="true" />
            ) : (
              <LogOut className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{isSigningOut ? copy.layout.signingOut : copy.layout.signOut}</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
