import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { H, P, W } from '../theme';

// Le repère d'un point fort, dessiné dans les coordonnées de la COMPOSITION
// (1080 × 1920) : un anneau qui cercle le mot sans le couvrir, et une onde qui
// s'en échappe en boucle. C'est la pointe de la flèche du réel, sans la flèche
// (le même dessin que le clip de la landing, à l'échelle du réel).
// `w` / `h` : la taille de la composition, quand elle n'est pas le 9:16 du réel
// (le format 4:5 du fil LinkedIn, cf. gratuit-scenes.js). Sans eux, le viewBox
// ne collerait pas et l'anneau tomberait à côté du point visé.
export const Repere = ({ x, y, delai = 0, fin = 1e9, teinte = P.accent, w = W, h = H, r = 15 }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame - delai, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2)) });
  const sortie = interpolate(frame, [fin, fin + 8], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (t <= 0 || sortie <= 0) return null;
  const depuis = frame - delai - 12;
  const pulse = depuis > 0 ? (depuis % 42) / 42 : 0;
  // `r` : le rayon de l'anneau. Sur une PASTILLE (un badge, un montant), on
  // l'agrandit pour ENTOURER le mot au lieu de s'asseoir dessus (leçon des
  // images du carrousel, 2026-09-15). L'onde reste proportionnelle, donc le
  // défaut 15 donne exactement l'animation d'avant.
  const rayon = interpolate(pulse, [0, 1], [r * 0.8, r * 2.66]);
  const opacitePulse = depuis > 0 ? interpolate(pulse, [0, 1], [0.6, 0]) : 0;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: sortie }}>
      <circle cx={x} cy={y} r={rayon} fill="none" stroke={teinte} strokeWidth={3} opacity={opacitePulse} />
      <circle cx={x} cy={y} r={r * t} fill="none" stroke="#fff" strokeWidth={7} opacity={0.9} />
      <circle cx={x} cy={y} r={r * t} fill="none" stroke={teinte} strokeWidth={4} />
    </svg>
  );
};
