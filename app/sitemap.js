import { createClient } from '@supabase/supabase-js';
import { getAllArticles } from '@/lib/blog';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://izisolo.fr';

const STATIC_PATHS = [
  { path: '/',                     changeFrequency: 'monthly',  priority: 1.0 },
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
  { path: '/login',                changeFrequency: 'yearly',   priority: 0.5 },
  { path: '/register',             changeFrequency: 'yearly',   priority: 0.7 },
  { path: '/legal/cgu',            changeFrequency: 'yearly',   priority: 0.3 },
  { path: '/legal/cgv',            changeFrequency: 'yearly',   priority: 0.3 },
  { path: '/legal/mentions',       changeFrequency: 'yearly',   priority: 0.3 },
  { path: '/legal/rgpd',           changeFrequency: 'yearly',   priority: 0.3 },
];

async function getPublicStudios() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  try {
    const supabase = createClient(url, key);
    const { data } = await supabase
      .from('profiles')
      .select('studio_slug, updated_at')
      .not('studio_slug', 'is', null);
    return data || [];
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
