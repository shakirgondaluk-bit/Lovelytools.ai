import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

/**
 * ESLint flat config for apps/web.
 *
 * Replaces `next lint`, which is deprecated in Next 15 and removed in 16. There
 * was no config file here at all before this, so `next lint` fell through to its
 * interactive setup wizard and `pnpm lint` hung, then exited 1 — the lint task
 * had never actually run.
 *
 * FlatCompat rather than a native flat export because eslint-config-next 15.5
 * still ships only eslintrc-style configs (index.js, core-web-vitals.js,
 * typescript.js) with no `exports` map. This is the bridge Next's own docs use;
 * drop it when the package ships a flat entry point.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  {
    // Flat config drops the implicit .eslintignore, so build output and vendored
    // assets have to be excluded explicitly or ESLint walks into .next and lints
    // megabytes of generated chunks.
    ignores: [
      '.next/**',
      'out/**',
      'node_modules/**',
      'public/**',
      'next-env.d.ts',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    // This codebase already marks a deliberately-unused binding with a leading
    // underscore (createCatalogProvider's `_config`, which exists to satisfy the
    // IProductProvider factory signature). Teach the rule that convention so the
    // marker silences the warning instead of being one.
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
    },
  },
  {
    // next.config.js and server.js are CommonJS on purpose, and both say why in
    // their own header comments: the config is plain CJS so Next never loads
    // @next/swc just to compile it (which cost 64 idle tokio threads per
    // instance against Hostinger's nproc limit), and server.js is the plain
    // `node <file>` entry point that host asks for. require() is correct in
    // both, so the TS-oriented rule does not apply.
    files: ['next.config.js', 'server.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
];

export default config;
