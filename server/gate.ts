import { SESSION_COOKIE, deriveSessionKey, parseCookies, verifySessionToken } from './auth.js';
import { loadConfig } from './config.js';

/**
 * Edge "gate": decides, for every request to the site, whether it may be
 * served. Without a valid session the only things anyone (or any crawler)
 * can load are a small login page, the shared UI framework code, the
 * favicon and robots.txt. The app itself, the menu and all data stay hidden.
 */

export const LOGIN_PAGE = '/login.html';

const PUBLIC_PATHS: RegExp[] = [
  /^\/login(\.html)?\/?$/,
  // Built by Vite with fixed prefixes (see vite.config.ts); "app-*" chunks are private.
  /^\/assets\/(login|shared)-[\w-]+\.(js|css|woff2?|svg|png)$/,
  /^\/favicon\.svg$/,
  /^\/robots\.txt$/,
];

export type GateDecision =
  | { action: 'allow' }
  | { action: 'login' } // show the login page (URL unchanged)
  | { action: 'home' } // already logged in - skip the login page
  | { action: 'deny' };

function wantsPage(request: Request, pathname: string): boolean {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false;
  const accept = request.headers.get('accept') ?? '';
  return accept.includes('text/html') || pathname === '/' || pathname.endsWith('.html') || !/\.[a-z0-9]+$/i.test(pathname);
}

export function decide(request: Request, isAuthenticated: (request: Request) => boolean): GateDecision {
  const { pathname } = new URL(request.url);

  // The API checks the session itself (and must be reachable to log in).
  if (pathname === '/api' || pathname.startsWith('/api/')) return { action: 'allow' };

  const isLoginPage = PUBLIC_PATHS[0].test(pathname);
  if (isLoginPage && isAuthenticated(request)) return { action: 'home' };
  if (PUBLIC_PATHS.some((re) => re.test(pathname))) return { action: 'allow' };
  if (isAuthenticated(request)) return { action: 'allow' };
  return wantsPage(request, pathname) ? { action: 'login' } : { action: 'deny' };
}

/** Session check using the same signing key as the API. Fails closed. */
export function sessionChecker(env: Record<string, string | undefined> = process.env): (request: Request) => boolean {
  let key: Buffer;
  try {
    const config = loadConfig(env);
    key = deriveSessionKey(config.sessionSecret, config.passwordFingerprint);
  } catch {
    return () => false;
  }
  return (request) => verifySessionToken(parseCookies(request.headers.get('cookie'))[SESSION_COOKIE], key, new Date());
}

export const HIDDEN_HEADERS: Record<string, string> = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate, noai, noimageai',
};
