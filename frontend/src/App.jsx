/**
 * App — Root component do vetQz.
 */

import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import { DEFAULT_LANGUAGE, getTranslations } from './i18n';

const LANGUAGE_STORAGE_KEY = 'vetqz-language';

function getInitialLanguage() {
  const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (savedLanguage === 'pt-BR' || savedLanguage === 'es-CL') {
    return savedLanguage;
  }

  return window.navigator.language?.toLowerCase().startsWith('es')
    ? 'es-CL'
    : DEFAULT_LANGUAGE;
}

export default function App() {
  const [language, setLanguage] = useState(getInitialLanguage);

  useEffect(() => {
    const copy = getTranslations(language);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.title = copy.metadata.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', copy.metadata.description);
  }, [language]);

  return (
    <Layout language={language} onLanguageChange={setLanguage}>
      <Home language={language} />
    </Layout>
  );
}
