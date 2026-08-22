/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: ['./index.html', './app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  // Scoped to the admin dashboard's own dark-mode toggle (AdminShell.jsx adds
  // this class to its root wrapper) rather than the default `.dark`/media
  // query, so `dark:` utilities never affect the rest of the site.
  darkMode: ['class', '.admin-dark'],
  theme: {
    extend: {
      // carwithdriver.lk dashboard redesign tokens (direction 1a "Clean cards")
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        // Values come from CSS custom properties (see src/index.css :root) so
        // that a scoped `.admin-dark` ancestor (the admin dashboard's dark
        // mode toggle) can override them for its subtree only — every other
        // page keeps resolving to the :root light values, unchanged.
        brand: {
          DEFAULT: 'var(--brand)', // primary buttons, active nav, accents
          dark: 'var(--brand-dark)', // link text / hover
          bright: 'var(--brand-bright)', // progress-bar gradient end
          tint: 'var(--brand-tint)', // active nav bg, success chips
        },
        ink: {
          DEFAULT: 'var(--ink)', // headings, key values, dark surfaces
          soft: 'var(--ink-soft)', // secondary body text
        },
        muted: {
          DEFAULT: 'var(--muted)', // subtitles / descriptions
          soft: 'var(--muted-soft)', // meta text, timestamps
        },
        canvas: 'var(--canvas)', // app background
        hairline: 'var(--hairline)', // list dividers
        star: 'var(--star)', // rating stars
        // Admin-dashboard-only tokens: plain "white card" / "input border"
        // surfaces that need to flip in dark mode (unlike marketing pages,
        // which keep using literal bg-white on purpose).
        surface: 'var(--surface)',
        line: 'var(--line)',
      },
      boxShadow: {
        card: '0 4px 16px rgba(15,31,45,.05)',
        soft: '0 2px 8px rgba(15,31,45,.06)',
        drawer: '12px 0 40px rgba(15,31,45,.2)',
      },
    },
  },
  plugins: [],
};
