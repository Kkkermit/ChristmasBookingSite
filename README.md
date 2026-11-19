# 🎄 Christmas Feast 2026 — pre-order site

A private, password-protected site where the 12 of us pick our **starter, main and dessert** for the
Smokehouse & Cellar Christmas meal. Once everyone has ordered, anyone can download the restaurant's own
**booking form PDF, already filled in** — names, ticks and allergies — ready to send.

Built with **Vite + React + TypeScript + Tailwind CSS v4**, animated with **Motion**, with a single
**Vercel Function** API backed by **Upstash Redis**.

## Features

- 🔐 **Password gate** on the site and on **every API endpoint** (only login/logout are public).
- 🍽️ **Select-only ordering** — dishes come straight from the booking form (4 starters, 5 mains, 4 desserts).
  Starters and desserts can be skipped; the main can't.
- ✏️ **Edit and delete** orders, with duplicate-name protection.
- ⏳ **Deadline 8 December 2026** — live countdown; after midnight orders are locked (server-enforced).
- 🎁 **Progress garland** — a bauble lights up with each person's initials as they order, plus a live kitchen tally.
- 🧾 **Auto-filled booking form** — the restaurant's PDF filled in alphabetically, with the header details
  (lead booker, phone, date, time…) and total guests. It stays editable for last-minute tweaks.
- 📖 **Menu download** for everyone who's logged in.
- ❄️ Snowfall, fairy lights, twinkling trees, a waving snowman, a sleigh fly-by, confetti… and it all
  calms down for anyone with "reduce motion" switched on.
- 📱 Fully responsive, with a thumb-friendly nav on phones.

## Deploy to Vercel (about 5 minutes)

1. **Import the repo** at [vercel.com/new](https://vercel.com/new). Everything is pre-configured in
   `vercel.json` — just press **Deploy**.
2. **Add the database**: in the project, open **Storage → Create Database → Upstash for Redis** (the free
   plan is plenty), and **connect it to the project** for all environments. This adds `KV_REST_API_URL`
   and `KV_REST_API_TOKEN` automatically.
3. **Redeploy** (Deployments → ⋯ → Redeploy) so the function picks up the new variables.

That's it — open the site and enter the password.

> Until step 2 is done the site still loads and accepts the password, but shows a "connect the database"
> message instead of the order form.

### The password

The agreed password works out of the box. Only a **salted scrypt hash** of it is in the code
(`server/config.ts`) — never the password itself — and it is checked on the server only.

To change it, add an environment variable in Vercel and redeploy (this also logs everyone out):

| Variable             | Meaning                                                                   |
| -------------------- | ------------------------------------------------------------------------- |
| `SITE_PASSWORD`      | The new password in plain text (simplest).                                |
| `SITE_PASSWORD_HASH` | Or a hash from `npm run hash-password -- 'new password'` if you prefer.   |

### Other settings (all optional)

| Variable          | Default                                  | Meaning                                                    |
| ----------------- | ---------------------------------------- | ---------------------------------------------------------- |
| `ORDER_DEADLINE`  | `2026-12-08T23:59:59Z`                   | When orders lock (ISO date/time).                          |
| `PARTY_SIZE`      | `12`                                     | How many orders we're waiting for.                         |
| `MAX_GUESTS`      | `18`                                     | Hard cap — the booking form has 18 rows.                   |
| `SESSION_SECRET`  | the Redis token                          | Secret used to sign login cookies.                         |
| `MENU_URL`        | Smokehouse & Cellar menu PDF             | Where the "Download menu" button fetches the menu from.    |
| `REDIS_URL`       | —                                        | Use any `redis://`/`rediss://` server instead of Upstash.  |

## Security

- Every `/api/*` route except login/logout checks a **signed, HttpOnly, `SameSite=Strict`, `Secure`
  session cookie** (HMAC-SHA256, 30-day expiry). Without it you get `401` and nothing changes.
- **Brute-force protection**: 10 wrong passwords from one IP → locked out for 15 minutes. Correct logins
  don't count, so an office sharing one IP is fine.
- Writes must be same-origin JSON; all input is validated on the server against the menu.
- Strict security headers (CSP, no framing, `noindex`) and `robots.txt` keep the site out of search engines.
- The page's code (HTML/JS) is public like any website, but contains **no orders or personal data** —
  that all lives behind the API.

## Run it locally

```bash
npm install
npm run dev          # http://localhost:5173 — full site + API, data saved in .data/dev-db.json
npm test             # unit + component tests (Vitest)
npm run build        # type-check and production build
```

## How the booking form works

`server/assets/booking-form-template.pdf` is a cleaned, blank copy of the restaurant's fillable form
(the original had been pre-filled on a phone and carried 5 MB of editor data).
`scripts/clean-template.mjs` produced it, plus `booking-form-template.ts` — the same PDF embedded in the
code so the Vercel Function has nothing extra to bundle. `server/pdf.ts` fills it with
[pdf-lib](https://pdf-lib.js.org): guests alphabetically, a tick per chosen dish, allergies in the last
column (shrunk to fit), and the header details.

If the restaurant sends a new form with the same field names:

```bash
node scripts/clean-template.mjs path/to/new-form.pdf
```

## Project layout

```
api/index.ts            The single Vercel Function (all /api/* routes are rewritten here)
server/                 API: routing, auth, config, storage, PDF filling
shared/                 Menu, types and validation shared by the site and the API
src/                    React app (components, hooks, styles)
tests/                  API, auth, PDF, storage and validation tests
scripts/                Password hashing and PDF template tools
```
