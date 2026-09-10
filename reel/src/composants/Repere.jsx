import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { H, P, W } from '../theme';

// Le repère d'un point fort, dessiné dans les coordonnées de la COMPOSITION
// (1080 × 1920) : un anneau qui cercle le mot sans le couvrir, et une onde qui
// s'en échappe en boucle. C'est la pointe de la flèche du réel, sans la flèche
// (le même dessin que le clip de la landing, à l'échelle du réel).
export const Repere = ({ x, y, delai = 0, fin = 1e9, teinte = P.accent }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame - delai, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2)) });
  const sortie = interpolate(frame, [fin, fin + 8], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (t <= 0 || sortie <= 0) return null;
  const depuis = frame - delai - 12;
  const pulse = depuis > 0 ? (depuis % 42) / 42 : 0;
  const rayon = interpolate(pulse, [0, 1], [12, 40]);
  const opacitePulse = depuis > 0 ? interpolate(pulse, [0, 1], [0.6, 0]) : 0;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: sortie }}>
      <circle cx={x} cy={y} r={rayon} fill="none" stroke={teinte} strokeWidth={3} opacity={opacitePulse} />
      <circle cx={x} cy={y} r={15 * t} fill="none" stroke="#fff" strokeWidth={7} opacity={0.9} />
      <circle cx={x} cy={y} r={15 * t} fill="none" stroke={teinte} strokeWidth={4} />
    </svg>
  );
};
