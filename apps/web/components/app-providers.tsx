'use client';

import { useMemo, type ReactNode } from 'react';
import { AccountStateProvider, FavoritesProvider, type FavoritesSync } from '@lovelytools/ui';
import { supabase } from '@/lib/supabase';
import { AuthProvider, useAuth } from './auth-provider';

/**
 * Wires the account layer to the (backend-agnostic) FavoritesProvider.
 *
 * AuthProvider owns the session; this builds the Supabase-backed FavoritesSync from
 * the current user and hands it down. When signed out (or accounts disabled) the
 * sync is undefined and favorites run purely on localStorage — no behaviour change
 * from before accounts existed.
 */
function FavoritesBridge({ children }: { children: ReactNode }) {
  const { user, enabled } = useAuth();

  const sync = useMemo<FavoritesSync | undefined>(() => {
    if (!supabase || !user) return undefined;
    // Capture as non-null: the guard above narrows `supabase`, but that narrowing
    // doesn't survive into the async closures below, which TS assumes may run later.
    const sb = supabase;
    const userId = user.id;
    return {
      userId,
      load: async () => {
        const { data, error } = await sb
          .from('favorites')
          .select('tool_slug')
          .eq('user_id', userId);
        if (error) throw error;
        return (data ?? []).map((r: { tool_slug: string }) => r.tool_slug);
      },
      save: async (slugs: string[]) => {
        // The set is the source of truth: replace the user's rows wholesale.
        // Small sets (tens of slugs), so a delete-then-insert is simplest and
        // avoids drift from partial upserts.
        const del = await sb.from('favorites').delete().eq('user_id', userId);
        if (del.error) throw del.error;
        if (slugs.length === 0) return;
        const rows = slugs.map((tool_slug) => ({ user_id: userId, tool_slug }));
        const ins = await sb.from('favorites').insert(rows);
        if (ins.error) throw ins.error;
      },
    };
  }, [user]);

  return (
    <AccountStateProvider value={{ enabled, signedIn: user !== null }}>
      <FavoritesProvider sync={sync}>{children}</FavoritesProvider>
    </AccountStateProvider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <FavoritesBridge>{children}</FavoritesBridge>
    </AuthProvider>
  );
}
