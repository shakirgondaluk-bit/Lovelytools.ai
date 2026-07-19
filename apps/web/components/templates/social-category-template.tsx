import Link from 'next/link';
import { toolsInCategory, type Category } from '@lovelytools/registry';
import { Accordion, CategoryCard, categoryBySlug, Footer, Header, MonogramChip } from '@lovelytools/ui';
import { SocialCategorySearch } from '@/components/social-category-search';

/**
 * SocialCategoryTemplate — the social-media-tools hub.
 *
 * A superset of CategoryTemplate: same hero and link-concentration job
 * (RFC-001 §6), plus in-category search, featured tools, related categories,
 * an honest FAQ and SEO prose. Registered per-slug in [slug]/page.tsx the same
 * way bespoke tool templates are — routing, metadata and the registry are
 * untouched. Pure RSC except the search island.
 */

/** The flagship tools lead the page — they are the category's reason to exist. */
const FEATURED_SLUGS = ['transcribe', 'video-url-to-audio', 'video-url-caption-generator'];

const RELATED_CATEGORY_IDS = ['video-tools', 'audio-tools', 'text-tools'] as const;

const FAQ = [
  {
    q: 'Can this download audio from YouTube, TikTok or Instagram?',
    a: 'No — honestly, no tool on this site can. Those links are pages, not media files, and the platforms’ terms don’t allow ripping their streams. These tools work with direct links to media files (ending in .mp4, .webm, .mp3, …) and with files you already have. If the video is your own, use the platform’s export or download feature, then drop the file here.',
  },
  {
    q: 'Where does the processing happen?',
    a: 'On your device, all of it. When you paste a URL, your own browser fetches the file directly from that server — it never passes through ours, because there is no upload endpoint anywhere on this site. Conversion runs on in-browser ffmpeg and transcription runs a local Whisper model. Open your network inspector while a tool works and watch for yourself.',
  },
  {
    q: 'How do the caption and subtitle tools work?',
    a: 'A small speech-recognition model (Whisper tiny, about 40 MB) downloads once from the Hugging Face CDN and is cached by your browser. Your audio is decoded and transcribed entirely on your device, in 18+ languages, with timestamps. The result is editable before you export SRT, VTT or plain text — on-device recognition is a strong draft, not a perfect one.',
  },
  {
    q: 'Why does a pasted URL sometimes fail?',
    a: 'The server hosting the file has to allow browsers on other sites to read it (CORS). Many don’t. When that happens the fix is one step: download the file yourself, then drop it into the same tool — the result is identical and still never touches our servers.',
  },
  {
    q: 'Are these tools really free?',
    a: 'Yes — no watermark, no daily cap, no signup. Free handles files up to 200 MB; Pro raises that to 2 GB. The tools themselves are never gated.',
  },
];

export function SocialCategoryTemplate({ category }: { category: Category }) {
  const tools = toolsInCategory(category.id);
  const featured = FEATURED_SLUGS.map((slug) => tools.find((t) => t.slug === slug)).filter(
    (t): t is NonNullable<typeof t> => !!t,
  );
  const related = RELATED_CATEGORY_IDS.map((id) => categoryBySlug(id));

  return (
    <>
      <Header />
      <main>
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-line">
          <div aria-hidden="true" className="lt-grid-bg absolute inset-0" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-32 top-0 size-[420px] rounded-full opacity-20 blur-[120px]"
            style={{ background: category.hue }}
          />
          <div className="lt-container relative flex flex-col gap-5 py-16">
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-2 text-[12.5px] text-fg3">
                <li>
                  <Link href="/" className="transition-colors hover:text-fg">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">·</li>
                <li aria-current="page" className="text-fg2">
                  {category.shortName}
                </li>
              </ol>
            </nav>

            <div className="flex items-center gap-4">
              <MonogramChip
                code={category.code}
                hue={category.hue}
                hueOnLight={category.hueOnLight}
                size={48}
              />
              <h1 className="font-grotesk text-[clamp(32px,5vw,44px)] font-bold leading-[1.08] tracking-[-0.03em] text-fg">
                {category.name}
              </h1>
            </div>

            <p className="max-w-[560px] text-[17px] leading-[1.55] text-fg2">
              {category.description}
            </p>

            {/* Derived, so it cannot disagree with the grid below it. */}
            <p className="text-[13px] text-fg3">
              {tools.length} tools · all free · nothing uploaded
            </p>
          </div>
        </section>

        {/* ── Search + all tools ───────────────────────────────────────────── */}
        <section aria-label="All social media tools" className="lt-container py-14">
          <SocialCategorySearch tools={tools} />
        </section>

        {/* ── Featured ─────────────────────────────────────────────────────── */}
        {featured.length > 0 && (
          <section aria-labelledby="featured-heading" className="lt-container flex flex-col gap-6 pb-14">
            <h2 id="featured-heading" className="font-grotesk text-xl font-bold tracking-[-0.02em] text-fg">
              Start from a link
            </h2>
            <div className="grid grid-cols-1 gap-grid sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((tool) => (
                <Link
                  key={tool.slug}
                  href={`/${tool.slug}`}
                  className="group flex flex-col gap-3 rounded-xl border border-line bg-surface p-6 transition-[transform,border-color] duration-[180ms] ease-out hover:-translate-y-[3px] hover:border-[var(--card-hue)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  style={{ '--card-hue': category.hue } as React.CSSProperties}
                >
                  <span
                    aria-hidden="true"
                    className="h-[9px] w-[9px] rounded-[3px]"
                    style={{ background: category.hue }}
                  />
                  <span className="font-grotesk text-[18px] font-semibold tracking-[-0.01em] text-fg">
                    {tool.name}
                  </span>
                  <span className="text-[14px] leading-[1.55] text-fg2">{tool.description}</span>
                  <span className="mt-auto pt-2 text-[13.5px] font-semibold text-accent">
                    Open the tool →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <section aria-labelledby="faq-heading" className="border-t border-line bg-bg2">
          <div className="lt-container flex flex-col gap-6 py-14">
            <h2 id="faq-heading" className="font-grotesk text-xl font-bold tracking-[-0.02em] text-fg">
              Questions about social media tools
            </h2>
            <div className="max-w-[760px]">
              <Accordion items={FAQ} defaultOpen={-1} />
            </div>
          </div>
        </section>

        {/* ── SEO prose ────────────────────────────────────────────────────── */}
        <section aria-labelledby="about-heading" className="lt-container flex flex-col gap-5 py-14">
          <h2 id="about-heading" className="font-grotesk text-xl font-bold tracking-[-0.02em] text-fg">
            Social media tools that never see your files
          </h2>
          <div className="flex max-w-[720px] flex-col gap-4 text-[14.5px] leading-[1.65] text-fg2">
            <p>
              Every tool in this category runs where your media already is: on your device. Paste a
              direct link to a video and your own browser fetches it — there is no upload endpoint on
              this site, so the clip you are captioning for a reel or pulling audio from for a podcast
              never crosses our servers. That is not a settings toggle; it is how the platform is built.
            </p>
            <p>
              The audio tools convert with in-browser ffmpeg: extract the soundtrack of a clip as MP3,
              or choose WAV, M4A and OGG with bitrate control. The caption tools run the Whisper speech
              model locally to produce timestamped, editable transcripts you can export as SRT for
              video players, VTT for the web, or plain text for show notes — in 18+ languages.
            </p>
            <p>
              What these tools deliberately do not do: rip streams from YouTube, TikTok or Instagram.
              Those platforms prohibit it and their pages are not media files. For your own content,
              every platform offers an export — download it there, drop it here, and everything works
              the same, privately.
            </p>
          </div>
        </section>

        {/* ── Related categories ───────────────────────────────────────────── */}
        <section aria-labelledby="related-heading" className="border-t border-line">
          <div className="lt-container flex flex-col gap-6 py-14">
            <h2 id="related-heading" className="font-grotesk text-xl font-bold tracking-[-0.02em] text-fg">
              Related categories
            </h2>
            <div className="grid grid-cols-1 gap-grid sm:grid-cols-2 lg:grid-cols-3">
              {related.map((c) => (
                <CategoryCard key={c.slug} category={c} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'CollectionPage',
              name: category.name,
              description: category.description,
              mainEntity: {
                '@type': 'ItemList',
                numberOfItems: tools.length,
                itemListElement: tools.map((tool, i) => ({
                  '@type': 'ListItem',
                  position: i + 1,
                  name: tool.name,
                  url: `https://lovelytools.ai/${tool.slug}`,
                })),
              },
            },
            {
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: FAQ.map((item) => ({
                '@type': 'Question',
                name: item.q,
                acceptedAnswer: { '@type': 'Answer', text: item.a },
              })),
            },
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://lovelytools.ai/' },
                { '@type': 'ListItem', position: 2, name: category.shortName },
              ],
            },
          ]),
        }}
      />
    </>
  );
}
