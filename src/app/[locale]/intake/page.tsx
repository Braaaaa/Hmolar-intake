import type { AbstractIntlMessages } from 'next-intl';
import { createTranslator } from 'next-intl';

import IntakeForm from '@/app/intake/IntakeForm';
import { type Locale } from '@/i18n/config';

const dictionaries: Record<Locale, () => Promise<AbstractIntlMessages>> = {
  nl: () => import('@/messages/nl.json').then((m) => m.default),
  en: () => import('@/messages/en.json').then((m) => m.default),
  es: () => import('@/messages/es.json').then((m) => m.default),
  pap: () => import('@/messages/pap.json').then((m) => m.default),
};

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const messages = await dictionaries[locale as Locale]();
  const t = createTranslator({ locale, messages, namespace: 'intake' });
  return { title: t('metaTitle') };
}

export default function Page() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl py-6">
        <IntakeForm />
      </div>
    </main>
  );
}
