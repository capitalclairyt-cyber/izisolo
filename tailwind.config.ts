/**
 * IziSolo · Tailwind config
 * ----------------------------------------------------------------
 * À placer à la racine : tailwind.config.ts
 *
 * Stratégie : Tailwind est branché sur les CSS variables définies
 * dans globals.css. Les utility classes Tailwind consomment donc
 * directement les tokens — quand tu changes une CSS var, Tailwind
 * suit automatiquement. Compatible 4 palettes (rose/sauge/sable/lavande).
 *
 * Compatible Tailwind v3.4+ et v4 (en v4 préférer @theme dans CSS).
 */

import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/pages/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        /* Web tokens (sémantiques, palette-aware) */
        bg: 'var(--c-bg)',
        'bg-warm': 'var(--c-bg-warm)',
        surface: {
          DEFAULT: 'var(--c-surface)',
          2: 'var(--c-surface-2)',
        },
        ink: {
          DEFAULT: 'var(--c-ink)',
          soft: 'var(--c-ink-soft)',
          muted: 'var(--c-ink-muted)',
        },
        line: {
          DEFAULT: 'var(--c-line)',
          strong: 'var(--c-line-strong)',
        },
        accent: {
          DEFAULT: 'var(--c-accent)',
          deep: 'var(--c-accent-deep)',
          soft: 'var(--c-accent-soft)',
          tint: 'var(--c-accent-tint)',
          ink: 'var(--c-accent-ink)',
        },
        secondary: {
          DEFAULT: 'var(--c-secondary)',
          soft: 'var(--c-secondary-soft)',
        },
        success: 'var(--c-success)',
        warn: 'var(--c-warn)',

        /* Mobile tokens */
        m: {
          bg: 'var(--m-bg)',
          'bg-soft': 'var(--m-bg-soft)',
          surface: 'var(--m-surface)',
          'surface-2': 'var(--m-surface-2)',
          'surface-warm': 'var(--m-surface-warm)',
          'surface-dark': 'var(--m-surface-dark)',
          ink: 'var(--m-ink)',
          'ink-soft': 'var(--m-ink-soft)',
          'ink-mute': 'var(--m-ink-mute)',
          'ink-onDark': 'var(--m-ink-onDark)',
          'ink-onDarkSoft': 'var(--m-ink-onDarkSoft)',
          accent: 'var(--m-accent)',
          'accent-deep': 'var(--m-accent-deep)',
          'accent-soft': 'var(--m-accent-soft)',
          line: 'var(--m-line)',
          'line-strong': 'var(--m-line-strong)',
          success: 'var(--m-success)',
          warning: 'var(--m-warning)',
          error: 'var(--m-error)',
          info: 'var(--m-info)',
        },

        /* Tones sémantiques (pour SessionCard, ListRow) */
        tone: {
          'rose': 'var(--m-tone-rose)',
          'rose-ink': 'var(--m-tone-rose-ink)',
          'rose-accent': 'var(--m-tone-rose-accent)',
          'sage': 'var(--m-tone-sage)',
          'sage-ink': 'var(--m-tone-sage-ink)',
          'sage-accent': 'var(--m-tone-sage-accent)',
          'sand': 'var(--m-tone-sand)',
          'sand-ink': 'var(--m-tone-sand-ink)',
          'sand-accent': 'var(--m-tone-sand-accent)',
          'lavender': 'var(--m-tone-lavender)',
          'lavender-ink': 'var(--m-tone-lavender-ink)',
          'lavender-accent': 'var(--m-tone-lavender-accent)',
          'ink': 'var(--m-tone-ink)',
          'ink-text': 'var(--m-tone-ink-text)',
        },
      },

      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },

      fontSize: {
        eyebrow: 'var(--fs-eyebrow)',
        body: 'var(--fs-body)',
        lead: 'var(--fs-lead)',
        h6: 'var(--fs-h6)',
        h5: 'var(--fs-h5)',
        h4: 'var(--fs-h4)',
        h3: 'var(--fs-h3)',
        h2: 'var(--fs-h2)',
        h1: 'var(--fs-h1)',
        /* mobile */
        'm-2xs': '10px',
        'm-xs': '11px',
        'm-sm': '13px',
        'm-base': '15px',
        'm-lg': '17px',
        'm-xl': '20px',
        'm-2xl': '24px',
        'm-3xl': '28px',
        'm-4xl': '38px',
        'm-5xl': '48px',
      },

      spacing: {
        1: '4px',  2: '8px',   3: '12px', 4: '16px',
        5: '20px', 6: '24px',  7: '32px', 8: '40px',
        9: '56px', 10: '72px', 11: '96px', 12: '128px',
        'screen-px': '22px',
        'tabbar-h': '80px',
        'status-h': '44px',
      },

      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
        pill: 'var(--r-pill)',
        /* mobile */
        'm-xs': '8px',
        'm-sm': '12px',
        'm-md': '16px',
        'm-lg': '22px',
        'm-xl': '28px',
        'm-2xl': '36px',
      },

      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        'm-xs': 'var(--m-shadow-xs)',
        'm-sm': 'var(--m-shadow-sm)',
        'm-md': 'var(--m-shadow-md)',
        'm-lg': 'var(--m-shadow-lg)',
        'm-fab': 'var(--m-shadow-fab)',
        'm-sheet': 'var(--m-shadow-sheet)',
      },

      maxWidth: {
        prose: 'var(--maxw-prose)',
        content: 'var(--maxw-content)',
        wide: 'var(--maxw-wide)',
      },

      transitionTimingFunction: {
        base: 'cubic-bezier(0.22, 1, 0.36, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        soft: 'cubic-bezier(0.4, 0, 0.2, 1)',
        mobile: 'cubic-bezier(0.32, 0.72, 0.24, 1)',
      },

      transitionDuration: {
        fast: '160ms',
        med: '320ms',
        slow: '600ms',
        'm-fast': '120ms',
        'm-med': '240ms',
        'm-slow': '480ms',
      },

      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'float-soft': 'float-soft 4s ease-in-out infinite',
        'breath': 'm-breath 3s ease-in-out infinite',
        'pulse-ring': 'm-pulse-ring 2s ease-out infinite',
        'sheet-up': 'm-sheet-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
