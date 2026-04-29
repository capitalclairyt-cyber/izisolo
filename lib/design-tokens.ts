/**
 * IziSolo · Design tokens (TypeScript)
 * ----------------------------------------------------------------
 * À placer dans : src/lib/design-tokens.ts
 *
 * Source de vérité programmatique, miroir des CSS variables de globals.css.
 * Utilise ces tokens dans les composants quand tu as besoin d'une valeur
 * en runtime (ex : couleur passée à Framer Motion, calcul de spacing).
 *
 * Pour le styling courant : préfère les utilities Tailwind ou les CSS vars.
 */

export const fonts = {
  display: '"Fraunces", "Newsreader", Georgia, serif',
  body: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
} as const;

export const fontStyle = {
  /** RÈGLE : Fraunces toujours weight 500, jamais italique */
  display: {
    fontFamily: fonts.display,
    fontWeight: 500,
    fontStyle: 'normal',
    letterSpacing: '-0.015em',
  },
  displayLarge: {
    fontFamily: fonts.display,
    fontWeight: 500,
    fontStyle: 'normal',
    letterSpacing: '-0.025em',
    fontVariationSettings: '"opsz" 100',
  },
  displayHero: {
    fontFamily: fonts.display,
    fontWeight: 500,
    fontStyle: 'normal',
    letterSpacing: '-0.03em',
    fontVariationSettings: '"opsz" 144',
    fontFeatureSettings: '"tnum"',
  },
} as const;

/* ----------------------------------------------------------------
   PALETTES — 4 thèmes interchangeables
   Active via <html data-palette="rose|sauge|sable|lavande">
   ---------------------------------------------------------------- */
export const palettes = {
  rose: {
    bg: 'oklch(0.985 0.008 60)',
    bgWarm: 'oklch(0.972 0.014 50)',
    surface: 'oklch(1 0 0)',
    surface2: 'oklch(0.97 0.012 50)',
    ink: 'oklch(0.24 0.022 30)',
    inkSoft: 'oklch(0.42 0.022 30)',
    inkMuted: 'oklch(0.58 0.018 30)',
    line: 'oklch(0.91 0.014 40)',
    lineStrong: 'oklch(0.84 0.018 40)',
    accent: 'oklch(0.65 0.10 25)',
    accentDeep: 'oklch(0.52 0.11 25)',
    accentSoft: 'oklch(0.93 0.04 25)',
    accentTint: 'oklch(0.97 0.018 25)',
    accentInk: 'oklch(1 0 0)',
  },
  sauge: {
    bg: 'oklch(0.985 0.008 130)',
    accent: 'oklch(0.6 0.07 145)',
    accentDeep: 'oklch(0.45 0.08 145)',
    /* (étendre selon globals.css si besoin runtime) */
  },
  sable: {
    bg: 'oklch(0.985 0.012 80)',
    accent: 'oklch(0.62 0.09 65)',
    accentDeep: 'oklch(0.48 0.10 60)',
  },
  lavande: {
    bg: 'oklch(0.985 0.008 300)',
    accent: 'oklch(0.6 0.08 295)',
    accentDeep: 'oklch(0.46 0.09 295)',
  },
} as const;

export type PaletteName = keyof typeof palettes;

/* ----------------------------------------------------------------
   TONES SÉMANTIQUES MOBILE
   Pour catégoriser les sessions (rose/sage/sand/lavender/ink)
   et les lignes du hub Profil. NE JAMAIS inventer de couleur ad-hoc.
   ---------------------------------------------------------------- */
export const tones = {
  rose: {
    surface: 'oklch(0.94 0.04 25)',
    ink: 'oklch(0.42 0.10 25)',
    accent: 'oklch(0.62 0.12 25)',
  },
  sage: {
    surface: 'oklch(0.93 0.04 145)',
    ink: 'oklch(0.40 0.06 145)',
    accent: 'oklch(0.55 0.08 145)',
  },
  sand: {
    surface: 'oklch(0.94 0.035 75)',
    ink: 'oklch(0.42 0.06 60)',
    accent: 'oklch(0.58 0.10 65)',
  },
  lavender: {
    surface: 'oklch(0.93 0.035 295)',
    ink: 'oklch(0.40 0.06 295)',
    accent: 'oklch(0.55 0.08 295)',
  },
  ink: {
    surface: 'oklch(0.20 0.02 30)',
    ink: 'oklch(0.98 0.01 30)',
    accent: 'oklch(0.65 0.10 25)',
  },
} as const;

export type ToneName = keyof typeof tones;

/* Mapping discipline → tone (pour SessionCard, ListRow icons) */
export const disciplineTone: Record<string, ToneName> = {
  hatha: 'rose',
  yin: 'rose',
  vinyasa: 'sage',
  pilates: 'sage',
  meditation: 'sand',
  ashtanga: 'sand',
  danse: 'lavender',
  creatif: 'lavender',
  default: 'rose',
};

/* ----------------------------------------------------------------
   SPACING (4px base) + RADIUS + SHADOWS
   ---------------------------------------------------------------- */
export const spacing = {
  1: '4px',  2: '8px',   3: '12px', 4: '16px',
  5: '20px', 6: '24px',  7: '32px', 8: '40px',
  9: '56px', 10: '72px', 11: '96px', 12: '128px',
} as const;

export const mobileSpacing = {
  screenPx: '22px',
  cardPx: '18px',
  cardPy: '16px',
  tabbarH: '80px',
  statusH: '44px',
} as const;

export const radius = {
  xs: '8px',
  sm: '12px',
  md: '16px',
  lg: '22px',
  xl: '28px',
  '2xl': '36px',
  pill: '999px',
} as const;

export const shadows = {
  xs: '0 1px 2px oklch(0.4 0.04 40 / 0.05)',
  sm: '0 2px 8px oklch(0.4 0.04 40 / 0.06), 0 1px 2px oklch(0.4 0.04 40 / 0.04)',
  md: '0 8px 24px oklch(0.4 0.04 40 / 0.08), 0 2px 6px oklch(0.4 0.04 40 / 0.05)',
  lg: '0 24px 48px oklch(0.4 0.04 40 / 0.10), 0 8px 16px oklch(0.4 0.04 40 / 0.06)',
  fab: '0 12px 28px oklch(0.55 0.13 25 / 0.32), 0 4px 10px oklch(0.55 0.13 25 / 0.18)',
  sheet: '0 -8px 32px oklch(0.4 0.04 30 / 0.12)',
} as const;

/* ----------------------------------------------------------------
   ANIMATION
   ---------------------------------------------------------------- */
export const easing = {
  /** out-quart, easing standard */
  base: [0.22, 1, 0.36, 1] as const,
  /** spring punchy (sheet, FAB) */
  spring: [0.34, 1.56, 0.64, 1] as const,
  /** soft (transitions de couleur) */
  soft: [0.4, 0, 0.2, 1] as const,
  /** mobile-specific */
  mobile: [0.32, 0.72, 0.24, 1] as const,
} as const;

export const duration = {
  fast: 0.16,    // 160ms
  med: 0.32,     // 320ms
  slow: 0.6,     // 600ms
  mFast: 0.12,   // 120ms (mobile)
  mMed: 0.24,    // 240ms (mobile)
  mSlow: 0.48,   // 480ms (mobile)
} as const;

/* ----------------------------------------------------------------
   Z-INDEX
   ---------------------------------------------------------------- */
export const z = {
  content: 1,
  tabbar: 50,
  fab: 60,
  sheet: 100,
  toast: 200,
  modal: 300,
} as const;

/* ----------------------------------------------------------------
   ÉCHELLE TYPO MOBILE
   ---------------------------------------------------------------- */
export const mobileFs = {
  '2xs': '10px',
  xs: '11px',
  sm: '13px',
  base: '15px',
  lg: '17px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '28px',
  '4xl': '38px',
  '5xl': '48px',
} as const;

/* ----------------------------------------------------------------
   HELPERS
   ---------------------------------------------------------------- */

/** Récupère un token CSS variable au runtime côté client */
export function cssVar(name: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Switch palette dynamiquement */
export function setPalette(name: PaletteName) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-palette', name);
}
