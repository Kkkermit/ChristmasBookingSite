import { describe, expect, it } from 'vitest';
import { LOGIN_MAX_FAILURES, resolveRoute } from '../server/app.js';
import { MemoryStore } from '../server/store/memory.js';
import { DuplicateNameError } from '../server/store/types.js';
import { MENU_PDF_PATH } from '../shared/menu.js';
import type { AppState, Order } from '../shared/types.js';
import { ORIGIN, TEST_PASSWORD, login, makeApp, req, sampleOrder } from './helpers.js';

const PROTECTED: Array<[string, string, unknown?]> = [
  ['GET', '/api/state'],
  ['POST', '/api/orders', sampleOrder()],
  ['PUT', '/api/orders/abc', sampleOrder()],
  ['DELETE', '/api/orders/abc'],
  ['PUT', '/api/details', {}],
  ['GET', '/api/booking-form'],
  ['GET', '/api/menu'],
  ['GET', '/api/does-not-exist'],
  ['GET', '/api?route=state'],
];

describe('authentication guard', () => {
  it.each(PROTECTED)('%s %s is rejected without a session', async (method, route, body) => {
    const { app } = makeApp();
    const res = await app(req(method, route, { body }));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it.each(PROTECTED)('%s %s is rejected with a forged cookie', async (method, route, body) => {
    const { app } = makeApp();
    const forged = 'xmas_session=eyJ2IjoxLCJleHAiOjk5OTk5OTk5OTl9.c2lnbmF0dXJl';
    const res = await app(req(method, route, { body, cookie: forged }));
    expect(res.status).toBe(401);
  });

  it('does not change any data for unauthenticated writes', async () => {
    const { app, store } = makeApp();
    await app(req('POST', '/api/orders', { body: sampleOrder() }));
    await app(req('PUT', '/api/details', { body: { bookingName: 'Hacker' } }));
    expect(await store!.listOrders()).toHaveLength(0);
    expect(await store!.getDetails()).toBeNull();
  });

  it('rejects a session signed for a different password', async () => {
    const first = makeApp();
    const cookie = await login(first.app);
    const second = makeApp({ env: { SITE_PASSWORD: 'a-brand-new-password' } });
    const res = await second.app(req('GET', '/api/state', { cookie }));
    expect(res.status).toBe(401);
  });

  it('rejects an expired session', async () => {
    const { app, clock } = makeApp();
    const cookie = await login(app);
    clock.now = new Date(clock.now.getTime() + 31 * 24 * 3600 * 1000);
    expect((await app(req('GET', '/api/state', { cookie }))).status).toBe(401);
  });
});

describe('login / logout', () => {
  it('rejects the wrong password', async () => {
    const { app } = makeApp();
    const res = await app(req('POST', '/api/auth/login', { body: { password: 'mince pies' } }));
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('rejects missing or non-string passwords', async () => {
    const { app } = makeApp();
    for (const body of [{}, { password: 123 }, { password: '' }, { password: 'x'.repeat(500) }]) {
      expect((await app(req('POST', '/api/auth/login', { body }))).status).toBe(401);
    }
  });

  it('issues an HttpOnly, SameSite=Strict, Secure session cookie for the right password', async () => {
    const { app } = makeApp();
    const res = await app(req('POST', '/api/auth/login', { body: { password: TEST_PASSWORD } }));
    expect(res.status).toBe(200);
    const cookie = res.headers.get('set-cookie')!;
    expect(cookie).toMatch(/^xmas_session=[^;]+\./);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('Path=/');
  });

  it('omits Secure on plain-http localhost (dev server)', async () => {
    const { app } = makeApp();
    const res = await app(
      new Request('http://localhost:5173/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: TEST_PASSWORD }),
      }),
    );
    expect(res.headers.get('set-cookie')).not.toContain('Secure');
  });

  it('reports the session status', async () => {
    const { app } = makeApp();
    expect(await (await app(req('GET', '/api/auth/session'))).json()).toEqual({ authenticated: false });
    const cookie = await login(app);
    expect(await (await app(req('GET', '/api/auth/session', { cookie }))).json()).toEqual({ authenticated: true });
  });

  it('logout clears the cookie', async () => {
    const { app } = makeApp();
    const res = await app(req('POST', '/api/auth/logout', { body: {} }));
    expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  it('locks out an IP after too many wrong guesses - even with the right password', async () => {
    const { app } = makeApp();
    const headers = { 'x-forwarded-for': '203.0.113.9' };
    for (let i = 0; i < LOGIN_MAX_FAILURES; i++) {
      expect((await app(req('POST', '/api/auth/login', { body: { password: 'nope' }, headers }))).status).toBe(401);
    }
    const blocked = await app(req('POST', '/api/auth/login', { body: { password: TEST_PASSWORD }, headers }));
    expect(blocked.status).toBe(429);
    // A different IP is unaffected.
    const other = await app(
      req('POST', '/api/auth/login', { body: { password: TEST_PASSWORD }, headers: { 'x-forwarded-for': '198.51.100.1' } }),
    );
    expect(other.status).toBe(200);
  });

  it('does not count successful logins towards the lockout (a whole office can share one IP)', async () => {
    const { app } = makeApp();
    const headers = { 'x-forwarded-for': '203.0.113.10' };
    for (let i = 0; i < 25; i++) {
      expect((await app(req('POST', '/api/auth/login', { body: { password: TEST_PASSWORD }, headers }))).status).toBe(200);
    }
  });

  it('works with a scrypt hash instead of a plain password', async () => {
    const { hashPassword } = await import('../server/auth.js');
    const hash = hashPassword('hashed-secret', { N: 1024 });
    const { app } = makeApp({ env: { SITE_PASSWORD: undefined, SITE_PASSWORD_HASH: hash } });
    expect((await app(req('POST', '/api/auth/login', { body: { password: 'hashed-secret' } }))).status).toBe(200);
    expect((await app(req('POST', '/api/auth/login', { body: { password: TEST_PASSWORD } }))).status).toBe(401);
  });
});

describe('request hardening', () => {
  it('blocks cross-site writes', async () => {
    const { app } = makeApp();
    const cookie = await login(app);
    const res = await app(req('POST', '/api/orders', { body: sampleOrder(), cookie, headers: { origin: 'https://evil.example' } }));
    expect(res.status).toBe(403);
  });

  it('allows same-origin writes', async () => {
    const { app } = makeApp();
    const cookie = await login(app);
    const res = await app(req('POST', '/api/orders', { body: sampleOrder(), cookie, headers: { origin: ORIGIN } }));
    expect(res.status).toBe(201);
  });

  it('requires JSON bodies', async () => {
    const { app } = makeApp();
    const cookie = await login(app);
    const res = await app(
      req('POST', '/api/orders', { rawBody: 'name=Josh', cookie, headers: { 'content-type': 'application/x-www-form-urlencoded' } }),
    );
    expect(res.status).toBe(415);
  });

  it('rejects malformed and oversized JSON', async () => {
    const { app } = makeApp();
    const cookie = await login(app);
    const json = { 'content-type': 'application/json' };
    expect((await app(req('POST', '/api/orders', { rawBody: '{nope', cookie, headers: json }))).status).toBe(400);
    const huge = JSON.stringify({ ...sampleOrder(), notes: 'x'.repeat(20_000) });
    expect((await app(req('POST', '/api/orders', { rawBody: huge, cookie, headers: json }))).status).toBe(413);
  });

  it('marks every API response as uncacheable and unindexable', async () => {
    const { app } = makeApp();
    const res = await app(req('GET', '/api/state'));
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('x-robots-tag')).toContain('noindex');
  });
});

describe('orders', () => {
  async function setup() {
    const ctx = makeApp();
    const cookie = await login(ctx.app);
    const call = (method: string, route: string, body?: unknown) => ctx.app(req(method, route, { body, cookie }));
    return { ...ctx, cookie, call };
  }

  it('creates, lists, updates and deletes an order', async () => {
    const { call } = await setup();
    const created = await call('POST', '/api/orders', sampleOrder({ notes: '  Nut   allergy ' }));
    expect(created.status).toBe(201);
    const { order } = (await created.json()) as { order: Order };
    expect(order).toMatchObject({ name: 'Josh', notes: 'Nut allergy' });
    expect(order.id).toMatch(/^[0-9a-f-]{36}$/);

    const state = (await (await call('GET', '/api/state')).json()) as AppState;
    expect(state.orders).toHaveLength(1);
    expect(state.config).toMatchObject({ partySize: 12, maxGuests: 18, ordersOpen: true, deadline: '2026-12-08T23:59:59.000Z' });

    const updated = await call('PUT', `/api/orders/${order.id}`, sampleOrder({ main: 'turkey_dinner' }));
    expect(updated.status).toBe(200);
    expect(((await updated.json()) as { order: Order }).order).toMatchObject({ id: order.id, main: 'turkey_dinner' });

    expect((await call('DELETE', `/api/orders/${order.id}`)).status).toBe(200);
    expect((await call('DELETE', `/api/orders/${order.id}`)).status).toBe(404);
    expect(((await (await call('GET', '/api/state')).json()) as AppState).orders).toHaveLength(0);
  });

  it('only accepts dishes that are on the menu', async () => {
    const { call } = await setup();
    const res = await call('POST', '/api/orders', sampleOrder({ main: 'reindeer_steak', starter: '' }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { fieldErrors: Record<string, string> };
    expect(Object.keys(body.fieldErrors).sort()).toEqual(['main', 'starter']);
  });

  it('allows skipping starter/dessert but not the main', async () => {
    const { call } = await setup();
    expect((await call('POST', '/api/orders', sampleOrder({ starter: 'none', dessert: 'none' }))).status).toBe(201);
    expect((await call('POST', '/api/orders', sampleOrder({ name: 'Ben', main: 'none' }))).status).toBe(400);
  });

  it('stops the same person ordering twice (case and accent insensitive)', async () => {
    const { call } = await setup();
    await call('POST', '/api/orders', sampleOrder({ name: 'Zoë Smith' }));
    const res = await call('POST', '/api/orders', sampleOrder({ name: '  zoe   SMITH ' }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: 'DUPLICATE' });
  });

  it('does not let an edit steal someone else’s name', async () => {
    const { call } = await setup();
    await call('POST', '/api/orders', sampleOrder({ name: 'Amelia' }));
    const { order } = (await (await call('POST', '/api/orders', sampleOrder({ name: 'Ben' }))).json()) as { order: Order };
    expect((await call('PUT', `/api/orders/${order.id}`, sampleOrder({ name: 'amelia' }))).status).toBe(409);
    expect((await call('PUT', `/api/orders/${order.id}`, sampleOrder({ name: 'Ben' }))).status).toBe(200);
  });

  it('404s when editing an order that does not exist', async () => {
    const { call } = await setup();
    expect((await call('PUT', '/api/orders/00000000-0000-0000-0000-000000000000', sampleOrder())).status).toBe(404);
    expect((await call('PUT', '/api/orders/..%2F..%2Fetc', sampleOrder())).status).toBe(404);
  });

  it('caps orders at the number of rows on the booking form', async () => {
    const { call } = await setup();
    for (let i = 0; i < 18; i++) {
      expect((await call('POST', '/api/orders', sampleOrder({ name: `Guest ${i}` }))).status).toBe(201);
    }
    const res = await call('POST', '/api/orders', sampleOrder({ name: 'One Too Many' }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: 'FULL' });
  });

  it('locks creating, editing and deleting after the 8 December deadline', async () => {
    const { call, clock } = await setup();
    const { order } = (await (await call('POST', '/api/orders', sampleOrder())).json()) as { order: Order };

    clock.now = new Date('2026-12-08T23:59:59Z');
    expect((await call('PUT', `/api/orders/${order.id}`, sampleOrder({ notes: 'last second' }))).status).toBe(200);

    clock.now = new Date('2026-12-09T00:00:00Z');
    for (const [method, route, body] of [
      ['POST', '/api/orders', sampleOrder({ name: 'Late Larry' })],
      ['PUT', `/api/orders/${order.id}`, sampleOrder()],
      ['DELETE', `/api/orders/${order.id}`, undefined],
    ] as const) {
      const res = await call(method, route, body);
      expect(res.status).toBe(403);
      expect(await res.json()).toMatchObject({ code: 'CLOSED' });
    }
    const state = (await (await call('GET', '/api/state')).json()) as AppState;
    expect(state.config.ordersOpen).toBe(false);
    expect(state.orders).toHaveLength(1);
    // The booking form can still be generated after the deadline.
    expect((await call('GET', '/api/booking-form')).status).toBe(200);
  });

  it('honours a custom ORDER_DEADLINE and PARTY_SIZE', async () => {
    const { app } = makeApp({ env: { ORDER_DEADLINE: '2026-11-01T00:00:00Z', PARTY_SIZE: '10' } });
    const cookie = await login(app);
    const state = (await (await app(req('GET', '/api/state', { cookie }))).json()) as AppState;
    expect(state.config).toMatchObject({ ordersOpen: false, partySize: 10 });
  });
});

describe('booking details', () => {
  it('validates and saves the header section of the form', async () => {
    const { app } = makeApp();
    const cookie = await login(app);
    const bad = await app(req('PUT', '/api/details', { cookie, body: { email: 'not-an-email' } }));
    expect(bad.status).toBe(400);

    const res = await app(
      req('PUT', '/api/details', { cookie, body: { bookingName: ' William  Brocklehurst ', email: 'w@example.com', extra: 'ignored' } }),
    );
    expect(res.status).toBe(200);
    const state = (await (await app(req('GET', '/api/state', { cookie }))).json()) as AppState;
    expect(state.details.bookingName).toBe('William Brocklehurst');
    expect(state.details.email).toBe('w@example.com');
    expect(state.details).not.toHaveProperty('extra');
  });
});

describe('downloads', () => {
  it('generates the filled booking form as a PDF attachment', async () => {
    const { app } = makeApp();
    const cookie = await login(app);
    await app(req('POST', '/api/orders', { cookie, body: sampleOrder() }));
    const res = await app(req('GET', '/api/booking-form', { cookie }));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="Christmas-Booking-Form-2026.pdf"');
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');

    const inline = await app(req('GET', '/api/booking-form?disposition=inline', { cookie }));
    expect(inline.headers.get('content-disposition')).toMatch(/^inline;/);
  });

  it('sends logged-in users to the (edge-protected) menu PDF', async () => {
    const { app } = makeApp();
    const cookie = await login(app);
    const res = await app(req('GET', '/api/menu', { cookie }));
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(MENU_PDF_PATH);
  });
});

describe('dish options', () => {
  async function setup() {
    const ctx = makeApp();
    const cookie = await login(ctx.app);
    return (body: unknown) => ctx.app(req('POST', '/api/orders', { cookie, body }));
  }

  it('requires cream or ice cream with the fudge cake', async () => {
    const post = await setup();
    const missing = await post(sampleOrder({ dessert: 'chocolate_fudge_cake' }));
    expect(missing.status).toBe(400);
    expect(((await missing.json()) as { fieldErrors: Record<string, string> }).fieldErrors).toEqual({
      dessertOption: 'Please choose cream or ice cream',
    });
    const ok = await post(sampleOrder({ dessert: 'chocolate_fudge_cake', dessertOption: 'ice_cream' }));
    expect(ok.status).toBe(201);
    expect(((await ok.json()) as { order: Order }).order.dessertOption).toBe('ice_cream');
  });

  it('defaults the soup to the standard version and accepts the gluten-free option', async () => {
    const post = await setup();
    const standard = (await (await post(sampleOrder({ starter: 'butternut_squash_soup' }))).json()) as { order: Order };
    expect(standard.order.starterOption).toBe('standard');
    const gf = await post(sampleOrder({ name: 'Ben', starter: 'butternut_squash_soup', starterOption: 'gluten_free' }));
    expect(((await gf.json()) as { order: Order }).order.starterOption).toBe('gluten_free');
  });

  it('rejects made-up options and ignores options for dishes that have none', async () => {
    const post = await setup();
    expect((await post(sampleOrder({ dessert: 'chocolate_fudge_cake', dessertOption: 'custard' }))).status).toBe(400);
    const res = await post(sampleOrder({ mainOption: 'extra_gravy' }));
    expect(((await res.json()) as { order: Order }).order.mainOption).toBe('');
  });
});

describe('database failures', () => {
  it('turns a duplicate-name race caught by the database into a friendly 409', async () => {
    const store = new MemoryStore();
    store.saveOrder = async () => {
      throw new DuplicateNameError();
    };
    const { app } = makeApp({ store });
    const cookie = await login(app);
    const res = await app(req('POST', '/api/orders', { cookie, body: sampleOrder() }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: 'DUPLICATE', fieldErrors: { name: expect.any(String) } });
  });

  it('reports an unreachable database as a 503 without leaking details', async () => {
    const store = new MemoryStore();
    store.listOrders = async () => {
      throw Object.assign(new Error('connect ECONNREFUSED postgres://user:secret@db:6543/postgres'), { code: 'ECONNREFUSED' });
    };
    const { app } = makeApp({ store });
    const cookie = await login(app);
    const res = await app(req('GET', '/api/state', { cookie }));
    expect(res.status).toBe(503);
    const body = await res.text();
    expect(body).toContain('DB_UNAVAILABLE');
    expect(body).not.toContain('secret');
  });

  it('still lets people log in when the database is unreachable (the guess counter is best-effort)', async () => {
    const store = new MemoryStore();
    const down = async () => {
      throw Object.assign(new Error('(ENOTFOUND) tenant/user xmas_app.ref not found'), { code: 'XX000' });
    };
    store.peek = down;
    store.hit = down;
    const { app } = makeApp({ store });
    const ok = await app(req('POST', '/api/auth/login', { body: { password: TEST_PASSWORD } }));
    expect(ok.status).toBe(200);
    const bad = await app(req('POST', '/api/auth/login', { body: { password: 'nope' } }));
    expect(bad.status).toBe(401);
  });

  it('hides unexpected errors behind a generic 500', async () => {
    const store = new MemoryStore();
    store.getDetails = async () => {
      throw new Error('kaboom with internals');
    };
    const { app } = makeApp({ store });
    const cookie = await login(app);
    const res = await app(req('GET', '/api/state', { cookie }));
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain('internals');
  });
});

describe('storage not connected', () => {
  it('still lets people log in but explains how to connect storage', async () => {
    const { app } = makeApp({ store: null });
    const cookie = await login(app);
    const res = await app(req('GET', '/api/state', { cookie }));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ code: 'NO_STORAGE' });
  });
});

describe('routing', () => {
  it('understands both direct paths and the Vercel rewrite form', () => {
    const u = (s: string) => new URL(s, ORIGIN);
    expect(resolveRoute(u('/api/orders/abc'))).toBe('/orders/abc');
    expect(resolveRoute(u('/api/state/'))).toBe('/state');
    expect(resolveRoute(u('/api?route=orders/abc'))).toBe('/orders/abc');
    expect(resolveRoute(u('/api?route=booking-form&disposition=inline'))).toBe('/booking-form');
    expect(resolveRoute(u('/api'))).toBe('/');
  });

  it('serves requests that arrive through the Vercel rewrite', async () => {
    const { app } = makeApp({ store: new MemoryStore() });
    const cookie = await login(app);
    const res = await app(req('GET', '/api?route=state', { cookie }));
    expect(res.status).toBe(200);
  });
});
