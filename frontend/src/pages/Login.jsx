import { useState } from 'react';
import { AlertCircle, ArrowLeft, CircleCheck, Eye, EyeOff, LogIn, UserPlus, UserRound } from 'lucide-react';

import { useAuth } from '../auth/useAuth';
import { getTranslations } from '../i18n';
import { isSupabaseConfigured } from '../lib/supabase';

function getAuthErrorKey(error) {
  const code = error?.code || '';
  const message = error?.message?.toLowerCase() || '';

  if (code === 'configuration_missing') return 'configuration';
  if (code === 'invalid_credentials') return 'invalidCredentials';
  if (code === 'email_not_confirmed') return 'emailNotConfirmed';
  if (code === 'weak_password') return 'weakPassword';
  if (code === 'user_already_exists' || code === 'user_already_registered') {
    return 'registrationUnavailable';
  }
  if (code.includes('rate_limit') || code === 'too_many_requests') return 'rateLimit';
  if (error?.name === 'AuthRetryableFetchError' || message.includes('fetch')) return 'network';
  return 'unknown';
}

export default function Login({ language, initialMode = 'signIn', onBack }) {
  const copy = getTranslations(language).login;
  const { signIn, signUp, signInAsGuest } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [errorKey, setErrorKey] = useState(null);
  const [successKey, setSuccessKey] = useState(null);

  const isPending = pendingAction !== null;
  const isSignUp = mode === 'signUp';
  const visibleErrorKey = errorKey || (!isSupabaseConfigured ? 'configuration' : null);

  const clearFeedback = () => {
    setErrorKey(null);
    setSuccessKey(null);
  };

  const changeMode = () => {
    setMode((current) => (current === 'signIn' ? 'signUp' : 'signIn'));
    setPassword('');
    setPasswordConfirmation('');
    setShowPassword(false);
    clearFeedback();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isPending) return;

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password || (isSignUp && !passwordConfirmation)) {
      setErrorKey('requiredFields');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setErrorKey('invalidEmail');
      return;
    }
    if (isSignUp && password.length < 8) {
      setErrorKey('weakPassword');
      return;
    }
    if (isSignUp && password !== passwordConfirmation) {
      setErrorKey('passwordMismatch');
      return;
    }

    clearFeedback();
    setPendingAction(isSignUp ? 'signUp' : 'login');
    try {
      if (isSignUp) {
        const data = await signUp({ email: normalizedEmail, password });
        if (!data.session) {
          setMode('signIn');
          setPassword('');
          setPasswordConfirmation('');
          setSuccessKey('confirmationSent');
        }
      } else {
        await signIn({ email: normalizedEmail, password });
      }
    } catch (error) {
      setErrorKey(getAuthErrorKey(error));
    } finally {
      setPendingAction(null);
    }
  };

  const handleGuestSignIn = async () => {
    if (isPending) return;

    clearFeedback();
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
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-sm font-600 text-text-3 transition-colors hover:text-text-1"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          {copy.backToHome}
        </button>
      )}
      <div className="mb-6 text-center">
        <p className="text-xs font-600 uppercase tracking-[0.16em] text-teal-400">
          {copy.eyebrow}
        </p>
        <h1
          id="login-title"
          className="mt-2 text-2xl sm:text-3xl font-800 tracking-tight text-text-1"
        >
          {isSignUp ? copy.signUpTitle : copy.title}
        </h1>
        <p className="mt-2 text-sm text-text-3 text-pretty">
          {isSignUp ? copy.signUpDescription : copy.description}
        </p>
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
                clearFeedback();
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
                  clearFeedback();
                }}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
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
            {isSignUp && <p className="text-xs text-text-3">{copy.passwordHint}</p>}
          </div>

          {isSignUp && (
            <div className="space-y-1.5">
              <label
                htmlFor="login-password-confirmation"
                className="block text-sm font-500 text-text-2"
              >
                {copy.passwordConfirmationLabel}
              </label>
              <input
                id="login-password-confirmation"
                name="password-confirmation"
                type={showPassword ? 'text' : 'password'}
                value={passwordConfirmation}
                onChange={(event) => {
                  setPasswordConfirmation(event.target.value);
                  clearFeedback();
                }}
                autoComplete="new-password"
                disabled={isPending}
                aria-invalid={errorKey === 'passwordMismatch' ? 'true' : undefined}
                aria-describedby={visibleErrorKey ? 'login-error' : undefined}
                className="input-field disabled:opacity-60"
              />
            </div>
          )}

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

          {successKey && (
            <div
              id="signup-success"
              role="status"
              className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-success"
            >
              <CircleCheck className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>{copy.success[successKey]}</span>
            </div>
          )}

          <button
            id={isSignUp ? 'signup-submit-btn' : 'login-submit-btn'}
            type="submit"
            disabled={isPending || !isSupabaseConfigured}
            aria-busy={pendingAction === 'login' || pendingAction === 'signUp'}
            className="btn-primary w-full"
          >
            {pendingAction === 'login' || pendingAction === 'signUp' ? (
              <>
                <span className="spinner" aria-hidden="true" />
                {pendingAction === 'signUp' ? copy.creatingAccount : copy.signingIn}
              </>
            ) : (
              <>
                {isSignUp ? (
                  <UserPlus className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <LogIn className="w-4 h-4" aria-hidden="true" />
                )}
                {isSignUp ? copy.createAccount : copy.signIn}
              </>
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-text-3">
          {isSignUp ? copy.haveAccount : copy.noAccount}{' '}
          <button
            type="button"
            onClick={changeMode}
            disabled={isPending}
            className="font-600 text-teal-400 hover:text-teal-300 transition-colors disabled:opacity-50"
          >
            {isSignUp ? copy.goToSignIn : copy.goToSignUp}
          </button>
        </p>

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
