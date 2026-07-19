// lovelytools.ai — Speech Engine · subtitle serializers.
//
// Pure functions: segments in, text out. Testable in Node without a model.
import type { TranscriptSegment } from './types';

const pad = (n: number, width: number): string => String(n).padStart(width, '0');

/**
 * Seconds → "HH:MM:SS<sep>mmm". SRT wants a comma before the millis, VTT a dot —
 * the single character that makes each format invalid in the other's player.
 */
export function formatTimestamp(seconds: number, separator: ',' | '.'): string {
  // Round to whole milliseconds FIRST so the carry propagates: rounding the
  // fractional part alone turns 1.9996 s into "00:00:01,1000" — an invalid cue.
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(totalMs / 3_600_000);
  const m = Math.floor((totalMs % 3_600_000) / 60_000);
  const s = Math.floor((totalMs % 60_000) / 1000);
  const ms = totalMs % 1000;
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)}${separator}${pad(ms, 3)}`;
}

/** Drops empty segments and trims whitespace — editors produce both. */
const clean = (segments: TranscriptSegment[]): TranscriptSegment[] =>
  segments
    .map((seg) => ({ ...seg, text: seg.text.trim() }))
    .filter((seg) => seg.text.length > 0);

export function toSrt(segments: TranscriptSegment[]): string {
  return clean(segments)
    .map(
      (seg, i) =>
        `${i + 1}\n${formatTimestamp(seg.start, ',')} --> ${formatTimestamp(seg.end, ',')}\n${seg.text}`,
    )
    .join('\n\n')
    .concat('\n');
}

export function toVtt(segments: TranscriptSegment[]): string {
  const body = clean(segments)
    .map(
      (seg) =>
        `${formatTimestamp(seg.start, '.')} --> ${formatTimestamp(seg.end, '.')}\n${seg.text}`,
    )
    .join('\n\n');
  return `WEBVTT\n\n${body}\n`;
}

export function toTxt(segments: TranscriptSegment[]): string {
  return clean(segments)
    .map((seg) => seg.text)
    .join('\n')
    .concat('\n');
}
