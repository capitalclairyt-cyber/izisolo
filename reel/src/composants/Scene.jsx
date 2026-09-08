import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_BODY, P } from '../theme';
import { Titre } from './Titre';
import { Telephone, geometrieTelephone } from './Telephone';
import { Navigateur, geometrieNavigateur } from './Navigateur';
import { Fleche } from './Fleche';
import { Carte } from './Carte';

// D'où part la flèche : le milieu du côté de la carte qui regarde la cible.
const departFleche = ({ x, y, w, h, cote }) => {
  if (cote === 'gauche') return { x, y: y + h / 2 };
  if (cote === 'droite') return { x: x + w, y: y + h / 2 };
  if (cote === 'bas') return { x: x + w / 2, y: y + h };
  return { x: x + w / 2, y };
};

// Une scène = titre, mockup qui entre, puis deux points forts fléchés.
export const Scene = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { mockup, callouts } = scene;

  const entree = spring({ frame: frame - 4, fps, config: { damping: 200 }, durationInFrames: 30 });
  const derive = interpolate(frame, [0, durationInFrames], [1, 1.025]);
  const geo = mockup.type === 'telephone'
    ? geometrieTelephone(mockup)
    : geometrieNavigateur(mockup, frame, durationInFrames);

  // Le zoom lent est centré sur le mockup : les cibles des flèches suivent.
  const cx = mockup.x + geo.largeur / 2;
  const cy = mockup.y + geo.hauteur / 2;
  const suit = ({ x, y }) => ({ x: cx + (x - cx) * derive, y: cy + (y - cy) * derive });

  return (
    <AbsoluteFill>
      <Titre eyebrow={scene.eyebrow} lignes={scene.titre} y={200} />
      <div style={{ position: 'absolute', inset: 0, opacity: entree, transform: `translateY(${(1 - entree) * 90}px)` }}>
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${derive})`, transformOrigin: `${cx}px ${cy}px` }}>
          {mockup.type === 'telephone' ? <Telephone {...mockup} /> : <Navigateur {...mockup} />}
        </div>
      </div>
      {callouts.map((c, i) => (
        <div key={i}>
          <Carte {...c.carte} numero={i + 1} label={c.label} sous={c.sous} delai={c.delai} />
          <Fleche de={departFleche(c.carte)} vers={suit(geo.point(c.cible))} courbure={c.courbure} delai={c.delai + 8} />
        </div>
      ))}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1700, textAlign: 'center', fontFamily: FONT_BODY, fontWeight: 500,
        fontSize: 24, letterSpacing: '0.04em', color: P.inkSoft, opacity: 0.8 }}>izisolo.fr</div>
    </AbsoluteFill>
  );
};
