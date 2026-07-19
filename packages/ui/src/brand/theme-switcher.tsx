'use client';

import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';

const STORAGE_KEY = 'lt-theme'; // DS §8

type Theme = 'dark' | 'light';

function applyTheme(theme: Theme) {
  document.body.classList.toggle('light', theme === 'light');
}

/**
 * ThemeScript — render inside <head> in app/layout.tsx.
 * Applies the persisted theme before first paint (no flash). Dark is default.
 */
export function ThemeScript() {
  const js = `try{if(localStorage.getItem('${STORAGE_KEY}')==='light')document.body.classList.add('light')}catch(e){}`;
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
