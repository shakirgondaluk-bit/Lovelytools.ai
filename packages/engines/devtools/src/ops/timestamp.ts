// lovelytools.ai — unix ⇄ ISO ⇄ human timestamps. Autodetects s/ms/µs input;
// timezone comparison table.
import { defineDevOp, DevError, type DevField, type DevOptions, type DevResult } from '../types';

const ZONES = ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Kolkata', 'Australia/Sydney'];

export const timestamp = defineDevOp({
  slug: 'timestamp-converter',
  name: 'Timestamp Converter',
  description: 'Unix seconds/millis ⇄ ISO 8601 ⇄ human — with a timezone table.',
  options: [],
  run(input: string, _options: DevOptions): DevResult {
    const raw = input.trim();
    const date = raw === '' || raw.toLowerCase() === 'now' ? new Date() : parse(raw);

    const unixMs = date.getTime();
    const fields: DevField[] = [
      { label: 'Unix seconds', value: String(Math.floor(unixMs / 1000)) },
      { label: 'Unix millis', value: String(unixMs) },
      { label: 'ISO 8601', value: date.toISOString() },
      { label: 'RFC 2822', value: date.toUTCString() },
      { label: 'Relative', value: relative(unixMs), mono: false },
      ...ZONES.map((tz) => ({
        label: tz,
        value: new Intl.DateTimeFormat('en-US', {
          timeZone: tz, dateStyle: 'medium', timeStyle: 'long',
        }).format(date),
        mono: false,
      })),
    ];
    return { output: date.toISOString(), fields };
  },
  vectors: [
    { input: '1700000000', expect: '2023-11-14T22:13:20.000Z' },
    { input: '2023-11-14T22:13:20.000Z', expect: '2023-11-14T22:13:20.000Z' },
  ],
});

function parse(raw: string): Date {
  // Pure digits → epoch with unit autodetect by magnitude.
  if (/^-?\d+$/.test(raw)) {
    const n = Number(raw);
    const abs = Math.abs(n);
    let ms: number;
    if (abs < 1e11) ms = n * 1000; // seconds (until year 5138)
    else if (abs < 1e14) ms = n; // milliseconds
    else if (abs < 1e17) ms = Math.floor(n / 1000); // microseconds
    else ms = Math.floor(n / 1e6); // nanoseconds
    const d = new Date(ms);
    if (isNaN(d.getTime())) throw new DevError('parse-error', 'That number is outside the representable date range.');
    return d;
  }
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    throw new DevError('parse-error', 'Couldn\u2019t parse that — try a unix timestamp, ISO 8601 ("2026-07-13T10:00:00Z"), or "now".');
  }
  return d;
}

function relative(ms: number): string {
  const diff = ms - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (abs < 60_000) return rtf.format(Math.round(diff / 1000), 'second');
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), 'minute');
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), 'hour');
  if (abs < 31_536_000_000) return rtf.format(Math.round(diff / 86_400_000), 'day');
  return rtf.format(Math.round(diff / 31_536_000_000), 'year');
}
