import { requireAuth } from '@/lib/api-auth';
import { announce } from '@/lib/messagerie';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/messagerie/announce
 *
 * Body :
 *   {
 *     content: string,
 *     media_urls?: string[],
 *     shared_ref_type?: 'cours'|'offre'|'abonnement',
 *     shared_ref_id?: uuid,
 *     // 1 ou plusieurs cibles :
 *     scope: 'tous' | 'cours' | 'type_cours' | 'abonnement' | 'clients',
 *     cours_id?: uuid,                  // scope='cours'
 *     type_cours?: string,              // scope='type_cours' (toutes occurrences)
 *     offre_id?: uuid,                  // scope='abonnement'
 *     client_ids?: uuid[],              // scope='clients' (sélection libre)
 *     mode: 'individuel' | 'groupe',    // individuel = 1 conv 1-to-1 par client | groupe = 1 conv cours
 *   }
 *
 * Réponse : { batch_id, count }
 */

export async function POST(request) {
  let profile, supabase;
  try {
    ({ profile, supabase } = await requireAuth());
  } catch (res) { return res; }
  // Vrai pro = a un studio_slug (le trigger Supabase crée un profil pour tout user)
  if (!profile?.studio_slug) return Response.json({ error: 'Réservé aux pros' }, { status: 403 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'JSON invalide' }, { status: 400 }); }

  const content = (body.content || '').trim();
  if (!content && (!body.media_urls || body.media_urls.length === 0)) {
    return Response.json({ error: 'Message vide' }, { status: 400 });
  }
  if (content.length > 4000) {
    return Response.json({ error: 'Message trop long' }, { status: 400 });
  }

  const mode = body.mode === 'groupe' ? 'groupe' : 'individuel';
  const scope = body.scope || 'tous';

  // Construire la liste des cibles selon le scope
  let targets = [];

  if (scope === 'tous') {
    const { data: clients } = await supabase
      .from('clients')
      .select('id')
      .eq('profile_id', profile.id)
      .in('statut', ['prospect', 'actif', 'fidele']);
    targets = (clients || []).map(c => ({ type: 'client', id: c.id }));
  }

  else if (scope === 'cours' && body.cours_id) {
    if (mode === 'groupe') {
      // 1 seule conversation de groupe
      targets = [{ type: 'cours', id: body.cours_id }];
    } else {
      // Fan-out individuel : 1 conv par inscrit du cours
      const { data: presences } = await supabase
        .from('presences')
        .select('client_id')
        .eq('cours_id', body.cours_id);
      targets = (presences || []).map(p => ({ type: 'client', id: p.client_id }));
    }
  }

  else if (scope === 'type_cours' && body.type_cours) {
    // Tous les inscrits à des cours de ce type (sur les 90 derniers jours pour limiter)
    const ilYa90j = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const { data: cours } = await supabase
      .from('cours')
      .select('id')
      .eq('profile_id', profile.id)
      .eq('type_cours', body.type_cours)
      .gte('date', ilYa90j);
    const coursIds = (cours || []).map(c => c.id);
    if (coursIds.length > 0) {
      const { data: presences } = await supabase
        .from('presences')
        .select('client_id')
        .in('cours_id', coursIds);
      const clientIds = [...new Set((presences || []).map(p => p.client_id))];
      targets = clientIds.map(id => ({ type: 'client', id }));
    }
  }

  else if (scope === 'abonnement' && body.offre_id) {
    const { data: abos } = await supabase
      .from('abonnements')
      .select('client_id')
      .eq('profile_id', profile.id)
      .eq('offre_id', body.offre_id)
      .eq('statut', 'actif');
    const clientIds = [...new Set((abos || []).map(a => a.client_id))];
    targets = clientIds.map(id => ({ type: 'client', id }));
  }

  else if (scope === 'clients' && Array.isArray(body.client_ids)) {
    // Vérifier que tous les client_ids sont bien à ce pro
    const { data: clients } = await supabase
      .from('clients')
      .select('id')
      .eq('profile_id', profile.id)
      .in('id', body.client_ids);
    targets = (clients || []).map(c => ({ type: 'client', id: c.id }));
  }

  if (targets.length === 0) {
    return Response.json({ error: 'Aucun destinataire trouvé' }, { status: 400 });
  }

  // Garde-fou anti-spam : max 500 fan-outs par batch
  if (targets.length > 500) {
    return Response.json({ error: `Trop de destinataires (${targets.length}). Max 500.` }, { status: 400 });
  }

  try {
    const { batchId, count } = await announce(supabase, {
      profileId: profile.id,
      targets,
      content,
      mediaUrls: body.media_urls || [],
      sharedRefType: body.shared_ref_type || null,
      sharedRefId: body.shared_ref_id || null,
    });
    return Response.json({ batch_id: batchId, count });
  } catch (err) {
    console.error('[messagerie] announce err:', err);
    return Response.json({ error: 'Erreur diffusion : ' + err.message }, { status: 500 });
  }
}
