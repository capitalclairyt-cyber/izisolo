import { after } from 'next/server';
import { withRoute } from '@/lib/api-route';
import { announce } from '@/lib/messagerie';
import { envoyerEmailsMessageInstant } from '@/lib/messagerie-email';
import { reportError } from '@/lib/report';
import { adherentesAJourLe } from '@/lib/vie-asso-service';
import { texteConvocation, joursAvant, DELAI_CONVOCATION_JOURS } from '@/lib/vie-asso';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * POST /api/association/assemblees/[id]/convoquer — la CONVOCATION (v113).
 *
 * Elle part par la messagerie existante (une conversation par adhérente, le
 * message dans l'app, l'email instantané derrière, en after()) aux adhérentes
 * À JOUR au jour de l'AG. Le délai statutaire est RAPPELÉ dans la réponse,
 * jamais imposé : c'est aux statuts d'en décider. Permission `documents` (la
 * secrétaire), plan `vie_asso` (Association contient la messagerie).
 */
export const POST = withRoute({ auth: 'active', plan: 'vie_asso', perm: 'documents', rateLimit: { max: 10, windowSeconds: 3600, scope: 'ag-convoquer' } }, async ({ params, auth }) => {
  const { studioId, supabase, profile } = auth;
  const { data: ag } = await supabase.from('assemblees').select('*').eq('id', params.id).eq('profile_id', studioId).maybeSingle();
  if (!ag) return Response.json({ error: 'Assemblée introuvable', code: 'INTROUVABLE' }, { status: 404 });
  if (ag.statut === 'annulee') return Response.json({ error: 'Cette assemblée est annulée.', code: 'ANNULEE' }, { status: 409 });

  const { map } = await adherentesAJourLe(supabase, studioId, ag.date);
  const clientIds = [...map.keys()];
  if (clientIds.length === 0) {
    return Response.json({ error: 'Aucune adhérente à jour au jour de l\'assemblée : personne à convoquer.', code: 'AUCUNE_ADHERENTE' }, { status: 400 });
  }
  const content = texteConvocation({ nomAsso: profile?.studio_nom || 'l\'association', assemblee: ag });
  const aujourdhui = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  const delai = joursAvant(ag.date, aujourdhui);

  let batchId = null, count = 0, echecs = [];
  try {
    ({ batchId, count, echecs } = await announce(supabase, {
      profileId: studioId,
      targets: clientIds.map(id => ({ type: 'client', id })),
      content,
    }));
  } catch (e) {
    await reportError('[ag/convoquer] announce', e, { route: '/api/association/assemblees/convoquer' });
    return Response.json({ error: 'La convocation n\'a pas pu partir.', code: 'ANNONCE' }, { status: 500 });
  }
  if (echecs?.length) reportError(`[ag/convoquer] partiel : ${count} ok, ${echecs.length} échec(s)`, echecs[0]?.message, { route: '/api/association/assemblees/convoquer' });

  await supabase.from('assemblees').update({ convocation_envoyee_at: new Date().toISOString(), convoques: count }).eq('id', ag.id).eq('profile_id', studioId);

  const echecIds = new Set((echecs || []).map(e => e.id));
  const destinataires = clientIds.filter(id => !echecIds.has(id));
  if (destinataires.length > 0 && batchId) {
    after(async () => {
      try {
        await envoyerEmailsMessageInstant({
          profileId: studioId, studioNom: profile?.studio_nom, studioSlug: profile?.studio_slug,
          replyTo: profile?.email_contact || null, clientIds: destinataires, contenu: content, batchId,
        });
      } catch (e) { reportError('[ag/convoquer] emails', e, { route: '/api/association/assemblees/convoquer' }); }
    });
  }

  return Response.json({
    ok: true, convoques: count,
    delai_jours: delai,
    // Rappelé, jamais imposé : la plupart des statuts demandent 15 jours.
    delai_court: delai < DELAI_CONVOCATION_JOURS,
  });
});
