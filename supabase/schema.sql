-- ===========================================================================
-- Kami3D — 3D World Wildlife Encyclopedia
-- Schema for Supabase (Postgres 15+).
--
-- Run this in the Supabase SQL editor, or with:
--   supabase db execute --file supabase/schema.sql
--
-- Design notes
--  * Identity lives in Clerk, not Supabase, so `user_id` columns are TEXT and hold
--    the Clerk user id ("user_2ab..."). There is deliberately no FK to auth.users.
--  * Consequently RLS denies the anon key on per-user tables: all personal reads
--    and writes go through the server with the service-role key. `animals` is the
--    only table the browser may read directly.
--  * Every animal is renderable in 3D without assets: `model_url` may be NULL and
--    the app falls back to the procedural rig described by `silhouette`.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- animals
-- ---------------------------------------------------------------------------

create table if not exists public.animals (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  name                text not null,
  latin_name          text not null default '',
  category            text not null
                        check (category in ('Mammal','Bird','Reptile','Amphibian','Fish','Insect','Arachnid','Cephalopod')),
  habitat             text not null default '',
  region              text not null
                        check (region in ('Africa','Asia','Europe','North America','South America','Oceania','Antarctica','Oceans')),
  conservation_status text not null default 'Data Deficient'
                        check (conservation_status in ('Extinct','Extinct in the Wild','Critically Endangered','Endangered','Vulnerable','Near Threatened','Least Concern','Data Deficient')),
  diet                text not null default 'Omnivore'
                        check (diet in ('Carnivore','Herbivore','Omnivore','Insectivore','Piscivore','Filter Feeder')),
  description         text not null default '',
  fun_facts           text[] not null default '{}',

  -- 3D + media assets. NULL means "not uploaded yet"; the app degrades gracefully.
  model_url           text,
  image_url           text,
  sound_url           text,

  -- Real-world measurements, used verbatim by the size comparison.
  scale_ratio         numeric(8,3)  not null default 1     check (scale_ratio > 0),
  weight_kg           numeric(12,3) not null default 0     check (weight_kg >= 0),
  length_m            numeric(8,3)  not null default 1     check (length_m > 0),
  height_m            numeric(8,3)  not null default 0     check (height_m >= 0),
  lifespan_years      text not null default 'Unknown',

  is_prehistoric      boolean not null default false,
  premium             boolean not null default false,
  accent              text[]  not null default array['#35f0c0', '#0b3d3a'],
  emoji               text    not null default '🐾',
  silhouette          text    not null default 'quadruped'
                        check (silhouette in ('quadruped','biped','theropod','bird','marine','whale','serpent','insect')),
  popularity          integer not null default 50 check (popularity between 1 and 100),

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- Full-text search across the fields a visitor actually types.
  search_vector tsvector generated always as (
    to_tsvector(
      'english',
      coalesce(name, '') || ' ' || coalesce(latin_name, '') || ' ' ||
      coalesce(habitat, '') || ' ' || coalesce(description, '')
    )
  ) stored
);

comment on table public.animals is 'One row per species; the single source of truth for the encyclopedia.';
comment on column public.animals.silhouette is 'Which procedural rig to build when model_url is NULL.';
comment on column public.animals.premium is 'Gated behind the rewarded-video unlock flow.';

create index if not exists animals_region_idx on public.animals (region);
create index if not exists animals_category_idx on public.animals (category);
create index if not exists animals_status_idx on public.animals (conservation_status);
create index if not exists animals_popularity_idx on public.animals (popularity desc);
create index if not exists animals_premium_idx on public.animals (premium) where premium;
create index if not exists animals_search_idx on public.animals using gin (search_vector);
create index if not exists animals_fun_facts_idx on public.animals using gin (fun_facts);

drop trigger if exists animals_set_updated_at on public.animals;
create trigger animals_set_updated_at
  before update on public.animals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- user_favorites — the heart on every card
-- ---------------------------------------------------------------------------

create table if not exists public.user_favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  animal_id  uuid not null references public.animals (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_favorites_unique_per_user unique (user_id, animal_id)
);

comment on table public.user_favorites is 'Clerk user id -> favourited species. Written server-side with the service role.';

create index if not exists user_favorites_user_idx on public.user_favorites (user_id, created_at desc);
create index if not exists user_favorites_animal_idx on public.user_favorites (animal_id);

-- ---------------------------------------------------------------------------
-- quiz_scores — silhouette / sound rounds
-- ---------------------------------------------------------------------------

create table if not exists public.quiz_scores (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null,
  score           integer not null check (score >= 0),
  total_questions integer not null default 10 check (total_questions between 1 and 50),
  mode            text not null default 'silhouette' check (mode in ('silhouette','sound')),
  badges_unlocked text[] not null default '{}',
  created_at      timestamptz not null default now(),
  constraint quiz_scores_score_within_total check (score <= total_questions)
);

comment on table public.quiz_scores is 'One row per completed round. Badges are recomputed server-side from score/total.';

create index if not exists quiz_scores_user_idx on public.quiz_scores (user_id, created_at desc);
create index if not exists quiz_scores_score_idx on public.quiz_scores (score desc);

-- Per-user best score, used by the profile header.
create or replace view public.quiz_leaderboard
with (security_invoker = true) as
select
  user_id,
  max(score)                        as best_score,
  count(*)                          as rounds_played,
  round(avg(score::numeric), 2)     as average_score,
  max(created_at)                   as last_played_at
from public.quiz_scores
group by user_id;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.animals        enable row level security;
alter table public.user_favorites enable row level security;
alter table public.quiz_scores    enable row level security;

-- The catalogue is public data: anyone may read it, nobody may change it from the
-- browser (writes happen with the service role during seeding or in the CMS).
drop policy if exists "animals are publicly readable" on public.animals;
create policy "animals are publicly readable"
  on public.animals for select
  to anon, authenticated
  using (true);

-- Per-user tables intentionally have NO anon/authenticated policies. RLS therefore
-- denies the anon key outright, and the server acts with the service role, which
-- bypasses RLS. This is the correct model when the identity provider is external:
-- there is no Supabase JWT for `auth.uid()` to trust.

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select on public.animals to anon, authenticated;
revoke all on public.user_favorites from anon, authenticated;
revoke all on public.quiz_scores from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: animal-assets (models, images, call recordings)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'animal-assets',
  'animal-assets',
  true,
  26214400, -- 25 MB: a DRACO-compressed GLB plus its textures
  array[
    'model/gltf-binary', 'model/gltf+json',
    'image/png', 'image/jpeg', 'image/webp', 'image/avif',
    'audio/mpeg', 'audio/ogg', 'audio/wav'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public read of the asset bucket; uploads are done with the service role.
drop policy if exists "animal assets are publicly readable" on storage.objects;
create policy "animal assets are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'animal-assets');
