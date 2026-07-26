// Config ESLint flat minimaliste — Next.js 16 + ESLint 9.
// FlatCompat avec next/core-web-vitals casse (circular ref) — on garde des règles de base.
// jsx-uses-vars (2026-07-26, incident CI ratchet) : sans elle, TOUT identifiant
// utilisé uniquement en JSX (icônes, composants) comptait « unused » — ~940
// warnings fantômes qui noyaient les vrais et re-cassaient le plafond à
// chaque nouvelle feature. La règle ne rapporte rien : elle MARQUE l'usage.
import react from 'eslint-plugin-react';

export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'public/sw.js',
      'public/workbox-*.js',
      'public/worker-*.js',
      'public/fallback-*.js',
      '.vercel/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        TextDecoder: 'readonly',
        TextEncoder: 'readonly',
        crypto: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        FormData: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        Blob: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        location: 'readonly',
        history: 'readonly',
        ReadableStream: 'readonly',
        WritableStream: 'readonly',
        TransformStream: 'readonly',
        Image: 'readonly',
        Audio: 'readonly',
        Video: 'readonly',
        getComputedStyle: 'readonly',
        CSS: 'readonly',
        MutationObserver: 'readonly',
        IntersectionObserver: 'readonly',
        ResizeObserver: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        requestIdleCallback: 'readonly',
        cancelIdleCallback: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        Headers: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        MessageChannel: 'readonly',
        structuredClone: 'readonly',
        Notification: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { react },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'react/jsx-uses-vars': 'error',
      'no-undef': 'error',
      'no-debugger': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Service worker custom (bundlé par next-pwa en public/worker-*.js).
    files: ['worker/**/*.js'],
    languageOptions: {
      globals: {
        self: 'readonly',
        caches: 'readonly',
        clients: 'readonly',
        registration: 'readonly',
      },
    },
  },
  {
    // CLIs et specs : la sortie console EST le produit.
    files: ['scripts/**/*.{js,mjs}', 'tests/**/*.js'],
    rules: { 'no-console': 'off' },
  },
  {
    // Sprint 2 audit : la clé service_role ne s'instancie QUE dans
    // lib/supabase-admin.js (le service_role contourne la RLS — son usage
    // doit passer par createAdminClient()/supabaseAdmin, avec scoping tenant).
    files: ['app/**/*.{js,jsx}', 'components/**/*.{js,jsx}', 'hooks/**/*.{js,jsx}'],
    rules: {
      'no-restricted-syntax': ['error', {
        selector: "MemberExpression[property.name='SUPABASE_SERVICE_ROLE_KEY']",
        message: "Clé service_role interdite ici — importe createAdminClient() (ou supabaseAdmin) depuis '@/lib/supabase-admin', et filtre TOUJOURS par tenant.",
      }],
    },
  },
];
