import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { P, TEINTES } from './theme';
import { SCENES } from './scenes';
import { Ecran } from './composants/Telephone';
import { Doigt } from './composants/Doigt';
import { LARGEUR_CLIP, hauteurClip } from './dimensions';

// Un CLIP pour la landing = l'écran d'une scène du réel, et rien d'autre :
// pas de cadre (la landing fournit le sien en CSS), pas de titre ni de carte
// (le texte de la rangée dit ce qu'il y a à dire). On garde ce qui bouge :
// le doigt, les écrans qui s'enchaînent, le défilement, et un REPÈRE qui pulse
// à chaque endroit que le réel fléchait. Le clip est rendu à la taille exacte
// des captures (720 × 1558, un viewport de téléphone), muet, en boucle sur la
// page : il se termine par un fondu vers le sable et recommence par le même
// fondu, pour que la boucle ne claque pas.
export { LARGEUR_CLIP, hauteurClip };
export const TENUE_FIN = 45; // images ajoutées après la scène : on laisse lire le dernier écran
export const FONDU = 12;

// Dans le réel, le doigt fait 60 px sur un écran de 470 : même proportion ici.
const ECHELLE_DOIGT = LARGEUR_CLIP / 470;

const avance = (frame, de, a) => interpolate(frame, [de, a], [0, 1], {
  extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
});

// Le repère d'un point fort : un disque plein cerclé de blanc, et une onde qui
// s'en échappe en boucle. C'est la pointe de la flèche du réel, sans la flèche.
const Repere = ({ x, y, delai, fin = 1e9, teinte }) => {
  const frame = useCurrentFrame();
  const { height: HAUTEUR_CLIP } = useVideoConfig();
  const t = interpolate(frame - delai, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2)) });
  const sortie = interpolate(frame, [fin, fin + 8], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (t <= 0 || sortie <= 0) return null;
  const depuis = frame - delai - 12;
  const pulse = depuis > 0 ? (depuis % 42) / 42 : 0;
  const rayon = interpolate(pulse, [0, 1], [16, 52]);
  const opacitePulse = depuis > 0 ? interpolate(pulse, [0, 1], [0.6, 0]) : 0;
  return (
    <svg width={LARGEUR_CLIP} height={HAUTEUR_CLIP} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: sortie }}>
      <circle cx={x} cy={y} r={rayon} fill="none" stroke={teinte} strokeWidth={4} opacity={opacitePulse} />
      {/* Un anneau, pas un disque : le repère cercle le mot sans le couvrir. */}
      <circle cx={x} cy={y} r={20 * t} fill="none" stroke="#fff" strokeWidth={9} opacity={0.9} />
      <circle cx={x} cy={y} r={20 * t} fill="none" stroke={teinte} strokeWidth={5} />
    </svg>
  );
};

export const Clip = ({ sceneId }) => {
  const scene = SCENES.find((s) => s.id === sceneId);
  const frame = useCurrentFrame();
  const { durationInFrames, height: HAUTEUR_CLIP } = useVideoConfig();
  const mockup = { ...scene.mockup, x: 0, y: 0, screenW: LARGEUR_CLIP };
  const echelle = LARGEUR_CLIP / mockup.imgW; // 1 pour les captures de 720

  const defilement = scene.defilement
    ? interpolate(frame, scene.defilement.map((k) => k.frame), scene.defilement.map((k) => k.y),
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) })
    : 0;
  const point = ([ix, iy], def = 0) => ({ x: ix * echelle, y: (iy - def) * echelle });

  // Fondu d'entrée et de sortie vers le sable : la boucle ne claque pas.
  const voile = Math.max(
    interpolate(frame, [0, FONDU], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    interpolate(frame, [durationInFrames - FONDU, durationInFrames - 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
  );

  return (
    <AbsoluteFill style={{ background: '#fff', overflow: 'hidden' }}>
      <Ecran {...mockup} defilement={defilement} />
      {(scene.etapes || []).map((e, i) => {
        const p = avance(frame, e.de, e.a);
        if (p <= 0) return null;
        const style = e.effet === 'volet' ? { opacity: Math.min(1, p * 2), clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }
          : e.effet === 'glisse' ? { transform: `translateX(${(1 - p) * 100}%)`, boxShadow: '-20px 0 40px rgba(0,0,0,0.25)' }
          : { opacity: p };
        return <Ecran key={i} screenW={LARGEUR_CLIP} {...e.ecran} style={style} />;
      })}
      {(scene.callouts || []).map((c, i) => {
        const pt = point(c.cible, defilement);
        // Un repère hors de l'écran (cible plus bas que le défilement du moment) ne se dessine pas.
        if (pt.y < 0 || pt.y > HAUTEUR_CLIP) return null;
        return <Repere key={i} x={pt.x} y={pt.y} delai={c.delai + 8} fin={c.fin} teinte={TEINTES[i % TEINTES.length]} />;
      })}
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${ECHELLE_DOIGT})`, transformOrigin: '0 0', pointerEvents: 'none' }}>
        {(scene.taps || []).map((t, i) => {
          const p = point(t.repere);
          return (
            <Doigt key={i} apparait={t.apparait} disparait={t.disparait} pressions={[t.presse]}
              etapes={[{ frame: t.apparait, x: p.x / ECHELLE_DOIGT, y: p.y / ECHELLE_DOIGT }]} />
          );
        })}
      </div>
      <div style={{ position: 'absolute', inset: 0, background: P.bgFrom, opacity: voile, pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};

export const dureeClip = (scene) => scene.duree + TENUE_FIN;
