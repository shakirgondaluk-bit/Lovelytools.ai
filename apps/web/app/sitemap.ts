import type { MetadataRoute } from 'next';
import { allSlugs } from '@lovelytools/registry';

// The canonical origin — same value the layout's metadataBase uses. Google wants
// absolute URLs in a sitemap, so this is spelled out rather than relative.
const BASE = 'https://lovelytools.ai';

// Top-level pages that live outside the registry's flat namespace (app/<name>/page.tsx).
// Kept in sync by hand because there are only a handful and they change rarely.
const STATIC_PATHS = ['', '/tools', '/pricing', '/about', '/contact', '/privacy', '/terms'];

/**
 * /sitemap.xml — every indexable route, derived from the registry so a new tool,
 * category or collection is listed the moment it ships. This is the counterpart the
 * `allSlugs()` helper was written for; without it the 250+ tool pages had no
 * machine-readable path into search indexes.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${BASE}${path}`,
    lastModified,
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.7,
  }));

  const slugEntries: MetadataRoute.Sitemap = allSlugs().map(({ slug, kind }) => ({
    url: `${BASE}/${slug}`,
    lastModified,
    changeFrequency: 'weekly',
    // Tool pages are the money pages; category/collection hubs a notch below.
    priority: kind === 'tool' ? 0.8 : 0.6,
  }));

  return [...staticEntries, ...slugEntries];
}
