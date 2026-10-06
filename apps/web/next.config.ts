import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const config: NextConfig = {
  transpilePackages: ['@tadriss/shared', '@tadriss/ui-tokens'],
  typedRoutes: false,
  poweredByHeader: false,
};

export default withNextIntl(config);
