'use client';

/* ================================================================
   IziSolo · Logos & illustrations linéaires
   Adapté du fichier brand.jsx de la landing Claude design.
   ================================================================ */

export function IziSoloLogo({ variant = 'drop', wordmark = true, size = 28 }) {
  const renderMark = () => {
    switch (variant) {
      case 'lotus':
        return (
          <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M16 4 C18 10, 18 16, 16 22 C14 16, 14 10, 16 4 Z" fill="var(--c-accent)" opacity="0.9" />
            <path d="M5 14 C10 14, 14 17, 16 22 C12 22, 7 20, 5 14 Z" fill="var(--c-accent)" opacity="0.55" />
            <path d="M27 14 C22 14, 18 17, 16 22 C20 22, 25 20, 27 14 Z" fill="var(--c-accent)" opacity="0.55" />
            <ellipse cx="16" cy="23" rx="9" ry="2" fill="var(--c-accent-deep)" opacity="0.3" />
          </svg>
        );

      case 'mono':
        return (
          <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <circle cx="16" cy="16" r="15" fill="var(--c-accent)" />
            <text x="16" y="22" textAnchor="middle" fontFamily="var(--font-display)" fontSize="18" fill="var(--c-accent-ink)" fontWeight="500">
              iS
            </text>
          </svg>
        );

      case 'drop':
      default:
        return (
          <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M16 3 C9 11, 5 17, 8 23 C10 27, 14 28, 16 28 C18 28, 22 27, 24 23 C27 17, 23 11, 16 3 Z" fill="var(--c-accent)" />
            <path d="M16 8 C16 14, 16 22, 16 27" stroke="var(--c-accent-ink)" strokeOpacity="0.45" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="16" cy="18" r="1.6" fill="var(--c-accent-ink)" opacity="0.7" />
          </svg>
        );
    }
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: 'var(--c-ink)' }}>
      {renderMark()}
      {wordmark && (
        <span className="serif" style={{ fontSize: size * 0.95, lineHeight: 1, letterSpacing: '-0.02em' }}>
          IziSolo
        </span>
      )}
    </span>
  );
}

export function YogaLotusIllu({ size = 220, stroke = 1.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 220 220" fill="none" aria-hidden="true">
      <g stroke="var(--c-accent)" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7">
        <circle cx="110" cy="68" r="14" />
        <path d="M110 82 C108 100, 110 118, 110 130" />
        <path d="M88 105 C76 118, 70 132, 78 146 C82 152, 92 152, 96 144" />
        <path d="M132 105 C144 118, 150 132, 142 146 C138 152, 128 152, 124 144" />
        <path d="M110 130 C82 132, 60 146, 56 168 C68 172, 90 172, 110 168" />
        <path d="M110 130 C138 132, 160 146, 164 168 C152 172, 130 172, 110 168" />
        <path d="M40 178 C80 184, 140 184, 180 178" opacity="0.5" />
      </g>
    </svg>
  );
}

export function YogaTreeIllu({ size = 220, stroke = 1.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 220 220" fill="none" aria-hidden="true">
      <g stroke="var(--c-accent)" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7">
        <circle cx="110" cy="40" r="11" />
        <path d="M110 51 L110 130" />
        <path d="M110 70 L92 36" />
        <path d="M110 70 L128 36" />
        <path d="M92 36 L110 22 L128 36" />
        <path d="M110 130 L108 180" />
        <path d="M110 130 L130 110 L116 100" />
        <path d="M70 184 L150 184" opacity="0.5" />
      </g>
    </svg>
  );
}

export function SunCurveIllu({ size = 180, stroke = 1.2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 180 180" fill="none" aria-hidden="true">
      <g stroke="var(--c-accent)" strokeWidth={stroke} strokeLinecap="round" fill="none">
        <circle cx="90" cy="90" r="22" opacity="0.8" />
        {[...Array(12)].map((_, i) => {
          const a = (i * Math.PI) / 6;
          const x1 = 90 + Math.cos(a) * 32;
          const y1 = 90 + Math.sin(a) * 32;
          const x2 = 90 + Math.cos(a) * 44;
          const y2 = 90 + Math.sin(a) * 44;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} opacity="0.5" />;
        })}
      </g>
    </svg>
  );
}

export function WaveOrnament({ width = 240, stroke = 1 }) {
  return (
    <svg width={width} height="20" viewBox="0 0 240 20" fill="none" aria-hidden="true">
      <path
        d="M0 10 Q15 0, 30 10 T60 10 T90 10 T120 10 T150 10 T180 10 T210 10 T240 10"
        stroke="var(--c-accent)"
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}
