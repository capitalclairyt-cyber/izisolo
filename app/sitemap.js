import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAllArticles } from '@/lib/blog';
import { estCompteTest } from '@/lib/admin-stats';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.izisolo.fr';

const STATIC_PATHS = [
  { path: '/',                     changeFrequency: 'monthly',  priority: 1.0 },
  { path: '/logiciel-gestion-prof-yoga', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/profs-de-yoga',        changeFrequency: 'monthly',  priority: 0.9 },
  { path: '/profs-de-yoga-enfants', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/profs-de-pilates',     changeFrequency: 'monthly',  priority: 0.9 },
  { path: '/profs-de-meditation',  changeFrequency: 'monthly',  priority: 0.9 },
  { path: '/profs-de-danse',       changeFrequency: 'monthly',  priority: 0.9 },
  { path: '/coachs-bien-etre',     changeFrequency: 'monthly',  priority: 0.9 },
  { path: '/therapeutes',          changeFrequency: 'monthly',  priority: 0.9 },
  { path: '/sophrologues',         changeFrequency: 'monthly',  priority: 0.9 },
  { path: '/prof-yoga-paris',       changeFrequency: 'monthly',  priority: 0.85 },
  { path: '/prof-yoga-lyon',        changeFrequency: 'monthly',  priority: 0.85 },
  { path: '/prof-yoga-marseille',   changeFrequency: 'monthly',  priority: 0.85 },
  { path: '/prof-yoga-toulouse',    changeFrequency: 'monthly',  priority: 0.85 },
  { path: '/prof-yoga-bordeaux',    changeFrequency: 'monthly',  priority: 0.85 },
  { path: '/prof-yoga-nantes',      changeFrequency: 'monthly',  priority: 0.85 },
  { path: '/prof-yoga-strasbourg',  changeFrequency: 'monthly',  priority: 0.85 },
  { path: '/prof-yoga-lille',       changeFrequency: 'monthly',  priority: 0.85 },
  { path: '/prof-yoga-montpellier', changeFrequency: 'monthly',  priority: 0.85 },
  { path: '/prof-yoga-rennes',      changeFrequency: 'monthly',  priority: 0.85 },
  { path: '/prof-yoga-nice',        changeFrequency: 'monthly',  priority: 0.85 },
  { path: '/prof-pilates-paris',      changeFrequency: 'monthly',  priority: 0.85 },
  { path: '/prof-pilates-lyon',       changeFrequency: 'monthly',  priority: 0.85 },
  { path: '/prof-pilates-marseille',  changeFrequency: 'monthly',  priority: 0.85 },
  { path: '/prof-pilates-toulouse',   changeFrequency: 'monthly',  priority: 0.85 },
  { path: '/prof-pilates-bordeaux',   changeFrequency: 'monthly',  priority: 0.85 },
  { path: '/prof-pilates-nantes',     changeFrequency: 'monthly',  priority: 0.85 },
  { path: '/prof-pilates-strasbourg', changeFrequency: 'monthly',  priority: 0.85 },
  { path: '/prof-pilates-lille',      changeFrequency: 'monthly',  priority: 0.85 },
  { path: '/prof-pilates-montpellier',changeFrequency: 'monthly',  priority: 0.85 },
  { path: '/prof-pilates-rennes',     changeFrequency: 'monthly',  priority: 0.85 },
  { path: '/prof-pilates-nice',       changeFrequency: 'monthly',  priority: 0.85 },
  { path: '/calculateur',          changeFrequency: 'monthly',  priority: 0.8 },
  { path: '/outils',                                  changeFrequency: 'monthly', priority: 0.9 },
  { path: '/outils/calculateur-revenu-prof-yoga',     changeFrequency: 'monthly', priority: 0.85 },
  { path: '/outils/comparateur-statuts-prof-yoga',    changeFrequency: 'monthly', priority: 0.85 },
  { path: '/outils/grille-tarifaire-prof-yoga',       changeFrequency: 'monthly', priority: 0.85 },
  { path: '/outils/checklist-lancement-prof-yoga',    changeFrequency: 'monthly', priority: 0.85 },
  { path: '/outils/fiche-inscription-yoga-enfant',    changeFrequency: 'monthly', priority: 0.85 },
  { path: '/blog',                 changeFrequency: 'weekly',   priority: 0.8 },
  // /login est SORTI le 2026-08-28 : la page est en `noindex, nofollow`, donc
  // la soumettre revenait à demander à Google d'indexer ce qu'on lui interdit
  // d'indexer. Un sitemap qui se contredit lui-même use le budget de crawl.
  { path: '/register',             changeFrequency: 'yearly',   priority: 0.7 },
  // Guichet public de la création concierge (v96, 23/08) — oublié du sitemap
  // à sa livraison : page d'acquisition jamais soumise pendant 5 jours.
  { path: '/creer-mon-studio',     changeFrequency: 'monthly',  priority: 0.8 },
  { path: '/legal/cgu',            changeFrequency: 'yearly',   priority: 0.3 },
  { path: '/legal/cgv',            changeFrequency: 'yearly',   priority: 0.3 },
  { path: '/legal/mentions',       changeFrequency: 'yearly',   priority: 0.3 },
  { path: '/legal/rgpd',           changeFrequency: 'yearly',   priority: 0.3 },
];

/**
 * Portails de studio soumis à Google.
 *
 * ⚠️ Filtré depuis le 2026-08-28 (export Search Console). Avant, la seule
 * condition était `studio_slug not null` : chaque essai abandonné et chaque
 * compte de test entrait au catalogue. Mesuré ce jour-là sur les 15 portails
 * soumis : 6 affichaient « Aucun cours cette semaine » à Googlebot, 4 étaient
 * des comptes de test ou de démo (colin-studio, colin2, jen, atelier-soleil),
 * et le texte rendu allait de 184 à 1970 caractères. Demander l'indexation de
 * pages vides n'a jamais fait indexer personne : ça dilue le site entier, et
 * c'est le premier suspect des 28 « explorée, actuellement non indexée ».
 *
 * Trois conditions cumulatives, de la moins chère à la plus chère :
 *   1. pas un compte de test — MÊME heuristique que l'admin (`estCompteTest`),
 *      jamais une seconde copie qui divergerait ;
 *   2. portail publié (`portail_actif`) ;
 *   3. au moins une séance PUBLIQUE à venir, donc quelque chose à lire.
 *
 * Rien n'est gravé : un portail qui se remet à programmer des séances revient
 * au sitemap tout seul. ⚠️ Mais au DÉPLOIEMENT suivant, pas à la prochaine
 * requête — Next prérend /sitemap.xml en statique (visible au build, ligne
 * « ○ /sitemap.xml »). C'était déjà le cas avant ce filtre pour la liste des
 * studios ; ça reste sans conséquence tant qu'on déploie régulièrement.
 */
async function getPublicStudios() {
  // Singleton admin (dégradation gracieuse : env absente → la requête échoue
  // → catch → sitemap sans studios, comme avant)
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, studio_slug, studio_nom, portail_actif, updated_at')
      .not('studio_slug', 'is', null);
    if (error || !data) return [];

    const candidats = data.filter(p =>
      p.portail_actif &&
      !estCompteTest({ studio_slug: p.studio_slug, studio_nom: p.studio_nom })
    );
    if (candidats.length === 0) return [];

    // Heure de Paris : le serveur Vercel est en UTC, et entre minuit et 2 h
    // l'été « aujourd'hui » serait hier (même piège que le portail, B1b).
    const aujourdhui = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
    const { data: seances, error: errSeances } = await supabaseAdmin
      .from('cours')
      .select('profile_id')
      .in('profile_id', candidats.map(p => p.id))
      .gte('date', aujourdhui)
      .eq('est_annule', false)
      .eq('visibilite', 'public');

    // Lecture en échec : on ne sait pas qui a des séances. On soumet les
    // candidats plutôt que de vider le sitemap sur une erreur passagère.
    if (errSeances) return candidats;

    const avecSeance = new Set((seances || []).map(s => s.profile_id));
    return candidats.filter(p => avecSeance.has(p.id));
  } catch {
    return [];
  }
}

export default async function sitemap() {
  const now = new Date();

  const staticEntries = STATIC_PATHS.map(({ path, changeFrequency, priority }) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const studios = await getPublicStudios();
  const studioEntries = studios.map(s => ({
    url: `${baseUrl}/p/${s.studio_slug}`,
    lastModified: s.updated_at ? new Date(s.updated_at) : now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  // Articles de blog — récupérés via getAllArticles() (lit /content/blog/*.md)
  const articles = getAllArticles();
  const articleEntries = articles.map(a => ({
    url: `${baseUrl}/blog/${a.slug}`,
    lastModified: a.updated ? new Date(a.updated) : new Date(a.date),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticEntries, ...studioEntries, ...articleEntries];
}
