import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AffiliateProductTemplate } from '@/components/templates/affiliate-product-template';
import { loadConfig } from '@/lib/product-finder/config';
import { createDiscoveryService } from '@/lib/product-finder/discovery-service';
import { toAffiliateProduct } from '@/lib/product-finder/affiliate-product-adapter';
import { isAsin } from '@/lib/product-finder/input';
import type { AffiliateProduct } from '@/lib/affiliate-products';

/**
 * /product-finder/product/[asin] — the detail page for a discovered product.
 *
 * No new template. The normalized product plus its AI analysis is adapted into
 * the `AffiliateProduct` shape (lib/product-finder/affiliate-product-adapter.ts)
 * and handed to the same `AffiliateProductTemplate` every hand-written review
 * renders through, so the gallery, hover-zoom, trust badges, Quick Specs,
 * feature grid, pros/cons/verdict row, price box, FAQ accordion and CTAs are
 * byte-for-byte the approved design.
 *
 * Products that already have a curated review never reach this route — the
 * finder links those straight to /products/{slug}.
 *
 * Rendered on demand: the candidate set is whatever the provider returns today,
 * so there is nothing stable to pre-render.
 */

export const dynamic = 'force-dynamic';

async function load(asin: string, marketplace: string | undefined): Promise<AffiliateProduct | null> {
  if (!isAsin(asin)) return null;

  const config = loadConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const service = createDiscoveryService(config);
    const result = await service.lookup([asin], marketplace ?? config.marketplace, controller.signal);
    const item = result.results.find((r) => r.product.asin.toUpperCase() === asin.toUpperCase());
    if (!item) return null;
    return toAffiliateProduct(item, { keyword: null, affiliateTag: config.affiliateTag });
  } catch {
    // A provider failure here is a 404 to the visitor, not a 500: the page they
    // asked for genuinely has nothing to show.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ asin: string }>;
  searchParams: Promise<{ market?: string }>;
}): Promise<Metadata> {
  const [{ asin }, { market }] = await Promise.all([params, searchParams]);
  const product = await load(asin.toUpperCase(), market);
  if (!product) return { title: { absolute: 'Product not found | lovelytools.ai' } };

  const title = `${product.brand} ${product.name} — AI analysis | lovelytools.ai`;
  return {
    title: { absolute: title },
    description: product.tagline,
    // Generated pages are live provider output, not editorial we stand behind
    // long-term — the curated reviews under /products are the indexable ones.
    robots: { index: false, follow: true },
    openGraph: { title, description: product.tagline, type: 'website' },
  };
}

export default async function GeneratedProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ asin: string }>;
  searchParams: Promise<{ market?: string }>;
}) {
  const [{ asin }, { market }] = await Promise.all([params, searchParams]);
  const product = await load(asin.toUpperCase(), market);
  if (!product) notFound();

  return <AffiliateProductTemplate product={product} />;
}
