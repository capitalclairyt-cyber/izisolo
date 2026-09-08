import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_BODY, FONT_DISPLAY, P } from '../theme';
import { Goutte } from './Logo';

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

export const Intro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame, fps, config: { damping: 14, stiffness: 120 }, durationInFrames: 30 });
  const nom = spring({ frame: frame - 8, fps, config: { damping: 200 }, durationInFrames: 26 });
  const l1 = spring({ frame: frame - 22, fps, config: { damping: 200 }, durationInFrames: 26 });
  const l2 = spring({ frame: frame - 30, fps, config: { damping: 200 }, durationInFrames: 26 });
  const trait = interpolate(frame, [40, 62], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sous = spring({ frame: frame - 44, fps, config: { damping: 200 }, durationInFrames: 26 });

  const monte = (s) => ({ opacity: s, transform: `translateY(${(1 - s) * 30}px)` });
  const largeurTapis = 560;

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -120 }}>
        <div style={{ transform: `scale(${logo})`, opacity: Math.min(1, logo * 1.4) }}><Goutte size={150} /></div>
        <div style={{ ...monte(nom), fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 118, letterSpacing: '-0.02em', color: P.ink,
          lineHeight: 1, marginTop: 8, fontVariationSettings: '"opsz" 120, "SOFT" 30' }}>IziSolo</div>
        <div style={{ marginTop: 90, textAlign: 'center', fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 96, lineHeight: 1.06,
          letterSpacing: '-0.02em', color: P.ink, fontVariationSettings: '"opsz" 120, "SOFT" 30' }}>
          <div style={monte(l1)}>Moins de soucis.</div>
          <div style={{ ...monte(l2), color: P.accent, position: 'relative', display: 'inline-block', marginTop: 6 }}>
            Plus de tapis.
            <Souligne w={largeurTapis} progression={trait} />
          </div>
        </div>
        <div style={{ ...monte(sous), marginTop: 54, fontFamily: FONT_BODY, fontWeight: 400, fontSize: 32, lineHeight: 1.4, color: P.inkSoft,
          textAlign: 'center', maxWidth: 760 }}>
          L’appli calme des profs de yoga, pilates et danse indépendant·es.
        </div>
      </div>
    </AbsoluteFill>
  );
};
