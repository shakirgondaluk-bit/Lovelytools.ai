import { NextResponse } from 'next/server';
import { createDiscoveryService } from '@/lib/product-finder/discovery-service';
import { recordDiscoveries } from '@/lib/product-finder/discovered-store';
import { toAffiliateProduct } from '@/lib/product-finder/affiliate-product-adapter';
import { loadConfig } from '@/lib/product-finder/config';
import { isProductProviderError, type ProviderErrorCode } from '@/lib/product-finder/types';

/**
 * POST /api/product-finder/search — keyword, Amazon URL or ASIN in, ranked
 * shortlist out.
 *
 * Discovery runs server-side, not in the client island, for one reason that is
 * not negotiable: provider endpoints and API keys live in server-only env and
 * must never be bundled for the browser. It also means the provider is called
 * once per query per process rather than once per visitor.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STATUS_BY_CODE: Record<ProviderErrorCode, number> = {
  invalid_input: 400,
  not_found: 404,
  timeout: 504,
  unauthorized: 502, // the *provider* rejected us — never surfaced as a 401 to our visitor
  rate_limited: 429,
  provider_unavailable: 502,
  malformed_response: 502,
};

export async function POST(request: Request) {
  const config = loadConfig();

  let query: unknown;
  try {
    ({ query } = (await request.json()) as { query?: unknown });
  } catch {
    return NextResponse.json({ error: 'Send a JSON body of the form { "query": "..." }.' }, { status: 400 });
  }

  if (typeof query !== 'string' || query.trim().length === 0) {
    return NextResponse.json({ error: 'Enter a product name or paste an Amazon product link.' }, { status: 400 });
  }
  if (query.length > 300) {
    return NextResponse.json({ error: 'That search is too long — try a shorter product description.' }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  request.signal.addEventListener('abort', () => controller.abort());

  try {
    const service = createDiscoveryService(config);
    const result = await service.discover(query, controller.signal);

    // Auto-publish the shortlist to the Buyer's Guide.
    //
    // Awaited rather than fire-and-forget so the write actually lands, but
    // wrapped so it can never affect the response: a Supabase outage, a missing
    // service key or a dropped table must not stop someone searching. A failure
    // here costs a catalogue entry, not a result.
    try {
      await recordDiscoveries(
        result.results
          // Never re-publish something we already have a written review for.
          // `reviewSlug` marks a product that came from the curated catalog, and
          // the generated slug differs from the curated one — so without this,
          // a fallback to the catalog quietly created a second, machine-written
          // card for a product already on the Buyer's Guide.
          .filter((item) => !item.product.reviewSlug)
          .map((item) =>
            toAffiliateProduct(item, { keyword: result.query.keyword, affiliateTag: config.affiliateTag }),
          ),
      );
    } catch (persistError) {
      console.warn('[product-finder] could not auto-publish shortlist', persistError);
    }

    return NextResponse.json(result);
  } catch (error) {
    if (isProductProviderError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: STATUS_BY_CODE[error.code] ?? 502 },
      );
    }
    if (controller.signal.aborted) {
      return NextResponse.json(
        { error: 'The search took too long. Try again, or narrow it down.', code: 'timeout' },
        { status: 504 },
      );
    }
    console.error('[product-finder] search failed', error);
    return NextResponse.json(
      { error: 'Something went wrong finding products. Try again in a moment.', code: 'provider_unavailable' },
      { status: 500 },
    );
  } finally {
    clearTimeout(timer);
  }
}
