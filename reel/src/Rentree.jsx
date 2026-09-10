import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_BODY, P, TEINTES } from './theme';
import { Fond } from './composants/Fond';
import { Titre } from './composants/Titre';
import { Telephone, Ecran, geometrieTelephone } from './composants/Telephone';
import { Carte } from './composants/Carte';
import { Repere } from './composants/Repere';
import { AppelStudio } from './composants/AppelStudio';
import { RENTREE as R } from './formats';

const MOCKUP = { x: 60, y: 520, screenW: 470, hauteurEcran: 1017 };

// L'agenda de la semaine se remplit séance par séance (chaque pastille est un
// morceau de la VRAIE capture, masqué puis révélé avec un léger rebond), puis
// l'écran bascule sur les revenus. Rien n'est dessiné à la main : ce sont les
// pixels du démo, dans l'ordre où une prof les verrait apparaître.
const Pastille = ({ zone, echelle, screenW, agenda, delai }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [x1, y1, x2, y2] = zone;
  const s = spring({ frame: frame - delai, fps, config: { damping: 12, stiffness: 170 }, durationInFrames: 28 });
  const cx = ((x1 + x2) / 2) * echelle;
  const cy = ((y1 + y2) / 2) * echelle;
  return (
    <>
      {/* Le cache blanc : la ligne du jour reste, la séance n'est pas encore posée. */}
      <div style={{ position: 'absolute', left: x1 * echelle - 2, top: y1 * echelle - 2, width: (x2 - x1) * echelle + 4, height: (y2 - y1) * echelle + 4,
        background: '#fff', opacity: 1 - Math.min(1, s * 1.5) }} />
      {s > 0 && (
        <Img src={staticFile(agenda.src)} style={{ position: 'absolute', left: 0, top: 0, width: screenW, height: agenda.imgH * echelle,
          clipPath: `inset(${y1 * echelle}px ${screenW - x2 * echelle}px ${agenda.imgH * echelle - y2 * echelle}px ${x1 * echelle}px)`,
          opacity: Math.min(1, s * 1.5), transform: `scale(${interpolate(s, [0, 1], [0.7, 1])})`, transformOrigin: `${cx}px ${cy}px` }} />
      )}
    </>
  );
};

export const Rentree = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entree = spring({ frame: frame - 10, fps, config: { damping: 200 }, durationInFrames: 30 });
  const mockup = { ...MOCKUP, ...R.agenda };
  const geo = geometrieTelephone(mockup);
  const bascule = interpolate(frame, [R.bascule.de, R.bascule.a], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const revenus = { ...MOCKUP, ...R.revenus };

  return (
    <AbsoluteFill>
      <Fond>
        <Titre eyebrow={R.eyebrow} lignes={R.titre} y={150} taille={70} />
        <div style={{ position: 'absolute', inset: 0, opacity: entree, transform: `translateY(${(1 - entree) * 60}px)` }}>
          <Telephone {...mockup}>
            <Ecran {...mockup} />
            {R.pastilles.map((zone, i) => (
              <Pastille key={i} zone={zone} echelle={geo.echelle} screenW={mockup.screenW} agenda={R.agenda} delai={R.premierePastille + i * R.cadence} />
            ))}
            {bascule > 0 && <Ecran screenW={mockup.screenW} {...R.revenus} style={{ opacity: bascule }} />}
          </Telephone>
        </div>
        <Carte x={560} y={700} w={460} numero={1} label={R.carteAgenda.label} sous={R.carteAgenda.sous} delai={R.carteAgenda.delai} fin={R.bascule.de} teinte={TEINTES[0]} />
        {R.cartesRevenus.map((c, i) => {
          const p = geometrieTelephone(revenus).point(c.cible);
          return (
            <div key={i}>
              <Carte x={560} y={700 + i * 300} w={460} numero={i + 1} label={c.label} sous={c.sous} delai={c.delai} teinte={TEINTES[(i + 1) % TEINTES.length]} />
              <Repere x={p.x} y={p.y} delai={c.delai + 8} teinte={TEINTES[(i + 1) % TEINTES.length]} />
            </div>
          );
        })}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1700, textAlign: 'center', fontFamily: FONT_BODY, fontWeight: 500,
          fontSize: 24, letterSpacing: '0.04em', color: P.inkSoft, opacity: 0.8 }}>izisolo.fr</div>
      </Fond>
      <AppelStudio depuis={R.fin} titre={['Ta rentrée', 'peut encore se ranger.']} />
    </AbsoluteFill>
  );
};
