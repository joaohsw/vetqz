/**
 * App — Root component do vetQz.
 */

import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
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
    >
      <Home language={language} />
    </Layout>
  );
}
