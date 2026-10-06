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
  'border-strong',
  'text',
  'text-muted',
  'primary',
  'primary-foreground',
  'primary-soft',
  'accent',
  'accent-foreground',
  'accent-soft',
  'ink',
  'ink-foreground',
  'ink-muted',
  'success',
  'success-soft',
  'warning',
  'warning-soft',
  'danger',
  'danger-soft',
  'info',
  'info-soft',
  'ring',
  'shadow',
] as const;

export type ColorName = (typeof colorNames)[number];
export type Rgb = `${number} ${number} ${number}`;
export type Palette = Record<ColorName, Rgb>;

/**
 * "Zellige & Ink" (ADR 0009). Warm paper neutrals, deep zellige green, brass accent,
 * Majorelle blue for info, terracotta for danger. `ink` is the always-dark brand surface.
 */
export const light: Palette = {
  background: '250 248 243',
  surface: '255 255 255',
  'surface-muted': '244 241 234',
  border: '230 225 215',
  'border-strong': '208 201 188',
  text: '24 27 26',
  'text-muted': '94 99 96',
  primary: '14 87 70',
  'primary-foreground': '250 248 243',
  'primary-soft': '222 238 231',
  accent: '140 101 36',
  'accent-foreground': '255 255 255',
  'accent-soft': '247 237 217',
  ink: '15 23 21',
  'ink-foreground': '240 236 226',
  'ink-muted': '160 168 162',
  success: '22 110 70',
  'success-soft': '223 241 230',
  warning: '146 88 6',
  'warning-soft': '252 240 212',
  danger: '170 52 36',
  'danger-soft': '251 229 223',
  info: '40 70 190',
  'info-soft': '227 233 252',
  ring: '14 87 70',
  shadow: '40 32 18',
};

export const dark: Palette = {
  background: '11 14 13',
  surface: '19 23 22',
  'surface-muted': '27 32 30',
  border: '40 46 44',
  'border-strong': '60 68 65',
  text: '237 234 226',
  'text-muted': '154 158 152',
  primary: '104 200 166',
  'primary-foreground': '7 22 17',
  'primary-soft': '19 50 41',
  accent: '219 180 112',
  'accent-foreground': '22 17 8',
  'accent-soft': '50 40 22',
  ink: '7 10 9',
  'ink-foreground': '240 236 226',
  'ink-muted': '150 158 152',
  success: '104 206 146',
  'success-soft': '19 52 34',
  warning: '238 184 92',
  'warning-soft': '58 41 13',
  danger: '240 128 108',
  'danger-soft': '62 26 20',
  info: '140 162 255',
  'info-soft': '26 34 70',
  ring: '104 200 166',
  shadow: '0 0 0',
};

export const radius = { sm: '0.375rem', md: '0.5rem', lg: '0.75rem', xl: '1rem' } as const;

export const fonts = {
  display: 'Fraunces',
  sans: 'Geist',
  mono: 'Geist Mono',
  arabic: 'IBM Plex Sans Arabic',
  arabicDisplay: 'Amiri',
} as const;

/** WCAG 2.x relative luminance / contrast ratio, used by the token tests. */
export function contrast(a: Rgb, b: Rgb): number {
  const lum = (c: Rgb) => {
    const [r = 0, g = 0, bl = 0] = c.split(' ').map((v) => {
      const s = Number(v) / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** `rgb(r, g, b)` string for native APIs that cannot read CSS variables (StatusBar, nav theme). */
export function rgb(palette: Palette, name: ColorName): string {
  return `rgb(${palette[name].split(' ').join(', ')})`;
}
