// ============================================================================
// IziSolo — Le relevé qui part tout seul (v114, lot 4 Associations & Studios,
// 2026-09-13, PLAN-ASSOS-STUDIOS-2026.md §5.2 « relevé mensuel PDF envoyé le
// 1er du mois »)
// ----------------------------------------------------------------------------
// Opt-in de la structure (`profiles.releve_auto`). Dans les cinq premiers
// jours du mois, le cron `expirations` envoie à chaque intervenante active le
// relevé du mois PRÉCÉDENT (celui de v112, recalculé, jamais inventé), en
// PDF, une fois par (structure, intervenante, mois) : claim `emails_envoyes`
// type `releve_auto`, libéré si l'envoi échoue. Un relevé VIDE (aucune
// séance) ne part pas : un email pour dire « rien » est du bruit.
//
// Fichier PUR : la fenêtre, la référence du claim, l'email. Les lectures et
// l'envoi vivent dans le cron. Verrou CI `gestion-studio.spec.js`.
// ============================================================================

import { labelMois, moisPrecedent, euros } from './remuneration.js';

/** Combien de jours après le 1er le cron a le droit de rattraper un envoi. */
export const FENETRE_JOURS = 5;

/**
 * Le mois dont le relevé doit partir aujourd'hui, ou null hors fenêtre.
 * Le 1er → le mois précédent ; le 6 → rien (un cron raté a eu cinq chances).
 */
export function moisAEnvoyer(aujourdhui) {
  const d = String(aujourdhui || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const jour = Number(d.slice(8, 10));
  if (jour < 1 || jour > FENETRE_JOURS) return null;
  return moisPrecedent(d.slice(0, 7));
}

/** La référence du claim : une par structure, intervenante et mois. */
export function refReleveAuto(studioId, membreId, mois) {
  return `${studioId}:${membreId}:${mois}`;
}

/** Faut-il envoyer ce relevé ? Jamais un relevé vide. */
export function releveAEnvoyer(releve) {
  return !!releve && Number(releve.nb_seances) > 0;
}

/** L'email d'accompagnement du relevé automatique. PUR. */
export function emailReleveAuto({ prenom, nomStructure, mois, releve, aUnCompte, lien }) {
  const bonjour = prenom ? `Bonjour ${prenom},` : 'Bonjour,';
  const somme = releve?.montant_du != null ? ` Selon ce qui est convenu, cela fait <strong>${euros(releve.montant_du)}</strong>.` : '';
  const seances = `${releve?.nb_seances || 0} séance${(releve?.nb_seances || 0) > 1 ? 's' : ''}`;
  return {
    subject: `Ton relevé de ${labelMois(mois)} · ${nomStructure}`,
    html: `
      <p>${bonjour}</p>
      <p>Voici ton relevé de séances de <strong>${labelMois(mois)}</strong> chez <strong>${nomStructure}</strong> : ${seances}, ${releve?.nb_presentes || 0} présente${(releve?.nb_presentes || 0) > 1 ? 's' : ''}.${somme} Le détail est en pièce jointe.</p>
      <p>Ce relevé est envoyé automatiquement le 1er du mois ; ${nomStructure} le VALIDE ensuite, et c'est cette validation qui déclenche ta prestation${aUnCompte ? ' dans ton IziSolo (page Revenus → « Mes prestations »)' : ''}. Si quelque chose manque ou ne colle pas, réponds à cet email : il arrive chez ${nomStructure}.</p>
      ${aUnCompte && lien ? `<p><a href="${lien}" style="display:inline-block;background:#1a1612;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;">Voir mes prestations</a></p>` : ''}
    `,
  };
}
