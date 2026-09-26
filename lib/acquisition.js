/**
 * D'où vient une inscription (2026-09-26, campagne Google Ads).
 *
 * Le site n'a AUCUNE balise Google, aucun cookie publicitaire, et la page RGPD
 * le promet (« aucun cookie publicitaire, traqueur tiers, pixel »). Pour savoir
 * ce qu'une campagne rapporte sans trahir cette promesse, la source voyage
 * dans l'URL et nulle part ailleurs : les paramètres `utm_*` posés par
 * l'annonce sont recopiés par `LienCta` sur les liens internes de la page
 * (donc jusqu'à /register et /creer-mon-studio), puis rangés dans la metadata
 * du compte à l'inscription et sur la demande concierge. Ni cookie, ni
 * localStorage, ni sessionStorage : une visiteuse qui ferme l'onglet et
 * revient en tapant izisolo.fr est « directe », et c'est assumé.
 *
 * Module PUR : importable par les specs Node, par le navigateur et par les
 * routes. Le verrou CI `acquisition.spec.js` fige l'absence de stockage.
 */

const CLES = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const CHAMPS = { utm_source: 'source', utm_medium: 'canal', utm_campaign: 'campagne', utm_content: 'groupe', utm_term: 'mot' };
const CLE_PAR_CHAMP = Object.fromEntries(Object.entries(CHAMPS).map(([k, v]) => [v, k]));
const MAX = { source: 40, canal: 40, campagne: 80, groupe: 80, mot: 100 };
// Contrôles, chevrons, guillemets, antislash : rien de tout ça n'est un mot-clé.
const INTERDITS = /[\u0000-\u001f<>"'`\\]/g;

function propre(v, max) {
  if (v == null) return null;
  const s = String(v).replace(INTERDITS, '').trim().toLowerCase();
  if (!s) return null;
  // Un ValueTrack non rempli arrive tel quel (« {keyword} ») : ce n'est pas un mot.
  if (/^\{[a-z_]+\}$/.test(s)) return null;
  return s.length > max ? s.slice(0, max) : s;
}

/**
 * Lit les `utm_*` d'une query string (ou d'un URLSearchParams).
 * @returns {{source, canal?, campagne?, groupe?, mot?}|null} null sans utm_source.
 */
export function lireAcquisition(search) {
  let params;
  try {
    params = search instanceof URLSearchParams ? search : new URLSearchParams(String(search || ''));
  } catch {
    return null;
  }
  const acq = {};
  for (const cle of CLES) {
    const champ = CHAMPS[cle];
    const v = propre(params.get(cle), MAX[champ]);
    if (v) acq[champ] = v;
  }
  return acq.source ? acq : null;
}

/** Nettoie un objet reçu d'un corps JSON ou d'une metadata (jamais de confiance). */
export function sanitizeAcquisition(brut) {
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return null;
  const acq = {};
  for (const [champ, max] of Object.entries(MAX)) {
    const v = propre(brut[champ], max);
    if (v) acq[champ] = v;
  }
  return acq.source ? acq : null;
}

/**
 * Recopie la source sur un lien INTERNE (chemin absolu du site) sans écraser
 * un paramètre déjà présent (`/creer-mon-studio?src=changer` garde son `src`).
 * Un lien externe, une ancre seule ou un href non textuel repartent intacts.
 */
export function hrefAvecAcquisition(href, acq) {
  if (!acq?.source || typeof href !== 'string') return href;
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  const [sansHash, hash] = href.split('#');
  const [chemin, query = ''] = sansHash.split('?');
  if (!chemin) return href;
  const params = new URLSearchParams(query);
  for (const [champ, cle] of Object.entries(CLE_PAR_CHAMP)) {
    if (acq[champ] && !params.has(cle)) params.set(cle, acq[champ]);
  }
  const q = params.toString();
  return chemin + (q ? '?' + q : '') + (hash !== undefined ? '#' + hash : '');
}

/** Une ligne lisible pour une demande ou un email : « google / cpc / recherche / yoga / logiciel prof yoga ». */
export function resumeAcquisition(acq) {
  if (!acq?.source) return null;
  return [acq.source, acq.canal, acq.campagne, acq.groupe, acq.mot].filter(Boolean).join(' / ').slice(0, 200);
}

/** Le libellé qui regroupe dans l'admin : « Google Ads · yoga », « Direct ou inconnu ». */
export function libelleSource(acq) {
  if (!acq?.source) return 'Direct ou inconnu';
  const base = acq.source === 'google' && acq.canal === 'cpc' ? 'Google Ads' : acq.source;
  return acq.groupe ? `${base} · ${acq.groupe}` : base;
}

/**
 * Les inscriptions regroupées par source, avec le funnel de chacune.
 * `profils` = profils enrichis de l'admin (est_test, studio_slug, nb_cours,
 * nb_clients, created_at, acquisition). `depuis` = date ISO pour la colonne
 * « récents ». Les comptes de test ne comptent jamais.
 */
export function inscriptionsParSource(profils, { depuis = null } = {}) {
  const map = new Map();
  for (const p of profils || []) {
    if (p.est_test) continue;
    const cle = libelleSource(p.acquisition);
    const r = map.get(cle) || { source: cle, inscrits: 0, recents: 0, onboardes: 0, avecCours: 0, avecEleves: 0 };
    r.inscrits += 1;
    if (depuis && (p.created_at || '') >= depuis) r.recents += 1;
    if (p.studio_slug) r.onboardes += 1;
    if ((p.nb_cours || 0) > 0) r.avecCours += 1;
    if ((p.nb_clients || 0) > 0) r.avecEleves += 1;
    map.set(cle, r);
  }
  return [...map.values()].sort((a, b) => b.inscrits - a.inscrits || a.source.localeCompare(b.source));
}
