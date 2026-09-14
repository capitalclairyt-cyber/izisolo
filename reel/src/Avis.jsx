import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_BODY, FONT_DISPLAY, P, TEINTES } from './theme';
import { Fond } from './composants/Fond';
import { Logo } from './composants/Logo';
import { Telephone, Ecran, geometrieTelephone } from './composants/Telephone';
import { Repere } from './composants/Repere';
import { AppelStudio } from './composants/AppelStudio';
import { AVIS as A } from './formats';

// ════════════════════════════════════════════════════════════════════════════
// Le réel « Avis Google » (2026-09-14, demande Colin : « un joli réel animé qui
// montre la nouvelle feature d'avis Google, avec une belle couverture »).
// Quatre actes : (1) la COUVERTURE, cinq étoiles qui tombent une à une et
// l'accroche « Tes élèves t'adorent. Google ne le sait pas. » ; (2) le seul
// réglage, la carte « Mes avis Google » du démo dans le téléphone, le champ
// puis l'interrupteur cerclés ; (3) les trois portes : le bouton dans l'espace
// élève, l'email qui part tout seul (le VRAI texte de lib/avis-google.js), et
// l'affichette « scanne en sortant » ; (4) les règles de Google, dites sans
// détour ; puis la carte de fin commune « Commente STUDIO ».
// Rien que le produit ne fasse pas, aucune contrepartie promise.
// ════════════════════════════════════════════════════════════════════════════

const TERRACOTTA = TEINTES[0];
const SAUGE = TEINTES[1];
const OR = '#e0a43c';
const fr = (t) => String(t).replace(/ ([?!:])/g, ' $1');
// Le téléphone monte à 560 (et non 720 comme dans Freemium) : ici le titre
// tient sur deux lignes et un trou de 250 px se voyait dessous (image fixe).
const MOCKUP = { x: 277, y: 560, screenW: 470, hauteurEcran: 860 };

const Etoile = ({ size = 120, couleur = OR, style }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={style} aria-hidden="true">
    <path d="M50 6 L62 37 L95 39 L69 60 L78 93 L50 74 L22 93 L31 60 L5 39 L38 37 Z" fill={couleur} />
  </svg>
);

// ── Acte 1 : la couverture ────────────────────────────────────────────────
const Couverture = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sortie = interpolate(frame, [A.acte1Fin - 14, A.acte1Fin], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (sortie <= 0) return null;
  const monte = (depuis, duree = 26) => {
    const s = spring({ frame: frame - depuis, fps, config: { damping: 200 }, durationInFrames: duree });
    return { opacity: s, transform: `translateY(${(1 - s) * 28}px)` };
  };
  return (
    <AbsoluteFill style={{ opacity: sortie }}>
      {/* Cinq étoiles qui tombent une à une, avec un rebond, et une onde à l'arrivée */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 560, display: 'flex', justifyContent: 'center', gap: 18 }}>
        {[0, 1, 2, 3, 4].map((k) => {
          const depuis = A.etoiles.de + k * A.etoiles.pas;
          const s = spring({ frame: frame - depuis, fps, config: { damping: 9, stiffness: 170, mass: 0.9 }, durationInFrames: 34 });
          const onde = interpolate(frame - depuis, [10, 34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div key={k} style={{ position: 'relative', width: 150, height: 150 }}>
              {onde > 0 && onde < 1 && (
                <div style={{ position: 'absolute', left: 75 - 40 - onde * 60, top: 75 - 40 - onde * 60, width: 80 + onde * 120, height: 80 + onde * 120,
                  borderRadius: '50%', border: `3px solid ${OR}`, opacity: 0.55 * (1 - onde) }} />
              )}
              <Etoile size={150} style={{ opacity: Math.min(1, s * 1.5), transform: `translateY(${(1 - s) * -220}px) scale(${interpolate(s, [0, 1], [0.3, 1])}) rotate(${(1 - s) * -40}deg)`,
                filter: `drop-shadow(0 18px 30px ${OR}55)` }} />
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', left: 80, right: 80, top: 790, textAlign: 'center' }}>
        <div style={{ ...monte(A.titre.apparait, 30), fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 112, lineHeight: 1.02, letterSpacing: '-0.025em',
          color: P.ink, fontVariationSettings: '"opsz" 144, "SOFT" 30' }}>
          {A.titre.lignes.map((l, i) => <div key={i}>{fr(l)}</div>)}
        </div>
        <div style={{ ...monte(A.contre.apparait, 30), marginTop: 26, fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 96, lineHeight: 1.04,
          letterSpacing: '-0.02em', color: TERRACOTTA, fontVariationSettings: '"opsz" 144, "SOFT" 30' }}>
          {fr(A.contre.texte)}
        </div>
        <div style={{ ...monte(A.sous.apparait), marginTop: 54, display: 'inline-block', background: P.ink, color: '#fff', fontFamily: FONT_BODY, fontWeight: 600,
          fontSize: 34, padding: '18px 36px', borderRadius: 999, letterSpacing: '0.01em' }}>
          {fr(A.sous.texte)}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Acte 2 : le seul réglage, cerclé deux fois ───────────────────────────
const Reglage = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const R = A.reglage;
  if (frame < R.de) return null;
  const sortie = interpolate(frame, [A.portesDebut - 14, A.portesDebut], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (sortie <= 0) return null;
  const monte = (depuis, duree = 26) => {
    const s = spring({ frame: frame - depuis, fps, config: { damping: 200 }, durationInFrames: duree });
    return { opacity: s, transform: `translateY(${(1 - s) * 26}px)` };
  };
  const entree = spring({ frame: frame - R.de - 10, fps, config: { damping: 200 }, durationInFrames: 30 });
  const mockup = { ...MOCKUP, ...R.ecran };
  const geo = geometrieTelephone(mockup);
  return (
    <AbsoluteFill style={{ opacity: sortie }}>
      <div style={{ position: 'absolute', left: 80, right: 80, top: 250, textAlign: 'center' }}>
        <div style={{ ...monte(R.de), fontFamily: FONT_BODY, fontWeight: 600, fontSize: 30, letterSpacing: '0.12em', textTransform: 'uppercase', color: P.accentDeep }}>
          {R.eyebrow}
        </div>
        <div style={{ ...monte(R.de + 12, 30), marginTop: 24, fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 84, lineHeight: 1.06, letterSpacing: '-0.02em',
          color: P.ink, fontVariationSettings: '"opsz" 120, "SOFT" 30' }}>
          {R.titre.map((l, i) => <div key={i}>{fr(l)}</div>)}
        </div>
      </div>
      <div style={{ position: 'absolute', inset: 0, opacity: entree, transform: `translateY(${(1 - entree) * 60}px)` }}>
        <Telephone {...mockup}>
          <Ecran screenW={mockup.screenW} {...R.ecran} defilement={R.defilement} />
        </Telephone>
      </div>
      {R.reperes.map((rep, k) => {
        const pt = geo.point(rep.cible, R.defilement);
        const teinte = TEINTES[k % TEINTES.length];
        const carte = spring({ frame: frame - R.de - rep.delai - 6, fps, config: { damping: 13, stiffness: 150 }, durationInFrames: 28 });
        const fin = rep.fin ? interpolate(frame, [R.de + rep.fin, R.de + rep.fin + 8], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
        return (
          <div key={k}>
            <Repere x={pt.x} y={pt.y} delai={R.de + rep.delai} fin={rep.fin ? R.de + rep.fin : 1e9} teinte={teinte} />
            <div style={{ position: 'absolute', left: 70, top: pt.y + rep.carteDy, maxWidth: 560, opacity: Math.min(1, carte * 1.3) * fin,
              transform: `translateX(${(1 - carte) * -30}px) rotate(-2deg)`, background: teinte, color: '#fff', fontFamily: FONT_DISPLAY, fontWeight: 500,
              fontSize: 40, lineHeight: 1.15, padding: '18px 26px', borderRadius: 14, boxShadow: `0 18px 40px ${teinte}55` }}>
              {fr(rep.label)}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ── Acte 3 : les trois portes ─────────────────────────────────────────────
const CarteEmail = ({ email, progression }) => (
  <div style={{ position: 'absolute', left: 90, right: 90, top: 600, background: '#fff', borderRadius: 28, padding: '38px 44px',
    boxShadow: '0 40px 90px rgba(44,33,24,0.22)', fontFamily: FONT_BODY, color: P.ink, opacity: Math.min(1, progression * 1.3),
    transform: `translateY(${(1 - progression) * 80}px) scale(${interpolate(progression, [0, 1], [0.94, 1])})` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <div style={{ width: 74, height: 74, borderRadius: '50%', background: P.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 40 }}>S</div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 34 }}>{email.de}</div>
        <div style={{ fontSize: 26, color: P.inkSoft, marginTop: 4 }}>{email.quand}</div>
      </div>
      <div style={{ marginLeft: 'auto', fontSize: 26, color: P.inkSoft }}>{email.heure}</div>
    </div>
    <div style={{ marginTop: 30, fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 44, lineHeight: 1.15, letterSpacing: '-0.01em' }}>{fr(email.sujet)}</div>
    <div style={{ marginTop: 22, fontSize: 30, lineHeight: 1.45, color: P.inkSoft }}>
      {email.lignes.map((l, i) => <div key={i} style={{ marginTop: i ? 14 : 0 }}>{fr(l)}</div>)}
    </div>
    <div style={{ marginTop: 26, display: 'inline-block', background: OR, color: P.ink, fontWeight: 700, fontSize: 30, padding: '16px 28px', borderRadius: 999 }}>
      ⭐ Laisser un avis
    </div>
  </div>
);

const Portes = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const debut = A.portesDebut;
  if (frame < debut) return null;
  const sortie = interpolate(frame, [A.portesFin, A.portesFin + 12], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (sortie <= 0) return null;
  const i = Math.min(A.portes.length - 1, Math.max(0, Math.floor((frame - debut) / A.parPorte)));
  const porte = A.portes[i];
  const debutPorte = debut + i * A.parPorte;
  const teinte = TEINTES[i % TEINTES.length];
  const entree = spring({ frame: frame - debut, fps, config: { damping: 200 }, durationInFrames: 26 });
  const mot = spring({ frame: frame - debutPorte, fps, config: { damping: 200 }, durationInFrames: 20 });
  const sortieMot = interpolate(frame, [debutPorte + A.parPorte - 8, debutPorte + A.parPorte - 1], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const contenu = spring({ frame: frame - debutPorte - 4, fps, config: { damping: 16, stiffness: 120 }, durationInFrames: 30 });

  let corps = null;
  if (porte.type === 'ecran') {
    const mockup = { ...MOCKUP, ...porte.ecran };
    const pt = geometrieTelephone(mockup).point(porte.cible, porte.defilement);
    corps = (
      <>
        <div style={{ position: 'absolute', inset: 0, opacity: Math.min(1, contenu * 1.3), transform: `translateY(${(1 - contenu) * 60}px)` }}>
          <Telephone {...mockup}>
            <Ecran screenW={mockup.screenW} {...porte.ecran} defilement={porte.defilement} />
          </Telephone>
        </div>
        <Repere x={pt.x} y={pt.y} delai={debutPorte + 16} fin={debutPorte + A.parPorte - 4} teinte={teinte} />
      </>
    );
  } else if (porte.type === 'email') {
    corps = <CarteEmail email={porte.email} progression={contenu} />;
  } else if (porte.type === 'affiche') {
    const { imgW, imgH } = porte.image;
    const largeur = 640;
    corps = (
      <div style={{ position: 'absolute', left: (1080 - largeur) / 2, top: 560, width: largeur, height: largeur * imgH / imgW, opacity: Math.min(1, contenu * 1.3),
        transform: `rotate(-2.5deg) translateY(${(1 - contenu) * 80}px) scale(${interpolate(contenu, [0, 1], [0.92, 1])})`,
        boxShadow: '0 40px 90px rgba(44,33,24,0.26)', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
        <Img src={staticFile(porte.image.src)} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
    );
  }

  return (
    <AbsoluteFill style={{ opacity: sortie }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 250, textAlign: 'center', opacity: entree, fontFamily: FONT_BODY, fontWeight: 600,
        fontSize: 28, letterSpacing: '0.12em', textTransform: 'uppercase', color: P.accentDeep }}>
        {A.portesEyebrow}
      </div>
      <div style={{ position: 'absolute', left: 60, right: 60, top: 330, textAlign: 'center', fontFamily: FONT_DISPLAY, fontWeight: 500,
        fontSize: 84, lineHeight: 1.06, letterSpacing: '-0.02em', color: teinte, fontVariationSettings: '"opsz" 120, "SOFT" 30',
        opacity: Math.min(mot, sortieMot), transform: `translateY(${(1 - mot) * 24}px)` }}>
        {fr(porte.mot)}
      </div>
      {corps}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1650, display: 'flex', justifyContent: 'center', gap: 14, opacity: entree }}>
        {A.portes.map((_, k) => (
          <div key={k} style={{ width: k === i ? 34 : 12, height: 12, borderRadius: 6, background: k === i ? teinte : 'rgba(44,33,24,0.18)' }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ── Acte 4 : les règles de Google, dites sans détour ──────────────────────
const Regles = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const R = A.regles;
  if (frame < R.de) return null;
  const monte = (depuis, duree = 26) => {
    const s = spring({ frame: frame - depuis, fps, config: { damping: 200 }, durationInFrames: duree });
    return { opacity: s, transform: `translateY(${(1 - s) * 26}px)` };
  };
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 90, right: 90, top: 540, textAlign: 'center' }}>
        <div style={{ ...monte(R.de), display: 'flex', justifyContent: 'center', gap: 10 }}>
          {[0, 1, 2, 3, 4].map((k) => <Etoile key={k} size={64} />)}
        </div>
        <div style={{ ...monte(R.de + 10, 30), marginTop: 40, fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 88, lineHeight: 1.06, letterSpacing: '-0.02em',
          color: P.ink, fontVariationSettings: '"opsz" 120, "SOFT" 30' }}>
          {fr(R.titre)}
        </div>
        <div style={{ marginTop: 50, display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'center' }}>
          {R.lignes.map((l, k) => (
            <div key={k} style={{ ...monte(R.de + 30 + k * 16, 28), background: k % 2 ? SAUGE : TERRACOTTA, color: '#fff', fontFamily: FONT_DISPLAY, fontWeight: 500,
              fontSize: 48, lineHeight: 1.15, padding: '20px 36px', borderRadius: 16, transform: `rotate(${k % 2 ? 1.2 : -1.2}deg)`,
              boxShadow: `0 18px 40px ${k % 2 ? SAUGE : TERRACOTTA}55` }}>
              {fr(l)}
            </div>
          ))}
        </div>
        <div style={{ ...monte(R.de + 90), marginTop: 46, fontFamily: FONT_BODY, fontWeight: 500, fontSize: 34, lineHeight: 1.4, color: P.inkSoft }}>
          {fr(R.sous)}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Avis = () => (
  <AbsoluteFill>
    <Fond>
      <Couverture />
      <Reglage />
      <Portes />
      <Regles />
      <div style={{ position: 'absolute', left: 90, top: 1700, opacity: 0.85 }}>
        <Logo size={34} />
      </div>
    </Fond>
    <AppelStudio depuis={A.fin} titre={A.finTitre} />
  </AbsoluteFill>
);

export const DUREE_AVIS = A.duree;
