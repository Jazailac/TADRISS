import nextPlugin from '@next/eslint-plugin-next';
import { tadriss } from '@tadriss/eslint-config';

export default [
  ...tadriss({
    react: true,
    app: true,
    tsconfigRootDir: import.meta.dirname,
    // The only files allowed to read the service-role key (both import 'server-only').
    serviceRoleFiles: ['src/env.server.ts', 'src/lib/supabase/admin.ts'],
  }),
  {
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
];
