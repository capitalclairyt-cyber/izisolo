import { after } from 'next/server';
import { withRoute } from '@/lib/api-route';
import { announce } from '@/lib/messagerie';
import { envoyerEmailsMessageInstant } from '@/lib/messagerie-email';
import { messagerieAnnounceSchema } from '@/lib/validation';
import { reportError } from '@/lib/report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Les emails instantanés partent APRÈS la réponse (after) — séquentiels,
// ~0,5 s par destinataire : on garde de la marge pour les grosses annonces.
export const maxDuration = 120;

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

export const POST = withRoute({
  auth: 'active',
  schema: messagerieAnnounceSchema,
  plan: 'mailing',
  // Fan-out jusqu'à 500 messages par appel → on borne la cadence.
  rateLimit: { max: 20, windowSeconds: 3600, scope: 'messagerie-announce' },
}, async ({ auth, body }) => {
  const { profile, supabase } = auth;
  // Vrai pro = a un studio_slug (le trigger Supabase crée un profil pour tout user)
  if (!profile?.studio_slug) return Response.json({ error: 'Réservé aux pros' }, { status: 403 });

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
    // OWNERSHIP : ce cours doit appartenir au pro connecté, sinon les présences
    // (et la conv de groupe) remonteraient les élèves d'un AUTRE studio.
    const { data: coursOwn } = await supabase
      .from('cours')
      .select('id')
      .eq('id', body.cours_id)
      .eq('profile_id', profile.id)
      .maybeSingle();
    if (!coursOwn) return Response.json({ error: 'Cours introuvable' }, { status: 404 });

    if (mode === 'groupe') {
      // 1 seule conversation de groupe
      targets = [{ type: 'cours', id: body.cours_id }];
    } else {
      // Fan-out individuel : 1 conv par inscrit VIVANT du cours — les
      // annulations (annule/declinee/tardive) ne reçoivent plus le rappel.
      const { data: presences } = await supabase
        .from('presences')
        .select('client_id, statut_pointage, annulation_tardive')
        .eq('cours_id', body.cours_id);
      targets = (presences || [])
        .filter(p => !['annule', 'declinee'].includes(p.statut_pointage) && !p.annulation_tardive)
        .map(p => ({ type: 'client', id: p.client_id }));
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
        .select('client_id, statut_pointage, annulation_tardive')
        .in('cours_id', coursIds);
      const clientIds = [...new Set((presences || [])
        .filter(p => !['annule', 'declinee'].includes(p.statut_pointage) && !p.annulation_tardive)
        .map(p => p.client_id))];
      targets = clientIds.map(id => ({ type: 'client', id }));
    }
  }

  else if (scope === 'abonnement' && body.offre_id) {
    // OWNERSHIP : l'offre doit appartenir au pro connecté.
    const { data: offreOwn } = await supabase
      .from('offres')
      .select('id')
      .eq('id', body.offre_id)
      .eq('profile_id', profile.id)
      .maybeSingle();
    if (!offreOwn) return Response.json({ error: 'Offre introuvable' }, { status: 404 });

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

  // OWNERSHIP : si une référence partagée (chip cours/offre) est jointe,
  // elle doit pointer vers une ressource du pro connecté. Sinon on la retire
  // (le mailing part quand même, juste sans le chip d'un autre studio).
  let sharedRefType = body.shared_ref_type || null;
  let sharedRefId = body.shared_ref_id || null;
  if (sharedRefId && (sharedRefType === 'cours' || sharedRefType === 'offre')) {
    const refTable = sharedRefType === 'cours' ? 'cours' : 'offres';
    const { data: refOwn } = await supabase
      .from(refTable)
      .select('id')
      .eq('id', sharedRefId)
      .eq('profile_id', profile.id)
      .maybeSingle();
    if (!refOwn) { sharedRefType = null; sharedRefId = null; }
  }

  try {
    const { batchId, count, echecs } = await announce(supabase, {
      profileId: profile.id,
      targets,
      content,
      mediaUrls: body.media_urls || [],
      sharedRefType,
      sharedRefId,
    });
    if (echecs?.length) {
      reportError(`[messagerie] announce partiel : ${count} ok, ${echecs.length} échec(s) —`,
        echecs[0]?.message, { route: '/api/messagerie/announce' });
    }

    // Email instantané à chaque destinataire (2026-08-01, incident pleine
    // lune : avant, seul le digest 16 h UTC prévenait — Colin veut l'email
    // dès l'envoi). En after() : la prof reçoit sa confirmation tout de
    // suite, les emails partent derrière.
    const echecIds = new Set((echecs || []).map(e => `${e.type}:${e.id}`));
    let destinataireIds = targets
      .filter(t => t.type === 'client' && !echecIds.has(`client:${t.id}`))
      .map(t => t.id);
    // Mode groupe (target = cours) : les destinataires sont les inscrits
    // vivants du cours — même filtre que le fan-out individuel.
    const coursCibles = targets.filter(t => t.type === 'cours' && !echecIds.has(`cours:${t.id}`));
    if (coursCibles.length > 0) {
      const { data: presGroupe } = await supabase
        .from('presences')
        .select('client_id, statut_pointage, annulation_tardive')
        .in('cours_id', coursCibles.map(t => t.id));
      destinataireIds = destinataireIds.concat((presGroupe || [])
        .filter(p => !['annule', 'declinee'].includes(p.statut_pointage) && !p.annulation_tardive)
        .map(p => p.client_id));
    }
    destinataireIds = [...new Set(destinataireIds.filter(Boolean))];
    if (destinataireIds.length > 0) {
      const paramsEmail = {
        profileId: profile.id,
        studioNom: profile.studio_nom || 'Ton studio',
        studioSlug: profile.studio_slug,
        replyTo: auth.user?.email || null,
        clientIds: destinataireIds,
        contenu: content,
        nbPieces: (body.media_urls || []).length,
        batchId,
      };
      after(async () => {
        try {
          const bilan = await envoyerEmailsMessageInstant(paramsEmail);
          if (bilan.failed > 0) {
            reportError(`[messagerie] emails instant annonce : ${bilan.failed} échec(s) sur ${destinataireIds.length}`,
              null, { route: '/api/messagerie/announce' });
          }
        } catch (err) {
          reportError('[messagerie] emails instant annonce err:', err);
        }
      });
    }

    return Response.json({ batch_id: batchId, count, failed: echecs?.length || 0 });
  } catch (err) {
    reportError('[messagerie] announce err:', err);
    return Response.json({ error: 'Erreur diffusion : ' + err.message }, { status: 500 });
  }
});
