// ============================================================================
// IziSolo — Déclaration URSSAF : LA source unique des règles (v93, 2026-08-22)
// ----------------------------------------------------------------------------
// Ce module est PUR : aucun accès DB, aucun Date.now() caché, une seule
// dépendance (lib/modes-paiement.js, pure elle aussi).
// Importable par les specs Node (verrou CI `urssaf.spec.js`) et par le cron.
//
// Ce qu'il fige :
//   • l'ASSIETTE : la micro-entreprise déclare en TRÉSORERIE. Ce qui compte
//     est la date d'ENCAISSEMENT, jamais la date de vente. Un chèque daté du
//     28/09 déposé le 03/10 appartient au T4. `dateComptable()` et
//     `filtreDateComptable()` sont les deux seules portes.
//   • les PÉRIODES : trimestres CIVILS (T1 = janv-mars), jamais une fenêtre
//     glissante « 3 derniers mois » — l'URSSAF ne connaît que le calendrier.
//   • l'ÉCHÉANCE : dernier jour du mois SUIVANT la fin de période. Règle
//     unique, valable au mois comme au trimestre (T3 finit en sept → 31 oct).
//   • les TAUX : des DÉFAUTS éditables, pas une vérité. Cf. ⚠️ ci-dessous.
//
// ⚠️ TAUX — à ne jamais traiter comme acquis. Le taux micro-BNC bouge par
// paliers depuis la réforme 2024 et il est recopié en dur dans 7 surfaces
// publiques (5 articles de blog, content/cities-extra.js, et deux fois dans
// app/outils/calculateur-revenu-prof-yoga/Calculateur.jsx). Ici il n'est qu'un
// DÉFAUT proposé : la prof saisit le sien, l'app n'affiche jamais qu'une
// estimation. Vérif annuelle inscrite dans lib/routines-ops.js.
// ============================================================================

import { normaliserMode } from './modes-paiement.js';

/** Régimes proposés. `taux` = défaut proposé, TOUJOURS éditable par la prof. */
export const REGIMES = {
  micro_bnc: {
    label: 'Micro-entreprise · BNC (prestations libérales)',
    hint: 'Le cas de la très grande majorité des profs de yoga, pilates, danse.',
    taux: 21.2,
    taux_cfp: 0.2,
  },
  micro_bic_services: {
    label: 'Micro-entreprise · BIC prestations de services',
    hint: 'Si ton activité est enregistrée en commercial plutôt qu\'en libéral.',
    taux: 21.2,
    taux_cfp: 0.1,
  },
  micro_bic_vente: {
    label: 'Micro-entreprise · BIC vente de marchandises',
    hint: 'Vente de tapis, huiles, matériel. Rarement le cas principal.',
    taux: 12.3,
    taux_cfp: 0.1,
  },
  autre: {
    label: 'Autre régime (EI au réel, société)',
    hint: 'On te donne le total encaissé, sans estimation de cotisations.',
    taux: 0,
    taux_cfp: 0,
  },
};

export const PERIODICITES = {
  mensuelle:     { label: 'Tous les mois' },
  trimestrielle: { label: 'Tous les trimestres' },
};

/** Config par défaut quand la prof n'a rien réglé (ou pré-migration v93). */
export const CONFIG_URSSAF_DEFAUT = {
  regime: 'micro_bnc',
  taux_cotisations: REGIMES.micro_bnc.taux,
  taux_cfp: REGIMES.micro_bnc.taux_cfp,
  periodicite: 'trimestrielle',
  versement_liberatoire: false,
  taux_liberatoire: 2.2,
  rappel_email: true,
};

function nombreOuNull(v, { min = 0, max = 100 } = {}) {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n * 1000) / 1000;
}

/**
 * Nettoie le jsonb `profiles.urssaf_config`. Jamais cru tel quel.
 * @returns {Object|null} null = la prof n'a rien configuré (aucun rappel, pas
 *   d'estimation affichée sans son accord).
 */
export function sanitizeConfigUrssaf(raw) {
  let src = raw;
  if (typeof src === 'string') {
    try { src = JSON.parse(src); } catch { return null; }
  }
  if (!src || typeof src !== 'object' || Array.isArray(src)) return null;

  const regime = Object.hasOwn(REGIMES, src.regime) ? src.regime : CONFIG_URSSAF_DEFAUT.regime;
  const periodicite = Object.hasOwn(PERIODICITES, src.periodicite)
    ? src.periodicite
    : CONFIG_URSSAF_DEFAUT.periodicite;

  const tauxCot = nombreOuNull(src.taux_cotisations);
  const tauxCfp = nombreOuNull(src.taux_cfp);
  const tauxLib = nombreOuNull(src.taux_liberatoire, { max: 10 });

  return {
    regime,
    // Taux absent ou difforme → défaut du régime (jamais NaN, jamais 0 par accident).
    taux_cotisations: tauxCot === null ? REGIMES[regime].taux : tauxCot,
    taux_cfp:         tauxCfp === null ? REGIMES[regime].taux_cfp : tauxCfp,
    periodicite,
    versement_liberatoire: src.versement_liberatoire === true,
    taux_liberatoire: tauxLib === null ? CONFIG_URSSAF_DEFAUT.taux_liberatoire : tauxLib,
    // Le rappel n'est JAMAIS activé par défaut sur une config absente : la
    // fonction renvoie null dans ce cas, donc pas d'email non sollicité.
    rappel_email: src.rappel_email !== false,
  };
}

/** Config à AFFICHER dans l'éditeur : défauts si rien n'est encore réglé. */
export function configUrssafAffichee(raw) {
  return sanitizeConfigUrssaf(raw) || { ...CONFIG_URSSAF_DEFAUT };
}

/** La prof a-t-elle réglé sa déclaration ? (pilote le bloc Revenus + le rappel) */
export function urssafConfigure(raw) {
  return sanitizeConfigUrssaf(raw) !== null;
}

// ── Assiette : quelle date fait foi ─────────────────────────────────────────

/**
 * LA date qui compte pour un paiement.
 * @param {'encaissement'|'vente'} base
 *   'encaissement' (défaut) = assiette URSSAF, trésorerie réelle.
 *   'vente'                 = date de facturation (l'ancien comportement).
 *
 * `date_encaissement` est NULL sur les paiements vendus « payé maintenant »
 * avant v93 (la RPC vendre_offre ne l'écrivait pas) : le coalesce sur `date`
 * rend ce module exact AVANT comme APRÈS la migration.
 */
export function dateComptable(paiement, base = 'encaissement') {
  if (!paiement) return null;
  const vente = paiement.date || null;
  if (base === 'vente') return vente;
  return paiement.date_encaissement || vente;
}

/** Mois comptable 'AAAA-MM' — la colonne qui rend le CSV pivotable. */
export function moisComptable(paiement, base = 'encaissement') {
  return String(dateComptable(paiement, base) || '').slice(0, 7);
}

/**
 * Filtre PostgREST équivalent à `coalesce(date_encaissement, date) BETWEEN from AND to`.
 * Rendu ici (pur) pour que la borne temporelle ait UNE définition, partagée par
 * l'export CSV, le récap, le livre des recettes et le cron.
 *
 * Pas de fenêtre élargie + refiltrage JS : ce serait un plafond silencieux
 * (un chèque encaissé 6 mois plus tard sortirait du filet sans un mot).
 * Le `.or()` borne en SQL, sans plafond, et s'appuie sur l'index partiel
 * paiements_date_encaissement_idx (v12).
 */
export function filtreDateComptable(from, to) {
  return [
    `and(date_encaissement.gte.${from},date_encaissement.lte.${to})`,
    `and(date_encaissement.is.null,date.gte.${from},date.lte.${to})`,
  ].join(',');
}

// ── Périodes civiles + échéances ────────────────────────────────────────────

const DEUX = (n) => String(n).padStart(2, '0');

/** Dernier jour du mois (annee, mois 1-12), en 'AAAA-MM-JJ'. */
function finDeMois(annee, mois) {
  const d = new Date(Date.UTC(annee, mois, 0)); // jour 0 du mois suivant
  return `${d.getUTCFullYear()}-${DEUX(d.getUTCMonth() + 1)}-${DEUX(d.getUTCDate())}`;
}

/**
 * Échéance de déclaration : dernier jour du mois SUIVANT la fin de période.
 * Règle unique — mensuel (sept → 31 oct) comme trimestriel (T3 → 31 oct,
 * T4 → 31 janvier de l'année suivante).
 */
export function echeanceDeclaration(finPeriode) {
  const [a, m] = String(finPeriode).split('-').map(Number);
  if (!Number.isFinite(a) || !Number.isFinite(m)) return null;
  const anneeSuivante = m === 12 ? a + 1 : a;
  const moisSuivant = m === 12 ? 1 : m + 1;
  return finDeMois(anneeSuivante, moisSuivant);
}

/** 'AAAA-MM-JJ' du jour, en heure de Paris (le serveur tourne en UTC). */
export function aujourdhuiParis(now = new Date()) {
  return now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
}

const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Une période déclarable, décrite entièrement (jamais recalculée ailleurs). */
function construirePeriode(id, label, from, to, aujourdhui) {
  const echeance = echeanceDeclaration(to);
  const [ea, em, ej] = echeance.split('-').map(Number);
  return {
    id,
    label,
    from,
    to,
    // Une période n'est déclarable qu'une fois CLOSE (sinon le montant bouge
    // encore sous les doigts de la prof).
    cloturee: to < aujourdhui,
    echeance,
    echeanceLabel: `${ej} ${MOIS_FR[em - 1]} ${ea}`,
    joursRestants: joursEntre(aujourdhui, echeance),
  };
}

/** Nombre de jours calendaires entre deux dates 'AAAA-MM-JJ' (b - a). */
export function joursEntre(a, b) {
  const da = Date.parse(`${a}T12:00:00Z`);
  const db = Date.parse(`${b}T12:00:00Z`);
  if (!Number.isFinite(da) || !Number.isFinite(db)) return null;
  return Math.round((db - da) / 86400000);
}

/** Période mensuelle depuis une année + un mois (1-12). */
export function periodeMois(annee, mois, aujourdhui) {
  const from = `${annee}-${DEUX(mois)}-01`;
  return construirePeriode(
    `M-${annee}-${DEUX(mois)}`,
    `${MOIS_FR[mois - 1]} ${annee}`,
    from,
    finDeMois(annee, mois),
    aujourdhui
  );
}

/** Période trimestrielle CIVILE depuis une année + un trimestre (1-4). */
export function periodeTrimestre(annee, trimestre, aujourdhui) {
  const premierMois = (trimestre - 1) * 3 + 1;
  const dernierMois = premierMois + 2;
  return construirePeriode(
    `T${trimestre}-${annee}`,
    `T${trimestre} ${annee} (${MOIS_FR[premierMois - 1]} à ${MOIS_FR[dernierMois - 1]})`,
    `${annee}-${DEUX(premierMois)}-01`,
    finDeMois(annee, dernierMois),
    aujourdhui
  );
}

/** Période « année civile » — le récap annuel (déclaration de revenus). */
export function periodeAnnee(annee, aujourdhui) {
  return construirePeriode(`A-${annee}`, `Année ${annee}`, `${annee}-01-01`, `${annee}-12-31`, aujourdhui);
}

/**
 * Les périodes proposées à la prof, la plus récente CLOSE en tête.
 * @returns {Array} période courante (en cours) incluse, marquée `cloturee:false`.
 */
export function periodesDeclarables(config, aujourdhui, combien = 6) {
  const cfg = sanitizeConfigUrssaf(config) || CONFIG_URSSAF_DEFAUT;
  const [annee, mois] = aujourdhui.split('-').map(Number);
  const out = [];

  if (cfg.periodicite === 'mensuelle') {
    for (let i = 0; i < combien; i++) {
      const d = new Date(Date.UTC(annee, mois - 1 - i, 1));
      out.push(periodeMois(d.getUTCFullYear(), d.getUTCMonth() + 1, aujourdhui));
    }
  } else {
    const trimCourant = Math.floor((mois - 1) / 3) + 1;
    for (let i = 0; i < combien; i++) {
      let t = trimCourant - i;
      let a = annee;
      while (t <= 0) { t += 4; a -= 1; }
      out.push(periodeTrimestre(a, t, aujourdhui));
    }
  }
  return out;
}

/** La période à mettre en avant : la dernière CLOSE, sinon celle en cours. */
export function periodeAMettreEnAvant(config, aujourdhui) {
  const periodes = periodesDeclarables(config, aujourdhui);
  return periodes.find(p => p.cloturee) || periodes[0] || null;
}

/** Résout un id de période ('T3-2026', 'M-2026-09', 'A-2026') en période. */
export function periodeParId(id, aujourdhui) {
  const s = String(id || '');
  let m;
  if ((m = s.match(/^T([1-4])-(\d{4})$/)))      return periodeTrimestre(Number(m[2]), Number(m[1]), aujourdhui);
  if ((m = s.match(/^M-(\d{4})-(0[1-9]|1[0-2])$/))) return periodeMois(Number(m[1]), Number(m[2]), aujourdhui);
  if ((m = s.match(/^A-(\d{4})$/)))             return periodeAnnee(Number(m[1]), aujourdhui);
  return null;
}

// ── Estimation des cotisations ──────────────────────────────────────────────

/**
 * Estimation de ce qu'il faudra payer sur un CA encaissé.
 *
 * ⚠️ Le CA déclaré est le montant BRUT payé par l'élève, jamais le net reçu
 * après frais Stripe et commission IziSolo : en micro il n'y a pas de charge
 * déductible, l'abattement forfaitaire les couvre déjà. Sous-déclarer le net
 * est un redressement. Les frais sont donc informatifs, jamais soustraits ici.
 */
export function estimationCotisations(caBrut, config) {
  const cfg = sanitizeConfigUrssaf(config) || CONFIG_URSSAF_DEFAUT;
  const ca = Number.isFinite(Number(caBrut)) ? Math.max(0, Number(caBrut)) : 0;
  const arrondi = (n) => Math.round(n * 100) / 100;

  const cotisations = arrondi(ca * cfg.taux_cotisations / 100);
  const cfp = arrondi(ca * cfg.taux_cfp / 100);
  const liberatoire = cfg.versement_liberatoire ? arrondi(ca * cfg.taux_liberatoire / 100) : 0;

  return {
    ca: arrondi(ca),
    cotisations,
    cfp,
    liberatoire,
    total: arrondi(cotisations + cfp + liberatoire),
    // `false` = régime « autre » : on donne le CA, pas d'estimation inventée.
    estimable: cfg.regime !== 'autre' && cfg.taux_cotisations > 0,
    config: cfg,
  };
}

/** Totaux d'un lot de paiements. Une seule addition dans toute l'app. */
export function totauxPaiements(paiements, base = 'encaissement') {
  let brut = 0, frais = 0;
  const parMode = {};
  const parMois = {};

  for (const p of (paiements || [])) {
    const montant = parseFloat(p?.montant) || 0;
    const commission = parseFloat(p?.commission_montant) || 0;
    brut += montant;
    frais += commission;
    // Normalisé : la base contient « Espèces » ET « especes » (le pointage
    // écrivait les libellés) — sans ça, le récap sort deux lignes « Espèces »
    // et la tuile de /revenus en oublie une. Cf. lib/modes-paiement.js.
    const mode = normaliserMode(p?.mode);
    parMode[mode] = (parMode[mode] || 0) + montant;
    const mois = moisComptable(p, base);
    if (mois) parMois[mois] = (parMois[mois] || 0) + montant;
  }

  const arrondi = (n) => Math.round(n * 100) / 100;
  return {
    nombre: (paiements || []).length,
    brut: arrondi(brut),
    frais: arrondi(frais),
    net: arrondi(brut - frais),
    parMode: Object.fromEntries(Object.entries(parMode).map(([k, v]) => [k, arrondi(v)])),
    parMois: Object.fromEntries(Object.entries(parMois).map(([k, v]) => [k, arrondi(v)])),
  };
}

/** '1 240,50' — format FR, sans symbole (le CSV et le PDF l'ajoutent). */
export function montantFr(n) {
  return (Number.isFinite(Number(n)) ? Number(n) : 0).toFixed(2).replace('.', ',');
}

// ── Rappel d'échéance ───────────────────────────────────────────────────────

/**
 * Faut-il envoyer le rappel de déclaration à ce studio aujourd'hui ?
 *
 * Fenêtre de 5 jours après la clôture (et non « le 1er du mois » pile) : si le
 * cron tombe ce jour-là, le rappel serait perdu pour un trimestre entier. La
 * dédup par claim (profileId:periodeId) garantit malgré tout UN seul email.
 *
 * @returns {Object|null} la période à rappeler, ou null
 */
export function rappelUrssafDuJour(config, aujourdhui, fenetreJours = 5) {
  const cfg = sanitizeConfigUrssaf(config);
  if (!cfg || cfg.rappel_email === false) return null;
  const periode = periodesDeclarables(cfg, aujourdhui).find(p => p.cloturee);
  if (!periode) return null;
  const depuisCloture = joursEntre(periode.to, aujourdhui);
  if (depuisCloture === null || depuisCloture < 1 || depuisCloture > fenetreJours) return null;
  return periode;
}

/**
 * Email de rappel — même gabarit que les autres emails du cron (560 px,
 * bouton cuivre, « Bonjour », jamais « Salut »).
 *
 * ⚠️ Le corps dit explicitement qu'IziSolo ne connaît que ce qui a été
 * enregistré ici : une prof qui encaisse aussi ailleurs (studio, atelier
 * ponctuel) doit l'ajouter. Un montant présenté comme exhaustif alors qu'il
 * ne l'est pas ferait sous-déclarer.
 */
export function renderEmailUrssaf({ prenom = '', periode, total = 0, config, appUrl = 'https://www.izisolo.fr' }) {
  const cfg = sanitizeConfigUrssaf(config) || CONFIG_URSSAF_DEFAUT;
  const aDeclarer = Math.round(Number(total) || 0);
  const est = estimationCotisations(total, cfg);
  const bonjour = `Bonjour ${prenom || ''}`.trimEnd() + ',';
  const rien = aDeclarer === 0;

  const blocEstimation = (!rien && est.estimable) ? `
          <p style="color:#555;margin:0 0 14px;font-size:0.875rem;">
            À prévoir, environ <strong>${montantFr(est.total)} €</strong> de cotisations
            (estimation d'après les taux que tu as saisis, jamais un montant officiel).
          </p>` : '';

  return {
    subject: rien
      ? `${periode.label} : pense à déclarer, même à zéro`
      : `${periode.label} : ${aDeclarer} € à déclarer`,
    html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <h2 style="color:#b87333;margin:0 0 6px;">${periode.label} est clôturé</h2>
          <p style="color:#555;margin:0 0 14px;">${bonjour}</p>
          ${rien ? `
          <p style="color:#555;margin:0 0 14px;">
            Aucun encaissement enregistré sur cette période. Pense quand même à
            <strong>déclarer zéro</strong> : c'est obligatoire, même sans recette.
          </p>` : `
          <p style="color:#555;margin:0 0 14px;">
            Voici ce que tu as encaissé sur la période, prêt à recopier dans ta déclaration.
          </p>
          <div style="text-align:center;margin:20px 0;padding:18px;background:#faf6f2;border-radius:12px;">
            <div style="font-size:2rem;font-weight:800;color:#b87333;line-height:1.2;">${aDeclarer} €</div>
            <div style="color:#999;font-size:0.8125rem;margin-top:4px;">montant exact : ${montantFr(total)} €</div>
          </div>
          ${blocEstimation}`}
          <p style="color:#555;margin:0 0 14px;">
            <strong>À déclarer avant le ${periode.echeanceLabel}</strong> sur ton compte
            <a href="https://www.autoentrepreneur.urssaf.fr" style="color:#b87333;font-weight:600;">autoentrepreneur.urssaf.fr</a>.
          </p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${appUrl}/revenus" style="display:inline-block;padding:14px 28px;background:#b87333;color:white;text-decoration:none;border-radius:99px;font-weight:700;">
              Voir le détail et mon livre des recettes
            </a>
          </div>
          <p style="color:#999;margin:16px 0 0;font-size:0.8125rem;">
            Ce montant ne compte que ce qui a été enregistré dans IziSolo. Si tu encaisses aussi
            ailleurs (remplacement en studio, atelier ponctuel), ajoute-le avant de déclarer.
          </p>
          <p style="color:#999;margin:8px 0 0;font-size:0.8125rem;">
            Tu peux couper ce rappel dans Paramètres, onglet Activité.
          </p>
        </div>
      `,
  };
}
