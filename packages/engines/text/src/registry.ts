// lovelytools.ai — text op registry. Import each op once; tool pages and the
// sitemap read from here. Adding a tool = one file + one import.
import { allTextOps, getTextOp } from './types';

import './ops/stats';
import './ops/case';
import './ops/sort';
import './ops/diff';
import './ops/slugify';
import './ops/lorem';
import './ops/lines';
import './ops/extract';
import './ops/find-replace';
import './ops/transform';
import './ops/morse';
import './ops/character-counter';
import './ops/unicode';
import './ops/palindrome';
import './ops/random-words';
import './ops/big-text';
import './ops/readability';
import './ops/handwriting';

export { allTextOps, getTextOp };
export * from './types';
export { computeStats } from './ops/stats';
export { slugify } from './ops/slugify';

/** generateStaticParams() source for /[text-tool] pages. */
export function textOpSlugs(): string[] {
  return allTextOps().map((o) => o.slug);
}

/**
 * CI test runner: every definition's vectors are executed with its default
 * options overridden by the vector's own, and the output compared string-exact.
 */
export function runVectors(): Array<{ slug: string; pass: boolean; got: string; want: string }> {
  const out: Array<{ slug: string; pass: boolean; got: string; want: string }> = [];
  for (const def of allTextOps()) {
    for (const v of def.vectors ?? []) {
      const options = Object.fromEntries(def.options.map((o) => [o.id, o.default]));
      Object.assign(options, v.options ?? {});
      let got: string;
      try {
        got = def.run(v.input, options, v.secondary).output;
      } catch (e) {
        got = `ERROR: ${(e as Error).message}`;
      }
      out.push({ slug: def.slug, pass: got === v.expect, got, want: v.expect });
    }
  }
  return out;
}
