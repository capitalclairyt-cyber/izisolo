/**
 * Helpers pour les règles d'annulation.
 *
 * Source de vérité : profile.regles_annulation (JSONB depuis migration v5-pointage).
 *
 * Format :
 * {
 *   delai_heures: 24,                                  // global
 *   politique: "excuse_si_delai",                      // info
 *   message: "Annulation acceptée jusqu'à 24h avant",  // affiché publiquement
 *   regles_par_type: {                                  // (optionnel, post-launch)
 *     "Yoga Prénatal": { delai_heures: 48 }
 *   }
 * }
 */

const DEFAULT_DELAI_HEURES = 24;
const DEFAULT_MESSAGE = 'Annulation acceptée jusqu\'au délai indiqué';

export function getReglesAnnulation(profile) {
  const r = profile?.regles_annulation || {};
  return {
    delai_heures: typeof r.delai_heures === 'number' ? r.delai_heures : DEFAULT_DELAI_HEURES,
    politique: r.politique || 'excuse_si_delai',
    message: r.message || DEFAULT_MESSAGE,
    regles_par_type: r.regles_par_type || {},
  };
}

/**
 * Récupère le délai applicable à un cours, en tenant compte des règles
 * spécifiques par type si définies (sinon retombe sur le délai global).
 */
export function getDelaiPourCours(profile, typeCours) {
  const r = getReglesAnnulation(profile);
  if (typeCours && r.regles_par_type[typeCours]?.delai_heures != null) {
    return r.regles_par_type[typeCours].delai_heures;
  }
  return r.delai_heures;
}

/**
 * Indique si l'élève peut encore annuler librement à cet instant.
 * @returns { annulable: boolean, diffHeures: number, delaiHeures: number, dateLimite: Date }
 */
export function evaluerAnnulation(profile, coursDate, coursHeure, typeCours, now = Date.now()) {
  const delaiHeures = getDelaiPourCours(profile, typeCours);
  // ⚠️ Postgres renvoie une colonne `time` en 'HH:MM:SS'. L'ancien code
  // collait ':00' derrière → '17:45:00:00' → Invalid Date → diff NaN →
  // `NaN >= delai` = false → TOUTE annulation était « tardive », même un
  // mois avant (bug Manon/Soleya 2026-07-25, exposé dès la résurrection de
  // la route annuler). On normalise en 'HH:MM'.
  const heure = String(coursHeure || '00:00').slice(0, 5);
  const coursDateTime = new Date(`${coursDate}T${heure}:00`);
  // Le cours est stocké en heure de Paris (naïve) : on projette « now » dans
  // le même référentiel (le serveur Vercel tourne en UTC — sans ça, 2 h
  // d'écart l'été). Même astuce sv-SE que la route reserver.
  const nowParis = new Date(
    new Date(now).toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).replace(' ', 'T')
  );
  if (isNaN(coursDateTime.getTime()) || isNaN(nowParis.getTime())) {
    // Donnée imparsable → on ne sanctionne JAMAIS l'élève sur un bug de
    // parsing : annulation libre, et la prof garde la main via le pointage.
    return { annulable: true, diffHeures: Infinity, delaiHeures, dateLimite: null, coursDateTime: null };
  }
  const diffMs = coursDateTime - nowParis;
  const diffHeures = diffMs / (1000 * 60 * 60);
  const dateLimite = new Date(coursDateTime.getTime() - delaiHeures * 60 * 60 * 1000);
  return {
    annulable: diffHeures >= delaiHeures,
    diffHeures,
    delaiHeures,
    dateLimite,
    coursDateTime,
  };
}

/**
 * Formate la date limite d'annulation pour affichage (ex: "lundi 5 mai à 18h").
 */
export function formatDateLimite(dateLimite) {
  if (!dateLimite || isNaN(dateLimite.getTime())) return '';
  const j = dateLimite.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const h = dateLimite.toTimeString().slice(0, 5).replace(':', 'h');
  return `${j} à ${h}`;
}
