/**
 * lib/todo-ops.js — la to-do ÉQUIPE (Colin + Maude), affichée sur /admin/todo.
 *
 * Même philosophie que lib/routines-ops.js : un fichier versionné, pas de
 * table. On ajoute/termine une tâche en éditant ce fichier (via Claude ou à
 * la main) ; une tâche faite se SUPPRIME (git garde l'historique).
 *
 * Périmètre : les actions humaines et business à ne pas perdre de vue.
 * Le registre dev exhaustif reste la bible (CLAUDE.md §8) — ici, la vue
 * synthèse que l'équipe consulte dans l'admin.
 *
 * statut : 'a_faire' | 'en_cours' — priorite : 'haute' | 'normale' | 'basse'
 */

export const TODO_CATEGORIES = {
  secu: { nom: '🔐 Sécu & infra', ordre: 1 },
  monetisation: { nom: '💶 Monétisation', ordre: 2 },
  features: { nom: '🧩 Features app', ordre: 3 },
  commercial: { nom: '📣 Commercial & croissance', ordre: 4 },
};

export const TODO_OPS = [
  // ── Sécu & infra ──────────────────────────────────────────────────────────
  {
    id: 'backup-hors-site',
    categorie: 'secu',
    priorite: 'haute',
    statut: 'a_faire',
    ajoute: '2026-08-21',
    titre: 'Sauvegarde hors-site de la base',
    description:
      'Aujourd\'hui tous les backups vivent chez Supabase (single point of failure). '
      + 'Poids mesuré le 21/08 : moins de 1 Mo compressé, le coût n\'est pas un sujet. '
      + 'Décision Colin attendue : la destination (disque + un cloud indépendant), puis '
      + 'Claude monte le script pg_dump, l\'entrée dans /admin/routines et la procédure '
      + 'de restauration (à TESTER une fois par trimestre).',
  },
  {
    id: 'hote-admin',
    categorie: 'secu',
    priorite: 'haute',
    statut: 'a_faire',
    ajoute: '2026-08-21',
    titre: 'Brancher l\'hôte admin (capsule.izisolo.fr)',
    description:
      'Le code est déployé, restent 3 gestes : ajouter capsule.izisolo.fr dans Vercel → '
      + 'Domains, poser le CNAME « capsule » chez LWS, ajouter '
      + 'https://capsule.izisolo.fr/** aux Redirect URLs de Supabase Auth. Puis installer '
      + 'la PWA admin sur les 2 téléphones et activer la double authentification dans '
      + '/admin/securite (Maude et Colin).',
  },
  {
    id: 'migration-paris',
    categorie: 'secu',
    priorite: 'normale',
    statut: 'a_faire',
    ajoute: '2026-08-19',
    titre: 'Migration Supabase vers Paris (eu-west-3)',
    description:
      'Nouveau projet Paris + pg_dump/restore complet (données + auth), copie Storage, '
      + 'nouvelles clés sur Vercel, sessions déconnectées. À planifier un matin calme avec '
      + 'runbook, quelques jours après l\'installation des backups Pro. Après : mettre à '
      + 'jour les pages légales (« UE (Irlande) » → « France (Paris) »).',
  },
  {
    id: 'nettoyage-env',
    categorie: 'secu',
    priorite: 'basse',
    statut: 'a_faire',
    ajoute: '2026-07-24',
    titre: 'Hygiène : DEMO_SECRET et fiches de Maude',
    description:
      'Retirer l\'env var DEMO_SECRET de Vercel (le code démo v62 est supprimé du repo) '
      + 'et exécuter fix-desarchivage-fantome.sql (SELECT de contrôle puis UPDATE : '
      + 'désarchive les fiches de Maude archivées à tort par l\'ancien cron).',
  },

  // ── Monétisation ──────────────────────────────────────────────────────────
  {
    id: 'caisse-stripe-saas',
    categorie: 'monetisation',
    priorite: 'haute',
    statut: 'a_faire',
    ajoute: '2026-07-23',
    titre: 'Brancher la caisse Stripe SaaS',
    description:
      'Tout est scripté : node scripts/setup-stripe-saas.mjs --key=sk_test puis sk_live '
      + '(produits Essentiel 15 / Complet 29, code LANCEMENT50, webhook www, Customer '
      + 'Portal), coller les env vars affichées sur Vercel, redéployer, tester un checkout '
      + 'de bout en bout. ⚠️ Tant que ce n\'est pas fait, ne promettre LANCEMENT50 nulle '
      + 'part (démo comprise) : le code promo n\'existe pas encore chez Stripe.',
  },
  {
    id: 'prelevement-recurrent',
    categorie: 'monetisation',
    priorite: 'normale',
    statut: 'a_faire',
    ajoute: '2026-08-19',
    titre: 'Prélèvement récurrent élèves (option A)',
    description:
      'Payment Link récurrent collé sur l\'offre (pas de Connect). À attaquer APRÈS la '
      + 'caisse SaaS. 4 politiques à trancher avant le code : échec de prélèvement, '
      + 'résiliation, annuel prélevé mensuellement, pause d\'abo. Détail : bible §8.',
  },

  // ── Features app ──────────────────────────────────────────────────────────
  {
    id: 'studio-demo-izisolo',
    categorie: 'features',
    priorite: 'normale',
    statut: 'a_faire',
    ajoute: '2026-08-21',
    titre: 'Studio « IziSolo » : réserver sa démo dans l\'app (Calendly maison)',
    description:
      'Dogfooding pur, zéro code : un vrai studio tenu par Maude (email demo@izisolo.fr, '
      + 'créé), cours en visio capacité 1 « Démo 30 min » et « Installation 45 min » en '
      + 'récurrences, réservation par le formulaire d\'essai (validation auto, gratuit), '
      + 'rappel J-1 automatique. À étiqueter compte interne (exclusion stats). '
      + 'Puis CTA « Réserve ta démo » sur la landing (~1 h de code).',
  },
  {
    id: 'studio-concierge',
    categorie: 'features',
    priorite: 'normale',
    statut: 'a_faire',
    ajoute: '2026-08-21',
    titre: 'Studio concierge (créé pour la prospecte en visio)',
    description:
      '~une demi-journée : formulaire admin « Créer un studio » (createUser service_role, '
      + 'pièges v57 gérés), bouton « Se connecter à ce studio » (impersonation admin-gated '
      + 'et journalisée), email d\'appropriation avec magic link. En attendant : la '
      + 'prospecte crée son compte en partage d\'écran (guide Mise en route).',
  },
  {
    id: 'reels-landing-suite',
    categorie: 'features',
    priorite: 'basse',
    statut: 'a_faire',
    ajoute: '2026-08-21',
    titre: 'Réels landing : rangée Réservation + re-tournage Revenus',
    description:
      'Le composant ReelPhone est en place (rangée paiements). À venir quand Colin '
      + 'tourne : un réel « réservation côté élève » pour la rangée Réservation, et le '
      + 're-tournage « revenus » (dashboard + export + plusieurs fois, texte incrusté '
      + 'sans « yoga » pour rester multi-pratiques). Masters SANS musique dans '
      + 'ressources/reels landing/.',
  },

  // ── Commercial & croissance ───────────────────────────────────────────────
  {
    id: 'prevenir-manon',
    categorie: 'commercial',
    priorite: 'haute',
    statut: 'a_faire',
    ajoute: '2026-08-05',
    titre: 'Prévenir Manon : les factures CSE sont prêtes',
    description:
      'Sa demande (CSE d\'une adhérente) est livrée depuis v84 : elle n\'a que son SIRET '
      + 'à renseigner dans Paramètres → Activité pour que ses clientes CSE téléchargent '
      + 'leurs factures seules. Un message de Maude suffit.',
  },
  {
    id: 'mailing-prospection',
    categorie: 'commercial',
    priorite: 'normale',
    statut: 'a_faire',
    ajoute: '2026-07-01',
    titre: 'Setup mailing prospection (izisolo.com)',
    description:
      '~4 000 emails de profs en attente. Choisir et brancher : validation Bouncer '
      + '(~5 €/1000), envoi Smartlead (~37 €/mois), warmup 2 semaines du domaine '
      + 'izisolo.com avant la première campagne.',
  },
  {
    id: 'instagram-izisolo',
    categorie: 'commercial',
    priorite: 'normale',
    statut: 'a_faire',
    ajoute: '2026-07-01',
    titre: 'Créer le compte Instagram @izisolo.fr',
    description:
      'Mêmes piliers que LinkedIn (bible réseaux), format carrousel/réels (les réels '
      + 'features existent déjà), lien bio vers /outils. Voix de Maude.',
  },
  {
    id: 'promesse-migration',
    categorie: 'commercial',
    priorite: 'normale',
    statut: 'a_faire',
    ajoute: '2026-08-21',
    titre: 'Formaliser « on migre tes données pour toi »',
    description:
      'Idée vue chez StudioPlan (migration gratuite 48 h, leur argument n°1). Nous avons '
      + 'déjà tout : l\'import CSV robuste, l\'invitation groupée, et la promesse orale de '
      + 'Maude « envoie-moi ta liste ». Reste à l\'écrire noir sur blanc (landing, démo, '
      + 'comparatifs) : « envoie-nous ton export, ton studio est prêt sous 48 h ». Coût '
      + 'quasi nul, effet réassurance maximal sur les changeuses d\'outil.',
  },
  {
    id: 'radar-decrochage',
    categorie: 'features',
    priorite: 'basse',
    statut: 'a_faire',
    ajoute: '2026-08-21',
    titre: 'Radar « élèves en décrochage » (idée produit)',
    description:
      'Idée vue chez StudioPlan (« conseils concrets » : élèves fidèles en décrochage, '
      + 'créneaux sous-remplis, crédits qui expirent, avec les noms). Nous avons déjà les '
      + 'briques (présences, carnets, expirations, cloche) et des alertes partielles '
      + '(carnet bas/épuisé). Un bloc « à relancer » nominatif sur le dashboard serait la '
      + 'suite naturelle des cas à traiter. À concevoir après la campagne MVP.',
  },
  {
    id: 'veille-nouveaux-concurrents',
    categorie: 'commercial',
    priorite: 'normale',
    statut: 'a_faire',
    ajoute: '2026-08-21',
    titre: 'Veille : Zenamu, Aurarios, StudioPlan (SERP « alternative momoyoga »)',
    description:
      'Découverts le 21/08 sur la SERP : Zenamu (n°1, tchèque, FR localisé, gratuit '
      + 'jusqu\'à 30 commandes puis 15/29 € annuels par paliers, app mobile, RDV 1:1, '
      + 'aide en 17 langues) ; Aurarios (français, tout jeune, 17 € HT, positionné mot '
      + 'pour mot sur notre créneau indépendants, témoignages douteux pour un produit à '
      + 'peine lancé) ; StudioPlan (français, 29 € HT, 0 % commission, migration gratuite '
      + '48 h en NOMMANT les concurrents). À trancher : comparatif Zenamu (établi, '
      + 'volume) oui/non ; Aurarios/StudioPlan : observer d\'abord, ne pas leur donner '
      + 'de visibilité.',
  },
  {
    id: 'guide-public',
    categorie: 'features',
    priorite: 'basse',
    statut: 'a_faire',
    ajoute: '2026-08-21',
    titre: 'Version publique du guide /aide (réassurance + SEO support)',
    description:
      'Constat du brief centres d\'aide (21/08) : les KB publiques des concurrents '
      + '(Momoyoga ~170 articles FR, Zenamu ~130 en 17 langues) servent de réassurance '
      + 'pré-vente ET captent du SEO longue traîne ; notre guide (15 tutos + recherche) '
      + 'est derrière le login. Étudier une lecture publique du guide, sans dupliquer '
      + 'le contenu.',
  },
  {
    id: 'photo-maude',
    categorie: 'commercial',
    priorite: 'basse',
    statut: 'a_faire',
    ajoute: '2026-08-19',
    titre: 'Vraie photo de Maude sur la landing',
    description:
      'Remplacer le placeholder Pexels public/icons/maude-foret.jpg (utilisé 2 fois : '
      + 'ligne de confiance du hero + section Fondatrice). Même fichier à écraser, rien '
      + 'd\'autre à toucher.',
  },
];

/** Tri d'affichage : catégorie (ordre), puis priorité, puis date d'ajout. */
const POIDS_PRIORITE = { haute: 0, normale: 1, basse: 2 };

export function todoParCategorie(items = TODO_OPS) {
  const groupes = {};
  for (const cle of Object.keys(TODO_CATEGORIES)) groupes[cle] = [];
  for (const t of items) {
    if (!groupes[t.categorie]) groupes[t.categorie] = [];
    groupes[t.categorie].push(t);
  }
  for (const cle of Object.keys(groupes)) {
    groupes[cle].sort((a, b) =>
      (POIDS_PRIORITE[a.priorite] ?? 9) - (POIDS_PRIORITE[b.priorite] ?? 9)
      || String(a.ajoute).localeCompare(String(b.ajoute)));
  }
  return groupes;
}

/** Nombre de tâches priorité haute encore à faire (badge nav admin). */
export function nbTodoHaute(items = TODO_OPS) {
  return items.filter(t => t.priorite === 'haute' && t.statut !== 'fait').length;
}
