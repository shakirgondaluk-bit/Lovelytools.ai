// lovelytools.ai — the eight categories.
//
// Reconciled from three sources that disagreed:
//   · id / path / primaryEngines  ← tool registry (SEO slugs; tools reference these)
//   · code / hue / hueOnLight     ← Design System v1.0 §2 + §Iconography
//   · name / description          ← Design System homepage copy
// `shortName` keeps the registry's plainer label for breadcrumbs and SEO titles.
//
// Tool counts are NOT stored here. They are derived from the tool set in index.ts —
// a hardcoded count is a number that can lie, and DS voice requires stats to inform.
import type { Category } from './types';

export const CATEGORIES: Category[] = [
  {
    id: 'pdf-tools',
    code: 'PD',
    name: 'PDF & Documents',
    shortName: 'PDF Tools',
    description: 'Merge, split, compress, convert and OCR — without uploading a page.',
    path: '/pdf-tools',
    hue: '#FF6B6B',
    hueOnLight: '#E05252',
    primaryEngines: ['pdf', 'conversion'],
  },
  {
    id: 'image-tools',
    code: 'IM',
    name: 'Image Tools',
    shortName: 'Image Tools',
    description: 'Resize, compress, convert and remove backgrounds on your device.',
    path: '/image-tools',
    hue: '#4ADE80',
    hueOnLight: '#1FA45B',
    primaryEngines: ['image', 'conversion'],
  },
  {
    id: 'video-tools',
    code: 'VD',
    name: 'Video Tools',
    shortName: 'Video Tools',
    description: 'Trim, convert and compress video with in-browser ffmpeg.',
    path: '/video-tools',
    hue: '#7C6CFF',
    hueOnLight: '#6A58F5',
    primaryEngines: ['video', 'conversion'],
  },
  {
    id: 'audio-tools',
    code: 'AU',
    name: 'Audio Tools',
    shortName: 'Audio Tools',
    description: 'Convert, trim and clean up audio without a studio.',
    path: '/audio-tools',
    hue: '#FFC53D',
    hueOnLight: '#B8860B',
    primaryEngines: ['audio', 'conversion'],
  },
  {
    id: 'calculators',
    code: 'CA',
    name: 'Calculators',
    shortName: 'Calculators',
    description: 'Loans, dates, health, finance — instant and precise.',
    path: '/calculators',
    hue: '#38BDF8',
    hueOnLight: '#0284C7',
    primaryEngines: ['calculator'],
  },
  {
    id: 'unit-converters',
    code: 'CV',
    name: 'Unit Converters',
    shortName: 'Converters',
    description: 'Length, weight, temperature, data — converted exactly.',
    path: '/unit-converters',
    hue: '#FF8A3D',
    hueOnLight: '#D96A1E',
    primaryEngines: ['calculator'],
  },
  {
    id: 'text-tools',
    code: 'TX',
    name: 'Text Tools',
    shortName: 'Text Tools',
    description: 'Count, case, diff and clean text at typing speed.',
    path: '/text-tools',
    hue: '#F472B6',
    hueOnLight: '#D6408F',
    primaryEngines: ['text'],
  },
  {
    id: 'social-media-tools',
    code: 'SO',
    name: 'Social Media Tools',
    shortName: 'Social Media Tools',
    description: 'Pull audio and generate captions from video — all on your device.',
    path: '/social-media-tools',
    hue: '#E879F9',
    hueOnLight: '#C026D3',
    primaryEngines: ['speech', 'audio'],
  },
  {
    id: 'developer-tools',
    code: 'DV',
    name: 'Developer Tools',
    shortName: 'Developer Tools',
    description: 'Format, decode and test — secrets never leave the tab.',
    path: '/developer-tools',
    hue: '#34D3C3',
    hueOnLight: '#0F9488',
    primaryEngines: ['developer'],
  },
];
