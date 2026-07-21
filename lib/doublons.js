/**
 * Détection de fiches élèves en double (côté prof).
 *
 * Deux fiches sont « probablement la même personne » si elles partagent, après
 * normalisation, l'un de ces signaux : email, téléphone, ou nom+prénom.
 * On reste volontairement prudent (pas de fuzzy hasardeux) pour ne proposer que
 * des fusions à forte confiance — la prof valide toujours.
 */

export function normEmail(email) {
  if (!email) return '';
  let e = String(email).trim().toLowerCase();
  // Gmail : ignore les points et le +alias (marie.dupont+yoga@gmail = mariedupont@gmail)
  const at = e.indexOf('@');
  if (at > 0) {
    let local = e.slice(0, at);
    const domain = e.slice(at + 1);
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      local = local.split('+')[0].replace(/\./g, '');
      e = `${local}@gmail.com`;
    }
  }
  return e;
}

export function normPhone(tel) {
  if (!tel) return '';
  const d = String(tel).replace(/\D/g, '');
  // 0612… ↔ +33612… : on garde les 9 derniers chiffres significatifs
  return d.length >= 9 ? d.slice(-9) : d;
}

export function normName(prenom, nom) {
  const s = `${prenom || ''} ${nom || ''}`.trim().toLowerCase();
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // accents
    .replace(/\s+/g, ' ');
}

/**
 * Renvoie les paires de fiches en doublon probable, avec le motif.
 * @param {Array} clients  fiches (id, prenom, nom, email, telephone, ...)
 * @returns {Array<{a, b, motif}>}  paires uniques (a.id < b.id), motif = 'email'|'téléphone'|'nom'
 */
export function trouverDoublons(clients) {
  const paires = new Map(); // key "idA|idB" → { a, b, motif }

  const indexer = (getKey, motif) => {
    const buckets = new Map();
    for (const c of clients) {
      const k = getKey(c);
      if (!k) continue;
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(c);
    }
    for (const groupe of buckets.values()) {
      if (groupe.length < 2) continue;
      for (let i = 0; i < groupe.length; i++) {
        for (let j = i + 1; j < groupe.length; j++) {
          const [a, b] = groupe[i].id < groupe[j].id ? [groupe[i], groupe[j]] : [groupe[j], groupe[i]];
          const key = `${a.id}|${b.id}`;
          // Un motif plus fort (email) l'emporte sur nom
          if (!paires.has(key) || motif === 'email') paires.set(key, { a, b, motif });
        }
      }
    }
  };

  // Ordre : email (fort) en dernier pour qu'il écrase le motif faible.
  indexer(c => normName(c.prenom, c.nom) || null, 'nom');
  indexer(c => normPhone(c.telephone) || null, 'téléphone');
  indexer(c => normEmail(c.email) || null, 'email');

  return [...paires.values()];
}
