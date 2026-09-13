import { withRoute } from '@/lib/api-route';
import { chargerDocuments } from '@/lib/vie-asso-service';
import { sanitizeDocument, classerDocuments } from '@/lib/vie-asso';

/**
 * /api/association/documents — les documents de la structure (v113).
 * GET  → la liste, avec la version courante par type et l'historique.
 * POST { type, titre, url, date_document, assemblee_id?, membre_id? } → un
 *      document (l'URL vient de /api/association/documents/upload).
 * Plan `vie_asso` ; lire = toute l'équipe, écrire = permission `documents`
 * (tenue par la base, RLS v113).
 */
const ABSENT = ['PGRST204', 'PGRST205', '42703', '42P01'];

export const GET = withRoute({ auth: 'user', plan: 'vie_asso' }, async ({ auth }) => {
  const { documents, migrationManquante } = await chargerDocuments(auth.supabase, auth.studioId);
  if (migrationManquante) return Response.json({ documents: [], indisponible: true, error: 'MIGRATION_V113_REQUISE' }, { status: 503 });
  return Response.json({ documents, ...classerDocuments(documents) });
});

export const POST = withRoute({ auth: 'active', plan: 'vie_asso', perm: 'documents' }, async ({ request, auth }) => {
  const { studioId, supabase, user } = auth;
  const brut = await request.json().catch(() => null);
  if (!brut) return Response.json({ error: 'Body JSON invalide', code: 'BAD_JSON' }, { status: 400 });
  const v = sanitizeDocument(brut);
  if (!v.ok) return Response.json({ error: v.raison, code: 'INVALIDE' }, { status: 400 });
  const d = { ...v.document, profile_id: studioId, created_by: user.id };
  if (d.assemblee_id) {
    const { data: ag } = await supabase.from('assemblees').select('id').eq('id', d.assemblee_id).eq('profile_id', studioId).maybeSingle();
    if (!ag) d.assemblee_id = null;
  }
  if (d.membre_id) {
    const { data: m } = await supabase.from('studio_membres').select('id').eq('id', d.membre_id).eq('profile_id', studioId).maybeSingle();
    if (!m) d.membre_id = null;
  }
  const { data, error } = await supabase.from('documents_structure').insert(d).select('*').single();
  if (error) {
    const absente = ABSENT.includes(error.code);
    return Response.json({ error: absente ? "Les documents arrivent très bientôt : cette mise à jour n'est pas encore appliquée." : 'Le document n\'a pas pu être enregistré.', code: absente ? 'MIGRATION_V113_REQUISE' : 'INSERT_FAILED' }, { status: absente ? 503 : 500 });
  }
  // Un PV rattaché à une AG : l'AG le connaît.
  if (data.type === 'pv_ag' && data.assemblee_id) {
    await supabase.from('assemblees').update({ pv_document_id: data.id }).eq('id', data.assemblee_id).eq('profile_id', studioId);
  }
  return Response.json({ ok: true, document: data });
});
