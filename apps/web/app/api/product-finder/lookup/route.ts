import { NextResponse } from 'next/server';
import { createDiscoveryService } from '@/lib/product-finder/discovery-service';
import { loadConfig } from '@/lib/product-finder/config';
import { isAsin } from '@/lib/product-finder/input';
import { isProductProviderError } from '@/lib/product-finder/types';

/**
 * POST /api/product-finder/lookup — re-hydrate a specific set of ASINs.
 *
 * Backs the comparison page when it is opened cold (a shared link, a bookmark,
 * a hard refresh) so the comparison never depends on client-side state that may
 * not exist.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const config = loadConfig();

  let body: { asins?: unknown; marketplace?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Send a JSON body of the form { "asins": ["..."] }.' }, { status: 400 });
  }

  const asins = Array.isArray(body.asins)
    ? body.asins.filter((a): a is string => typeof a === 'string' && isAsin(a))
    : [];

  if (asins.length === 0) {
    return NextResponse.json({ error: 'No valid product IDs were supplied.' }, { status: 400 });
  }

  const marketplace = typeof body.marketplace === 'string' ? body.marketplace : config.marketplace;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  request.signal.addEventListener('abort', () => controller.abort());

  try {
    const service = createDiscoveryService(config);
    const result = await service.lookup(asins, marketplace, controller.signal);
    return NextResponse.json(result);
  } catch (error) {
    if (isProductProviderError(error)) {
      const status = error.code === 'not_found' ? 404 : error.code === 'invalid_input' ? 400 : 502;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    console.error('[product-finder] lookup failed', error);
    return NextResponse.json({ error: 'Could not load those products.' }, { status: 500 });
  } finally {
    clearTimeout(timer);
  }
}
