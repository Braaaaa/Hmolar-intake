export const locales = ['nl', 'en', 'es', 'pap'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'nl';
export const localePrefix = 'as-needed' as const;

const localeSet: Set<string> = new Set(locales);
export function isLocale(maybe: string | undefined | null): maybe is Locale {
  return !!maybe && localeSet.has(maybe);
}

export function replaceLocaleInPath(pathname: string, nextLocale: Locale): string {
  const parts = pathname.split('/');
  if (isLocale(parts[1])) {
    parts[1] = nextLocale;
  } else {
    parts.splice(1, 0, nextLocale);
  }
  return parts.join('/').replace(/\/{2,}/g, '/');
}
