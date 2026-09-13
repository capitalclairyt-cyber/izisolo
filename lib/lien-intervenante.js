// ============================================================================
// IziSolo — Le lien permanent d'une intervenante (v111, lot 1 Associations &
// Studios, 2026-09-13, PLAN-ASSOS-STUDIOS-2026.md §4.1)
// ----------------------------------------------------------------------------
// La généralisation de v100 : là où le lien de pointage confié ouvrait UNE
// séance pour une remplaçante, le lien d'intervenante ouvre SES séances à une
// prof de la structure qui n'a pas (encore) de compte. Même frontière, mêmes
// règles :
//   • le jeton fait 256 bits, la base n'en garde que le sha256, il n'est
//     affiché qu'une fois ;
//   • aucune session Supabase, jamais : le chemin public passe par des routes
//     en service_role qui re-vérifient l'appartenance de chaque présence au
//     studio ET à la séance ;
//   • minimisation : prénom et nom des élèves (un appel de présence), jamais
//     un email, un téléphone, un carnet, un montant, ni le lien visio.
//
// Ce qui change par rapport à v100 : la durée. Un lien confié meurt avec sa
// séance ; un lien d'intervenante vaut LA SAISON (jusqu'au 31 août suivant),
// et il se révoque d'un clic. Une saison plutôt qu'« à vie » : un lien perdu
// meurt tout seul, et une prof qui part ne garde pas une clé indéfinie.
//
// Fichier PUR : aucun import de crypto (il est importé par des composants
// navigateur). Le jeton se fabrique et se hache côté serveur avec
// `genererToken` / `hashToken` de lib/lien-pointage.
// ============================================================================

/** Une heure murale de Paris ('AAAA-MM-JJTHH:MM') → Date UTC. Copie locale de
 *  lib/lien-pointage.parisVersUtc, pour ne pas tirer node:crypto ici. */
function parisVersUtc(mural) {
  const suppose = new Date(`${mural}Z`);
  if (Number.isNaN(suppose.getTime())) return null;
  const vuDeParis = new Date(`${suppose.toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).replace(' ', 'T')}Z`);
  return new Date(suppose.getTime() - (vuDeParis.getTime() - suppose.getTime()));
}

/** L'URL à envoyer. Le jeton n'apparaît que dans cette chaîne, une fois. */
export function urlLienIntervenante(base, token) {
  return `${String(base || '').replace(/\/$/, '')}/intervenante/${token}`;
}

/**
 * La fin de la saison en cours : le 31 août à 23:59 (Paris) qui suit la date
 * donnée. Un lien créé le 1er juillet vaut jusqu'au 31 août de la même année
 * (deux mois : le bout de saison) ; créé le 1er septembre, jusqu'au 31 août
 * suivant. Une prof qui reste renouvelle en un clic à la rentrée.
 */
export function finDeSaison(maintenant = new Date()) {
  const paris = new Date(maintenant.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const annee = paris.getMonth() >= 8 ? paris.getFullYear() + 1 : paris.getFullYear();
  return parisVersUtc(`${annee}-08-31T23:59:00`);
}

/** 'actif' | 'revoque' | 'expire' | 'aucun' : l'état affiché à la prof. */
export function etatLienIntervenante(membre, maintenant = new Date()) {
  if (!membre?.lien_hash) return 'aucun';
  if (membre.lien_revoque_at) return 'revoque';
  if (!membre.lien_expire_at || new Date(membre.lien_expire_at).getTime() <= maintenant.getTime()) return 'expire';
  return 'actif';
}

/**
 * Le verdict d'ouverture. Un lien n'ouvre que si le membre est encore dans
 * l'équipe (statut `invite` ou `actif`, jamais `revoque`), que le lien n'est
 * ni révoqué ni expiré. Les messages sont honnêtes ; le code HTTP, lui,
 * restera 404 partout (distinguer « révoqué » de « inexistant » renseignerait
 * un curieux).
 */
export function verifierLienIntervenante(membre, maintenant = new Date()) {
  if (!membre || !membre.lien_hash) return { ok: false, code: 'INTROUVABLE', message: 'Ce lien ne correspond à rien.' };
  if (membre.statut === 'revoque') return { ok: false, code: 'RETIREE', message: "Tu ne fais plus partie de l'équipe de ce studio." };
  const etat = etatLienIntervenante(membre, maintenant);
  if (etat === 'revoque') return { ok: false, code: 'REVOQUE', message: 'Ce lien a été désactivé par le studio. Demande-lui un nouveau lien.' };
  if (etat === 'expire') return { ok: false, code: 'EXPIRE', message: 'Ce lien a expiré avec la saison. Demande un nouveau lien au studio.' };
  return { ok: true, code: 'OK' };
}

/** Ce que l'intervenante voit d'elle-même. Rien de plus que ce qu'elle sait. */
export function membrePourIntervenante(membre, studioNom) {
  if (!membre) return null;
  return {
    prenom: membre.prenom || null,
    nom: membre.nom || null,
    studio_nom: studioNom || null,
    // Le compte : sans lui elle n'a que ce lien ; avec, elle a tout son IziSolo.
    a_un_compte: !!membre.auth_user_id,
    email: membre.email || null,
  };
}

/**
 * Une séance de sa liste : ce qu'il faut pour la reconnaître et l'ouvrir.
 * Le lien visio est volontairement ABSENT (bien payant, v86), comme dans v100.
 */
export function seancePourIntervenante(cours, nbInscrites = null) {
  if (!cours) return null;
  return {
    id: cours.id,
    nom: cours.nom,
    type_cours: cours.type_cours || null,
    date: cours.date,
    heure: cours.heure ? String(cours.heure).slice(0, 5) : null,
    duree_minutes: cours.duree_minutes || null,
    lieu: cours.lieu || null,
    en_ligne: cours.format === 'visio' || cours.format === 'hybride',
    est_annule: cours.est_annule === true,
    // « la mienne » ou « personne n'est désignée » : la seconde liste existe
    // pour qu'une séance orpheline reste pointable, comme en v103.
    mienne: cours.mienne === true,
    nb_inscrites: nbInscrites,
  };
}

/** La fenêtre des séances servies sur le lien : 7 jours en arrière (une
 *  séance oubliée se pointe encore), 30 jours en avant. */
export const FENETRE_JOURS = { avant: 7, apres: 30 };

/**
 * Trie et scinde les séances : les siennes d'abord, puis celles que personne
 * n'a prises (jamais celles d'une autre intervenante : elles ne la regardent
 * pas). Une séance annulée est retirée.
 */
export function classerSeances(cours, membreId) {
  const vivantes = (cours || []).filter(c => !c.est_annule);
  const tri = (a, b) => (a.date + (a.heure || '')).localeCompare(b.date + (b.heure || ''));
  const miennes = vivantes.filter(c => c.intervenant_id && c.intervenant_id === membreId).sort(tri);
  const orphelines = vivantes.filter(c => !c.intervenant_id).sort(tri);
  return { miennes, orphelines };
}
