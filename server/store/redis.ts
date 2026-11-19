import type { BookingDetails, Order } from '../../shared/types.js';
import { DETAILS_KEY, ORDERS_KEY, rateKey, type Store } from './types.js';

/** The handful of Redis commands the app needs - implemented by both clients below. */
export interface RedisCommands {
  hgetall(key: string): Promise<Record<string, string>>;
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string): Promise<void>;
  hdel(key: string, field: string): Promise<number>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
}

function parse<T>(raw: unknown): T | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'object') return raw as T;
  try {
    return JSON.parse(String(raw)) as T;
  } catch {
    return null;
  }
}

export class RedisStore implements Store {
  constructor(
    private readonly redis: RedisCommands,
    readonly kind: string,
  ) {}

  async listOrders() {
    const all = await this.redis.hgetall(ORDERS_KEY);
    return Object.values(all ?? {})
      .map((raw) => parse<Order>(raw))
      .filter((o): o is Order => o !== null);
  }

  async getOrder(id: string) {
    return parse<Order>(await this.redis.hget(ORDERS_KEY, id));
  }

  async saveOrder(order: Order) {
    await this.redis.hset(ORDERS_KEY, order.id, JSON.stringify(order));
  }

  async deleteOrder(id: string) {
    return (await this.redis.hdel(ORDERS_KEY, id)) > 0;
  }

  async getDetails() {
    return parse<BookingDetails>(await this.redis.get(DETAILS_KEY));
  }

  async saveDetails(details: BookingDetails) {
    await this.redis.set(DETAILS_KEY, JSON.stringify(details));
  }

  async hit(key: string, windowSeconds: number) {
    const k = rateKey(key);
    const count = await this.redis.incr(k);
    if (count === 1) await this.redis.expire(k, windowSeconds);
    return count;
  }

  async peek(key: string) {
    return Number(await this.redis.get(rateKey(key))) || 0;
  }
}

/** Upstash Redis over HTTPS - what Vercel's "Upstash for Redis" integration provides. */
export async function upstashCommands(url: string, token: string): Promise<RedisCommands> {
  const { Redis } = await import('@upstash/redis');
  const r = new Redis({ url, token, automaticDeserialization: false });
  return {
    hgetall: async (key) => ((await r.hgetall(key)) as Record<string, string> | null) ?? {},
    hget: async (key, field) => ((await r.hget(key, field)) as string | null) ?? null,
    hset: async (key, field, value) => {
      await r.hset(key, { [field]: value });
    },
    hdel: (key, field) => r.hdel(key, field),
    get: async (key) => ((await r.get(key)) as string | null) ?? null,
    set: async (key, value) => {
      await r.set(key, value);
    },
    incr: (key) => r.incr(key),
    expire: async (key, seconds) => {
      await r.expire(key, seconds);
    },
  };
}

/** Any Redis reachable over redis:// or rediss:// (e.g. Vercel's "Redis" marketplace option). */
export async function nodeRedisCommands(url: string): Promise<RedisCommands> {
  const { createClient } = await import('redis');
  const client = createClient({ url, socket: { connectTimeout: 5000 } });
  client.on('error', (err) => console.error('Redis client error', err));
  await client.connect();
  return {
    hgetall: async (key) => (await client.hGetAll(key)) as Record<string, string>,
    hget: async (key, field) => ((await client.hGet(key, field)) as string | null) ?? null,
    hset: async (key, field, value) => {
      await client.hSet(key, field, value);
    },
    hdel: async (key, field) => Number(await client.hDel(key, field)),
    get: async (key) => ((await client.get(key)) as string | null) ?? null,
    set: async (key, value) => {
      await client.set(key, value);
    },
    incr: async (key) => Number(await client.incr(key)),
    expire: async (key, seconds) => {
      await client.expire(key, seconds);
    },
  };
}
