import { withRoute } from '@/lib/api-route';
import { resoudreCiblesAnnonce } from '@/lib/messagerie';
import { messagerieAnnoncePreviewSchema } from '@/lib/validation';
import { reportError } from '@/lib/report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/messagerie/announce/preview — l'aperçu décochable du composeur
 * (2026-08-01, demande Colin : « tous mes élèves » = 46 destinataires → Maude
 * doit pouvoir en décocher avant l'envoi).
 *
 * Résout les destinataires avec EXACTEMENT la même fonction que l'envoi
 * (lib/messagerie.resoudreCiblesAnnonce — source unique, jamais de divergence
 * entre l'aperçu et ce qui part) et hydrate prénom/nom pour l'affichage.
 *
 * Réponse : { groupe: bool, destinataires: [{id, prenom, nom}] }
 *   groupe=true (cible = canal de cours) → pas de liste : un canal est un
 *   espace commun, pas une liste de diffusion à trier.
 */
export const POST = withRoute({
  auth: 'active',
  schema: messagerieAnnoncePreviewSchema,
  plan: 'mailing',
  rateLimit: { max: 60, windowSeconds: 3600, scope: 'messagerie-preview' },
}, async ({ auth, body }) => {
  const { profile, supabase } = auth;
  if (!profile?.studio_slug) return Response.json({ error: 'Réservé aux pros' }, { status: 403 });

  const { targets, erreur } = await resoudreCiblesAnnonce(supabase, profile.id, body);
  if (erreur) return Response.json({ error: erreur.message }, { status: erreur.status });

  const groupe = (targets || []).some(t => t.type === 'cours');
  if (groupe) return Response.json({ groupe: true, destinataires: [] });

  const ids = (targets || []).filter(t => t.type === 'client').map(t => t.id);
  if (ids.length === 0) return Response.json({ groupe: false, destinataires: [] });

  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, prenom, nom')
    .in('id', ids)
    .order('prenom');
  if (error) {
    reportError('[messagerie preview] clients err:', error, { route: '/api/messagerie/announce/preview' });
    return Response.json({ error: 'Une erreur est survenue.' }, { status: 500 });
  }

  return Response.json({ groupe: false, destinataires: clients || [] });
});
