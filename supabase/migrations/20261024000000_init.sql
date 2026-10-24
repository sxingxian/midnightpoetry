-- Midnight Poetry Studio — initial schema
-- Roles: pending (just registered) → viewer → editor → owner.
-- Writes need editor/owner AND a session verified with a second factor (aal2).

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Profiles & roles
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('pending', 'viewer', 'editor', 'owner');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null default '' check (char_length(display_name) <= 80),
  role public.app_role not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80)
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.current_app_role()
returns public.app_role language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_aal2()
returns boolean language sql stable as $$
  select coalesce((auth.jwt() ->> 'aal') = 'aal2', false)
$$;

create or replace function public.can_edit()
returns boolean language sql stable as $$
  select public.is_aal2() and coalesce(public.current_app_role() in ('editor', 'owner'), false)
$$;

create or replace function public.is_owner()
returns boolean language sql stable as $$
  select public.is_aal2() and coalesce(public.current_app_role() = 'owner', false)
$$;

create or replace function public.can_view_admin()
returns boolean language sql stable as $$
  select public.is_aal2() and coalesce(public.current_app_role() in ('viewer', 'editor', 'owner'), false)
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Only owners may change roles, nobody may change id/email through the API,
-- and the last owner can't be demoted (no lock-out).
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.id <> old.id or new.email <> old.email then
    raise exception 'profile id and email are read-only';
  end if;
  if new.role <> old.role then
    -- API requests always carry a user id; the SQL editor (bootstrap) does not.
    if auth.uid() is not null and not public.is_owner() then
      raise exception 'only owners can change roles';
    end if;
    if old.role = 'owner' and new.role <> 'owner'
       and (select count(*) from public.profiles where role = 'owner') <= 1 then
      raise exception 'cannot remove the last owner';
    end if;
  end if;
  return new;
end $$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ---------------------------------------------------------------------------
-- Products (shown on the landing page)
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name text not null check (char_length(name) between 1 and 60),
  kind text not null default '' check (char_length(kind) <= 80),
  headline text not null default '' check (char_length(headline) <= 120),
  headline_em text not null default '' check (char_length(headline_em) <= 120),
  headline_style text not null default 'serif' check (headline_style in ('serif', 'sans')),
  description text not null default '' check (char_length(description) <= 400),
  highlights jsonb not null default '[]'::jsonb check (jsonb_typeof(highlights) = 'array' and jsonb_array_length(highlights) <= 3),
  cta_label text not null default 'Open' check (char_length(cta_label) <= 40),
  cta_url text check (cta_url is null or cta_url ~ '^https://[^\s]+$'),
  site_url text check (site_url is null or site_url ~ '^https://[^\s]+$'),
  guides_url text check (guides_url is null or guides_url ~ '^https://[^\s]+$'),
  accent_dark text not null default '#F0A684' check (accent_dark ~ '^#[0-9A-Fa-f]{6}$'),
  accent_light text not null default '#A04A2A' check (accent_light ~ '^#[0-9A-Fa-f]{6}$'),
  button_dark text not null default '#F8F0E1' check (button_dark ~ '^#[0-9A-Fa-f]{6}$'),
  button_light text not null default '#1F1D1A' check (button_light ~ '^#[0-9A-Fa-f]{6}$'),
  status text not null default 'draft' check (status in ('draft', 'live', 'hidden')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  sort_order integer not null default 0,
  unique (product_id, slug)
);

-- ---------------------------------------------------------------------------
-- Guides (structured blocks only — never raw HTML)
-- ---------------------------------------------------------------------------
create table public.guides (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  category_id uuid references public.categories (id) on delete set null,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title text not null check (char_length(title) between 1 and 140),
  standfirst text not null default '' check (char_length(standfirst) <= 400),
  blocks jsonb not null default '[]'::jsonb check (jsonb_typeof(blocks) = 'array'),
  start_here boolean not null default false,
  meta_title text not null default '' check (char_length(meta_title) <= 70),
  meta_description text not null default '' check (char_length(meta_description) <= 170),
  author_name text not null default '' check (char_length(author_name) <= 80),
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published', 'archived')),
  publish_at timestamptz,
  published_at timestamptz,
  ads_enabled boolean not null default true,
  ad_spots text[] not null default array['inline', 'side']::text[] check (ad_spots <@ array['inline', 'end', 'side']::text[]),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  unique (product_id, slug),
  check (pg_column_size(blocks) < 400000)
);
create index guides_public_idx on public.guides (status, publish_at);
create trigger guides_touch before update on public.guides for each row execute function public.touch_updated_at();

create table public.guide_revisions (
  id bigint generated always as identity primary key,
  guide_id uuid not null references public.guides (id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);
create index guide_revisions_guide_idx on public.guide_revisions (guide_id, version desc);

-- Keep a snapshot of every previous version and bump the version number.
create or replace function public.guide_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (to_jsonb(new) - array['updated_at', 'version', 'updated_by', 'published_at'])
     is distinct from (to_jsonb(old) - array['updated_at', 'version', 'updated_by', 'published_at']) then
    insert into public.guide_revisions (guide_id, version, snapshot, created_by)
    values (old.id, old.version, to_jsonb(old), auth.uid());
    new.version := old.version + 1;
  end if;
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end $$;
create trigger guides_revision before update on public.guides for each row execute function public.guide_revision();

create or replace function public.guide_first_publish()
returns trigger language plpgsql as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end $$;
create trigger guides_first_publish before insert on public.guides for each row execute function public.guide_first_publish();

-- ---------------------------------------------------------------------------
-- Ads
-- ---------------------------------------------------------------------------
create table public.ad_settings (
  id integer primary key default 1 check (id = 1),
  enabled boolean not null default true,
  house_enabled boolean not null default true,
  network_enabled boolean not null default false,
  spots text[] not null default array['inline', 'side', 'hub']::text[] check (spots <@ array['inline', 'end', 'side', 'hub']::text[]),
  max_per_page integer not null default 2 check (max_per_page between 1 and 3),
  excluded_category_ids uuid[] not null default '{}',
  adsense_client text check (adsense_client is null or adsense_client ~ '^ca-pub-[0-9]{16}$'),
  adsense_units jsonb not null default '{}'::jsonb check (jsonb_typeof(adsense_units) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
create trigger ad_settings_touch before update on public.ad_settings for each row execute function public.touch_updated_at();
insert into public.ad_settings (id) values (1) on conflict do nothing;

create table public.ads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  kind text not null check (kind in ('sponsor', 'house')),
  sponsor_name text not null default '' check (char_length(sponsor_name) <= 60),
  eyebrow text not null default '' check (char_length(eyebrow) <= 40),
  headline text not null check (char_length(headline) between 1 and 70),
  body text not null default '' check (char_length(body) <= 140),
  cta_label text not null default 'Learn more' check (char_length(cta_label) between 1 and 24),
  url text not null check (url ~ '^https://[^\s]+$' and char_length(url) <= 500),
  image_path text check (image_path is null or image_path ~ '^ads/[a-z0-9-]+\.(webp|png|jpg)$'),
  spots text[] not null default array['inline']::text[] check (spots <@ array['inline', 'end', 'side', 'hub']::text[]),
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'live', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create trigger ads_touch before update on public.ads for each row execute function public.touch_updated_at();

create table public.ad_clicks (
  ad_id uuid not null references public.ads (id) on delete cascade,
  day date not null default current_date,
  clicks integer not null default 0,
  primary key (ad_id, day)
);

-- Called by the click redirect. Counts the click and returns the destination,
-- only for ads that are live right now (so it can't be used as an open redirect).
create or replace function public.record_ad_click(p_ad uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  dest text;
begin
  select url into dest from public.ads
   where id = p_ad and status = 'live'
     and (starts_at is null or starts_at <= now())
     and (ends_at is null or ends_at > now());
  if dest is null then
    return null;
  end if;
  insert into public.ad_clicks (ad_id, day, clicks) values (p_ad, current_date, 1)
  on conflict (ad_id, day) do update set clicks = public.ad_clicks.clicks + 1;
  return dest;
end $$;
revoke all on function public.record_ad_click(uuid) from public;
grant execute on function public.record_ad_click(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Audit log (append-only, written by triggers)
-- ---------------------------------------------------------------------------
create table public.audit_events (
  id bigint generated always as identity primary key,
  actor uuid,
  actor_email text,
  action text not null,
  entity text not null,
  entity_id text,
  summary text not null default '',
  created_at timestamptz not null default now()
);
create index audit_events_created_idx on public.audit_events (created_at desc);

create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  rec jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  label text := coalesce(rec ->> 'title', rec ->> 'name', rec ->> 'email', rec ->> 'slug', '');
  extra text := '';
begin
  if tg_table_name = 'profiles' and tg_op = 'UPDATE' then
    extra := ' role ' || (old.role)::text || ' → ' || (new.role)::text;
  elsif tg_op = 'UPDATE' and (to_jsonb(old) ? 'status') and (to_jsonb(old) ->> 'status') is distinct from (rec ->> 'status') then
    extra := ' status ' || coalesce(to_jsonb(old) ->> 'status', '') || ' → ' || coalesce(rec ->> 'status', '');
  end if;
  insert into public.audit_events (actor, actor_email, action, entity, entity_id, summary)
  values (
    auth.uid(),
    (select email from public.profiles where id = auth.uid()),
    lower(tg_op),
    tg_table_name,
    rec ->> 'id',
    left(label || extra, 300)
  );
  return null;
end $$;

create trigger audit_products after insert or update or delete on public.products for each row execute function public.audit_row();
create trigger audit_categories after insert or update or delete on public.categories for each row execute function public.audit_row();
create trigger audit_guides after insert or update or delete on public.guides for each row execute function public.audit_row();
create trigger audit_ads after insert or update or delete on public.ads for each row execute function public.audit_row();
create trigger audit_ad_settings after update on public.ad_settings for each row execute function public.audit_row();
create trigger audit_profiles after update on public.profiles for each row execute function public.audit_row();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.guides enable row level security;
alter table public.guide_revisions enable row level security;
alter table public.ad_settings enable row level security;
alter table public.ads enable row level security;
alter table public.ad_clicks enable row level security;
alter table public.audit_events enable row level security;

-- profiles
create policy "read own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "admins read profiles" on public.profiles for select to authenticated using (public.can_view_admin());
create policy "owners update profiles" on public.profiles for update to authenticated using (public.is_owner()) with check (public.is_owner());

-- products
create policy "public reads live products" on public.products for select to anon, authenticated using (status = 'live');
create policy "admins read products" on public.products for select to authenticated using (public.can_view_admin());
create policy "editors insert products" on public.products for insert to authenticated with check (public.can_edit());
create policy "editors update products" on public.products for update to authenticated using (public.can_edit()) with check (public.can_edit());
create policy "owners delete products" on public.products for delete to authenticated using (public.is_owner());

-- categories
create policy "public reads categories" on public.categories for select to anon, authenticated using (true);
create policy "editors write categories" on public.categories for insert to authenticated with check (public.can_edit());
create policy "editors update categories" on public.categories for update to authenticated using (public.can_edit()) with check (public.can_edit());
create policy "editors delete categories" on public.categories for delete to authenticated using (public.can_edit());

-- guides: published, or scheduled and due
create policy "public reads published guides" on public.guides for select to anon, authenticated
  using (status = 'published' or (status = 'scheduled' and publish_at is not null and publish_at <= now()));
create policy "admins read guides" on public.guides for select to authenticated using (public.can_view_admin());
create policy "editors insert guides" on public.guides for insert to authenticated with check (public.can_edit());
create policy "editors update guides" on public.guides for update to authenticated using (public.can_edit()) with check (public.can_edit());
-- No delete policy: guides are archived, never hard-deleted.

create policy "admins read revisions" on public.guide_revisions for select to authenticated using (public.can_view_admin());

-- ad settings: readable by everyone (the page needs them), changed by owners only
create policy "public reads ad settings" on public.ad_settings for select to anon, authenticated using (true);
create policy "owners update ad settings" on public.ad_settings for update to authenticated using (public.is_owner()) with check (public.is_owner());

-- ads
create policy "public reads running ads" on public.ads for select to anon, authenticated
  using (status = 'live' and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
create policy "admins read ads" on public.ads for select to authenticated using (public.can_view_admin());
create policy "editors insert ads" on public.ads for insert to authenticated with check (public.can_edit());
create policy "editors update ads" on public.ads for update to authenticated using (public.can_edit()) with check (public.can_edit());
create policy "owners delete ads" on public.ads for delete to authenticated using (public.is_owner());

create policy "admins read clicks" on public.ad_clicks for select to authenticated using (public.can_view_admin());

create policy "owners read audit" on public.audit_events for select to authenticated using (public.is_owner());

-- Column privileges: the API can't touch bookkeeping columns directly.
revoke insert, delete on public.profiles from anon, authenticated;
revoke insert, update, delete on public.audit_events from anon, authenticated;
revoke insert, update, delete on public.guide_revisions from anon, authenticated;
revoke insert, update, delete on public.ad_clicks from anon, authenticated;
revoke insert, delete on public.ad_settings from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: public images, written by editors only
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 3145728, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "editors upload media" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.can_edit() and name ~ '^(guides|ads)/[a-z0-9-]+\.(webp|png|jpg)$');
create policy "editors update media" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.can_edit()) with check (bucket_id = 'media' and public.can_edit());
create policy "owners delete media" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_owner());

-- ---------------------------------------------------------------------------
-- Bootstrap: make the first owner (run once from the SQL editor):
--   select public.promote_owner('you@example.com');
-- ---------------------------------------------------------------------------
create or replace function public.promote_owner(p_email text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set role = 'owner' where lower(email) = lower(p_email);
  if not found then
    raise exception 'no registered user with that email';
  end if;
end $$;
revoke all on function public.promote_owner(text) from public, anon, authenticated;
