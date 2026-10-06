import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mobileCss, nativewindPreset, webCss } from './generate.ts';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
mkdirSync(dist, { recursive: true });
writeFileSync(join(dist, 'web.css'), webCss());
writeFileSync(join(dist, 'mobile.css'), mobileCss());
writeFileSync(join(dist, 'nativewind-preset.cjs'), nativewindPreset());
console.log('ui-tokens: wrote dist/web.css, dist/mobile.css, dist/nativewind-preset.cjs');
