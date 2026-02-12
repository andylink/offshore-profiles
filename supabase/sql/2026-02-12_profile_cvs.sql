-- Multi-CV support + publishable URLs
-- Routes expected by app:
--   /cv/:username                -> default published CV
--   /cv/:username/:cvSlug        -> specific published CV

create extension if not exists pgcrypto;

-- Optional billing flags on profiles (safe if they already exist)
alter table public.profiles
  add column if not exists subscription_tier text not null default 'free',
  add column if not exists is_paid boolean not null default false;

-- CV records per profile
create table if not exists public.profile_cvs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,

  title text not null,
  slug text not null,

  is_published boolean not null default false,
  is_default_public boolean not null default false,

  include_avatar boolean not null default true,
  include_personal boolean not null default true,
  include_roles boolean not null default true,
  include_seatime boolean not null default true,
  include_rov boolean not null default true,
  include_certificates boolean not null default true,

  selected_role_ids uuid[] not null default '{}',
  selected_seatime_ids uuid[] not null default '{}',
  selected_rov_ids uuid[] not null default '{}',
  selected_cert_ids uuid[] not null default '{}',

  headline text not null default '',
  professional_summary text not null default '',
  key_skills text not null default '',
  linkedin_url text not null default '',
  education text not null default '',
  additional_notes text not null default '',

  custom_sections jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profile_cvs_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint profile_cvs_custom_sections_is_array check (jsonb_typeof(custom_sections) = 'array'),
  constraint profile_cvs_profile_slug_unique unique (profile_id, slug)
);

create index if not exists idx_profile_cvs_profile_id
  on public.profile_cvs(profile_id);

create index if not exists idx_profile_cvs_published
  on public.profile_cvs(profile_id, is_published, is_default_public, updated_at desc);

alter table public.profile_cvs
  add column if not exists include_avatar boolean not null default true;

-- Keep updated_at fresh
create or replace function public.set_profile_cvs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profile_cvs_updated_at on public.profile_cvs;
create trigger trg_profile_cvs_updated_at
before update on public.profile_cvs
for each row
execute function public.set_profile_cvs_updated_at();

-- Enforce single default-public CV per profile
create or replace function public.ensure_single_default_public_cv()
returns trigger
language plpgsql
as $$
begin
  if new.is_default_public then
    update public.profile_cvs
    set is_default_public = false
    where profile_id = new.profile_id
      and id <> new.id
      and is_default_public = true;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profile_cvs_single_default on public.profile_cvs;
create trigger trg_profile_cvs_single_default
before insert or update on public.profile_cvs
for each row
execute function public.ensure_single_default_public_cv();

-- Enforce free plan limit = 1 CV, paid = unlimited
create or replace function public.enforce_cv_plan_limit()
returns trigger
language plpgsql
as $$
declare
  is_paid_user boolean;
  cv_count integer;
begin
  select (coalesce(p.is_paid, false) or lower(coalesce(p.subscription_tier, 'free')) in ('pro','premium','paid'))
    into is_paid_user
  from public.profiles p
  where p.id = new.profile_id;

  if coalesce(is_paid_user, false) then
    return new;
  end if;

  select count(*)
    into cv_count
  from public.profile_cvs c
  where c.profile_id = new.profile_id;

  if cv_count >= 1 then
    raise exception 'Free plan allows only one CV';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profile_cvs_plan_limit on public.profile_cvs;
create trigger trg_profile_cvs_plan_limit
before insert on public.profile_cvs
for each row
execute function public.enforce_cv_plan_limit();

-- Row-level security
alter table public.profile_cvs enable row level security;

drop policy if exists "profile_cvs_select_own" on public.profile_cvs;
create policy "profile_cvs_select_own"
on public.profile_cvs
for select
using (auth.uid() = profile_id);

drop policy if exists "profile_cvs_insert_own" on public.profile_cvs;
create policy "profile_cvs_insert_own"
on public.profile_cvs
for insert
with check (auth.uid() = profile_id);

drop policy if exists "profile_cvs_update_own" on public.profile_cvs;
create policy "profile_cvs_update_own"
on public.profile_cvs
for update
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

drop policy if exists "profile_cvs_delete_own" on public.profile_cvs;
create policy "profile_cvs_delete_own"
on public.profile_cvs
for delete
using (auth.uid() = profile_id);

-- Public read policy for published CVs only.
-- Note: if your project does not expose anon select with RLS, you can serve via RPC/API instead.
drop policy if exists "profile_cvs_public_published_read" on public.profile_cvs;
create policy "profile_cvs_public_published_read"
on public.profile_cvs
for select
using (is_published = true);

-- Public read policies for source data used on /cv/:username pages.
-- These policies only expose records for profiles that have at least one published CV.

drop policy if exists "profiles_public_read_when_published_cv" on public.profiles;
create policy "profiles_public_read_when_published_cv"
on public.profiles
for select
using (
  exists (
    select 1
    from public.profile_cvs c
    where c.profile_id = profiles.id
      and c.is_published = true
  )
);

drop policy if exists "profile_roles_public_read_when_published_cv" on public.profile_roles;
create policy "profile_roles_public_read_when_published_cv"
on public.profile_roles
for select
using (
  exists (
    select 1
    from public.profile_cvs c
    where c.profile_id = profile_roles.profile_id
      and c.is_published = true
  )
);

drop policy if exists "profile_seatime_public_read_when_published_cv" on public.profile_seatime;
create policy "profile_seatime_public_read_when_published_cv"
on public.profile_seatime
for select
using (
  exists (
    select 1
    from public.profile_cvs c
    where c.profile_id = profile_seatime.profile_id
      and c.is_published = true
  )
);

drop policy if exists "profile_rov_public_read_when_published_cv" on public.profile_rov_experience;
create policy "profile_rov_public_read_when_published_cv"
on public.profile_rov_experience
for select
using (
  exists (
    select 1
    from public.profile_cvs c
    where c.profile_id = profile_rov_experience.profile_id
      and c.is_published = true
  )
);

drop policy if exists "profile_certs_public_read_when_published_cv" on public.profile_certs;
create policy "profile_certs_public_read_when_published_cv"
on public.profile_certs
for select
using (
  exists (
    select 1
    from public.profile_cvs c
    where c.profile_id = profile_certs.profile_id
      and c.is_published = true
  )
);
