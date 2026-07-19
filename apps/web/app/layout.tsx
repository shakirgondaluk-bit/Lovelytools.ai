import type { Metadata, Viewport } from 'next';
import { Instrument_Sans, Space_Grotesk } from 'next/font/google';
import { TOTAL_TOOLS } from '@lovelytools/registry';
import { FavoritesProvider, ThemeScript } from '@lovelytools/ui';
import './globals.css';

// Self-hosted at build time. These publish the CSS variables that
// packages/ui/src/styles/tokens/typography.css folds into --font-display and
// --font-body. Before this wiring existed, every font-grotesk class in the
// codebase silently fell back to the system sans.
const grotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-grotesk',
  display: 'swap',
});

const instrument = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-instrument',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://lovelytools.ai'),
  title: {
    default: 'lovelytools.ai — powerful online tools that never upload your files',
    template: '%s | lovelytools.ai',
  },
  description: `${TOTAL_TOOLS} browser-based tools for PDFs, images, video, audio, text and code. Everything runs on your device — your files never leave it. Free, no signup.`,
  applicationName: 'lovelytools.ai',
  openGraph: {
    type: 'website',
    siteName: 'lovelytools.ai',
    title: 'lovelytools.ai — powerful online tools that never upload your files',
    description: `${TOTAL_TOOLS} tools that run in your browser. No uploads, no queue, no signup.`,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0E' },
    { media: '(prefers-color-scheme: light)', color: '#FAFAFC' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${grotesk.variable} ${instrument.variable}`}>
      {/*
        suppressHydrationWarning is load-bearing, not a papering-over: ThemeScript
        (first child below) adds class="light" to <body> before React hydrates, so
        a light-theme user's server HTML (<body> with no class) legitimately differs
        from the client DOM. Without this, React logs a hydration mismatch on every
        light-theme page load. It suppresses the warning for <body>'s own attributes
        only — one level deep — not for the tree inside, so real mismatches in the
        app still surface.
      */}
      <body suppressHydrationWarning>
        {/*
          Must be the first child of <body>, not in <head>. The theme class lands on
          <body>, and a script in <head> runs before <body> exists — it would throw,
          get swallowed, and every light-theme user would get a dark flash on every
          navigation. Here it runs after the element exists but before paint.
        */}
        <ThemeScript />
        <FavoritesProvider>{children}</FavoritesProvider>
      </body>
    </html>
  );
}
