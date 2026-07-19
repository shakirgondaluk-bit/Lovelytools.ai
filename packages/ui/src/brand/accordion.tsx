'use client';

import { useId, useState } from 'react';
import { cn } from '../lib/utils';

export interface AccordionItem {
  q: string;
  a: React.ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  /** Index open on mount; -1 for all closed. */
  defaultOpen?: number;
  className?: string;
}

/**
 * Accordion — FAQ pattern (DS §6.5). One open at a time; answers fade up 200ms.
 * The +/− glyph is the icon (there is no icon set).
 *
 * Answers stay mounted and are hidden with [hidden] so crawlers index the FAQ
 * text — these pages carry FAQPage JSON-LD and the answers must exist in the DOM.
 */
export function Accordion({ items, defaultOpen = 0, className }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={item.q}
            className="overflow-hidden rounded-[14px] border border-line bg-surface"
          >
            <h3>
              <button
                type="button"
                id={`${id}-trigger-${i}`}
                aria-expanded={isOpen}
                aria-controls={`${id}-panel-${i}`}
                onClick={() => setOpen(isOpen ? -1 : i)}
                className={cn(
                  'flex w-full cursor-pointer items-center justify-between gap-4 px-[22px] py-[18px]',
                  'text-left font-sans text-[15.5px] font-semibold text-fg',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
                )}
              >
                {item.q}
                <span aria-hidden="true" className="shrink-0 text-xl leading-none text-fg3">
                  {isOpen ? '−' : '+'}
                </span>
              </button>
            </h3>
            <div
              id={`${id}-panel-${i}`}
              role="region"
              aria-labelledby={`${id}-trigger-${i}`}
              hidden={!isOpen}
              className="animate-lt-fadeup px-[22px] pb-5 text-[14.5px] leading-[1.65] text-fg2"
            >
              {item.a}
            </div>
          </div>
        );
      })}
    </div>
  );
}
