// Byte-level assertions on the subtitle serializers — the part of this engine
// that runs in Node. (Decode and transcription need a browser: AudioContext and
// a model download have no place in a unit test.)
import { formatTimestamp, toSrt, toTxt, toVtt } from './format';
import type { TranscriptSegment } from './types';

const failures: string[] = [];
const expect = (name: string, actual: string, wanted: string) => {
  if (actual !== wanted) {
    failures.push(`${name}:\n  wanted ${JSON.stringify(wanted)}\n  got    ${JSON.stringify(actual)}`);
  }
};

// ── timestamps ────────────────────────────────────────────────────────────────
expect('zero', formatTimestamp(0, ','), '00:00:00,000');
expect('millis rounding', formatTimestamp(1.2345, '.'), '00:00:01.235');
// The carry case: rounding millis alone would print the invalid "00:00:01.1000".
expect('millis carry into seconds', formatTimestamp(1.9996, '.'), '00:00:02.000');
expect('hour rollover', formatTimestamp(3661.5, ','), '01:01:01,500');
expect('negative clamps to zero', formatTimestamp(-3, '.'), '00:00:00.000');

// ── serializers ───────────────────────────────────────────────────────────────
const segments: TranscriptSegment[] = [
  { id: 1, start: 0, end: 2.5, text: ' Hello there. ' },
  { id: 2, start: 2.5, end: 5, text: '' }, // empty — must be dropped, and numbering must close the gap
  { id: 3, start: 5, end: 7.25, text: 'Second line.' },
];

expect(
  'srt',
  toSrt(segments),
  '1\n00:00:00,000 --> 00:00:02,500\nHello there.\n\n2\n00:00:05,000 --> 00:00:07,250\nSecond line.\n',
);

expect(
  'vtt',
  toVtt(segments),
  'WEBVTT\n\n00:00:00.000 --> 00:00:02.500\nHello there.\n\n00:00:05.000 --> 00:00:07.250\nSecond line.\n',
);

expect('txt', toTxt(segments), 'Hello there.\nSecond line.\n');

if (failures.length) {
  console.error(`${failures.length} format failure(s):`);
  for (const f of failures) console.error(`  ✕ ${f}`);
  process.exit(1);
}
console.log('✓ subtitle serializers produce valid SRT, VTT and TXT');
