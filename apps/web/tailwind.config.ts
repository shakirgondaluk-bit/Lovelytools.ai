import preset from '@lovelytools/config/tailwind';
import type { Config } from 'tailwindcss';

const config: Config = {
  presets: [preset],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    // The UI package ships source, so its classes must be scanned too.
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};

export default config;
