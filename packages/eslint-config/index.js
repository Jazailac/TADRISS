// Shared flat-config building blocks. Each rule here enforces a rule from CLAUDE.md;
// change them only together with that document.
import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const HEX = String.raw`#[0-9a-fA-F]{3,8}\b`;
const COLOR_FN = String.raw`\b(rgba?|hsla?|oklch)\(`;
// Physical-direction Tailwind utilities that break RTL. Use ps/pe, ms/me, start/end, border-s/e.
const PHYSICAL = String.raw`(^|\s|:)-?(pl|pr|ml|mr|left|right|border-l|border-r|rounded-l|rounded-r|rounded-tl|rounded-tr|rounded-bl|rounded-br|text-left|text-right|scroll-pl|scroll-pr|float-left|float-right)(-|\s|$)`;

/** Rules shared by every package. */
const commonRestrictions = [
  {
    selector: `CallExpression[callee.property.name='select'] > Literal[value=/\\*/]`,
    message: "No select('*'): name the columns explicitly (CLAUDE.md rule 9).",
  },
  {
    selector: `CallExpression[callee.property.name='select'] > TemplateLiteral > TemplateElement[value.raw=/\\*/]`,
    message: "No select('*'): name the columns explicitly (CLAUDE.md rule 9).",
  },
];

const colorRestrictions = [
  {
    selector: `Literal[value=/${HEX}/]`,
    message: 'No hardcoded colours: use @tadriss/ui-tokens (CLAUDE.md rule 13).',
  },
  {
    selector: `TemplateElement[value.raw=/${HEX}/]`,
    message: 'No hardcoded colours: use @tadriss/ui-tokens (CLAUDE.md rule 13).',
  },
  {
    selector: `Literal[value=/${COLOR_FN}/]`,
    message: 'No hardcoded colours: use @tadriss/ui-tokens (CLAUDE.md rule 13).',
  },
  {
    selector: `Literal[value=/${PHYSICAL}/]`,
    message:
      'Use logical utilities (ps/pe, ms/me, start/end, border-s/e) for RTL (CLAUDE.md rule 14).',
  },
  {
    selector: `TemplateElement[value.raw=/${PHYSICAL}/]`,
    message:
      'Use logical utilities (ps/pe, ms/me, start/end, border-s/e) for RTL (CLAUDE.md rule 14).',
  },
];

/** Apps never touch Supabase tables/RPCs/storage directly; they go through @tadriss/shared. */
const dataLayerRestrictions = [
  {
    selector: `CallExpression[callee.type='MemberExpression'][callee.property.name='from']:not([callee.object.name=/^(Array|Buffer|Uint8Array|Object|Set|Map|Promise|Iterator)$/])`,
    message:
      '.from() is only allowed in packages/shared — import a query function (CLAUDE.md rule 10).',
  },
  {
    selector: `CallExpression[callee.type='MemberExpression'][callee.property.name='rpc']`,
    message:
      '.rpc() is only allowed in packages/shared — import an RPC function (CLAUDE.md rule 10).',
  },
];

/** User-visible text must come from next-intl / i18next. */
const i18nRestrictions = [
  {
    selector: `JSXAttribute[name.name=/^(placeholder|alt|title|aria-label|aria-description|label|accessibilityLabel|accessibilityHint)$/] > Literal[value=/[A-Za-z\\u0600-\\u06FF]/]`,
    message: 'No hardcoded UI strings in attributes: use t() (CLAUDE.md rule 12).',
  },
];

const serviceRoleRestriction = {
  selector: `MemberExpression[property.name=/SERVICE_ROLE/]`,
  message:
    'The service-role key may only be read in server-only env modules or Edge Functions (CLAUDE.md rule 6).',
};

/**
 * @param {{ react?: boolean, app?: boolean, serviceRoleFiles?: string[], tsconfigRootDir: string }} opts
 */
export function tadriss(opts) {
  const restrictions = [
    ...commonRestrictions,
    ...(opts.app ? [...colorRestrictions, ...dataLayerRestrictions, ...i18nRestrictions] : []),
  ];
  const withServiceRole = [...restrictions, serviceRoleRestriction];

  return tseslint.config(
    {
      ignores: [
        '**/dist/**',
        '**/.next/**',
        '**/.expo/**',
        '**/coverage/**',
        '**/*.config.*',
        '**/*.d.ts',
        '**/database.types.ts',
      ],
    },
    js.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    {
      languageOptions: {
        globals: { ...globals.node, ...globals.browser },
        parserOptions: { projectService: true, tsconfigRootDir: opts.tsconfigRootDir },
      },
      rules: {
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
        'no-restricted-imports': [
          'error',
          { patterns: [{ group: ['../../*'], message: 'Use the @/ path alias.' }] },
        ],
        'no-restricted-syntax': ['error', ...withServiceRole],
      },
    },
    ...(opts.react
      ? [
          {
            files: ['**/*.tsx'],
            plugins: { react, 'react-hooks': reactHooks },
            settings: { react: { version: 'detect' } },
            rules: {
              ...react.configs.recommended.rules,
              ...reactHooks.configs.recommended.rules,
              'react/react-in-jsx-scope': 'off',
              'react/prop-types': 'off',
              'react/jsx-no-literals': [
                'error',
                {
                  noStrings: true,
                  ignoreProps: true,
                  allowedStrings: ['·', '—', '/', ':', '%', '+', '-', '×', '•'],
                },
              ],
            },
          },
        ]
      : []),
    ...(opts.serviceRoleFiles?.length
      ? [
          {
            files: opts.serviceRoleFiles,
            rules: { 'no-restricted-syntax': ['error', ...restrictions] },
          },
        ]
      : []),
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/e2e/**', '**/scripts/**'],
      rules: {
        'react/jsx-no-literals': 'off',
        'no-restricted-syntax': ['error', ...commonRestrictions],
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
  );
}
