// eslint.config.mjs
import { FlatCompat } from '@eslint/eslintrc';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const config = [
  // Globale ignores (voorkom lint op build artefacten)
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.husky/**',
      '.pnpm/**',
      'public/**',
      '**/*.map',
      '**/*.d.ts.map',
    ],
  },

  // Next.js + TypeScript presets
  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  // Projectregels, alleen voor je source
  {
    files: ['app/**/*.{ts,tsx,js,jsx}', 'src/**/*.{ts,tsx,js,jsx}', 'pages/**/*.{ts,tsx,js,jsx}'],
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@next/next/no-img-element': 'off',
      'react/no-unescaped-entities': 'off',
      'react/jsx-key': 'warn',
    },
    languageOptions: {
      // zorgt dat TS werkt zonder per‑file projectreferenties
      parserOptions: { project: false },
    },
  },
];

export default config;
