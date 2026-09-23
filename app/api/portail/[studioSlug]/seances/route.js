import { withRoute } from '@/lib/api-route';
import { createServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { resolveClientInfo, filterCoursVisibles } from '@/lib/visibilite';
import { coursDejaCommence } from '@/lib/dates';
import { cacheEmbed } from '@/lib/embed-cache';
import { lireSeancesBrutes, enrichirSeances } from '@/lib/portail-seances-service';
import { validerPlage, cleCachePlage } from '@/lib/portail-fenetre';
import { langueDepuisRequete } from '@/lib/i18n-portail-serveur';
import { traducteur } from '@/lib/i18n-portail';
import { reportError } from '@/lib/report';

/**
 * GET /api/portail/[studioSlug]/seances?de=YYYY-MM-DD&a=YYYY-MM-DD
 *
 * Les séances d'une plage de dates AU-DELÀ des 60 jours que la page publique
 * charge d'elle-même (2026-09-23, retour Manon / Soleya : la vue semaine
 * disait « Aucun cours cette semaine » sur une semaine de novembre pleine).
 * Une semaine pour ▶, quatre pour « Voir les semaines suivantes », jamais plus
 * d'un mois par appel, jamais plus d'un an devant.
 *
 * Même chaîne que la page (lib/portail-seances-service) : visibilité selon la
 * visiteuse, séances commencées écartées, places, prénom, photo. Rien de
 * secret ne sort d'ici, et une séance privée ou restreinte n'est servie qu'à
 * qui a le droit de la voir, exactement comme sur la page.
 *
 * Cache mémoire 120 s par (studio, plage) sur les séances ENRICHIES mais NON
 * filtrées (patron de l'embed) : le filtre de visibilité se rejoue à chaque
 * appel, donc une séance réservée aux inscrites vit en mémoire serveur et
 * n'atteint jamais une anonyme.
 */
const TTL_MS = 120_000;

export const GET = withRoute({
  auth: 'public',
  // Une élève qui parcourt dix mois semaine par semaine fait ~45 appels : large.
  rateLimit: { max: 120, windowSeconds: 3600, scope: 'portail-seances' },
}, async ({ request, params }) => {
  const { studioSlug } = params;
  const langue = await langueDepuisRequete(request, studioSlug);
  const t = traducteur(langue);
  const url = new URL(request.url);
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  const plage = validerPlage(url.searchParams.get('de'), url.searchParams.get('a'), today);
  if (!plage.ok) {
    const message = plage.raison === 'HORS_HORIZON'
      ? t("Le planning s'affiche jusqu'à un an à l'avance.")
      : t('Dates invalides');
    return Response.json({ error: message, code: plage.raison }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, prenom, studio_slug')
    .eq('studio_slug', studioSlug)
    .maybeSingle();
  if (!profile) return Response.json({ error: t('Studio introuvable') }, { status: 404 });

  let enrichies;
  try {
    enrichies = await cacheEmbed('portail-seances', cleCachePlage(studioSlug, plage.de, plage.a), TTL_MS, async () => {
      const brutes = await lireSeancesBrutes(supabase, profile.id, plage.de, plage.a);
      return enrichirSeances(supabase, profile, brutes, { route: `/api/portail/${studioSlug}/seances` });
    });
  } catch (e) {
    reportError('[portail/seances] lecture err:', e, { route: `/api/portail/${studioSlug}/seances` });
    return Response.json({ error: t('Impossible de charger ces séances pour le moment.') }, { status: 500 });
  }

  // La visiteuse : anonyme, ou élève connue de ce studio (v83) → même filtre
  // de visibilité que la page.
  const ssr = await createServerClient();
  const { data: { user } } = await ssr.auth.getUser();
  const clientInfo = user ? await resolveClientInfo(supabase, profile.id, user) : null;
  const cours = filterCoursVisibles(enrichies, clientInfo).filter(c => !coursDejaCommence(c));

  return Response.json({ de: plage.de, a: plage.a, cours });
});
