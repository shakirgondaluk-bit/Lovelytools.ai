import { baseConfig } from '@lovelytools/config/eslint';

/**
 * ESLint flat config for apps/web.
 *
 * Replaces `next lint`, which is deprecated in Next 15 and removed in 16. There
 * was no config file here at all before this, so `next lint` fell through to its
 * interactive setup wizard and `pnpm lint` hung, then exited 1 — the lint task
 * had never actually run.
 *
 * The shared rules live in @lovelytools/config/eslint.
 */

const config = [
  ...baseConfig({ ignores: ['next-env.d.ts'] }),
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
