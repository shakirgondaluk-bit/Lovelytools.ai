/**
 * Affiliate Link Service — the one place an outbound Amazon URL is built.
 *
 * Every "Buy on Amazon" control on the site routes through `buildAffiliateUrl`,
 * so the associates tag, the canonical URL shape and the required link
 * attributes are decided once. A raw Amazon href anywhere else is a bug: it
 * loses attribution silently and it drops the `sponsored` rel that FTC/ASA
 * disclosure and Google's link policy both expect.
 *
 * `affiliateUrl()` in lib/affiliate-products.ts delegates here, so the curated
 * product template and the Product Finder cannot drift apart.
 */

export const DEFAULT_AFFILIATE_TAG = 'lovelytools-21';
export const DEFAULT_MARKETPLACE = 'amazon.co.uk';

export interface AffiliateLinkTarget {
  asin: string;
  /** e.g. "amazon.co.uk". Falls back to the UK store. */
  marketplace?: string;
  /** Associates tag. Falls back to the site tag. */
  tag?: string;
  /**
   * A provider-supplied product URL. Used only for its path when it points at
   * the same marketplace — the query string is always rebuilt, so a tracking
   * parameter from upstream can never ride along.
   */
  sourceUrl?: string;
}

/** The attributes every outbound affiliate link must carry. */
export const AFFILIATE_LINK_ATTRS = {
  target: '_blank',
  rel: 'nofollow sponsored noopener',
} as const;

const normalizeMarketplace = (value: string | undefined): string => {
  const host = (value ?? DEFAULT_MARKETPLACE).trim().toLowerCase().replace(/^www\./, '');
  return host.includes('amazon.') ? host : DEFAULT_MARKETPLACE;
};

export function buildAffiliateUrl(target: AffiliateLinkTarget): string {
  const marketplace = normalizeMarketplace(target.marketplace);
  const tag = (target.tag ?? DEFAULT_AFFILIATE_TAG).trim() || DEFAULT_AFFILIATE_TAG;
  const asin = target.asin.trim().toUpperCase();

  const url = new URL(`https://www.${marketplace}/dp/${asin}`);

  // Prefer the provider's own path when it is a same-marketplace product URL —
  // some stores route through a locale segment (/-/en/dp/...) that matters.
  if (target.sourceUrl) {
    try {
      const source = new URL(target.sourceUrl);
      const sourceHost = source.hostname.replace(/^www\./, '').toLowerCase();
      if (sourceHost === marketplace && source.pathname.toUpperCase().includes(asin)) {
        // Drop Amazon's /ref=... segment. Wiping the query string is not enough
        // on its own: a provider that scraped a search page hands back paths
        // like /dp/B0CGJQSBQ7/ref=sr_1_5, and that segment is upstream position
        // tracking we have no reason to forward.
        url.pathname = source.pathname.replace(/\/ref=[^/]*\/?.*$/i, '');
      }
    } catch {
      // A malformed upstream URL is not worth failing a click over.
    }
  }

  url.search = '';
  url.searchParams.set('tag', tag);
  return url.toString();
}
