import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Verwijs expliciet naar jouw request-config (staat in src/i18n/request.ts)
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // overige Next opties hier
};

export default withNextIntl(nextConfig);
