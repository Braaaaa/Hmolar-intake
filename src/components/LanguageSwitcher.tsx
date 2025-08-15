'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';

import { type Locale, locales, replaceLocaleInPath } from '@/i18n/config';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value as Locale;
    router.push(replaceLocaleInPath(pathname, newLocale));
  };

  return (
    <select
      className="rounded-md border px-2 py-1"
      value={locale}
      onChange={handleChange}
      aria-label="Change language"
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {l.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
