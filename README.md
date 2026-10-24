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
| `/guides` | Guides hub for every product (Zyra, Zeno and future products) — all guides are written and kept on this site |
| `/guides/[product]/[slug]` | A guide, with labelled ad spots |
| `/admin` | Studio admin (sign-in, two-step code, role required) |
| `/ads.txt` | Generated from the AdSense publisher ID set in the admin |
| `supabase/migrations` | Database schema, security rules, audit log, storage bucket |
| `content/guides/*.json` | The shipped Zyra and Zeno guides (12 each) and product cards; `node scripts/content-sql.mjs` turns them into a migration |
| `supabase/seed.sql` | Optional extras: the Zyra house ad and default ad settings |
| `src/components/landing` | Sky, clouds, 3D Zeno, scroll effects |
| `tests/` | Database security tests (real migration in PGlite) and unit tests |

---

## Deploying

Follow **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**. It uses the same set-up as Zyra: a Cloudflare Worker connected to Git, Supabase in Singapore with a **Deploy Supabase** workflow, Resend sending from `sxingxian.com`, and Turnstile. The studio has its own Supabase project, Turnstile widget and Resend key, so its admin accounts never mix with Zyra's or Zeno's.

In short:
1. A new Supabase project → `db push` (adds the products and guides) → optional `seed.sql` → auth settings → `set_click_secret`.
2. A new Resend API key on `sxingxian.com`, used for Supabase SMTP and as a Worker secret.
3. A new Turnstile widget for `midnightpoetry.studio`.
4. A Cloudflare Worker imported from this repository, with build variables and secrets, plus one rate-limit rule.
5. GitHub: `SUPABASE_ACCESS_TOKEN` secret and `SUPABASE_PROJECT_REF` variable.
6. Register, run `select public.promote_owner('you@example.com');`, sign in.

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
