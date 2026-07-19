'use client';

import { useState } from 'react';
import { TOTAL_TOOLS } from '@lovelytools/registry';
import { PricingCard, SegmentedToggle } from '@lovelytools/ui';

type Period = 'monthly' | 'annual';

/** PricingToggle — the billing island (RFC-001 §9: interactivity is a client leaf). */
export function PricingToggle() {
  const [period, setPeriod] = useState<Period>('annual');
  const annual = period === 'annual';

  return (
    <div className="flex w-full flex-col items-center gap-10">
      <SegmentedToggle<Period>
        aria-label="Billing period"
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'monthly', label: 'Monthly' },
          { value: 'annual', label: 'Annual · save 33%' },
        ]}
      />

      <div className="grid w-full max-w-[980px] grid-cols-1 gap-grid md:grid-cols-3">
        <PricingCard
          name="Free"
          tagline="Every tool, forever"
          price="$0"
          period="always"
          cta="Start using tools"
          ctaHref="/tools"
          features={[
            `All ${TOTAL_TOOLS} tools`,
            'Client-side processing',
            'Up to 10 files per batch',
            '200 MB per file',
            'Favourites and history',
            'Works offline (PWA)',
          ]}
        />
        <PricingCard
          popular
          name="Pro"
          tagline="For daily, heavy use"
          price={annual ? '$6' : '$9'}
          period={annual ? '/mo, billed yearly' : '/mo'}
          cta="Go Pro"
          features={[
            'Everything in Free',
            'Up to 200 files per batch',
            '2 GB per file',
            'Multithreaded video encoding',
            'Priority for large jobs',
            'No promotional messages',
          ]}
        />
        <PricingCard
          name="Team"
          tagline="For 5 or more people"
          price={annual ? '$12' : '$16'}
          period="/user/mo"
          cta="Contact sales"
          ctaHref="/contact"
          features={[
            'Everything in Pro',
            'Shared presets and workflows',
            'SSO and SAML',
            'Centralised billing',
            'Priority support',
          ]}
        />
      </div>
    </div>
  );
}
