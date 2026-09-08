import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_BODY, FONT_DISPLAY, P } from '../theme';
import { Logo } from './Logo';
import { Plan } from './Plan';

const CREME = '#faf4ec';
const OMBRE = '0 4px 30px rgba(0,0,0,0.45)';

// La fin : la suite du rush (2,5 → 6,4 s) sous un voile, l'essai, ses faits
// vérifiables, et l'adresse dans un bouton (le code LANCEMENT50 a été retiré
// le 2026-09-08, à la demande de Colin).
export const Outro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = (delai) => spring({ frame: frame - delai, fps, config: { damping: 200 }, durationInFrames: 26 });
  const monte = (sp) => ({ opacity: sp, transform: `translateY(${(1 - sp) * 30}px)` });
  const bouton = spring({ frame: frame - 36, fps, config: { damping: 16, stiffness: 140 }, durationInFrames: 30 });
  const lueur = interpolate(frame, [50, 80, 108], [0, 1, 0.6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const voile = interpolate(frame, [0, 14], [0.4, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      <Plan nom="outro" dureeClip={Math.round(3.9 * fps)} voile={voile} zoom={0.06} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -80, textAlign: 'center', color: CREME, textShadow: OMBRE }}>
          <div style={{ ...monte(s(0)), color: CREME }}><Logo size={54} style={{ color: CREME }} /></div>
          <div style={{ ...monte(s(8)), marginTop: 70, fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 92, lineHeight: 1.06,
            letterSpacing: '-0.02em', fontVariationSettings: '"opsz" 120, "SOFT" 30' }}>
            Essaie-le<br />30 jours.
          </div>
          <div style={{ ...monte(s(18)), marginTop: 36, fontFamily: FONT_BODY, fontWeight: 400, fontSize: 34, lineHeight: 1.45, color: 'rgba(250,244,236,0.88)' }}>
            Sans carte. Sans engagement.<br />Ton studio est prêt en dix minutes.
          </div>
          <div style={{ marginTop: 70, opacity: bouton, transform: `scale(${interpolate(bouton, [0, 1], [0.9, 1])})`,
            background: P.accent, color: '#fff', fontFamily: FONT_BODY, fontWeight: 600, fontSize: 40, padding: '26px 64px', borderRadius: 999,
            boxShadow: `0 20px 50px rgba(185,121,77,${0.25 + lueur * 0.2})`, letterSpacing: '0.01em', textShadow: 'none' }}>
            izisolo.fr
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
