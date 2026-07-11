/**
 * lib/notif-prefs — catalogue des types de notifications + préférences.
 *
 * Chaque type a un défaut (on/off). Les préférences sont stockées en JSONB :
 *   - clients.notif_prefs  (élève, par studio)
 *   - profiles.notif_prefs (prof)
 * Une clé absente ⇒ on retombe sur le défaut du catalogue.
 *
 * `wantsNotif(prefs, type)` est la seule porte à utiliser côté envoi (email/push).
 */

// ── Catalogue élève ──────────────────────────────────────────────────────
export const NOTIF_TYPES_ELEVE = [
  { key: 'rappel_cours',  label: 'Rappel de cours',        desc: 'La veille d\'un cours que tu as réservé.',            defaut: true },
  { key: 'cours_annule',  label: 'Cours annulé',           desc: 'Si ton studio annule un cours où tu es inscrit·e.',    defaut: true },
  { key: 'place_liberee', label: 'Place libérée',          desc: 'Quand une place se libère sur ta liste d\'attente.',   defaut: true },
  { key: 'message',       label: 'Messages',               desc: 'Quand ton studio t\'écrit.',                           defaut: true },
  { key: 'carnet',        label: 'Carnet & abonnement',    desc: 'Carnet bientôt épuisé ou abonnement qui expire.',      defaut: true },
  { key: 'paiement',      label: 'Paiements',              desc: 'Paiement enregistré ou montant à régler.',             defaut: true },
  { key: 'essai',         label: 'Cours d\'essai',         desc: 'Réponse à ta demande d\'essai.',                       defaut: true },
];

// ── Catalogue prof ───────────────────────────────────────────────────────
export const NOTIF_TYPES_PROF = [
  { key: 'reservation',    label: 'Nouvelle réservation',   desc: 'Quand un·e élève réserve un cours.',                  defaut: true },
  { key: 'annulation',     label: 'Annulation d\'élève',    desc: 'Quand un·e élève annule (surtout tardivement).',      defaut: true },
  { key: 'message',        label: 'Messages',               desc: 'Quand un·e élève t\'écrit.',                          defaut: true },
  { key: 'liste_attente',  label: 'Liste d\'attente',       desc: 'Nouvelle inscription en liste d\'attente.',           defaut: true },
  { key: 'essai_demande',  label: 'Demande d\'essai',       desc: 'Nouvelle demande de cours d\'essai.',                 defaut: true },
  { key: 'paiement_stripe',label: 'Paiement en ligne',      desc: 'Quand tu reçois un paiement Stripe.',                 defaut: true },
  { key: 'pointage_rappel',label: 'Rappel de pointage',     desc: 'Si tu oublies de pointer un cours passé.',            defaut: false },
];

function defaultsFor(list) {
  const out = {};
  for (const t of list) out[t.key] = t.defaut;
  return out;
}

/**
 * L'utilisateur veut-il recevoir ce type de notif ? Lit prefs[type], sinon
 * retombe sur le défaut du catalogue (élève ou prof selon `audience`).
 * @param {object|null} prefs   JSONB stocké (clients/profiles.notif_prefs)
 * @param {string} type
 * @param {'eleve'|'prof'} audience
 */
export function wantsNotif(prefs, type, audience = 'eleve') {
  const cat = audience === 'prof' ? NOTIF_TYPES_PROF : NOTIF_TYPES_ELEVE;
  const def = cat.find(t => t.key === type);
  const fallback = def ? def.defaut : true; // type hors catalogue → on laisse passer
  if (!prefs || typeof prefs !== 'object' || !(type in prefs)) return fallback;
  return prefs[type] !== false;
}

/** Normalise un objet de prefs reçu du client (ne garde que les clés connues). */
export function sanitizePrefs(input, audience = 'eleve') {
  const cat = audience === 'prof' ? NOTIF_TYPES_PROF : NOTIF_TYPES_ELEVE;
  const out = {};
  for (const t of cat) {
    if (input && t.key in input) out[t.key] = input[t.key] !== false;
  }
  return out;
}

/** Prefs effectives (défauts fusionnés avec le stocké) pour affichage UI. */
export function effectivePrefs(prefs, audience = 'eleve') {
  const cat = audience === 'prof' ? NOTIF_TYPES_PROF : NOTIF_TYPES_ELEVE;
  const base = defaultsFor(cat);
  return { ...base, ...(prefs && typeof prefs === 'object' ? prefs : {}) };
}
