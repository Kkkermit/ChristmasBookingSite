// Vercel Routing Middleware - runs before every request, including static files.
// Anyone without a valid session only ever sees the login page; the app,
// the menu PDF and every other file return the login page or a 404.
import { next, rewrite } from '@vercel/functions';
import { HIDDEN_HEADERS, LOGIN_PAGE, decide, sessionChecker } from './server/gate.js';

export const config = {
  runtime: 'nodejs',
};

let isAuthenticated: ((request: Request) => boolean) | null = null;

export default function middleware(request: Request): Response {
  isAuthenticated ??= sessionChecker(process.env);
  const decision = decide(request, isAuthenticated);

  switch (decision.action) {
    case 'allow':
      return next();
    case 'home':
      return new Response(null, { status: 302, headers: { ...HIDDEN_HEADERS, Location: '/' } });
    case 'login':
      return rewrite(new URL(LOGIN_PAGE, request.url), { headers: HIDDEN_HEADERS });
    case 'deny':
      return new Response('Not found', {
        status: 404,
        headers: { ...HIDDEN_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' },
      });
  }
}
