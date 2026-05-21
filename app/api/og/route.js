/**
 * app/api/og/route.js — Génération dynamique des Open Graph images (1200×630).
 *
 * Pourquoi : quand un lien IziSolo est partagé sur WhatsApp/LinkedIn/Twitter/
 * Slack, l'image affichée vient de cette route. Image générée à la volée,
 * mise en cache côté Vercel CDN, donc 1 seul render par variante.
 *
 * Usage côté page :
 *
 *   export const metadata = {
 *     openGraph: {
 *       images: [{
 *         url: '/api/og?title=Combien%20gagne...&subtitle=Le%20guide%202026',
 *         width: 1200,
 *         height: 630,
 *       }],
 *     },
 *   };
 *
 * Params query :
 *   - title    (str) : grand titre éditorial (~72px serif)
 *   - subtitle (str) : sous-titre (optionnel, ~32px)
 *   - palette  (str) : 'sable' (default) | 'sage' | 'blush' | 'sky'
 *   - eyebrow  (str) : tag du dessus (ex: "Le journal" ou "Paris")
 *
 * Conçu pour passer Satori → SVG → PNG. Limites Satori :
 *   - Pas de display:grid (utiliser flex)
 *   - Pas de CSS variables (passer en dur)
 *   - Pas de transform avancé (rotate ok, mais pas filter:blur etc.)
 */

import { ImageResponse } from 'next/og';

export const runtime = 'nodejs'; // edge plante avec @sentry/nextjs sur certains setups

// Palettes alignées sur celles de la landing (data-palette).
// On hardcode les valeurs RGB car Satori ne supporte pas les CSS vars.
const PALETTES = {
  sable: {
    bgFrom: '#faf4ec',
    bgTo:   '#f3eadd',
    ink:    '#2c2118',
    inkSoft:'#7a6b5c',
    accent: '#b9794d',
  },
  sage: {
    bgFrom: '#f0f4ec',
    bgTo:   '#dde7d3',
    ink:    '#1f2e1a',
    inkSoft:'#5a6b50',
    accent: '#7a9162',
  },
  blush: {
    bgFrom: '#fbf0ec',
    bgTo:   '#f3dcd2',
    ink:    '#2e1a18',
    inkSoft:'#7a5a52',
    accent: '#c87a6a',
  },
  sky: {
    bgFrom: '#eef3f8',
    bgTo:   '#d4e2ee',
    ink:    '#1a242e',
    inkSoft:'#52647a',
    accent: '#5a7d9c',
  },
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const title    = searchParams.get('title')    || 'Moins d\'admin. Plus de présence.';
  const subtitle = searchParams.get('subtitle') || 'L\'outil de gestion calme et beau pour les indépendant·e·s du bien-être.';
  const eyebrow  = searchParams.get('eyebrow')  || '';
  const paletteKey = searchParams.get('palette') || 'sable';
  const p = PALETTES[paletteKey] || PALETTES.sable;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '70px 80px',
          background: `linear-gradient(135deg, ${p.bgFrom} 0%, ${p.bgTo} 100%)`,
        }}
      >
        {/* ─── HEADER : logo wordmark ─── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Logo en SVG inline (cercle terre + I) — version simplifiée */}
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: p.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: p.bgFrom,
              fontSize: '28px',
              fontWeight: 700,
              fontFamily: 'serif',
            }}
          >
            i
          </div>
          <span
            style={{
              fontSize: '32px',
              fontWeight: 600,
              color: p.ink,
              letterSpacing: '-0.01em',
            }}
          >
            IziSolo
          </span>
        </div>

        {/* ─── CONTENT : eyebrow + titre + sous-titre ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '1000px' }}>
          {eyebrow && (
            <span
              style={{
                fontSize: '22px',
                color: p.accent,
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                marginBottom: '18px',
                fontWeight: 600,
              }}
            >
              {eyebrow}
            </span>
          )}

          <h1
            style={{
              fontSize: '76px',
              fontWeight: 600,
              color: p.ink,
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
              margin: 0,
              fontFamily: 'serif',
            }}
          >
            {title}
          </h1>

          {subtitle && (
            <p
              style={{
                fontSize: '30px',
                color: p.inkSoft,
                lineHeight: 1.4,
                margin: '28px 0 0',
                maxWidth: '900px',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* ─── FOOTER : url + wave ornament ─── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: `2px solid ${p.accent}`,
            paddingTop: '24px',
          }}
        >
          <span
            style={{
              fontSize: '26px',
              color: p.ink,
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            izisolo.fr
          </span>
          <span
            style={{
              fontSize: '22px',
              color: p.inkSoft,
              fontStyle: 'italic',
            }}
          >
            Calme & beau pour les indépendant·e·s du bien-être
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      // Cache aggressif côté Vercel CDN : 1 an si paramètres identiques.
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    }
  );
}
