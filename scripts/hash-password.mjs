#!/usr/bin/env node
// Generates a salted scrypt hash for the site password.
//
//   SITE_PASSWORD='your password' npm run hash-password
//   npm run hash-password -- 'your password'
//
// Put the output in the SITE_PASSWORD_HASH environment variable on Vercel
// (or simply set SITE_PASSWORD - it is only ever read on the server).
import { randomBytes, scryptSync } from 'node:crypto';

const password = process.argv[2] ?? process.env.SITE_PASSWORD;
if (!password) {
  console.error('Provide the password as an argument or via SITE_PASSWORD.');
  process.exit(1);
}

const N = 32768;
const r = 8;
const p = 1;
const salt = randomBytes(16);
const hash = scryptSync(password.normalize('NFC'), salt, 32, {
  N,
  r,
  p,
  maxmem: 64 * 1024 * 1024,
});

console.log(['scrypt', N, r, p, salt.toString('base64url'), hash.toString('base64url')].join('$'));
