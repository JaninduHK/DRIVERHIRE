/** @type {import('tailwindcss').Config} */
// carwithdriver.lk driver app — tokens mirror frontend/tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Google-fonts load each weight as its own family, so use non-weight key
      // names (body/med/semi/heavy/xheavy) to avoid colliding with Tailwind's
      // font-weight utilities. Apply one on every <Text>.
      fontFamily: {
        sans: ['PlusJakartaSans_400Regular'],
        body: ['PlusJakartaSans_400Regular'],
        med: ['PlusJakartaSans_500Medium'],
        semi: ['PlusJakartaSans_600SemiBold'],
        heavy: ['PlusJakartaSans_700Bold'],
        xheavy: ['PlusJakartaSans_800ExtraBold'],
      },
      colors: {
        brand: {
          DEFAULT: '#10a35a',
          dark: '#0c8a4b',
          bright: '#2ecc71',
          tint: '#e9f8ef',
        },
        ink: {
          DEFAULT: '#0f1f2d',
          soft: '#3d4b58',
        },
        muted: {
          DEFAULT: '#5b6b7a',
          soft: '#8595a4',
        },
        canvas: '#f6f8f7',
        hairline: '#f1f4f3',
        line: '#e2e8ea',
        star: '#f5b042',
        danger: '#f43f5e',
        warn: '#a86a15',
        'warn-tint': '#fdf0d8',
      },
    },
  },
  plugins: [],
};
