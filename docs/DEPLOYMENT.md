# Deploying the studio site

The studio site follows Zyra's set-up (`sxingxian/zyra` → `docs/DEPLOYMENT.md`). It uses **Supabase** in Singapore for the database and sign-in, a **Cloudflare Worker** connected to Git, **Resend** for email and **Cloudflare Turnstile** for bot checks. It uses the same Cloudflare, Resend and GitHub accounts as Zyra, but it gets **its own** Supabase project, Turnstile widget and Resend API key, so the studio admin's accounts and roles never mix with Zyra's or Zeno's. Allow about 45 minutes the first time.

| Host | Serves | Cloudflare Worker | Supabase project |
| --- | --- | --- | --- |
| `midnightpoetry.studio` | Landing page, guides (every product's, Zyra included), admin at `/admin` | `midnightpoetry` (the existing one) | its own (not Zyra's or Zeno's) |

## 1. Supabase project

1. Create a **new** project at supabase.com, the same way as Zyra's: **Region: Southeast Asia (Singapore)** and a strong database password (store it in your password manager). Don't reuse Zyra's or Zeno's project. The migration stops with an error in a project that already has a `profiles` table (Zyra's does).
   - The free plan includes two free projects per organisation. If Zyra and Zeno already use both, the dashboard won't offer a third free one: put the studio in an organisation with room, or on a paid plan.
   - Free projects pause after a week with no requests. The public pages read from the database on every visit, so any traffic keeps it awake. If it does pause, restore it from the dashboard.
2. Link the repository and apply the migrations (schema, security rules, audit log, storage bucket). You can also skip this and run **Actions → Deploy Supabase** (section 5):

   ```bash
   npx supabase login
   npx supabase link --project-ref <studio-project-ref>
   npx supabase db push
   ```

3. Load the starter content once: SQL editor → paste `supabase/seed.sql` → Run. It adds Zyra and Zeno, Zeno's categories, the first guide and the Zyra house ad. Add Zyra's guide categories later in the admin.
4. Ad-click secret: generate a long random value with `openssl rand -hex 32`. Run `select public.set_click_secret('<value>');` in the SQL editor, and put the same value in the Worker secret `AD_CLICK_SECRET` (section 4). Only the Worker can then count ad clicks.

### Auth settings (Dashboard → Authentication)

Copy these from `supabase/config.toml`. The CLI applies them locally only. They match Zyra's choices.

- **URL configuration**
  - Site URL: `https://midnightpoetry.studio`
  - Redirect URLs: `https://midnightpoetry.studio/**`
  - A new project starts with Site URL `http://localhost:3000`. Until you change it, confirmation and reset links land on localhost.
- **Sessions**
  - Access token (JWT) expiry: 600 seconds
  - Refresh token rotation: on, with a reuse interval of 10 seconds
  - Time-box 24 hours, inactivity timeout 8 hours (Pro plan; skip on Free)
- **Passwords**
  - Minimum length: 12
  - Leaked-password protection: on (Pro plan; skip on Free)
- **Email**
  - Confirm email: on
  - Secure email change: on
  - Secure password change: on
- **Multi-factor**: TOTP enrolment and verification on. Everyone in the studio admin uses an authenticator app, as Zyra's staff do.
- **Bot protection**: Cloudflare Turnstile, with the studio widget's secret key (section 3).
- **Email (SMTP)**: host `smtp.resend.com`, port `465`, user `resend`, password = the studio's Resend API key (section 1b). Sender `security@sxingxian.com`, name "Midnight Poetry Studio".
- **Email templates**: **Confirm signup** and **Reset password**. Use the bodies in `supabase/templates/`. Their links go to `/auth/confirm`, which works even when the email is opened in another browser.

## 1b. Email (Resend)

Zyra already sends from the verified domain `sxingxian.com`. The studio sends from the same domain, as Zyra keeps all email addresses on `sxingxian.com`, separate from the page domains.

1. Resend → API keys → **Create API key**. Name it `midnightpoetry-studio`, give it **Sending access** only, and limit it to the `sxingxian.com` domain. A separate key means you can revoke it without touching Zyra.
2. Use that key for:
   - the Supabase SMTP password (above);
   - the Worker secret `RESEND_API_KEY` (section 4).
3. Set the Worker secrets `EMAIL_FROM` (`Midnight Poetry Studio <security@sxingxian.com>`) and `OWNER_NOTIFY_EMAIL` (the inbox that hears about new registrations).

What the studio emails:
- Supabase Auth sends sign-up confirmations and password resets through SMTP.
- The site sends "someone registered" to the owner, and "you've been given access" to the person, through Resend's API.

## 2. First owner

Studio roles (Pending, Viewer, Editor, Owner) belong to this project only. Being staff in Zyra gives no access here.

1. Open `https://midnightpoetry.studio/admin/register`, create your account and confirm your email.
2. In the studio project's SQL editor run `select public.promote_owner('you@example.com');`.
3. Sign in at `/admin/login` and set up your authenticator app when asked.

From then on, people register at `/admin/register` and wait as Pending. An owner gives them a role in **People & roles**, which only allows it once they've confirmed their email and set up an authenticator app.

## 3. Cloudflare Turnstile

Cloudflare dashboard → Turnstile → **Add widget**. Make a new widget rather than adding the hostname to Zyra's, so each site's keys can be rotated on their own:

- Name: Midnight Poetry Studio
- Hostname: `midnightpoetry.studio`
- Mode: Managed

Then:

- Put the **site key** in the Worker's build variables (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`, section 4).
- Put the **secret key** in the studio's Supabase project → Authentication → Bot protection.

For local work, use Turnstile's test keys (README).

## 4. Cloudflare Worker (connected to Git)

As with Zyra, Cloudflare builds and deploys the Worker itself on every push, so no Cloudflare token is stored in GitHub. The Worker settings are in `wrangler.jsonc`.

The studio already has a Worker, **`midnightpoetry`**, connected to this repository. It served the old one-page site as static files only, which is why its *Variables and secrets* section says "Variables cannot be added to a Worker that only has static assets". Keep that Worker (it already owns the domain) and change its build settings. After the first successful build it becomes a full Worker, and the variables section opens up.

**Step 1: build settings.** Workers & Pages → `midnightpoetry` → Settings → **Build**:

- **Git repository:** `sxingxian/midnightpoetry`, production branch `main`
- **Root directory:** `/`
- **Build command:** `npm ci && npx opennextjs-cloudflare build`
- **Deploy command:** `npx opennextjs-cloudflare deploy`
- **Non-production branch deploy command:** `npx opennextjs-cloudflare upload`
- **Build variables** (Settings → Build → *Variables and secrets*, which is not the runtime one). These are public values; never put the service-role key here.
  - `NODE_VERSION=22`
  - `NEXT_TELEMETRY_DISABLED=1`
  - `NEXT_PUBLIC_SITE_URL=https://midnightpoetry.studio`
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from the **studio** project)
  - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (from the studio widget)

> Don't keep the default deploy command `npx wrangler deploy`: there is no build output for it to upload. OpenNext's `deploy` uploads the Worker together with its cache in the right order. The Worker name must stay `midnightpoetry` to match `name` in `wrangler.jsonc`, or the build stops.

Set up Supabase and Turnstile (sections 1 and 3) first, so the build variables have real values. The site's public pages and sign-in need them.

**Step 2: first deploy.** Deployments → the latest failed build → **Retry build**, or push a commit. Builds that failed before this never replaced the old page, so the old page stays up until this one succeeds.

**Step 3: runtime secrets.** Once the deploy has succeeded, Settings → **Variables and secrets** accepts entries. Add these with type *Secret*; `keep_vars` in `wrangler.jsonc` keeps them across deploys.

| Secret | Value |
| --- | --- |
| `RESEND_API_KEY` | the studio's Resend key (section 1b) |
| `EMAIL_FROM` | `Midnight Poetry Studio <security@sxingxian.com>` |
| `OWNER_NOTIFY_EMAIL` | where new-registration notices go |
| `AD_CLICK_SECRET` | the value from section 1, step 4 |

Saving a secret redeploys the current version with it. Until the secrets are set, the site works but sends no notification emails and counts no ad clicks.

### Custom domain

`wrangler.jsonc` claims `midnightpoetry.studio` as a Worker custom domain. The first deploy creates the DNS record and certificate, because `midnightpoetry.studio` is already a zone in this Cloudflare account (Zyra's hosts live under it). The existing `midnightpoetry` Worker most likely owns it already, so nothing changes. If the domain is attached somewhere else, remove it there first, or the deploy can't claim it:

- a Pages project → Custom domains;
- an older Worker → Domains & Routes;
- a DNS record for `midnightpoetry.studio`.

Workers serve only that domain: `workers_dev` and `preview_urls` are off, as in Zyra. Keep the orange-cloud proxy on. If you want `www.midnightpoetry.studio` too, add it as a Redirect Rule to the apex.

### Rate limiting

Security → WAF → **Rate limiting rules** (the free plan includes one rule) → Create:

- *If* `URI Path` starts with `/admin/` **and** `Request Method` equals `POST`
- *When rate exceeds* 10 requests per 10 seconds, counting by IP → **Block** for 10 seconds

This slows down password and authenticator-code guessing, on top of Supabase's own limits and Turnstile.

## 5. Deploying database changes from a phone

`.github/workflows/supabase-deploy.yml` is the same workflow as Zyra's (without Edge Functions). It runs `supabase db push` on GitHub's servers, so no computer is needed after the first set-up.

**One-time set-up** (a phone browser at github.com works; the GitHub app can't edit secrets):

1. supabase.com → Account → **Access Tokens** → generate a token named `github-deploy-studio`.
2. This repository → Settings → Secrets and variables → Actions:
   - **Secrets** tab: `SUPABASE_ACCESS_TOKEN` (the token). No database password is needed. If you add a `SUPABASE_DB_PASSWORD` secret, it's used instead.
   - **Variables** tab: `SUPABASE_PROJECT_REF` = the **studio** project's id (from its dashboard URL).

**Each time:** GitHub app → this repository → **Actions** → **Deploy Supabase** → **Run workflow**. Tick *dry run* to list the migrations without running them. The workflow refuses to deploy a commit whose CI run didn't pass.

**Optional, fully automatic:** add the variable `AUTO_DEPLOY_SUPABASE` = `true`, and every push to `main` deploys by itself once CI passes.

The Worker redeploys itself on every push (section 4).

## 6. After the first deploy

- [ ] Register at `/admin/register`. Check that the confirmation email arrives from `security@sxingxian.com` and that its link signs you in.
- [ ] Promote yourself (section 2), sign in, set up the authenticator, and check the dashboard and audit log.
- [ ] Register a second account and check the owner email arrives. Check that **People & roles** won't give it a role until it has set up an authenticator.
- [ ] Sign in to the studio admin with a Zyra staff account. It should be refused, because the projects are separate.
- [ ] Publish a guide for Zyra and one for Zeno; both should appear on `/guides`.
- [ ] Click the house ad on a guide, then check **Ads on guides** shows one click (a second click from the same browser that day isn't counted).
- [ ] Run `https://securityheaders.com` against `midnightpoetry.studio`. You should get an A.
- [ ] AdSense (once approved): enter the publisher ID and units in the admin, then check `/ads.txt`.

## Release safety

- GitHub Actions are pinned to exact commits, with the version in a comment, using the same pins as Zyra. To update one, look up the new release's commit and change both.
- CI installs only the versions in `package-lock.json`, runs the database rule tests on every migration, builds the Worker, and validates the bundle with `wrangler deploy --dry-run`.
- Database deploys run only after CI passed, and automatic ones only on this repository's `main`, never for a pull request or a fork.
- The Supabase CLI version used in the workflow is pinned; update it on purpose.

## Local development

See the README.
