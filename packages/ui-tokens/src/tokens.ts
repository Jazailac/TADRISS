/**
 * Single source of truth for design tokens. The ONLY place in the repo where raw colour
 * values may appear. `pnpm tokens:build` generates CSS variables for web (Tailwind v4)
 * and mobile (NativeWind), plus a Tailwind v3 preset for NativeWind.
 *
 * Colours are stored as space-separated RGB channels so Tailwind can apply alpha
 * (e.g. `bg-primary/10`).
 */

export const colorNames = [
  'background',
  'surface',
  'surface-muted',
  'border',
  'text',
  'text-muted',
  'primary',
  'primary-foreground',
  'primary-soft',
  'success',
  'success-soft',
  'warning',
  'warning-soft',
  'danger',
  'danger-soft',
  'info',
  'info-soft',
] as const;

export type ColorName = (typeof colorNames)[number];
export type Rgb = `${number} ${number} ${number}`;
export type Palette = Record<ColorName, Rgb>;

export const light: Palette = {
  background: '248 250 252',
  surface: '255 255 255',
  'surface-muted': '241 245 249',
  border: '226 232 240',
  text: '15 23 42',
  'text-muted': '71 85 105',
  primary: '13 110 253',
  'primary-foreground': '255 255 255',
  'primary-soft': '219 234 254',
  success: '21 128 61',
  'success-soft': '220 252 231',
  warning: '180 83 9',
  'warning-soft': '254 243 199',
  danger: '185 28 28',
  'danger-soft': '254 226 226',
  info: '3 105 161',
  'info-soft': '224 242 254',
};

export const dark: Palette = {
  background: '2 6 23',
  surface: '15 23 42',
  'surface-muted': '30 41 59',
  border: '51 65 85',
  text: '241 245 249',
  'text-muted': '148 163 184',
  primary: '96 165 250',
  'primary-foreground': '2 6 23',
  'primary-soft': '23 37 84',
  success: '74 222 128',
  'success-soft': '20 83 45',
  warning: '251 191 36',
  'warning-soft': '120 53 15',
  danger: '248 113 113',
  'danger-soft': '127 29 29',
  info: '56 189 248',
  'info-soft': '12 74 110',
};

export const radius = { sm: '0.375rem', md: '0.5rem', lg: '0.75rem', xl: '1rem' } as const;

export const fonts = {
  heading: 'Plus Jakarta Sans',
  body: 'DM Sans',
  mono: 'JetBrains Mono',
  arabic: 'Noto Sans Arabic',
} as const;

/** `rgb(r, g, b)` string for native APIs that cannot read CSS variables (StatusBar, nav theme). */
export function rgb(palette: Palette, name: ColorName): string {
  return `rgb(${palette[name].split(' ').join(', ')})`;
}
