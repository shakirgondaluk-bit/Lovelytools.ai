// lovelytools.ai — UUID v4 + v7, crypto-random, bulk generation.
import { defineDevOp, type DevOptions, type DevResult } from '../types';

// getRandomValues fills all 16 bytes, so every b[i] read below is in bounds; `?? 0`
// is the branch the compiler needs and never taken.
function uuidV4(): string {
  // crypto.randomUUID where present; manual assembly otherwise — same entropy source.
  // Checked via typeof rather than `in`: lib.dom types randomUUID as always present
  // (it isn't, outside secure contexts), and an `in` check narrows crypto itself to
  // never on the else branch, which is what broke getRandomValues below.
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x40;
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80;
  return fmt(b);
}

/** UUID v7 — millisecond timestamp prefix, time-ordered (great DB keys). */
function uuidV7(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  const ts = BigInt(Date.now());
  b[0] = Number((ts >> 40n) & 0xffn);
  b[1] = Number((ts >> 32n) & 0xffn);
  b[2] = Number((ts >> 24n) & 0xffn);
  b[3] = Number((ts >> 16n) & 0xffn);
  b[4] = Number((ts >> 8n) & 0xffn);
  b[5] = Number(ts & 0xffn);
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x70; // version 7
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80; // variant
  return fmt(b);
}

function fmt(b: Uint8Array): string {
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export const uuid = defineDevOp({
  slug: 'uuid-generator',
  name: 'UUID Generator',
  description: 'v4 (random) and v7 (time-ordered) UUIDs from crypto.getRandomValues — up to 1000 at once.',
  nondeterministic: true,
  options: [
    { id: 'version', label: 'Version', kind: 'select', default: 'v4', options: [
      { value: 'v4', label: 'v4 — random' }, { value: 'v7', label: 'v7 — time-ordered' },
    ] },
    { id: 'count', label: 'How many', kind: 'number', default: 5, min: 1, max: 1000 },
    { id: 'uppercase', label: 'Uppercase', kind: 'toggle', default: false },
    { id: 'hyphens', label: 'Hyphens', kind: 'toggle', default: true },
  ],
  run(_input: string, options: DevOptions): DevResult {
    const count = Math.max(1, Math.min(1000, Number(options.count) || 5));
    const gen = options.version === 'v7' ? uuidV7 : uuidV4;
    let ids = Array.from({ length: count }, gen);
    if (!options.hyphens) ids = ids.map((u) => u.replace(/-/g, ''));
    if (options.uppercase) ids = ids.map((u) => u.toUpperCase());
    return {
      output: ids.join('\n'),
      notes: options.version === 'v7'
        ? ['v7 UUIDs sort by creation time — friendlier for database indexes than v4.']
        : undefined,
    };
  },
});
