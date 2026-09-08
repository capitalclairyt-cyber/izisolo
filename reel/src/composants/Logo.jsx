import { FONT_DISPLAY, P } from '../theme';

// La goutte de la nav (components/landing/Brand.js, variante « drop »), en cuivre.
export const Goutte = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path d="M16 3 C9 11, 5 17, 8 23 C10 27, 14 28, 16 28 C18 28, 22 27, 24 23 C27 17, 23 11, 16 3 Z" fill={P.accent} />
    <path d="M16 8 C16 14, 16 22, 16 27" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="16" cy="18" r="1.6" fill="#fff" opacity="0.7" />
  </svg>
);

export const Logo = ({ size = 40, style }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.3, color: P.ink, ...style }}>
    <Goutte size={size} />
    <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: size * 0.95, lineHeight: 1, letterSpacing: '-0.02em',
      fontVariationSettings: '"opsz" 120, "SOFT" 30' }}>IziSolo</span>
  </div>
);
