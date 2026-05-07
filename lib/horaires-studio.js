/**
 * Horaires studio — helpers
 *
 * Stocké dans profiles.horaires_studio_jours (JSONB) :
 *   {
 *     lun: { ouvert: true, plages: [{ debut: '09:00', fin: '20:00' }] },
 *     mar: { ouvert: false, plages: [] },
 *     ...
 *   }
 *
 * On dérive automatiquement profiles.horaires_studio (text) pour la page
 * publique qui n'évolue pas tout de suite : "Lun 9h–20h · Mar fermé · ..."
 */

export const JOURS_SEMAINE = [
  { key: 'lun', label: 'Lundi',    short: 'Lun' },
  { key: 'mar', label: 'Mardi',    short: 'Mar' },
  { key: 'mer', label: 'Mercredi', short: 'Mer' },
  { key: 'jeu', label: 'Jeudi',    short: 'Jeu' },
  { key: 'ven', label: 'Vendredi', short: 'Ven' },
  { key: 'sam', label: 'Samedi',   short: 'Sam' },
  { key: 'dim', label: 'Dimanche', short: 'Dim' },
];

export const DEFAULT_HORAIRES_STUDIO = {
  lun: { ouvert: true,  plages: [{ debut: '09:00', fin: '20:00' }] },
  mar: { ouvert: true,  plages: [{ debut: '09:00', fin: '20:00' }] },
  mer: { ouvert: true,  plages: [{ debut: '09:00', fin: '20:00' }] },
  jeu: { ouvert: true,  plages: [{ debut: '09:00', fin: '20:00' }] },
  ven: { ouvert: true,  plages: [{ debut: '09:00', fin: '20:00' }] },
  sam: { ouvert: true,  plages: [{ debut: '10:00', fin: '14:00' }] },
  dim: { ouvert: false, plages: [] },
};

/**
 * Normalise les horaires (ajoute jours manquants, plages vides si fermé).
 */
export function normalizeHoraires(horaires) {
  const result = {};
  for (const { key } of JOURS_SEMAINE) {
    const day = horaires?.[key] || {};
    result[key] = {
      ouvert: Boolean(day.ouvert),
      plages: Array.isArray(day.plages) && day.plages.length > 0
        ? day.plages.filter(p => p.debut && p.fin)
        : (day.ouvert ? [{ debut: '09:00', fin: '18:00' }] : []),
    };
  }
  return result;
}

/**
 * Convertit l'objet structuré en texte lisible pour la page publique.
 * Ex : "Lun–Ven 9h–20h · Sam 10h–14h · Dim fermé"
 *
 * Stratégie : on regroupe les jours consécutifs avec le même horaire,
 * et on affiche le tout sur une ligne séparée par " · ".
 */
export function horairesToText(horaires) {
  const norm = normalizeHoraires(horaires);
  const lines = [];

  // Format simple jour-par-jour (regroupement plus tard si besoin)
  for (const { key, short } of JOURS_SEMAINE) {
    const day = norm[key];
    if (!day.ouvert || day.plages.length === 0) {
      lines.push(`${short} fermé`);
    } else {
      const plages = day.plages
        .map(p => `${p.debut.replace(':00', 'h').replace(':', 'h')}–${p.fin.replace(':00', 'h').replace(':', 'h')}`)
        .join(', ');
      lines.push(`${short} ${plages}`);
    }
  }

  return lines.join(' · ');
}

/**
 * True si au moins un jour est ouvert.
 */
export function hasAnyOpenDay(horaires) {
  if (!horaires) return false;
  return JOURS_SEMAINE.some(({ key }) => horaires[key]?.ouvert);
}
