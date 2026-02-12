-- Remove CV builder fields no longer used in the application
-- Safe to run once in PostgreSQL / Supabase

alter table if exists public.profile_cvs
  drop column if exists include_roles,
  drop column if exists include_seatime,
  drop column if exists include_rov,
  drop column if exists selected_role_ids,
  drop column if exists selected_seatime_ids,
  drop column if exists selected_rov_ids;
