// Proves the custom bans fire (and don't fire on legitimate code).
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import { tadriss } from './index.js';

const eslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: [
    ...tadriss({ react: true, app: true, tsconfigRootDir: import.meta.dirname }).map((c) => ({
      ...c,
      languageOptions: { ...c.languageOptions, parserOptions: { ecmaFeatures: { jsx: true } } },
    })),
    // type-aware rules need a TS program; disable them for these snippet tests
    {
      rules: Object.fromEntries(
        Object.keys((await import('typescript-eslint')).default.plugin.rules).map((r) => [
          `@typescript-eslint/${r}`,
          'off',
        ]),
      ),
    },
  ],
});

async function messages(code, file = 'x.tsx') {
  const [res] = await eslint.lintText(code, { filePath: file });
  return res.messages.map((m) => m.message);
}

describe('custom restrictions', () => {
  it.each([
    ["supabase.from('students').select('id')", '.from()'],
    ["supabase.rpc('submit_attendance')", '.rpc()'],
    ["q.select('*')", "select('*')"],
    ["const c = '#ff0000'", 'hardcoded colours'],
    ["const c = 'rgb(1, 2, 3)'", 'hardcoded colours'],
    ["const c = 'flex pl-4'", 'logical utilities'],
    ["const c = 'text-right'", 'logical utilities'],
    ['process.env.SUPABASE_SERVICE_ROLE_KEY', 'service-role'],
    ['const x = <p>Hello</p>', 'Strings not allowed'],
    ['const x = <input placeholder="Email" />', 'UI strings'],
  ])('flags %s', async (code, expected) => {
    const msgs = await messages(code);
    expect(msgs.join('\n')).toMatch(
      new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
    );
  });

  it.each([
    'Array.from([1, 2])',
    "const c = 'flex ps-4 pe-2 ms-auto text-start border-s'",
    "const c = 'bg-primary text-primary-foreground'",
    'const x = <p>{t("hello")}</p>',
    'const x = <input placeholder={t("email")} />',
  ])('allows %s', async (code) => {
    const msgs = await messages(code);
    expect(
      msgs.filter((m) => !/is assigned a value but never used|is not defined/.test(m)),
    ).toEqual([]);
  });
});
