/**
 * Persistence for products the Product Finder auto-publishes.
 *
 * Server-only. Writes use the service_role key, which bypasses RLS — the anon
 * key must never be able to write here, because a row in this table is a live
 * page on the site (see docs/supabase-discovered-products.sql).
 *
 * Every function degrades to a no-op or an empty list when Supabase is not
 * configured. Auto-publishing is an addition to the finder, never a dependency
 * of it: a missing key, a dropped table or a Supabase outage must not stop
 * someone searching for a product.
 */

// No `import 'server-only'` guard: that package is not in this workspace and
// pnpm here cannot take a new dependency outside a full reinstall. The key is
// named without a NEXT_PUBLIC_ prefix, so Next will not inline it into a client
// bundle — imported from a client component this module would build a null
// client and quietly do nothing rather than leak anything. Import it only from
// server components and route handlers.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { affiliateCategories, type AffiliateProduct } from '@/lib/affiliate-products';
import { categorySlug, inferCategory } from './categorize';

export interface DiscoveredProduct {
  slug: string;
  asin: string;
  marketplace: string;
  product: AffiliateProduct;
  searchCount: number;
  firstSeen: string;
  lastSeen: string;
  /** False when the gallery and specs still need a per-ASIN lookup. */
  enriched: boolean;
}

interface Row {
  slug: string;
  asin: string;
  marketplace: string;
  brand: string;
  name: string;
  category: string;
  payload: AffiliateProduct;
  search_count: number;
  first_seen: string;
  last_seen: string;
  /** Null until the per-ASIN detail lookup has filled in the gallery and specs. */
  enriched_at?: string | null;
}

const TABLE = 'discovered_products';

let client: SupabaseClient | null | undefined;
let reader: SupabaseClient | null | undefined;

/**
 * The admin client, built lazily so a deployment without the service key simply
 * has the feature switched off rather than failing at import time.
 */
// No session to persist and no user to refresh: these clients are a server
// process acting as itself, not on behalf of anyone.
const AUTH = { auth: { persistSession: false, autoRefreshToken: false } } as const;

function adminClient(): SupabaseClient | null {
  if (client !== undefined) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  client = url && serviceKey ? createClient(url, serviceKey, AUTH) : null;
  return client;
}

/**
 * Client for reads. Prefers the service key when present, but falls back to the
 * anon key — the table's RLS grants public select, so reading never needed
 * elevated credentials.
 *
 * This matters beyond tidiness: the Buyer's Guide and the generated product
 * pages are public pages, and tying them to a secret meant they rendered empty
 * in any environment without it, including local development. Writes still
 * require the service key, because there is deliberately no anon write policy.
 */
function readClient(): SupabaseClient | null {
  if (reader !== undefined) return reader;

  const admin = adminClient();
  if (admin) {
    reader = admin;
    return reader;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  reader = url && anonKey ? createClient(url, anonKey, AUTH) : null;
  return reader;
}

export const autoPublishEnabled = (): boolean =>
  process.env.PRODUCT_FINDER_AUTO_ADD !== 'false' && adminClient() !== null;

const KNOWN_LABELS = new Set(affiliateCategories.map((c) => c.label));

/**
 * Re-categorises on read when the stored label is not one we recognise.
 *
 * Rows written before the categoriser existed carry the provider placeholder
 * ("Amazon"), which renders a badge no filter chip can match. Healing here
 * rather than in a migration means those rows correct themselves on the next
 * page view, and it keeps working if a future provider emits a taxonomy string
 * of its own.
 */
function withCategory(product: AffiliateProduct): AffiliateProduct {
  if (KNOWN_LABELS.has(product.categoryLabel)) return product;
  const categoryLabel = inferCategory(product, null, product.categoryLabel);
  return { ...product, categoryLabel, categoryPath: `/buyers-guide?category=${categorySlug(categoryLabel)}` };
}

const toDiscovered = (row: Row): DiscoveredProduct => ({
  slug: row.slug,
  asin: row.asin,
  marketplace: row.marketplace,
  product: withCategory(row.payload),
  searchCount: row.search_count,
  firstSeen: row.first_seen,
  lastSeen: row.last_seen,
  enriched: Boolean(row.enriched_at),
});

/**
 * Upserts a shortlist.
 *
 * `search_count` is incremented per row rather than overwritten, because how
 * often a product surfaces is the one genuinely useful signal this table
 * produces — it says which of these deserves a real review. Supabase's upsert
 * cannot express "increment", so existing counts are read first; a small,
 * bounded extra round-trip on a path that is already off the critical render.
 */
export async function recordDiscoveries(products: AffiliateProduct[]): Promise<void> {
  const db = adminClient();
  if (!db || products.length === 0 || !autoPublishEnabled()) return;

  const slugs = products.map((p) => p.slug);

  const { data: existing } = await db.from(TABLE).select('slug, search_count').in('slug', slugs);
  const counts = new Map((existing ?? []).map((r: { slug: string; search_count: number }) => [r.slug, r.search_count]));

  const now = new Date().toISOString();
  const rows = products.map((product) => ({
    slug: product.slug,
    asin: product.asin,
    marketplace: product.amazonDomain,
    brand: product.brand,
    name: product.name,
    category: product.categoryLabel,
    payload: product,
    search_count: (counts.get(product.slug) ?? 0) + 1,
    last_seen: now,
  }));

  await db.from(TABLE).upsert(rows, { onConflict: 'slug' });
}

/** Newest-first listing for the Buyer's Guide. */
export async function listDiscovered(limit = 60): Promise<DiscoveredProduct[]> {
  const db = readClient();
  if (!db) return [];

  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .order('last_seen', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[product-finder] could not list auto-published products', error.message);
    return [];
  }
  return (data as Row[] | null)?.map(toDiscovered) ?? [];
}

/**
 * Replaces a stored payload with its enriched version and stamps `enriched_at`.
 *
 * Failure is swallowed on purpose: enrichment is a quality improvement on a page
 * that already renders. If the column does not exist yet — the table predates
 * it and the migration in docs/supabase-discovered-products.sql has not been
 * run — this logs and moves on, and the page still shows the thumbnail it had.
 */
export async function saveEnriched(slug: string, product: AffiliateProduct): Promise<void> {
  const db = adminClient();
  if (!db) return;

  const { error } = await db
    .from(TABLE)
    .update({ payload: product, enriched_at: new Date().toISOString() })
    .eq('slug', slug);

  if (error) console.warn('[product-finder] could not save enriched product', slug, error.message);
}

/** Single lookup, backing /products/{slug} for auto-published entries. */
export async function getDiscovered(slug: string): Promise<DiscoveredProduct | null> {
  const db = readClient();
  if (!db) return null;

  const { data, error } = await db.from(TABLE).select('*').eq('slug', slug).maybeSingle();
  if (error || !data) return null;
  return toDiscovered(data as Row);
}
