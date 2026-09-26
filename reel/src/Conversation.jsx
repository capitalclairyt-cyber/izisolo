import { useMemo } from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { fillTextBox } from '@remotion/layout-utils';
import { FONT_BODY, P } from './theme';
import { Logo } from './composants/Logo';
import { Telephone } from './composants/Telephone';
import { AppelStudio } from './composants/AppelStudio';
import { PALETTES, VARIANTES, chrono } from './conversation-variantes';

// Le fond de la variante : un dégradé sombre et deux halos qui dérivent
// lentement (le patron de Fond.jsx, aux couleurs de la palette).
const FondCouleur = ({ pal, children }) => {
  const frame = useCurrentFrame();
  const d1 = interpolate(frame, [0, 600], [0, 120]);
  const d2 = interpolate(frame, [0, 600], [0, -90]);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${pal.fond} 0%, ${pal.fond2} 100%)` }}>
      <div style={{ position: 'absolute', left: -220 + d1, top: -180, width: 780, height: 780, borderRadius: '50%',
        background: `radial-gradient(circle, ${pal.halo1}30 0%, ${pal.halo1}00 70%)` }} />
      <div style={{ position: 'absolute', right: -280 + d2, bottom: -140, width: 880, height: 880, borderRadius: '50%',
        background: `radial-gradient(circle, ${pal.halo2}2e 0%, ${pal.halo2}00 70%)` }} />
      {children}
    </AbsoluteFill>
  );
};

// Le réel « conversation » : une messagerie dans un téléphone, deux profs, la
// douleur d'un côté, ce qu'on fait aujourd'hui de l'autre (2026-09-26). Le
// téléphone est dessiné, pas capturé : rien à photographier, rien qui se
// périme, et la messagerie n'est celle d'aucune marque (pas de vert WhatsApp,
// pas de bleu iMessage : le sable, le sauge et le blanc de la charte).

const fr = (t) => String(t).replace(/ ([?!;:])/g, '\u202f$1'); // espace fine insécable : un signe ne commence jamais une ligne

// Le téléphone : centré, l'écran fait 760 px de large sur 1330 de haut.
const TEL = { x: 132, y: 250, screenW: 760, imgW: 760, imgH: 1330, hauteurEcran: 1330 };
const CLAVIER_H = 290;   // le clavier, en bas de l'écran
const SAISIE_H = 74;     // la barre « Message »
const ENTETE_H = 150;    // barre d'état + contact
const ZONE_HAUT = ENTETE_H + 24;
const ZONE_BAS = TEL.hauteurEcran - CLAVIER_H - SAISIE_H - 20;
const LARGEUR_BULLE = 540;
const TAILLE = 31;
const INTERLIGNE = 40;

const GAP = 14;
const POINTS_H = 49; // les trois points : 18 + 13 + 18
const PADDING_BULLE = 26; // 14 en haut, 12 en bas

// La hauteur EXACTE d'une bulle, mesurée avec la vraie police par
// @remotion/layout-utils (mot par mot, l'heure comprise, à la largeur de la
// bulle). Une estimation « tant de pixels par caractère » se trompait de
// quelques pixels, et comme la pile est ancrée en bas, chaque bulle qui
// entrait faisait sauter tout le fil de la différence : la saccade que Colin
// a vue (2026-09-26). Avec la mesure, la compensation est au pixel.
const hauteurBulle = (m) => {
  const boite = fillTextBox({ maxBoxWidth: LARGEUR_BULLE - 48, maxLines: 40 });
  let lignes = 1;
  fr(m.texte).split(' ').forEach((mot, i) => {
    if (boite.add({ text: (i ? ' ' : '') + mot, fontFamily: FONT_BODY, fontSize: TAILLE, fontWeight: 500 }).newLine) lignes++;
  });
  boite.add({ text: '  ', fontFamily: FONT_BODY, fontSize: TAILLE, fontWeight: 500 }); // la marge de l'heure
  if (boite.add({ text: m.heure + (m.de === 'moi' ? ' ✓✓' : ''), fontFamily: FONT_BODY, fontSize: 19, fontWeight: 500 }).newLine) lignes++;
  return lignes * INTERLIGNE + PADDING_BULLE;
};

const Bulle = ({ de, texte, heure, apparait }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Montée dès l'image `apparait` (à 0 d'opacité, mais DANS la pile) : la
  // compensation du saut de layout commence à cette image-là, la bulle doit
  // occuper sa place au même instant.
  if (frame < apparait) return null;
  const s = spring({ frame: frame - apparait, fps, config: { damping: 14, stiffness: 170 }, durationInFrames: 26 });
  const moi = de === 'moi';
  return (
    <div style={{ display: 'flex', justifyContent: moi ? 'flex-end' : 'flex-start', opacity: s,
      transform: `translateY(${(1 - s) * 18}px) scale(${interpolate(s, [0, 1], [0.94, 1])})`, transformOrigin: moi ? 'right bottom' : 'left bottom' }}>
      <div style={{ maxWidth: LARGEUR_BULLE, background: moi ? '#dfeacd' : P.blanc, color: P.ink, padding: '14px 24px 12px',
        borderRadius: 26, [moi ? 'borderBottomRightRadius' : 'borderBottomLeftRadius']: 8,
        fontFamily: FONT_BODY, fontWeight: 500, fontSize: TAILLE, lineHeight: `${INTERLIGNE}px`,
        boxShadow: '0 4px 14px rgba(44,33,24,0.08)' }}>
        {fr(texte)}
        <span style={{ display: 'inline-block', marginLeft: 14, fontSize: 19, color: P.inkSoft, verticalAlign: 'bottom', whiteSpace: 'nowrap' }}>
          {heure}{moi ? ' ✓✓' : ''}
        </span>
      </div>
    </div>
  );
};

// Les trois points « en train d'écrire », avant chaque réponse.
const EnTrainDEcrire = ({ de, a }) => {
  const frame = useCurrentFrame();
  if (frame < de || frame >= a) return null;
  const entree = interpolate(frame, [de, de + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', opacity: entree }}>
      <div style={{ background: P.blanc, borderRadius: 26, borderBottomLeftRadius: 8, padding: '18px 24px', display: 'flex', gap: 9,
        boxShadow: '0 4px 14px rgba(44,33,24,0.08)' }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 13, height: 13, borderRadius: 7, background: P.inkSoft,
            opacity: 0.35 + 0.65 * Math.max(0, Math.sin(((frame - de) / 30) * Math.PI * 2.2 - i * 0.9)) }} />
        ))}
      </div>
    </div>
  );
};

const RANGEES = ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'];
const Clavier = () => (
  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: CLAVIER_H, background: '#d6d9df', padding: '12px 8px 0', boxSizing: 'border-box' }}>
    {RANGEES.map((r, i) => (
      <div key={i} style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12, paddingLeft: i === 2 ? 60 : 0, paddingRight: i === 2 ? 60 : 0 }}>
        {i === 2 ? <div style={{ width: 84, height: 62, borderRadius: 9, background: '#b9bec7' }} /> : null}
        {r.split('').map((l) => (
          <div key={l} style={{ width: i === 1 ? 62 : 64, height: 62, borderRadius: 9, background: '#fff', boxShadow: '0 1px 0 #9aa0aa',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_BODY, fontSize: 30, color: '#1c1c1e' }}>{l}</div>
        ))}
        {i === 2 ? <div style={{ width: 84, height: 62, borderRadius: 9, background: '#b9bec7' }} /> : null}
      </div>
    ))}
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
      <div style={{ width: 96, height: 62, borderRadius: 9, background: '#b9bec7' }} />
      <div style={{ width: 420, height: 62, borderRadius: 9, background: '#fff', boxShadow: '0 1px 0 #9aa0aa' }} />
      <div style={{ width: 96, height: 62, borderRadius: 9, background: '#b9bec7' }} />
    </div>
  </div>
);

const EnTete = ({ contact }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: ENTETE_H, background: '#f7f3ee', borderBottom: '1px solid rgba(44,33,24,0.10)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 40px 0', fontFamily: FONT_BODY, fontWeight: 600, fontSize: 24, color: P.ink }}>
      <span>9:41</span>
      <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ display: 'inline-flex', gap: 3, alignItems: 'flex-end' }}>{[10, 14, 18, 22].map((h) => <span key={h} style={{ width: 5, height: h, background: P.ink, borderRadius: 1 }} />)}</span>
        <span style={{ width: 40, height: 20, border: `2px solid ${P.ink}`, borderRadius: 6, padding: 2, boxSizing: 'border-box' }}><span style={{ display: 'block', width: '80%', height: '100%', background: P.ink, borderRadius: 2 }} /></span>
      </span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '18px 28px 0' }}>
      <span style={{ fontFamily: FONT_BODY, fontSize: 40, color: '#2f6fd6', lineHeight: 1 }}>‹</span>
      <div style={{ width: 66, height: 66, borderRadius: 33, background: `${P.sage}44`, border: `3px solid ${P.sage}77`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FONT_BODY, fontWeight: 600, fontSize: 30, color: P.ink }}>{contact.initiale}</div>
      <div>
        <div style={{ fontFamily: FONT_BODY, fontWeight: 600, fontSize: 30, color: P.ink, lineHeight: 1.1 }}>{contact.nom}</div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 21, color: P.inkSoft, marginTop: 4 }}>{contact.sous} · en ligne</div>
      </div>
    </div>
  </div>
);

export const Conversation = ({ varianteId }) => {
  const v = VARIANTES.find((x) => x.id === varianteId) || VARIANTES[0];
  const pal = PALETTES[v.palette] || PALETTES.lavande;
  const c = chrono(v);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entree = spring({ frame: frame - 4, fps, config: { damping: 200 }, durationInFrames: 30 });

  // La pile est ancrée en BAS de la zone (comme une vraie messagerie) : ce qui
  // déborde disparaît par le haut, la dernière bulle est toujours entière. À
  // chaque changement de layout (les trois points qui entrent, puis qui
  // sortent quand la bulle entre), la pile saute de la différence de hauteur ;
  // on compense ce saut AU PIXEL (hauteurs mesurées) puis on le relâche en
  // 14 images, pour que le fil MONTE au lieu de sauter.
  const enCours = c.messages.find((m) => m.ecritDe !== null && frame >= m.ecritDe && frame < m.apparait);
  const dispo = ZONE_BAS - ZONE_HAUT;
  const evenements = useMemo(() => {
    const liste = [];
    for (const m of c.messages) {
      if (m.ecritDe !== null) liste.push({ frame: m.ecritDe, delta: POINTS_H + GAP });
      liste.push({ frame: m.apparait, delta: hauteurBulle(m) + GAP - (m.ecritDe !== null ? POINTS_H + GAP : 0) });
    }
    return liste;
  }, [c]);
  const dernier = evenements.filter((e) => e.frame <= frame).at(-1);
  const glisse = dernier ? spring({ frame: frame - dernier.frame, fps, config: { damping: 200 }, durationInFrames: 14 }) : 1;
  const decalage = dernier ? -dernier.delta * (1 - glisse) : 0;

  return (
    <AbsoluteFill>
      <FondCouleur pal={pal}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 150, textAlign: 'center', opacity: entree, fontFamily: FONT_BODY, fontWeight: 600,
          fontSize: 26, letterSpacing: '0.12em', textTransform: 'uppercase', color: pal.doux }}>
          {v.eyebrow}
        </div>
        <div style={{ position: 'absolute', inset: 0, opacity: entree, transform: `translateY(${(1 - entree) * 50}px)` }}>
          <Telephone {...TEL} bezelCouleur={pal.bezel} ombre={`0 40px 90px rgba(0,0,0,0.45), 0 0 0 2px ${pal.creme}22`}>
            <div style={{ position: 'absolute', inset: 0, background: '#efe7dc' }} />
            <div style={{ position: 'absolute', left: 30, right: 30, top: ZONE_HAUT, height: dispo, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', gap: GAP, transform: `translateY(${-decalage}px)` }}>
                <div style={{ alignSelf: 'center', background: 'rgba(44,33,24,0.08)', color: P.inkSoft, fontFamily: FONT_BODY, fontSize: 21, padding: '6px 16px', borderRadius: 12 }}>Aujourd’hui</div>
                {c.messages.map((m, i) => (
                  <Bulle key={i} {...m} />
                ))}
                {enCours ? <EnTrainDEcrire de={enCours.ecritDe} a={enCours.apparait} /> : null}
              </div>
            </div>
            <EnTete contact={v.contact} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: CLAVIER_H, height: SAISIE_H, background: '#f7f3ee', display: 'flex', alignItems: 'center', gap: 14, padding: '0 20px', boxSizing: 'border-box' }}>
              <div style={{ width: 44, height: 44, borderRadius: 22, border: `2px solid ${P.inkSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, color: P.inkSoft, fontFamily: FONT_BODY }}>+</div>
              <div style={{ flex: 1, height: 48, borderRadius: 24, background: P.blanc, border: '1px solid rgba(44,33,24,0.12)', padding: '0 20px', display: 'flex', alignItems: 'center',
                fontFamily: FONT_BODY, fontSize: 24, color: P.inkSoft }}>Message</div>
              <div style={{ width: 44, height: 44, borderRadius: 22, background: P.accent }} />
            </div>
            <Clavier />
          </Telephone>
        </div>
        <div style={{ position: 'absolute', left: 90, top: 1700, opacity: 0.9 }}><Logo size={34} couleur={pal.goutte} encre={pal.creme} /></div>
        <div style={{ position: 'absolute', right: 90, top: 1712, fontFamily: FONT_BODY, fontSize: 22, color: pal.doux, opacity: 0.85 }}>prénoms d’exemple</div>
      </FondCouleur>
      <AppelStudio depuis={c.cta} titre={v.fin} palette={{ fond: pal.fond, fond2: pal.fond2, encre: pal.creme, doux: pal.doux, pill: pal.pill, pillTexte: pal.pillTexte, fleche: pal.halo1, goutte: pal.goutte }} />
    </AbsoluteFill>
  );
};
