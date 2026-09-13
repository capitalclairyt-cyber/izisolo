// ============================================================================
// IziSolo — Les ponts entre portails et le hub de l'élève (v115, lot 5 du
// chantier Associations & Studios, 2026-09-13, PLAN-ASSOS-STUDIOS-2026.md
// §6.6 « les portails qui se citent » et §6.7 « l'élève, un compte, tous ses
// studios »)
// ----------------------------------------------------------------------------
// Pont 5 : une prof qui donne cours dans une structure peut RELIER sa page
// et celle de la structure (opt-in, `studio_membres.portail_croise`). Ce
// fichier décide ce qui se montre, jamais ce qui s'écrit :
//   • sur SA page : « Je donne aussi des cours à … » (les structures où elle
//     a relié, dont le portail est ouvert) ;
//   • sur la page de la STRUCTURE : « Sa page » sur sa carte d'équipe (si elle
//     a son IziSolo, l'a relié, et que son portail est ouvert).
// Pont 6 : les studios d'une élève (ses fiches), et ses prochaines séances
// toutes structures confondues.
//
// Fichier PUR : aucune requête. Verrou CI `vitrines-ponts.spec.js`.
// ============================================================================

/** Un profil a-t-il une page publique ouverte ? */
export function portailOuvert(profil) {
  return !!profil && !!profil.studio_slug && profil.portail_actif !== false;
}

/**
 * Les structures citées sur la page d'UNE PROF : ses appartenances reliées
 * (`portail_croise`), hors la sienne, dont le portail est ouvert.
 * @param {object[]} appartenances  ses lignes studio_membres ({ profile_id, statut, portail_croise })
 * @param {object[]} structures     les profils de ces structures ({ id, studio_nom, studio_slug, portail_actif, type_structure })
 * @param {string}   sonProfilId    l'id de son propre studio (jamais cité)
 * → [{ id, nom, slug, type }]
 */
export function structuresCitees(appartenances, structures, sonProfilId) {
  const parId = new Map((structures || []).map(s => [s.id, s]));
  const out = [];
  const vus = new Set();
  for (const a of (appartenances || [])) {
    if (!a || a.portail_croise !== true || a.statut !== 'actif') continue;
    if (!a.profile_id || a.profile_id === sonProfilId || vus.has(a.profile_id)) continue;
    const s = parId.get(a.profile_id);
    if (!portailOuvert(s)) continue;
    vus.add(a.profile_id);
    out.push({ id: s.id, nom: s.studio_nom || 'Studio', slug: s.studio_slug, type: s.type_structure || 'solo' });
  }
  return out.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

/**
 * Le lien vers la page d'une intervenante sur le portail de la STRUCTURE :
 * seulement si elle a relié (`portail_croise`), qu'elle a un compte
 * (`auth_user_id`) et que SON portail est ouvert.
 * @param {object} membre   la ligne studio_membres
 * @param {object} profil   son profil personnel (id = auth_user_id) ou null
 * → { slug, nom } | null
 */
export function pageDeLIntervenante(membre, profil) {
  if (!membre || membre.portail_croise !== true || !membre.auth_user_id) return null;
  if (!profil || profil.id !== membre.auth_user_id || !portailOuvert(profil)) return null;
  return { slug: profil.studio_slug, nom: profil.studio_nom || 'Sa page' };
}

/** Le libellé de la mention sur la page d'une prof. */
export function phraseAilleurs(structures) {
  const l = structures || [];
  if (l.length === 0) return null;
  if (l.length === 1) return `Je donne aussi des cours à ${l[0].nom}`;
  return `Je donne aussi des cours à ${l.slice(0, -1).map(s => s.nom).join(', ')} et ${l[l.length - 1].nom}`;
}

// ── Pont 6 : le hub de l'élève ───────────────────────────────────────────────
/**
 * Les studios d'une élève à partir de ses fiches (une fiche = un studio),
 * dédoublonnés, avec le profil public de chacun. Les fiches archivées ne
 * comptent pas ; un studio sans page publique reste listé (l'espace, lui,
 * existe) mais sans lien vers sa vitrine.
 * @param {object[]} fiches   [{ id, profile_id, prenom, statut }]
 * @param {object[]} profils  [{ id, studio_nom, studio_slug, portail_actif, ville, metier, photo_url }]
 * → [{ id, nom, slug, ville, metier, photo_url, fiche_id, portail_ouvert }]
 */
export function studiosDeLEleve(fiches, profils) {
  const parId = new Map((profils || []).map(p => [p.id, p]));
  const out = new Map();
  for (const f of (fiches || [])) {
    if (!f?.profile_id || f.statut === 'archive' || out.has(f.profile_id)) continue;
    const p = parId.get(f.profile_id);
    if (!p || !p.studio_slug) continue;
    out.set(f.profile_id, { id: p.id, nom: p.studio_nom || 'Studio', slug: p.studio_slug, ville: p.ville || null, metier: p.metier || null, photo_url: p.photo_url || null, fiche_id: f.id, portail_ouvert: portailOuvert(p) });
  }
  return [...out.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

/**
 * Ses prochaines séances toutes structures confondues, triées, non annulées,
 * chacune nommée par son studio. `presences` porte `cours` (jointure) ;
 * une inscription annulée ou déclinée ne compte pas.
 */
export function prochainesSeancesToutesStructures(presences, studios, aujourdhui, { max = 12 } = {}) {
  const nomDe = new Map((studios || []).map(s => [s.id, s]));
  const d = String(aujourdhui || '').slice(0, 10);
  const out = [];
  for (const p of (presences || [])) {
    const c = p?.cours;
    if (!c || c.est_annule || !c.date || c.date < d) continue;
    if (['annule', 'declinee'].includes(p.statut_pointage)) continue;
    const s = nomDe.get(c.profile_id);
    if (!s) continue;
    out.push({ id: c.id, nom: c.nom, date: c.date, heure: c.heure ? String(c.heure).slice(0, 5) : null, lieu: c.lieu || null, en_ligne: c.format === 'visio' || c.format === 'hybride', studio_id: s.id, studio_nom: s.nom, studio_slug: s.slug });
  }
  return out.sort((a, b) => (a.date + (a.heure || '')).localeCompare(b.date + (b.heure || ''))).slice(0, max);
}
