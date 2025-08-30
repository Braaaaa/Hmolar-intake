import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => {
  const activeLocale = locale || 'nl';
  const messages = (await import(`../src/messages/${activeLocale}.json`)).default;
  return { locale: activeLocale, messages };
});
