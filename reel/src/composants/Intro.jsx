import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { DUREE_ACCROCHE, FONT_BODY, FONT_DISPLAY, P } from '../theme';
import { Goutte } from './Logo';
import { Plan } from './Plan';

// Le souligné cuivre, main levée, sous « Plus de tapis. » (celui de la landing),
// dessiné de gauche à droite.
const Souligne = ({ w, progression }) => {
  const longueur = w * 1.08;
  return (
    <svg width={w} height={16} viewBox={`0 0 ${w} 16`} fill="none" aria-hidden="true"
      style={{ position: 'absolute', left: 0, bottom: -10 }}>
      <path d={`M2 10 Q ${w * 0.25} 2, ${w * 0.5} 9 T ${w - 2} 7`} stroke={P.accent} strokeWidth={5} strokeLinecap="round" fill="none"
        strokeDasharray={longueur} strokeDashoffset={longueur * (1 - progression)} opacity={0.95} />
    </svg>
  );
};

const CREME = '#faf4ec';
const OMBRE = '0 4px 30px rgba(0,0,0,0.45)';

// L'ouverture : le rush plein cadre (2,5 s), l'accroche qui arrête le pouce,
// puis le voile monte et le titre arrive par-dessus le plan figé.
export const Intro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const T = DUREE_ACCROCHE; // le titre commence ici
  const monte = (s) => ({ opacity: s, transform: `translateY(${(1 - s) * 30}px)` });

  // 1. L'accroche, sur la vidéo nue.
  const accroche = spring({ frame: frame - 5, fps, config: { damping: 200 }, durationInFrames: 24 });
  const accrocheSortie = interpolate(frame, [T - 14, T - 4], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // 2. Le titre, une fois le voile monté.
  const voile = interpolate(frame, [T - 10, T + 6], [0.35, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const logo = spring({ frame: frame - T, fps, config: { damping: 14, stiffness: 120 }, durationInFrames: 30 });
  const nom = spring({ frame: frame - T - 8, fps, config: { damping: 200 }, durationInFrames: 26 });
  const l1 = spring({ frame: frame - T - 22, fps, config: { damping: 200 }, durationInFrames: 26 });
  const l2 = spring({ frame: frame - T - 30, fps, config: { damping: 200 }, durationInFrames: 26 });
  const trait = interpolate(frame, [T + 40, T + 62], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sous = spring({ frame: frame - T - 44, fps, config: { damping: 200 }, durationInFrames: 26 });
  const largeurTapis = 560;

  return (
    <AbsoluteFill>
      <Plan nom="intro" dureeClip={Math.round(2.5 * fps)} voile={voile} />

      {/* L'accroche vit sur le tapis, en bas : fond sombre, et le visage reste dégagé. */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 300, opacity: accrocheSortie }}>
        <div style={{ ...monte(accroche), textAlign: 'center', padding: '0 80px', fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 92,
          lineHeight: 1.08, letterSpacing: '-0.02em', color: CREME, textShadow: OMBRE, fontVariationSettings: '"opsz" 120, "SOFT" 30' }}>
          Prof de yoga, pilates ou danse ?
        </div>
      </AbsoluteFill>

      {frame >= T - 10 && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -120, color: CREME, textShadow: OMBRE }}>
            <div style={{ transform: `scale(${logo})`, opacity: Math.min(1, logo * 1.4) }}><Goutte size={150} /></div>
            <div style={{ ...monte(nom), fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 118, letterSpacing: '-0.02em',
              lineHeight: 1, marginTop: 8, fontVariationSettings: '"opsz" 120, "SOFT" 30' }}>IziSolo</div>
            <div style={{ marginTop: 90, textAlign: 'center', fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 96, lineHeight: 1.06,
              letterSpacing: '-0.02em', fontVariationSettings: '"opsz" 120, "SOFT" 30' }}>
              <div style={monte(l1)}>Moins de soucis.</div>
              <div style={{ ...monte(l2), color: '#e0a071', position: 'relative', display: 'inline-block', marginTop: 6 }}>
                Plus de tapis.
                <Souligne w={largeurTapis} progression={trait} />
              </div>
            </div>
            <div style={{ ...monte(sous), marginTop: 54, fontFamily: FONT_BODY, fontWeight: 400, fontSize: 32, lineHeight: 1.4,
              color: 'rgba(250,244,236,0.88)', textAlign: 'center', maxWidth: 760 }}>
              L’appli calme des profs de yoga, pilates et danse indépendant·es.
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
