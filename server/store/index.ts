import path from 'node:path';
import { MemoryStore } from './memory.js';
import { RedisStore, nodeRedisCommands, upstashCommands } from './redis.js';
import type { Store } from './types.js';

type Env = Record<string, string | undefined>;

export type StoreChoice =
  | { type: 'upstash'; url: string; token: string }
  | { type: 'redis'; url: string }
  | { type: 'file'; path: string }
  | { type: 'none' };

/** Works out which storage backend the environment provides. */
export function chooseStore(env: Env, isProduction: boolean): StoreChoice {
  const restUrl = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const restToken = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (restUrl && restToken) return { type: 'upstash', url: restUrl, token: restToken };

  const redisUrl = env.REDIS_URL || env.KV_URL;
  if (redisUrl && /^rediss?:\/\//.test(redisUrl)) return { type: 'redis', url: redisUrl };

  if (!isProduction) {
    return { type: 'file', path: env.DEV_DATA_FILE || path.join(process.cwd(), '.data', 'dev-db.json') };
  }
  return { type: 'none' };
}

export async function createStore(choice: StoreChoice): Promise<Store | null> {
  switch (choice.type) {
    case 'upstash':
      return new RedisStore(await upstashCommands(choice.url, choice.token), 'upstash');
    case 'redis':
      return new RedisStore(await nodeRedisCommands(choice.url), 'redis');
    case 'file':
      return new MemoryStore(choice.path);
    case 'none':
      return null;
  }
}
