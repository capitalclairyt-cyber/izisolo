import { withRoute } from '@/lib/api-route';
import { sanitizeDocument } from '@/lib/vie-asso';

/**
 * /api/equipe/[id]/contrat — le CONTRAT d'une intervenante (v114, lot 4
 * Associations & Studios, §5.2 « contrat de prestation stocké comme
 * document »). C'est un document de la structure (`documents_structure`,
 * v113, type `contrat`, rattaché au membre) : un studio comme une
 * association le dépose ici, sans passer par la page Association.
 * GET → ses contrats ; POST { url, titre, date_document } → un contrat (l'URL
 * vient de /api/association/documents/upload) ; DELETE ?document= → le retire.
 * Plan `depenses` (palier équipe), permission `documents`.
 */
const ABSENT = ['PGRST204', 'PGRST205', '42703', '42P01'];

async function chargerMembre(supabase, studioId, id) {
  const { data } = await supabase.from('studio_membres').select('id, email').eq('id', id).eq('profile_id', studioId).maybeSingle();
  return data;
}

export const GET = withRoute({ auth: 'user', plan: 'depenses' }, async ({ params, auth }) => {
  const { studioId, supabase } = auth;
  const membre = await chargerMembre(supabase, studioId, params.id);
  if (!membre) return Response.json({ error: 'Membre introuvable', code: 'INTROUVABLE' }, { status: 404 });
  const { data, error } = await supabase
    .from('documents_structure')
    .select('id, titre, url, date_document, created_at')
    .eq('profile_id', studioId).eq('membre_id', membre.id).eq('type', 'contrat')
    .order('created_at', { ascending: false });
  if (error) return Response.json({ contrats: [], indisponible: ABSENT.includes(error.code) });
  return Response.json({ contrats: data || [] });
});

export const POST = withRoute({ auth: 'active', plan: 'depenses', perm: 'documents' }, async ({ request, params, auth }) => {
  const { studioId, supabase, user } = auth;
  const membre = await chargerMembre(supabase, studioId, params.id);
  if (!membre) return Response.json({ error: 'Membre introuvable', code: 'INTROUVABLE' }, { status: 404 });
  const brut = await request.json().catch(() => null);
  if (!brut) return Response.json({ error: 'Body JSON invalide', code: 'BAD_JSON' }, { status: 400 });
  const v = sanitizeDocument({ ...brut, type: 'contrat', membre_id: membre.id, assemblee_id: null });
  if (!v.ok) return Response.json({ error: v.raison, code: 'INVALIDE' }, { status: 400 });
  const { data, error } = await supabase.from('documents_structure').insert({ ...v.document, profile_id: studioId, created_by: user.id }).select('id, titre, url, date_document, created_at').single();
  if (error) {
    const absente = ABSENT.includes(error.code);
    return Response.json({ error: absente ? "Les contrats arrivent très bientôt : cette mise à jour n'est pas encore appliquée." : 'Le contrat n\'a pas pu être enregistré.', code: absente ? 'MIGRATION_V113_REQUISE' : 'INSERT_FAILED' }, { status: absente ? 503 : 500 });
  }
  return Response.json({ ok: true, contrat: data });
});

export const DELETE = withRoute({ auth: 'active', plan: 'depenses', perm: 'documents' }, async ({ request, params, auth }) => {
  const { studioId, supabase } = auth;
  const membre = await chargerMembre(supabase, studioId, params.id);
  if (!membre) return Response.json({ error: 'Membre introuvable', code: 'INTROUVABLE' }, { status: 404 });
  const docId = new URL(request.url).searchParams.get('document');
  if (!docId) return Response.json({ error: 'Document manquant', code: 'INVALIDE' }, { status: 400 });
  const { error } = await supabase.from('documents_structure').delete().eq('id', docId).eq('profile_id', studioId).eq('membre_id', membre.id).eq('type', 'contrat');
  if (error) return Response.json({ error: 'Suppression impossible.', code: 'DELETE_FAILED' }, { status: 500 });
  return Response.json({ ok: true });
});
