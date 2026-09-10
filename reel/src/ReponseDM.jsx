import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_BODY, FONT_DISPLAY, P, TEINTES } from './theme';
import { Fond } from './composants/Fond';
import { Telephone, Ecran, geometrieTelephone } from './composants/Telephone';
import { Repere } from './composants/Repere';
import { AppelStudio } from './composants/AppelStudio';
import { REPONSE_DM as D } from './formats';

const fr = (t) => String(t).replace(/ ([?!])/g, ' $1');
const MOCKUP = { x: 277, y: 700, screenW: 470, hauteurEcran: 880 };

// La question d'une prof (reçue en DM le 9 septembre, anonymisée), puis huit
// écrans, un mot chacun, deux secondes chacun. Une vraie question vaut plus
// qu'un argumentaire : on y répond, on ne vend pas.
export const ReponseDM = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = (delai, duree = 26) => spring({ frame: frame - delai, fps, config: { damping: 200 }, durationInFrames: duree });
  const bulle = spring({ frame: frame - 8, fps, config: { damping: 14, stiffness: 160 }, durationInFrames: 28 });
  const entree = s(D.debut - 20, 30);

  const i = Math.min(D.ecrans.length - 1, Math.max(0, Math.floor((frame - D.debut) / D.parEcran)));
  const ecran = D.ecrans[i];
  const debutEcran = D.debut + i * D.parEcran;
  const mockup = { ...MOCKUP, ...ecran };
  const geo = geometrieTelephone(mockup);
  const point = geo.point(ecran.cible, ecran.defilement);
  const teinte = TEINTES[i % TEINTES.length];
  // Le mot arrive avec l'écran, monte, et s'efface juste avant le suivant.
  const mot = s(debutEcran, 20);
  const sortieMot = interpolate(frame, [debutEcran + D.parEcran - 8, debutEcran + D.parEcran - 1], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fondu = interpolate(frame, [debutEcran, debutEcran + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const precedent = i > 0 ? D.ecrans[i - 1] : null;

  return (
    <AbsoluteFill>
      <Fond>
        <div style={{ position: 'absolute', left: 90, right: 90, top: 210 }}>
          <div style={{ ...{ opacity: s(0), transform: `translateY(${(1 - s(0)) * 20}px)` }, fontFamily: FONT_BODY, fontWeight: 600, fontSize: 28,
            letterSpacing: '0.12em', textTransform: 'uppercase', color: P.accentDeep, marginBottom: 22 }}>{D.eyebrow}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, opacity: bulle,
            transform: `translateY(${(1 - bulle) * 24}px) scale(${interpolate(bulle, [0, 1], [0.92, 1])})`, transformOrigin: 'left bottom' }}>
            <div style={{ flex: 'none', width: 56, height: 56, borderRadius: 28, background: `${P.sage}33`, border: `3px solid ${P.sage}55` }} />
            <div style={{ background: P.blanc, color: P.ink, padding: '26px 34px', borderRadius: 30, borderBottomLeftRadius: 6, maxWidth: 820,
              fontFamily: FONT_BODY, fontWeight: 500, fontSize: 40, lineHeight: 1.28, boxShadow: '0 10px 28px rgba(44,33,24,0.10)' }}>
              {fr(D.question)}
            </div>
          </div>
        </div>

        {frame >= D.debut - 20 && (
          <>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 560, textAlign: 'center', fontFamily: FONT_DISPLAY, fontWeight: 500,
              fontSize: 96, lineHeight: 1, letterSpacing: '-0.02em', color: teinte, fontVariationSettings: '"opsz" 120, "SOFT" 30',
              opacity: Math.min(mot, sortieMot), transform: `translateY(${(1 - mot) * 24}px)` }}>
              {ecran.mot}
            </div>
            <div style={{ position: 'absolute', inset: 0, opacity: entree, transform: `translateY(${(1 - entree) * 60}px)` }}>
              <Telephone {...mockup}>
                {precedent && <Ecran screenW={mockup.screenW} {...precedent} defilement={precedent.defilement} />}
                <Ecran screenW={mockup.screenW} {...ecran} defilement={ecran.defilement} style={{ opacity: fondu }} />
              </Telephone>
            </div>
            <Repere x={point.x} y={point.y} delai={debutEcran + 14} fin={debutEcran + D.parEcran - 6} teinte={teinte} />
            {/* Le compteur d'écrans : huit points, celui en cours en couleur. */}
            <div style={{ position: 'absolute', left: 0, right: 0, top: 1650, display: 'flex', justifyContent: 'center', gap: 14, opacity: entree }}>
              {D.ecrans.map((_, k) => (
                <div key={k} style={{ width: k === i ? 34 : 12, height: 12, borderRadius: 6, background: k === i ? teinte : 'rgba(44,33,24,0.18)' }} />
              ))}
            </div>
          </>
        )}
      </Fond>
      <AppelStudio depuis={D.fin} titre={D.finTitre} />
    </AbsoluteFill>
  );
};
