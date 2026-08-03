/**
 * Fills in the gallery, specs and description for an auto-published product.
 *
 * Why this is needed at all: a marketplace *search* returns a lean row — one
 * thumbnail, no specifications, no description. The rich record only comes from
 * a per-ASIN lookup, and doing that for every result at discovery time would
 * cost four provider requests per search instead of one (see
 * PRODUCT_ENRICH_RESULTS in config.ts). So the shortlist is stored lean, and the
 * detail page — which is the only place the extra data is actually visible —
 * pays for it on first view.
 *
 * The cost is paid once per product, not once per view: the enriched payload is
 * written back and stamped, so the second visitor reads it from Supabase.
 *
 * Editorial data is deliberately preserved. The stored analysis — score,
 * verdict, pros, cons, trust badges — was produced by the ranking engine against
 * the shortlist this product was found in, and cannot be recomputed from a
 * single-product lookup. Only the descriptive fields are replaced.
 */

import type { AffiliateProduct } from '@/lib/affiliate-products';
import type { AffiliateIconName } from '@/components/templates/affiliate-icons';
import { loadConfig } from './config';
import { resolveProvider } from './provider';
import { saveEnriched } from './discovered-store';
import type { NormalizedProduct } from './types';

/** A lean payload is one the detail page cannot render properly: no gallery. */
export const needsEnrichment = (product: AffiliateProduct): boolean => product.images.length < 2;

const SPEC_ICONS: AffiliateIconName[] = ['circle-dot', 'settings', 'move', 'package', 'layers', 'sliders'];

function merge(stored: AffiliateProduct, fresh: NormalizedProduct): AffiliateProduct {
  const [hero = stored.images[0], ...rest] = fresh.images;

  return {
    ...stored,
    // Only descriptive fields. Scores, verdict, pros/cons and badges stay as
    // ranked — see the note at the top of this file.
    images: fresh.images.length > 0 ? [hero, ...rest.slice(0, 6)] : stored.images,
    description: fresh.description || stored.description,
    // A real brand from the detail record beats the first-token guess that
    // search results force (see splitBrand in canopy-provider.ts).
    brand: fresh.brand || stored.brand,
    specs:
      fresh.specifications.length > 0
        ? fresh.specifications.slice(0, 8).map((spec, i) => ({
            icon: SPEC_ICONS[i % SPEC_ICONS.length]!,
            label: spec.label,
            value: spec.value,
          }))
        : stored.specs,
  };
}

/**
 * Returns the enriched product, or the original if enrichment is not possible.
 * Never throws — a provider outage or an exhausted quota must not 500 a page
 * that already has something to show.
 */
export async function enrichDiscovered(
  slug: string,
  stored: AffiliateProduct,
): Promise<AffiliateProduct> {
  const config = loadConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const provider = resolveProvider(config);
    const fresh = await provider.getByAsin(stored.asin, stored.amazonDomain, controller.signal);
    if (!fresh) return stored;

    const merged = merge(stored, fresh);
    // Stamped even when the lookup added nothing, so a product whose listing
    // genuinely has one image is not re-fetched on every single page view.
    await saveEnriched(slug, merged);
    return merged;
  } catch (error) {
    console.warn('[product-finder] could not enrich', slug, error);
    return stored;
  } finally {
    clearTimeout(timer);
  }
}
