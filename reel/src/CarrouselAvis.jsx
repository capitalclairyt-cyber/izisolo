import { AbsoluteFill, Img, staticFile } from 'remotion';
import manifest from '../public/manifest.json';
import { FONT_BODY, FONT_DISPLAY } from './theme';
import { Goutte } from './composants/Logo';
import { AVIS } from './formats';
import { LARGEUR_CARROUSEL, NB_SLIDES, PALETTES, PALETTE_DEFAUT } from './carrousel-palettes';

// ════════════════════════════════════════════════════════════════════════════
// Le carrousel Instagram « Avis Google » (2026-09-15, demande Colin : « un joli
// carrousel, on sort de la couleur sable »). Huit visuels 1080×1350 (4:5, le
// format que la grille Instagram affiche en entier), rendus en images FIXES
// par `npm run carrousel` (scripts/rendre-carrousel.mjs). Même matière que le
// réel Avis : les captures RÉELLES du démo, le VRAI texte de l'email
// (lib/avis-google.js via formats.js), les trois règles de Google. Rien que le
// produit ne fasse pas, aucune contrepartie promise.
//
// Trois palettes, toutes hors sable (`palette` : 'bleu' par défaut, 'rose',
// 'vert' ; le vert est écarté par Colin le 15/09, il y en a déjà sur le feed) : un fond profond, du texte crème, des étoiles or. Le crème des
// cartes reprend le sable de la charte pour que la marque reste reconnaissable.
// ════════════════════════════════════════════════════════════════════════════

// Dimensions et palettes : src/carrousel-palettes.js (pur, lu aussi par le script de rendu).
export { LARGEUR_CARROUSEL, HAUTEUR_CARROUSEL, NB_SLIDES, PALETTES } from './carrousel-palettes';

const fr = (t) => String(t).replace(/ ([?!:;])/g, ' $1');

const Etoile = ({ size = 96, couleur }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
    <path d="M50 6 L62 37 L95 39 L69 60 L78 93 L50 74 L22 93 L31 60 L5 39 L38 37 Z" fill={couleur} />
  </svg>
);

// Le fond : un dégradé profond et deux halos discrets, comme le sable du réel
// mais dans la teinte choisie.
const Fond = ({ p, children }) => (
  <AbsoluteFill style={{ background: `linear-gradient(160deg, ${p.fond} 0%, ${p.fond2} 100%)`, color: p.texte, fontFamily: FONT_BODY }}>
    <div style={{ position: 'absolute', left: -220, top: -180, width: 700, height: 700, borderRadius: '50%', background: `radial-gradient(circle, ${p.or}22 0%, ${p.or}00 70%)` }} />
    <div style={{ position: 'absolute', right: -260, bottom: -200, width: 820, height: 820, borderRadius: '50%', background: `radial-gradient(circle, ${p.texte}14 0%, ${p.texte}00 70%)` }} />
    {children}
  </AbsoluteFill>
);

// Le pied commun : la marque à gauche, le numéro de la page à droite.
const Pied = ({ p, slide }) => (
  <>
    <div style={{ position: 'absolute', left: 80, bottom: 70, display: 'flex', alignItems: 'center', gap: 12, opacity: 0.9 }}>
      <Goutte size={34} />
      <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 32, letterSpacing: '-0.02em', fontVariationSettings: '"opsz" 120, "SOFT" 30', color: p.texte }}>IziSolo</span>
    </div>
    <div style={{ position: 'absolute', right: 80, bottom: 78, fontFamily: FONT_BODY, fontWeight: 600, fontSize: 24, letterSpacing: '0.08em', color: p.doux }}>
      {slide} / {NB_SLIDES}
    </div>
  </>
);

const Eyebrow = ({ p, children, top = 120 }) => (
  <div style={{ position: 'absolute', left: 80, right: 80, top, fontFamily: FONT_BODY, fontWeight: 600, fontSize: 28, letterSpacing: '0.12em', textTransform: 'uppercase', color: p.or }}>
    {children}
  </div>
);

const Titre = ({ p, lignes, top = 180, taille = 88, couleur }) => (
  <div style={{ position: 'absolute', left: 80, right: 80, top, fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: taille, lineHeight: 1.04, letterSpacing: '-0.02em', color: couleur || p.texte, fontVariationSettings: '"opsz" 120, "SOFT" 30' }}>
    {lignes.map((l, i) => <div key={i}>{fr(l)}</div>)}
  </div>
);

const Sous = ({ p, children, top, taille = 36 }) => (
  <div style={{ position: 'absolute', left: 80, right: 80, top, fontFamily: FONT_BODY, fontWeight: 400, fontSize: taille, lineHeight: 1.4, color: p.doux }}>
    {children}
  </div>
);

// Un téléphone posé au centre, écran = une capture réelle, éventuellement
// défilée, avec un anneau statique sur le point qui compte.
// `cadre` = [x1, y1, x2, y2] en px de capture : un liseré or AUTOUR de l'élément,
// jamais dessus (un anneau au milieu d'un champ masquait son texte, vu sur l'image).
const Telephone = ({ p, capture, defilement = 0, cible, cadre, x = 280, y = 560, screenW = 520, hauteurEcran = 640 }) => {
  const { w, h } = manifest[capture];
  const e = screenW / w;
  const bezel = 26;
  const point = cible ? { x: x + bezel + cible[0] * e, y: y + bezel + (cible[1] - defilement) * e } : null;
  const rect = cadre ? { left: x + bezel + cadre[0] * e, top: y + bezel + (cadre[1] - defilement) * e, width: (cadre[2] - cadre[0]) * e, height: (cadre[3] - cadre[1]) * e } : null;
  return (
    <>
      <div style={{ position: 'absolute', left: x, top: y, width: screenW + bezel * 2, height: hauteurEcran + bezel * 2, borderRadius: 56, background: '#1a1512', padding: bezel, boxSizing: 'border-box', boxShadow: '0 40px 90px rgba(0,0,0,0.35), 0 6px 18px rgba(0,0,0,0.2)' }}>
        <div style={{ position: 'relative', width: screenW, height: hauteurEcran, borderRadius: 56 - bezel, overflow: 'hidden', background: '#fff' }}>
          <Img src={staticFile(`${capture}.jpg`)} style={{ position: 'absolute', left: 0, top: -defilement * e, width: screenW, height: h * e, display: 'block' }} />
        </div>
      </div>
      {point && (
        <div style={{ position: 'absolute', left: point.x - 30, top: point.y - 30, width: 60, height: 60, borderRadius: 30, border: `5px solid ${p.or}`, boxShadow: `0 0 0 6px ${p.fond}cc, 0 0 0 10px ${p.or}66` }} />
      )}
      {rect && (
        <div style={{ position: 'absolute', left: rect.left - 10, top: rect.top - 10, width: rect.width + 20, height: rect.height + 20, borderRadius: 18, border: `5px solid ${p.or}`, boxShadow: `0 0 0 8px ${p.or}33` }} />
      )}
    </>
  );
};

// ── Les huit pages ────────────────────────────────────────────────────────
const Couverture = ({ p }) => (
  <>
    <div style={{ position: 'absolute', left: 80, top: 250, display: 'flex', gap: 14 }}>
      {[0, 1, 2, 3, 4].map((k) => <Etoile key={k} size={110} couleur={p.or} />)}
    </div>
    <Titre p={p} lignes={['Tes élèves', 't’adorent.']} top={430} taille={128} />
    <Titre p={p} lignes={['Google ne le', 'sait pas.']} top={720} taille={96} couleur={p.or} />
    <div style={{ position: 'absolute', left: 80, top: 1010, padding: '14px 26px', borderRadius: 999, border: `2px solid ${p.doux}`, fontFamily: FONT_BODY, fontWeight: 600, fontSize: 26, letterSpacing: '0.08em', textTransform: 'uppercase', color: p.doux }}>
      Nouveau dans IziSolo
    </div>
    <div style={{ position: 'absolute', right: 80, top: 1016, fontFamily: FONT_BODY, fontWeight: 600, fontSize: 28, color: p.doux }}>
      Fais défiler →
    </div>
  </>
);

const Constat = ({ p }) => (
  <>
    <Eyebrow p={p}>Chez toutes les profs que je rencontre</Eyebrow>
    <Titre p={p} lignes={['Des élèves fidèles', 'depuis des années.']} top={200} taille={92} />
    <Titre p={p} lignes={['Une fiche Google', 'avec quatre avis.']} top={470} taille={92} couleur={p.or} />
    <Sous p={p} top={760}>
      Pas par manque d’amour. Parce que demander, c’est gênant, et qu’on oublie.
    </Sous>
    <Sous p={p} top={900} taille={40}>
      <span style={{ color: p.texte, fontWeight: 600 }}>Et une fiche Google, c’est la première chose qu’une nouvelle élève regarde.</span>
    </Sous>
  </>
);

const Reglage = ({ p }) => (
  <>
    <Eyebrow p={p}>Un seul réglage</Eyebrow>
    <Titre p={p} lignes={['Tu colles ton lien', '« Demander des avis ».', 'Une fois.']} top={180} taille={78} />
    <Telephone p={p} capture="avis-carte" defilement={95} cadre={[60, 516, 664, 606]} y={520} hauteurEcran={640} />
  </>
);

const Espace = ({ p }) => {
  const y = manifest.reperes.avisBouton[1];
  const defilement = Math.max(0, y - 380);
  return (
    <>
      <Eyebrow p={p}>Ensuite, tout se fait tout seul</Eyebrow>
      <Titre p={p} lignes={['Un bouton dans', 'leur espace,', 'quand elles veulent.']} top={180} taille={78} />
      <Telephone p={p} capture="avis-espace" defilement={defilement} cadre={[30, y - 40, 690, y + 42]} y={520} hauteurEcran={640} />
    </>
  );
};

const EmailPage = ({ p }) => {
  const e = AVIS.portes.find((x) => x.type === 'email').email;
  return (
    <>
      <Eyebrow p={p}>Ensuite, tout se fait tout seul</Eyebrow>
      <Titre p={p} lignes={['Un email, le lendemain', 'de sa 3e séance.']} top={180} taille={78} />
      <div style={{ position: 'absolute', left: 80, right: 80, top: 440, background: p.carte, color: p.encre, borderRadius: 28, padding: '34px 40px', boxShadow: '0 30px 70px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <div style={{ width: 54, height: 54, borderRadius: 27, background: `${p.fond}`, color: p.or, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 600 }}>A</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 27 }}>{e.de} <span style={{ fontWeight: 400, color: p.encreDouce }}>{e.quand}</span></div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 22, color: p.encreDouce }}>{e.heure}</div>
          </div>
        </div>
        <div style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 30, lineHeight: 1.3, marginBottom: 14 }}>{fr(e.sujet)}</div>
        {e.lignes.map((l, i) => (
          <div key={i} style={{ fontFamily: FONT_BODY, fontSize: 26, lineHeight: 1.45, color: p.encre, marginTop: i ? 10 : 0 }}>{fr(l)}</div>
        ))}
      </div>
      <Sous p={p} top={1060} taille={34}>
        <span style={{ color: p.texte, fontWeight: 600 }}>Une seule fois par élève, jamais plus de cinq par jour.</span> Et elle peut le désactiver.
      </Sous>
    </>
  );
};

const Affiche = ({ p }) => {
  const { w, h } = manifest['avis-affiche'];
  const larg = 520;
  return (
    <>
      <Eyebrow p={p}>Ensuite, tout se fait tout seul</Eyebrow>
      <Titre p={p} lignes={['Et l’affichette avec', 'le QR, à la sortie', 'du studio.']} top={180} taille={78} />
      <div style={{ position: 'absolute', left: (LARGEUR_CARROUSEL - larg) / 2, top: 500, width: larg, transform: 'rotate(-3deg)', background: '#fff', padding: 14, boxShadow: '0 40px 90px rgba(0,0,0,0.38)', borderRadius: 6 }}>
        <Img src={staticFile('avis-affiche.jpg')} style={{ width: larg - 28, height: (larg - 28) * (h / w), display: 'block' }} />
      </div>
    </>
  );
};

const Regles = ({ p }) => (
  <>
    <Eyebrow p={p}>Et pour que tes avis restent en ligne</Eyebrow>
    <Titre p={p} lignes={['Comme Google', 'le demande.']} top={180} taille={92} />
    <div style={{ position: 'absolute', left: 80, right: 80, top: 470, display: 'flex', flexDirection: 'column', gap: 26 }}>
      {AVIS.regles.lignes.map((l, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 24, background: `${p.texte}12`, border: `1.5px solid ${p.texte}22`, borderRadius: 24, padding: '28px 32px' }}>
          <div style={{ flex: 'none', width: 56, height: 56, borderRadius: 28, background: p.or, color: p.fond, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_BODY, fontWeight: 800, fontSize: 30 }}>✓</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 500, fontSize: 46, letterSpacing: '-0.01em', color: p.texte }}>{l}</div>
        </div>
      ))}
    </div>
    <Sous p={p} top={950} taille={34}>{AVIS.regles.sous}</Sous>
  </>
);

const Fin = ({ p }) => (
  <>
    <div style={{ position: 'absolute', left: 80, top: 160, display: 'flex', gap: 10 }}>
      {[0, 1, 2, 3, 4].map((k) => <Etoile key={k} size={56} couleur={p.or} />)}
    </div>
    <Titre p={p} lignes={['Tes avis Google,', 'sans y penser.']} top={260} taille={100} />
    <div style={{ position: 'absolute', left: 80, top: 600, display: 'inline-flex', background: p.or, color: p.fond, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 48, padding: '30px 64px', borderRadius: 999, boxShadow: `0 22px 54px ${p.or}55` }}>
      Commente STUDIO
    </div>
    <Sous p={p} top={760} taille={38}>
      et je t’envoie le lien en message.
    </Sous>
    <Sous p={p} top={880} taille={30}>
      La demande d’avis est dans Complet, que tu essaies 30 jours sans carte. Le reste d’IziSolo est gratuit, pour toujours.
    </Sous>
  </>
);

const PAGES = [Couverture, Constat, Reglage, Espace, EmailPage, Affiche, Regles, Fin];

export const CarrouselAvis = ({ slide = 1, palette = PALETTE_DEFAUT }) => {
  const p = PALETTES[palette] || PALETTES[PALETTE_DEFAUT];
  const Page = PAGES[Math.min(NB_SLIDES, Math.max(1, slide)) - 1];
  return (
    <Fond p={p}>
      <Page p={p} />
      <Pied p={p} slide={slide} />
    </Fond>
  );
};
