import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { H, P, W } from '../theme';

// Une flèche courbe qui se DESSINE (dashoffset piloté par l'image courante),
// puis une pointe et un repère qui pulse à l'endroit visé.
const pointBezier = (a, c, b, t) => ({
  x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
  y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
});

export const Fleche = ({ de, vers, courbure = 60, delai = 0, duree = 24, fin = 1e9 }) => {
  const frame = useCurrentFrame();
  const sortie = interpolate(frame, [fin, fin + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (sortie <= 0) return null;
  const t = interpolate(frame - delai, [0, duree], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });
  if (t <= 0) return null;

  // Point de contrôle : le milieu, décalé perpendiculairement de « courbure ».
  const dx = vers.x - de.x;
  const dy = vers.y - de.y;
  const l = Math.hypot(dx, dy) || 1;
  const ctrl = { x: (de.x + vers.x) / 2 - (dy / l) * courbure, y: (de.y + vers.y) / 2 + (dx / l) * courbure };

  // La flèche s'arrête un peu avant la cible, pour laisser respirer le repère.
  const marge = Math.min(26, l * 0.2);
  const bout = pointBezier(de, ctrl, vers, 1 - marge / l);
  const chemin = `M ${de.x} ${de.y} Q ${ctrl.x} ${ctrl.y} ${bout.x} ${bout.y}`;

  let longueur = 0;
  let prev = de;
  for (let i = 1; i <= 60; i++) {
    const p = pointBezier(de, ctrl, bout, i / 60);
    longueur += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  const tete = pointBezier(de, ctrl, bout, t);
  const avant = pointBezier(de, ctrl, bout, Math.max(0, t - 0.02));
  const angle = (Math.atan2(tete.y - avant.y, tete.x - avant.x) * 180) / Math.PI;

  const depuisFin = frame - delai - duree;
  const pulse = depuisFin > 0 ? (depuisFin % 42) / 42 : 0;
  const rayon = interpolate(pulse, [0, 1], [10, 30]);
  const opacitePulse = depuisFin > 0 ? interpolate(pulse, [0, 1], [0.55, 0]) : 0;
  const repere = interpolate(t, [0.85, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: sortie }}>
      <path d={chemin} fill="none" stroke={P.accent} strokeWidth={6} strokeLinecap="round"
        strokeDasharray={longueur} strokeDashoffset={longueur * (1 - t)} />
      <g transform={`translate(${tete.x} ${tete.y}) rotate(${angle})`} opacity={t > 0.05 ? 1 : 0}>
        <path d="M -20 -13 L 2 0 L -20 13" fill="none" stroke={P.accent} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <circle cx={vers.x} cy={vers.y} r={rayon} fill="none" stroke={P.accent} strokeWidth={3} opacity={opacitePulse} />
      <circle cx={vers.x} cy={vers.y} r={9 * repere} fill={P.accent} stroke="#fff" strokeWidth={3} opacity={repere} />
    </svg>
  );
};
