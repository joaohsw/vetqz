/**
 * App — Root component do vetQz.
 */

import { useEffect, useState } from 'react';
import { useAuth } from './auth/useAuth';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import { DEFAULT_LANGUAGE, getTranslations } from './i18n';

const LANGUAGE_STORAGE_KEY = 'vetqz-language';
const THEME_STORAGE_KEY = 'vetqz-theme';

function getInitialLanguage() {
  const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (savedLanguage === 'pt-BR' || savedLanguage === 'es-CL') {
    return savedLanguage;
  }

  return window.navigator.language?.toLowerCase().startsWith('es')
    ? 'es-CL'
    : DEFAULT_LANGUAGE;
}

function getInitialTheme() {
  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return savedTheme === 'light' ? 'light' : 'dark';
}

export default function App() {
  const [language, setLanguage] = useState(getInitialLanguage);
  const [theme, setTheme] = useState(getInitialTheme);
  const { session, user, isAnonymous, isLoading, signOut } = useAuth();

  useEffect(() => {
    const copy = getTranslations(language);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.title = copy.metadata.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', copy.metadata.description);
  }, [language]);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  return (
    <Layout
      language={language}
      onLanguageChange={setLanguage}
      theme={theme}
      onThemeChange={setTheme}
      session={session}
      user={user}
      isAnonymous={isAnonymous}
      onSignOut={signOut}
    >
      {isLoading ? (
        <div
          className="max-w-md mx-auto py-20 flex flex-col items-center gap-3 text-sm text-text-3"
          role="status"
          aria-live="polite"
        >
          <span className="spinner text-teal-400" aria-hidden="true" />
          <span>{getTranslations(language).login.restoringSession}</span>
        </div>
      ) : session ? (
        <Home language={language} />
      ) : (
        <Login language={language} />
      )}
    </Layout>
  );
}
