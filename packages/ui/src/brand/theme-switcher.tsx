'use client';

import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';

const STORAGE_KEY = 'lt-theme'; // DS §8

type Theme = 'dark' | 'light';

// Mirrors --bg in tokens/colors.css. The browser paints its own chrome (mobile
// status/URL bar, overscroll glow) from <meta name="theme-color">, which it reads
// as data, not CSS — a var() here would be ignored, so the values are duplicated.
const THEME_COLOR: Record<Theme, string> = { dark: '#0A0A0E', light: '#FAFAFC' };

function applyTheme(theme: Theme) {
  document.body.classList.toggle('light', theme === 'light');
  // Follow with the UA-rendered surfaces the class can't reach: form controls,
  // scrollbars and the overscroll canvas (color-scheme), and the mobile browser
  // chrome (theme-color). The meta is created by ThemeScript OUTSIDE React's
  // tree — the layout must never render its own themeColor. (It once did, keyed
  // to the OS preference; rewriting those React-owned head nodes from here broke
  // hydration and killed all interactivity.)
  document.documentElement.style.colorScheme = theme;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = THEME_COLOR[theme];
}

/**
 * ThemeScript — render as the FIRST CHILD of <body> in app/layout.tsx.
 * Applies the persisted theme before first paint (no flash). Dark is default.
 * Also pins color-scheme so UA scrollbars/controls match from the start.
 */
export function ThemeScript() {
  const js =
    `try{var l=localStorage.getItem('${STORAGE_KEY}')==='light';` +
    `if(l)document.body.classList.add('light');` +
    `document.documentElement.style.colorScheme=l?'light':'dark';` +
    // Create the theme-color meta ourselves so mobile browser chrome matches the
    // page. Created here, it is invisible to React — the layout renders no
    // themeColor, and touching React-owned head nodes from a script breaks
    // hydration.
    `var m=document.createElement('meta');m.name='theme-color';` +
    `m.content=l?'${THEME_COLOR.light}':'${THEME_COLOR.dark}';` +
    `document.head.appendChild(m)}catch(e){}`;
  // Runs against <body> — place the script tag as the first child of <body>,
  // or keep it in <head> and swap document.body for document.documentElement
  // with tokens duplicated on :root/.light.
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}

/**
 * ThemeSwitcher — ☀/☾ ghost button (header, DS §8).
 * Persists to localStorage["lt-theme"]; announces state to screen readers.
 */
export function ThemeSwitcher({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('dark');

  // Sync with whatever ThemeScript applied pre-paint.
  useEffect(() => {
    setTheme(document.body.classList.contains('light') ? 'light' : 'dark');
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode — theme just won't persist */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className={cn(
        'flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-[15px] text-fg2',
        'transition-colors duration-150 hover:bg-surface2 hover:text-fg',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        className,
      )}
    >
      <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
    </button>
  );
}
