// The API supplies the rounded value; both views only format it for the locale.
export function formatScore(score, language) {
  return new Intl.NumberFormat(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(score);
}

export function legacyScoreNotice(session, language) {
  const count = session?.legacy_unplaced_attempts?.length || 0;
  if (!count) return null;
  return language === 'es-CL'
    ? `${count} respuestas antiguas sin posición verificable no se incluyen en el promedio.`
    : `${count} respostas antigas sem posição verificável não entram na média.`;
}
