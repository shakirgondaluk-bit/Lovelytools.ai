/**
 * A small self-contained icon set for affiliate product pages — deliberately not
 * a dependency (lucide-react etc.) because this repo's pnpm store is pinned to a
 * virtual-store-dir-max-length that breaks `pnpm add` outside a full reinstall.
 * 24x24 viewBox, stroke=currentColor, matches the weight/rounding of the rest of
 * the site's iconography. Add new names here as the skill needs them — never
 * inline one-off SVGs in the template.
 */
import type { SVGProps } from 'react';

export type AffiliateIconName =
  | 'monitor'
  | 'clock'
  | 'zap'
  | 'gauge'
  | 'settings'
  | 'move'
  | 'sliders'
  | 'battery'
  | 'battery-charging'
  | 'circle-dot'
  | 'package'
  | 'shield-check'
  | 'star'
  | 'wrench'
  | 'hammer'
  | 'thumbs-up'
  | 'thumbs-down'
  | 'users'
  | 'alert-triangle'
  | 'award'
  | 'chevron-down'
  | 'shopping-cart'
  | 'ruler'
  | 'droplet'
  | 'flame'
  | 'wifi'
  | 'volume-2'
  | 'timer'
  | 'layers'
  | 'lock'
  | 'truck'
  | 'refresh-ccw'
  | 'badge-check';

const paths: Record<AffiliateIconName, React.ReactNode> = {
  monitor: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  zap: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />,
  gauge: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 13l3.5-3.5M8 13a4 4 0 0 1 4-4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M4.2 6.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 17.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </>
  ),
  move: (
    <>
      <path d="M12 3v18M3 12h18M6 8l-3 4 3 4M18 8l3 4-3 4M8 6l4-3 4 3M8 18l4 3 4-3" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h13M20 18h0" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  battery: (
    <>
      <rect x="2" y="8" width="17" height="8" rx="2" />
      <path d="M21 11v2" />
    </>
  ),
  'battery-charging': (
    <>
      <rect x="2" y="8" width="17" height="8" rx="2" />
      <path d="M21 11v2" />
      <path d="M11 8l-2 4h2.5l-2 4" />
    </>
  ),
  'circle-dot': (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
    </>
  ),
  package: (
    <>
      <path d="M3 8l9-5 9 5-9 5-9-5Z" />
      <path d="M3 8v8l9 5 9-5V8M12 13v8" />
    </>
  ),
  'shield-check': (
    <>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  star: <path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6L12 3Z" />,
  wrench: (
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2-2 2.5-2.5Z" />
  ),
  hammer: (
    <>
      <path d="M15 12l6 6-2 2-6-6" />
      <path d="M9 8l3 3-4.5 4.5a2.1 2.1 0 0 1-3-3L9 8Z" />
      <path d="M13 4l3 3 3-1 1-3-3 1-4 0Z" />
    </>
  ),
  'thumbs-up': (
    <>
      <path d="M7 10v10H4V10h3Z" />
      <path d="M7 10l4-7a2 2 0 0 1 2 2l-1 5h6a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 16.6 21H9a2 2 0 0 1-2-2v-9Z" />
    </>
  ),
  'thumbs-down': (
    <>
      <path d="M17 14V4h3v10h-3Z" />
      <path d="M17 14l-4 7a2 2 0 0 1-2-2l1-5H6a2 2 0 0 1-2-2.3l1.4-7A2 2 0 0 1 7.4 3H15a2 2 0 0 1 2 2v9Z" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17.5" cy="9" r="2.6" />
      <path d="M15.5 14.2c2.6.5 4.5 2.6 4.5 5.8" />
    </>
  ),
  'alert-triangle': (
    <>
      <path d="M12 3.5 21.5 20h-19L12 3.5Z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="8" r="5.5" />
      <path d="M8.5 13 7 21l5-2.5L17 21l-1.5-8" />
    </>
  ),
  'chevron-down': <path d="M6 9l6 6 6-6" />,
  'shopping-cart': (
    <>
      <circle cx="9" cy="21" r="1" />
      <circle cx="18" cy="21" r="1" />
      <path d="M2.5 3h2l2.6 12.6a2 2 0 0 0 2 1.6h8a2 2 0 0 0 2-1.6L21 7H6" />
    </>
  ),
  ruler: (
    <>
      <rect x="2.5" y="7" width="19" height="10" rx="1.5" />
      <path d="M6 7v3M10 7v3M14 7v3M18 7v3" />
    </>
  ),
  droplet: <path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12Z" />,
  flame: <path d="M12 2s-6 6-6 11a6 6 0 0 0 12 0c0-1.6-.7-2.7-1.5-3.8.3 2-.7 3-1.5 3-1 0-1.2-1-1-2 .3-1.6-.6-3.5-2-4.2.5 1.8-.5 3-2 4-1.2.8-2 2-2 3" />,
  wifi: (
    <>
      <path d="M2 8.5a15.5 15.5 0 0 1 20 0" />
      <path d="M5.5 12.3a10.6 10.6 0 0 1 13 0" />
      <path d="M9 16a5.6 5.6 0 0 1 6 0" />
      <circle cx="12" cy="19.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  'volume-2': (
    <>
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      <path d="M17.5 8.5a5 5 0 0 1 0 7M20 6a9 9 0 0 1 0 12" />
    </>
  ),
  timer: (
    <>
      <path d="M10 2h4M12 6v0" />
      <circle cx="12" cy="14" r="8" />
      <path d="M12 10v4l3 2" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="M3 13l9 5 9-5M3 8l9 5 9-5" transform="translate(0 3.2)" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M7 10V7a5 5 0 0 1 10 0v3" />
    </>
  ),
  truck: (
    <>
      <path d="M2 7h11v9H2z" />
      <path d="M13 10h4l3 3v3h-7z" />
      <circle cx="6.5" cy="18.5" r="1.5" />
      <circle cx="16.5" cy="18.5" r="1.5" />
    </>
  ),
  'refresh-ccw': (
    <>
      <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
      <path d="M3 21v-5h5" />
    </>
  ),
  'badge-check': (
    <>
      <path d="M12 2l2.4 1.4 2.7-.3 1 2.5 2.5 1-.3 2.7L21.7 12l-1.4 2.4.3 2.7-2.5 1-1 2.5-2.7-.3L12 22l-2.4-1.4-2.7.3-1-2.5-2.5-1 .3-2.7L2.3 12l1.4-2.4-.3-2.7 2.5-1 1-2.5 2.7.3L12 2Z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
};

export function AffiliateIcon({
  name,
  className,
  ...props
}: { name: AffiliateIconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
