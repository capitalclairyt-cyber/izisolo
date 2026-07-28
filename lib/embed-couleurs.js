/**
 * lib/embed-couleurs.js — Couleurs personnalisées du planning intégrable.
 *
 * Demande Manon 2026-07-28 : « un sélecteur de couleur » (2 couleurs max,
 * cadrage Colin). On ne laisse JAMAIS une couleur brute peindre du texte :
 * chaque rôle est DÉRIVÉ (assombri/éclairci en HSL) avec un plancher de
 * contraste WCAG vs blanc — une prof qui choisit un jaune pâle obtient
 * quand même des titres lisibles.
 *
 * c1 = couleur principale (titres, heures, CTA, bordures, pied)
 * c2 = optionnelle (pastilles type de cours / prix) — sinon dérivée de c1.
 * Le badge « Complet » reste rouge partout (sémantique, pas décoratif).
 */

// '#AABBCC', 'AABBCC', '#abc' → 'aabbcc' (6 hex minuscules) ; sinon null.
export function parseHexCouleur(brut) {
  if (typeof brut !== 'string') return null;
  let s = brut.trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(s)) s = s.split('').map(ch => ch + ch).join('');
  return /^[0-9a-f]{6}$/.test(s) ? s : null;
}

function hexVersHsl(hex) {
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h, s, l };
}

function hslVersRgb({ h, s, l }) {
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const conv = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [conv(h + 1 / 3), conv(h), conv(h - 1 / 3)].map(v => Math.round(v * 255));
}

const cssRgb = (hsl) => `rgb(${hslVersRgb(hsl).join(', ')})`;

// Luminance relative WCAG d'un triplet HSL.
function luminance(hsl) {
  const [r, g, b] = hslVersRgb(hsl).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrasteVsBlanc = (hsl) => 1.05 / (luminance(hsl) + 0.05);

// Assombrit (à teinte/saturation constantes) jusqu'au contraste cible vs blanc.
function assombrirJusquA(hsl, cible) {
  let out = { ...hsl };
  let garde = 40;
  while (contrasteVsBlanc(out) < cible && out.l > 0.02 && garde-- > 0) {
    out = { ...out, l: Math.max(0.02, out.l - 0.025) };
  }
  return out;
}

const avec = (hsl, patch) => ({ ...hsl, ...patch });
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Dérive les variables CSS de l'embed depuis 1-2 hex validés (sans #).
 * Retourne { '--e-deep': 'rgb(…)', … } — à poser en style inline sur `.emb`
 * (le style inline gagne sur les presets de la feuille).
 */
export function deriverCouleursEmbed(c1Hex, c2Hex) {
  const c1 = hexVersHsl(c1Hex);
  const c2 = c2Hex ? hexVersHsl(c2Hex) : c1;

  // Texte sur blanc : plancher 4.6:1 (petites graisses fortes) — le rôle
  // le plus critique. Les fonds de pastilles sont quasi blancs (L 93-95).
  const deep = assombrirJusquA(c1, 4.6);
  const tagInk = assombrirJusquA(c2, 4.6);

  return {
    '--e-deep': cssRgb(deep),
    '--e-jour': cssRgb(avec(deep, { l: clamp(deep.l + 0.12, 0, 0.55), s: c1.s * 0.7 })),
    '--e-accent': cssRgb(avec(c1, { l: clamp(c1.l, 0.35, 0.72) })),
    '--e-border': cssRgb(avec(c1, { l: 0.9, s: clamp(c1.s, 0, 0.35) })),
    '--e-tag-bg': cssRgb(avec(c2, { l: 0.93, s: clamp(c2.s, 0, 0.55) })),
    '--e-tag-ink': cssRgb(tagInk),
    '--e-prix-bg': cssRgb(avec(c2, { l: 0.955, s: clamp(c2.s, 0, 0.6) })),
    '--e-prix-ink': cssRgb(assombrirJusquA(avec(c2, { l: clamp(c2.l, 0.3, 0.5) }), 4.0)),
    '--e-soft': cssRgb(avec(c1, { s: c1.s * 0.45, l: 0.6 })),
    '--e-ombre': `rgba(${hslVersRgb(avec(c1, { l: 0.35 })).join(', ')}, 0.08)`,
  };
}
