import fs from 'node:fs';
import path from 'node:path';
import { createApp, type AppDeps } from '../server/app.js';
import { loadConfig } from '../server/config.js';
import { MemoryStore } from '../server/store/memory.js';
import type { OrderInput } from '../shared/types.js';

export const TEST_PASSWORD = 'correct-horse-battery-staple';
export const ORIGIN = 'https://xmas.example.com';

export const template = new Uint8Array(
  fs.readFileSync(path.join(process.cwd(), 'server', 'assets', 'booking-form-template.pdf')),
);

export function makeApp(
  overrides: Partial<AppDeps> & { env?: Record<string, string | undefined>; store?: AppDeps['store'] } = {},
) {
  const config = loadConfig({ SITE_PASSWORD: TEST_PASSWORD, SESSION_SECRET: 'test-secret', ...overrides.env });
  const store = 'store' in overrides ? overrides.store! : new MemoryStore();
  const clock = { now: new Date('2026-11-20T12:00:00Z') };
  const app = createApp({
    config,
    store,
    loadTemplate: async () => template,
    now: () => clock.now,
    ...overrides,
  });
  return { app, store, config, clock };
}

export function req(
  method: string,
  route: string,
  opts: { body?: unknown; cookie?: string; headers?: Record<string, string>; rawBody?: string } = {},
): Request {
  const headers: Record<string, string> = { ...opts.headers };
  if (opts.cookie) headers.cookie = opts.cookie;
  let body: string | undefined;
  if (opts.rawBody !== undefined) body = opts.rawBody;
  else if (opts.body !== undefined) {
    body = JSON.stringify(opts.body);
    headers['content-type'] ??= 'application/json';
  }
  return new Request(`${ORIGIN}${route}`, { method, headers, body });
}

/** Logs in and returns the cookie header value to send on later requests. */
export async function login(app: (r: Request) => Promise<Response>, password = TEST_PASSWORD): Promise<string> {
  const res = await app(req('POST', '/api/auth/login', { body: { password } }));
  if (res.status !== 200) throw new Error(`login failed: ${res.status}`);
  const setCookie = res.headers.get('set-cookie')!;
  return setCookie.split(';')[0];
}

export const sampleOrder = (overrides: Partial<OrderInput> = {}): OrderInput => ({
  name: 'Josh',
  starter: 'smoked_chicken_wings',
  starterOption: '',
  main: 'ultimate_xmas_burger',
  mainOption: '',
  dessert: 'trillionaires_tart',
  dessertOption: '',
  notes: '',
  ...overrides,
});
