import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_BODY, FONT_DISPLAY, P } from '../theme';
import { Logo } from './Logo';

// La carte de fin commune aux formats « déclencheurs » (2026-09-10) : un seul
// geste demandé, commenter STUDIO, qui ouvre un DM. Même appel que les réels
// POV, pour que le compte parle d'une seule voix. Rendue comme un voile qui
// monte à partir de `depuis` (0 = dès la première image de la séquence).
const FlecheBas = ({ progression }) => {
  const longueur = 260;
  return (
    <svg width={120} height={120} viewBox="0 0 120 150" preserveAspectRatio="xMidYMin meet" fill="none" aria-hidden="true">
      <path d="M62 6 C 40 40, 84 70, 58 108 L 58 126" stroke={P.accentDeep} strokeWidth={7} strokeLinecap="round" fill="none"
        strokeDasharray={longueur} strokeDashoffset={longueur * (1 - progression)} />
      <path d="M32 104 L 58 134 L 84 104" stroke={P.accentDeep} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none"
        opacity={progression > 0.9 ? 1 : 0} />
    </svg>
  );
};

export const AppelStudio = ({ depuis = 0, titre = ['Tu veux voir', 'sur tes vrais cours ?'] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < depuis) return null;
  const voile = interpolate(frame, [depuis, depuis + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const monte = (delai, duree = 24) => {
    const s = spring({ frame: frame - depuis - delai, fps, config: { damping: 200 }, durationInFrames: duree });
    return { opacity: s, transform: `translateY(${(1 - s) * 26}px)` };
  };
  const pill = spring({ frame: frame - depuis - 26, fps, config: { damping: 15, stiffness: 140 }, durationInFrames: 30 });
  const fleche = interpolate(frame, [depuis + 44, depuis + 68], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const battement = 1 + 0.025 * Math.sin(((frame - depuis) / fps) * Math.PI * 1.6);

  return (
    <AbsoluteFill style={{ opacity: voile, background: `linear-gradient(160deg, ${P.bgFrom} 0%, ${P.bgTo} 100%)` }}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -60, textAlign: 'center' }}>
          <div style={{ ...monte(6), fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 84, lineHeight: 1.06, letterSpacing: '-0.02em',
            color: P.ink, fontVariationSettings: '"opsz" 120, "SOFT" 30', padding: '0 80px' }}>
            {titre.map((l, i) => <div key={i}>{l}</div>)}
          </div>
          <div style={{ marginTop: 70, opacity: Math.min(1, pill * 1.3), transform: `scale(${interpolate(pill, [0, 1], [0.85, 1]) * battement})`,
            background: P.accent, color: '#fff', fontFamily: FONT_BODY, fontWeight: 700, fontSize: 46, padding: '28px 70px', borderRadius: 999,
            letterSpacing: '0.01em', boxShadow: '0 22px 54px rgba(185,121,77,0.38)' }}>
            Commente STUDIO
          </div>
          <div style={{ ...monte(36), marginTop: 30, fontFamily: FONT_BODY, fontWeight: 400, fontSize: 32, lineHeight: 1.4, color: P.inkSoft }}>
            <div>et je t’envoie le lien en message.</div>
            <div>30 jours gratuits, sans carte.</div>
          </div>
          <div style={{ marginTop: 6 }}><FlecheBas progression={fleche} /></div>
        </div>
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: 90, top: 1700, opacity: 0.85 }}><Logo size={34} /></div>
    </AbsoluteFill>
  );
};

export const DUREE_APPEL = 100;
