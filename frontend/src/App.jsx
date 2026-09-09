/**
 * App — Root component do vetQz.
 */

import { useEffect, useState } from 'react';
import { useAuth } from './auth/useAuth';
import Layout from './components/Layout';
import Home from './pages/Home';
import Landing from './pages/Landing';
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
  const [publicPage, setPublicPage] = useState('landing');
  const [authMode, setAuthMode] = useState('signIn');
  const [studyProgressKey, setStudyProgressKey] = useState('upload');
  const { session, user, isAnonymous, signOut } = useAuth();

  const openAuth = (mode) => {
    setAuthMode(mode);
    setPublicPage('auth');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
      studyProgressKey={studyProgressKey}
    >
      {session ? (
        <Home language={language} onProgressChange={setStudyProgressKey} />
      ) : publicPage === 'landing' ? (
        <Landing
          language={language}
          onCreateAccount={() => openAuth('signUp')}
          onSignIn={() => openAuth('signIn')}
        />
      ) : (
        <Login
          key={authMode}
          language={language}
          initialMode={authMode}
          onBack={() => setPublicPage('landing')}
        />
      )}
    </Layout>
  );
}
