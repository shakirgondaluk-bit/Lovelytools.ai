import { baseConfig } from '@lovelytools/config/eslint';

/**
 * ESLint flat config for packages/ui.
 *
 * Same shared rules as apps/web — these are Next components (next/link and
 * next/image are used throughout, with next as a peer dependency), so the Next
 * plugin applies here as much as it does in the app.
 */

export default baseConfig({
  rules: {
    // This rule warns when an <a> points at a route, and it finds routes by
    // locating the consuming app's pages/app directory. A component library has
    // none — it cannot know the routes of whatever app renders it, so the rule
    // has nothing to check and logs "Pages directory cannot be found" instead.
    // apps/web still enforces it, which is where the routes actually live.
    '@next/next/no-html-link-for-pages': 'off',
  },
});
