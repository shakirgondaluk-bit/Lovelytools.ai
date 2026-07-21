'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Minimal account state for shared chrome (the Header link) to react to, without
 * packages/ui taking any dependency on the app's auth backend. The app feeds this
 * from its real session; default is "no accounts", so the Header behaves exactly as
 * it did before auth existed on any deployment that doesn't wire it.
 */
interface AccountState {
  /** Whether this deployment has accounts configured at all. */
  enabled: boolean;
  /** Whether someone is currently signed in. */
  signedIn: boolean;
}

const AccountContext = createContext<AccountState>({ enabled: false, signedIn: false });

export function AccountStateProvider({
  value,
  children,
}: {
  value: AccountState;
  children: ReactNode;
}) {
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccountState(): AccountState {
  return useContext(AccountContext);
}
