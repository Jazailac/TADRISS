import { tadriss } from '@tadriss/eslint-config';

// shared is the only package allowed to call .from()/.rpc() (no `app: true`).
export default tadriss({ tsconfigRootDir: import.meta.dirname });
