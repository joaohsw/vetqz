/**
 * Layout — Application shell.
 *
 * Quiet header with wordmark, no emoji, no gradient text.
 * Follows Warm Humanist × Modern Tool language.
 */

import { useState } from 'react';
import { Languages, LogOut, Moon, PawPrint, Sun, UserRound } from 'lucide-react';
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
}) {
  const copy = getTranslations(language);
  const isLight = theme === 'light';
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  const userLabel = isAnonymous ? copy.layout.guest : user?.email || copy.layout.signedIn;

  const handleSignOut = async () => {
    if (isSigningOut || !onSignOut) return;

    setIsSigningOut(true);
    setSignOutFailed(false);
    try {
      await onSignOut();
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
        <div
          className={`${session ? 'max-w-2xl md:max-w-none md:px-8 lg:px-12' : 'max-w-6xl'} mx-auto px-6 py-4 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center">
              <PawPrint className="w-5 h-5 text-surface-0" />
            </div>
            <span className="font-['Plus_Jakarta_Sans'] text-lg font-800 tracking-tight text-text-1">
              vetQz
            </span>
          </div>

          <div className="min-w-0 flex flex-wrap items-center justify-end gap-2">
            <div className="flex items-center gap-2 shrink-0">
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

            {session && (
              <>
                <span className="hidden sm:block h-5 w-px bg-border-subtle mx-1" aria-hidden="true" />
                <div
                  className="min-w-0 flex items-center gap-1.5 text-xs text-text-3"
                  title={userLabel}
                >
                  <UserRound className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="max-w-28 lg:max-w-40 truncate">{userLabel}</span>
                </div>
                <button
                  id="sign-out-btn"
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  aria-label={copy.layout.signOut}
                  className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-1 px-2.5 py-1.5 text-xs font-600 text-text-2 transition-colors hover:bg-surface-2 hover:text-text-1 disabled:opacity-50"
                >
                  {isSigningOut ? (
                    <span className="spinner w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>{isSigningOut ? copy.layout.signingOut : copy.layout.signOut}</span>
                </button>
                {signOutFailed && (
                  <span className="basis-full w-full text-right text-xs text-danger" role="alert">
                    {copy.layout.signOutError}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </header>

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
