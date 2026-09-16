import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_BODY, FONT_DISPLAY } from './theme';
import { Ecran, Telephone, geometrieTelephone } from './composants/Telephone';
import { Repere } from './composants/Repere';
import { Logo } from './composants/Logo';
import { ACTE1, APPEL, DUREE, ECRANS, FRONTIERE, PALETTE as C, PROFILS, TEINTES, ZERO } from './gratuit-scenes';

// Le réel « 0 € » (2026-09-16). Cinq actes, deux formats (9:16 pour les réels,
// 4:5 pour le fil LinkedIn) : la mise en page vient du profil, jamais d'une
// constante écrite ici, pour que les deux tailles restent tenues au même endroit.
// Textes et temps : src/gratuit-scenes.js.

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
// Espace fine insécable avant ? et ! : un signe ne commence jamais une ligne.
const fr = (t) => String(t).replace(/ ([?!])/g, ' $1');

const useMonte = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (depuis, duree = 26, dy = 26) => {
    const s = spring({ frame: frame - depuis, fps, config: { damping: 200 }, durationInFrames: duree });
    return { opacity: s, transform: `translateY(${(1 - s) * dy}px)` };
  };
};

// ── Le fond : lavande nuit, deux halos qui dérivent (rose, sauge) ───────────
const Fond = ({ children }) => {
  const frame = useCurrentFrame();
  const d1 = interpolate(frame, [0, DUREE], [0, 140]);
  const d2 = interpolate(frame, [0, DUREE], [0, -110]);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(155deg, ${C.fond2} 0%, ${C.fond} 58%, #2c1f47 100%)` }}>
      <div style={{ position: 'absolute', left: -260 + d1, top: -200, width: 900, height: 900, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(246,168,191,0.22) 0%, rgba(246,168,191,0) 70%)' }} />
      <div style={{ position: 'absolute', right: -300 + d2, bottom: -160, width: 1000, height: 1000, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(143,215,174,0.20) 0%, rgba(143,215,174,0) 70%)' }} />
      {children}
    </AbsoluteFill>
  );
};

const Eyebrow = ({ L, children, couleur = C.doux, style }) => (
  <div style={{ fontFamily: FONT_BODY, fontWeight: 600, fontSize: L.tailles.eyebrow, letterSpacing: '0.14em',
    textTransform: 'uppercase', color: couleur, ...style }}>
    {children}
  </div>
);

// ── Acte 1 : l'onglet refermé, puis le geste qu'on a fait ───────────────────
const Acte1 = ({ L }) => {
  const frame = useCurrentFrame();
  const monte = useMonte();
  const sortie = interpolate(frame, [ZERO.de - 18, ZERO.de], [1, 0], CLAMP);
  if (sortie <= 0) return null;
  // Quand le pivot arrive, les trois constats s'estompent : c'est la réponse
  // qu'on veut lire, pas le problème.
  const attenue = interpolate(frame, [ACTE1.pivot.apparait, ACTE1.pivot.apparait + 22], [1, 0.42], CLAMP);
  return (
    <div style={{ position: 'absolute', left: L.marge, right: L.marge, top: L.texteHaut, opacity: sortie }}>
      <Eyebrow L={L} style={monte(0)}>{ACTE1.eyebrow}</Eyebrow>
      <div style={{ marginTop: 46, display: 'flex', flexDirection: 'column', gap: 26 }}>
        {ACTE1.lignes.map((l) => {
          const m = monte(l.apparait, 28);
          return (
            <div key={l.texte} style={{ ...m, opacity: Math.min(m.opacity, attenue), fontFamily: FONT_DISPLAY, fontWeight: 500,
              fontSize: L.tailles.ligne, lineHeight: 1.16, letterSpacing: '-0.015em', color: C.creme,
              fontVariationSettings: '"opsz" 120, "SOFT" 30' }}>
              {l.texte}
            </div>
          );
        })}
      </div>
      <div style={{ ...monte(ACTE1.pivot.apparait, 32), marginTop: 56, fontFamily: FONT_DISPLAY, fontWeight: 600,
        fontSize: L.tailles.pivot, lineHeight: 1.08, letterSpacing: '-0.02em', color: C.rose,
        fontVariationSettings: '"opsz" 144, "SOFT" 30' }}>
        {ACTE1.pivot.texte}
      </div>
    </div>
  );
};

// ── Acte 2 : « 0 € » plein écran, puis les trois « sans » ───────────────────
const Zero = ({ L }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const monte = useMonte();
  if (frame < ZERO.de) return null;
  const chiffre = spring({ frame: frame - ZERO.chiffre, fps, config: { damping: 11, stiffness: 120 }, durationInFrames: 34 });
  // À la fin de l'acte, le chiffre file vers le haut et rapetisse : il devient
  // la pastille accrochée au téléphone (même teinte, même mot).
  const depart = interpolate(frame, [ZERO.fin, ZERO.fin + 16], [0, 1], CLAMP);
  // Une fois parti, l'acte ne rend plus RIEN : un fantôme à 0,2 % d'opacité se
  // voyait encore au-dessus du téléphone sur les images fixes (leçon du réel
  // Freemium, 2026-09-14).
  if (depart >= 1) return null;
  const reste = 1 - depart;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        marginTop: -L.H * 0.06, padding: `0 ${L.marge}px` }}>
        <Eyebrow L={L} style={{ ...monte(ZERO.chiffre + 6), opacity: Math.min(monte(ZERO.chiffre + 6).opacity, reste), marginBottom: 26 }}>
          {ZERO.eyebrow}
        </Eyebrow>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.04em', color: C.sauge,
          fontSize: interpolate(depart, [0, 1], [L.tailles.chiffre, L.tailles.chiffrePetit]),
          fontVariationSettings: '"opsz" 144, "SOFT" 30', opacity: Math.min(1, chiffre * 1.4) * reste,
          transform: `scale(${interpolate(chiffre, [0, 1], [0.55, 1])}) translateY(${-depart * L.H * 0.28}px)` }}>
          0 €
        </div>
        <div style={{ ...monte(ZERO.lignes, 28), opacity: Math.min(monte(ZERO.lignes, 28).opacity, reste), marginTop: 34,
          fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: L.tailles.zeroLigne, lineHeight: 1.08, letterSpacing: '-0.02em',
          color: C.creme, fontVariationSettings: '"opsz" 120, "SOFT" 30' }}>
          {ZERO.lignesTexte.map((l) => <div key={l}>{l}</div>)}
        </div>
        <div style={{ ...monte(ZERO.sous, 26), opacity: Math.min(monte(ZERO.sous, 26).opacity, reste), marginTop: 40,
          fontFamily: FONT_BODY, fontWeight: 500, fontSize: L.tailles.sous, lineHeight: 1.5, color: C.doux }}>
          {ZERO.sousTexte.map((l) => <div key={l}>{l}</div>)}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// La pastille « 0 € » accrochée au coin du téléphone : une fois posée, elle ne
// part plus. C'est elle qui tient la promesse pendant les six écrans.
const Pastille = ({ L, depuis }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - depuis, fps, config: { damping: 12, stiffness: 150 }, durationInFrames: 30 });
  const battement = 1 + 0.03 * Math.sin(((frame - depuis) / fps) * Math.PI * 1.4);
  return (
    <div style={{ position: 'absolute', left: L.pastille.x, top: L.pastille.y, opacity: Math.min(1, s * 1.3),
      transform: `rotate(-6deg) scale(${interpolate(s, [0, 1], [0.5, 1]) * battement})`,
      background: C.sauge, color: C.saugeEncre, fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: L.pastille.taille,
      lineHeight: 1, padding: '22px 34px', borderRadius: 999, letterSpacing: '-0.02em',
      boxShadow: '0 20px 48px rgba(20,64,44,0.45)' }}>
      0 €
    </div>
  );
};

// ── Acte 3 : six écrans réels, un mot chacun ────────────────────────────────
const Ecrans = ({ L }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < ECRANS.arrivee) return null;
  const entree = spring({ frame: frame - ECRANS.arrivee, fps, config: { damping: 200 }, durationInFrames: 26 });
  const sortie = interpolate(frame, [ECRANS.fin, ECRANS.fin + 12], [1, 0], CLAMP);
  if (sortie <= 0) return null;

  const i = Math.min(ECRANS.liste.length - 1, Math.max(0, Math.floor((frame - ECRANS.debut) / ECRANS.parEcran)));
  const ecran = ECRANS.liste[i];
  const debutEcran = ECRANS.debut + i * ECRANS.parEcran;
  const precedent = i > 0 ? ECRANS.liste[i - 1] : null;
  const mockup = { ...L.phone, ...ecran };
  const geo = geometrieTelephone(mockup);
  const point = ecran.cible ? geo.point(ecran.cible, ecran.defilement) : null;
  const teinte = TEINTES[i % TEINTES.length];
  const mot = spring({ frame: frame - debutEcran, fps, config: { damping: 200 }, durationInFrames: 18 });
  const sortieMot = interpolate(frame, [debutEcran + ECRANS.parEcran - 9, debutEcran + ECRANS.parEcran - 1], [1, 0], CLAMP);
  const fondu = interpolate(frame, [debutEcran, debutEcran + 8], [0, 1], CLAMP);

  return (
    <AbsoluteFill style={{ opacity: sortie }}>
      <Eyebrow L={L} style={{ position: 'absolute', left: 0, right: 0, top: L.texteHaut - 60, textAlign: 'center', opacity: entree }}>
        {ECRANS.eyebrow}
      </Eyebrow>
      <div style={{ position: 'absolute', left: L.marge, right: L.marge, top: L.texteHaut, textAlign: 'center',
        fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: L.tailles.mot, lineHeight: 1, letterSpacing: '-0.02em',
        color: teinte, fontVariationSettings: '"opsz" 144, "SOFT" 30',
        opacity: Math.min(mot, sortieMot), transform: `translateY(${(1 - mot) * 24}px)` }}>
        {ecran.mot}
      </div>
      <div style={{ position: 'absolute', inset: 0, opacity: entree, transform: `translateY(${(1 - entree) * 60}px)` }}>
        <Telephone {...mockup} bezelCouleur={C.bezel} ombre="0 40px 100px rgba(18,10,36,0.55)">
          {precedent && <Ecran screenW={mockup.screenW} {...precedent} defilement={precedent.defilement} />}
          <Ecran screenW={mockup.screenW} {...ecran} defilement={ecran.defilement} style={{ opacity: fondu }} />
        </Telephone>
      </div>
      {point && <Repere x={point.x} y={point.y} delai={debutEcran + 12} fin={debutEcran + ECRANS.parEcran - 7} teinte={teinte} w={L.W} h={L.H} r={ecran.r} />}
      <Pastille L={L} depuis={ECRANS.debut} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: L.puces, display: 'flex', justifyContent: 'center', gap: 14, opacity: entree }}>
        {ECRANS.liste.map((e, k) => (
          <div key={e.mot} style={{ width: k === i ? 34 : 12, height: 12, borderRadius: 6,
            background: k === i ? teinte : 'rgba(247,242,234,0.28)' }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ── Acte 4 : la frontière, avec l'écran qui la montre ───────────────────────
const Frontiere = ({ L }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const monte = useMonte();
  const d = FRONTIERE.de;
  if (frame < d) return null;
  const entree = spring({ frame: frame - d - 26, fps, config: { damping: 200 }, durationInFrames: 30 });
  const mockup = { ...L.phoneFrontiere, ...FRONTIERE.ecran };
  const point = geometrieTelephone(mockup).point(FRONTIERE.ecran.cible, FRONTIERE.ecran.defilement);
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: L.marge, right: L.marge, top: L.texteHaut - 60, textAlign: 'center' }}>
        <Eyebrow L={L} couleur={C.doux} style={monte(d)}>{fr(FRONTIERE.titre)}</Eyebrow>
        <div style={{ ...monte(d + 12, 30), marginTop: 30, fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: L.tailles.frontiere,
          lineHeight: 1.1, letterSpacing: '-0.02em', color: C.rose, fontVariationSettings: '"opsz" 144, "SOFT" 30' }}>
          {FRONTIERE.texte}
        </div>
        <div style={{ ...monte(d + 44), marginTop: 30, fontFamily: FONT_BODY, fontWeight: 500, fontSize: L.tailles.sous,
          lineHeight: 1.5, color: C.doux }}>
          {FRONTIERE.sous.map((l) => <div key={l}>{l}</div>)}
        </div>
      </div>
      <div style={{ position: 'absolute', inset: 0, opacity: entree, transform: `translateY(${(1 - entree) * 60}px)` }}>
        <Telephone {...mockup} bezelCouleur={C.bezel} ombre="0 40px 100px rgba(18,10,36,0.55)">
          <Ecran screenW={mockup.screenW} {...FRONTIERE.ecran} />
        </Telephone>
      </div>
      <Repere x={point.x} y={point.y} delai={d + 56} teinte={C.rose} w={L.W} h={L.H} r={FRONTIERE.ecran.r} />
    </AbsoluteFill>
  );
};

// ── Acte 5 : l'appel, deux portes ───────────────────────────────────────────
// L'adresse d'abord (on peut la taper, LinkedIn la laisse cliquer depuis la
// légende), le commentaire ensuite (il ouvre un DM). Voile qui monte, comme la
// carte de fin commune des autres formats.
const Appel = ({ L }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const monte = useMonte();
  const d = APPEL.de;
  if (frame < d) return null;
  const voile = interpolate(frame, [d, d + 14], [0, 1], CLAMP);
  const pill = spring({ frame: frame - d - 26, fps, config: { damping: 15, stiffness: 140 }, durationInFrames: 30 });
  const battement = 1 + 0.025 * Math.sin(((frame - d) / fps) * Math.PI * 1.6);
  return (
    <AbsoluteFill style={{ opacity: voile, background: `linear-gradient(155deg, ${C.fond2} 0%, ${C.fond} 58%, #2c1f47 100%)`,
      alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        marginTop: -L.H * 0.03, padding: `0 ${L.marge}px` }}>
        <div style={{ ...monte(d + 4), fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: L.tailles.appel, lineHeight: 1.06,
          letterSpacing: '-0.02em', color: C.creme, fontVariationSettings: '"opsz" 120, "SOFT" 30' }}>
          {APPEL.titre.map((l, i) => <div key={l} style={{ color: i === 1 ? C.sauge : C.creme }}>{l}</div>)}
        </div>
        <div style={{ marginTop: 56, opacity: Math.min(1, pill * 1.3), transform: `scale(${interpolate(pill, [0, 1], [0.86, 1]) * battement})`,
          background: C.creme, color: C.encre, fontFamily: FONT_BODY, fontWeight: 700, fontSize: L.tailles.domaine,
          padding: '26px 64px', borderRadius: 999, letterSpacing: '-0.01em', boxShadow: '0 22px 60px rgba(18,10,36,0.5)' }}>
          {APPEL.domaine}
        </div>
        <div style={{ ...monte(d + 40), marginTop: 34, fontFamily: FONT_BODY, fontWeight: 500, fontSize: L.tailles.sous,
          lineHeight: 1.5, color: C.doux }}>
          {APPEL.sous.map((l) => <div key={l}>{l}</div>)}
        </div>
        <div style={{ ...monte(d + 54), marginTop: 18, fontFamily: FONT_BODY, fontWeight: 400,
          fontSize: Math.round(L.tailles.sous * 0.8), color: 'rgba(211,196,236,0.7)' }}>
          {APPEL.signature}
        </div>
      </div>
      <div style={{ position: 'absolute', left: L.marge, top: L.logo, opacity: 0.9 }}>
        <Logo size={34} couleur={C.rose} encre={C.creme} />
      </div>
    </AbsoluteFill>
  );
};

export const Gratuit = ({ profil = 'reel' }) => {
  const L = PROFILS[profil];
  return (
    <AbsoluteFill>
      <Fond>
        <Acte1 L={L} />
        <Zero L={L} />
        <Ecrans L={L} />
        <Frontiere L={L} />
        <div style={{ position: 'absolute', left: L.marge, top: L.logo, opacity: 0.9 }}>
          <Logo size={34} couleur={C.rose} encre={C.creme} />
        </div>
      </Fond>
      <Appel L={L} />
    </AbsoluteFill>
  );
};

export const DUREE_GRATUIT = DUREE;
