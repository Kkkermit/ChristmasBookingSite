import { describe, expect, it } from 'vitest';
import {
  clearSessionCookie,
  createSessionToken,
  deriveSessionKey,
  hashPassword,
  parseCookies,
  sessionCookie,
  verifyPasswordHash,
  verifyPlainPassword,
  verifySessionToken,
} from '../server/auth.js';
import { ConfigError, DEFAULT_PASSWORD_HASH, loadConfig } from '../server/config.js';

describe('password hashing', () => {
  const hash = hashPassword('WinterWonderland', { N: 1024 });

  it('verifies the right password and rejects others', () => {
    expect(hash).toMatch(/^scrypt\$1024\$8\$1\$[\w-]+\$[\w-]+$/);
    expect(verifyPasswordHash('WinterWonderland', hash)).toBe(true);
    expect(verifyPasswordHash('winterwonderland', hash)).toBe(false);
    expect(verifyPasswordHash('', hash)).toBe(false);
  });

  it('uses a random salt each time', () => {
    expect(hashPassword('same', { N: 1024 })).not.toBe(hashPassword('same', { N: 1024 }));
  });

  it('rejects malformed hashes without throwing', () => {
    for (const bad of ['', 'plain', 'scrypt$x$8$1$a$b', 'bcrypt$1$2$3$4$5']) {
      expect(verifyPasswordHash('x', bad)).toBe(false);
    }
  });

  it('compares plain passwords exactly', () => {
    expect(verifyPlainPassword('Cheese', 'Cheese')).toBe(true);
    expect(verifyPlainPassword('cheese', 'Cheese')).toBe(false);
    expect(verifyPlainPassword('Cheese ', 'Cheese')).toBe(false);
  });

  it('ships a well-formed default hash (never the plain password)', () => {
    expect(DEFAULT_PASSWORD_HASH).toMatch(/^scrypt\$32768\$8\$1\$/);
    expect(DEFAULT_PASSWORD_HASH.toLowerCase()).not.toContain('cheese');
  });

  // Set SITE_PASSWORD_CHECK to the agreed password to confirm the committed hash matches it.
  it.runIf(Boolean(process.env.SITE_PASSWORD_CHECK))('default hash matches the agreed password', () => {
    expect(verifyPasswordHash(process.env.SITE_PASSWORD_CHECK!, DEFAULT_PASSWORD_HASH)).toBe(true);
    expect(verifyPasswordHash(`${process.env.SITE_PASSWORD_CHECK!}x`, DEFAULT_PASSWORD_HASH)).toBe(false);
  });
});

describe('session tokens', () => {
  const key = deriveSessionKey('secret', 'fingerprint');
  const now = new Date('2026-11-20T12:00:00Z');

  it('round-trips a valid token', () => {
    expect(verifySessionToken(createSessionToken(key, now), key, now)).toBe(true);
  });

  it('expires', () => {
    const token = createSessionToken(key, now, 60);
    expect(verifySessionToken(token, key, new Date(now.getTime() + 59_000))).toBe(true);
    expect(verifySessionToken(token, key, new Date(now.getTime() + 61_000))).toBe(false);
  });

  it('rejects tampering, wrong keys and junk', () => {
    const token = createSessionToken(key, now);
    const [payload, sig] = token.split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ v: 1, iat: 0, exp: 9_999_999_999 })).toString('base64url');
    expect(verifySessionToken(`${forgedPayload}.${sig}`, key, now)).toBe(false);
    expect(verifySessionToken(`${payload}.${sig.slice(0, -2)}xx`, key, now)).toBe(false);
    expect(verifySessionToken(token, deriveSessionKey('secret', 'other-password'), now)).toBe(false);
    expect(verifySessionToken(token, deriveSessionKey('other-secret', 'fingerprint'), now)).toBe(false);
    for (const junk of [undefined, '', '.', 'abc', 'a.b.c', 'x'.repeat(600)]) {
      expect(verifySessionToken(junk, key, now)).toBe(false);
    }
  });
});

describe('cookies', () => {
  it('parses cookie headers', () => {
    expect(parseCookies('a=1; xmas_session=abc.def; b=%F0%9F%8E%84')).toEqual({ a: '1', xmas_session: 'abc.def', b: '🎄' });
    expect(parseCookies(null)).toEqual({});
    expect(parseCookies('a=1; a=2')).toEqual({ a: '1' });
  });

  it('builds secure session cookies', () => {
    expect(sessionCookie('tok', true)).toBe('xmas_session=tok; Path=/; Max-Age=2592000; HttpOnly; SameSite=Strict; Secure');
    expect(sessionCookie('tok', false)).not.toContain('Secure');
    expect(clearSessionCookie(true)).toContain('Max-Age=0');
  });
});

describe('loadConfig', () => {
  it('has sensible defaults for the 2026 party', () => {
    const config = loadConfig({});
    expect(config.deadline.toISOString()).toBe('2026-12-08T23:59:59.000Z');
    expect(config.partySize).toBe(12);
    expect(config.maxGuests).toBe(18);
    expect(config.isProduction).toBe(false);
  });

  it('uses SITE_PASSWORD when provided', () => {
    const config = loadConfig({ SITE_PASSWORD: 'Rudolph' });
    expect(config.checkPassword('Rudolph')).toBe(true);
    expect(config.checkPassword('Dasher')).toBe(false);
  });

  it('changes the session fingerprint when the password changes', () => {
    expect(loadConfig({ SITE_PASSWORD: 'one' }).passwordFingerprint).not.toBe(
      loadConfig({ SITE_PASSWORD: 'two' }).passwordFingerprint,
    );
  });

  it('refuses to run in production without any server secret', () => {
    expect(() => loadConfig({ VERCEL: '1' })).toThrow(ConfigError);
  });

  it('borrows the Redis token as the session secret on Vercel', () => {
    expect(loadConfig({ VERCEL: '1', KV_REST_API_TOKEN: 'kv-token' }).sessionSecret).toBe('kv-token');
    expect(loadConfig({ VERCEL: '1', SESSION_SECRET: 's', KV_REST_API_TOKEN: 'kv' }).sessionSecret).toBe('s');
  });

  it('validates ORDER_DEADLINE and clamps the party size to the form rows', () => {
    expect(() => loadConfig({ ORDER_DEADLINE: 'next tuesday' })).toThrow(ConfigError);
    expect(loadConfig({ PARTY_SIZE: '40' }).partySize).toBe(18);
    expect(loadConfig({ PARTY_SIZE: 'abc' }).partySize).toBe(12);
  });
});
