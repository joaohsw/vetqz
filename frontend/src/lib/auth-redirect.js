// Canonical production URL; local redirects are allowed only in development.
export const PRODUCTION_SITE_URL = 'https://vetqz.vercel.app/';

export function getAuthRedirectUrl({ siteUrl, origin, isDevelopment = false } = {}) {
  const candidate = siteUrl?.trim() || (isDevelopment ? origin : PRODUCTION_SITE_URL);
  try {
    const url = new URL(candidate);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      || url.hostname.endsWith('.localhost');
    if (url.username || url.password || (!isDevelopment && (local || url.protocol !== 'https:'))
      || !['http:', 'https:'].includes(url.protocol)) return PRODUCTION_SITE_URL;
    return url.origin + '/';
  } catch {
    return PRODUCTION_SITE_URL;
  }
}
