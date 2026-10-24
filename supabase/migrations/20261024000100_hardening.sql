-- Hardening after the security review.

-- 1. Public reads: only guides/categories of live products, and never internal columns.
drop policy "public reads published guides" on public.guides;
create policy "public reads published guides" on public.guides for select to anon, authenticated
  using (
    (status = 'published' or (status = 'scheduled' and publish_at is not null and publish_at <= now()))
    and exists (select 1 from public.products p where p.id = product_id and p.status = 'live')
  );

drop policy "public reads categories" on public.categories;
create policy "public reads categories" on public.categories for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'live'));
create policy "admins read categories" on public.categories for select to authenticated using (public.can_view_admin());

-- anon gets explicit columns only (no updated_by, no internal ad names).
revoke select on public.products, public.guides, public.ads, public.ad_settings from anon;
grant select (id, slug, name, kind, headline, headline_em, headline_style, description, highlights, cta_label, cta_url, site_url, guides_url,
              accent_dark, accent_light, button_dark, button_light, status, sort_order, created_at, updated_at) on public.products to anon;
grant select (id, product_id, category_id, slug, title, standfirst, blocks, start_here, meta_title, meta_description, author_name, status,
              publish_at, published_at, ads_enabled, ad_spots, version, created_at, updated_at) on public.guides to anon;
grant select (id, kind, sponsor_name, eyebrow, headline, body, cta_label, url, image_path, spots, starts_at, ends_at, status) on public.ads to anon;
grant select (id, enabled, house_enabled, network_enabled, spots, max_per_page, excluded_category_ids, adsense_client, adsense_units) on public.ad_settings to anon;

-- 2. Ad clicks: only the site's Worker (which knows a secret) can count clicks,
--    and each visitor counts once per ad per day.
create table public.click_secret (
  id integer primary key default 1 check (id = 1),
  key_hash text not null
);
alter table public.click_secret enable row level security;
revoke all on public.click_secret from anon, authenticated;

create table public.ad_click_visitors (
  ad_id uuid not null references public.ads (id) on delete cascade,
  day date not null default current_date,
  visitor text not null check (char_length(visitor) = 64),
  primary key (ad_id, day, visitor)
);
alter table public.ad_click_visitors enable row level security;
revoke all on public.ad_click_visitors from anon, authenticated;

-- Run once from the SQL editor with the same value as the Worker secret AD_CLICK_SECRET.
create or replace function public.set_click_secret(p_secret text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if char_length(p_secret) < 32 then raise exception 'use at least 32 characters'; end if;
  insert into public.click_secret (id, key_hash) values (1, encode(sha256(convert_to(p_secret, 'UTF8')), 'hex'))
  on conflict (id) do update set key_hash = excluded.key_hash;
end $$;
revoke all on function public.set_click_secret(text) from public, anon, authenticated;

drop function public.record_ad_click(uuid);
create or replace function public.record_ad_click(p_ad uuid, p_visitor text, p_key text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  dest text;
  ok boolean;
begin
  select url into dest from public.ads
   where id = p_ad and status = 'live'
     and (starts_at is null or starts_at <= now())
     and (ends_at is null or ends_at > now());
  if dest is null then
    return null;
  end if;
  select exists (select 1 from public.click_secret where key_hash = encode(sha256(convert_to(coalesce(p_key, ''), 'UTF8')), 'hex')) into ok;
  if ok and p_visitor ~ '^[0-9a-f]{64}$' then
    delete from public.ad_click_visitors where day < current_date - 1;
    insert into public.ad_click_visitors (ad_id, day, visitor) values (p_ad, current_date, p_visitor) on conflict do nothing;
    if found then
      insert into public.ad_clicks (ad_id, day, clicks) values (p_ad, current_date, 1)
      on conflict (ad_id, day) do update set clicks = public.ad_clicks.clicks + 1;
    end if;
  end if;
  return dest; -- the visitor is redirected either way; only verified, first clicks are counted
end $$;
revoke all on function public.record_ad_click(uuid, text, text) from public;
grant execute on function public.record_ad_click(uuid, text, text) to anon, authenticated;

-- 5. Bookkeeping columns are set by the database, never by the client.
create or replace function public.stamp_row()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null then
    new.updated_by := auth.uid();
  end if;
  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;
  else
    new.created_at := now();
  end if;
  return new;
end $$;
create trigger products_stamp before insert or update on public.products for each row execute function public.stamp_row();
create trigger ads_stamp before insert or update on public.ads for each row execute function public.stamp_row();

create or replace function public.stamp_settings()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null then new.updated_by := auth.uid(); end if;
  return new;
end $$;
create trigger ad_settings_stamp before update on public.ad_settings for each row execute function public.stamp_settings();

create or replace function public.guide_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.version := old.version;
  new.created_at := old.created_at;
  new.published_at := old.published_at;
  if auth.uid() is not null then new.updated_by := auth.uid(); end if;
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

create or replace function public.guide_first_publish()
returns trigger language plpgsql as $$
begin
  new.version := 1;
  new.created_at := now();
  new.published_at := case when new.status = 'published' then now() else null end;
  if auth.uid() is not null then new.updated_by := auth.uid(); end if;
  return new;
end $$;

-- 6. Only owners see everyone's email and role (everyone still sees their own).
drop policy "admins read profiles" on public.profiles;
create policy "owners read profiles" on public.profiles for select to authenticated using (public.is_owner());

-- 8. Owners can see whether an account confirmed its email and set up two-step sign-in.
create or replace function public.admin_user_status()
returns table (id uuid, email_confirmed boolean, has_totp boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_owner() then
    raise exception 'owners only';
  end if;
  return query
    select u.id,
           u.email_confirmed_at is not null,
           exists (select 1 from auth.mfa_factors f where f.user_id = u.id and f.factor_type::text = 'totp' and f.status::text = 'verified')
      from auth.users u;
end $$;
revoke all on function public.admin_user_status() from public, anon;
grant execute on function public.admin_user_status() to authenticated;

-- 9. Lock owner rows before counting, so two owners can't demote each other at once.
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  owners integer;
begin
  if new.id <> old.id or new.email <> old.email then
    raise exception 'profile id and email are read-only';
  end if;
  if new.role <> old.role then
    -- API requests always carry a user id; the SQL editor (bootstrap) does not.
    if auth.uid() is not null and not public.is_owner() then
      raise exception 'only owners can change roles';
    end if;
    if old.role = 'owner' and new.role <> 'owner' then
      perform 1 from public.profiles where role = 'owner' for update;
      select count(*) into owners from public.profiles where role = 'owner';
      if owners <= 1 then
        raise exception 'cannot remove the last owner';
      end if;
    end if;
  end if;
  return new;
end $$;

-- 10. Keep the file-name rule on media updates too.
drop policy "editors update media" on storage.objects;
create policy "editors update media" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.can_edit())
  with check (bucket_id = 'media' and public.can_edit() and name ~ '^(guides|ads)/[a-z0-9-]+\.(webp|png|jpg)$');
