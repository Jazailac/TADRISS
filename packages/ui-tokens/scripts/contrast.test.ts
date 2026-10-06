import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contrast, dark, light, type ColorName, type Palette } from '../src/tokens.ts';

// [foreground, background, minimum ratio]. 4.5 = WCAG AA body text, 3 = large text / UI.
const pairs: [ColorName, ColorName, number][] = [
  ['text', 'background', 7],
  ['text', 'surface', 7],
  ['text', 'surface-muted', 7],
  ['text-muted', 'background', 4.5],
  ['text-muted', 'surface', 4.5],
  ['text-muted', 'surface-muted', 4.5],
  ['primary', 'background', 4.5],
  ['primary', 'surface', 4.5],
  ['primary-foreground', 'primary', 4.5],
  ['primary', 'primary-soft', 4.5],
  ['accent', 'surface', 4.5],
  ['accent', 'accent-soft', 4.5],
  ['accent-foreground', 'accent', 4.5],
  ['ink-foreground', 'ink', 7],
  ['ink-muted', 'ink', 4.5],
  ['success', 'success-soft', 4.5],
  ['warning', 'warning-soft', 4.5],
  ['danger', 'danger-soft', 4.5],
  ['info', 'info-soft', 4.5],
  ['success', 'surface', 4.5],
  ['warning', 'surface', 4.5],
  ['danger', 'surface', 4.5],
  ['info', 'surface', 4.5],
  ['border-strong', 'surface', 1.4],
];

for (const [name, palette] of [
  ['light', light],
  ['dark', dark],
] as [string, Palette][]) {
  for (const [fg, bg, min] of pairs) {
    test(`${name}: ${fg} on ${bg} ≥ ${min}`, () => {
      const ratio = contrast(palette[fg], palette[bg]);
      assert.ok(ratio >= min, `${ratio.toFixed(2)} < ${min}`);
    });
  }
}
