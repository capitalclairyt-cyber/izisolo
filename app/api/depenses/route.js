import { withRoute } from '@/lib/api-route';
import { sanitizeDepense } from '@/lib/depenses';

/**
 * /api/depenses — les dépenses d'une structure (v112, lot 2 Associations &
 * Studios). Simple par construction ; la RLS (argent_voir / argent_gerer)
 * tient la frontière, la route ne fait que valider et écrire.
 *
 * GET  ?from=&to= → la liste (bornée, 500 max, la plus récente d'abord).
 * POST { libelle, date, montant_ttc, ... } → une dépense.
 * Plan `depenses` (Association et Studio) ; lire = argent_voir, écrire =
 * argent_gerer. Sans v112 : 503 honnête, jamais une liste vide qui ment.
 */
const ABSENT = ['PGRST204', 'PGRST205', '42703', '42P01'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const GET = withRoute({ auth: 'user', plan: 'depenses', perm: 'argent_voir' }, async ({ request, auth }) => {
  const { studioId, supabase } = auth;
  const url = new URL(request.url);
  const from = DATE_RE.test(url.searchParams.get('from') || '') ? url.searchParams.get('from') : null;
  const to = DATE_RE.test(url.searchParams.get('to') || '') ? url.searchParams.get('to') : null;
  let q = supabase
    .from('depenses')
    .select('id, date, categorie, libelle, montant_ttc, montant_ht, tva_taux, fournisseur, justificatif_url, notes, membre_id, lieu_id, cours_id, prestation_id, statut, date_reglement, mode_reglement, created_at')
    .eq('profile_id', studioId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(500);
  if (from) q = q.gte('date', from);
  if (to) q = q.lte('date', to);
  const { data, error } = await q;
  if (error) {
    const absente = ABSENT.includes(error.code);
    return Response.json({ depenses: [], indisponible: absente, error: absente ? 'MIGRATION_V112_REQUISE' : 'Lecture impossible' }, { status: absente ? 503 : 500 });
  }
  return Response.json({ depenses: data || [] });
});

export const POST = withRoute({ auth: 'active', plan: 'depenses', perm: 'argent_gerer' }, async ({ request, auth }) => {
  const { studioId, supabase } = auth;
  const brut = await request.json().catch(() => null);
  if (!brut) return Response.json({ error: 'Body JSON invalide', code: 'BAD_JSON' }, { status: 400 });
  const v = sanitizeDepense(brut);
  if (!v.ok) return Response.json({ error: v.raison, code: 'INVALIDE' }, { status: 400 });
  // Les rattachements doivent être DU studio : un id d'ailleurs est jeté.
  const d = { ...v.depense, profile_id: studioId };
  if (d.membre_id) {
    const { data: m } = await supabase.from('studio_membres').select('id').eq('id', d.membre_id).eq('profile_id', studioId).maybeSingle();
    if (!m) d.membre_id = null;
  }
  if (d.lieu_id) {
    const { data: l } = await supabase.from('lieux').select('id').eq('id', d.lieu_id).eq('profile_id', studioId).maybeSingle();
    if (!l) d.lieu_id = null;
  }
  if (d.cours_id) {
    const { data: c } = await supabase.from('cours').select('id').eq('id', d.cours_id).eq('profile_id', studioId).maybeSingle();
    if (!c) d.cours_id = null;
  }
  const { data, error } = await supabase.from('depenses').insert(d).select('*').single();
  if (error) {
    const absente = ABSENT.includes(error.code);
    return Response.json(
      { error: absente ? "Les dépenses arrivent très bientôt : cette mise à jour n'est pas encore appliquée." : "La dépense n'a pas pu être enregistrée.", code: absente ? 'MIGRATION_V112_REQUISE' : 'INSERT_FAILED' },
      { status: absente ? 503 : 500 }
    );
  }
  return Response.json({ ok: true, depense: data });
});
