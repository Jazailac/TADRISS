import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const config: NextConfig = {
  transpilePackages: ['@tadriss/shared', '@tadriss/ui-tokens'],
  typedRoutes: false,
  poweredByHeader: false,
  // Document uploads go through a Server Action: 10 MB of file plus multipart overhead.
  experimental: { serverActions: { bodySizeLimit: '11mb' } },
};

export default withNextIntl(config);
