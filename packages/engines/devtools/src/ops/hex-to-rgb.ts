// lovelytools.ai — HEX ⇄ RGB, the focused two-format sibling of color-converter
// (which also does HSL/OKLCH/contrast). Same parser, RGB-first presentation.
import { defineDevOp, type DevField, type DevOptions, type DevResult } from '../types';
import { parseColor, toHex } from './color';

export const hexToRgb = defineDevOp({
  slug: 'hex-to-rgb',
  name: 'HEX to RGB',
  description: 'Convert HEX color codes to RGB and back.',
  options: [],
  run(input: string, _options: DevOptions): DevResult {
    const raw = input.trim();
    if (raw === '') return { output: '' };
    const rgb = parseColor(raw);
    const hex = toHex(rgb);
    const rgbStr = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b}${rgb.a < 1 ? `, ${rgb.a}` : ''})`;
    const fields: DevField[] = [
      { label: 'RGB', value: rgbStr },
      { label: 'Hex', value: hex },
      { label: 'Red', value: String(rgb.r), mono: false },
      { label: 'Green', value: String(rgb.g), mono: false },
      { label: 'Blue', value: String(rgb.b), mono: false },
    ];
    return { output: rgbStr, fields };
  },
  vectors: [
    { input: '#7C6CFF', expect: 'rgb(124, 108, 255)' },
    { input: 'rgb(124, 108, 255)', expect: 'rgb(124, 108, 255)' },
    { input: '#fff', expect: 'rgb(255, 255, 255)' },
  ],
});
