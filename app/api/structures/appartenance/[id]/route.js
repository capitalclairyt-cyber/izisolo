import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';

/**
 * PATCH /api/structures/appartenance/[id] — « Relier nos pages » (v115,
 * pont 5 du lot 5 Associations & Studios). La PERSONNE décide, sur SA ligne
 * d'équipe chez une structure, que sa page et celle de la structure se
 * citent. Écriture en service_role, bornée à `auth_user_id = la personne` et
 * `id = la ligne` : on n'écrit jamais la ligne d'une autre, ni chez soi.
 * Sans v115, 503 honnête.
 */
const ABSENT = ['PGRST204', 'PGRST205', '42703', '42P01'];
const schema = z.object({ portail_croise: z.boolean() });

export const GET = withRoute({ auth: 'user' }, async ({ params, auth }) => {
  const admin = createAdminClient();
  const { data, error } = await admin.from('studio_membres').select('id, portail_croise').eq('id', params.id).eq('auth_user_id', auth.user.id).maybeSingle();
  if (error) return Response.json({ ok: true, portail_croise: false, disponible: !ABSENT.includes(error.code) });
  if (!data) return Response.json({ error: 'Appartenance introuvable', code: 'INTROUVABLE' }, { status: 404 });
  return Response.json({ ok: true, portail_croise: data.portail_croise === true, disponible: true });
});

export const PATCH = withRoute({ auth: 'user', schema }, async ({ params, auth, body }) => {
  const admin = createAdminClient();
  const { data: ligne } = await admin.from('studio_membres').select('id, profile_id, statut').eq('id', params.id).eq('auth_user_id', auth.user.id).maybeSingle();
  if (!ligne) return Response.json({ error: 'Appartenance introuvable', code: 'INTROUVABLE' }, { status: 404 });
  if (ligne.profile_id === auth.user.id) return Response.json({ error: 'Ta propre page ne se cite pas elle-même.', code: 'SOI_MEME' }, { status: 400 });
  if (ligne.statut !== 'actif') return Response.json({ error: 'Cette appartenance n\'est pas active.', code: 'INACTIVE' }, { status: 409 });
  const { error } = await admin.from('studio_membres').update({ portail_croise: body.portail_croise === true }).eq('id', ligne.id).eq('auth_user_id', auth.user.id);
  if (error) {
    const absente = ABSENT.includes(error.code);
    return Response.json({ error: absente ? "Relier les pages arrive très bientôt : cette mise à jour n'est pas encore appliquée." : 'Le réglage n\'a pas pu être enregistré.', code: absente ? 'MIGRATION_V115_REQUISE' : 'UPDATE_FAILED' }, { status: absente ? 503 : 500 });
  }
  return Response.json({ ok: true, portail_croise: body.portail_croise === true });
});
