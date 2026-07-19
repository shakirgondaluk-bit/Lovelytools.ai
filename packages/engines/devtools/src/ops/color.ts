// lovelytools.ai — color converter: hex ⇄ rgb ⇄ hsl ⇄ oklch + WCAG contrast.
import { defineDevOp, DevError, type DevField, type DevOptions, type DevResult } from '../types';

export interface RGB { r: number; g: number; b: number; a: number }

export const color = defineDevOp({
  slug: 'color-converter',
  name: 'Color Converter',
  description: 'hex, rgb(), hsl(), oklch() in any direction — plus WCAG contrast vs black and white.',
  options: [],
  run(input: string, _options: DevOptions): DevResult {
    const raw = input.trim();
    if (raw === '') return { output: '' };
    const rgb = parseColor(raw);

    const hex = toHex(rgb);
    const hsl = toHsl(rgb);
    const oklch = toOklch(rgb);
    const cw = contrast(rgb, { r: 255, g: 255, b: 255, a: 1 });
    const cb = contrast(rgb, { r: 0, g: 0, b: 0, a: 1 });

    const fields: DevField[] = [
      { label: 'Hex', value: hex },
      { label: 'RGB', value: `rgb(${rgb.r} ${rgb.g} ${rgb.b}${rgb.a < 1 ? ` / ${rgb.a}` : ''})` },
      { label: 'HSL', value: `hsl(${hsl.h.toFixed(0)} ${hsl.s.toFixed(0)}% ${hsl.l.toFixed(0)}%)` },
      { label: 'OKLCH', value: `oklch(${oklch.l.toFixed(3)} ${oklch.c.toFixed(3)} ${oklch.h.toFixed(1)})` },
      { label: 'Contrast vs white', value: `${cw.toFixed(2)}:1 ${wcag(cw)}`, tone: cw >= 4.5 ? 'positive' : 'negative', mono: false },
      { label: 'Contrast vs black', value: `${cb.toFixed(2)}:1 ${wcag(cb)}`, tone: cb >= 4.5 ? 'positive' : 'negative', mono: false },
    ];
    return { output: hex, fields };
  },
  vectors: [
    { input: '#7C6CFF', expect: '#7C6CFF' },
    { input: 'rgb(124 108 255)', expect: '#7C6CFF' },
    { input: '#fff', expect: '#FFFFFF' },
  ],
});

// Each branch destructures its own match and guards the groups. A pattern that
// matched always filled its groups, so no guard here fires — and if one somehow
// did, falling through to the parse-error at the bottom is the right answer anyway.
export function parseColor(s: string): RGB {
  // One group per digit, so the expansion below reads off the match directly.
  const hex3 = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(s);
  if (hex3) {
    const [, r, g, b] = hex3;
    if (r && g && b) return { r: parseInt(r + r, 16), g: parseInt(g + g, 16), b: parseInt(b + b, 16), a: 1 };
  }

  const hex6 = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(s);
  if (hex6) {
    const [, rgb, alpha] = hex6;
    if (rgb) {
      return {
        r: parseInt(rgb.slice(0, 2), 16),
        g: parseInt(rgb.slice(2, 4), 16),
        b: parseInt(rgb.slice(4, 6), 16),
        a: alpha ? parseInt(alpha, 16) / 255 : 1,
      };
    }
  }

  const rgbFn = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+%?))?\s*\)$/i.exec(s);
  if (rgbFn) {
    const [, r, g, b, alpha] = rgbFn;
    if (r && g && b) {
      const a = alpha ? (alpha.endsWith('%') ? parseFloat(alpha) / 100 : parseFloat(alpha)) : 1;
      return { r: clamp255(+r), g: clamp255(+g), b: clamp255(+b), a };
    }
  }

  const hslFn = /^hsla?\(\s*([\d.]+)(?:deg)?[,\s]+([\d.]+)%[,\s]+([\d.]+)%/i.exec(s);
  if (hslFn) {
    const [, h, sat, l] = hslFn;
    if (h && sat && l) return hslToRgb(+h, +sat, +l);
  }

  throw new DevError('parse-error', 'Try #7C6CFF, rgb(124 108 255), or hsl(249 100% 71%).');
}

const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

export function toHex({ r, g, b, a }: RGB): string {
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}${a < 1 ? h(Math.round(a * 255)) : ''}`.toUpperCase();
}

function hslToRgb(h: number, s: number, l: number): RGB {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: clamp255(f(0) * 255), g: clamp255(f(8) * 255), b: clamp255(f(4) * 255), a: 1 };
}

function toHsl({ r, g, b }: RGB): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
  else if (max === gn) h = ((bn - rn) / d + 2) * 60;
  else h = ((rn - gn) / d + 4) * 60;
  return { h, s: s * 100, l: l * 100 };
}

/** sRGB → OKLab → OKLCH (Björn Ottosson's constants). */
function toOklch({ r, g, b }: RGB): { l: number; c: number; h: number } {
  const lin = (v: number) => {
    const n = v / 255;
    return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  };
  const [lr, lg, lb] = [lin(r), lin(g), lin(b)];
  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const c = Math.sqrt(A * A + B * B);
  let h = (Math.atan2(B, A) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c, h };
}

function contrast(a: RGB, b: RGB): number {
  const lum = ({ r, g, b: bl }: RGB) => {
    const f = (v: number) => {
      const n = v / 255;
      return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl);
  };
  const la = lum(a);
  const lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function wcag(ratio: number): string {
  if (ratio >= 7) return '· AAA';
  if (ratio >= 4.5) return '· AA';
  if (ratio >= 3) return '· AA large only';
  return '· fails';
}
