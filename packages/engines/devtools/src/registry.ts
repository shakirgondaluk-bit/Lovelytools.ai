// lovelytools.ai — dev op registry. One file + one import per tool.
import { allDevOps, getDevOp } from './types';

import './ops/json';
import './ops/json-validator';
import './ops/jwt';
import './ops/hash';
import './ops/checksum';
import './ops/uuid';
import './ops/regex';
import './ops/timestamp';
import './ops/color';
import './ops/hex-to-rgb';
import './ops/base-n';
import './ops/base64';
import './ops/url-codec';
import './ops/html-escape';
import './ops/csv';
import './ops/yaml';
import './ops/xml';
import './ops/markdown';
import './ops/html-tools';
import './ops/css-tools';
import './ops/js-tools';
import './ops/sql';
import './ops/cron';
import './ops/password';
import './ops/qr-code';
import './ops/diff';

export { allDevOps, getDevOp };
export * from './types';

/** generateStaticParams() source for /[dev-tool] pages. */
export function devOpSlugs(): string[] {
  return allDevOps().map((o) => o.slug);
}

/** CI helper: runs every op's vectors, merging its default options with each
 * vector's overrides. Awaits async ops (hashing, JS minify, QR). */
export async function runVectors(): Promise<Array<{ slug: string; pass: boolean; got: string; want: string }>> {
  const out: Array<{ slug: string; pass: boolean; got: string; want: string }> = [];
  for (const def of allDevOps()) {
    for (const v of def.vectors ?? []) {
      const options = Object.fromEntries(def.options.map((o) => [o.id, o.default]));
      Object.assign(options, v.options ?? {});
      let got: string;
      try {
        const result = await def.run(v.input, options, v.secondary);
        got = result.output;
      } catch (e) {
        got = `ERROR: ${(e as Error).message}`;
      }
      out.push({ slug: def.slug, pass: got === v.expect, got, want: v.expect });
    }
  }
  return out;
}
