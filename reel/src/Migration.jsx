import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT_BODY, P, TEINTES } from './theme';
import manifest from '../public/manifest.json';
import { Fond } from './composants/Fond';
import { Titre } from './composants/Titre';
import { Telephone, Ecran } from './composants/Telephone';
import { Carte } from './composants/Carte';
import { AppelStudio } from './composants/AppelStudio';
import { LARGEUR_CLIP } from './dimensions';
import { RENTREE } from './formats';

// « Changer d'outil » (2026-09-10) : ce qu'on reprend d'un autre outil, montré
// sur les VRAIS écrans du démo. Un export CSV (les trois élèves de la capture,
// rien d'autre) entre dans la liste des élèves ligne par ligne, puis la fiche
// d'une élève montre son carnet avec les séances qui lui restent, puis
// l'agenda se remplit. Trois promesses, toutes tenues par le produit : import
// CSV, carnets réattribués avec le bon décompte, planning recréé. L'historique
// des paiements n'apparaît pas, parce qu'on ne le reprend pas.
const dims = (nom) => ({ src: `${nom}.jpg`, imgW: manifest[nom].w, imgH: manifest[nom].h });
const ELEVES = dims('eleves');
const FICHE = dims('fiche');
const AGENDA = dims('agenda');
const LIGNES = manifest.lignesEleves; // bandes [haut, bas] en px de capture
const IMPORTER = [500, 185]; // le bouton « Importer », relevé sur eleves.jpg
const CARNET = manifest.reperes.carnet; // « 4/10 séances » sur fiche.jpg
const DEFILEMENT_FICHE = FICHE.imgH - 1558; // la fiche remplit l'écran, le carnet reste dans le cadre

// Les trois lignes de l'export : les trois élèves visibles sur la capture,
// avec ce que la capture dit d'elles (Apolline n'a pas de carnet, on ne lui
// en invente pas).
const CSV = [
  ['Anouk', 'Pelletier', 'Carnet 10', '7 restantes'],
  ['Apolline', 'Garcia', 'aucun', ''],
  ['Bastien', 'Morel', 'Carnet 10', '8 restantes'],
];

// Chronologie (images) : le fichier arrive, « Importer » est cerclé, les lignes
// tombent une à une, la fiche, l'agenda.
export const CHRONO_MIGRATION = {
  fichier: 6, importer: 40, lignes: [70, 92, 114], fiche: 170, agenda: 300, fin: 420,
};

const avance = (frame, de, a) => interpolate(frame, [de, a], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });

// Un anneau qui pulse, en px d'écran (le même dessin que le clip de la landing).
const Anneau = ({ x, y, delai, fin = 1e9, teinte, echelle = 1 }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame - delai, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2)) });
  const sortie = interpolate(frame, [fin, fin + 8], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (t <= 0 || sortie <= 0) return null;
  const depuis = frame - delai - 12;
  const pulse = depuis > 0 ? (depuis % 42) / 42 : 0;
  return (
    <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: sortie }} width="100%" height="100%">
      <circle cx={x} cy={y} r={interpolate(pulse, [0, 1], [16, 52]) * echelle} fill="none" stroke={teinte} strokeWidth={4 * echelle} opacity={depuis > 0 ? interpolate(pulse, [0, 1], [0.6, 0]) : 0} />
      <circle cx={x} cy={y} r={20 * t * echelle} fill="none" stroke="#fff" strokeWidth={9 * echelle} opacity={0.9} />
      <circle cx={x} cy={y} r={20 * t * echelle} fill="none" stroke={teinte} strokeWidth={5 * echelle} />
    </svg>
  );
};

// Ce qui se passe DANS l'écran, à la largeur `screenW` (720 pour le clip de la
// landing, 470 dans le téléphone du réel). Tout est exprimé en px de capture
// puis mis à l'échelle, comme dans Scene.jsx.
export const EcranMigration = ({ screenW, chrono = CHRONO_MIGRATION }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = screenW / ELEVES.imgW;
  const teinte = TEINTES[0];
  const fichier = spring({ frame: frame - chrono.fichier, fps, config: { damping: 16, stiffness: 150 }, durationInFrames: 30 });
  const fichierSortie = interpolate(frame, [chrono.lignes[2] + 30, chrono.lignes[2] + 44], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const versFiche = avance(frame, chrono.fiche, chrono.fiche + 14);
  const versAgenda = avance(frame, chrono.agenda, chrono.agenda + 14);
  const carnet = { x: CARNET[0] * e, y: (CARNET[1] - DEFILEMENT_FICHE) * e };
  const agendaEchelle = screenW / AGENDA.imgW;

  // Le fichier : une carte blanche, en haut de l'écran, avec ses lignes.
  const carteY = 455 * e;
  const ligneH = 74 * e;
  const carteH = (60 + CSV.length * 74 + 24) * e;

  return (
    <AbsoluteFill style={{ background: '#fff', overflow: 'hidden' }}>
      <Ecran {...ELEVES} screenW={screenW} />
      {/* Les lignes de la liste, cachées tant que leur ligne d'export n'est pas arrivée. */}
      {LIGNES.map(([haut, bas], i) => {
        const s = spring({ frame: frame - chrono.lignes[i] - 16, fps, config: { damping: 200 }, durationInFrames: 18 });
        return (
          <div key={i} style={{ position: 'absolute', left: 20 * e, width: screenW - 40 * e, top: haut * e - 4, height: (bas - haut) * e + 8,
            background: '#faf6ef', borderRadius: 14 * e, opacity: 1 - s }} />
        );
      })}
      <Anneau x={IMPORTER[0] * e} y={IMPORTER[1] * e} delai={chrono.importer} fin={chrono.lignes[0]} teinte={teinte} echelle={e} />

      {/* Le fichier exporté, et ses lignes qui descendent dans la liste. */}
      <div style={{ position: 'absolute', left: 36 * e, right: 36 * e, top: carteY, height: carteH, borderRadius: 22 * e, background: P.blanc,
        boxShadow: '0 18px 46px rgba(44,33,24,0.22)', opacity: Math.min(fichier, fichierSortie),
        transform: `translateY(${(1 - fichier) * -40 * e}px) scale(${interpolate(fichier, [0, 1], [0.94, 1])})`, transformOrigin: 'top center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 * e, padding: `${16 * e}px ${22 * e}px`, borderBottom: '1px solid rgba(44,33,24,0.08)',
          fontFamily: FONT_BODY, fontWeight: 600, fontSize: 24 * e, color: P.ink }}>
          <svg width={26 * e} height={26 * e} viewBox="0 0 24 24" fill="none" stroke={P.accentDeep} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h5" />
          </svg>
          mes-eleves.csv
          <span style={{ marginLeft: 'auto', fontWeight: 400, color: P.inkSoft, fontSize: 20 * e }}>export de ton ancien outil</span>
        </div>
        {CSV.map((l, i) => {
          const depart = chrono.lignes[i];
          const p = avance(frame, depart, depart + 22);
          const cible = LIGNES[i];
          const yDepart = 60 * e + i * ligneH;
          const yCible = cible[0] * e - carteY + 12 * e;
          return (
            <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: yDepart, height: ligneH, display: 'grid', gridTemplateColumns: '1.1fr 1.3fr 1.2fr 1.2fr',
              alignItems: 'center', padding: `0 ${22 * e}px`, fontFamily: FONT_BODY, fontSize: 22 * e, color: P.ink,
              transform: `translateY(${p * (yCible - yDepart)}px)`, opacity: p < 1 ? 1 : 0, background: p > 0 ? '#fff' : 'transparent',
              boxShadow: p > 0 && p < 1 ? '0 8px 22px rgba(44,33,24,0.16)' : 'none', borderRadius: 12 * e }}>
              {l.map((c, k) => <span key={k} style={{ fontWeight: k === 0 ? 600 : 400, color: k >= 2 ? P.inkSoft : P.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c}</span>)}
            </div>
          );
        })}
      </div>

      {/* La fiche : le carnet avec ses séances restantes. */}
      {versFiche > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: versFiche }}>
          <Ecran {...FICHE} screenW={screenW} defilement={DEFILEMENT_FICHE} />
          <Anneau x={carnet.x} y={carnet.y} delai={chrono.fiche + 18} fin={chrono.agenda} teinte={TEINTES[1]} echelle={e} />
        </div>
      )}
      {/* L'agenda qui se remplit (les pastilles de la rentrée). */}
      {versAgenda > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: versAgenda }}>
          <Ecran {...AGENDA} screenW={screenW} />
          {RENTREE.pastilles.map(([x1, y1, x2, y2], i) => {
            const s = spring({ frame: frame - chrono.agenda - 16 - i * 14, fps, config: { damping: 12, stiffness: 170 }, durationInFrames: 28 });
            const cx = ((x1 + x2) / 2) * agendaEchelle;
            const cy = ((y1 + y2) / 2) * agendaEchelle;
            return (
              <div key={i}>
                <div style={{ position: 'absolute', left: x1 * agendaEchelle - 2, top: y1 * agendaEchelle - 2, width: (x2 - x1) * agendaEchelle + 4,
                  height: (y2 - y1) * agendaEchelle + 4, background: '#fff', opacity: 1 - interpolate(s, [0.85, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }} />
                {s > 0 && (
                  <Img src={staticFile(AGENDA.src)} style={{ position: 'absolute', left: 0, top: 0, width: screenW, height: AGENDA.imgH * agendaEchelle,
                    clipPath: `inset(${y1 * agendaEchelle}px ${screenW - x2 * agendaEchelle}px ${AGENDA.imgH * agendaEchelle - y2 * agendaEchelle}px ${x1 * agendaEchelle}px)`,
                    opacity: Math.min(1, s * 1.5), transform: `scale(${interpolate(s, [0, 1], [0.7, 1])})`, transformOrigin: `${cx}px ${cy}px` }} />
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* Une étiquette par phase, en bas de l'écran : ce qu'on est en train de reprendre. */}
      {[
        { de: chrono.lignes[0], a: chrono.fiche, texte: 'Tes élèves, depuis ton export' },
        { de: chrono.fiche + 10, a: chrono.agenda, texte: 'Tes carnets, avec les séances restantes' },
        { de: chrono.agenda + 10, a: 1e9, texte: 'Ton planning, recréé' },
      ].map((et, i) => {
        const entree = interpolate(frame, [et.de, et.de + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const sortie = interpolate(frame, [et.a - 10, et.a], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const o = Math.min(entree, sortie);
        if (o <= 0) return null;
        return (
          <div key={i} style={{ position: 'absolute', left: 0, right: 0, bottom: 44 * e, display: 'flex', justifyContent: 'center', opacity: o }}>
            <span style={{ background: 'rgba(44,33,24,0.86)', color: '#fff', fontFamily: FONT_BODY, fontWeight: 600, fontSize: 24 * e,
              padding: `${12 * e}px ${22 * e}px`, borderRadius: 999, letterSpacing: '0.01em' }}>{et.texte}</span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// Le CLIP de la landing : l'écran seul, 720 de large, avec le fondu de boucle.
export const FONDU_MIGRATION = 12;
export const MigrationClip = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const voile = Math.max(
    interpolate(frame, [0, FONDU_MIGRATION], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
    interpolate(frame, [durationInFrames - FONDU_MIGRATION, durationInFrames - 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
  );
  return (
    <AbsoluteFill>
      <EcranMigration screenW={LARGEUR_CLIP} />
      <div style={{ position: 'absolute', inset: 0, background: P.bgFrom, opacity: voile, pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};
export const DUREE_CLIP_MIGRATION = CHRONO_MIGRATION.fin;

// Le RÉEL : titre, téléphone, cartes, et la carte de fin « Commente STUDIO ».
const MOCKUP = { x: 60, y: 470, screenW: 470, hauteurEcran: 1017 };
export const Migration = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entree = spring({ frame: frame - 4, fps, config: { damping: 200 }, durationInFrames: 30 });
  const c = CHRONO_MIGRATION;
  return (
    <AbsoluteFill>
      <Fond>
        <Titre eyebrow="Déjà équipée ?" lignes={['On reprend', 'ce qui se reprend.']} y={200} />
        <div style={{ position: 'absolute', inset: 0, opacity: entree, transform: `translateY(${(1 - entree) * 90}px)` }}>
          <Telephone {...MOCKUP} {...ELEVES}>
            <EcranMigration screenW={MOCKUP.screenW} />
          </Telephone>
        </div>
        <Carte x={560} y={640} w={460} numero={1} label="Tes élèves" sous="Depuis l’export de ton ancien outil" delai={c.lignes[0]} teinte={TEINTES[0]} />
        <Carte x={560} y={900} w={460} numero={2} label="Tes carnets" sous="Avec les séances qui restent à chacune" delai={c.fiche + 10} teinte={TEINTES[1]} />
        <Carte x={560} y={1160} w={460} numero={3} label="Ton planning" sous="Recréé en séries, vacances comprises" delai={c.agenda + 10} teinte={TEINTES[0]} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1700, textAlign: 'center', fontFamily: FONT_BODY, fontWeight: 500,
          fontSize: 24, letterSpacing: '0.04em', color: P.inkSoft, opacity: 0.8 }}>izisolo.fr/changer-d-outil</div>
      </Fond>
      <AppelStudio depuis={c.fin} titre={['Tu gardes ton ancien outil', 'le temps de comparer.']} />
    </AbsoluteFill>
  );
};
export const DUREE_MIGRATION = CHRONO_MIGRATION.fin + 100;
