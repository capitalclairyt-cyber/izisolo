import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_BODY, FONT_DISPLAY } from './theme';
import { Ecran, Telephone, geometrieTelephone } from './composants/Telephone';
import { Repere } from './composants/Repere';
import { Logo } from './composants/Logo';
import { ACTE1, APPEL, DUREE, ECRANS, ESSENTIEL, PALETTE as C, PHOTOS, PRIX, PROFILS, TEINTES } from './studio-scenes';

// Le réel « plan Studio » (2026-09-23). Cinq actes, deux formats (9:16 / 4:5),
// la mise en page vient du profil. Textes et temps : src/studio-scenes.js.
// Même ossature que Gratuit.jsx (le réel « 0 € »), avec deux différences : les
// actes 1 et 4 s'ouvrent sur une PHOTO de la banque sous un voile, et l'appel
// porte le portrait de Maude.

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const fr = (t) => String(t).replace(/ ([?!:])/g, ' $1');

const useMonte = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (depuis, duree = 26, dy = 26) => {
    const s = spring({ frame: frame - depuis, fps, config: { damping: 200 }, durationInFrames: duree });
    return { opacity: s, transform: `translateY(${(1 - s) * dy}px)` };
  };
};

// ── Le fond : charbon chaud, deux halos (cuivre, sauge) ─────────────────────
const Fond = ({ children }) => {
  const frame = useCurrentFrame();
  const d1 = interpolate(frame, [0, DUREE], [0, 140]);
  const d2 = interpolate(frame, [0, DUREE], [0, -110]);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(155deg, ${C.fond2} 0%, ${C.fond} 58%, #1a1412 100%)` }}>
      <div style={{ position: 'absolute', left: -260 + d1, top: -200, width: 900, height: 900, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(226,167,111,0.20) 0%, rgba(226,167,111,0) 70%)' }} />
      <div style={{ position: 'absolute', right: -300 + d2, bottom: -160, width: 1000, height: 1000, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(159,211,180,0.16) 0%, rgba(159,211,180,0) 70%)' }} />
      {children}
    </AbsoluteFill>
  );
};

// Une photo de la banque, plein cadre, sous un voile qui laisse lire le texte.
// Elle entre en fondu à `de`, sort en fondu à `a`, et zoome lentement pendant
// tout le temps où elle est là (sans jamais bouger d'à-coup).
const Photo = ({ src, de, a, voile = 0.62, focale = '50% 40%' }) => {
  const frame = useCurrentFrame();
  // Une photo qui ouvre le réel est là dès la PREMIÈRE image : c'est elle
  // qu'Instagram montre en vignette et au premier défilement, un fondu depuis
  // le noir donnait une image 0 vide (planche du 2026-09-23).
  const entree = de === 0 ? 1 : interpolate(frame, [de, de + 16], [0, 1], CLAMP);
  const sortie = interpolate(frame, [a - 16, a], [1, 0], CLAMP);
  const op = Math.min(entree, sortie);
  if (op <= 0) return null;
  const scale = 1 + interpolate(frame, [de, a], [0, 0.08], CLAMP);
  return (
    <AbsoluteFill style={{ opacity: op, overflow: 'hidden' }}>
      <Img src={staticFile(src)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
        objectPosition: focale, transform: `scale(${scale})`, transformOrigin: focale }} />
      <div style={{ position: 'absolute', inset: 0,
        background: `linear-gradient(180deg, rgba(36,29,27,${voile - 0.12}) 0%, rgba(36,29,27,${voile}) 45%, rgba(36,29,27,${Math.min(0.94, voile + 0.22)}) 100%)` }} />
    </AbsoluteFill>
  );
};

const Eyebrow = ({ L, children, couleur = C.doux, style }) => (
  <div style={{ fontFamily: FONT_BODY, fontWeight: 600, fontSize: L.tailles.eyebrow, letterSpacing: '0.14em',
    textTransform: 'uppercase', color: couleur, ...style }}>
    {children}
  </div>
);

// ── Acte 1 : le scroll-stop ─────────────────────────────────────────────────
// Une phrase à la fois, énorme, dès la première image. Chaque phrase monte vite
// (14 images), ligne par ligne, et laisse la place à la suivante. La dernière est
// la réponse : elle est entièrement cuivre, sauf sa chute.
const Acte1 = ({ L }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sortieActe = interpolate(frame, [ACTE1.fin - 12, ACTE1.fin], [1, 0], CLAMP);
  if (sortieActe <= 0) return null;
  const phrase = ACTE1.phrases.find((p) => frame >= p.apparait && frame < p.disparait + 8);
  if (!phrase) return null;
  const sortie = interpolate(frame, [phrase.disparait - 6, phrase.disparait], [1, 0], CLAMP);
  const eyebrow = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 18 });
  return (
    <AbsoluteFill style={{ opacity: Math.min(sortie, sortieActe), alignItems: 'center', justifyContent: 'center' }}>
      {/* Un voile de plus, centré sur le texte : la photo reste visible en haut et en bas. */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: '22%', bottom: '18%',
        background: 'radial-gradient(ellipse at 50% 50%, rgba(20,15,13,0.72) 0%, rgba(20,15,13,0.45) 55%, rgba(20,15,13,0) 100%)' }} />
      <div style={{ position: 'absolute', left: L.marge, right: L.marge, top: L.texteHaut - 40, opacity: eyebrow }}>
        <Eyebrow L={L} couleur={C.cuivre}>{ACTE1.eyebrow}</Eyebrow>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: `0 ${L.marge}px`, marginTop: -L.H * 0.04, width: '100%', boxSizing: 'border-box' }}>
        {phrase.lignes.map((l, i) => {
          // La première phrase est déjà posée à l'image 0 (vignette, premier
          // défilement) : son ressort est pris avec dix images d'avance.
          const avance = phrase.apparait === 0 ? 10 + i * 5 : 0;
          const s = spring({ frame: frame - phrase.apparait - i * 5 + avance, fps, config: { damping: 200 }, durationInFrames: 14 });
          const cuivre = phrase.reponse ? i !== phrase.accent : i === phrase.accent;
          return (
            <div key={l} style={{ opacity: s, transform: `translateY(${(1 - s) * 34}px)`, fontFamily: FONT_DISPLAY, fontWeight: 600,
              fontSize: L.tailles.hook, lineHeight: 1.0, letterSpacing: '-0.03em', color: cuivre ? C.cuivre : C.creme,
              fontVariationSettings: '"opsz" 144, "SOFT" 30', textShadow: '0 4px 28px rgba(0,0,0,0.55)' }}>
              {fr(l)}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ── Acte 2 : « 59 € » plein écran ───────────────────────────────────────────
const Prix = ({ L }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const monte = useMonte();
  if (frame < PRIX.de) return null;
  const chiffre = spring({ frame: frame - PRIX.chiffre, fps, config: { damping: 11, stiffness: 120 }, durationInFrames: 34 });
  const depart = interpolate(frame, [PRIX.fin, PRIX.fin + 16], [0, 1], CLAMP);
  if (depart >= 1) return null; // plus rien une fois parti : pas de fantôme sur les images fixes
  const reste = 1 - depart;
  const m1 = monte(PRIX.chiffre + 6), m2 = monte(PRIX.lignes, 28), m3 = monte(PRIX.sous, 26);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        marginTop: -L.H * 0.06, padding: `0 ${L.marge}px` }}>
        <Eyebrow L={L} style={{ ...m1, opacity: Math.min(m1.opacity, reste), marginBottom: 26 }}>{PRIX.eyebrow}</Eyebrow>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.04em', color: C.cuivre,
          fontSize: interpolate(depart, [0, 1], [L.tailles.chiffre, L.tailles.chiffrePetit]),
          fontVariationSettings: '"opsz" 144, "SOFT" 30', opacity: Math.min(1, chiffre * 1.4) * reste,
          transform: `scale(${interpolate(chiffre, [0, 1], [0.55, 1])}) translateY(${-depart * L.H * 0.28}px)` }}>
          {PRIX.chiffre_texte}
        </div>
        <div style={{ ...m2, opacity: Math.min(m2.opacity, reste), marginTop: 34, fontFamily: FONT_DISPLAY, fontWeight: 500,
          fontSize: L.tailles.zeroLigne, lineHeight: 1.08, letterSpacing: '-0.02em', color: C.creme, fontVariationSettings: '"opsz" 120, "SOFT" 30' }}>
          {PRIX.lignesTexte.map((l) => <div key={l}>{l}</div>)}
        </div>
        <div style={{ ...m3, opacity: Math.min(m3.opacity, reste), marginTop: 40, fontFamily: FONT_BODY, fontWeight: 500,
          fontSize: L.tailles.sous, lineHeight: 1.5, color: C.doux }}>
          {PRIX.sousTexte.map((l) => <div key={l}>{l}</div>)}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// La pastille « 59 € » accrochée au téléphone : c'est le chiffre de l'acte 2
// qui a volé jusque-là, et il tient la promesse pendant les cinq écrans.
const Pastille = ({ L, depuis }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - depuis, fps, config: { damping: 12, stiffness: 150 }, durationInFrames: 30 });
  const battement = 1 + 0.03 * Math.sin(((frame - depuis) / fps) * Math.PI * 1.4);
  return (
    <div style={{ position: 'absolute', left: L.pastille.x, top: L.pastille.y, opacity: Math.min(1, s * 1.3),
      transform: `rotate(-6deg) scale(${interpolate(s, [0, 1], [0.5, 1]) * battement})`,
      background: C.cuivre, color: C.cuivreEncre, fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: L.pastille.taille,
      lineHeight: 1, padding: '22px 34px', borderRadius: 999, letterSpacing: '-0.02em', whiteSpace: 'nowrap',
      boxShadow: '0 20px 48px rgba(58,36,16,0.45)' }}>
      {PRIX.chiffre_texte}
    </div>
  );
};

// Le défilement d'un écran est écrit pour le 9:16. En 4:5 le téléphone montre
// moins de capture : si la cible tombe sous la fenêtre visible, on remonte
// juste assez pour qu'elle se lise aux trois quarts de l'écran (le toast du
// refus de salle était coupé sur la planche du feed, 2026-09-23).
const defilementPour = (L, ecran) => {
  const echelle = L.phone.screenW / ecran.imgW;
  const visible = L.phone.hauteurEcran / echelle;
  let def = ecran.defilement || 0;
  if (ecran.cible && ecran.cible[1] - def > visible * 0.82) def = Math.round(ecran.cible[1] - visible * 0.74);
  return Math.max(0, Math.min(def, ecran.imgH - visible));
};

// ── Acte 3 : cinq écrans réels, un mot chacun ───────────────────────────────
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
  const defilement = defilementPour(L, ecran);
  const point = ecran.cible ? geo.point(ecran.cible, defilement) : null;
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
        fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: L.tailles.mot, lineHeight: 1.04, letterSpacing: '-0.02em',
        color: teinte, fontVariationSettings: '"opsz" 144, "SOFT" 30',
        opacity: Math.min(mot, sortieMot), transform: `translateY(${(1 - mot) * 24}px)` }}>
        {ecran.mot}
      </div>
      <div style={{ position: 'absolute', inset: 0, opacity: entree, transform: `translateY(${(1 - entree) * 60}px)` }}>
        <Telephone {...mockup} bezelCouleur={C.bezel} ombre="0 40px 100px rgba(0,0,0,0.6)">
          {precedent && <Ecran screenW={mockup.screenW} {...precedent} defilement={defilementPour(L, precedent)} />}
          <Ecran screenW={mockup.screenW} {...ecran} defilement={defilement} style={{ opacity: fondu }} />
        </Telephone>
      </div>
      {point && <Repere x={point.x} y={point.y} delai={debutEcran + 12} fin={debutEcran + ECRANS.parEcran - 7} teinte={teinte} w={L.W} h={L.H} r={ecran.r} />}
      <Pastille L={L} depuis={ECRANS.debut} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: L.puces, display: 'flex', justifyContent: 'center', gap: 14, opacity: entree }}>
        {ECRANS.liste.map((e, k) => (
          <div key={e.mot} style={{ width: k === i ? 34 : 12, height: 12, borderRadius: 6, background: k === i ? teinte : 'rgba(247,242,234,0.28)' }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ── Acte 4 : pas une usine à gaz, sur la photo du studio de danse ───────────
const Essentiel = ({ L }) => {
  const frame = useCurrentFrame();
  const monte = useMonte();
  const d = ESSENTIEL.de;
  if (frame < d) return null;
  const sortie = interpolate(frame, [ESSENTIEL.fin - 14, ESSENTIEL.fin], [1, 0], CLAMP);
  if (sortie <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: sortie, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: -L.H * 0.05, padding: `0 ${L.marge}px` }}>
        <Eyebrow L={L} couleur={C.sauge} style={monte(d)}>{ESSENTIEL.eyebrow}</Eyebrow>
        <div style={{ ...monte(d + 12, 30), marginTop: 30, fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: L.tailles.frontiere,
          lineHeight: 1.1, letterSpacing: '-0.02em', color: C.creme, fontVariationSettings: '"opsz" 144, "SOFT" 30',
          textShadow: '0 2px 18px rgba(0,0,0,0.4)' }}>
          {ESSENTIEL.texte.map((l) => <div key={l}>{l}</div>)}
        </div>
        <div style={{ ...monte(d + 44), marginTop: 34, fontFamily: FONT_BODY, fontWeight: 500, fontSize: L.tailles.sous,
          lineHeight: 1.55, color: C.doux, textShadow: '0 1px 12px rgba(0,0,0,0.4)' }}>
          {ESSENTIEL.sous.map((l) => <div key={l} style={{ marginTop: 10 }}>{fr(l)}</div>)}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Acte 5 : l'offre et le DM, avec le portrait de Maude ────────────────────
const Appel = ({ L }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const monte = useMonte();
  const d = APPEL.de;
  if (frame < d) return null;
  const voile = interpolate(frame, [d, d + 14], [0, 1], CLAMP);
  const avatar = spring({ frame: frame - d - 4, fps, config: { damping: 14, stiffness: 120 }, durationInFrames: 30 });
  const pill = spring({ frame: frame - d - 34, fps, config: { damping: 15, stiffness: 140 }, durationInFrames: 30 });
  const battement = 1 + 0.025 * Math.sin(((frame - d) / fps) * Math.PI * 1.6);
  const T = L.avatar.taille;
  return (
    <AbsoluteFill style={{ opacity: voile, background: `linear-gradient(155deg, ${C.fond2} 0%, ${C.fond} 58%, #1a1412 100%)`,
      alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: -L.H * 0.04, padding: `0 ${L.marge}px` }}>
        <div style={{ width: T, height: T, borderRadius: '50%', overflow: 'hidden', border: `6px solid ${C.cuivre}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)', opacity: Math.min(1, avatar * 1.3), transform: `scale(${interpolate(avatar, [0, 1], [0.7, 1])})` }}>
          <Img src={staticFile('photo-maude.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 28%' }} />
        </div>
        <Eyebrow L={L} couleur={C.cuivre} style={{ ...monte(d + 10), marginTop: 34 }}>{APPEL.eyebrow}</Eyebrow>
        <div style={{ ...monte(d + 16), marginTop: 18, fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: L.tailles.appel, lineHeight: 1.06,
          letterSpacing: '-0.02em', color: C.creme, fontVariationSettings: '"opsz" 120, "SOFT" 30' }}>
          {APPEL.titre.map((l, i) => <div key={l} style={{ color: i === 1 ? C.cuivre : C.creme }}>{l}</div>)}
        </div>
        <div style={{ marginTop: 44, opacity: Math.min(1, pill * 1.3), transform: `scale(${interpolate(pill, [0, 1], [0.86, 1]) * battement})`,
          background: C.creme, color: C.encre, fontFamily: FONT_BODY, fontWeight: 700, fontSize: L.tailles.domaine,
          padding: '24px 54px', borderRadius: 999, letterSpacing: '-0.01em', whiteSpace: 'nowrap', boxShadow: '0 22px 60px rgba(0,0,0,0.5)' }}>
          {APPEL.bouton}
        </div>
        <div style={{ ...monte(d + 50), marginTop: 30, fontFamily: FONT_BODY, fontWeight: 500, fontSize: L.tailles.sous, lineHeight: 1.5, color: C.doux }}>
          {APPEL.sous.map((l) => <div key={l} style={{ marginTop: 6 }}>{fr(l)}</div>)}
        </div>
        <div style={{ ...monte(d + 64), marginTop: 18, fontFamily: FONT_BODY, fontWeight: 400, fontSize: Math.round(L.tailles.sous * 0.8), color: 'rgba(216,201,187,0.7)' }}>
          {APPEL.signature}
        </div>
      </div>
      <div style={{ position: 'absolute', left: L.marge, top: L.logo, opacity: 0.9 }}>
        <Logo size={34} couleur={C.cuivre} encre={C.creme} />
      </div>
    </AbsoluteFill>
  );
};

export const Studio = ({ profil = 'reel' }) => {
  const L = PROFILS[profil];
  return (
    <AbsoluteFill>
      <Fond>
        <Photo src={PHOTOS.reformer} de={0} a={ACTE1.fin + 10} voile={0.5} focale="55% 40%" />
        <Photo src={PHOTOS.danse} de={ESSENTIEL.de - 6} a={ESSENTIEL.fin + 6} voile={0.66} focale="50% 45%" />
        <Acte1 L={L} />
        <Prix L={L} />
        <Ecrans L={L} />
        <Essentiel L={L} />
        <div style={{ position: 'absolute', left: L.marge, top: L.logo, opacity: 0.9 }}>
          <Logo size={34} couleur={C.cuivre} encre={C.creme} />
        </div>
      </Fond>
      <Appel L={L} />
    </AbsoluteFill>
  );
};

export const DUREE_STUDIO = DUREE;
