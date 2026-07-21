import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The browser Supabase client, or null when the project isn't configured.
 *
 * Accounts are an optional layer over an anonymous-first product: with no env vars
 * set, `supabase` is null, every auth surface hides itself, and favorites keep
 * working out of localStorage exactly as before. That is what lets this ship before
 * the Supabase project exists, and what keeps the site standing if it ever goes away.
 *
 * The anon key is designed to be public — it identifies the project, it does not
 * grant access. Row Level Security (docs/supabase-schema.sql) is what actually
 * confines each user to their own rows. The service_role key must never appear here.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // Static hosting, no server callback route: the session comes back in the
          // URL fragment after email confirmation / OAuth and is picked up here.
          detectSessionInUrl: true,
        },
      })
    : null;

/** Whether accounts are available in this deployment. */
export const authEnabled = supabase !== null;
