import { tadriss } from '@tadriss/eslint-config';

export default [
  {
    ignores: [
      'babel.config.js',
      'metro.config.js',
      'tailwind.config.js',
      'expo-env.d.ts',
      '.maestro/**',
    ],
  },
  ...tadriss({ react: true, app: true, tsconfigRootDir: import.meta.dirname }),
];
