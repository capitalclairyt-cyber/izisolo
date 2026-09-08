import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_BODY } from '../theme';

// La carte d'un point fort : fond de couleur vive (terracotta, sauge…) qui
// tranche avec le sable, texte blanc, numéro dans une pastille claire.
// Entrée avec un léger rebond (damping 12), sortie en fondu à `fin`.
export const Carte = ({ x, y, w, numero, label, sous, teinte, delai = 0, fin = 1e9 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delai, fps, config: { damping: 12, stiffness: 150 }, durationInFrames: 30 });
  const sortie = interpolate(frame, [fin, fin + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, boxSizing: 'border-box', padding: '20px 24px',
      borderRadius: 22, background: teinte, color: '#fff',
      boxShadow: `0 20px 48px ${teinte}66, 0 4px 12px rgba(44,33,24,0.12)`, display: 'flex', gap: 16, alignItems: 'flex-start',
      opacity: Math.min(interpolate(s, [0, 1], [0, 1]), sortie),
      transform: `translateY(${interpolate(s, [0, 1], [26, 0])}px) scale(${interpolate(s, [0, 1], [0.9, 1])})` }}>
      <span style={{ flex: 'none', width: 36, height: 36, borderRadius: 18, background: '#fff', color: teinte, fontFamily: FONT_BODY,
        fontWeight: 700, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>{numero}</span>
      <span>
        <span style={{ display: 'block', fontFamily: FONT_BODY, fontWeight: 700, fontSize: 30, lineHeight: 1.15, letterSpacing: '-0.01em' }}>{label}</span>
        <span style={{ display: 'block', fontFamily: FONT_BODY, fontWeight: 400, fontSize: 23, lineHeight: 1.3, marginTop: 6, opacity: 0.92 }}>{sous}</span>
      </span>
    </div>
  );
};
