// lovelytools.ai — pull emails and URLs out of arbitrary text. The regexes are
// deliberately pragmatic (RFC 5322 in full is a party trick, not a tool) —
// they match what people actually paste, and trailing punctuation is stripped
// so "see https://x.com." doesn't capture the period.
import { defineTextOp, type TextOptions, type TextResult } from '../types';

const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"')\]}]+/gi;

function extractOp(opts: {
  slug: string;
  name: string;
  description: string;
  re: RegExp;
  clean: (m: string) => string;
  vectors: Array<{ input: string; options?: TextOptions; expect: string }>;
}) {
  defineTextOp({
    slug: opts.slug,
    name: opts.name,
    description: opts.description,
    inputs: 1,
    options: [
      { id: 'unique', label: 'Remove duplicates', kind: 'toggle', default: true },
      { id: 'sort', label: 'Sort alphabetically', kind: 'toggle', default: false },
    ],
    run(input: string, options: TextOptions): TextResult {
      let found = (input.match(opts.re) ?? []).map(opts.clean).filter(Boolean);
      const total = found.length;
      if (options.unique) found = [...new Set(found)];
      if (options.sort) found = [...found].sort((a, b) => a.localeCompare(b));
      return {
        output: found.join('\n'),
        notes: [`${total} match(es)${options.unique && total !== found.length ? ` · ${found.length} unique` : ''}.`],
      };
    },
    vectors: opts.vectors,
  });
}

extractOp({
  slug: 'extract-emails',
  name: 'Extract Emails',
  description: 'Every email address in a block of text, one per line.',
  re: EMAIL_RE,
  clean: (m) => m.replace(/[.,]+$/, ''),
  vectors: [
    { input: 'Write a@b.com or c@d.org today.', expect: 'a@b.com\nc@d.org' },
    { input: 'dupe x@y.com and x@y.com', expect: 'x@y.com' },
  ],
});

extractOp({
  slug: 'extract-urls',
  name: 'Extract URLs',
  description: 'Every link in a block of text, one per line.',
  re: URL_RE,
  clean: (m) => m.replace(/[.,;:!?]+$/, ''),
  vectors: [
    { input: 'See https://example.com/a and www.test.org.', expect: 'https://example.com/a\nwww.test.org' },
  ],
});
