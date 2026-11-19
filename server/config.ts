import { createHash } from 'node:crypto';
import { verifyPasswordHash, verifyPlainPassword } from './auth.js';

/**
 * Salted scrypt hash of the agreed site password. Only the hash lives in the
 * (public) repo; override with SITE_PASSWORD or SITE_PASSWORD_HASH on Vercel.
 */
export const DEFAULT_PASSWORD_HASH =
  'scrypt$32768$8$1$0Vpx3Sym5TrHkjfIwr-c2w$q9r_3bV7xbzUrSRTeZphVdRIGoGKLrlfzu0MeakyQuE';

/** Orders close at the end of Tuesday 8 December 2026 (UK time is GMT in December). */
export const DEFAULT_DEADLINE = '2026-12-08T23:59:59Z';
export const DEFAULT_PARTY_SIZE = 12;
/** The restaurant's booking form has 18 guest rows. */
export const FORM_GUEST_ROWS = 18;

const DEV_SESSION_SECRET = 'local-dev-only-session-secret-not-for-production';

export interface ServerConfig {
  checkPassword(password: string): boolean;
  /** Changes whenever the password changes, so old sessions stop working. */
  passwordFingerprint: string;
  sessionSecret: string;
  deadline: Date;
  partySize: number;
  maxGuests: number;
  isProduction: boolean;
}

export class ConfigError extends Error {}

type Env = Record<string, string | undefined>;

function positiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function loadConfig(env: Env = process.env): ServerConfig {
  const isProduction = env.VERCEL === '1' || env.NODE_ENV === 'production';

  const plain = env.SITE_PASSWORD?.trim();
  const hash = env.SITE_PASSWORD_HASH?.trim() || DEFAULT_PASSWORD_HASH;
  const checkPassword = plain
    ? (password: string) => verifyPlainPassword(password, plain)
    : (password: string) => verifyPasswordHash(password, hash);
  const passwordFingerprint = createHash('sha256')
    .update(plain ? `plain:${plain}` : `hash:${hash}`)
    .digest('base64url')
    .slice(0, 16);

  // Any server-only secret will do for signing sessions. The database
  // credentials are always present once storage is connected, so the site
  // works out of the box (SESSION_SECRET is still recommended).
  const sessionSecret =
    env.SESSION_SECRET ||
    env.DATABASE_URL ||
    env.POSTGRES_URL ||
    env.KV_REST_API_TOKEN ||
    env.UPSTASH_REDIS_REST_TOKEN ||
    env.REDIS_URL ||
    env.KV_URL ||
    (isProduction ? '' : DEV_SESSION_SECRET);
  if (!sessionSecret) {
    throw new ConfigError(
      'No session secret configured. Set SESSION_SECRET (and DATABASE_URL) in the Vercel project settings.',
    );
  }

  const deadline = new Date(env.ORDER_DEADLINE || DEFAULT_DEADLINE);
  if (Number.isNaN(deadline.getTime())) {
    throw new ConfigError(`ORDER_DEADLINE is not a valid date: ${env.ORDER_DEADLINE}`);
  }

  const maxGuests = Math.min(positiveInt(env.MAX_GUESTS, FORM_GUEST_ROWS), FORM_GUEST_ROWS);
  const partySize = Math.min(positiveInt(env.PARTY_SIZE, DEFAULT_PARTY_SIZE), maxGuests);

  return {
    checkPassword,
    passwordFingerprint,
    sessionSecret,
    deadline,
    partySize,
    maxGuests,
    isProduction,
  };
}
