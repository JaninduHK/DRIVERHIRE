/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      // carwithdriver.lk dashboard redesign tokens (direction 1a "Clean cards")
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        brand: {
          DEFAULT: '#10a35a', // primary buttons, active nav, accents
          dark: '#0c8a4b', // link text / hover
          bright: '#2ecc71', // progress-bar gradient end
          tint: '#e9f8ef', // active nav bg, success chips
        },
        ink: {
          DEFAULT: '#0f1f2d', // headings, key values, dark surfaces
          soft: '#3d4b58', // secondary body text
        },
        muted: {
          DEFAULT: '#5b6b7a', // subtitles / descriptions
          soft: '#8595a4', // meta text, timestamps
        },
        canvas: '#f6f8f7', // app background
        hairline: '#f1f4f3', // list dividers
        star: '#f5b042', // rating stars
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
