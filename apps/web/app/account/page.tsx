import type { Metadata } from 'next';
import { Footer, Header } from '@lovelytools/ui';
import { AccountView } from '@/components/account-view';

export const metadata: Metadata = {
  title: { absolute: 'Account | lovelytools.ai' },
  description:
    'Sign in to sync your favorite tools across devices. Optional — every tool works without an account.',
  alternates: { canonical: '/account' },
  // Auth screen, personal, client-rendered — nothing to index.
  robots: { index: false, follow: true },
};

/**
 * /account — the optional account layer. Static route, so it sits outside the
 * registry's flat [slug] namespace without a catalog entry.
 */
export default function AccountPage() {
  return (
    <>
      <Header />
      <main>
        <AccountView />
      </main>
      <Footer />
    </>
  );
}
