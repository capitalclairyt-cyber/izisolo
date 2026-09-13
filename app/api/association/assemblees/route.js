import { withRoute } from '@/lib/api-route';
import { chargerAssemblees } from '@/lib/vie-asso-service';
import { sanitizeAssemblee } from '@/lib/vie-asso';

/**
 * /api/association/assemblees — les assemblées générales (v113).
 * GET  → la liste. POST { type, titre, date, heure, lieu, ordre_du_jour } → une AG.
 * Plan `vie_asso` ; lire = toute l'équipe, écrire = permission `documents`.
 */
const ABSENT = ['PGRST204', 'PGRST205', '42703', '42P01'];

export const GET = withRoute({ auth: 'user', plan: 'vie_asso' }, async ({ auth }) => {
  const { assemblees, migrationManquante } = await chargerAssemblees(auth.supabase, auth.studioId);
  if (migrationManquante) return Response.json({ assemblees: [], indisponible: true, error: 'MIGRATION_V113_REQUISE' }, { status: 503 });
  return Response.json({ assemblees });
});

export const POST = withRoute({ auth: 'active', plan: 'vie_asso', perm: 'documents' }, async ({ request, auth }) => {
  const { studioId, supabase } = auth;
  const brut = await request.json().catch(() => null);
  if (!brut) return Response.json({ error: 'Body JSON invalide', code: 'BAD_JSON' }, { status: 400 });
  const v = sanitizeAssemblee(brut);
  if (!v.ok) return Response.json({ error: v.raison, code: 'INVALIDE' }, { status: 400 });
  const { data, error } = await supabase.from('assemblees').insert({ ...v.assemblee, profile_id: studioId }).select('*').single();
  if (error) {
    const absente = ABSENT.includes(error.code);
    return Response.json({ error: absente ? "Les assemblées arrivent très bientôt : cette mise à jour n'est pas encore appliquée." : "L'assemblée n'a pas pu être enregistrée.", code: absente ? 'MIGRATION_V113_REQUISE' : 'INSERT_FAILED' }, { status: absente ? 503 : 500 });
  }
  return Response.json({ ok: true, assemblee: data });
});
