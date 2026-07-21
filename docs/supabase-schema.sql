-- lovelytools.ai — Supabase schema for accounts + synced favorites.
-- Run once in the Supabase SQL Editor (Dashboard > SQL Editor > New query).
--
-- Auth itself needs no schema: Supabase manages auth.users. This only stores the
-- per-user favorite set, keyed by the tool slug from packages/registry. Slugs are
-- stored as plain text rather than a foreign key to a tools table on purpose —
-- the registry is the single source of truth for the catalog and lives in the repo,
-- not the database. A slug that no longer exists is skipped at render.

create table if not exists public.favorites (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  tool_slug  text        not null,
  created_at timestamptz not null default now(),
  primary key (user_id, tool_slug)
);

-- Fetching "my favorites" is the only read pattern.
create index if not exists favorites_user_id_idx on public.favorites (user_id);

-- ── Row Level Security ───────────────────────────────────────────────────────
-- LOAD-BEARING. The anon key ships in the browser bundle, so every client can
-- talk to this table directly. RLS is the only thing stopping one user from
-- reading or deleting another's rows. Without these policies the table is public.

alter table public.favorites enable row level security;

drop policy if exists "favorites: select own" on public.favorites;
create policy "favorites: select own"
  on public.favorites for select
  using (auth.uid() = user_id);

drop policy if exists "favorites: insert own" on public.favorites;
create policy "favorites: insert own"
  on public.favorites for insert
  with check (auth.uid() = user_id);

drop policy if exists "favorites: delete own" on public.favorites;
create policy "favorites: delete own"
  on public.favorites for delete
  using (auth.uid() = user_id);
