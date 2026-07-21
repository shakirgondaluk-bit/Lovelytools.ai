// lovelytools.ai — shared Tailwind preset.
// Maps Design System v1.0 tokens to utilities. Colors resolve through CSS custom
// properties so dark/light theming is free — never hardcode theme hex in classes.
import type { Config } from 'tailwindcss';

const preset: Omit<Config, 'content'> = {
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        bg2: 'var(--bg2)',
        surface: 'var(--surface)',
        surface2: 'var(--surface2)',
        line: 'var(--border)', // "border" collides with the TW core plugin name
        line2: 'var(--border2)',
        fg: 'var(--text)',
        fg2: 'var(--text2)',
        fg3: 'var(--text3)',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        'accent-fg': 'var(--accent-fg)',
        success: 'var(--green)',
        'success-soft': 'var(--green-soft)',
        star: 'var(--star)',
        danger: 'var(--error)',
        // Category hues — theme-invariant fills; the -text variants darken on light.
        'cat-pdf': 'var(--cat-pdf)',
        'cat-image': 'var(--cat-image)',
        'cat-video': 'var(--cat-video)',
        'cat-audio': 'var(--cat-audio)',
        'cat-calc': 'var(--cat-calc)',
        'cat-convert': 'var(--cat-convert)',
        'cat-text': 'var(--cat-text)',
        'cat-dev': 'var(--cat-dev)',
      },
      // Resolve through the DS token names, which are canonical. next/font supplies
      // --font-grotesk / --font-instrument, which tokens/typography.css folds in.
      fontFamily: {
        grotesk: ['var(--font-display)'],
        sans: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      // DS §5 radius scale — values from tokens/radius.css, which is the authority.
      borderRadius: {
        xs: 'var(--r-xs)', // 3px
        sm: 'var(--r-sm)', // 6px
        md: 'var(--r-md)', // 9px
        lg: 'var(--r-lg)', // 12px
        xl: 'var(--r-xl)', // 16px
        '2xl': 'var(--r-2xl)', // 20px
        full: 'var(--r-full)', // 99px
      },
      boxShadow: {
        card: 'var(--card-shadow)',
      },
      maxWidth: {
        page: 'var(--container-max)',
      },
      spacing: {
        gutter: 'var(--container-pad)',
        section: 'var(--section-gap)',
        grid: 'var(--card-grid-gap)',
        card: 'var(--card-pad)',
        nav: 'var(--nav-height)',
      },
      transitionDuration: {
        fast: 'var(--dur-fast)',
        hover: 'var(--dur-hover)',
        fade: 'var(--dur-fade)',
      },
      keyframes: {
        'lt-fadeup': {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'lt-pulse': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        // Organic drift, not a straight bob: a little X sway and a fractional
        // rotation wobble read as "floating" where a pure 12px translateY barely
        // registered. Amplitude stays mild; the per-card `delay` desyncs them.
        'lt-float': {
          '0%, 100%': { transform: 'translate(0px, 0px) rotate(0deg)' },
          '30%': { transform: 'translate(6px, -10px) rotate(0.8deg)' },
          '55%': { transform: 'translate(-3px, -16px) rotate(-0.5deg)' },
          '80%': { transform: 'translate(-6px, -6px) rotate(0.4deg)' },
        },
        'lt-drift': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(40px, -30px)' },
        },
      },
      animation: {
        'lt-fadeup': 'lt-fadeup 220ms ease both',
        'lt-pulse': 'lt-pulse 2s ease-in-out infinite',
        'lt-float': 'lt-float 6.8s ease-in-out infinite',
        'lt-drift': 'lt-drift 18s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default preset;
