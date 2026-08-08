import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

/**
 * The shared ESLint flat config, alongside this package's tailwind preset and
 * tsconfigs — same idea, same reason: one definition, consumed by every package.
 *
 * FlatCompat rather than a native flat export because eslint-config-next 15.5
 * still ships only eslintrc-style configs (index.js, core-web-vitals.js,
 * typescript.js) with no `exports` map. Drop the bridge when it ships a flat
 * entry point.
 *
 * `baseDirectory` is this package, not the consumer, so `next/core-web-vitals`
 * resolves through @lovelytools/config's own dependencies. Under pnpm's strict
 * node_modules a consumer cannot see eslint-config-next unless it declares it
 * itself, and the point of this file is that it shouldn't have to.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({ baseDirectory: __dirname });

/** Build output and vendored assets. Flat config has no implicit .eslintignore. */
export const IGNORES = ['**/.next/**', '**/out/**', '**/node_modules/**', '**/public/**'];

/**
 * @param {object} [options]
 * @param {string[]} [options.ignores] Extra ignore globs for this package.
 * @param {Record<string, unknown>} [options.rules] Package-level rule overrides.
 */
export function baseConfig({ ignores = [], rules = {} } = {}) {
  return [
    { ignores: [...IGNORES, ...ignores] },
    ...compat.extends('next/core-web-vitals', 'next/typescript'),
    {
      // This codebase marks a deliberately-unused binding with a leading
      // underscore (createCatalogProvider's `_config`, which exists only to
      // satisfy the IProductProvider factory signature). Teach the rule that
      // convention so the marker silences the warning instead of being one.
      rules: {
        '@typescript-eslint/no-unused-vars': [
          'warn',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
            destructuredArrayIgnorePattern: '^_',
          },
        ],
        ...rules,
      },
    },
  ];
}

/** Absolute path to this package, for consumers that need to resolve into it. */
export const CONFIG_ROOT = join(__dirname, '..');
