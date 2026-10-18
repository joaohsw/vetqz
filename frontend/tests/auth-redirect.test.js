import assert from 'node:assert/strict';
import test from 'node:test';
import { getAuthRedirectUrl, PRODUCTION_SITE_URL } from '../src/lib/auth-redirect.js';

test('production and previews use the canonical domain', () => {
  assert.equal(getAuthRedirectUrl({origin: 'https://preview.vercel.app'}), PRODUCTION_SITE_URL);
  assert.equal(getAuthRedirectUrl({siteUrl: 'https://study.example.org/path?secret=no#x'}), 'https://study.example.org/');
});
test('unsafe or local configured URLs cannot leak into production redirects', () => {
  for (const siteUrl of ['http://localhost:5173', 'https://localhost', 'https://127.0.0.1', 'https://[::1]', 'javascript:alert(1)', 'invalid', 'https://user:pass@example.org']) {
    assert.equal(getAuthRedirectUrl({siteUrl}), PRODUCTION_SITE_URL);
  }
});
test('development can redirect locally or explicitly to production', () => {
  assert.equal(getAuthRedirectUrl({origin: 'http://localhost:5173', isDevelopment: true}), 'http://localhost:5173/');
  assert.equal(getAuthRedirectUrl({siteUrl: PRODUCTION_SITE_URL, origin: 'http://localhost:5173', isDevelopment: true}), PRODUCTION_SITE_URL);
});
