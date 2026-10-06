import assert from 'node:assert/strict';
import { test } from 'node:test';
import { colorNames, dark, light } from '../src/tokens.ts';
import { mobileCss, nativewindPreset, webCss } from './generate.ts';

test('light and dark palettes define every colour', () => {
  for (const n of colorNames) {
    assert.match(light[n], /^\d{1,3} \d{1,3} \d{1,3}$/, `light.${n}`);
    assert.match(dark[n], /^\d{1,3} \d{1,3} \d{1,3}$/, `dark.${n}`);
  }
});

test('web css exposes every colour to Tailwind v4 and has a dark block', () => {
  const css = webCss();
  assert.ok(css.includes('.dark {'));
  for (const n of colorNames) assert.ok(css.includes(`--color-${n}: rgb(var(--color-${n}));`), n);
});

test('mobile css and preset cover every colour', () => {
  const css = mobileCss();
  const preset = nativewindPreset();
  for (const n of colorNames) {
    assert.ok(css.includes(`--color-${n}:`), n);
    assert.ok(preset.includes(`rgb(var(--color-${n}) / <alpha-value>)`), n);
  }
});
