-- Standing pages (About, Contact, Privacy, Terms) and the studio's contact email, editable in the admin.
-- Also switches guide ads off until the site is approved by the ad network.

-- ---------------------------------------------------------------------------
-- Site settings (one row): the public contact email. Owners only.
-- ---------------------------------------------------------------------------
create table public.site_settings (
  id integer primary key default 1 check (id = 1),
  contact_email text check (contact_email is null or (char_length(contact_email) <= 254 and contact_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$')),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
create trigger site_settings_touch before update on public.site_settings for each row execute function public.touch_updated_at();
create trigger site_settings_stamp before update on public.site_settings for each row execute function public.stamp_settings();
create trigger audit_site_settings after update on public.site_settings for each row execute function public.audit_row();
insert into public.site_settings (id) values (1) on conflict do nothing;

alter table public.site_settings enable row level security;
create policy "public reads site settings" on public.site_settings for select to anon, authenticated using (true);
create policy "owners update site settings" on public.site_settings for update to authenticated using (public.is_owner()) with check (public.is_owner());
revoke insert, delete on public.site_settings from anon, authenticated;
revoke select on public.site_settings from anon;
grant select (id, contact_email) on public.site_settings to anon;

-- ---------------------------------------------------------------------------
-- Standing pages: a fixed set, edited (never added or removed) through the API, by owners only
-- because two of them are the site's legal text.
-- The body is plain text with a few marks; the site turns it into validated blocks.
-- ---------------------------------------------------------------------------
create table public.site_pages (
  slug text primary key check (slug in ('about', 'contact', 'privacy', 'terms')),
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 20000),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
create trigger site_pages_touch before update on public.site_pages for each row execute function public.touch_updated_at();
create trigger site_pages_stamp before update on public.site_pages for each row execute function public.stamp_settings();
create trigger audit_site_pages after update on public.site_pages for each row execute function public.audit_row();

-- Every saved version is kept, so a change to the legal text can always be traced and undone.
create table public.site_page_revisions (
  id bigint generated always as identity primary key,
  slug text not null references public.site_pages (slug) on delete cascade,
  title text not null,
  body text not null,
  saved_at timestamptz not null,
  saved_by uuid
);
create index site_page_revisions_slug_idx on public.site_page_revisions (slug, id desc);

create or replace function public.site_page_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.slug <> old.slug then
    raise exception 'page addresses are fixed';
  end if;
  if new.title is distinct from old.title or new.body is distinct from old.body then
    insert into public.site_page_revisions (slug, title, body, saved_at, saved_by)
    values (old.slug, old.title, old.body, old.updated_at, old.updated_by);
  end if;
  return new;
end $$;
create trigger site_pages_revision before update on public.site_pages for each row execute function public.site_page_revision();

alter table public.site_pages enable row level security;
alter table public.site_page_revisions enable row level security;
create policy "public reads site pages" on public.site_pages for select to anon, authenticated using (true);
create policy "owners update site pages" on public.site_pages for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "admins read page revisions" on public.site_page_revisions for select to authenticated using (public.can_view_admin());
revoke insert, delete on public.site_pages from anon, authenticated;
revoke insert, update, delete on public.site_page_revisions from anon, authenticated;
revoke select on public.site_pages, public.site_page_revisions from anon;
grant select (slug, title, body, updated_at) on public.site_pages to anon;

-- ---------------------------------------------------------------------------
-- Guide ads are off until someone switches them on in the admin.
-- ---------------------------------------------------------------------------
alter table public.ad_settings alter column enabled set default false;
update public.ad_settings set enabled = false where id = 1;

-- ---------------------------------------------------------------------------
-- Starting text. Same words as src/lib/content/site-pages.ts (a test keeps them in step).
-- ---------------------------------------------------------------------------
insert into public.site_pages (slug, title, body) values ('about', 'About', $mp$Midnight Poetry Studio is a small, independent software studio. We make a handful of careful apps for everyday jobs that are fiddlier than they should be, and we write the guides that explain how to use them.

## What we make

- **Zyra** builds team rosters and shift schedules around who is actually free.
- **Zeno** splits a restaurant bill line by line, including service charge, tax and discounts.
- **Zora** turns a car screen into a calm clock with the live weather behind it.
- **Zotikos** keeps track of shared spending on a trip, in any currency, and works out who owes whom.

Each app has its own site, linked from [the studio's front page](/). They run in a browser, so there is nothing to download from an app store.

## How we work

Ideas tend to arrive late, which is where the name comes from. We would rather ship a small thing that does one job properly than a large thing that does many jobs roughly. That shows up in a few habits: we collect as little personal information as an app can work with, we say plainly what each plan includes, and we fix a mistake when someone points it out.

## About the guides

The [guides](/guides) are written by the studio, from the apps as they actually behave, and each one is checked against the app before it is published. When an app changes, we update its guides and show the date of the last update at the top of the page. Worked examples use made-up names and numbers.

If a guide is wrong or out of date, please tell us through the [contact page](/contact) and we will correct it.

## How the studio is paid for

The apps have free plans and paid plans. The guides are free to read. Some guide pages may carry a small number of clearly labelled ads; [About ads](/about-ads) explains where they appear and how they are chosen. Nobody can pay to change what a guide says.$mp$)
on conflict (slug) do nothing;

insert into public.site_pages (slug, title, body) values ('contact', 'Contact', $mp$We read everything that is sent to us and usually reply within a few working days.

## Help with an app

For a question about your account, a payment or something that isn't working in an app, use the support link on that app's own site. It reaches the right inbox and is the quickest way to get an answer.

- [Zyra](https://zyra.midnightpoetry.studio/) for rosters and shifts
- [Zeno](https://zeno.midnightpoetry.studio/) for splitting a bill
- [Zora](https://zora.midnightpoetry.studio/) for the car-screen clock
- [Zotikos](https://zotikos.midnightpoetry.studio/) for shared travel spending

Many everyday questions are already answered in the [guides](/guides).

## The site and the guides

Write to the studio if a guide is wrong or out of date, if something on this site is broken or hard to use, or if you have a question about [privacy](/privacy), the [terms](/terms) or [ads](/about-ads).

## Advertising and sponsorship

To ask about sponsoring a guide, write to the studio with a short description of what you would like to promote. Sponsored spots are always labelled, and we turn down anything we wouldn't recommend to a friend.

## Before you write

Please don't send passwords, card numbers or full receipts by email. If we need more detail to help you, we will ask for it.$mp$)
on conflict (slug) do nothing;

insert into public.site_pages (slug, title, body) values ('privacy', 'Privacy', $mp$This policy covers midnightpoetry.studio: the studio's front page, the guides and the other pages on this site. Zyra, Zeno, Zora and Zotikos each run on their own sites and have their own privacy policies, which explain what those apps store.

## The short version

- You can read this site without an account, and we don't ask who you are.
- We don't sell personal information.
- If ads from Google are switched on for the guides, Google and its partners may use cookies. Where the law requires it, you are asked first.

## What we collect when you visit

**Technical information.** Like every website, ours receives your IP address, your browser and device type, the page you asked for and the time of the request. Our hosting provider, Cloudflare, processes this to deliver the site, keep it secure and block abuse, and keeps short-lived logs. We don't use it to build a profile of you.

**Preferences kept in your browser.** Your choice of light or dark theme, and of the 2D or 3D scene on the front page, is saved in your own browser's local storage. It is never sent to us.

**Clicks on our own ads.** When you click a sponsor or house ad, we count the click. To count each visitor once a day, our server briefly combines your IP address and browser type into a scrambled code that can't be turned back into either, and deletes it after about a day. We don't store your IP address and this uses no cookies.

**Messages you send us.** If you email us, we keep your address and your message for as long as it takes to deal with it, and for our records afterwards.

## Cookies and similar technologies

The site itself does not set cookies for visitors who are only reading. People who sign in to write guides get a sign-in cookie, which is needed for the account to work.

Advertising partners may use cookies, web beacons (tiny images or scripts that report that a page or an ad was seen) and similar identifiers. The next section explains when.

## Advertising

Ads only ever appear on guide pages, and every ad is labelled "Advertisement". [About ads](/about-ads) explains how they are chosen.

**Sponsor and house ads** are served from this site. They carry no third-party scripts and set no cookies.

**Google AdSense.** Guide pages may also show ads from Google AdSense. When they do:

- Third-party vendors, including Google, use cookies to serve ads based on your earlier visits to this site or to other sites.
- Google's advertising cookies let Google and its partners show you ads based on your visits to this site and other sites on the internet.
- Google and its partners may collect or receive information such as your IP address, cookie identifiers and device details in order to serve and measure ads, limit how often you see an ad and detect fraud.
- You can switch off personalised advertising in [Google's Ads Settings](https://www.google.com/settings/ads), and opt out of many other vendors' use of cookies for personalised advertising at [aboutads.info/choices](https://www.aboutads.info/choices).
- Google explains [how it uses information from sites that use its services](https://policies.google.com/technologies/partner-sites).

Where the law requires consent, including in the European Economic Area, the United Kingdom and Switzerland, you are shown Google's consent message before any advertising cookie is used, and you can change your answer at any time with "Cookie choices" at the bottom of a guide. If you decline, you may still see ads, but they are not based on your activity.

We don't send Google anything that identifies you by name or contact details, and we keep ads off guides about privacy and other sensitive subjects.

## Studio accounts

A small number of people have accounts for writing and editing guides. For them we store an email address, a display name, a scrambled password, a second sign-in step and a record of the changes they make. A security check from Cloudflare (Turnstile) runs on the sign-in pages to keep automated sign-ups out.

## Who helps us run the site

We share information only with companies that help us run this site, and only as far as each needs it:

- **Cloudflare** hosts the site and protects it.
- **Supabase** stores the guides and the studio accounts.
- **Resend** sends sign-in emails to people with studio accounts.
- **Google** serves ads on guide pages when AdSense is switched on.

These companies may process information in countries other than your own. We may also disclose information if the law requires it.

## How long we keep things

Hosting logs are kept by our provider for a short period. The scrambled code used for counting ad clicks is deleted after about a day; the click totals carry no personal information. Studio accounts are kept until they are closed. Email is kept for as long as it is useful for answering you and for our records.

## Children

This site is written for a general audience and is not directed at children under 13. We don't knowingly collect personal information from children. If you think a child has sent us personal information, contact us and we will delete it.

## Your choices and rights

Depending on where you live, you may have the right to ask what personal information we hold about you, to have it corrected or deleted, and to object to or restrict how it is used. Because reading this site needs no account, we usually hold nothing that identifies a reader. To make a request, write to us using the details on the [contact page](/contact). You can also clear this site's saved preferences and any cookies in your browser's settings.

## Changes to this policy

When this policy changes we update this page and the date on it. If a change is significant we will say so on the site.$mp$)
on conflict (slug) do nothing;

insert into public.site_pages (slug, title, body) values ('terms', 'Terms', $mp$These terms cover midnightpoetry.studio: the studio's front page, the guides and the other pages on this site. Zyra, Zeno, Zora and Zotikos have their own terms, which apply when you use those apps. By using this site you agree to these terms. If you don't agree, please don't use it.

## The guides are general information

The guides explain how the studio's apps work. They are general information, not financial, tax, legal, employment or other professional advice. Worked examples use made-up names and numbers. Tax rates, service charges, exchange rates and workplace rules differ from place to place and change over time, so check figures against your own receipts, contracts and local rules before relying on them.

We work to keep the guides accurate and up to date, and each one shows when it was last updated. Apps change, though, and a guide can fall behind the app it describes. If you spot a mistake, tell us through the [contact page](/contact).

## Using the site

You may read, link to and share the pages on this site. Please don't:

- try to get into parts of the site that aren't public, or interfere with how it runs;
- collect the site's content in bulk with automated tools in a way that strains it, or that our robots.txt file asks you not to;
- use the site to break the law or to harm someone else.

## Our content

The text, illustrations, mascots, names and logos on this site belong to Midnight Poetry Studio or are used with permission. You may quote short passages with a link back to the page. Please ask before copying whole guides or using our artwork.

## Ads and links to other sites

Guide pages may show ads, which are always labelled; [About ads](/about-ads) explains how they work. Ads and other links can lead to websites we don't run. We aren't responsible for what those sites say, sell or do, and a link is not a recommendation unless we say so.

## Studio accounts

Accounts on this site are only for people the studio has approved to write and edit guides. If you have one, keep your sign-in details to yourself and tell us straight away if you think someone else has used them.

## No warranty

The site and the guides are provided as they are. To the extent the law allows, we make no promises that the site will always be available, free of errors or suited to a particular purpose.

## Limits on our responsibility

To the extent the law allows, Midnight Poetry Studio is not liable for indirect or consequential loss, or for loss of data, profit or business, that results from using this site or relying on a guide. Nothing in these terms limits any rights you have under consumer protection law that can't be limited or given up.

## Changes

We may update the site and these terms. When the terms change we update this page and the date on it. Carrying on using the site after a change means you accept the updated terms.

## Contact

Questions about these terms can be sent to us using the details on the [contact page](/contact).$mp$)
on conflict (slug) do nothing;

