# 🎄 Christmas Feast 2026 — pre-order site

A private, password-protected site where the 12 of us pick our **starter, main and dessert** for the
Smokehouse & Cellar Christmas meal. Once everyone has ordered, anyone can download the restaurant's own
**booking form PDF, already filled in** — names, ticks and allergies — ready to send.

It looks like a terminal: pure black, candy-cane red and frost white, with every picture and icon drawn in
**ASCII** and a big, detailed, animated ASCII Christmas tree in the backdrop.

Built with **Vite + React + TypeScript + Tailwind CSS v4**, animated with **Motion**, with a single
**Vercel Function** API backed by **Supabase Postgres**, and Vercel Routing Middleware that hides the
whole site from anyone without the password.

## Features

- 🔐 **Password gate at the edge** — without a valid session, every URL shows only a login page; the app
  code, the menu PDF and all data are never served. Every API endpoint (except login/logout) checks too.
- 🙈 **Hidden from search engines and AI scrapers** — `noindex` everywhere (headers + meta), a `robots.txt`
  that names every major search/AI/SEO/archive crawler, and Vercel Firewall rules that block bots outright.
- 🍽️ **Select-only ordering from the real menu** — "Christmas at the Smokehouse 2026": every dish with its
  description and Vegan / gluten-free labels. Starters and desserts can be skipped; the main can't.
  The menu's own choices are picked from a list too: **gluten-free soup** and **fudge cake with cream or ice cream**
  (both written into the booking form's requirements column).
- ✏️ **Edit and delete** orders, with duplicate-name protection.
- ⏳ **Deadline 8 December 2026** — live countdown; after midnight orders are locked (server-enforced).
- 🎁 **Progress garland** — a bauble lights up with each person's initials as they order, plus a live kitchen
  tally and a food-bill estimate (£39.95 pp + 10% service).
- ⏳ **Proper loading, empty and error states** — skeleton screens, spinners on every action, retryable
  error panels (offline, database down, server error), an offline banner and a crash-proof error boundary.
- 🧾 **Auto-filled booking form** — the restaurant's PDF filled in alphabetically, with the header details
  (lead booker, phone, date, time…) and total guests. It stays editable for last-minute tweaks.
- 📖 **Menu download** for everyone who's logged in.
- 🎄 **Animated ASCII tree backdrop** — a big, detailed Christmas tree behind every page. Its fairy lights
  twinkle and switch on, top to bottom, as you scroll; the star flares at the bottom of the page; the tree
  drifts gently (parallax) under falling ASCII snow, and stands beside the login card on wide screens.
  It's drawn by a small procedural renderer (`src/components/ascii/engine/`) that shades each
  character cell — layered drooping branches with needle texture and lighting, snow on the tips, tinsel and
  bead garlands, glossy baubles with highlights, a faceted star, wrapped presents and snowy ground — at a
  font size picked for the screen, so it stays detailed from phones to 4K. Glyphs are copied from a
  pre-rendered atlas at whole device pixels (pin-sharp), and slow devices automatically step down
  resolution, then frame rate.
- 🔤 **Everything in ASCII** — FIGlet title banners that decode themselves, `( )`/`(*)` radio buttons, dish
  pictures, a `[====>....]` progress bar, `[####...]` kitchen-tally bars, ticket-style order cards, an ASCII
  sleigh fly-by, shaded ASCII baubles in the margins, string lights in the header, a snowy ASCII village
  (cottages, lamp posts, a snowman, lit trees) along the bottom, ASCII confetti and a detailed coloured
  ASCII tree in the browser console. All of it calms down with "reduce motion" switched on.
- 💬 **Discord notifications (optional)** — every new, changed or removed order is posted to a Discord channel
  with everything the person filled in (see below).
- 📱 Fully responsive, with a thumb-friendly nav on phones.

## Deployment

The live site runs on Vercel (project in the *Kkermit's projects* team) with a Supabase Postgres database
(project `christmas-feast-2026`, London). The URL is shared privately and deliberately not written here.

Environment variables on Vercel (Production + Preview, all *sensitive*):

| Variable         | What                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------- |
| `DATABASE_URL`   | Supabase pooler URL for the least-privilege `xmas_app` role (see `db/migrations`).            |
| `SESSION_SECRET` | Long random string used to sign login cookies.                                                 |

### Discord notifications (optional)

Each time someone places, edits or removes an order, a message goes to a Discord channel: their name,
starter, main, dessert (with options such as gluten-free soup or ice cream), allergies/requests, what changed
on an edit, and how many of the 12 have ordered — plus a 🎉 message when the last person orders.

1. In Discord: **Server Settings → Integrations → Webhooks → New Webhook**, choose the channel, then
   **Copy Webhook URL**.
2. In Vercel: **Project → Settings → Environment Variables**, add `DISCORD_WEBHOOK_URL` with that URL
   (mark it *Sensitive*, Production + Preview), then **redeploy**.

Leave it unset to turn notifications off. Only real Discord webhook URLs are accepted, nobody can `@everyone`
through a name or note, and if Discord is down the order still saves — the message is sent in the background.

To set up from scratch: create a Supabase project, run `db/migrations/001_init.sql`, create the
`xmas_app` role and run `002_app_role.sql`, then import this repo into Vercel and add the two variables.
The app also works with `POSTGRES_URL` (Neon/Vercel Postgres) or Upstash Redis (`KV_REST_API_URL`/`TOKEN`).

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
| `REDIS_URL`       | —                                        | Use any `redis://`/`rediss://` server instead of Postgres. |
| `DISCORD_WEBHOOK_URL` | —                                    | Post every order change to Discord (see above).            |

## Security & privacy

- **Edge gate** (`middleware.ts`): without a valid session cookie the only files anyone can load are the
  login page, the generic UI framework code, the favicon and `robots.txt`. A build check
  (`scripts/check-public-assets.mjs`) fails the build if anything about the event leaks into those files.
- **API**: every route except login/logout checks a **signed, HttpOnly, `SameSite=Strict`, `Secure` session
  cookie** (HMAC-SHA256, 30-day expiry). Without it you get `401` and nothing changes.
- **Brute-force protection**: 10 wrong passwords from one IP → locked out for 15 minutes (only failures count).
- **Database**: tables live in a private `xmas` schema (not exposed by Supabase's public APIs) with RLS on;
  the app connects as `xmas_app`, which can only read/write those three tables. Names are unique at the
  database level, so two people can't grab the same name at once.
- Writes must be same-origin JSON; all input is validated on the server against the menu.
- `noindex, nofollow, noarchive, nosnippet, noimageindex, noai` on every response, strict CSP, no framing.

## Run it locally

```bash
npm install
npm run dev          # http://localhost:5173 — full site + API, data saved in .data/dev-db.json
npm test             # unit + component tests (Vitest)
npm run build        # type-check and production build
```

## How the booking form works

Each guest's row gets a tick per dish, and the requirements column combines their dish options with any
allergy notes (e.g. `GF soup; Fudge cake w/ ice cream; Nut allergy`).

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
middleware.ts           Edge gate - hides everything but the login page from strangers
db/migrations/          Postgres schema and least-privilege role
server/                 API: routing, auth, config, storage (Postgres/Redis/file), PDF filling
shared/                 Menu, types and validation shared by the site and the API
src/                    React app (main.tsx = the app, login.tsx = the public login page)
src/components/ascii/   ASCII art: tree generator, the three backdrops, banners, glyphs, sleigh, village
public/files/           The restaurant's menu PDF (only served after logging in)
tests/                  API, auth, PDF, storage and validation tests
scripts/                Password hashing and PDF template tools
```
