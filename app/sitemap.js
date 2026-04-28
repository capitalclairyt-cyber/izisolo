import { createClient } from '@supabase/supabase-js';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://izisolo.fr';

const STATIC_PATHS = [
  { path: '/',                     changeFrequency: 'monthly',  priority: 1.0 },
  { path: '/profs-de-yoga',        changeFrequency: 'monthly',  priority: 0.9 },
  { path: '/profs-de-pilates',     changeFrequency: 'monthly',  priority: 0.9 },
  { path: '/coachs-bien-etre',     changeFrequency: 'monthly',  priority: 0.9 },
  { path: '/therapeutes',          changeFrequency: 'monthly',  priority: 0.9 },
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

  return [...staticEntries, ...studioEntries];
}
