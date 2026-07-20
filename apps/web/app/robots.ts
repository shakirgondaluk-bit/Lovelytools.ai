import type { MetadataRoute } from 'next';

const BASE = 'https://lovelytools.ai';

/**
 * /robots.txt — allow everything (there is nothing private to crawl; every route is
 * a public tool page) and point crawlers at the sitemap. Without this file Next
 * served a 404 at /robots.txt, so search engines had no sitemap pointer and no
 * explicit crawl grant.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
