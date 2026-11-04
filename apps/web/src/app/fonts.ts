import localFont from 'next/font/local';

// Bundled, licensed typefaces: no network request at build time or to a third-party font host.
export const geist = localFont({
  src: './fonts/geist-latin.woff2',
  variable: '--font-geist',
  weight: '100 900',
  display: 'swap',
});
export const mono = localFont({
  src: './fonts/geist-mono-latin.woff2',
  variable: '--font-geist-mono',
  weight: '100 900',
  display: 'swap',
  preload: false,
});
export const editorial = localFont({
  src: './fonts/fraunces.woff2',
  variable: '--font-fraunces',
  weight: '400 700',
  display: 'swap',
  preload: false,
});
export const arabic = localFont({
  src: [
    { path: './fonts/plex-arabic.woff2', weight: '400', style: 'normal' },
    { path: './fonts/plex-arabic-semibold.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-plex-arabic',
  display: 'swap',
  preload: false,
});
export const arabicEditorial = localFont({
  src: './fonts/amiri.woff2',
  variable: '--font-amiri',
  weight: '400',
  display: 'swap',
  preload: false,
});

export const fontVariables = [geist, mono, editorial, arabic, arabicEditorial]
  .map((font) => font.variable)
  .join(' ');
