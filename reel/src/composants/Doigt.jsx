import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { P } from '../theme';

// La pression du doigt : un disque translucide qui glisse d'un repère à l'autre,
// s'enfonce à chaque tap et laisse une onde. `etapes` = [{ frame, x, y }] (le
// doigt se déplace entre deux étapes), `pressions` = images où il appuie.
export const Doigt = ({ etapes, pressions = [], apparait = 0, disparait = 1e9 }) => {
  const frame = useCurrentFrame();
  if (frame < apparait || frame > disparait + 8) return null;

  const frames = etapes.map((e) => e.frame);
  const x = etapes.length === 1 ? etapes[0].x
    : interpolate(frame, frames, etapes.map((e) => e.x), { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) });
  const y = etapes.length === 1 ? etapes[0].y
    : interpolate(frame, frames, etapes.map((e) => e.y), { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) });

  const entree = interpolate(frame, [apparait, apparait + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sortie = interpolate(frame, [disparait, disparait + 8], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const opacite = Math.min(entree, sortie);

  // Enfoncement : le disque rétrécit 6 images puis revient.
  let scale = 1;
  let onde = 0;
  for (const p of pressions) {
    const d = frame - p;
    if (d >= 0 && d < 14) scale = interpolate(d, [0, 5, 14], [1, 0.78, 1], { easing: Easing.inOut(Easing.quad) });
    if (d >= 4 && d < 26) onde = interpolate(d, [4, 26], [0, 1]);
  }

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', opacity: opacite }}>
      {onde > 0 && (
        <div style={{ position: 'absolute', left: x - 30 - onde * 40, top: y - 30 - onde * 40, width: 60 + onde * 80, height: 60 + onde * 80,
          borderRadius: '50%', border: `3px solid ${P.accent}`, opacity: 0.6 * (1 - onde) }} />
      )}
      <div style={{ position: 'absolute', left: x - 30, top: y - 30, width: 60, height: 60, borderRadius: '50%',
        background: 'rgba(255,255,255,0.55)', border: '2px solid rgba(255,255,255,0.9)',
        boxShadow: '0 6px 22px rgba(44,33,24,0.35), inset 0 0 0 6px rgba(185,121,77,0.25)',
        transform: `scale(${scale})` }} />
    </div>
  );
};
