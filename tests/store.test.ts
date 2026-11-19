import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chooseStore } from '../server/store/index.js';
import { MemoryStore } from '../server/store/memory.js';
import { PostgresStore, connectPostgres, createPostgresClient, poolerCandidates } from '../server/store/postgres.js';
import { RedisStore, type RedisCommands } from '../server/store/redis.js';
import { DuplicateNameError, type Store } from '../server/store/types.js';
import type { Order } from '../shared/types.js';
import { emptyDetails } from '../shared/validation.js';

/** In-memory stand-in for Redis so the Redis store logic can be tested offline. */
function fakeRedis() {
  const hashes = new Map<string, Map<string, string>>();
  const strings = new Map<string, string>();
  const expiries: Array<[string, number]> = [];
  const commands: RedisCommands = {
    hgetall: async (k) => Object.fromEntries(hashes.get(k) ?? []),
    hget: async (k, f) => hashes.get(k)?.get(f) ?? null,
    hset: async (k, f, v) => {
      if (!hashes.has(k)) hashes.set(k, new Map());
      hashes.get(k)!.set(f, v);
    },
    hdel: async (k, f) => (hashes.get(k)?.delete(f) ? 1 : 0),
    get: async (k) => strings.get(k) ?? null,
    set: async (k, v) => {
      strings.set(k, v);
    },
    incr: async (k) => {
      const n = Number(strings.get(k) ?? 0) + 1;
      strings.set(k, String(n));
      return n;
    },
    expire: async (k, s) => {
      expiries.push([k, s]);
    },
  };
  return { commands, hashes, strings, expiries };
}

const order = (id: string, name: string): Order => ({
  id,
  name,
  starter: 'none',
  starterOption: '',
  main: 'seabass',
  mainOption: '',
  dessert: 'none',
  dessertOption: '',
  notes: '',
  createdAt: '2026-11-20T10:00:00.000Z',
  updatedAt: '2026-11-20T10:00:00.000Z',
});

const ID1 = '11111111-1111-4111-8111-111111111111';
const ID2 = '22222222-2222-4222-8222-222222222222';
const MISSING = '33333333-3333-4333-8333-333333333333';

async function exerciseStore(store: Store) {
  expect(await store.listOrders()).toEqual([]);
  await store.saveOrder(order(ID1, 'Amelia'));
  await store.saveOrder({ ...order(ID2, 'Ben'), createdAt: '2026-11-21T10:00:00.000Z' });
  await store.saveOrder({ ...order(ID1, 'Amelia'), main: 'wellington', dessert: 'chocolate_fudge_cake', dessertOption: 'cream' });
  const all = await store.listOrders();
  expect(all.map((o) => o.id).sort()).toEqual([ID1, ID2]);
  const amelia = await store.getOrder(ID1);
  expect(amelia).toMatchObject({ main: 'wellington', dessert: 'chocolate_fudge_cake', dessertOption: 'cream' });
  expect(amelia?.createdAt).toBe('2026-11-20T10:00:00.000Z');
  expect(await store.getOrder(MISSING)).toBeNull();
  expect(await store.deleteOrder(ID2)).toBe(true);
  expect(await store.deleteOrder(ID2)).toBe(false);

  expect(await store.getDetails()).toBeNull();
  await store.saveDetails({ ...emptyDetails(), bookingName: 'William' });
  expect((await store.getDetails())?.bookingName).toBe('William');

  expect(await store.peek('k')).toBe(0);
  expect(await store.hit('k', 60)).toBe(1);
  expect(await store.hit('k', 60)).toBe(2);
  expect(await store.peek('k')).toBe(2);
}

describe('MemoryStore', () => {
  it('implements the store contract', async () => {
    await exerciseStore(new MemoryStore());
  });

  it('persists to a JSON file for local development', async () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'xmas-')), 'db.json');
    const a = new MemoryStore(file);
    await a.saveOrder(order(ID1, 'Amelia'));
    const b = new MemoryStore(file);
    expect((await b.listOrders()).map((o) => o.name)).toEqual(['Amelia']);
  });
});

describe('RedisStore', () => {
  it('implements the store contract', async () => {
    await exerciseStore(new RedisStore(fakeRedis().commands, 'fake'));
  });

  it('namespaces keys and only sets the rate-limit expiry once', async () => {
    const redis = fakeRedis();
    const store = new RedisStore(redis.commands, 'fake');
    await store.saveOrder(order(ID1, 'Amelia'));
    await store.hit('login-fail:1.2.3.4', 900);
    await store.hit('login-fail:1.2.3.4', 900);
    expect([...redis.hashes.keys()]).toEqual(['xmas2026:orders']);
    expect(redis.expiries).toEqual([['xmas2026:rate:login-fail:1.2.3.4', 900]]);
  });

  it('skips corrupt entries instead of crashing', async () => {
    const redis = fakeRedis();
    await redis.commands.hset('xmas2026:orders', 'bad', '{not json');
    await redis.commands.hset('xmas2026:orders', '1', JSON.stringify(order(ID1, 'Amelia')));
    const store = new RedisStore(redis.commands, 'fake');
    expect((await store.listOrders()).map((o) => o.name)).toEqual(['Amelia']);
  });
});

describe('PostgresStore (real Postgres via PGlite, running db/migrations)', () => {
  let db: PGlite;
  let server: PGLiteSocketServer;
  let store: PostgresStore;
  let port: number;

  beforeAll(async () => {
    db = await PGlite.create();
    await db.exec(fs.readFileSync(path.join(process.cwd(), 'db/migrations/001_init.sql'), 'utf8'));
    port = 40000 + Math.floor(Math.random() * 20000);
    server = new PGLiteSocketServer({ db, port, host: '127.0.0.1' });
    await server.start();
    store = new PostgresStore(createPostgresClient(`postgres://postgres:postgres@127.0.0.1:${port}/postgres`, { max: 1 }));
  });

  afterAll(async () => {
    await store?.close();
    await server?.stop();
    await db?.close();
  });

  it('implements the store contract against the real schema', async () => {
    await exerciseStore(store);
  });

  it('enforces unique names at the database level (case/accent insensitive)', async () => {
    await store.saveOrder(order('44444444-4444-4444-8444-444444444444', 'Zoë Smith'));
    await expect(store.saveOrder(order('55555555-5555-4555-8555-555555555555', 'zoe  smith'))).rejects.toBeInstanceOf(
      DuplicateNameError,
    );
  });

  it('expires rate-limit counters', async () => {
    expect(await store.hit('short', 1)).toBe(1);
    expect(await store.hit('short', 1)).toBe(2);
    await db.exec("update xmas.rate_limits set expires_at = now() - interval '1 second' where key = 'short'");
    expect(await store.peek('short')).toBe(0);
    expect(await store.hit('short', 1)).toBe(1);
  });

  it('connects through connectPostgres and checks the database answers', async () => {
    // PGlite serves one client session at a time, so use a separate instance.
    const db2 = await PGlite.create();
    await db2.exec(fs.readFileSync(path.join(process.cwd(), 'db/migrations/001_init.sql'), 'utf8'));
    const port2 = port + 1;
    const server2 = new PGLiteSocketServer({ db: db2, port: port2, host: '127.0.0.1' });
    await server2.start();
    try {
      const connected = await connectPostgres(`postgres://postgres:postgres@127.0.0.1:${port2}/postgres`);
      expect(await connected.peek('nothing')).toBe(0);
      await connected.close();
    } finally {
      await server2.stop();
      await db2.close();
    }
  });

  it('rejects names longer than the form allows', async () => {
    await expect(store.saveOrder(order('66666666-6666-4666-8666-666666666666', 'x'.repeat(31)))).rejects.toThrow();
  });
});

describe('poolerCandidates', () => {
  it('offers the sibling Supabase pooler cluster as a fallback', () => {
    expect(poolerCandidates('postgres://u.ref:pw@aws-0-eu-west-2.pooler.supabase.com:6543/postgres')).toEqual([
      'postgres://u.ref:pw@aws-0-eu-west-2.pooler.supabase.com:6543/postgres',
      'postgres://u.ref:pw@aws-1-eu-west-2.pooler.supabase.com:6543/postgres',
    ]);
    expect(poolerCandidates('postgres://u:p@db.example.com:5432/x')).toEqual(['postgres://u:p@db.example.com:5432/x']);
  });
});

describe('chooseStore', () => {
  it('prefers Postgres when DATABASE_URL or POSTGRES_URL is set', () => {
    expect(chooseStore({ DATABASE_URL: 'postgres://u:p@h:6543/postgres', KV_REST_API_URL: 'x', KV_REST_API_TOKEN: 'y' }, true)).toEqual({
      type: 'postgres',
      url: 'postgres://u:p@h:6543/postgres',
    });
    expect(chooseStore({ POSTGRES_URL: 'postgresql://u:p@h/db' }, true).type).toBe('postgres');
    expect(chooseStore({ DATABASE_URL: 'mysql://nope' }, true)).toEqual({ type: 'none' });
  });

  it('prefers Upstash REST credentials (Vercel marketplace names)', () => {
    expect(chooseStore({ KV_REST_API_URL: 'https://x.upstash.io', KV_REST_API_TOKEN: 't' }, true)).toEqual({
      type: 'upstash',
      url: 'https://x.upstash.io',
      token: 't',
    });
    expect(chooseStore({ UPSTASH_REDIS_REST_URL: 'https://y', UPSTASH_REDIS_REST_TOKEN: 'u' }, true).type).toBe('upstash');
  });

  it('falls back to a redis:// URL', () => {
    expect(chooseStore({ REDIS_URL: 'rediss://default:pw@host:6379' }, true)).toEqual({
      type: 'redis',
      url: 'rediss://default:pw@host:6379',
    });
  });

  it('uses a local file in development and nothing in production', () => {
    expect(chooseStore({}, false).type).toBe('file');
    expect(chooseStore({}, true)).toEqual({ type: 'none' });
  });
});
