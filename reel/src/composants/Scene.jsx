import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_BODY, P } from '../theme';
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

// L'accueil, le menu qui se déplie sous le doigt, puis la page Agenda qui arrive.
const EcranNavigation = ({ mockup, ecrans, tempo }) => {
  const frame = useCurrentFrame();
  const menu = avance(frame, tempo.menuDe, tempo.menuA);
  const page = avance(frame, tempo.pageDe, tempo.pageA);
  const base = { screenW: mockup.screenW };
  return (
    <>
      <Ecran {...base} {...mockup} />
      {menu > 0 && (
        <Ecran {...base} {...ecrans.menu} style={{ opacity: Math.min(1, menu * 2), clipPath: `inset(0 ${(1 - menu) * 100}% 0 0)` }} />
      )}
      {page > 0 && (
        <Ecran {...base} {...ecrans.agenda} style={{ transform: `translateX(${(1 - page) * 100}%)`, boxShadow: '-20px 0 40px rgba(0,0,0,0.25)' }} />
      )}
    </>
  );
};

// Une scène = titre, téléphone qui entre, puis deux points forts fléchés.
export const Scene = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { mockup, callouts } = scene;

  const entree = spring({ frame: frame - 4, fps, config: { damping: 200 }, durationInFrames: 30 });
  const derive = interpolate(frame, [0, durationInFrames], [1, 1.025]);
  const geo = geometrieTelephone(mockup);

  // Défilement de l'écran (portail) : lu aux images clés, en px de capture.
  const defilement = scene.defilement
    ? interpolate(frame, scene.defilement.map((k) => k.frame), scene.defilement.map((k) => k.y),
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) })
    : 0;

  // Le zoom lent est centré sur le téléphone : cibles et doigt le suivent.
  const cx = mockup.x + geo.largeur / 2;
  const cy = mockup.y + geo.hauteur / 2;
  const suit = ({ x, y }) => ({ x: cx + (x - cx) * derive, y: cy + (y - cy) * derive });

  const tempo = scene.tempo;
  const reperes = scene.reperes;

  return (
    <AbsoluteFill>
      <Titre eyebrow={scene.eyebrow} lignes={scene.titre} y={200} />
      <div style={{ position: 'absolute', inset: 0, opacity: entree, transform: `translateY(${(1 - entree) * 90}px)` }}>
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${derive})`, transformOrigin: `${cx}px ${cy}px` }}>
          <Telephone {...mockup}>
            {scene.ecran === 'navigation'
              ? <EcranNavigation mockup={mockup} ecrans={scene.ecrans} tempo={tempo} />
              : <Ecran {...mockup} defilement={defilement} />}
          </Telephone>
        </div>
      </div>
      {scene.ecran === 'navigation' && (
        <Doigt
          apparait={tempo.doigt}
          disparait={tempo.doigtParti}
          pressions={[tempo.tapBurger, tempo.tapAgenda]}
          etapes={[
            { frame: tempo.versAgenda, ...suit(geo.point(reperes.burger)) },
            { frame: tempo.tapAgenda - 4, ...suit(geo.point(reperes.agenda)) },
          ]}
        />
      )}
      {callouts.map((c, i) => (
        <div key={i}>
          <Carte {...c.carte} numero={i + 1} label={c.label} sous={c.sous} delai={c.delai} fin={c.fin} />
          <Fleche de={departFleche(c.carte)} vers={suit(geo.point(c.cible, defilement))} courbure={c.courbure} delai={c.delai + 8} fin={c.fin} />
        </div>
      ))}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1700, textAlign: 'center', fontFamily: FONT_BODY, fontWeight: 500,
        fontSize: 24, letterSpacing: '0.04em', color: P.inkSoft, opacity: 0.8 }}>izisolo.fr</div>
    </AbsoluteFill>
  );
};
