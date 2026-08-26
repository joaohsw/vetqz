/**
 * Layout — Application shell.
 *
 * Quiet header with wordmark, no emoji, no gradient text.
 * Follows Warm Humanist × Modern Tool language.
 */

import { Languages, PawPrint } from 'lucide-react';
import { formatMessage, getTranslations, LANGUAGE_OPTIONS } from '../i18n';

export default function Layout({ children, language, onLanguageChange }) {
  const copy = getTranslations(language);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border-subtle">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
              <PawPrint className="w-4 h-4 text-surface-0" />
            </div>
            <span className="font-['Plus_Jakarta_Sans'] text-lg font-800 tracking-tight text-text-1">
              vetQz
            </span>
          </div>

          <div
            className="flex items-center gap-1 rounded-lg border border-border-subtle bg-surface-1 p-1"
            role="group"
            aria-label={copy.layout.languageSelector}
          >
            <Languages className="w-3.5 h-3.5 text-text-3 ml-1" aria-hidden="true" />
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
      </header>

      {/* Main content */}
      <main className="flex-1 px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle">
        <div className="max-w-2xl mx-auto px-6 py-4 text-center text-xs text-text-3">
          vetQz &middot; {copy.layout.footer}
        </div>
      </footer>
    </div>
  );
}
