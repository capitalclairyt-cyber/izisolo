import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_BODY, FONT_DISPLAY, P, TEINTES } from './theme';
import { Fond } from './composants/Fond';
import { Logo } from './composants/Logo';
import { Telephone, Ecran, geometrieTelephone } from './composants/Telephone';
import { Repere } from './composants/Repere';
import { AppelStudio } from './composants/AppelStudio';
import { FREEMIUM as F } from './formats';

const TERRACOTTA = TEINTES[0];
const SAUGE = TEINTES[1];
const fr = (t) => String(t).replace(/ ([?!])/g, ' $1');
const MOCKUP = { x: 277, y: 720, screenW: 470, hauteurEcran: 860 };

// ── Acte 1 : le cahier et le tableur, puis « ils peuvent prendre leur retraite » ──
// Deux notes griffonnées (la question que la prof se pose le dimanche soir),
// dans l'écriture des réels POV, pour que le compte parle d'une seule voix.
const Note = ({ texte, depuis, estompe, rotation }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - depuis, fps, config: { damping: 14, stiffness: 160 }, durationInFrames: 28 });
  return (
    <div style={{ alignSelf: 'flex-start', maxWidth: 820, opacity: Math.min(s, estompe), background: '#fff7d6', color: P.ink, padding: '26px 34px',
      borderRadius: 8, fontFamily: FONT_DISPLAY, fontWeight: 500, fontStyle: 'italic', fontSize: 44, lineHeight: 1.25,
      boxShadow: '0 10px 28px rgba(44,33,24,0.12)', transformOrigin: 'left bottom',
      transform: `rotate(${rotation}deg) translateY(${(1 - s) * 30}px) scale(${interpolate(s, [0, 1], [0.92, 1])})` }}>
      {fr(texte)}
    </div>
  );
};

const Acte1 = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const monte = (depuis, duree = 24) => {
    const s = spring({ frame: frame - depuis, fps, config: { damping: 200 }, durationInFrames: duree });
    return { opacity: s, transform: `translateY(${(1 - s) * 26}px)` };
  };
  // Quand la phrase arrive, les notes s'effacent à moitié ; puis tout part
  // pour laisser la place au « 0 € ».
  const estompe = interpolate(frame, [F.pivot.apparait, F.pivot.apparait + 20], [1, 0.45], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sortie = interpolate(frame, [F.zero.de - 12, F.zero.de], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (sortie <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: 90, right: 90, top: 300, display: 'flex', flexDirection: 'column', gap: 34, opacity: sortie }}>
      <div style={{ ...monte(6), fontFamily: FONT_BODY, fontWeight: 600, fontSize: 30, letterSpacing: '0.12em', textTransform: 'uppercase', color: P.accentDeep }}>
        {F.pov}
      </div>
      <div style={{ ...monte(20, 28), fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 100, lineHeight: 1.04, letterSpacing: '-0.02em', color: P.ink,
        fontVariationSettings: '"opsz" 120, "SOFT" 30', marginBottom: 10 }}>
        {F.titre.map((l, i) => <div key={i}>{l}</div>)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {F.notes.map((n, i) => <Note key={i} texte={n.texte} depuis={n.apparait} estompe={estompe} rotation={i % 2 ? 1 : -1.2} />)}
      </div>
      <div style={{ ...monte(F.pivot.apparait, 30), marginTop: 22, fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 66, lineHeight: 1.1,
        letterSpacing: '-0.015em', color: TERRACOTTA, fontVariationSettings: '"opsz" 120, "SOFT" 30' }}>
        {fr(F.pivot.texte)}
      </div>
    </div>
  );
};

// ── Acte 2 : « 0 € », plein écran, puis les deux lignes ──────────────────────
const Zero = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < F.zero.de) return null;
  const chiffre = spring({ frame: frame - F.zero.chiffre, fps, config: { damping: 11, stiffness: 120 }, durationInFrames: 34 });
  const monte = (depuis, duree = 26) => {
    const s = spring({ frame: frame - depuis, fps, config: { damping: 200 }, durationInFrames: duree });
    return { opacity: s, transform: `translateY(${(1 - s) * 26}px)` };
  };
  // À la fin de l'acte, le chiffre file vers le haut et rapetisse : il
  // devient la pastille accrochée au téléphone (même teinte, même mot).
  const depart = interpolate(frame, [F.zero.fin, F.zero.fin + 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sortieTexte = 1 - depart;
  // Une fois parti, l'acte ne rend plus rien : un fantôme à 0,2 % d'opacité
  // se voyait encore au-dessus du téléphone (attrapé sur les images fixes).
  if (depart >= 1) return null;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -140, textAlign: 'center' }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: interpolate(depart, [0, 1], [300, 90]), lineHeight: 1, letterSpacing: '-0.04em',
          color: SAUGE, fontVariationSettings: '"opsz" 144, "SOFT" 30', opacity: Math.min(1, chiffre * 1.4) * (1 - depart),
          transform: `scale(${interpolate(chiffre, [0, 1], [0.6, 1])}) translateY(${-depart * 520}px)` }}>
          0 €
        </div>
        <div style={{ ...monte(F.zero.lignes, 28), opacity: Math.min(monte(F.zero.lignes, 28).opacity, sortieTexte), marginTop: 30, fontFamily: FONT_DISPLAY, fontWeight: 500,
          fontSize: 92, lineHeight: 1.06, letterSpacing: '-0.02em', color: P.ink, fontVariationSettings: '"opsz" 120, "SOFT" 30' }}>
          {F.zeroLignes.map((l, i) => <div key={i}>{l}</div>)}
        </div>
        <div style={{ ...monte(F.zero.sous), opacity: Math.min(monte(F.zero.sous).opacity, sortieTexte), marginTop: 34, fontFamily: FONT_BODY, fontWeight: 500,
          fontSize: 36, lineHeight: 1.4, color: P.inkSoft, padding: '0 90px' }}>
          {F.zeroSous}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Acte 3 : six écrans réels, un mot chacun, la pastille « 0 € » sur le téléphone ──
const Ecrans = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const debut = F.ecransDebut;
  // Le téléphone n'entre qu'une fois le « 0 € » parti : à 8,6 s, l'image
  // encodée montrait sa silhouette derrière « IziSolo est gratuit ».
  const arrivee = F.zero.fin + 12;
  if (frame < arrivee) return null;
  const s = (delai, duree = 26) => spring({ frame: frame - delai, fps, config: { damping: 200 }, durationInFrames: duree });
  const entree = s(arrivee, 26);
  const sortie = interpolate(frame, [F.ecransFin, F.ecransFin + 12], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (sortie <= 0) return null;

  const i = Math.min(F.ecrans.length - 1, Math.max(0, Math.floor((frame - debut) / F.parEcran)));
  const ecran = F.ecrans[i];
  const debutEcran = debut + i * F.parEcran;
  const mockup = { ...MOCKUP, ...ecran };
  const geo = geometrieTelephone(mockup);
  const point = geo.point(ecran.cible, ecran.defilement);
  const teinte = TEINTES[i % TEINTES.length];
  const mot = s(debutEcran, 18);
  const sortieMot = interpolate(frame, [debutEcran + F.parEcran - 8, debutEcran + F.parEcran - 1], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fondu = interpolate(frame, [debutEcran, debutEcran + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const precedent = i > 0 ? F.ecrans[i - 1] : null;
  const pastille = spring({ frame: frame - debut, fps, config: { damping: 12, stiffness: 150 }, durationInFrames: 30 });
  const battement = 1 + 0.03 * Math.sin(((frame - debut) / fps) * Math.PI * 1.4);

  return (
    <AbsoluteFill style={{ opacity: sortie }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 250, textAlign: 'center', opacity: entree, fontFamily: FONT_BODY, fontWeight: 600,
        fontSize: 28, letterSpacing: '0.12em', textTransform: 'uppercase', color: P.accentDeep }}>
        Tout ça, gratuit
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 330, textAlign: 'center', fontFamily: FONT_DISPLAY, fontWeight: 500,
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
      <Repere x={point.x} y={point.y} delai={debutEcran + 12} fin={debutEcran + F.parEcran - 6} teinte={teinte} />
      {/* La pastille « 0 € » : posée sur le coin du téléphone, elle ne part jamais. */}
      <div style={{ position: 'absolute', left: 660, top: 650, transform: `rotate(-6deg) scale(${interpolate(pastille, [0, 1], [0.5, 1]) * battement})`,
        opacity: Math.min(1, pastille * 1.3), background: SAUGE, color: '#fff', fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 64, lineHeight: 1,
        padding: '22px 34px', borderRadius: 999, letterSpacing: '-0.02em', boxShadow: `0 20px 48px ${SAUGE}66` }}>
        0 €
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1650, display: 'flex', justifyContent: 'center', gap: 14, opacity: entree }}>
        {F.ecrans.map((_, k) => (
          <div key={k} style={{ width: k === i ? 34 : 12, height: 12, borderRadius: 6, background: k === i ? teinte : 'rgba(44,33,24,0.18)' }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ── Acte 4 : la frontière, dite sans détour, avec l'écran qui la montre ─────
const Frontiere = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = F.frontiere.de;
  if (frame < d) return null;
  const monte = (depuis, duree = 26) => {
    const s = spring({ frame: frame - depuis, fps, config: { damping: 200 }, durationInFrames: duree });
    return { opacity: s, transform: `translateY(${(1 - s) * 26}px)` };
  };
  const entree = spring({ frame: frame - d - 30, fps, config: { damping: 200 }, durationInFrames: 30 });
  const mockup = { ...MOCKUP, y: 900, hauteurEcran: 700, ...F.frontiere.ecran };
  const point = geometrieTelephone(mockup).point(F.frontiere.ecran.cible, F.frontiere.ecran.defilement);
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 90, right: 90, top: 300, textAlign: 'center' }}>
        <div style={{ ...monte(d), fontFamily: FONT_BODY, fontWeight: 600, fontSize: 30, letterSpacing: '0.12em', textTransform: 'uppercase', color: P.accentDeep }}>
          {fr(F.frontiere.titre)}
        </div>
        <div style={{ ...monte(d + 14, 30), marginTop: 30, fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 70, lineHeight: 1.1, letterSpacing: '-0.015em',
          color: TERRACOTTA, fontVariationSettings: '"opsz" 120, "SOFT" 30' }}>
          {F.frontiere.texte}
        </div>
        <div style={{ ...monte(d + 44), marginTop: 30, fontFamily: FONT_BODY, fontWeight: 500, fontSize: 36, lineHeight: 1.4, color: P.inkSoft }}>
          {F.frontiere.sous.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
      <div style={{ position: 'absolute', inset: 0, opacity: entree, transform: `translateY(${(1 - entree) * 60}px)` }}>
        <Telephone {...mockup}>
          <Ecran screenW={mockup.screenW} {...F.frontiere.ecran} />
        </Telephone>
      </div>
      <Repere x={point.x} y={point.y} delai={d + 60} teinte={TERRACOTTA} />
    </AbsoluteFill>
  );
};

export const Freemium = () => (
  <AbsoluteFill>
    <Fond>
      <Acte1 />
      <Zero />
      <Ecrans />
      <Frontiere />
      <div style={{ position: 'absolute', left: 90, top: 1700, opacity: 0.85 }}>
        <Logo size={34} />
      </div>
    </Fond>
    <AppelStudio depuis={F.fin} titre={F.finTitre} />
  </AbsoluteFill>
);

export const DUREE_FREEMIUM = F.duree;
