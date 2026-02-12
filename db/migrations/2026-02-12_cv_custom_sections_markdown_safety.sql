-- Remove legacy main-content CV columns and enforce safe markdown custom sections
-- Safe to run in Supabase/PostgreSQL

alter table if exists public.profile_cvs
  drop column if exists professional_summary,
  drop column if exists education,
  drop column if exists additional_notes;

alter table if exists public.profile_cvs
  add column if not exists custom_sections jsonb not null default '[]'::jsonb;

update public.profile_cvs
set custom_sections = '[]'::jsonb
where custom_sections is null
   or jsonb_typeof(custom_sections) <> 'array';

update public.profile_cvs
set custom_sections = coalesce(
  (
    select jsonb_agg(
      jsonb_build_object(
        'id', coalesce(nullif(trim(item->>'id'), ''), md5(random()::text || clock_timestamp()::text)),
        'title', left(trim(item->>'title'), 120),
        'content', left(trim(replace(replace(item->>'content', E'\r\n', E'\n'), E'\r', E'\n')), 12000)
      )
    )
    from jsonb_array_elements(custom_sections) item
    where jsonb_typeof(item) = 'object'
      and coalesce(trim(item->>'title'), '') <> ''
      and coalesce(trim(item->>'content'), '') <> ''
  ),
  '[]'::jsonb
);

create or replace function public.cv_markdown_is_safe(markdown_input text)
returns boolean
language sql
immutable
as $$
  select markdown_input is not null
    and length(markdown_input) <= 12000
    and markdown_input !~* '<\s*script'
    and markdown_input !~* 'javascript\s*:';
$$;

create or replace function public.validate_profile_cv_custom_sections(payload jsonb)
returns boolean
language sql
immutable
as $$
  select
    payload is not null
    and jsonb_typeof(payload) = 'array'
    and jsonb_array_length(payload) <= 12
    and not exists (
      select 1
      from jsonb_array_elements(payload) item
      where jsonb_typeof(item) <> 'object'
         or not (item ? 'title')
         or not (item ? 'content')
         or jsonb_typeof(item->'title') <> 'string'
         or jsonb_typeof(item->'content') <> 'string'
         or length(trim(item->>'title')) = 0
         or length(trim(item->>'title')) > 120
         or length(trim(item->>'content')) = 0
         or length(trim(item->>'content')) > 12000
         or not public.cv_markdown_is_safe(item->>'content')
    );
$$;

alter table if exists public.profile_cvs
  drop constraint if exists profile_cvs_custom_sections_valid;

alter table if exists public.profile_cvs
  add constraint profile_cvs_custom_sections_valid
  check (public.validate_profile_cv_custom_sections(custom_sections));
