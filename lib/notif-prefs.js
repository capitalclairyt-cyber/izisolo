/**
 * lib/notif-prefs — catalogue des types de notifications + préférences.
 *
 * Chaque type déclare les CANAUX qui le concernent (`channels`) et un défaut
 * par canal. Préférences stockées en JSONB par type et par canal :
 *   clients.notif_prefs / profiles.notif_prefs
 *   ex : { "rappel_cours": { "email": true, "push": false }, ... }
 *
 * Rétrocompat : une ancienne valeur booléenne (`{ type: true }`) est lue comme
 * s'appliquant à tous les canaux du type.
 *
 * `wantsNotif(prefs, type, audience, channel)` = la seule porte côté envoi.
 */

// channels : canaux réellement émis pour ce type (les autres n'ont pas de sens
// — ex : un "nouveau message" ne part pas en email direct mais en digest ;
// une confirmation d'essai est transactionnelle, toujours envoyée).
export const NOTIF_TYPES_ELEVE = [
  { key: 'rappel_cours',  label: 'Rappel de cours',     desc: 'La veille d\'un cours réservé.',                channels: ['email', 'push'], defaut: { email: true, push: true } },
  { key: 'cours_annule',  label: 'Cours annulé',        desc: 'Si ton studio annule un cours où tu es inscrit·e.', channels: ['email', 'push'], defaut: { email: true, push: true } },
  { key: 'place_liberee', label: 'Place libérée',       desc: 'Une place se libère sur ta liste d\'attente.',  channels: ['email', 'push'], defaut: { email: true, push: true } },
  { key: 'carnet',        label: 'Carnet & abonnement', desc: 'Carnet bientôt épuisé ou abonnement qui expire.', channels: ['email', 'push'], defaut: { email: true, push: true } },
  { key: 'message',       label: 'Messages',            desc: 'Quand ton studio t\'écrit.',                    channels: ['push'], defaut: { push: true } },
  { key: 'paiement',      label: 'Paiements',           desc: 'Paiement enregistré.',                          channels: ['push'], defaut: { push: true } },
  { key: 'essai',         label: 'Cours d\'essai',      desc: 'Réponse à ta demande d\'essai.',                channels: ['push'], defaut: { push: true } },
];

export const NOTIF_TYPES_PROF = [
  { key: 'reservation',     label: 'Nouvelle réservation', desc: 'Quand un·e élève réserve un cours.',            channels: ['push'], defaut: { push: true } },
  { key: 'annulation',      label: 'Annulation d\'élève',  desc: 'Quand un·e élève annule.',                      channels: ['push'], defaut: { push: true } },
  { key: 'message',         label: 'Messages',             desc: 'Quand un·e élève t\'écrit.',                    channels: ['push'], defaut: { push: true } },
  { key: 'liste_attente',   label: 'Liste d\'attente',     desc: 'Nouvelle inscription en liste d\'attente.',     channels: ['push'], defaut: { push: true } },
  { key: 'essai_demande',   label: 'Demande d\'essai',     desc: 'Nouvelle demande de cours d\'essai.',           channels: ['email', 'push'], defaut: { email: true, push: true } },
  { key: 'paiement_stripe', label: 'Paiement en ligne',    desc: 'Quand tu reçois un paiement Stripe.',           channels: ['push'], defaut: { push: true } },
  { key: 'pointage_rappel', label: 'Rappel de pointage',   desc: 'Si tu oublies de pointer un cours passé.',      channels: ['push'], defaut: { push: false } },
];

function catalog(audience) {
  return audience === 'prof' ? NOTIF_TYPES_PROF : NOTIF_TYPES_ELEVE;
}

/**
 * L'utilisateur veut-il ce type sur ce canal ?
 * @param {object|null} prefs
 * @param {string} type
 * @param {'eleve'|'prof'} audience
 * @param {'email'|'push'} channel
 */
export function wantsNotif(prefs, type, audience = 'eleve', channel = 'push') {
  const def = catalog(audience).find(t => t.key === type);
  // Canal non pertinent pour ce type → jamais.
  if (def && !def.channels.includes(channel)) return false;
  const fallback = def ? (def.defaut?.[channel] ?? true) : true;

  const stored = prefs?.[type];
  if (stored == null) return fallback;
  if (typeof stored === 'boolean') return stored;           // ancien format : 1 toggle → tous canaux
  if (typeof stored === 'object') {
    return channel in stored ? stored[channel] !== false : fallback;
  }
  return fallback;
}

/** Ne garde que les types/canaux connus, au format { type: { email, push } }. */
export function sanitizePrefs(input, audience = 'eleve') {
  const out = {};
  for (const t of catalog(audience)) {
    const v = input?.[t.key];
    if (v == null) continue;
    const entry = {};
    for (const ch of t.channels) {
      if (typeof v === 'boolean') entry[ch] = v;            // migre l'ancien format
      else if (v && ch in v) entry[ch] = v[ch] !== false;
    }
    if (Object.keys(entry).length) out[t.key] = entry;
  }
  return out;
}

/** Prefs effectives (défauts par canal fusionnés avec le stocké) pour l'UI. */
export function effectivePrefs(prefs, audience = 'eleve') {
  const out = {};
  for (const t of catalog(audience)) {
    out[t.key] = {};
    for (const ch of t.channels) {
      out[t.key][ch] = wantsNotif(prefs, t.key, audience, ch);
    }
  }
  return out;
}
