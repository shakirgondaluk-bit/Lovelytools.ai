-- lovelytools.ai — auto-published products from the Amazon Product Finder.
-- Run once in the Supabase SQL Editor (Dashboard > SQL Editor > New query).
--
-- Every finder search persists its shortlist here, and the Buyer's Guide renders
-- these alongside the hand-written reviews in lib/affiliate-products.ts. The
-- curated array stays the source of truth for editorial pages; this table is the
-- machine-generated tier, and the two are kept separate on purpose so a bad run
-- can be cleared with one DELETE without touching anything a human wrote.
--
-- `payload` holds the whole AffiliateProduct as adapted at discovery time. It is
-- a snapshot, not a live view: prices and ratings age, which is why every page
-- built from it sends the visitor to Amazon for the current figure.

create table if not exists public.discovered_products (
  slug         text        primary key,
  asin         text        not null,
  marketplace  text        not null,
  brand        text        not null default '',
  name         text        not null default '',
  category     text        not null default '',
  -- The adapted AffiliateProduct, rendered directly by AffiliateProductTemplate.
  payload      jsonb       not null,
  -- How many separate searches surfaced this product. The demand signal worth
  -- reading before deciding which of these deserves a real hand-written review.
  search_count integer     not null default 1,
  first_seen   timestamptz not null default now(),
  last_seen    timestamptz not null default now(),
  -- When the full product detail (gallery, specs, description) was fetched.
  -- Search results carry a single thumbnail and no specs; the rich data needs a
  -- per-ASIN lookup, which costs a provider request. Stamping this means that
  -- cost is paid once per product on first view, not on every page view.
  -- Null = not yet enriched.
  enriched_at  timestamptz
);

-- Safe to re-run on a table created before enrichment existed.
alter table public.discovered_products
  add column if not exists enriched_at timestamptz;

-- The Buyer's Guide lists newest first and filters by category.
create index if not exists discovered_products_last_seen_idx
  on public.discovered_products (last_seen desc);
create index if not exists discovered_products_category_idx
  on public.discovered_products (category);
-- One row per product per marketplace, so the same ASIN on .co.uk and .com
-- cannot collide on slug.
create unique index if not exists discovered_products_asin_market_idx
  on public.discovered_products (asin, marketplace);

-- ── Row Level Security ───────────────────────────────────────────────────────
-- LOAD-BEARING, and the threat model here is different from favorites.
--
-- Reads are public: this table backs a public page, so there is nothing to hide.
-- Writes are NOT granted to anon. The anon key ships in the browser, and this
-- table publishes pages on the site — an anon insert policy would let anyone
-- create a page on lovelytools.ai directly, bypassing the finder entirely.
-- Writes happen server-side with the service_role key, which bypasses RLS.

alter table public.discovered_products enable row level security;

drop policy if exists "discovered: public read" on public.discovered_products;
create policy "discovered: public read"
  on public.discovered_products for select
  using (true);

-- No insert/update/delete policies: with RLS enabled and no policy, anon and
-- authenticated are denied by default. Do not add one.

-- ── Operational escape hatches ───────────────────────────────────────────────
-- Remove everything auto-published (the kill switch, if these ever need to go):
--   delete from public.discovered_products;
--
-- Remove one bad entry:
--   delete from public.discovered_products where slug = '...';
--
-- What people actually search for, most-wanted first — the list worth turning
-- into real reviews:
--   select name, brand, category, search_count, last_seen
--     from public.discovered_products
--    order by search_count desc, last_seen desc
--    limit 50;
