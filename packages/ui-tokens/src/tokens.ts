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
 * "Courtyard Studio" (ADR 0011). Warm paper neutrals, Majorelle blue and terracotta accents
 * carry the editorial and contemporary Maghreb direction. `ink` is the always-dark brand surface.
 */
export const light: Palette = {
  background: '248 246 240',
  surface: '255 255 255',
  'surface-muted': '239 236 227',
  border: '230 225 215',
  'border-strong': '208 201 188',
  text: '27 33 51',
  'text-muted': '91 98 116',
  primary: '42 67 162',
  'primary-foreground': '250 248 243',
  'primary-soft': '231 235 250',
  accent: '151 66 43',
  'accent-foreground': '255 255 255',
  'accent-soft': '249 234 226',
  ink: '16 24 44',
  'ink-foreground': '240 236 226',
  'ink-muted': '169 180 204',
  success: '22 110 70',
  'success-soft': '223 241 230',
  warning: '146 88 6',
  'warning-soft': '252 240 212',
  danger: '170 52 36',
  'danger-soft': '251 229 223',
  info: '40 70 190',
  'info-soft': '227 233 252',
  ring: '42 67 162',
  shadow: '40 32 18',
};

export const dark: Palette = {
  background: '12 18 32',
  surface: '20 29 47',
  'surface-muted': '28 38 58',
  border: '45 57 79',
  'border-strong': '72 85 107',
  text: '237 234 226',
  'text-muted': '171 183 204',
  primary: '164 187 255',
  'primary-foreground': '14 29 68',
  'primary-soft': '31 47 85',
  accent: '241 174 145',
  'accent-foreground': '22 17 8',
  'accent-soft': '62 39 34',
  ink: '9 15 28',
  'ink-foreground': '240 236 226',
  'ink-muted': '169 180 204',
  success: '104 206 146',
  'success-soft': '19 52 34',
  warning: '238 184 92',
  'warning-soft': '58 41 13',
  danger: '240 128 108',
  'danger-soft': '62 26 20',
  info: '140 162 255',
  'info-soft': '26 34 70',
  ring: '164 187 255',
  shadow: '0 0 0',
};

export const radius = { sm: '0.5rem', md: '0.75rem', lg: '1rem', xl: '1.5rem' } as const;

export const motion = {
  fast: '140ms',
  normal: '240ms',
  scene: '600ms',
  ease: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
} as const;
export const typeScale = {
  hero: 'clamp(2.6rem, 4.5vw, 4.5rem)',
  title: 'clamp(2rem, 3.5vw, 3.5rem)',
} as const;
export const spacing = {
  page: 'clamp(1.25rem, 4vw, 3rem)',
  section: 'clamp(4rem, 8vw, 7rem)',
} as const;

export const fonts = {
  display: 'Fraunces',
  sans: 'Geist',
  mono: 'Geist Mono',
  arabic: 'IBM Plex Sans Arabic',
  arabicDisplay: 'Amiri',
} as const;

/** Experimental web-only direction tokens. These are deliberately separate from the
 * production palette until the product owner selects one direction. */
export const directionThemes = {
  a: {
    background: '10 14 21',
    surface: '20 27 38',
    text: '239 243 249',
    muted: '155 169 188',
    border: '57 70 91',
    primary: '113 167 255',
    accent: '179 151 255',
  },
  b: {
    background: '247 242 234',
    surface: '255 252 247',
    text: '43 38 32',
    muted: '105 96 84',
    border: '222 211 195',
    primary: '34 93 81',
    accent: '176 111 47',
  },
  c: {
    background: '244 238 226',
    surface: '255 252 246',
    text: '34 32 39',
    muted: '101 91 82',
    border: '219 205 185',
    primary: '42 73 168',
    accent: '185 84 56',
  },
  d: {
    background: '8 11 16',
    surface: '18 24 34',
    text: '243 247 250',
    muted: '157 171 188',
    border: '51 65 84',
    primary: '103 204 255',
    accent: '247 155 82',
  },
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
