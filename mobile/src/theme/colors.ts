// carwithdriver.lk driver app palette — mirrors frontend/tailwind.config.js.
// Used where raw color values are needed (SVG/lucide icons, gradients, native props).
export const colors = {
  brand: '#10a35a',
  brandDark: '#0c8a4b',
  brandBright: '#2ecc71',
  brandTint: '#e9f8ef',
  ink: '#0f1f2d',
  inkSoft: '#3d4b58',
  muted: '#5b6b7a',
  mutedSoft: '#8595a4',
  canvas: '#f6f8f7',
  hairline: '#f1f4f3',
  line: '#e2e8ea',
  star: '#f5b042',
  danger: '#f43f5e',
  warn: '#a86a15',
  warnTint: '#fdf0d8',
  white: '#ffffff',
  placeholder: '#adb8c0',
} as const;

// Header gradient used across screens: linear-gradient(160deg,#0f7a45,#10a35a 55%,#18b866)
export const headerGradient = ['#0f7a45', '#10a35a', '#18b866'] as const;
export const welcomeGradient = ['#0f7a45', '#10a35a', '#0f1f2d'] as const;

export const fontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;
