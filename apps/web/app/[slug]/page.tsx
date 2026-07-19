import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { allSlugs, getCategory, resolveSlug, TOTAL_TOOLS } from '@lovelytools/registry';
import { CategoryTemplate } from '@/components/templates/category-template';
import { CollectionTemplate } from '@/components/templates/collection-template';
import { ReorderTemplate } from '@/components/templates/reorder-template';
import { SocialCategoryTemplate } from '@/components/templates/social-category-template';
import { ToolTemplate } from '@/components/templates/tool-template';

/**
 * Tools whose experience needs more than "collect one option and run", so they get a
 * bespoke template instead of the generic ToolTemplate. Routing, SEO, registry and
 * links are unchanged — only the body differs.
 */
const CUSTOM_TOOL_TEMPLATES: Record<string, typeof ReorderTemplate> = {
  'reorder-pdf-pages': ReorderTemplate,
};

/**
 * Same idea at the category level: social-media-tools ships search, featured
 * tools, FAQ and SEO prose on its hub. Everything else renders the plain hub.
 */
const CUSTOM_CATEGORY_TEMPLATES: Record<string, typeof SocialCategoryTemplate> = {
  'social-media-tools': SocialCategoryTemplate,
};

/**
 * The flat namespace (RFC-001 §2).
 *
 * SEO wants root-level slugs, so /pdf-to-word and /pdf-tools share one keyspace.
 * A single dynamic segment resolves each slug against the registry and renders the
 * matching template. Collisions are impossible by the time we get here — the
 * registry validator fails CI on any overlap.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return allSlugs().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const resolved = resolveSlug(slug);
  if (!resolved) return {};

  // `absolute` on every title here. The registry's seo.title already carries the
  // "| lovelytools.ai" suffix (it is written to be the complete <title> a SERP
  // shows), and the layout's default template appends the same suffix again —
  // which produced "… | lovelytools.ai | lovelytools.ai" and blew past the 60-char
  // budget on every one of 245 pages.
  if ('tool' in resolved) {
    const { tool } = resolved;
    return {
      title: { absolute: tool.seo.title },
      description: tool.seo.description,
      alternates: { canonical: `/${tool.slug}` },
      openGraph: {
        title: tool.seo.title,
        description: tool.seo.description,
        url: `/${tool.slug}`,
        type: 'website',
      },
    };
  }

  if ('category' in resolved) {
    const { category } = resolved;
    const title = `${category.name} — free, private, no upload | lovelytools.ai`;
    return {
      title: { absolute: title },
      description: `${category.description} Every tool runs in your browser — your files never leave your device.`,
      alternates: { canonical: category.path },
      openGraph: { title, description: category.description, url: category.path, type: 'website' },
    };
  }

  const { collection } = resolved;
  const title = `${collection.label} — ${collection.name} tools | lovelytools.ai`;
  return {
    title: { absolute: title },
    description: `${collection.description}. Curated browser-based tools that never upload your files. Free, no signup.`,
    alternates: { canonical: `/${collection.slug}` },
    openGraph: { title, description: collection.description, url: `/${collection.slug}`, type: 'website' },
  };
}

export default async function SlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = resolveSlug(slug);
  if (!resolved) notFound();

  if ('tool' in resolved) {
    const category = getCategory(resolved.tool.category);
    if (!category) notFound();
    const Custom = CUSTOM_TOOL_TEMPLATES[resolved.tool.slug];
    if (Custom) return <Custom tool={resolved.tool} category={category} />;
    return <ToolTemplate tool={resolved.tool} category={category} />;
  }

  if ('category' in resolved) {
    const CustomCategory = CUSTOM_CATEGORY_TEMPLATES[resolved.category.id];
    if (CustomCategory) return <CustomCategory category={resolved.category} />;
    return <CategoryTemplate category={resolved.category} />;
  }

  return <CollectionTemplate collection={resolved.collection} totalTools={TOTAL_TOOLS} />;
}
