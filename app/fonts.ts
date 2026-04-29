/**
 * IziSolo · next/font setup
 * ----------------------------------------------------------------
 * À placer dans : src/app/fonts.ts
 *
 * Importe et expose les 3 polices auto-hébergées par Next.js.
 *
 * Usage dans layout.tsx :
 *   import { fraunces, inter, jbMono } from './fonts';
 *
 *   <html
 *     lang="fr"
 *     data-palette="rose"
 *     className={`${fraunces.variable} ${inter.variable} ${jbMono.variable}`}
 *   >
 */

import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';

/** Fraunces — variable font, opsz 9..144 + wght 300..900.
 *  Pas de `weight` ici : on s'appuie sur le mode variable + axes
 *  pour pouvoir contrôler opsz (et wght) via `font-variation-settings`.
 *  JAMAIS italique. */
export const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal'],
  variable: '--font-display',
  display: 'swap',
  axes: ['opsz'],
});

/** Inter — body */
export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

/** JetBrains Mono — labels, eyebrows, données numériques */
export const jbMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono-jb',
  display: 'swap',
});
