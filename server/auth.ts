import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'xmas_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

const SCRYPT_MAXMEM = 64 * 1024 * 1024;

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Hash format: scrypt$N$r$p$<salt base64url>$<hash base64url> */
export function hashPassword(password: string, options: { N?: number; salt?: Buffer } = {}): string {
  const N = options.N ?? 32768;
  const r = 8;
  const p = 1;
  const salt = options.salt ?? randomBytes(16);
  const hash = scryptSync(password.normalize('NFC'), salt, 32, { N, r, p, maxmem: SCRYPT_MAXMEM });
  return ['scrypt', N, r, p, salt.toString('base64url'), hash.toString('base64url')].join('$');
}

export function verifyPasswordHash(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, nStr, rStr, pStr, saltStr, hashStr] = parts;
  const N = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  if (![N, r, p].every((n) => Number.isInteger(n) && n > 0)) return false;
  const expected = Buffer.from(hashStr, 'base64url');
  const actual = scryptSync(password.normalize('NFC'), Buffer.from(saltStr, 'base64url'), expected.length, {
    N,
    r,
    p,
    maxmem: SCRYPT_MAXMEM,
  });
  return safeEqual(actual, expected);
}

/** Constant-time comparison of a submitted password against a plaintext secret. */
export function verifyPlainPassword(password: string, expected: string): boolean {
  const key = randomBytes(32);
  const a = createHmac('sha256', key).update(password.normalize('NFC')).digest();
  const b = createHmac('sha256', key).update(expected.normalize('NFC')).digest();
  return safeEqual(a, b);
}

/**
 * The signing key is bound to the current password, so changing the password
 * instantly logs everybody out.
 */
export function deriveSessionKey(secret: string, passwordFingerprint: string): Buffer {
  return createHmac('sha256', secret).update(`xmas-session:v1:${passwordFingerprint}`).digest();
}

function sign(key: Buffer, payload: string): string {
  return createHmac('sha256', key).update(payload).digest('base64url');
}

export function createSessionToken(key: Buffer, now: Date, ttlSeconds = SESSION_TTL_SECONDS): string {
  const iat = Math.floor(now.getTime() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ v: 1, iat, exp: iat + ttlSeconds, n: randomBytes(9).toString('base64url') }),
  ).toString('base64url');
  return `${payload}.${sign(key, payload)}`;
}

export function verifySessionToken(token: string | undefined, key: Buffer, now: Date): boolean {
  if (!token || token.length > 512) return false;
  const dot = token.indexOf('.');
  if (dot <= 0 || dot !== token.lastIndexOf('.')) return false;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!safeEqual(Buffer.from(signature), Buffer.from(sign(key, payload)))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { v?: number; exp?: number };
    return data.v === 1 && typeof data.exp === 'number' && data.exp > Math.floor(now.getTime() / 1000);
  } catch {
    return false;
  }
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (!name || name in out) continue;
    try {
      out[name] = decodeURIComponent(value);
    } catch {
      out[name] = value;
    }
  }
  return out;
}

export function sessionCookie(token: string, secure: boolean, maxAge = SESSION_TTL_SECONDS): string {
  return [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'SameSite=Strict',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

export function clearSessionCookie(secure: boolean): string {
  return sessionCookie('', secure, 0);
}
