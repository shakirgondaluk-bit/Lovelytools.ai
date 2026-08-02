/**
 * Input classification — keyword vs Amazon URL vs bare ASIN.
 *
 * Pure functions, no provider knowledge, no network. Shared by the API route
 * (authoritative) and the client island (instant feedback before submitting),
 * so the two can never disagree about what a given string means.
 */

import type { FinderInput } from './types';

/** Amazon ASINs are 10 chars: either "B" + 9 alphanumerics, or a 10-digit ISBN. */
const ASIN_RE = /^(B[0-9A-Z]{9}|\d{9}[\dX])$/;

/** The path shapes Amazon uses to carry an ASIN. */
const ASIN_IN_PATH = [
  /\/dp\/([A-Z0-9]{10})/i,
  /\/gp\/product\/([A-Z0-9]{10})/i,
  /\/gp\/aw\/d\/([A-Z0-9]{10})/i,
  /\/product\/([A-Z0-9]{10})/i,
  /\/-\/[a-z]{2}\/dp\/([A-Z0-9]{10})/i,
];

export const isAsin = (value: string): boolean => ASIN_RE.test(value.trim().toUpperCase());

/**
 * Extracts an ASIN from any Amazon URL shape we can read statically.
 *
 * Returns null for short/redirect links (amzn.to, /hz/mobile/mission/) — those
 * only resolve by following the redirect, which is the provider's job, not a
 * parser's. Callers surface "paste the full product link" rather than guessing.
 */
export function extractAsin(rawUrl: string): string | null {
  const value = rawUrl.trim();

  if (isAsin(value)) return value.toUpperCase();

  let url: URL;
  try {
    url = new URL(value.startsWith('http') ? value : `https://${value}`);
  } catch {
    return null;
  }

  for (const pattern of ASIN_IN_PATH) {
    const match = pattern.exec(url.pathname);
    if (match?.[1]) return match[1].toUpperCase();
  }

  // Some listing/aod links carry it as a query param instead.
  for (const key of ['asin', 'ASIN']) {
    const param = url.searchParams.get(key);
    if (param && isAsin(param)) return param.toUpperCase();
  }

  return null;
}

const hostOf = (rawUrl: string): string | null => {
  try {
    const value = rawUrl.trim();
    const url = new URL(value.startsWith('http') ? value : `https://${value}`);
    return url.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
};

/** Reads the Amazon domain out of a URL, e.g. "amazon.co.uk". */
export function extractMarketplace(rawUrl: string): string | null {
  const host = hostOf(rawUrl);
  return host?.includes('amazon.') ? host : null;
}

/**
 * Amazon's own URL shorteners. These carry no ASIN — the product id only
 * appears after the redirect resolves, which a parser cannot do. Recognising
 * them explicitly is what turns "paste a share link" from a confusing keyword
 * search for "https amzn to" into a clear "paste the full link" message.
 */
const SHORTENERS = new Set(['amzn.to', 'amzn.eu', 'amzn.asia', 'a.co']);

export const isAmazonShortLink = (rawUrl: string): boolean => {
  const host = hostOf(rawUrl);
  return host !== null && SHORTENERS.has(host);
};

const looksLikeUrl = (value: string) => /^(https?:\/\/|www\.)/i.test(value) || /amazon\.[a-z.]+\//i.test(value);

/**
 * Classifies raw user input. Throws nothing — an unparseable URL falls back to
 * being treated as a keyword, which is nearly always what the user wanted
 * anyway (they pasted a product title with a stray "www." in it).
 */
export function detectInput(raw: string, defaultMarketplace: string): FinderInput | null {
  const value = raw.trim();
  if (!value) return null;

  if (isAsin(value)) {
    return { kind: 'asin', asin: value.toUpperCase(), marketplace: defaultMarketplace };
  }

  if (looksLikeUrl(value)) {
    const asin = extractAsin(value);
    if (asin) {
      return { kind: 'asin', asin, marketplace: extractMarketplace(value) ?? defaultMarketplace };
    }
    // A recognisable Amazon URL with no readable ASIN is a dead end, not a
    // keyword — searching for "https://amzn.to/xyz" returns nothing useful.
    if (extractMarketplace(value) || isAmazonShortLink(value)) return null;
  }

  return { kind: 'keyword', keyword: value };
}
