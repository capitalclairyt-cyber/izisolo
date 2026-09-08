import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_BODY, P, TEINTES } from '../theme';
import { Titre } from './Titre';
import { Telephone, Ecran, geometrieTelephone } from './Telephone';
import { Fleche } from './Fleche';
import { Carte } from './Carte';
import { Doigt } from './Doigt';

// D'où part la flèche : le milieu du côté de la carte qui regarde la cible.
const departFleche = ({ x, y, w, h, cote }) => {
  if (cote === 'gauche') return { x, y: y + h / 2 };
  if (cote === 'droite') return { x: x + w, y: y + h / 2 };
  if (cote === 'bas') return { x: x + w / 2, y: y + h };
  return { x: x + w / 2, y };
};

const avance = (frame, de, a) => interpolate(frame, [de, a], [0, 1], {
  extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
});

// Des écrans qui s'enchaînent sous le doigt : chaque étape arrive par un
// effet (« volet » = le menu qui se déplie, « glisse » = une page qui pousse
// la précédente, « fondu ») entre les images `de` et `a` de la scène.
const EcranEtapes = ({ mockup, etapes }) => {
  const frame = useCurrentFrame();
  return (
    <>
      <Ecran {...mockup} />
      {etapes.map((e, i) => {
        const p = avance(frame, e.de, e.a);
        if (p <= 0) return null;
        const style = e.effet === 'volet' ? { opacity: Math.min(1, p * 2), clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }
          : e.effet === 'glisse' ? { transform: `translateX(${(1 - p) * 100}%)`, boxShadow: '-20px 0 40px rgba(0,0,0,0.25)' }
          : { opacity: p };
        return <Ecran key={i} screenW={mockup.screenW} {...e.ecran} style={style} />;
      })}
    </>
  );
};

// Une scène = titre, téléphone qui entre, puis les points forts fléchés.
export const Scene = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { mockup, callouts } = scene;

  const entree = spring({ frame: frame - 4, fps, config: { damping: 200 }, durationInFrames: 30 });
  const derive = interpolate(frame, [0, durationInFrames], [1, 1.025]);
  const geo = geometrieTelephone(mockup);

  // Défilement de l'écran (pleine page) : lu aux images clés, en px de capture.
  const defilement = scene.defilement
    ? interpolate(frame, scene.defilement.map((k) => k.frame), scene.defilement.map((k) => k.y),
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) })
    : 0;

  // Le zoom lent est centré sur le téléphone : cibles et doigt le suivent.
  const cx = mockup.x + geo.largeur / 2;
  const cy = mockup.y + geo.hauteur / 2;
  const suit = ({ x, y }) => ({ x: cx + (x - cx) * derive, y: cy + (y - cy) * derive });

  return (
    <AbsoluteFill>
      <Titre eyebrow={scene.eyebrow} lignes={scene.titre} y={200} />
      <div style={{ position: 'absolute', inset: 0, opacity: entree, transform: `translateY(${(1 - entree) * 90}px)` }}>
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${derive})`, transformOrigin: `${cx}px ${cy}px` }}>
          <Telephone {...mockup}>
            {scene.etapes
              ? <EcranEtapes mockup={mockup} etapes={scene.etapes} />
              : <Ecran {...mockup} defilement={defilement} />}
          </Telephone>
        </div>
      </div>
      {/* Chaque tap est un doigt à part : il arrive, appuie, s'efface. Rien ne
          traîne sur l'écran entre deux gestes (retour Colin : le doigt posé sur
          le burger semblait cliquer sur « Élèves »). */}
      {(scene.taps || []).map((t, i) => (
        <Doigt key={i} apparait={t.apparait} disparait={t.disparait} pressions={[t.presse]}
          etapes={[{ frame: t.apparait, ...suit(geo.point(t.repere)) }]} />
      ))}
      {callouts.map((c, i) => {
        const teinte = TEINTES[i % TEINTES.length];
        return (
          <div key={i}>
            <Carte {...c.carte} numero={i + 1} label={c.label} sous={c.sous} delai={c.delai} fin={c.fin} teinte={teinte} />
            <Fleche de={departFleche(c.carte)} vers={suit(geo.point(c.cible, defilement))} courbure={c.courbure}
              delai={c.delai + 8} fin={c.fin} teinte={teinte} />
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1700, textAlign: 'center', fontFamily: FONT_BODY, fontWeight: 500,
        fontSize: 24, letterSpacing: '0.04em', color: P.inkSoft, opacity: 0.8 }}>izisolo.fr</div>
    </AbsoluteFill>
  );
};
