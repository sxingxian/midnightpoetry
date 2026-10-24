# Midnight Poetry Studio

The studio site at **midnightpoetry.studio**: the poem-first landing page (design “J2 · Dusk to Dawn”), the studio guides, and a private admin for products, guides and ads.

- **Hosting:** Cloudflare Workers (Next.js 15 via [OpenNext](https://opennext.js.org/cloudflare))
- **Database & sign-in:** Supabase (Postgres with row-level security, Supabase Auth with two-step sign-in)
- **Email:** Resend (auth emails through Resend SMTP; notifications through Resend's API)
- **Bot protection:** Cloudflare Turnstile on sign-in, registration and password reset
- **Motion & 3D:** GSAP + ScrollTrigger, Lenis smooth scroll, three.js (clouds and 3D Zeno), React Bits SplitText

The previous single-page site is preserved in the `archives` branch and in git history.

---

## What's where

| Path | What it is |
|---|---|
| `/` | Landing page: the night (or day) passes as you scroll, 3D Zeno runs along the snow, products at dawn |
| `/guides` | Studio guides hub (products whose guides live here; Zyra links out to its own guides) |
| `/guides/[product]/[slug]` | A guide, with labelled ad spots |
| `/admin` | Studio admin (sign-in, two-step code, role required) |
| `/ads.txt` | Generated from the AdSense publisher ID set in the admin |
| `supabase/migrations` | Database schema, security rules, audit log, storage bucket |
| `supabase/seed.sql` | Starter content: Zyra & Zeno, Zeno's categories, the first guide, the Zyra house ad |
| `src/components/landing` | Sky, clouds, 3D Zeno, scroll effects |
| `tests/` | Database security tests (real migration in PGlite) and unit tests |

---

## One-time setup

Do these in order. Until the secrets exist, the deploy workflow skips itself, so nothing breaks.

### 1. Supabase

1. Create a project. Note the **project ref**, the **database password**, the **Project URL** and the **anon / publishable key**.
2. Apply the schema — either let GitHub Actions do it (step 5), or locally:
   ```bash
   npx supabase link --project-ref YOUR_REF
   npx supabase db push
   ```
3. Load the starter content once: open **SQL Editor**, paste `supabase/seed.sql`, run it.
4. **Authentication settings** (Dashboard → Authentication), or run `npx supabase config push` with the env vars from `supabase/config.toml` set:
   - URL configuration → Site URL `https://midnightpoetry.studio`; redirect URLs `https://midnightpoetry.studio/**` (and `http://localhost:3000/**` for local work).
   - Sign in / providers → Email: **Confirm email on**, minimum password length **12**.
   - Attack protection → **CAPTCHA on**, provider **Turnstile**, paste the Turnstile **secret key** (step 3).
   - Multi-factor → **TOTP on** (it is by default).
   - SMTP settings → host `smtp.resend.com`, port `465`, user `resend`, password = your Resend API key, sender `hello@midnightpoetry.studio`.
   - Email templates → **Confirm signup** and **Reset password**: use the bodies in `supabase/templates/` (their links go to `/auth/confirm`, which works even if the email is opened in another browser).

### 2. Resend

Add and verify the domain `midnightpoetry.studio`, then create an API key (sending access). Use it for Supabase SMTP (above) and as the Worker secret `RESEND_API_KEY`.

### 3. Cloudflare Turnstile

Create a widget for `midnightpoetry.studio` (add `localhost` while developing). The **site key** goes to GitHub as `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; the **secret key** goes into Supabase's CAPTCHA setting (Supabase checks every token).

### 4. Cloudflare Workers

1. Create an API token with the **Edit Cloudflare Workers** template. Note your **account ID**.
2. After the first deploy, attach the domain: Workers → `midnightpoetry-studio` → Settings → Domains & Routes → add `midnightpoetry.studio` (or uncomment `routes` in `wrangler.jsonc`). If the old site is on Cloudflare Pages, remove the domain from that Pages project first.
3. Add the server-only secrets (never commit them):
   ```bash
   npx wrangler secret put RESEND_API_KEY
   npx wrangler secret put EMAIL_FROM          # e.g. Midnight Poetry Studio <hello@midnightpoetry.studio>
   npx wrangler secret put OWNER_NOTIFY_EMAIL  # who hears about new registrations
   npx wrangler secret put AD_CLICK_SECRET     # any long random string: openssl rand -hex 32
   ```
   Then tell the database the same click secret once (SQL Editor): `select public.set_click_secret('the same value');` — only the Worker can then count ad clicks.
4. **Rate limiting** (Security → WAF → Rate limiting rules; the free plan includes one rule). Add:
   - *If* `URI Path` starts with `/admin/` **and** `Request Method` equals `POST`
   - *When rate exceeds* 10 requests per 10 seconds, counting by IP → **Block** for 10 seconds.

   This slows down password and authenticator-code guessing on top of Supabase's own auth limits and Turnstile.

### 5. GitHub (automatic deploys)

Repository → Settings → Secrets and variables → Actions:

| Kind | Name | Value |
|---|---|---|
| Secret | `CLOUDFLARE_API_TOKEN` | from step 4 |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | from step 4 |
| Secret | `SUPABASE_ACCESS_TOKEN` | Supabase → Account → Access tokens |
| Secret | `SUPABASE_DB_PASSWORD` | the database password |
| Variable | `SUPABASE_PROJECT_ID` | the project ref |
| Variable | `NEXT_PUBLIC_SITE_URL` | `https://midnightpoetry.studio` |
| Variable | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| Variable | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon / publishable key |
| Variable | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile site key |

Every push to `main` then runs **CI** (lint, types, tests, audit, Worker build) and **Deploy** (database migrations, then build + deploy to Workers). Run Deploy by hand from the Actions tab after adding the secrets.

### 6. The first owner

1. Open `/admin/register`, create your account, and confirm your email.
2. In Supabase SQL Editor: `select public.promote_owner('you@example.com');`
3. Sign in at `/admin/login`, scan the QR code with an authenticator app, and you're in. Everyone after you registers the same way and waits for you to give them a role in **People & roles** — which only lets you do that once they've confirmed their email and set up their authenticator app.

---

## Roles

| Role | Can |
|---|---|
| Pending | Nothing yet — waits for an owner |
| Viewer | Look around the admin |
| Editor | Write guides, products, categories and sponsor/house ads; upload images |
| Owner | Everything, plus ad settings (incl. AdSense), people and the audit log |

Every change needs a signed-in session **verified with the authenticator code** — the database itself checks this (`aal2`), not just the app. Guides are never hard-deleted (archive instead), every edit keeps the previous version, and the audit log is written by the database and can't be edited.

## Ads

Ads appear on guide pages only. Sponsor and house ads (managed in **Ads on guides**) always go first; Google AdSense fills spots nobody has booked, using your own ad units (Auto ads stay off).

Before switching AdSense on:
1. Get the site approved in AdSense (apply once the site and a few original guides are live).
2. Enter the publisher ID and one ad unit per spot in the admin — `/ads.txt` updates itself.
3. In AdSense → Privacy & messaging, publish Google's consent message for the EEA, UK and Switzerland (Google requires a certified consent tool there for personalised ads). The footer's “Cookie choices” button re-opens it.
4. Update the privacy policy (`/privacy` has placeholders to complete).

When AdSense is on, guide pages use Google's documented security policy (nonce + `strict-dynamic`, which also lists `unsafe-eval`). Every other page keeps the strict policy.

## Security notes

- Strict, nonce-based Content Security Policy; HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer and Permissions policies.
- Auth cookies are `httpOnly`, `__Host-` prefixed and `SameSite=Lax`; every auth step runs in server actions.
- Guide content is typed blocks validated with zod and rendered by React — no raw HTML anywhere. Links must be `https://` (or site-relative).
- Image uploads: re-encoded to WebP in the browser (strips location data), checked by their bytes on the server, PNG/JPG/WebP only, 3 MB max, no SVG.
- Ad clicks go through `/api/ads/click/[id]`, which only redirects to a running ad's stored link (no open redirect). Clicks count only when the database sees the Worker's secret, and once per visitor per ad per day (a salted one-way hash — no IP addresses are stored).
- The public can only read live products, their categories and their published guides, and only the columns the site shows (no internal ad names or editor IDs). Who-changed-what, version numbers and dates are set by the database, not the browser.
- Row-level security on every table; see `tests/db.test.ts` for the rules being exercised.

## Local development

```bash
npm install
cp .env.example .env.local     # fill in your Supabase project + Turnstile test keys
npm run dev                    # http://localhost:3000
npm test                       # database security + unit tests
npm run preview                # build and run in the Workers runtime (uses .dev.vars)
```

No Supabase project yet? `node tests/mock-supabase.mjs` serves the seed data on `:54321` (read-only) so the public pages render; set `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`.

Turnstile test keys: site key `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`.

## Licences

React Bits SplitText (`src/components/vendor/react-bits`) © David Haz, MIT + Commons Clause — used as part of this site. Instrument Serif (SIL OFL, `src/app/fonts`), Geist (SIL OFL).
