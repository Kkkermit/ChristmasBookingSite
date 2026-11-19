import { randomUUID } from 'node:crypto';
import { RESTAURANT_NAME } from '../shared/menu.js';
import type { ApiErrorBody, BookingDetails, Order, PublicConfig } from '../shared/types.js';
import { emptyDetails, nameKey, validateDetails, validateOrderInput } from '../shared/validation.js';
import {
  SESSION_COOKIE,
  clearSessionCookie,
  createSessionToken,
  deriveSessionKey,
  parseCookies,
  sessionCookie,
  verifySessionToken,
} from './auth.js';
import type { ServerConfig } from './config.js';
import { MENU_FILENAME, fetchMenuPdf } from './menu.js';
import { fillBookingForm } from './pdf.js';
import type { Store } from './store/types.js';

export type Handler = (request: Request) => Promise<Response>;

export interface AppDeps {
  config: ServerConfig;
  /** null when no database is connected (production without Redis). */
  store: Store | null;
  loadTemplate: () => Promise<Uint8Array>;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

export const LOGIN_MAX_FAILURES = 10;
export const LOGIN_WINDOW_SECONDS = 15 * 60;
const MAX_BODY_BYTES = 16 * 1024;
const ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;

export const BOOKING_FORM_FILENAME = 'Christmas-Booking-Form-2026.pdf';

const BASE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
};

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...BASE_HEADERS, 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

function errorResponse(err: HttpError): Response {
  const body: ApiErrorBody = { error: err.message };
  if (err.code) body.code = err.code;
  if (err.fieldErrors) body.fieldErrors = err.fieldErrors;
  return json(err.status, body);
}

function pdf(bytes: Uint8Array, filename: string, inline: boolean): Response {
  return new Response(bytes as BodyInit, {
    status: 200,
    headers: {
      ...BASE_HEADERS,
      'Content-Type': 'application/pdf',
      'Content-Length': String(bytes.length),
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${filename}"`,
    },
  });
}

/**
 * Works out the API sub-path. On Vercel every /api/* request is rewritten to
 * the single function as /api?route=<rest>; locally the path arrives as-is.
 */
export function resolveRoute(url: URL): string {
  let route = '';
  if (url.pathname.startsWith('/api/')) route = url.pathname.slice('/api'.length);
  else if (url.pathname === '/api' || url.pathname === '/api/') route = `/${url.searchParams.get('route') ?? ''}`;
  route = route.replace(/\/+$/, '');
  return route || '/';
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

async function readJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new HttpError(415, 'Requests must be JSON');
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, 'Request is too large');
  try {
    return JSON.parse(text || '{}');
  } catch {
    throw new HttpError(400, 'Request body is not valid JSON');
  }
}

/** Blocks cross-site requests that try to change data (belt and braces on top of SameSite cookies). */
function assertSameOrigin(request: Request, url: URL) {
  const origin = request.headers.get('origin');
  if (!origin) return;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? url.host;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, 'Cross-site request blocked');
  }
  if (originHost !== host) throw new HttpError(403, 'Cross-site request blocked');
}

function byCreated(a: Order, b: Order) {
  return a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name);
}

export function createApp(deps: AppDeps): Handler {
  const { config, store } = deps;
  const now = deps.now ?? (() => new Date());
  const fetchImpl = deps.fetchImpl ?? fetch;
  const sessionKey = deriveSessionKey(config.sessionSecret, config.passwordFingerprint);

  const ordersOpen = () => now().getTime() <= config.deadline.getTime();

  const publicConfig = (): PublicConfig => ({
    deadline: config.deadline.toISOString(),
    ordersOpen: ordersOpen(),
    partySize: config.partySize,
    maxGuests: config.maxGuests,
    restaurantName: RESTAURANT_NAME,
  });

  const requireStore = (): Store => {
    if (!store) {
      throw new HttpError(
        503,
        'The database is not connected yet. In Vercel open the project → Storage → add "Upstash for Redis", connect it to this project and redeploy.',
        'NO_STORAGE',
      );
    }
    return store;
  };

  const requireOpen = () => {
    if (!ordersOpen()) {
      throw new HttpError(403, 'Orders closed on 8 December - the elves have locked the list!', 'CLOSED');
    }
  };

  const isAuthenticated = (request: Request) =>
    verifySessionToken(parseCookies(request.headers.get('cookie'))[SESSION_COOKIE], sessionKey, now());

  const loadDetails = async (s: Store): Promise<BookingDetails> => ({ ...emptyDetails(), ...(await s.getDetails()) });

  async function login(request: Request, secure: boolean): Promise<Response> {
    // Only failed attempts count, so a whole office sharing one IP can still log in.
    const rateKey = `login-fail:${clientIp(request)}`;
    const tooMany = () =>
      new HttpError(429, 'Too many wrong guesses. Have a mince pie and try again in 15 minutes.', 'RATE_LIMITED');
    if (store && (await store.peek(rateKey)) >= LOGIN_MAX_FAILURES) throw tooMany();

    const body = (await readJson(request)) as { password?: unknown };
    const password = typeof body.password === 'string' ? body.password : '';
    if (!password || password.length > 200 || !config.checkPassword(password)) {
      if (store && (await store.hit(rateKey, LOGIN_WINDOW_SECONDS)) > LOGIN_MAX_FAILURES) throw tooMany();
      throw new HttpError(401, "That's not the magic word. Try again!", 'BAD_PASSWORD');
    }
    return json(200, { authenticated: true }, { 'Set-Cookie': sessionCookie(createSessionToken(sessionKey, now()), secure) });
  }

  async function createOrder(request: Request): Promise<Response> {
    const s = requireStore();
    requireOpen();
    const result = validateOrderInput(await readJson(request));
    if (!result.ok) throw new HttpError(400, 'Please check the highlighted fields', 'INVALID', result.errors);

    const existing = await s.listOrders();
    if (existing.length >= config.maxGuests) {
      throw new HttpError(409, `The booking form only has room for ${config.maxGuests} guests.`, 'FULL');
    }
    const key = nameKey(result.value.name);
    if (existing.some((o) => nameKey(o.name) === key)) {
      throw new HttpError(409, `${result.value.name} has already ordered - edit their order instead.`, 'DUPLICATE', {
        name: 'Someone with this name has already ordered',
      });
    }
    const stamp = now().toISOString();
    const order: Order = { id: randomUUID(), ...result.value, createdAt: stamp, updatedAt: stamp };
    await s.saveOrder(order);
    return json(201, { order });
  }

  async function updateOrder(request: Request, id: string): Promise<Response> {
    const s = requireStore();
    requireOpen();
    const current = await s.getOrder(id);
    if (!current) throw new HttpError(404, 'That order no longer exists', 'NOT_FOUND');
    const result = validateOrderInput(await readJson(request));
    if (!result.ok) throw new HttpError(400, 'Please check the highlighted fields', 'INVALID', result.errors);

    const key = nameKey(result.value.name);
    const clash = (await s.listOrders()).some((o) => o.id !== id && nameKey(o.name) === key);
    if (clash) {
      throw new HttpError(409, `${result.value.name} has already ordered.`, 'DUPLICATE', {
        name: 'Someone with this name has already ordered',
      });
    }
    const order: Order = { ...current, ...result.value, updatedAt: now().toISOString() };
    await s.saveOrder(order);
    return json(200, { order });
  }

  async function deleteOrder(id: string): Promise<Response> {
    const s = requireStore();
    requireOpen();
    if (!(await s.deleteOrder(id))) throw new HttpError(404, 'That order no longer exists', 'NOT_FOUND');
    return json(200, { deleted: id });
  }

  async function saveDetails(request: Request): Promise<Response> {
    const s = requireStore();
    const result = validateDetails(await readJson(request));
    if (!result.ok) throw new HttpError(400, 'Please check the highlighted fields', 'INVALID', result.errors);
    await s.saveDetails(result.value);
    return json(200, { details: result.value });
  }

  async function bookingForm(url: URL): Promise<Response> {
    const s = requireStore();
    const [orders, details, template] = await Promise.all([s.listOrders(), loadDetails(s), deps.loadTemplate()]);
    const { bytes } = await fillBookingForm(template, orders, details);
    return pdf(bytes, BOOKING_FORM_FILENAME, url.searchParams.get('disposition') === 'inline');
  }

  async function menu(url: URL): Promise<Response> {
    const bytes = await fetchMenuPdf(config.menuUrl, fetchImpl);
    if (!bytes) {
      return new Response(null, { status: 302, headers: { ...BASE_HEADERS, Location: config.menuUrl } });
    }
    return pdf(bytes, MENU_FILENAME, url.searchParams.get('disposition') === 'inline');
  }

  async function route(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = resolveRoute(url);
    const method = request.method.toUpperCase();
    const secure = url.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';

    if (method !== 'GET' && method !== 'HEAD') assertSameOrigin(request, url);

    // --- Public endpoints -------------------------------------------------
    if (path === '/auth/login') {
      if (method !== 'POST') throw new HttpError(405, 'Method not allowed');
      return login(request, secure);
    }
    if (path === '/auth/logout') {
      if (method !== 'POST') throw new HttpError(405, 'Method not allowed');
      return json(200, { authenticated: false }, { 'Set-Cookie': clearSessionCookie(secure) });
    }
    if (path === '/auth/session' && method === 'GET') {
      return json(200, { authenticated: isAuthenticated(request) });
    }

    // --- Everything else needs a valid session ----------------------------
    if (!isAuthenticated(request)) throw new HttpError(401, 'Please enter the password first', 'UNAUTHENTICATED');

    if (path === '/state' && method === 'GET') {
      const s = requireStore();
      const [orders, details] = await Promise.all([s.listOrders(), loadDetails(s)]);
      return json(200, { config: publicConfig(), orders: orders.sort(byCreated), details });
    }
    if (path === '/orders' && method === 'POST') return createOrder(request);

    const orderMatch = /^\/orders\/([^/]+)$/.exec(path);
    if (orderMatch) {
      const id = decodeURIComponent(orderMatch[1]);
      if (!ID_PATTERN.test(id)) throw new HttpError(404, 'That order no longer exists', 'NOT_FOUND');
      if (method === 'PUT') return updateOrder(request, id);
      if (method === 'DELETE') return deleteOrder(id);
      throw new HttpError(405, 'Method not allowed');
    }
    if (path === '/details' && method === 'PUT') return saveDetails(request);
    if (path === '/booking-form' && method === 'GET') return bookingForm(url);
    if (path === '/menu' && method === 'GET') return menu(url);

    throw new HttpError(404, 'Not found', 'NOT_FOUND');
  }

  return async (request: Request) => {
    try {
      return await route(request);
    } catch (err) {
      if (err instanceof HttpError) return errorResponse(err);
      console.error('Unhandled API error', err);
      return errorResponse(new HttpError(500, 'Something went wrong on our side. Please try again.', 'SERVER_ERROR'));
    }
  };
}
