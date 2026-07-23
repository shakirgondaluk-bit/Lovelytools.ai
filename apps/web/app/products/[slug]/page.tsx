import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { allAffiliateProductSlugs, getAffiliateProduct } from '@/lib/affiliate-products';
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

export const dynamicParams = false;

export function generateStaticParams() {
  return allAffiliateProductSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getAffiliateProduct(slug);
  if (!product) return {};

  const title = `${product.brand} ${product.name} Review | lovelytools.ai`;
  return {
    title: { absolute: title },
    description: product.tagline,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title, description: product.tagline, url: `/products/${product.slug}`, type: 'website' },
  };
}

export default async function AffiliateProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getAffiliateProduct(slug);
  if (!product) notFound();
  return <AffiliateProductTemplate product={product} />;
}
