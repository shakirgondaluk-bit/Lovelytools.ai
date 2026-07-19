const config = {
  plugins: {
    // Resolves the @import chain in @lovelytools/ui/styles.css before Tailwind runs.
    'postcss-import': {},
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
