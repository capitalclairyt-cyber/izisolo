import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_BODY, FONT_DISPLAY, P } from '../theme';
import { Logo } from './Logo';

// La fin : l'essai, ses trois faits vérifiables, et l'adresse dans un bouton.
export const Outro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = (delai) => spring({ frame: frame - delai, fps, config: { damping: 200 }, durationInFrames: 26 });
  const monte = (sp) => ({ opacity: sp, transform: `translateY(${(1 - sp) * 30}px)` });
  const bouton = spring({ frame: frame - 36, fps, config: { damping: 16, stiffness: 140 }, durationInFrames: 30 });
  const lueur = interpolate(frame, [50, 80, 108], [0, 1, 0.6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -80, textAlign: 'center' }}>
        <div style={monte(s(0))}><Logo size={54} /></div>
        <div style={{ ...monte(s(8)), marginTop: 70, fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 92, lineHeight: 1.06,
          letterSpacing: '-0.02em', color: P.ink, fontVariationSettings: '"opsz" 120, "SOFT" 30' }}>
          Essaie-le<br />30 jours.
        </div>
        <div style={{ ...monte(s(18)), marginTop: 36, fontFamily: FONT_BODY, fontWeight: 400, fontSize: 34, lineHeight: 1.45, color: P.inkSoft }}>
          Sans carte. Sans engagement.<br />Ton studio est prêt en dix minutes.
        </div>
        <div style={{ marginTop: 70, opacity: bouton, transform: `scale(${interpolate(bouton, [0, 1], [0.9, 1])})`,
          background: P.accent, color: '#fff', fontFamily: FONT_BODY, fontWeight: 600, fontSize: 40, padding: '26px 64px', borderRadius: 999,
          boxShadow: `0 20px 50px rgba(185,121,77,${0.25 + lueur * 0.2})`, letterSpacing: '0.01em' }}>
          izisolo.fr
        </div>
        <div style={{ ...monte(s(52)), marginTop: 44, fontFamily: FONT_BODY, fontWeight: 500, fontSize: 24, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: P.accentDeep }}>Code LANCEMENT50 · moitié prix 3 mois</div>
      </div>
    </AbsoluteFill>
  );
};
