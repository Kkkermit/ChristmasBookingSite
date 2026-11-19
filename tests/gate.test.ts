import { describe, expect, it } from 'vitest';
import { createSessionToken, deriveSessionKey } from '../server/auth.js';
import { loadConfig } from '../server/config.js';
import { decide, sessionChecker } from '../server/gate.js';

const ORIGIN = 'https://feast.example.com';
const page = (path: string, headers: Record<string, string> = {}) =>
  new Request(`${ORIGIN}${path}`, { headers: { accept: 'text/html,application/xhtml+xml', ...headers } });
const asset = (path: string, headers: Record<string, string> = {}) =>
  new Request(`${ORIGIN}${path}`, { headers: { accept: '*/*', ...headers } });

const anon = () => false;
const member = () => true;

describe('edge gate - visitors without a session', () => {
  it('only ever see the login page for any page URL', () => {
    for (const path of ['/', '/index.html', '/anything', '/admin', '/wp-login.php.html']) {
      expect(decide(page(path), anon), path).toEqual({ action: 'login' });
    }
  });

  it('cannot fetch the private app bundle, the menu PDF or other files', () => {
    for (const path of [
      '/assets/app-AbC123.js',
      '/files/smokehouse-christmas-menu-2026.pdf',
      '/assets/app-AbC123.js.map',
      '/assets/evil-x.js',
      '/.env',
    ]) {
      expect(decide(asset(path), anon), path).toEqual({ action: 'deny' });
    }
  });

  it('can load the login page, its public assets, the favicon and robots.txt', () => {
    for (const path of ['/login.html', '/login', '/assets/login-Xy9_z.js', '/assets/shared-AbC-1.js', '/assets/shared-AbC.css', '/favicon.svg', '/robots.txt']) {
      expect(decide(asset(path), anon), path).toEqual({ action: 'allow' });
    }
  });

  it('can reach the API, which enforces its own authentication', () => {
    expect(decide(asset('/api/auth/login'), anon)).toEqual({ action: 'allow' });
    expect(decide(asset('/api/state'), anon)).toEqual({ action: 'allow' });
  });

  it('gets a 404, not the login page, for non-GET requests to pages', () => {
    expect(decide(new Request(`${ORIGIN}/`, { method: 'POST', headers: { accept: 'text/html' } }), anon)).toEqual({ action: 'deny' });
  });
});

describe('edge gate - logged-in guests', () => {
  it('can load everything', () => {
    for (const path of ['/', '/assets/app-AbC123.js', '/files/smokehouse-christmas-menu-2026.pdf']) {
      expect(decide(asset(path), member), path).toEqual({ action: 'allow' });
    }
  });

  it('skip the login page', () => {
    expect(decide(page('/login.html'), member)).toEqual({ action: 'home' });
  });
});

describe('sessionChecker', () => {
  const env = { SITE_PASSWORD: 'pw', SESSION_SECRET: 'secret' };

  it('accepts a session cookie minted by the API and rejects anything else', () => {
    const config = loadConfig(env);
    const token = createSessionToken(deriveSessionKey(config.sessionSecret, config.passwordFingerprint), new Date());
    const check = sessionChecker(env);
    expect(check(page('/', { cookie: `xmas_session=${token}` }))).toBe(true);
    expect(check(page('/', { cookie: `xmas_session=${token}x` }))).toBe(false);
    expect(check(page('/'))).toBe(false);
  });

  it('fails closed when the server is misconfigured', () => {
    const check = sessionChecker({ VERCEL: '1' });
    expect(check(page('/', { cookie: 'xmas_session=anything' }))).toBe(false);
  });
});
