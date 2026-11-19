/** @type {import('tailwindcss').Config} */
export default {
  // Locale JSON is scanned too: translations may contain utility classes.
  content: ['./src/**/*.{html,js}', './build/**/*.js', './i18n/**/*.json', './i18n.config.js'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Figtree', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'Liberation Mono', 'monospace'],
      },
      colors: Object.fromEntries(
        ['bg', 'surface', 'sunken', 'titlebar', 'line', 'ink', 'muted', 'primary', 'primary-hover', 'primary-soft',
          'on-primary', 'success', 'success-soft', 'danger', 'danger-soft'].map((k) => [k, `rgb(var(--${k}) / <alpha-value>)`]),
      ),
      borderRadius: { control: '6px', card: '8px', panel: '12px' },
      boxShadow: { pop: '0 8px 24px rgb(0 0 0 / .10)' },
    },
  },
};
