import { createServerClient } from './supabase-server';
import { isAccountFrozen, getAccountStatus } from './trial';
import { resoudreStudioActif } from './studio-actif';

/**
 * Vérifie l'auth dans une API route.
 * Retourne { user, studioId, membre, profile, supabase } ou lance une 401.
 *
 * ⚠️ Depuis v101, `user.id` et le studio sont DEUX choses (chantier multi-prof,
 * lot 2). Toute route qui écrit ou filtre sur `profile_id` doit utiliser
 * `studioId`, jamais `user.id` : pour une prof seule les deux sont égaux, pour
 * une prof invitée dans une association ils ne le sont pas. Le ratchet CI
 * `studio-scope.spec.js` fait échouer le build si `user.id` réapparaît là.
 *
 * `profile` est le profil DU STUDIO (réglages, plan, trial), pas celui de la
 * personne connectée — c'est bien le studio qui a un abonnement IziSolo.
 */
export async function requireAuth() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Response(JSON.stringify({ error: 'Non authentifié' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { studioId, membre, membres } = await resoudreStudioActif(supabase, user);

  const { data: profile } = studioId
    ? await supabase.from('profiles').select('*').eq('id', studioId).single()
    : { data: null };

  return { user, studioId, membre, membres, profile, supabase };
}

/**
 * Vérifie le secret cron pour les routes protégées
 */
export function requireCronAuth(request) {
  // Fail-closed : sans CRON_SECRET configurée, AUCUN appel ne passe
  // (sinon « Authorization: Bearer undefined » authentifierait n'importe qui).
  if (!process.env.CRON_SECRET) {
    console.error('[cron] CRON_SECRET absente — accès refusé (fail-closed)');
    throw new Response(JSON.stringify({ error: 'Cron non configuré' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    throw new Response(JSON.stringify({ error: 'Non autorisé' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Vérifie l'auth ET que le compte n'est pas gelé. À utiliser dans toutes
 * les routes API qui font une création / modification de ressource métier
 * (clients, cours, abonnements, paiements, etc.) — JAMAIS sur les routes
 * de lecture pure ni sur les routes liées à la souscription elle-même
 * (checkout-saas, customer-portal, webhook).
 *
 * Bloque avec 402 (Payment Required) pour :
 *   • compte 'canceled' (ex-abo annulé, trial déjà consommé)
 *   • compte 'trial_expired' (jamais souscrit, trial fini)
 *
 * Laisse passer :
 *   • compte 'free' (interne, exempté)
 *   • compte 'trial_active' (trial 14j en cours)
 *   • compte 'subscribed' (abo Stripe actif ou en trial Stripe)
 *   • compte 'past_due' (paiement échoué mais Stripe va re-essayer —
 *     on ne pénalise pas la prof tout de suite, banner d'alerte suffisant)
 *
 * @returns {Promise<{ user, profile, supabase }>}
 * @throws {Response} 401 si pas auth, 402 si compte gelé
 */
export async function requireActiveAccount() {
  const auth = await requireAuth();
  const { profile } = auth;

  if (isAccountFrozen(profile)) {
    const status = getAccountStatus(profile);
    const message = status === 'canceled'
      ? 'Ton abonnement a été annulé. Re-souscris pour ajouter de nouvelles ressources.'
      : 'Ton essai 14 jours est terminé. Souscris à un plan pour continuer.';

    throw new Response(
      JSON.stringify({
        error: message,
        code: 'account_frozen',
        status,
        action_required: '/parametres?tab=abonnement',
      }),
      { status: 402, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return auth;
}
