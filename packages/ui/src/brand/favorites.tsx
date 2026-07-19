'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '../lib/utils';

const STORAGE_KEY = 'lt-favorites';
const API = '/api/v1/favorites'; // edge · GET/PUT synced set of tool slugs

interface FavoritesContextValue {
  favorites: ReadonlySet<string>;
  isFavorite: (slug: string) => boolean;
  toggle: (slug: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function readLocal(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

function writeLocal(slugs: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  } catch {
    /* quota / private mode — favorites stay in memory */
  }
}

/**
 * FavoritesProvider — anonymous-first favorites (RFC-001 §5, §10).
 * Anonymous: localStorage["lt-favorites"]. Signed in: local set merges into
 * Postgres via GET/PUT /api/v1/favorites (optimistic, debounced writes).
 */
export function FavoritesProvider({
  children,
  signedIn = false,
}: {
  children: ReactNode;
  signedIn?: boolean;
}) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from localStorage; if signed in, merge with the server set.
  useEffect(() => {
    const local = readLocal();
    setFavorites(new Set(local));
    if (!signedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(API);
        if (!res.ok) return;
        const server: string[] = await res.json();
        if (cancelled) return;
        const merged = Array.from(new Set([...server, ...local]));
        setFavorites(new Set(merged));
        writeLocal(merged);
        if (local.some((s) => !server.includes(s))) {
          await fetch(API, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ toolSlugs: merged }),
          });
        }
      } catch {
        /* offline — local set remains authoritative */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const toggle = useCallback(
    (slug: string) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        next.has(slug) ? next.delete(slug) : next.add(slug);
        const list = Array.from(next);
        writeLocal(list);
        if (signedIn) {
          if (syncTimer.current) clearTimeout(syncTimer.current);
          syncTimer.current = setTimeout(() => {
            fetch(API, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ toolSlugs: list }),
            }).catch(() => {
              /* retried on next mutation; local copy is never lost */
            });
          }, 600);
        }
        return next;
      });
    },
    [signedIn],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({ favorites, isFavorite: (s) => favorites.has(s), toggle }),
    [favorites, toggle],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within <FavoritesProvider>');
  return ctx;
}

const HEART_RED = '#FF6B6B'; // DS §6.3 — favorite fill

/**
 * FavoriteButton — ♡/♥ toggle used on tool cards and tool pages.
 * 44px touch target via padding; heart glyph stays 15px.
 */
export function FavoriteButton({
  toolSlug,
  toolName,
  className,
}: {
  toolSlug: string;
  toolName?: string;
  className?: string;
}) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(toolSlug);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={
        active
          ? `Remove ${toolName ?? toolSlug} from favorites`
          : `Add ${toolName ?? toolSlug} to favorites`
      }
      onClick={(e) => {
        e.preventDefault(); // cards are links — don't navigate
        e.stopPropagation();
        toggle(toolSlug);
      }}
      className={cn(
        'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[15px] leading-none',
        'transition-all duration-150 hover:bg-surface2 active:scale-95',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        active ? '' : 'text-fg3 hover:text-fg2',
        className,
      )}
      style={active ? { color: HEART_RED } : undefined}
    >
      <span aria-hidden="true">{active ? '♥' : '♡'}</span>
    </button>
  );
}
