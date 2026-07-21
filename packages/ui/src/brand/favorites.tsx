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

/**
 * How a signed-in user's set is persisted. Injected by the app rather than imported
 * here, so this package stays free of any backend dependency — packages/ui is shared
 * and must not know what the data layer is.
 */
export interface FavoritesSync {
  /** Stable id for the signed-in user; null when anonymous. Changing it re-syncs. */
  userId: string | null;
  load: () => Promise<string[]>;
  save: (slugs: string[]) => Promise<void>;
}

interface FavoritesContextValue {
  favorites: ReadonlySet<string>;
  isFavorite: (slug: string) => boolean;
  toggle: (slug: string) => void;
  /**
   * False until localStorage has been read. The set is empty on the server and on
   * the first client render, so a consumer that renders an "in here" list must wait
   * for this — otherwise someone with 12 favorites sees "nothing here yet" flash
   * before their tools appear.
   */
  hydrated: boolean;
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
 *
 * Anonymous: localStorage["lt-favorites"], and that path never requires a network.
 * Signed in (a `sync` with a non-null userId): the local set is UNIONED with the
 * stored one on load, then written back. Union rather than last-write-wins because
 * both sides are things the same person deliberately hearted — favorites someone
 * saved before signing up must survive their first sign-in, and a device that was
 * offline must not delete what another device added.
 *
 * Removals therefore only propagate through an explicit toggle, which writes the
 * full set. That is the accepted trade: a stale device can resurrect a removed
 * favorite, which is recoverable; silently losing a saved list is not.
 */
export function FavoritesProvider({
  children,
  sync,
}: {
  children: ReactNode;
  sync?: FavoritesSync;
}) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // `sync` is rebuilt each render by the app; only the user identity should
  // re-trigger the merge, so the effect keys on that and reads the rest via ref.
  const syncRef = useRef(sync);
  syncRef.current = sync;
  const userId = sync?.userId ?? null;

  useEffect(() => {
    const local = readLocal();
    setFavorites(new Set(local));
    setHydrated(true);

    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const stored = await syncRef.current!.load();
        if (cancelled) return;
        const merged = Array.from(new Set([...stored, ...local]));
        setFavorites(new Set(merged));
        writeLocal(merged);
        if (local.some((s) => !stored.includes(s))) {
          await syncRef.current!.save(merged);
        }
      } catch {
        /* offline or misconfigured — the local set remains authoritative */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const toggle = useCallback(
    (slug: string) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        next.has(slug) ? next.delete(slug) : next.add(slug);
        const list = Array.from(next);
        writeLocal(list);
        if (syncRef.current?.userId) {
          // Debounced: rapid hearting writes once, not once per click.
          if (syncTimer.current) clearTimeout(syncTimer.current);
          syncTimer.current = setTimeout(() => {
            syncRef.current?.save(list).catch(() => {
              /* retried on next mutation; the local copy is never lost */
            });
          }, 600);
        }
        return next;
      });
    },
    [],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({ favorites, isFavorite: (s) => favorites.has(s), toggle, hydrated }),
    [favorites, toggle, hydrated],
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
