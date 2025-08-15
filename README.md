# HelloMolar Intake

Meertalig (NL/EN/ES/PAP) intakeformulier voor een tandartspraktijk. Gebouwd met **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, **react-hook-form**, **Zod** en **next-intl v4**. Klaar om uit te breiden naar een volwaardig praktijkmanagementpakket.

## 🚀 Features

- 🌐 Meertalig: Nederlands, Engels, Spaans, Papiamentu (next-intl v4 + middleware)
- 📱 Responsive en toegankelijk
- ✅ Client-side validatie met Zod, formulier met react-hook-form
- 🧠 Logica voor inwoner vs. toerist (Bonaire): verplichte velden wijzigen dynamisch
- 💊 Medische anamnese met meerdere medicaties/allergieën + detailvelden
- 🧹 Codekwaliteit: ESLint, Prettier, TypeScript checks, Husky pre-commit

## 🧱 Tech stack

- **Next.js 15** (App Router, Turbopack)
- **TypeScript**
- **Tailwind CSS 4**
- **react-hook-form** + **@hookform/resolvers**
- **Zod**
- **next-intl v4**

## 📦 Requirements

- Node.js 18+
- PNPM (aanbevolen): `npm i -g pnpm`

## 🔧 Install & run

```bash
pnpm install
pnpm dev
# open http://localhost:3000/nl/intake
```

## 🗂️ Projectstructuur (belangrijkste)

```
src/
  app/
    [locale]/
      layout.tsx            # Intl provider + layout
      intake/page.tsx       # Intake pagina (server)
    intake/IntakeForm.tsx   # Intake formulier (client)
    api/intake/route.ts     # API endpoint (POST)
    globals.css
  components/
    LanguageSwitcher.tsx
  i18n/
    config.ts               # locales, helpers
    request.ts              # next-intl request-config (v4)
  messages/
    nl.json
    en.json
    es.json
    pap.json
  lib/
    validation/
      intake.ts             # Zod schema's + types
middleware.ts               # next-intl middleware
```

## 🌍 i18n (next-intl v4)

- **Plugin** in `next.config.ts` (verplicht in v4):
  ```ts
  import type { NextConfig } from 'next';
  import createNextIntlPlugin from 'next-intl/plugin';

  const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
  const nextConfig: NextConfig = {};
  export default withNextIntl(nextConfig);
  ```
- **Request-config**: `src/i18n/request.ts` (laadt `../messages/${locale}.json`)
- **Middleware**: `middleware.ts` met je locales (matcher voor NL/EN/ES/PAP)
- **Gebruik**:
  - Server: `createTranslator({locale, messages, namespace: 'intake'})`
  - Client: `const t = useTranslations('intake')`

## 🧪 Kwaliteit

```bash
pnpm lint        # ESLint
pnpm lint:fix    # ESLint --fix
pnpm format      # Prettier
pnpm typecheck   # TypeScript
```

## 🔒 Security & privacy (aanbevelingen)

- Log **geen** gevoelige gegevens in productie.
- Voeg **CSRF/CORS** regels toe wanneer je externe clients toelaat.
- Gebruik **env-variabelen** voor API keys/DB connecties (zie `.env.example`).

## 📨 API

`POST /api/intake`

- Body: `IntakeFormData` (zie `src/lib/validation/intake.ts`)
- Validatie server-side via Zod (`IntakeSchema.safeParse`)
- TODO: persist in DB / e-mail notificatie

## 🚀 Deploy

- Vercel of Docker (Node 18+)
- Vergeet niet: `next.config.ts` met next-intl plugin opnemen

## 🤝 Contributie

- Gebruik feature branches + PR’s
- Houd ESLint/Prettier/TypeScript clean
- Schrijf UI-strings uitsluitend via `messages/*.json`
