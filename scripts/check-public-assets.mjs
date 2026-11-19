#!/usr/bin/env node
// Build guard: everything the edge gate serves WITHOUT a login (login.html and
// assets/login-* / assets/shared-*) must not contain anything about the event.
// Fails the build if a private string leaks into a public file.
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const PRIVATE_MARKERS = ['Smokehouse', 'Knutsford', 'Trillionaires', 'Wellington', 'Seabass', 'Marie Rose', 'booking form', 'Nice List'];

const publicFiles = [
  path.join(dist, 'login.html'),
  ...fs
    .readdirSync(path.join(dist, 'assets'))
    .filter((f) => /^(login|shared)-/.test(f))
    .map((f) => path.join(dist, 'assets', f)),
];
const appEntries = fs.readdirSync(path.join(dist, 'assets')).filter((f) => /^app-.*\.js$/.test(f));

let failed = false;
if (appEntries.length !== 1) {
  console.error(`Expected exactly one private app-*.js entry, found: ${appEntries.join(', ') || 'none'}`);
  failed = true;
}
for (const file of publicFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const marker of PRIVATE_MARKERS) {
    if (text.includes(marker)) {
      console.error(`Private text "${marker}" found in public file ${path.relative(dist, file)}`);
      failed = true;
    }
  }
}
if (failed) process.exit(1);
console.log(`Public asset check passed (${publicFiles.length} public files, private entry ${appEntries[0]}).`);
