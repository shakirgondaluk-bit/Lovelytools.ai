import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { allAffiliateProductSlugs, getAffiliateProduct } from '@/lib/affiliate-products';
import { getDiscovered } from '@/lib/product-finder/discovered-store';
import { AffiliateProductTemplate } from '@/components/templates/affiliate-product-template';

/**
 * Temporary standalone route for affiliate product pages, at /products/[slug].
 *
 * This exists so pages are live and reviewable before the "Affiliate Products"
 * category is wired into @lovelytools/registry and the main [slug] router
 * (see app/[slug]/page.tsx). Once that category exists, migrate these entries
 * into the registry and this route can be removed in favor of the flat
 * namespace the rest of the site uses.
 */

/**
 * True so auto-published finder products resolve here too.
 *
 * The hand-written reviews below are still pre-rendered by
 * `generateStaticParams`, so they stay static and fast — this only opens the
 * door for slugs that live in Supabase rather than in the repo, which cannot be
 * known at build time. It was `false`, which 404'd every one of them.
 */
export const dynamicParams = true;

export function generateStaticParams() {
  return allAffiliateProductSlugs().map((slug) => ({ slug }));
}

/**
 * Curated review first, auto-published entry second. The repo is always
 * authoritative: if a product has been written up properly, that page wins over
 * whatever the finder happened to persist for the same slug.
 */
async function resolveProduct(slug: string) {
  const curated = getAffiliateProduct(slug);
  if (curated) return { product: curated, generated: false };

  const discovered = await getDiscovered(slug);
  return discovered ? { product: discovered.product, generated: true } : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveProduct(slug);
  if (!resolved) return {};
  const { product, generated } = resolved;

  const title = `${product.brand} ${product.name} Review | lovelytools.ai`;
  return {
    title: { absolute: title },
    description: product.tagline,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title, description: product.tagline, url: `/products/${product.slug}`, type: 'website' },
    // Auto-published pages are indexable by default, per the product decision to
    // grow the catalogue from finder traffic. PRODUCT_FINDER_AUTO_ADD_NOINDEX=true
    // flips every one of them to noindex without a code change or a redeploy —
    // the switch to reach for if search ever starts treating them as thin
    // content, since it takes effect on the next request.
    robots:
      generated && process.env.PRODUCT_FINDER_AUTO_ADD_NOINDEX === 'true'
        ? { index: false, follow: true }
        : undefined,
  };
}

export default async function AffiliateProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = await resolveProduct(slug);
  if (!resolved) notFound();
  return <AffiliateProductTemplate product={resolved.product} />;
}
