'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useFavorites } from '@lovelytools/ui';
import { useAuth } from './auth-provider';

type Mode = 'signin' | 'signup' | 'reset';

/**
 * /account body — the whole auth surface in one client island.
 *
 * Renders four states: disabled (no Supabase configured), loading (session read),
 * signed-in, and the signed-out form (sign in / sign up / reset). Passwords live in
 * local state only long enough to submit; on success the field is cleared.
 */
export function AccountView() {
  const { user, ready, enabled, signIn, signUp, signOut, sendReset } = useAuth();
  const { favorites } = useFavorites();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!enabled) {
    return (
      <Panel>
        <h2 className="font-grotesk text-[20px] font-bold text-fg">Accounts aren&rsquo;t enabled yet</h2>
        <p className="text-[15px] leading-[1.55] text-fg2">
          Your favorites still work — they&rsquo;re saved in this browser. Sign-in to
          sync them across devices is coming once the backend is connected.
        </p>
        <Link href="/favorites" className="text-sm text-accent hover:underline">
          Go to My Favorite Tools →
        </Link>
      </Panel>
    );
  }

  if (!ready) {
    return (
      <Panel>
        <p className="text-center text-sm text-fg3">Checking your session…</p>
      </Panel>
    );
  }

  if (user) {
    return (
      <Panel>
        <h2 className="font-grotesk text-[20px] font-bold text-fg">Signed in</h2>
        <p className="text-[15px] text-fg2">
          {user.email}
        </p>
        <p className="text-[13px] text-fg3">
          {favorites.size} favorite{favorites.size === 1 ? '' : 's'} synced to this account.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            href="/favorites"
            className="rounded-[9px] bg-accent px-[18px] py-[9px] text-[14px] font-semibold text-white transition-[filter] duration-150 hover:brightness-[1.12]"
          >
            My Favorite Tools
          </Link>
          <button
            type="button"
            onClick={() => signOut()}
            className="rounded-[9px] border border-line px-[18px] py-[9px] text-[14px] font-semibold text-fg2 transition-colors hover:border-line2 hover:text-fg"
          >
            Sign out
          </button>
        </div>
      </Panel>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    if (mode === 'reset') {
      const { error } = await sendReset(email);
      setBusy(false);
      if (error) return setError(error);
      return setNotice('Check your email for a password reset link.');
    }

    if (mode === 'signup') {
      const { error, needsConfirmation } = await signUp(email, password);
      setBusy(false);
      setPassword('');
      if (error) return setError(error);
      if (needsConfirmation) {
        return setNotice('Account created. Check your email to confirm, then sign in.');
      }
      return; // session arrives via onAuthStateChange
    }

    const { error } = await signIn(email, password);
    setBusy(false);
    setPassword('');
    if (error) return setError(error);
  };

  const titles: Record<Mode, string> = {
    signin: 'Sign in',
    signup: 'Create your account',
    reset: 'Reset your password',
  };

  return (
    <Panel>
      <h2 className="font-grotesk text-[20px] font-bold text-fg">{titles[mode]}</h2>
      <p className="text-[14px] leading-[1.55] text-fg2">
        {mode === 'signup'
          ? 'Sync your favorite tools across every device. Free — the tools themselves never needed an account.'
          : mode === 'reset'
            ? 'Enter your email and we’ll send a reset link.'
            : 'Welcome back. Your favorites will sync once you’re in.'}
      </p>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-fg2">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-line bg-bg2 px-3.5 py-2.5 text-[14px] text-fg outline-none focus:border-accent"
          />
        </label>

        {mode !== 'reset' && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-fg2">Password</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-line bg-bg2 px-3.5 py-2.5 text-[14px] text-fg outline-none focus:border-accent"
            />
          </label>
        )}

        {error && <p className="text-[13px] text-danger">{error}</p>}
        {notice && <p className="text-[13px] text-success">{notice}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-1 rounded-[9px] bg-accent px-[18px] py-[10px] text-[14px] font-semibold text-white transition-[filter] duration-150 hover:brightness-[1.12] disabled:opacity-60"
        >
          {busy ? 'Working…' : titles[mode]}
        </button>
      </form>

      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[13px] text-fg3">
        {mode !== 'signin' && (
          <button type="button" onClick={() => { setMode('signin'); setError(null); setNotice(null); }} className="hover:text-fg2">
            Have an account? Sign in
          </button>
        )}
        {mode !== 'signup' && (
          <button type="button" onClick={() => { setMode('signup'); setError(null); setNotice(null); }} className="hover:text-fg2">
            Create an account
          </button>
        )}
        {mode !== 'reset' && (
          <button type="button" onClick={() => { setMode('reset'); setError(null); setNotice(null); }} className="hover:text-fg2">
            Forgot password?
          </button>
        )}
      </div>
    </Panel>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="lt-container py-16">
      <div className="mx-auto flex w-full max-w-[420px] flex-col gap-4 rounded-2xl border border-line bg-surface p-8 shadow-card">
        {children}
      </div>
    </div>
  );
}
