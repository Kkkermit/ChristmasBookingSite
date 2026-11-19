import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { chooseStore } from '../server/store/index.js';
import { MemoryStore } from '../server/store/memory.js';
import { RedisStore, type RedisCommands } from '../server/store/redis.js';
import type { Store } from '../server/store/types.js';
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
  main: 'seabass',
  dessert: 'none',
  notes: '',
  createdAt: '2026-11-20T10:00:00Z',
  updatedAt: '2026-11-20T10:00:00Z',
});

async function exerciseStore(store: Store) {
  expect(await store.listOrders()).toEqual([]);
  await store.saveOrder(order('1', 'Amelia'));
  await store.saveOrder(order('2', 'Ben'));
  await store.saveOrder({ ...order('1', 'Amelia'), main: 'wellington' });
  expect((await store.listOrders()).map((o) => o.id).sort()).toEqual(['1', '2']);
  expect((await store.getOrder('1'))?.main).toBe('wellington');
  expect(await store.getOrder('nope')).toBeNull();
  expect(await store.deleteOrder('2')).toBe(true);
  expect(await store.deleteOrder('2')).toBe(false);

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
    await a.saveOrder(order('1', 'Amelia'));
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
    await store.saveOrder(order('1', 'Amelia'));
    await store.hit('login-fail:1.2.3.4', 900);
    await store.hit('login-fail:1.2.3.4', 900);
    expect([...redis.hashes.keys()]).toEqual(['xmas2026:orders']);
    expect(redis.expiries).toEqual([['xmas2026:rate:login-fail:1.2.3.4', 900]]);
  });

  it('skips corrupt entries instead of crashing', async () => {
    const redis = fakeRedis();
    await redis.commands.hset('xmas2026:orders', 'bad', '{not json');
    await redis.commands.hset('xmas2026:orders', '1', JSON.stringify(order('1', 'Amelia')));
    const store = new RedisStore(redis.commands, 'fake');
    expect((await store.listOrders()).map((o) => o.name)).toEqual(['Amelia']);
  });
});

describe('chooseStore', () => {
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
