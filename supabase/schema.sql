-- ===========================================================================
-- Kami3D — 3D World Wildlife Encyclopedia
-- Schema for Supabase (Postgres 15+).
--
-- Run this in the Supabase SQL editor, or with:
--   supabase db execute --file supabase/schema.sql
--
-- Design notes
--  * Identity comes from Supabase Auth by default (Clerk is supported as an
--    alternative). `user_id` is TEXT so either provider's id fits the same column,
--    and row level security compares it against `auth.uid()::text`.
--  * With Supabase Auth the database enforces ownership itself: the anon role has
--    no access, and a signed-in visitor only ever sees their own rows. No
--    service-role key is needed for favourites or scores to work.
--  * With Clerk as the identity provider, `auth.uid()` is always null (Supabase
--    never sees a token of its own), so the server writes with the service role and
--    filters every query by `user_id`. The policies below still matter: they are
--    what stops the public anon key from touching personal rows at all. See
--    `lib/personal-data.ts` for where that choice is made.
--  * `animals` is the only table the browser reads without signing in.
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
-- A mutable search_path on a function is a privilege-escalation vector (the
-- linter flags it as function_search_path_mutable), so it is pinned. `now()`
-- resolves from pg_catalog, which is always searched.
set search_path = ''
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
  -- Real view count, incremented through increment_animal_view() below. Runtime
  -- data, not seed data: db:seed deliberately never touches it.
  view_count          integer not null default 0 check (view_count >= 0),

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

comment on table public.user_favorites is 'Owner id -> favourited species. Held as TEXT so either Supabase Auth (a uuid) or Clerk (a "user_…" id) fits the same column; RLS compares it against auth.uid()::text.';

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

-- Per-user tables are readable and writable only by their owner. Supabase Auth
-- supplies `auth.uid()`; `user_id` is TEXT so that a deployment using Clerk
-- instead of Supabase Auth can store its own id in the same column (see the note
-- on the column below).

drop policy if exists "favourites are visible to their owner" on public.user_favorites;
create policy "favourites are visible to their owner"
  on public.user_favorites for select
  to authenticated
  using (user_id = ((select auth.uid())::text));

drop policy if exists "favourites are added by their owner" on public.user_favorites;
create policy "favourites are added by their owner"
  on public.user_favorites for insert
  to authenticated
  with check (user_id = ((select auth.uid())::text));

drop policy if exists "favourites are removed by their owner" on public.user_favorites;
create policy "favourites are removed by their owner"
  on public.user_favorites for delete
  to authenticated
  using (user_id = ((select auth.uid())::text));

drop policy if exists "scores are visible to their owner" on public.quiz_scores;
create policy "scores are visible to their owner"
  on public.quiz_scores for select
  to authenticated
  using (user_id = ((select auth.uid())::text));

drop policy if exists "scores are recorded by their owner" on public.quiz_scores;
create policy "scores are recorded by their owner"
  on public.quiz_scores for insert
  to authenticated
  with check (user_id = ((select auth.uid())::text));

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select on public.animals to anon, authenticated;

-- The anon role gets nothing on personal tables: signing in is what grants access,
-- and the policies above then limit it to the visitor's own rows.
revoke all on public.user_favorites from anon;
revoke all on public.quiz_scores from anon;

grant select, insert, delete on public.user_favorites to authenticated;
grant select, insert on public.quiz_scores to authenticated;

-- ---------------------------------------------------------------------------
-- View counter
-- ---------------------------------------------------------------------------

-- The column arrived after the first release, so installs that already have the
-- table pick it up here rather than by recreating it.
alter table public.animals add column if not exists view_count integer not null default 0;

alter table public.animals drop constraint if exists animals_view_count_non_negative;
alter table public.animals
  add constraint animals_view_count_non_negative check (view_count >= 0);

create index if not exists animals_view_count_idx on public.animals (view_count desc);

comment on column public.animals.view_count is
  'Total views of the species page. Incremented by increment_animal_view(); never written by the seed.';

-- The catalogue is public, so an anonymous visitor must be able to count a view —
-- while still not being able to update the table. RLS grants `anon` no UPDATE on
-- `animals`, so this SECURITY DEFINER function is the only door, and it is a
-- deliberately narrow one: give it a slug and it increments one integer in one
-- column of one row. It cannot read anything back, cannot touch another column,
-- cannot create rows, and its search_path is pinned empty so it cannot be tricked
-- into resolving `animals` to somebody else's table.
create or replace function public.increment_animal_view(animal_slug text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_count integer;
begin
  if animal_slug is null or length(animal_slug) = 0 or length(animal_slug) > 120 then
    return 0;
  end if;

  update public.animals
     set view_count = view_count + 1
   where slug = animal_slug
  returning view_count into new_count;

  return coalesce(new_count, 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- Daily view history (feeds the trend charts)
-- ---------------------------------------------------------------------------

create table if not exists public.animal_views_daily (
  animal_id uuid not null references public.animals (id) on delete cascade,
  day       date not null default current_date,
  views     integer not null default 0 check (views >= 0),
  -- One row per species per day: the upsert below lands on this key.
  primary key (animal_id, day)
);

comment on table public.animal_views_daily is
  'One row per species per day. Written only by increment_animal_view(); read by the leaderboard trend charts.';

create index if not exists animal_views_daily_day_idx on public.animal_views_daily (day desc);

alter table public.animal_views_daily enable row level security;

-- Aggregate daily counts, not personal data, so the catalogue's readers may see
-- them. There is deliberately no insert/update policy: the only writer is the
-- function below.
drop policy if exists "daily views are publicly readable" on public.animal_views_daily;
create policy "daily views are publicly readable"
  on public.animal_views_daily for select
  to anon, authenticated
  using (true);

grant select on public.animal_views_daily to anon, authenticated;

-- Both counters move together in one call, so a view can never be counted in the
-- total but lost from the history (or the other way round).
create or replace function public.increment_animal_view(animal_slug text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
  new_count integer;
begin
  if animal_slug is null or length(animal_slug) = 0 or length(animal_slug) > 120 then
    return 0;
  end if;

  update public.animals
     set view_count = view_count + 1
   where slug = animal_slug
  returning id, view_count into target_id, new_count;

  if target_id is null then
    return 0;
  end if;

  insert into public.animal_views_daily (animal_id, day, views)
  values (target_id, current_date, 1)
  on conflict (animal_id, day)
    do update set views = public.animal_views_daily.views + 1;

  return new_count;
end;
$$;

revoke all on function public.increment_animal_view(text) from public;
grant execute on function public.increment_animal_view(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Anonymous quiz statistics
-- ---------------------------------------------------------------------------

-- A public quiz leaderboard would mean publishing other people's rows, and
-- `quiz_scores` is owner-only by policy (and `anon` holds no grant on the table
-- at all). What a visitor *can* be shown is the shape of everybody's play without
-- anybody's identity: how many rounds exist, how good they were, how many people
-- played, and when the last one landed.
--
-- It is the same door as `increment_animal_view()`: SECURITY DEFINER with an empty
-- `search_path`, returning aggregates that cannot be traced back to a `user_id`.
create or replace function public.quiz_stats()
returns jsonb
language sql
security definer
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'rounds',         count(*),
    'players',        count(distinct user_id),
    'bestScore',      coalesce(max(score), 0),
    'totalQuestions', coalesce(max(total_questions), 0),
    'averagePercent', coalesce(round(avg(score::numeric / nullif(total_questions, 0)) * 100), 0),
    'perfect',        count(*) filter (where score = total_questions),
    'lastPlayedAt',   max(created_at),
    'byMode',         coalesce(
                        (
                          select jsonb_object_agg(by_mode.mode, by_mode.rounds)
                            from (
                              select mode, count(*) as rounds
                                from public.quiz_scores
                               group by mode
                            ) as by_mode
                        ),
                        '{}'::jsonb
                      )
  )
  from public.quiz_scores;
$$;

comment on function public.quiz_stats() is
  'Anonymised quiz aggregates for the public leaderboard: counts and averages, never a user_id or a single round.';

revoke all on function public.quiz_stats() from public;
grant execute on function public.quiz_stats() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Per-visitor settings (Phase 11)
-- ---------------------------------------------------------------------------

-- The unified identity helper every ownership policy uses: auth.uid() for
-- Supabase Auth, the JWT 'sub' for Clerk once it is configured as a third-party
-- auth provider. Until then it returns exactly what auth.uid() returned, so
-- applying it changes nothing for the Supabase path and does not loosen anything.
create or replace function public.current_user_id()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select auth.uid())::text,
    nullif((select auth.jwt()) ->> 'sub', '')
  );
$$;

revoke all on function public.current_user_id() from public;
grant execute on function public.current_user_id() to anon, authenticated;

create table if not exists public.user_settings (
  id                 uuid primary key default gen_random_uuid(),
  user_id            text not null unique,
  theme              text not null default 'dark'      check (theme in ('system', 'dark', 'light')),
  -- 'emerald' is the mint the product already ships (--color-neon: #35f0c0), so
  -- the database default and the app default agree and an untouched row is invisible.
  accent_color       text not null default 'emerald'   check (accent_color in ('cyan', 'emerald', 'violet', 'amber', 'rose')),
  glass_intensity    text not null default 'medium'    check (glass_intensity in ('low', 'medium', 'high')),
  reduce_motion      boolean not null default false,
  -- 'auto' leaves the device tier in lib/quality.ts in charge; the rest override it.
  quality_preset     text not null default 'auto'      check (quality_preset in ('auto', 'low', 'medium', 'high', 'ultra')),
  enable_shadows     boolean not null default true,
  enable_reflections boolean not null default true,
  max_dpr            numeric not null default 1.5      check (max_dpr in (1, 1.5, 2)),
  auto_rotate        boolean not null default true,
  master_volume      integer not null default 80       check (master_volume between 0 and 100),
  animal_volume      integer not null default 70       check (animal_volume between 0 and 100),
  ui_sounds          boolean not null default true,
  autoplay_sounds    boolean not null default false,
  language           text not null default 'vi'        check (language in ('vi', 'en')),
  measurement_unit   text not null default 'metric'    check (measurement_unit in ('metric', 'imperial')),
  email_notifications boolean not null default true,
  push_notifications  boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.user_settings is
  'Per-visitor preferences. Every column is read by the app; nothing here is decorative.';

drop trigger if exists user_settings_touch on public.user_settings;
create trigger user_settings_touch
  before update on public.user_settings
  for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;

-- Owner-only, all four verbs. UPDATE carries WITH CHECK as well as USING: without
-- it a visitor could rewrite user_id and hand their row to somebody else.
drop policy if exists "settings are visible to their owner" on public.user_settings;
create policy "settings are visible to their owner"
  on public.user_settings for select
  to authenticated
  using (user_id = public.current_user_id());

drop policy if exists "settings are created by their owner" on public.user_settings;
create policy "settings are created by their owner"
  on public.user_settings for insert
  to authenticated
  with check (user_id = public.current_user_id());

drop policy if exists "settings are updated by their owner" on public.user_settings;
create policy "settings are updated by their owner"
  on public.user_settings for update
  to authenticated
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

drop policy if exists "settings are deleted by their owner" on public.user_settings;
create policy "settings are deleted by their owner"
  on public.user_settings for delete
  to authenticated
  using (user_id = public.current_user_id());

revoke all on public.user_settings from anon;
grant select, insert, update, delete on public.user_settings to authenticated;

-- ---------------------------------------------------------------------------
-- Sound assets (animal calls)
-- ---------------------------------------------------------------------------

-- One call per species: where it came from, under which licence, and where it is
-- stored. The licence column is constrained to the only two values Kami3D ships
-- (see `lib/sound-licenses.ts`); the pipeline refuses everything else, including
-- the share-alike and non-commercial variants that most field recordings use.
--
-- Rows are written by `scripts/fetch-sounds.mjs` with the service role, and are
-- readable by everyone because a credit line is public metadata — which is also why
-- there is no write policy: a browser must not be able to forge a credit.
create table if not exists public.sound_assets (
  id               uuid primary key default gen_random_uuid(),
  animal_id        uuid references public.animals (id) on delete cascade,
  freesound_id     integer,
  title            text,
  license          text not null check (license in ('CC0', 'CC-BY')),
  source_url       text,
  attribution      text,
  file_size_bytes  integer check (file_size_bytes > 0),
  duration_seconds numeric check (duration_seconds > 0),
  storage_path     text,
  public_url       text,
  downloaded_at    timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  provider         text not null default 'wikimedia',
  mime_type        text,
  license_label    text,
  -- One recording per species, which is what animals.sound_url can express.
  constraint sound_assets_one_per_animal unique (animal_id)
);

comment on table public.sound_assets is
  'One animal call per species: where it came from, under which licence, and where it is stored. Written by scripts/fetch-sounds.mjs with the service role.';
comment on column public.sound_assets.license is 'Normalised to the two licences Kami3D ships: CC0 or CC-BY.';
comment on column public.sound_assets.license_label is 'The provider''s own label, kept verbatim so a credit line can quote it.';
comment on column public.sound_assets.attribution is 'Ready-to-render credit: title, author, licence, source.';

create index if not exists sound_assets_animal_idx on public.sound_assets (animal_id);
create index if not exists sound_assets_created_idx on public.sound_assets (created_at desc);

alter table public.sound_assets enable row level security;

drop policy if exists "sound credits are publicly readable" on public.sound_assets;
create policy "sound credits are publicly readable"
  on public.sound_assets for select
  to anon, authenticated
  using (true);

grant select on public.sound_assets to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Model assets (every real 3D model a species has)
-- ---------------------------------------------------------------------------
--
-- One row per downloaded model, written by `scripts/fetch-models.mjs` with the
-- service role. A species may have several: `--count=N` keeps the runners-up, and
-- the partial unique index below allows exactly one of them to be the primary — the
-- one `animals.model_url` points at, because that column can only express one.
--
-- The licence column is constrained to the only two values the pipeline accepts
-- (see `scripts/fetch-models.mjs` and `lib/model-quality.ts`); a model whose licence
-- is share-alike, non-commercial or simply unknown is never stored, which is the
-- project rule that matters more than any other in this file.
create table if not exists public.model_assets (
  id               uuid primary key default gen_random_uuid(),
  animal_id        uuid not null references public.animals (id) on delete cascade,
  provider         text not null default 'sketchfab',
  sketchfab_uid    text,
  title            text not null,
  license          text not null check (license in ('CC0', 'CC-BY')),
  source_url       text,
  attribution      text not null,
  -- Null means "the provider did not report it", which is different from zero and is
  -- what the quality score treats as no signal rather than as a bad model.
  face_count       integer check (face_count is null or face_count >= 0),
  download_count   integer check (download_count is null or download_count >= 0),
  like_count       integer check (like_count is null or like_count >= 0),
  file_size_bytes  bigint check (file_size_bytes is null or file_size_bytes > 0),
  storage_path     text,
  public_url       text,
  quality_score    numeric not null check (quality_score >= 0 and quality_score <= 100),
  is_primary       boolean not null default false,
  downloaded_at    timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  -- Re-running the pipeline updates a model instead of duplicating it. A row with no
  -- source URL cannot be de-duplicated (Postgres treats NULLs as distinct), which is
  -- acceptable because every provider the pipeline talks to supplies one.
  constraint model_assets_unique_source unique (animal_id, source_url)
);

comment on table public.model_assets is
  'Every real 3D model a species has: where it came from, under which licence, its measured quality, and where the file is stored. Written by scripts/fetch-models.mjs with the service role.';
comment on column public.model_assets.quality_score is
  '0-100, higher is better. Computed by lib/model-quality.ts: title match 30, licence 15, popularity 25, polygon budget 20, thumbnail 10.';
comment on column public.model_assets.license is 'Normalised to the two licences Kami3D ships: CC0 or CC-BY.';
comment on column public.model_assets.attribution is 'Ready-to-render credit: title, author, licence, source.';
comment on column public.model_assets.is_primary is 'The model animals.model_url points at. At most one per species, enforced by a partial unique index.';

create index if not exists model_assets_animal_idx on public.model_assets (animal_id);
create index if not exists model_assets_created_idx on public.model_assets (created_at desc);
-- One primary per species. Without this, two rows could both claim to be primary
-- while `animals.model_url` can only ever point at one of them.
create unique index if not exists model_assets_primary_idx on public.model_assets (animal_id) where is_primary;

alter table public.model_assets enable row level security;

-- Readable by everyone: a credit is public metadata. There is deliberately **no** write
-- policy — a browser must not be able to forge a credit or invent a model row.
drop policy if exists "model credits are publicly readable" on public.model_assets;
create policy "model credits are publicly readable"
  on public.model_assets for select
  to anon, authenticated
  using (true);

-- Supabase grants every new table in `public` to anon and authenticated by default, so
-- the read grant is only half the sentence: the platform's privileges are removed and
-- only SELECT is given back. RLS has no write policy here either, and the two together
-- mean a browser cannot even attempt a forged credit. Verified live: anon holds SELECT
-- and nothing else on this table.
revoke all on public.model_assets from anon, authenticated;
grant select on public.model_assets to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Geospatial data (Phase 13): PostGIS + `animal_geodata`
-- ---------------------------------------------------------------------------
--
-- PostGIS is installed into the `extensions` schema, which is the Supabase
-- convention and keeps its thousand-odd functions out of `public` — where every
-- function is reachable as an RPC endpoint unless it is revoked by hand.
--
-- One table carries every spatial layer the product will ever draw, because the
-- alternative is `alter table` at the start of each of the next four phases:
-- `kind` says which layer a row belongs to, `year` says when (null = present day),
-- and `source`/`license`/`attribution` are the licence terms the row arrived with.
--
-- Rows are written by `scripts/seed-geodata.mjs` (and, later, by the admin pipeline)
-- with the service role. Readable by everyone, with no write policy: geospatial data
-- is public reference material, and a browser must not be able to invent a range map.
create extension if not exists postgis with schema extensions;

create table if not exists public.animal_geodata (
  id          uuid primary key default gen_random_uuid(),
  animal_id   uuid not null references public.animals (id) on delete cascade,
  kind        text not null check (kind in ('habitat_current', 'habitat_historic', 'protected_area', 'occurrence')),
  year        integer check (year is null or (year between -10000 and 2100)),
  geometry    extensions.geometry(Geometry, 4326) not null,
  source      text not null,
  source_url  text,
  license     text not null check (license in ('CC0', 'CC-BY')),
  attribution text not null,
  properties  jsonb not null default '{}'::jsonb,
  -- One row per (species, kind, year, source), spelled out as a generated column so
  -- PostgREST can upsert on it. A unique index over `coalesce(year, 'current')` would
  -- work in Postgres and be invisible to `on_conflict=`, which is the whole point of
  -- writing it down here.
  dedupe_key  text generated always as (kind || ':' || coalesce(year::text, 'current') || ':' || source) stored,
  created_at  timestamptz not null default now(),
  constraint animal_geodata_unique_row unique (animal_id, dedupe_key),
  -- Only the four shapes a map layer can draw.
  constraint animal_geodata_geometry_type check (
    extensions.geometrytype(geometry) in ('POINT', 'MULTIPOINT', 'POLYGON', 'MULTIPOLYGON')
  ),
  -- Self-intersecting rings are refused at the door: `ST_Intersects` on an invalid
  -- polygon answers wrongly and says nothing about it.
  constraint animal_geodata_valid_geometry check (extensions.st_isvalid(geometry))
);

comment on table public.animal_geodata is
  'Every spatial layer: habitat ranges (current and historic), protected areas and observation points. Written by scripts/seed-geodata.mjs with the service role; read-only for everyone else.';
comment on column public.animal_geodata.kind is 'Which layer the row belongs to. Constrained, so a typo cannot create a fifth layer nobody draws.';
comment on column public.animal_geodata.year is 'Negative years are BCE, for the prehistoric species. NULL means present day.';
comment on column public.animal_geodata.geometry is 'WGS84 (SRID 4326), the same order MapLibre and GeoJSON use: longitude first.';
comment on column public.animal_geodata.license is 'Normalised to the two licences Kami3D ships: CC0 or CC-BY. GBIF records are CC BY 4.0 and must be cited; IUCN range maps are not redistributable here.';
comment on column public.animal_geodata.attribution is 'Ready-to-render credit: dataset, publisher, licence, and the DOI when there is one.';

-- GiST is what makes `ST_Intersects` and the /map bounding-box query usable; the
-- btree one is what makes "this species, this layer, this year" a lookup.
create index if not exists animal_geodata_geometry_idx on public.animal_geodata using gist (geometry);
create index if not exists animal_geodata_animal_idx on public.animal_geodata (animal_id, kind, year);
create index if not exists animal_geodata_kind_idx on public.animal_geodata (kind);

alter table public.animal_geodata enable row level security;

drop policy if exists "geodata is publicly readable" on public.animal_geodata;
create policy "geodata is publicly readable"
  on public.animal_geodata for select
  to anon, authenticated
  using (true);

-- Supabase grants every new table in `public` to anon and authenticated by default, so
-- the read grant is paired with a revoke (see `model_assets` for the same reasoning).
revoke all on public.animal_geodata from anon, authenticated;
grant select on public.animal_geodata to anon, authenticated;

-- ---------------------------------------------------------------------------
-- The map read path (Phase 14)
-- ---------------------------------------------------------------------------
--
-- The map needs shapes, not rows: a FeatureCollection with simplified geometry and the
-- handful of properties it draws. Doing that in the database rather than in JavaScript
-- means the payload is small before it is ever serialised, and `ST_SimplifyPreserveTopology`
-- (which keeps a polygon valid while removing vertices) is applied where the geometry lives.
--
-- `security definer` because it reads a table under RLS on behalf of a public reader, so the
-- function has to be the one with permission - and it is granted to anon deliberately, like
-- `increment_animal_view`. It only ever returns data that the table's own SELECT policy
-- already makes public.
create or replace function public.map_geodata(
  p_kind text default null,
  p_tolerance double precision default 0.01
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(jsonb_agg(feature order by slug, kind), '[]'::jsonb)
  )
  from (
    select
      a.slug as slug,
      g.kind as kind,
      jsonb_build_object(
        'type', 'Feature',
        'properties', jsonb_build_object(
          'slug', a.slug,
          'name', a.name,
          'region', a.region,
          'category', a.category,
          'conservation_status', a.conservation_status,
          'emoji', a.emoji,
          'kind', g.kind,
          'year', g.year,
          'source', g.source,
          'license', g.license,
          'attribution', g.attribution
        ) || coalesce(g.properties, '{}'::jsonb),
        'geometry', extensions.st_asgeojson(
          case
            when p_tolerance > 0 and extensions.geometrytype(g.geometry) in ('POLYGON', 'MULTIPOLYGON')
              then extensions.st_simplifypreservetopology(g.geometry, p_tolerance)
            else g.geometry
          end
        )::jsonb
      ) as feature
    from public.animal_geodata g
    join public.animals a on a.id = g.animal_id
    where p_kind is null or g.kind = p_kind
  ) rows
$$;

comment on function public.map_geodata(text, double precision) is
  'The map read path: a GeoJSON FeatureCollection with simplified geometry and only the properties the map draws. Public on purpose - it returns exactly what animal_geodata already exposes.';

revoke all on function public.map_geodata(text, double precision) from public;
grant execute on function public.map_geodata(text, double precision) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Threat layers (Phase 15)
-- ---------------------------------------------------------------------------
--
-- Threats do not belong to a species: a city, a deforested frontier or a poaching
-- hotspot exists on its own and *overlaps* several ranges. So they live in their own
-- table and the link is a spatial join (`ST_Intersects`), never an `animal_id` column -
-- which would duplicate a polygon per species and drift the moment a range changes.
--
-- `severity` is 1-5 and is computed by the pipeline from the source's own numbers; the
-- legend renders those five bands. `year` is what makes "before vs now" possible in
-- Phase 16 without a second table.
--
-- Rows are written by `scripts/fetch-threats.mjs` with the service role, and the licence
-- check is the same as everywhere else: CC0 or CC BY, recorded per row, or the row is not
-- written. WDPA (non-commercial) and the IUCN Red List (restricted) are refused for that
-- reason, and the panel says so instead of drawing an inferred layer.
create table if not exists public.threat_layers (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('urban_expansion', 'forest_loss', 'climate_risk', 'poaching')),
  name        text not null,
  severity    integer not null check (severity between 1 and 5),
  year        integer check (year is null or (year between -10000 and 2100)),
  geometry    extensions.geometry(Geometry, 4326) not null,
  source      text not null,
  source_url  text,
  license     text not null check (license in ('CC0', 'CC-BY')),
  attribution text not null,
  properties  jsonb not null default '{}'::jsonb,
  dedupe_key  text generated always as (
    kind || ':' || coalesce(year::text, 'current') || ':' || coalesce(properties ->> 'feature_id', '') || ':' || source
  ) stored,
  created_at  timestamptz not null default now(),
  constraint threat_layers_unique_row unique (dedupe_key),
  constraint threat_layers_geometry_type check (
    extensions.geometrytype(geometry) in ('POINT', 'MULTIPOINT', 'POLYGON', 'MULTIPOLYGON')
  ),
  constraint threat_layers_valid_geometry check (extensions.st_isvalid(geometry))
);

comment on table public.threat_layers is
  'Threats as geometry, joined to species by ST_Intersects. Written by scripts/fetch-threats.mjs with the service role; read-only for everyone else.';
comment on column public.threat_layers.severity is '1-5, computed by the pipeline from the source dataset (see lib/risk.ts: severityForUrbanArea).';
comment on column public.threat_layers.license is 'Only CC0 and CC BY are stored. WDPA is non-commercial and the IUCN Red List is restricted, so neither is imported.';

create index if not exists threat_layers_geometry_idx on public.threat_layers using gist (geometry);
create index if not exists threat_layers_kind_idx on public.threat_layers (kind, severity);

alter table public.threat_layers enable row level security;

drop policy if exists "threat layers are publicly readable" on public.threat_layers;
create policy "threat layers are publicly readable"
  on public.threat_layers for select
  to anon, authenticated
  using (true);

revoke all on public.threat_layers from anon, authenticated;
grant select on public.threat_layers to anon, authenticated;

-- ---------------------------------------------------------------------------
-- The species-by-threat join (Phase 15)
-- ---------------------------------------------------------------------------
--
-- How much of each species' range a threat overlaps, computed where the geometry is:
-- `ST_Intersects` narrows with the GiST index, `ST_Intersection` gives the overlapping
-- area, and `geography` turns degrees into square kilometres so the number means
-- something. Doing this in JavaScript would mean shipping every polygon to the browser.
--
-- `p_kind` filters to one threat kind; the default is every kind. Public on purpose: it
-- returns a share of ranges that are already public, and it is the only read path the map
-- uses for threat impact.
create or replace function public.species_threat_impact(p_kind text default null)
returns table (
  slug text,
  name text,
  conservation_status text,
  habitat_km2 double precision,
  threatened_km2 double precision,
  threatened_fraction double precision,
  worst_severity integer,
  mean_severity double precision,
  threats integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with habitat as (
    select a.id, a.slug, a.name, a.conservation_status, g.geometry
    from public.animal_geodata g
    join public.animals a on a.id = g.animal_id
    where g.kind = 'habitat_current'
  ),
  hit as (
    select
      h.slug,
      t.severity,
      extensions.st_area(extensions.st_intersection(h.geometry, t.geometry)::extensions.geography) as overlap_m2
    from habitat h
    join public.threat_layers t
      on (p_kind is null or t.kind = p_kind)
     and extensions.st_intersects(h.geometry, t.geometry)
  )
  select
    h.slug,
    h.name,
    h.conservation_status,
    extensions.st_area(h.geometry::extensions.geography) / 1e6 as habitat_km2,
    coalesce(sum(x.overlap_m2), 0) / 1e6 as threatened_km2,
    least(1, coalesce(sum(x.overlap_m2), 0) / greatest(extensions.st_area(h.geometry::extensions.geography), 1)) as threatened_fraction,
    coalesce(max(x.severity), 0) as worst_severity,
    coalesce(avg(x.severity), 0) as mean_severity,
    count(x.severity)::int as threats
  from habitat h
  left join hit x on x.slug = h.slug
  group by h.slug, h.name, h.conservation_status, h.geometry
$$;

comment on function public.species_threat_impact(text) is
  'Per species: how many km2 of its current range each threat kind overlaps, and the worst/mean severity. The join is spatial - threats carry no animal_id.';

revoke all on function public.species_threat_impact(text) from public;
grant execute on function public.species_threat_impact(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Threat layer for the map (Phase 15)
-- ---------------------------------------------------------------------------
--
-- Threat polygons are heavy - 1 662 urban areas is around a megabyte of coordinates - and at
-- world zoom a city is a dot. So the map draws each threat as its centroid with its severity,
-- while the *impact* numbers come from the real polygon overlay in
-- `species_threat_impact()`. Two different questions, two different resolutions.
create or replace function public.map_threats(
  p_kind text default 'urban_expansion',
  p_min_severity integer default 1
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(jsonb_agg(feature order by severity desc), '[]'::jsonb)
  )
  from (
    select
      t.severity,
      jsonb_build_object(
        'type', 'Feature',
        -- Only what the map draws. The attribution, licence and note are the same string
        -- for all 1 662 rows; repeating them per feature tripled the payload for nothing,
        -- and the layer panel already prints them once.
        'properties', jsonb_build_object(
          'kind', t.kind,
          'severity', t.severity,
          'area_sqkm', t.properties ->> 'area_sqkm'
        ),
        'geometry', extensions.st_asgeojson(extensions.st_pointonsurface(t.geometry))::jsonb
      ) as feature
    from public.threat_layers t
    where (p_kind is null or t.kind = p_kind)
      and t.severity >= p_min_severity
  ) rows
$$;

comment on function public.map_threats(text, integer) is
  'Threats as centroids with severity, for drawing. The impact numbers come from species_threat_impact(), which uses the real polygons.';

revoke all on function public.map_threats(text, integer) from public;
grant execute on function public.map_threats(text, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: animal-assets (models, images) and animal-sounds (calls)
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

-- The calls live in a bucket of their own: a different budget (900 kB per file,
-- against 25 MB for a model), a different licence story, and a different uploader.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'animal-sounds',
  'animal-sounds',
  true,
  6291456, -- 6 MB: the ceiling the fetch pipeline enforces
  array['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/flac', 'audio/mp4', 'audio/webm']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "animal sounds are publicly readable" on storage.objects;
create policy "animal sounds are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'animal-sounds');
