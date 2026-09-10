import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_BODY, FONT_DISPLAY, P, TEINTES } from './theme';
import { Fond } from './composants/Fond';
import { Logo } from './composants/Logo';
import { CHRONO, CTA, VARIANTES } from './pov-variantes';

const TERRACOTTA = TEINTES[0];

// Espace fine insécable avant « ? » et « ! » : un signe de ponctuation ne
// commence jamais une ligne (attrapé sur « c'était quand / ? »).
const fr = (t) => String(t).replace(/ ([?!])/g, ' $1');

// Un élément qui monte en fondu à partir de `depuis` (jamais de rebond).
const useMontee = (depuis, duree = 24) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - depuis, fps, config: { damping: 200 }, durationInFrames: duree });
  return { opacity: s, transform: `translateY(${(1 - s) * 26}px)` };
};

// Une bulle reçue (messagerie) ou une note griffonnée (post-it), selon la
// variante : le message d'une élève à 23 h, ou la question que la prof se pose.
const Bulle = ({ texte, heure, note, depuis, estompe }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - depuis, fps, config: { damping: 14, stiffness: 160 }, durationInFrames: 28 });
  const opacite = Math.min(s, estompe);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, opacity: opacite,
      transform: `translateY(${(1 - s) * 30}px) scale(${interpolate(s, [0, 1], [0.92, 1])})`, transformOrigin: 'left bottom' }}>
      {note ? null : (
        <div style={{ flex: 'none', width: 56, height: 56, borderRadius: 28, background: `${P.sage}33`, border: `3px solid ${P.sage}55` }} />
      )}
      <div style={{ maxWidth: 800 }}>
        <div style={{ background: note ? '#fff7d6' : P.blanc, color: P.ink, padding: '26px 34px', borderRadius: note ? 8 : 30,
          borderBottomLeftRadius: note ? 8 : 6, fontFamily: note ? FONT_DISPLAY : FONT_BODY, fontWeight: note ? 500 : 500,
          fontStyle: note ? 'italic' : 'normal', fontSize: note ? 44 : 42, lineHeight: 1.25,
          boxShadow: note ? '0 10px 28px rgba(44,33,24,0.12)' : '0 10px 28px rgba(44,33,24,0.10)',
          transform: note ? 'rotate(-1.2deg)' : 'none' }}>
          {fr(texte)}
        </div>
        {heure ? (
          <div style={{ marginTop: 8, marginLeft: 12, fontFamily: FONT_BODY, fontSize: 24, color: P.inkSoft }}>{heure}</div>
        ) : null}
      </div>
    </div>
  );
};

// La flèche vers le bas, main levée, qui pointe l'appel à commenter.
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

export const Pov = ({ varianteId }) => {
  const v = VARIANTES.find((x) => x.id === varianteId) || VARIANTES[0];
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pov = useMontee(CHRONO.pov);
  const titre = useMontee(CHRONO.titre, 28);
  const pivot = useMontee(CHRONO.pivot, 30);
  // Quand la question arrive, les bulles s'effacent à moitié : l'œil doit la lire.
  const estompe = interpolate(frame, [CHRONO.pivot, CHRONO.pivot + 20], [1, 0.45], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pill = spring({ frame: frame - CHRONO.cta, fps, config: { damping: 15, stiffness: 140 }, durationInFrames: 30 });
  const sous = useMontee(CHRONO.cta + 10);
  const fleche = interpolate(frame, [CHRONO.cta + 16, CHRONO.cta + 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // Un battement lent sur le bouton, pour que l'image vive pendant la tenue.
  const battement = 1 + 0.025 * Math.sin(((frame - CHRONO.cta) / fps) * Math.PI * 1.6);

  return (
    <AbsoluteFill>
      <Fond>
        {/* Zone sûre Instagram : rien d'essentiel au-dessus de 200 ni sous 1650. */}
        <div style={{ position: 'absolute', left: 90, right: 90, top: 300, display: 'flex', flexDirection: 'column', gap: 34 }}>
          <div style={{ ...pov, fontFamily: FONT_BODY, fontWeight: 600, fontSize: 30, letterSpacing: '0.12em', textTransform: 'uppercase', color: P.accentDeep }}>
            {v.pov}
          </div>
          <div style={{ ...titre, fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 92, lineHeight: 1.04, letterSpacing: '-0.02em', color: P.ink,
            fontVariationSettings: '"opsz" 120, "SOFT" 30', marginBottom: 26 }}>
            {v.titre.map((l, i) => <div key={i}>{fr(l)}</div>)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            {v.bulles.map((b, i) => <Bulle key={i} {...b} depuis={CHRONO.bulles[i]} estompe={estompe} />)}
          </div>
          <div style={{ ...pivot, marginTop: 34, fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 68, lineHeight: 1.1, letterSpacing: '-0.015em',
            color: TERRACOTTA, fontVariationSettings: '"opsz" 120, "SOFT" 30' }}>
            {fr(v.pivot)}
          </div>
        </div>

        {/* L'appel, ancré en bas, identique sur les cinq variantes. */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1318, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ opacity: Math.min(1, pill * 1.3), transform: `scale(${interpolate(pill, [0, 1], [0.85, 1]) * battement})`,
            background: P.accent, color: '#fff', fontFamily: FONT_BODY, fontWeight: 700, fontSize: 46, padding: '28px 70px', borderRadius: 999,
            letterSpacing: '0.01em', boxShadow: '0 22px 54px rgba(185,121,77,0.38)' }}>
            {CTA.pill}
          </div>
          <div style={{ ...sous, marginTop: 30, textAlign: 'center', fontFamily: FONT_BODY, fontWeight: 400, fontSize: 32, lineHeight: 1.4, color: P.inkSoft }}>
            {CTA.sous.map((l, i) => <div key={i}>{l}</div>)}
          </div>
          <div style={{ marginTop: 6 }}><FlecheBas progression={fleche} /></div>
        </div>

        <div style={{ position: 'absolute', left: 90, top: 1700, opacity: 0.85 }}>
          <Logo size={34} />
        </div>
      </Fond>
    </AbsoluteFill>
  );
};
