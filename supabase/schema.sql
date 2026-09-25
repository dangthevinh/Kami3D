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

comment on table public.user_favorites is 'Owner id -> favourited species. Held as TEXT so either Supabase Auth (a uuid) or Clerk (a "user_…" id) fits the same column; RLS compares it against public.current_user_id().';

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

-- Per-user tables are readable and writable only by their owner.
--
-- The owner is `public.current_user_id()`, not `auth.uid()` directly: that helper answers Supabase
-- Auth's `uid` and, once Clerk is registered as a Supabase third-party auth provider, Clerk's JWT
-- `sub` claim as well. Until then it returns exactly what `auth.uid()` returned, so this migration
-- loosens nothing - and it is what makes one set of policies work under either provider, which is
-- the point of P0.1 in docs/REVIEW.md. `user_id` is TEXT so both ids fit the same column.

drop policy if exists "favourites are visible to their owner" on public.user_favorites;
create policy "favourites are visible to their owner"
  on public.user_favorites for select
  to authenticated
  using (user_id = public.current_user_id());

drop policy if exists "favourites are added by their owner" on public.user_favorites;
create policy "favourites are added by their owner"
  on public.user_favorites for insert
  to authenticated
  with check (user_id = public.current_user_id());

drop policy if exists "favourites are removed by their owner" on public.user_favorites;
create policy "favourites are removed by their owner"
  on public.user_favorites for delete
  to authenticated
  using (user_id = public.current_user_id());

drop policy if exists "scores are visible to their owner" on public.quiz_scores;
create policy "scores are visible to their owner"
  on public.quiz_scores for select
  to authenticated
  using (user_id = public.current_user_id());

drop policy if exists "scores are recorded by their owner" on public.quiz_scores;
create policy "scores are recorded by their owner"
  on public.quiz_scores for insert
  to authenticated
  with check (user_id = public.current_user_id());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
-- The catalogue is read-only from the browser, stated twice on purpose: no write policy exists
-- above, and the update grant is revoked here so a future `grant all` cannot quietly reopen it.
-- Writes belong to the seed, and to an admin policy if one is ever added.
grant select on public.animals to anon, authenticated;
revoke update on public.animals from anon, authenticated;

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
  -- `source_version` is part of the key on purpose: re-importing a dataset appends a version
  -- rather than overwriting one, so "before and after" stays answerable (Phase 17, constraint
  -- 4). `scripts/seed-geodata.mjs` sends no version, so it lands on `v1` and stays idempotent.
  source_version text,
  dedupe_key  text generated always as (kind || ':' || coalesce(year::text, 'current') || ':' || source || ':' || coalesce(source_version, 'v1')) stored,
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
-- Timeline annotations and migration routes (Phase 16)
-- ---------------------------------------------------------------------------
--
-- Two things the range polygons cannot express, and neither belongs in
-- `animal_geodata`:
--
--   * `range_events` - a dated event with a source. The constraint that matters here is
--     that an annotation is *our summary of a cited source*, not a digitised range: the
--     timeline shows events where they exist and says "no range data for this year"
--     everywhere else, instead of interpolating a shape nobody published.
--   * `migration_routes` - a path, not an area. Putting a LineString in `animal_geodata`
--     would make every habitat query filter it out by hand.
--
-- Both are publicly readable and have no write policy, like every other dataset here.
create table if not exists public.range_events (
  id          uuid primary key default gen_random_uuid(),
  animal_id   uuid references public.animals (id) on delete cascade,
  -- Wider than `animal_geodata.year`: the catalogue includes species whose events are
  -- geological (Tyrannosaurus rex at -66 million), and an annotation is a citation, not a
  -- measured range.
  year        integer not null check (year between -100000000 and 2100),
  title       text not null,
  summary     text not null,
  kind        text not null default 'event' check (kind in ('event', 'protection', 'decline', 'recovery', 'extinction')),
  location    extensions.geometry(Point, 4326),
  source      text not null,
  source_url  text not null,
  license     text not null default 'CC0' check (license in ('CC0', 'CC-BY')),
  attribution text not null,
  created_at  timestamptz not null default now(),
  constraint range_events_unique unique (year, title)
);

comment on table public.range_events is
  'Dated events with a citation: our own summary text, pointing at the source. Separate from range polygons on purpose - a timeline with no range for a year says so rather than drawing one.';
comment on column public.range_events.summary is 'Written by Kami3D from the cited source, not copied from it.';

create index if not exists range_events_year_idx on public.range_events (year);
create index if not exists range_events_animal_idx on public.range_events (animal_id, year);

alter table public.range_events enable row level security;

drop policy if exists "range events are publicly readable" on public.range_events;
create policy "range events are publicly readable"
  on public.range_events for select
  to anon, authenticated
  using (true);

revoke all on public.range_events from anon, authenticated;
grant select on public.range_events to anon, authenticated;

create table if not exists public.migration_routes (
  id          uuid primary key default gen_random_uuid(),
  animal_id   uuid not null references public.animals (id) on delete cascade,
  season      text not null check (season in ('spring', 'summer', 'autumn', 'winter', 'year-round')),
  geometry    extensions.geometry(LineString, 4326) not null,
  stops       jsonb not null default '[]'::jsonb,
  source      text not null,
  source_url  text,
  license     text not null check (license in ('CC0', 'CC-BY')),
  attribution text not null,
  properties  jsonb not null default '{}'::jsonb,
  dedupe_key  text generated always as (season || ':' || source) stored,
  created_at  timestamptz not null default now(),
  constraint migration_routes_unique unique (animal_id, dedupe_key),
  constraint migration_routes_valid check (extensions.st_isvalid(geometry)),
  constraint migration_routes_points check (extensions.st_npoints(geometry) >= 2)
);

comment on table public.migration_routes is
  'A path a species moves along. Derived from monthly GBIF observation centroids (see scripts/fetch-migrations.mjs), not a tracked or published route - the attribution says so.';
comment on column public.migration_routes.stops is 'The monthly centroids the line passes through: month, label, coordinates and the record count behind each.';

create index if not exists migration_routes_geometry_idx on public.migration_routes using gist (geometry);
create index if not exists migration_routes_animal_idx on public.migration_routes (animal_id, season);

alter table public.migration_routes enable row level security;

drop policy if exists "migration routes are publicly readable" on public.migration_routes;
create policy "migration routes are publicly readable"
  on public.migration_routes for select
  to anon, authenticated
  using (true);

revoke all on public.migration_routes from anon, authenticated;
grant select on public.migration_routes to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admins (Phase 17)
-- ---------------------------------------------------------------------------
--
-- The review that preceded this phase said it plainly: there is no admin concept in this
-- schema, and an /admin page without one is a page that anyone can post to. So the role
-- comes first.
--
-- `is_admin()` reads `app_admins`, which is empty by default: a fresh clone has no admins and
-- every policy below denies. Nothing here trusts a claim from the browser - the function
-- compares the *session* identity, through the same `current_user_id()` every other policy
-- uses, which is `auth.uid()` under Supabase Auth and the JWT subject under Clerk.
create table if not exists public.app_admins (
  user_id    text primary key,
  note       text,
  created_at timestamptz not null default now()
);

comment on table public.app_admins is
  'Who may write geospatial data. Empty by default: no row, no rights. Add one with an INSERT run as the service role.';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.app_admins a
    where a.user_id = public.current_user_id()
  );
$$;

comment on function public.is_admin() is
  'True when the current session belongs to an admin. Deny by default: an empty app_admins means nobody.';

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.app_admins enable row level security;

-- An admin can see who else is an admin; nobody else can read the list. This comes after
-- the function it calls: a policy cannot reference a function that does not exist yet, and
-- `npm run db:schema` runs the whole file as one statement.
drop policy if exists "admins are visible to admins" on public.app_admins;
create policy "admins are visible to admins"
  on public.app_admins for select
  to authenticated
  using (public.is_admin());

revoke all on public.app_admins from anon, authenticated;
grant select on public.app_admins to authenticated;

-- Admins may write the geospatial tables. Every other table keeps its read-only public
-- policy: this is the one place a browser is allowed to change reference data, and it is
-- gated on a row existing in app_admins.
do $$
declare
  target text;
begin
  foreach target in array array['animal_geodata', 'threat_layers', 'range_events', 'migration_routes'] loop
    execute format('drop policy if exists "admins may write %1$s" on public.%1$s', target);
    execute format(
      'create policy "admins may write %1$s" on public.%1$s for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      target
    );
  end loop;
end $$;

grant insert, update, delete on public.animal_geodata, public.threat_layers, public.range_events, public.migration_routes to authenticated;

-- ---------------------------------------------------------------------------
-- Data2Map (Phase D1): the shared registry
-- ---------------------------------------------------------------------------
--
-- Data2Map is a second product surface on the same infrastructure - a set of data maps
-- for business users, not an animal encyclopedia. It keeps its own routes (`/data2map/*`)
-- and its own tables, all prefixed here, because a shared schema is one thing and a shared
-- namespace is another: `map_layers` in `public` would be a name nobody can trace back.
--
-- Three tables, and the split is the point:
--
--   * `data2map_datasets` - where a layer's data comes from, under which licence, and
--     whether it is real or synthetic. Nothing is drawn in this module without a row here,
--     which is the same rule the animal maps follow (`docs/MAP.md` records two datasets
--     refused on licence grounds rather than drawn anyway).
--   * `data2map_layers` - the registry the layer panel renders from, so five product pages
--     do not each hard-code the same switch five times.
--   * `data2map_user_prefs` - the visitor's own switches, owner-only, exactly like
--     `user_settings`.
--
-- Rows in the first two are written with the service role (or by an admin through the
-- geodata import path); there is no write policy for browsers.
create table if not exists public.data2map_datasets (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  product       text not null check (product in ('real_estate', 'trends', 'logistics', 'stories', 'agriculture')),
  kind          text not null,
  source        text not null,
  source_url    text,
  -- Wider than every other table on purpose: OpenStreetMap POIs (ODbL) are the honest
  -- source for amenities, and ODbL is a share-alike *data* licence rather than the
  -- attribution-only pair the rest of the product ships. It is recorded, attributed and
  -- documented in docs/DATA2MAP.md, which is the condition for using it at all.
  license       text not null check (license in ('CC0', 'CC-BY', 'ODbL')),
  license_label text,
  attribution   text not null,
  year          integer check (year is null or (year between -10000 and 2100)),
  geometry_kind text check (geometry_kind is null or geometry_kind in ('point', 'line', 'polygon', 'raster')),
  record_count  integer check (record_count is null or record_count >= 0),
  -- `synthetic` is not a detail: every simulated dataset in this module has to say so, and
  -- the UI renders the note. Same rule as the demo envelopes on the animal map.
  synthetic     boolean not null default false,
  note          text,
  status        text not null default 'planned' check (status in ('planned', 'live', 'retired')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.data2map_datasets is
  'Provenance for every Data2Map layer: source, licence, year, and whether the data is real or simulated. A layer with no row here is not drawn.';
comment on column public.data2map_datasets.license is 'Only CC0 and CC BY. Google Places is excluded by its terms (no caching), WDPA by its non-commercial clause - see docs/DATA2MAP.md.';

drop trigger if exists data2map_datasets_touch on public.data2map_datasets;
create trigger data2map_datasets_touch
  before update on public.data2map_datasets
  for each row execute function public.set_updated_at();

create table if not exists public.data2map_layers (
  id              text primary key,
  label           text not null,
  hint            text not null,
  product         text not null check (product in ('real_estate', 'trends', 'logistics', 'stories', 'agriculture')),
  dataset_slug    text references public.data2map_datasets (slug) on delete set null,
  default_visible boolean not null default false,
  default_opacity numeric not null default 0.5 check (default_opacity >= 0.05 and default_opacity <= 1),
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

comment on table public.data2map_layers is
  'The layer registry the Data2Map panel renders from, so five product pages do not each hard-code the same switch. `id` is the URL token.';

create index if not exists data2map_layers_product_idx on public.data2map_layers (product, sort_order);

create table if not exists public.data2map_user_prefs (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null unique,
  product    text not null default 'real_estate' check (product in ('real_estate', 'trends', 'logistics', 'stories', 'agriculture')),
  visible    jsonb not null default '{}'::jsonb,
  opacity    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.data2map_user_prefs is
  'A visitor''s own Data2Map switches. Owner-only, written with the visitor''s session - never a service role from the browser.';

drop trigger if exists data2map_user_prefs_touch on public.data2map_user_prefs;
create trigger data2map_user_prefs_touch
  before update on public.data2map_user_prefs
  for each row execute function public.set_updated_at();

alter table public.data2map_datasets enable row level security;
alter table public.data2map_layers enable row level security;
alter table public.data2map_user_prefs enable row level security;

drop policy if exists "data2map datasets are publicly readable" on public.data2map_datasets;
create policy "data2map datasets are publicly readable"
  on public.data2map_datasets for select to anon, authenticated using (true);

drop policy if exists "data2map layers are publicly readable" on public.data2map_layers;
create policy "data2map layers are publicly readable"
  on public.data2map_layers for select to anon, authenticated using (true);

drop policy if exists "data2map prefs are visible to their owner" on public.data2map_user_prefs;
create policy "data2map prefs are visible to their owner"
  on public.data2map_user_prefs for select to authenticated using (user_id = public.current_user_id());

drop policy if exists "data2map prefs are created by their owner" on public.data2map_user_prefs;
create policy "data2map prefs are created by their owner"
  on public.data2map_user_prefs for insert to authenticated with check (user_id = public.current_user_id());

drop policy if exists "data2map prefs are updated by their owner" on public.data2map_user_prefs;
create policy "data2map prefs are updated by their owner"
  on public.data2map_user_prefs for update to authenticated
  using (user_id = public.current_user_id()) with check (user_id = public.current_user_id());

drop policy if exists "data2map prefs are deleted by their owner" on public.data2map_user_prefs;
create policy "data2map prefs are deleted by their owner"
  on public.data2map_user_prefs for delete to authenticated using (user_id = public.current_user_id());

revoke all on public.data2map_datasets from anon, authenticated;
revoke all on public.data2map_layers from anon, authenticated;
revoke all on public.data2map_user_prefs from anon;
grant select on public.data2map_datasets to anon, authenticated;
grant select on public.data2map_layers to anon, authenticated;
grant select, insert, update, delete on public.data2map_user_prefs to authenticated;

-- ---------------------------------------------------------------------------
-- Phase D7 — the 3D twin's realtime pipeline
-- ---------------------------------------------------------------------------
-- Two tables and two functions, and their shape is the point: a simulator writes,
-- everybody reads, and nothing here can be used to follow a person. Positions in a
-- real fleet are personal data, so this table only ever accepts rows that say they
-- are simulated - the CHECK constraints make a real feed fail loudly rather than
-- quietly accumulate somebody's movements. See docs/TWIN.md.

create table if not exists public.vehicle_positions (
  id         bigserial primary key,
  vehicle_id text not null check (char_length(vehicle_id) between 1 and 64),
  at         timestamptz not null default now(),
  lng        double precision not null check (lng between -180 and 180),
  lat        double precision not null check (lat between -90 and 90),
  speed_kmh  numeric(6, 2) check (speed_kmh is null or (speed_kmh >= 0 and speed_kmh <= 200)),
  heading    numeric(5, 1) check (heading is null or (heading >= 0 and heading < 360)),
  -- The two columns that keep this honest. A real telemetry feed cannot be written
  -- here by accident: the source must be this string and synthetic must be true.
  source     text not null default 'Kami3D synthetic' check (source = 'Kami3D synthetic'),
  synthetic  boolean not null default true check (synthetic),
  created_at timestamptz not null default now()
);

comment on table public.vehicle_positions is
  'One row per simulated fleet position. Personal data by nature in a real system, which is exactly why this table refuses anything but generated rows.';

create index if not exists vehicle_positions_vehicle_at_idx on public.vehicle_positions (vehicle_id, at desc);
create index if not exists vehicle_positions_at_idx on public.vehicle_positions (at desc);

alter table public.vehicle_positions enable row level security;

drop policy if exists "vehicle positions are publicly readable" on public.vehicle_positions;
create policy "vehicle positions are publicly readable"
  on public.vehicle_positions for select
  to anon, authenticated
  using (true);

-- There is deliberately no insert policy: the only writer is the simulator with the
-- service role, and the anonymous key can read the stream but never add to it.
revoke all on public.vehicle_positions from anon, authenticated;
grant select on public.vehicle_positions to anon, authenticated;

create table if not exists public.logistics_kpi_hourly (
  hour          timestamptz not null,
  vehicle_id    text not null,
  samples       integer not null default 0 check (samples >= 0),
  distance_km   numeric(10, 3) not null default 0 check (distance_km >= 0),
  avg_speed_kmh numeric(6, 2),
  max_speed_kmh numeric(6, 2),
  first_at      timestamptz,
  last_at       timestamptz,
  updated_at    timestamptz not null default now(),
  primary key (hour, vehicle_id)
);

comment on table public.logistics_kpi_hourly is
  'Hourly rollup of the same numbers the page computes client-side: samples, distance from consecutive positions, average and maximum speed. Written only by rollup_vehicle_kpi_hours().';

create index if not exists logistics_kpi_hourly_hour_idx on public.logistics_kpi_hourly (hour desc);

alter table public.logistics_kpi_hourly enable row level security;

drop policy if exists "logistics kpi is publicly readable" on public.logistics_kpi_hourly;
create policy "logistics kpi is publicly readable"
  on public.logistics_kpi_hourly for select
  to anon, authenticated
  using (true);

revoke all on public.logistics_kpi_hourly from anon, authenticated;
grant select on public.logistics_kpi_hourly to anon, authenticated;

-- Retention. A demo that keeps every position for ever is a demo that quietly
-- builds a movement history, so pruning is a function with a floor on its argument
-- rather than a cron line somebody edits at 2am.
create or replace function public.prune_vehicle_positions(keep_hours integer default 168)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  if keep_hours is null or keep_hours <= 0 then
    raise exception 'keep_hours must be positive';
  end if;

  delete from public.vehicle_positions where at < now() - make_interval(hours => keep_hours);
  get diagnostics removed = row_count;
  return removed;
end;
$$;

comment on function public.prune_vehicle_positions(integer) is
  'Deletes positions older than keep_hours (default 168 = seven days) and returns how many went. service_role only.';

-- The distance formula, in SQL, as the *same* formula the page uses.
--
-- PostGIS is installed here (in the extensions schema) and st_distance would answer
-- with a spheroid, which is a slightly different number from the haversine in
-- lib/geo.ts. Two numbers for one journey is how a dashboard loses its reader, so the
-- rollup uses this function and the panel uses the TypeScript one: same constant, same
-- rounding, same answer.
create or replace function public.haversine_km(
  lng1 double precision,
  lat1 double precision,
  lng2 double precision,
  lat2 double precision
)
returns double precision
language sql
immutable
parallel safe
as $$
  select 2 * 6371.0088 * asin(
    least(1, sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
    ))
  );
$$;

comment on function public.haversine_km(double precision, double precision, double precision, double precision) is
  'Great-circle kilometres between two points - the same formula lib/geo.ts computes, so SQL and the page agree.';

-- The rollup: the same arithmetic the cockpit does, over a longer window and in SQL.
create or replace function public.rollup_vehicle_kpi_hours(since_hours integer default 24)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  written integer;
begin
  if since_hours is null or since_hours <= 0 then
    raise exception 'since_hours must be positive';
  end if;

  with ordered as (
    select
      vehicle_id,
      at,
      lng,
      lat,
      speed_kmh,
      date_trunc('hour', at) as hour,
      lag(at) over (partition by vehicle_id order by at) as prev_at,
      lag(lng) over (partition by vehicle_id order by at) as prev_lng,
      lag(lat) over (partition by vehicle_id order by at) as prev_lat
    from public.vehicle_positions
    where at >= now() - make_interval(hours => since_hours)
  ),
  legs as (
    select
      vehicle_id,
      hour,
      at,
      speed_kmh,
      case
        when prev_at is null then 0
        else public.haversine_km(prev_lng, prev_lat, lng, lat)
      end as leg_km
    from ordered
  ),
  aggregated as (
    select
      vehicle_id,
      hour,
      count(*)::integer as samples,
      sum(leg_km) as distance_km,
      avg(speed_kmh) as avg_speed_kmh,
      max(speed_kmh) as max_speed_kmh,
      min(at) as first_at,
      max(at) as last_at
    from legs
    group by vehicle_id, hour
  )
  insert into public.logistics_kpi_hourly (
    hour, vehicle_id, samples, distance_km, avg_speed_kmh, max_speed_kmh, first_at, last_at, updated_at
  )
  select
    hour, vehicle_id, samples,
    round(distance_km::numeric, 3),
    round(avg_speed_kmh::numeric, 2),
    round(max_speed_kmh::numeric, 2),
    first_at, last_at, now()
  from aggregated
  on conflict (hour, vehicle_id) do update set
    samples = excluded.samples,
    distance_km = excluded.distance_km,
    avg_speed_kmh = excluded.avg_speed_kmh,
    max_speed_kmh = excluded.max_speed_kmh,
    first_at = excluded.first_at,
    last_at = excluded.last_at,
    updated_at = excluded.updated_at;

  get diagnostics written = row_count;
  return written;
end;
$$;

comment on function public.rollup_vehicle_kpi_hours(integer) is
  'Upserts one row per vehicle per hour from the raw positions. service_role only.';

-- Only the service role may write, prune or roll up. The anonymous key reads.
revoke all on function public.prune_vehicle_positions(integer) from public, anon, authenticated;
revoke all on function public.rollup_vehicle_kpi_hours(integer) from public, anon, authenticated;
grant execute on function public.prune_vehicle_positions(integer) to service_role;
grant execute on function public.rollup_vehicle_kpi_hours(integer) to service_role;

-- The stream the page subscribes to.
do $$
begin
  alter publication supabase_realtime add table public.vehicle_positions;
exception
  when duplicate_object then null;
  when undefined_object then raise notice 'supabase_realtime publication is not present; the page falls back to polling';
end;
$$;

-- Housekeeping, when the project has pg_cron (Supabase does; a plain Postgres may not).
do $$
begin
  perform cron.schedule('kami3d-position-retention', '17 * * * *', 'select public.prune_vehicle_positions(168)');
  perform cron.schedule('kami3d-kpi-rollup', '*/15 * * * *', 'select public.rollup_vehicle_kpi_hours(24)');
exception
  when undefined_object then raise notice 'pg_cron is not installed; run npm run fleet:simulate -- --prune instead';
  when invalid_schema_name then raise notice 'pg_cron is not installed; run npm run fleet:simulate -- --prune instead';
  when insufficient_privilege then raise notice 'no privilege to schedule cron jobs; run the retention sweep manually';
end;
$$;

-- ---------------------------------------------------------------------------
-- Phase 18A — traffic by channel, counted first-party and only in aggregate
-- ---------------------------------------------------------------------------
-- Three tables, and their shape is the privacy policy: a day, a channel (or a route, or whether a
-- search matched), and a count. There is no visitor id, no IP, no user agent, no session id and no
-- query string - `scripts/check-channel.mjs` reads this file and fails if such a column ever appears.
-- Bots are a channel of their own rather than being mixed into "visitors", and everything the admin
-- page prints excludes them.
--
-- Rows are written by `bump_traffic()`, which only the service role may execute, and read by admins
-- through `public.is_admin()`. See docs/ANALYTICS.md.

create table if not exists public.traffic_daily (
  day     date not null default current_date,
  channel text not null check (channel in ('direct', 'internal', 'search', 'social', 'referral', 'campaign', 'bot')),
  hits    integer not null default 0 check (hits >= 0),
  primary key (day, channel)
);

comment on table public.traffic_daily is
  'Page views per day per acquisition channel. Aggregate only: no visitor identifier exists anywhere in this schema.';

create table if not exists public.page_daily (
  day    date not null default current_date,
  route  text not null check (char_length(route) between 1 and 120),
  hits   integer not null default 0 check (hits >= 0),
  primary key (day, route)
);

comment on table public.page_daily is
  'Page views per day per normalised route (/animal/[slug], not /animal/lion?utm=...). Query strings are never stored.';

create table if not exists public.search_daily (
  day     date not null default current_date,
  outcome text not null check (outcome in ('matched', 'no_match')),
  -- Empty string rather than NULL: this column is part of the key, and the term itself is never
  -- stored - only which catalogue entry it matched.
  slug    text not null default '',
  hits    integer not null default 0 check (hits >= 0),
  primary key (day, outcome, slug)
);

comment on table public.search_daily is
  'Search usage, as "did it match a species" rather than "what did they type": a search box can hold a name.';

create index if not exists traffic_daily_day_idx on public.traffic_daily (day desc);
create index if not exists page_daily_day_idx on public.page_daily (day desc);

alter table public.traffic_daily enable row level security;
alter table public.page_daily enable row level security;
alter table public.search_daily enable row level security;

-- Admins read; nobody else does. There is no write policy at all: the only writer is the function.
drop policy if exists "traffic is visible to admins" on public.traffic_daily;
create policy "traffic is visible to admins"
  on public.traffic_daily for select to authenticated using (public.is_admin());

drop policy if exists "pages are visible to admins" on public.page_daily;
create policy "pages are visible to admins"
  on public.page_daily for select to authenticated using (public.is_admin());

drop policy if exists "searches are visible to admins" on public.search_daily;
create policy "searches are visible to admins"
  on public.search_daily for select to authenticated using (public.is_admin());

revoke all on public.traffic_daily from anon, authenticated;
revoke all on public.page_daily from anon, authenticated;
revoke all on public.search_daily from anon, authenticated;
grant select on public.traffic_daily to authenticated;
grant select on public.page_daily to authenticated;
grant select on public.search_daily to authenticated;

-- One round trip, one transaction, four counters. The middleware calls this and does not wait for it.
create or replace function public.bump_traffic(
  p_day date,
  p_channel text,
  p_route text,
  p_search_outcome text default null,
  p_search_slug text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_day is null then
    raise exception 'p_day is required';
  end if;

  insert into public.traffic_daily (day, channel, hits)
  values (p_day, p_channel, 1)
  on conflict (day, channel) do update set hits = public.traffic_daily.hits + 1;

  insert into public.page_daily (day, route, hits)
  values (p_day, left(coalesce(p_route, '/'), 120), 1)
  on conflict (day, route) do update set hits = public.page_daily.hits + 1;

  if p_search_outcome is not null then
    insert into public.search_daily (day, outcome, slug, hits)
    values (p_day, p_search_outcome, left(coalesce(p_search_slug, ''), 120), 1)
    on conflict (day, outcome, slug) do update set hits = public.search_daily.hits + 1;
  end if;
end;
$$;

comment on function public.bump_traffic(date, text, text, text, text) is
  'Increments the three daily counters in one transaction. service_role only: the middleware calls it through PostgREST.';

revoke all on function public.bump_traffic(date, text, text, text, text) from public, anon, authenticated;
grant execute on function public.bump_traffic(date, text, text, text, text) to service_role;

-- Retention, with a floor, exactly like the position sweep in D7.
create or replace function public.prune_traffic(retain_days integer default 400)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  if retain_days is null or retain_days <= 0 then
    raise exception 'retain_days must be positive';
  end if;

  delete from public.traffic_daily where day < current_date - retain_days;
  get diagnostics removed = row_count;
  delete from public.page_daily where day < current_date - retain_days;
  delete from public.search_daily where day < current_date - retain_days;

  return removed;
end;
$$;

comment on function public.prune_traffic(integer) is
  'Deletes counters older than retain_days (default 400) and returns how many traffic rows went. service_role only.';

revoke all on function public.prune_traffic(integer) from public, anon, authenticated;
grant execute on function public.prune_traffic(integer) to service_role;

do $$
begin
  perform cron.schedule('kami3d-traffic-retention', '23 4 * * *', 'select public.prune_traffic(400)');
exception
  when undefined_object then raise notice 'pg_cron is not installed; run npm run traffic:prune instead';
  when invalid_schema_name then raise notice 'pg_cron is not installed; run npm run traffic:prune instead';
  when insufficient_privilege then raise notice 'no privilege to schedule cron jobs; prune manually';
end;
$$;

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

/* ==========================================================================
   Phase 18B - Model sourcing: the download budget, the log, and the single
   decision function.
   ==========================================================================

   The console at /admin/models lets an admin order models to be fetched from a
   provider registry. What may be fetched is a *budget*, and a budget that the CLI
   could ignore would not be one, so the decision lives here rather than in the UI:

     reserve_model_download()  checks the policy against the log and writes the
                               attempt in the same transaction. Everything that
                               downloads anything calls it - the worker, the admin
                               route, the CLI - and it is the only function that
                               counts a slot.
     settle_model_download()   closes the attempt: 'downloaded' keeps the slot,
                               'failed' gives it back. A failed download must not
                               consume budget, and it must not silently vanish.

   Two properties make this hard to bypass rather than merely discouraged:

     1. the reservation takes an advisory lock, so two workers racing for the last
        slot of the day cannot both win;
     2. every attempt - including every refusal - is a row in model_download_log
        with its reason, so "why did nothing download today" is a query, not a
        guess.

   Refusals are not errors: the function returns a decision object and the caller
   decides what to tell the operator.
   ========================================================================== */

create table if not exists public.model_download_policy (
  id                  text primary key default 'default',
  enabled             boolean not null default true,
  max_per_day         integer not null default 5,
  max_per_month       integer not null default 40,
  max_total           integer not null default 400,
  max_bytes_total     bigint  not null default 1073741824,
  max_bytes_per_model bigint  not null default 12582912,
  providers_allowed   text[]  not null default array['polyhaven','nasa','khronos','sketchfab','smithsonian','polypizza','direct'],
  require_approval    boolean not null default true,
  updated_by          text,
  updated_at          timestamptz not null default now(),
  constraint model_download_policy_singleton check (id = 'default'),
  constraint model_download_policy_counts check (
    max_per_day >= 0 and max_per_month >= 0 and max_total >= 0
  ),
  constraint model_download_policy_bytes check (
    max_bytes_total > 0 and max_bytes_per_model > 0
  )
);

comment on table public.model_download_policy is
  'One row (id = default). The download budget an admin sets in /admin/models; enforced by public.reserve_model_download(), not by the UI.';

insert into public.model_download_policy (id) values ('default') on conflict (id) do nothing;

create table if not exists public.model_download_log (
  id           uuid primary key default gen_random_uuid(),
  at           timestamptz not null default now(),
  actor        text,
  provider     text not null,
  provider_id  text,
  title        text,
  license      text,
  bytes        bigint,
  animal_slug  text,
  storage_path text,
  outcome      text not null check (outcome in ('downloaded','refused','failed')),
  reason       text,
  order_id     uuid
);

comment on table public.model_download_log is
  'One row per download attempt, including refusals, with the reason. Counted by reserve_model_download() to enforce the policy in model_download_policy.';

create index if not exists model_download_log_at_idx on public.model_download_log (at desc);
create index if not exists model_download_log_provider_idx on public.model_download_log (provider, at desc);
create index if not exists model_download_log_outcome_idx on public.model_download_log (outcome, at desc);

create table if not exists public.model_source_orders (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  created_by   text not null,
  status       text not null default 'queued'
                 check (status in ('queued','running','done','cancelled','failed')),
  providers    text[] not null default '{}',
  slugs        text[] not null default '{}',
  requested    integer not null default 1 check (requested between 1 and 200),
  note         text,
  started_at   timestamptz,
  finished_at  timestamptz,
  downloaded   integer not null default 0,
  refused      integer not null default 0,
  failed       integer not null default 0,
  last_error   text,
  constraint model_source_orders_slugs_are_slugs check (
    array_length(slugs, 1) is null or array_to_string(slugs, ',') ~ '^[a-z0-9,-]+$'
  )
);

comment on table public.model_source_orders is
  'An admin order: "fetch up to N models for these species (or for every species missing one)". The worker claims the oldest queued row, and every model it fetches still has to pass reserve_model_download().';

create index if not exists model_source_orders_status_idx on public.model_source_orders (status, created_at);

/**
 * The download budget, as counts. Used by the console and by the reserve function.
 *
 * "Used" counts rows whose outcome is 'downloaded': a refusal never spends budget,
 * and a failed attempt is settled back to 'failed' so it does not either.
 */
create or replace function public.model_download_usage()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'today',      coalesce(count(*) filter (where outcome = 'downloaded' and at >= date_trunc('day', now())), 0),
    'thisMonth',  coalesce(count(*) filter (where outcome = 'downloaded' and at >= date_trunc('month', now())), 0),
    'total',      coalesce(count(*) filter (where outcome = 'downloaded'), 0),
    'bytesTotal', coalesce(sum(bytes) filter (where outcome = 'downloaded'), 0),
    'refused',    coalesce(count(*) filter (where outcome = 'refused'), 0),
    'failed',     coalesce(count(*) filter (where outcome = 'failed'), 0),
    'policy',     coalesce((select to_jsonb(p) from public.model_download_policy p where p.id = 'default'), '{}'::jsonb)
  )
  from public.model_download_log;
$$;

/**
 * Ask to spend one download. Returns a decision and records the attempt.
 *
 * Everything that downloads passes through here. The licence check is repeated in
 * SQL on purpose: the CLI, the worker and the console each filter earlier, and this
 * is the one place where "CC0 or CC BY only" is a property of the database rather
 * than of a good intention.
 */
create or replace function public.reserve_model_download(
  p_provider      text,
  p_provider_id   text default null,
  p_title         text default null,
  p_license       text default null,
  p_bytes         bigint default null,
  p_animal_slug   text default null,
  p_actor         text default null,
  p_order_id      uuid default null,
  p_approved      boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pol          public.model_download_policy;
  used_today   integer;
  used_month   integer;
  used_total   integer;
  used_bytes   bigint;
  decision     text := 'allowed';
  why          text := null;
  attempt_id   uuid;
begin
  -- One reservation at a time, across every process. Without this, two workers can
  -- both read "3 of 5 used" and both spend the fourth and fifth slot.
  perform pg_advisory_xact_lock(hashtext('kami3d:model_download'));

  select * into pol from public.model_download_policy where id = 'default';

  if not found then
    decision := 'refused';
    why := 'no policy row: apply the schema (npm run db:schema)';
  else
    select
      count(*) filter (where outcome = 'downloaded' and at >= date_trunc('day', now())),
      count(*) filter (where outcome = 'downloaded' and at >= date_trunc('month', now())),
      count(*) filter (where outcome = 'downloaded'),
      coalesce(sum(bytes) filter (where outcome = 'downloaded'), 0)
    into used_today, used_month, used_total, used_bytes
    from public.model_download_log;

    if not pol.enabled then
      decision := 'refused'; why := 'downloading is switched off in the policy';
    elsif pol.require_approval and not p_approved then
      decision := 'refused'; why := 'the policy requires an admin approval for each model';
    elsif p_provider is null or not (p_provider = any (pol.providers_allowed)) then
      decision := 'refused';
      why := format('provider %s is not in providers_allowed', coalesce(p_provider, '(none)'));
    elsif p_license is null or p_license not in ('CC0', 'CC-BY') then
      decision := 'refused';
      why := format('licence %s is not on the allow-list (CC0 or CC-BY)', coalesce(p_license, '(none)'));
    elsif p_bytes is null or p_bytes <= 0 then
      decision := 'refused'; why := 'the model reports no usable size';
    elsif p_bytes > pol.max_bytes_per_model then
      decision := 'refused';
      why := format('model is %s MB, over the %s MB per-model cap',
                    round(p_bytes / 1048576.0, 1), round(pol.max_bytes_per_model / 1048576.0, 1));
    elsif used_today >= pol.max_per_day then
      decision := 'refused';
      why := format('daily budget spent (%s of %s)', used_today, pol.max_per_day);
    elsif used_month >= pol.max_per_month then
      decision := 'refused';
      why := format('monthly budget spent (%s of %s)', used_month, pol.max_per_month);
    elsif used_total >= pol.max_total then
      decision := 'refused';
      why := format('total budget spent (%s of %s)', used_total, pol.max_total);
    elsif used_bytes + p_bytes > pol.max_bytes_total then
      decision := 'refused';
      why := format('storage budget spent (%s of %s MB)',
                    round(used_bytes / 1048576.0), round(pol.max_bytes_total / 1048576.0));
    end if;
  end if;

  insert into public.model_download_log (
    actor, provider, provider_id, title, license, bytes, animal_slug, outcome, reason, order_id
  ) values (
    p_actor,
    coalesce(p_provider, 'unknown'),
    p_provider_id,
    p_title,
    p_license,
    p_bytes,
    p_animal_slug,
    case when decision = 'allowed' then 'downloaded' else 'refused' end,
    why,
    p_order_id
  )
  returning id into attempt_id;

  return jsonb_build_object(
    'id', attempt_id,
    'allowed', decision = 'allowed',
    'reason', why,
    'usage', jsonb_build_object(
      'today', used_today, 'thisMonth', used_month, 'total', used_total, 'bytesTotal', used_bytes
    ),
    'policy', to_jsonb(pol)
  );
end;
$$;

/**
 * Close an attempt.
 *
 * 'downloaded' keeps the slot it reserved; 'failed' hands it back. Called with the
 * id the reserve function returned, so an attempt cannot be closed twice into two
 * different outcomes by accident - the second call is a no-op.
 */
create or replace function public.settle_model_download(
  p_id           uuid,
  p_outcome      text,
  p_bytes        bigint default null,
  p_storage_path text default null,
  p_reason       text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  settled public.model_download_log;
begin
  if p_outcome not in ('downloaded', 'failed') then
    return jsonb_build_object('ok', false, 'reason', 'outcome must be downloaded or failed');
  end if;

  update public.model_download_log
     set outcome      = p_outcome,
         bytes        = coalesce(p_bytes, bytes),
         storage_path = coalesce(p_storage_path, storage_path),
         reason       = coalesce(p_reason, reason)
   where id = p_id
     and outcome = 'downloaded'
     and reason is null            -- a reservation, not a refusal
  returning * into settled;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no open reservation with that id');
  end if;

  return jsonb_build_object('ok', true, 'id', settled.id, 'outcome', settled.outcome);
end;
$$;

/** Retention for the log: the attempts are kept so the budget can be audited, but not forever. */
create or replace function public.prune_model_download_log(retain_days integer default 730)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  if retain_days is null or retain_days <= 0 then
    raise exception 'retain_days must be positive';
  end if;

  delete from public.model_download_log where at < now() - make_interval(days => retain_days);
  get diagnostics removed = row_count;
  return removed;
end;
$$;

alter table public.model_download_policy enable row level security;
alter table public.model_download_log    enable row level security;
alter table public.model_source_orders   enable row level security;

-- Admins read; nobody writes through the API at all. The worker and the admin
-- routes write with the service role, after checking is_admin() themselves.
drop policy if exists "model_download_policy_admin_read" on public.model_download_policy;
create policy "model_download_policy_admin_read" on public.model_download_policy
  for select to authenticated using (public.is_admin());

drop policy if exists "model_download_log_admin_read" on public.model_download_log;
create policy "model_download_log_admin_read" on public.model_download_log
  for select to authenticated using (public.is_admin());

drop policy if exists "model_source_orders_admin_read" on public.model_source_orders;
create policy "model_source_orders_admin_read" on public.model_source_orders
  for select to authenticated using (public.is_admin());

revoke all on public.model_download_policy from anon, authenticated;
revoke all on public.model_download_log from anon, authenticated;
revoke all on public.model_source_orders from anon, authenticated;
grant select on public.model_download_policy to authenticated;
grant select on public.model_download_log to authenticated;
grant select on public.model_source_orders to authenticated;

revoke all on function public.model_download_usage() from anon;
revoke all on function public.reserve_model_download(text, text, text, text, bigint, text, text, uuid, boolean) from anon, authenticated;
revoke all on function public.settle_model_download(uuid, text, bigint, text, text) from anon, authenticated;
revoke all on function public.prune_model_download_log(integer) from anon, authenticated;

/* ==========================================================================
   Admin by default - the owner's address, and checking by email
   ==========================================================================

   Until now an admin was a row in app_admins keyed by *user id*, and a fresh
   deployment had none: the console was locked until somebody ran an INSERT with an
   id they had to look up first. That id also differs per provider - a Clerk id looks
   like \"user_…\" and a Supabase id is a uuid - so a default written as an id would be
   wrong for whichever provider the deployment happens to use.

   So the row can now be keyed by **email** as well, and one default row ships with
   the schema: the project owner. It is not a backdoor - the console still requires a
   signed-in account, every admin action is logged with the actor, and the row can be
   edited or deleted for another deployment - it just means the console cannot be
   locked out by a forgotten INSERT.

   The email is read from the request's own JWT claims, which both providers set, and
   it is only ever compared against a row an operator wrote.
   ========================================================================== */

alter table public.app_admins add column if not exists email text;

comment on column public.app_admins.email is
  'Optional. When set, the account with this address is an admin too, whatever provider issued its id. Combined with user_id by is_admin().';

create unique index if not exists app_admins_email_idx
  on public.app_admins (lower(email))
  where email is not null;

/**
 * The email on the current request, from the JWT claims both providers set.
 *
 * Returns null rather than raising when the claim is absent or is not JSON: a missing claim is not an
 * error, it is simply "this request does not say", and is_admin() then falls back to the id.
 */
create or replace function public.current_user_email()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  claims text;
begin
  claims := nullif(current_setting('request.jwt.claims', true), '');
  if claims is not null then
    begin
      return lower(nullif(claims::jsonb ->> 'email', ''));
    exception when others then
      -- Not JSON: an older PostgREST, or a setting a test set by hand. Try the flat claim below.
      null;
    end;
  end if;

  return lower(nullif(current_setting('request.jwt.claim.email', true), ''));
end;
$$;

comment on function public.current_user_email() is
  'The request JWT email claim, lowercased, or null. Used only by is_admin().';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.app_admins a
    where a.user_id = public.current_user_id()
       or (a.email is not null and lower(a.email) = public.current_user_email())
  );
$$;

comment on function public.is_admin() is
  'True when the current session belongs to an admin: a row in app_admins matching its user id, or its email. One default row ships with the schema (the project owner).';

revoke all on function public.current_user_email() from public;
grant execute on function public.current_user_email() to anon, authenticated;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- The default admin. 'default-owner' is a placeholder id that no real session can have, so this row
-- only ever matches on the address - which is the point: it works for Clerk, Supabase Auth, or
-- whatever comes next. Change the address or delete the row for your own deployment.
insert into public.app_admins (user_id, email, note)
values (
  'default-owner',
  'kaiovinh@gmail.com',
  'Default admin: the project owner. Kept in supabase/schema.sql so the console works on a fresh deployment.'
)
on conflict (user_id) do nothing;

/* ==========================================================================
   current_user_id() must not raise on a Clerk session, or on a bad claim
   ==========================================================================

   The P0.1 version was a SQL function whose body was:

     select coalesce((select auth.uid())::text, nullif((select auth.jwt()) ->> 'sub', ''));

   and Supabase's auth.uid() is defined as (jwt claims ->> 'sub')::uuid. Both halves
   of that raise on inputs this project actually produces:

     * a Clerk session's sub claim is "user_…", which is not a uuid  -> 22P02
     * a claim that is not JSON (a hand-set setting, an older PostgREST) -> 22P02 on ::jsonb

   A function that raises inside a policy does not deny the row, it fails the query,
   and is_admin() calls it - so every admin check was one Clerk claim away from an
   error instead of an answer. Measured before this change, with the claims set by hand:
   '{"sub":"user_3Ja1siqFIUisqvpNzeflv0tkkA6"}' raised, and is_admin() with it.

   The replacement reads the claim itself and guards the cast: a uuid is returned as
   text exactly as before, anything else is returned as-is, and a claim it cannot parse
   is simply "no identity" rather than an exception.
   ========================================================================== */

create or replace function public.current_user_id()
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  claims text;
  sub    text;
begin
  claims := nullif(current_setting('request.jwt.claims', true), '');

  if claims is not null then
    begin
      sub := claims::jsonb ->> 'sub';
    exception when others then
      sub := null;
    end;
  end if;

  if sub is null then
    -- No JSON claims: try the flat claim an older PostgREST exposes.
    sub := nullif(current_setting('request.jwt.claim.sub', true), '');
  end if;

  if sub is null then
    return null;
  end if;

  begin
    -- Supabase Auth: a uuid, and the id every policy was written for.
    return (sub::uuid)::text;
  exception when others then
    -- Not a uuid: Clerk, or anything else with its own id shape. It is still an identity, and
    -- user_id columns are TEXT precisely so both fit.
    return sub;
  end;
end;
$$;

comment on function public.current_user_id() is
  'The identity on the current request: Supabase Auth''s uid when the sub claim is a uuid, otherwise the sub claim itself (Clerk''s user_… ids), and null when there is no claim. Never raises.';

revoke all on function public.current_user_id() from public;
grant execute on function public.current_user_id() to anon, authenticated;
