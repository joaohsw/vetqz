import { useState } from 'react';
import { AlertCircle, Eye, EyeOff, LogIn, UserRound } from 'lucide-react';

import { useAuth } from '../auth/useAuth';
import { getTranslations } from '../i18n';
import { isSupabaseConfigured } from '../lib/supabase';

function getAuthErrorKey(error) {
  const code = error?.code || '';
  const message = error?.message?.toLowerCase() || '';

  if (code === 'configuration_missing') return 'configuration';
  if (code === 'invalid_credentials') return 'invalidCredentials';
  if (code === 'email_not_confirmed') return 'emailNotConfirmed';
  if (code.includes('rate_limit') || code === 'too_many_requests') return 'rateLimit';
  if (error?.name === 'AuthRetryableFetchError' || message.includes('fetch')) return 'network';
  return 'unknown';
}

export default function Login({ language }) {
  const copy = getTranslations(language).login;
  const { signIn, signInAsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [errorKey, setErrorKey] = useState(null);

  const isPending = pendingAction !== null;
  const visibleErrorKey = errorKey || (!isSupabaseConfigured ? 'configuration' : null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isPending) return;

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setErrorKey('requiredFields');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setErrorKey('invalidEmail');
      return;
    }

    setErrorKey(null);
    setPendingAction('login');
    try {
      await signIn({ email: normalizedEmail, password });
    } catch (error) {
      setErrorKey(getAuthErrorKey(error));
    } finally {
      setPendingAction(null);
    }
  };

  const handleGuestSignIn = async () => {
    if (isPending) return;

    setErrorKey(null);
    setPendingAction('guest');
    try {
      await signInAsGuest();
    } catch (error) {
      setErrorKey(getAuthErrorKey(error));
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <section
      className="max-w-md mx-auto py-6 sm:py-12 animate-enter"
      aria-labelledby="login-title"
    >
      <div className="mb-6 text-center">
        <p className="text-xs font-600 uppercase tracking-[0.16em] text-teal-400">
          {copy.eyebrow}
        </p>
        <h1
          id="login-title"
          className="mt-2 text-2xl sm:text-3xl font-800 tracking-tight text-text-1"
        >
          {copy.title}
        </h1>
        <p className="mt-2 text-sm text-text-3 text-pretty">{copy.description}</p>
      </div>

      <div className="card p-5 sm:p-6">
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-1.5">
            <label htmlFor="login-email" className="block text-sm font-500 text-text-2">
              {copy.emailLabel}
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setErrorKey(null);
              }}
              autoComplete="email"
              inputMode="email"
              disabled={isPending}
              aria-invalid={visibleErrorKey ? 'true' : undefined}
              aria-describedby={visibleErrorKey ? 'login-error' : undefined}
              className="input-field disabled:opacity-60"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-password" className="block text-sm font-500 text-text-2">
              {copy.passwordLabel}
            </label>
            <div className="relative">
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrorKey(null);
                }}
                autoComplete="current-password"
                disabled={isPending}
                aria-invalid={visibleErrorKey ? 'true' : undefined}
                aria-describedby={visibleErrorKey ? 'login-error' : undefined}
                className="input-field pr-12 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                disabled={isPending}
                aria-label={showPassword ? copy.hidePassword : copy.showPassword}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-text-3 hover:text-text-1 transition-colors disabled:opacity-50"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {visibleErrorKey && (
            <div
              id="login-error"
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-muted/10 px-3 py-2.5 text-sm text-danger"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>{copy.errors[visibleErrorKey]}</span>
            </div>
          )}

          <button
            id="login-submit-btn"
            type="submit"
            disabled={isPending || !isSupabaseConfigured}
            aria-busy={pendingAction === 'login'}
            className="btn-primary w-full"
          >
            {pendingAction === 'login' ? (
              <>
                <span className="spinner" aria-hidden="true" />
                {copy.signingIn}
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" aria-hidden="true" />
                {copy.signIn}
              </>
            )}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5" aria-hidden="true">
          <span className="h-px flex-1 bg-border-subtle" />
          <span className="text-xs text-text-3">{copy.or}</span>
          <span className="h-px flex-1 bg-border-subtle" />
        </div>

        <button
          id="guest-login-btn"
          type="button"
          onClick={handleGuestSignIn}
          disabled={isPending || !isSupabaseConfigured}
          aria-busy={pendingAction === 'guest'}
          className="btn-secondary w-full"
        >
          {pendingAction === 'guest' ? (
            <>
              <span className="spinner" aria-hidden="true" />
              {copy.enteringAsGuest}
            </>
          ) : (
            <>
              <UserRound className="w-4 h-4" aria-hidden="true" />
              {copy.continueAsGuest}
            </>
          )}
        </button>

        <p className="mt-3 text-xs leading-relaxed text-text-3 text-pretty">
          {copy.guestNotice}
        </p>
      </div>
    </section>
  );
}
