/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary actions / links — terminal green (maps to existing `brand-*` classes site-wide)
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        terminal: {
          bg: '#030806',
          panel: '#07140f',
          border: '#14532d',
          green: '#4ade80',
          'green-dim': '#22c55e',
          red: '#f87171',
          'red-dim': '#dc2626',
        },
        surface: {
          700: '#1a2e24',
          800: '#0f1f18',
          900: '#0a1812',
          950: '#030806',
        },
      },
      fontFamily: {
        mono: ['var(--font-jetbrains)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
        sans: ['var(--font-dm-sans)', 'DM Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        terminal: '0 0 0 1px rgba(34, 197, 94, 0.15), 0 8px 40px rgba(0, 0, 0, 0.45)',
        glow: '0 0 24px rgba(34, 197, 94, 0.12)',
      },
      keyframes: {
        'cursor-blink': {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
      },
      animation: {
        'cursor-blink': 'cursor-blink 1.1s step-end infinite',
      },
    },
  },
  plugins: [],
};
