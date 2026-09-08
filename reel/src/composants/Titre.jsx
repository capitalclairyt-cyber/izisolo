import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_BODY, FONT_DISPLAY, P } from '../theme';

// Étiquette + titre sur deux lignes, en tête de chaque scène. Chaque ligne
// monte avec un léger décalage, jamais de rebond (damping 200).
export const Titre = ({ eyebrow, lignes, y = 200, delai = 0, taille = 68, align = 'left' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const monte = (i) => {
    const s = spring({ frame: frame - delai - i * 6, fps, config: { damping: 200 }, durationInFrames: 26 });
    return { opacity: interpolate(s, [0, 1], [0, 1]), transform: `translateY(${interpolate(s, [0, 1], [28, 0])}px)` };
  };
  return (
    <div style={{ position: 'absolute', left: 60, right: 60, top: y, textAlign: align }}>
      {eyebrow ? (
        <div style={{ ...monte(0), fontFamily: FONT_BODY, fontWeight: 600, fontSize: 24, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: P.accentDeep, marginBottom: 18 }}>{eyebrow}</div>
      ) : null}
      {lignes.map((l, i) => (
        <div key={i} style={{ ...monte(i + 1), fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: taille, lineHeight: 1.06,
          letterSpacing: '-0.02em', color: P.ink, fontVariationSettings: '"opsz" 120, "SOFT" 30' }}>{l}</div>
      ))}
    </div>
  );
};
