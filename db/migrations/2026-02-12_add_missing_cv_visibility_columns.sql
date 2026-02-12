-- Add missing CV visibility columns expected by the app
-- Safe to run once in PostgreSQL / Supabase

alter table if exists public.profile_cvs
  add column if not exists include_avatar boolean not null default true,
  add column if not exists include_phone boolean not null default true,
  add column if not exists include_email boolean not null default true,
  add column if not exists include_location boolean not null default true;

-- Backfill nulls defensively in case columns were added manually without defaults
update public.profile_cvs
set
  include_avatar = coalesce(include_avatar, true),
  include_phone = coalesce(include_phone, true),
  include_email = coalesce(include_email, true),
  include_location = coalesce(include_location, true)
where include_avatar is null
   or include_phone is null
   or include_email is null
   or include_location is null;
