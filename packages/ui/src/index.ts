// @lovelytools/ui — the merged component library.
//
// Reconciled from two libraries that had drifted apart: the Design System's
// inline-style JSX (17 components, the visual authority) and the Next.js/Tailwind
// TSX set (15 components, matching the RFC-001 stack). The TSX implementations won
// where both existed; the DS-only components were ported to Tailwind with their
// spec values intact. Nothing was dropped.
//
// Layers per RFC-001 §9 — imports only ever point downward:
//   L1 primitives → L2 brand → (L3 templates live in apps/web)

// ── L1 · primitives ───────────────────────────────────────────────────────────
export { Avatar } from './primitives/avatar';
export { Badge } from './primitives/badge';
export { Button, type ButtonProps } from './primitives/button';
export { Kbd } from './primitives/kbd';
export { Logo } from './primitives/logo';
export { SegmentedToggle, type SegmentedOption } from './primitives/segmented-toggle';

// ── L2 · brand ────────────────────────────────────────────────────────────────
export { Accordion, type AccordionItem } from './brand/accordion';
export { AIToolFinder, type FinderResult } from './brand/ai-tool-finder';
export { BlogCard } from './brand/blog-card';
export { CategoryCard } from './brand/category-card';
export { CollectionCard } from './brand/collection-card';
export { FavoriteButton, FavoritesProvider, useFavorites } from './brand/favorites';
export { FloatingCard } from './brand/floating-card';
export { Footer } from './brand/footer';
export { Header } from './brand/header';
export { KbdHint } from './brand/kbd-hint';
export { MegaNav, type MegaPanelId } from './brand/mega-nav';
export { MonogramChip } from './brand/monogram-chip';
export { PricingCard } from './brand/pricing-card';
export { ProgressBar, ProgressRow, type FileStatus } from './brand/progress-bar';
export { RateTool, RatingStars } from './brand/rating-stars';
export { SearchBar, SearchTrigger, SEARCH_INPUT_ID } from './brand/search-bar';
export { StatCounter } from './brand/stat-counter';
export { TestimonialCard } from './brand/testimonial-card';
export { ThemeScript, ThemeSwitcher } from './brand/theme-switcher';
export { ToolCard } from './brand/tool-card';
export { UploadZone } from './brand/upload-zone';

// ── lib ───────────────────────────────────────────────────────────────────────
export {
  AUDIENCES,
  CATEGORIES,
  categoryBySlug,
  type Category,
  type CategorySlug,
  type Tool,
} from './lib/categories';
export { cn, formatUses } from './lib/utils';
