// lovelytools.ai — registry types (RFC-001 §3).
// A tool is data, not code. Routes, sitemaps, navigation, the search index and OG
// images are all generated from these records at build time.
import { z } from 'zod';

/**
 * The engines that exist.
 *
 * RFC-001 §3 specified nine, including a standalone Compression engine
 * (mozjpeg/oxipng/brotli/fflate). That engine was never built: image compression
 * is a capability of the image engine, and PDF compression of the pdf engine.
 * Rather than keep an id no package implements, the four tools that claimed
 * `compression` now name the engine that actually does their work. Compression is
 * a capability, not an engine — the only deviation from the approved RFC, and it
 * describes what shipped.
 */
export const ENGINE_IDS = [
  'conversion',
  'pdf',
  'image',
  'video',
  'audio',
  'calculator',
  'text',
  'developer',
  // On-device speech recognition (Whisper via transformers.js). Added with the
  // social-media-tools category; same contract as every other engine — the model
  // runs in the browser and audio bytes never leave the device.
  'speech',
] as const;
export type EngineId = (typeof ENGINE_IDS)[number];

export const CATEGORY_IDS = [
  'pdf-tools',
  'image-tools',
  'video-tools',
  'audio-tools',
  'calculators',
  'unit-converters',
  'text-tools',
  'developer-tools',
  'social-media-tools',
] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

/**
 * Reserved root slugs. The namespace is flat (RFC-001 §2), so tools, categories
 * and marketing pages compete for the same keyspace — the validator guards it.
 */
export const RESERVED_SLUGS = [
  'about',
  'account',
  'api',
  'blog',
  'comparisons',
  'contact',
  'faq',
  'guides',
  'help',
  'login',
  'manifest',
  'offline',
  'pricing',
  'privacy',
  'robots.txt',
  'search',
  'security',
  'signup',
  'sitemap.xml',
  'terms',
  // The browse-all index. It was missing here, which meant a tool could have
  // claimed /tools and silently shadowed the homepage's primary call to action.
  'tools',
  'tutorials',
] as const;

export const categorySchema = z.object({
  id: z.enum(CATEGORY_IDS),
  /** DS monogram code — the identity system has no icon set (DS §Iconography). */
  code: z.string().length(2),
  /** User-facing display name (Design System / homepage). */
  name: z.string().min(1),
  /** Short name for breadcrumbs, nav rows and SEO titles (registry). */
  shortName: z.string().min(1),
  description: z.string().min(1),
  path: z.string().startsWith('/'),
  /** Theme-invariant category hue (DS §2). */
  hue: z.string().regex(/^#[0-9A-F]{6}$/i),
  /** Hue-as-text darkens one step on the light theme (DS §2). */
  hueOnLight: z.string().regex(/^#[0-9A-F]{6}$/i),
  primaryEngines: z.array(z.enum(ENGINE_IDS)).min(1),
});
export type Category = z.infer<typeof categorySchema>;

export const toolSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'slug must be kebab-case'),
  name: z.string().min(1),
  category: z.enum(CATEGORY_IDS),
  engine: z.enum(ENGINE_IDS),
  /** Short one-liner for category grids and finder results. */
  description: z.string().min(1),
  seo: z.object({
    title: z.string().min(1).max(70),
    description: z.string().min(50).max(200),
  }),
  /** Internal-link edges. Every target must exist — enforced in validate.ts. */
  related: z.array(z.string()).default([]),
  /**
   * Cross-listing: additional category hubs whose grids show this tool.
   * `category` stays the single home (breadcrumbs, canonical counts — the
   * catalog total is still the sum of primary categories); `alsoIn` only adds
   * the tool to other hubs' grids via toolsInCategory. Optional rather than
   * defaulted: TOOLS is the raw literal array, so a default would force the
   * field onto every existing entry. Validated in validate.ts.
   */
  alsoIn: z.array(z.enum(CATEGORY_IDS)).optional(),
});
export type ToolDefinition = z.infer<typeof toolSchema>;

export const collectionSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  name: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  hue: z.string().regex(/^#[0-9A-F]{6}$/i),
  /** Curated cross-category tool slugs. Validated against the tool set. */
  tools: z.array(z.string()).min(1),
});
export type Collection = z.infer<typeof collectionSchema>;

/**
 * Runtime stats live in the server plane (RFC-001 §4 `tool_stats`), never in the
 * registry — the catalog is declarative and versioned with the app, while ratings
 * and use counts are aggregated from Redis. The UI treats these as optional.
 */
export interface ToolStats {
  slug: string;
  uses: number;
  ratingAvg: number;
  ratingCount: number;
}
