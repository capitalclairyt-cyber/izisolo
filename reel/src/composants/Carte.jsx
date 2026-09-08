import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_BODY, P } from '../theme';

// La carte d'un point fort : un numéro cuivre, un libellé, une ligne de détail.
export const Carte = ({ x, y, w, numero, label, sous, delai = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delai, fps, config: { damping: 18, stiffness: 140 }, durationInFrames: 28 });
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, boxSizing: 'border-box', padding: '20px 24px',
      borderRadius: 20, background: 'rgba(255,255,255,0.94)', border: '1px solid rgba(44,33,24,0.08)',
      boxShadow: '0 18px 44px rgba(44,33,24,0.14)', display: 'flex', gap: 16, alignItems: 'flex-start',
      opacity: interpolate(s, [0, 1], [0, 1]),
      transform: `translateY(${interpolate(s, [0, 1], [22, 0])}px) scale(${interpolate(s, [0, 1], [0.96, 1])})` }}>
      <span style={{ flex: 'none', width: 34, height: 34, borderRadius: 17, background: P.accent, color: '#fff', fontFamily: FONT_BODY,
        fontWeight: 600, fontSize: 19, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>{numero}</span>
      <span>
        <span style={{ display: 'block', fontFamily: FONT_BODY, fontWeight: 600, fontSize: 30, lineHeight: 1.15, color: P.ink }}>{label}</span>
        <span style={{ display: 'block', fontFamily: FONT_BODY, fontWeight: 400, fontSize: 23, lineHeight: 1.3, color: P.inkSoft, marginTop: 6 }}>{sous}</span>
      </span>
    </div>
  );
};
