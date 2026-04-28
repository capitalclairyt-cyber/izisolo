/**
 * Templates email/SMS pré-définis IziSolo.
 * Le pro peut les utiliser tels quels OU créer une copie personnalisée
 * stockée dans la table templates_communication (voir migration v17).
 *
 * Variables disponibles : {{prenom}} {{nom}} {{cours_nom}} {{date}}
 * {{heure}} {{lieu}} {{studio}}.
 */

export const TEMPLATES_DEFAUT = [
  {
    cle: 'bienvenue',
    type: 'email',
    nom: 'Bienvenue (nouvel·le élève)',
    sujet: 'Bienvenue chez {{studio}} 🌿',
    corps:
`Bonjour {{prenom}},

Très contente de t'accueillir chez {{studio}} !

Tu peux dès maintenant réserver tes cours en ligne et gérer tes inscriptions depuis ton espace personnel.

À très vite sur le tapis,
À bientôt`,
  },
  {
    cle: 'rappel_j_1',
    type: 'email',
    nom: 'Rappel J-1 (la veille du cours)',
    sujet: 'Rappel : {{cours_nom}} demain à {{heure}}',
    corps:
`Bonjour {{prenom}},

Petit rappel : tu es inscrit·e demain au cours « {{cours_nom}} » à {{heure}}{{lieu}}.

Si tu ne peux plus venir, merci de prévenir au plus tôt depuis ton espace.

À demain !`,
  },
  {
    cle: 'rappel_j_1_sms',
    type: 'sms',
    nom: 'Rappel J-1 (SMS court)',
    corps: `Hello {{prenom}}, rappel : {{cours_nom}} demain à {{heure}}. À demain ! — {{studio}}`,
  },
  {
    cle: 'absence_remarquee',
    type: 'email',
    nom: 'Absence remarquée (relance douce)',
    sujet: 'On ne t\'a pas vu·e cette semaine 🌿',
    corps:
`Bonjour {{prenom}},

Je n'ai pas vu ta présence cette semaine et je voulais m'assurer que tout va bien.

N'hésite pas à me dire si tu as besoin de quoi que ce soit, ou simplement à reprendre quand tu te sens prêt·e.

À très vite,`,
  },
  {
    cle: 'anniversaire',
    type: 'email',
    nom: 'Joyeux anniversaire 🎂',
    sujet: 'Joyeux anniversaire {{prenom}} 🎂',
    corps:
`Cher·e {{prenom}},

Toute l'équipe de {{studio}} te souhaite un très joyeux anniversaire ! 🎂

Profite bien de ta journée — et à très vite sur le tapis.

Avec toute mon affection,`,
  },
  {
    cle: 'merci_visite',
    type: 'email',
    nom: 'Merci pour ta venue (post-cours)',
    sujet: 'Merci d\'être venu·e à {{cours_nom}}',
    corps:
`Bonjour {{prenom}},

Merci d'être venu·e au cours « {{cours_nom}} » {{date}}. C'était un vrai plaisir de te recevoir.

N'hésite pas à me partager tes ressentis ou tes questions — c'est précieux pour moi.

À très vite,`,
  },
  {
    cle: 'paiement_relance',
    type: 'email',
    nom: 'Relance paiement en attente',
    sujet: 'Petit rappel — paiement en attente',
    corps:
`Bonjour {{prenom}},

Petit rappel amical : un paiement reste en attente pour ta dernière séance/abonnement.

Tu peux régulariser en venant ou en me contactant directement. Si c'est un oubli, pas de souci — ça arrive à tout le monde.

À bientôt,`,
  },
];

/**
 * Construit le catalogue final pour un pro :
 *  1) Templates pré-définis IziSolo (TEMPLATES_DEFAUT)
 *  2) Surchargés par les versions personnalisées du pro (si elles existent)
 *  3) + Templates 100% custom du pro (cle null)
 */
export function buildCatalogue(templatesPersonnalises = []) {
  const persoMap = new Map(
    templatesPersonnalises
      .filter(t => t.cle)
      .map(t => [`${t.type}:${t.cle}`, t])
  );

  const fromDefauts = TEMPLATES_DEFAUT.map(d => {
    const perso = persoMap.get(`${d.type}:${d.cle}`);
    return perso ? { ...d, ...perso, isPredefiniPersonnalise: true } : { ...d, isPredefini: true };
  });

  const fromCustom = templatesPersonnalises.filter(t => !t.cle);

  return [...fromDefauts, ...fromCustom];
}

/**
 * Applique les variables d'un template à un contexte donné.
 * Variables non trouvées sont laissées telles quelles (ex: {{xyz}}).
 */
export function appliquerVariables(texte, contexte = {}) {
  if (!texte) return '';
  return texte.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return contexte[key] != null ? String(contexte[key]) : match;
  });
}
