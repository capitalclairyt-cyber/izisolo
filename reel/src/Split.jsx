import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_BODY, P, TEINTES } from './theme';
import { Fond } from './composants/Fond';
import { Titre } from './composants/Titre';
import { Telephone, Ecran, geometrieTelephone } from './composants/Telephone';
import { Carte } from './composants/Carte';
import { Repere } from './composants/Repere';
import { AppelStudio } from './composants/AppelStudio';
import { SPLIT } from './formats';

const fr = (t) => String(t).replace(/ ([?!])/g, ' $1');
const avance = (frame, de, a) => interpolate(frame, [de, a], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });

// En haut, la messagerie de 23 h ; en bas, l'écran de l'appli qui répond à
// chaque message, avec la carte qui le nomme. Le message arrive, et deux
// secondes plus tard la réponse est là : c'est l'« après », sans un mot de plus.
const Message = ({ texte, heure, apparait }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - apparait, fps, config: { damping: 14, stiffness: 160 }, durationInFrames: 28 });
  if (s <= 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, opacity: s,
      transform: `translateY(${(1 - s) * 24}px) scale(${interpolate(s, [0, 1], [0.92, 1])})`, transformOrigin: 'left bottom' }}>
      <div style={{ flex: 'none', width: 46, height: 46, borderRadius: 23, background: `${P.sage}33`, border: `3px solid ${P.sage}55` }} />
      <div>
        <div style={{ background: P.blanc, color: P.ink, padding: '20px 28px', borderRadius: 26, borderBottomLeftRadius: 6,
          fontFamily: FONT_BODY, fontWeight: 500, fontSize: 36, lineHeight: 1.25, boxShadow: '0 8px 22px rgba(44,33,24,0.10)' }}>
          {fr(texte)}
        </div>
        <div style={{ marginTop: 6, marginLeft: 10, fontFamily: FONT_BODY, fontSize: 22, color: P.inkSoft }}>{heure}</div>
      </div>
    </div>
  );
};

const MOCKUP = { x: 60, y: 912, screenW: 470, hauteurEcran: 600 };

export const Split = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entree = spring({ frame: frame - 10, fps, config: { damping: 200 }, durationInFrames: 30 });
  const premier = SPLIT.reponses[0];
  const mockup = { ...MOCKUP, ...premier.ecran };
  const geo = geometrieTelephone(mockup);

  // L'écran affiché : le premier, puis chaque réponse en fondu au-dessus.
  const courant = SPLIT.reponses.reduce((acc, r) => (avance(frame, r.de, r.a) > 0.5 ? r : acc), premier);
  const point = geo.point(courant.cible, courant.defilement);

  return (
    <AbsoluteFill>
      <Fond>
        <Titre eyebrow={SPLIT.eyebrow} lignes={SPLIT.titre} y={170} taille={72} />

        {/* La messagerie de 23 h. */}
        <div style={{ position: 'absolute', left: 90, right: 90, top: 400, height: 476, borderRadius: 36, background: 'rgba(255,255,255,0.55)',
          border: '2px solid rgba(255,255,255,0.8)', boxShadow: '0 16px 40px rgba(44,33,24,0.08)', padding: '26px 30px', boxSizing: 'border-box',
          opacity: entree }}>
          <div style={{ fontFamily: FONT_BODY, fontWeight: 600, fontSize: 22, letterSpacing: '0.12em', textTransform: 'uppercase', color: P.inkSoft, marginBottom: 18 }}>
            23 h · tes messages
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {SPLIT.messages.map((m, i) => <Message key={i} {...m} />)}
          </div>
        </div>

        {/* L'appli qui répond. */}
        <div style={{ position: 'absolute', inset: 0, opacity: entree, transform: `translateY(${(1 - entree) * 60}px)` }}>
          <Telephone {...mockup}>
            <Ecran {...mockup} defilement={premier.defilement} />
            {SPLIT.reponses.slice(1).map((r, i) => {
              const p = avance(frame, r.de, r.a);
              if (p <= 0) return null;
              return <Ecran key={i} screenW={mockup.screenW} {...r.ecran} defilement={r.defilement} style={{ opacity: p }} />;
            })}
          </Telephone>
        </div>
        {SPLIT.reponses.map((r, i) => {
          const suivant = SPLIT.reponses[i + 1];
          return (
            <div key={i}>
              <Carte x={600} y={962 + i * 200} w={420} numero={i + 1} label={r.label} sous={r.sous} delai={r.carte} teinte={TEINTES[i % TEINTES.length]} />
              {courant === r && <Repere x={point.x} y={point.y} delai={r.carte + 6} fin={suivant ? suivant.de : 1e9} teinte={TEINTES[i % TEINTES.length]} />}
            </div>
          );
        })}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1700, textAlign: 'center', fontFamily: FONT_BODY, fontWeight: 500,
          fontSize: 24, letterSpacing: '0.04em', color: P.inkSoft, opacity: 0.8 }}>izisolo.fr</div>
      </Fond>
      <AppelStudio depuis={SPLIT.fin} titre={['Et toi, tes soirées', 'ressemblent à quoi ?']} />
    </AbsoluteFill>
  );
};
