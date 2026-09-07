import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { reportError } from '@/lib/report';
import { genererVersementsMensuels, moisCouverts, MAX_VERSEMENTS } from '@/lib/versements-mensuels';

/**
 * POST /api/abonnements/[id]/versements-mensuels — « Programmer un
 * versement chaque mois » sur un abo DÉJÀ vendu (retour Manon, 2026-09-07).
 *
 * Écrit N paiements `pending` rattachés à l'abo, un par mois, jusqu'à la fin
 * de l'abo, en sautant les mois déjà couverts (réglés ou en attente) : le
 * serveur recalcule TOUT depuis la base, jamais depuis l'aperçu du client —
 * l'aperçu et l'écriture partagent la même lib, et c'est la base qui tranche.
 * Chaque versement apparaît dans « À percevoir » (prof) et « À régler »
 * (élève) ; « Encaisser » le passe réglé, et la facture suit (v84 / v106).
 *
 * Les lignes partagent l'`echeancier_id` de l'abo s'il en a un, sinon un
 * neuf : la fiche les affiche comme un échéancier (« 3/12 »).
 */
const schema = z.object({
  montant: z.number().positive().max(100000),
  jour: z.number().int().min(1).max(31).default(1),
  debut: z.string().regex(/^\d{4}-\d{2}$/, 'Format YYYY-MM attendu'),
});

export const POST = withRoute({ auth: 'active', schema, perm: 'argent_gerer' }, async ({ params, auth, body }) => {
  const { studioId, supabase } = auth;
  const { id } = params;

  const { data: abo, error: aboErr } = await supabase
    .from('abonnements')
    .select('id, client_id, offre_id, offre_nom, type, statut, date_fin')
    .eq('id', id)
    .eq('profile_id', studioId)
    .single();
  if (aboErr || !abo) return Response.json({ error: 'Abonnement introuvable' }, { status: 404 });
  if (abo.statut !== 'actif') {
    return Response.json({ error: 'Cet abonnement n\'est pas actif : réactive-le d\'abord.' }, { status: 409 });
  }

  const { data: existants, error: payErr } = await supabase
    .from('paiements')
    .select('id, statut, date, date_encaissement, echeancier_id')
    .eq('abonnement_id', abo.id)
    .eq('profile_id', studioId);
  if (payErr) {
    reportError('[versements-mensuels] lecture paiements:', payErr, { route: '/api/abonnements/versements-mensuels' });
    return Response.json({ error: 'Impossible de relire les paiements de cet abonnement.' }, { status: 500 });
  }

  const { versements, ignores } = genererVersementsMensuels({
    montant: body.montant,
    jour: body.jour,
    debut: body.debut,
    fin: abo.date_fin || null,
    couverts: moisCouverts(existants),
    nbMax: MAX_VERSEMENTS,
  });

  if (versements.length === 0) {
    return Response.json({ ok: true, count: 0, ignores, versements: [] });
  }

  const echeancierId = (existants || []).find(p => p.echeancier_id)?.echeancier_id || crypto.randomUUID();
  const lignes = versements.map(v => ({
    profile_id: studioId,
    client_id: abo.client_id,
    offre_id: abo.offre_id || null,
    abonnement_id: abo.id,
    echeancier_id: echeancierId,
    intitule: `${abo.offre_nom || 'Abonnement'} (versement mensuel)`,
    type: abo.type || null,
    montant: v.montant,
    statut: 'pending',
    mode: null,
    date: v.date,
  }));

  const { data: crees, error: insErr } = await supabase.from('paiements').insert(lignes).select('id, date, montant');
  if (insErr) {
    reportError('[versements-mensuels] insert:', insErr, { route: '/api/abonnements/versements-mensuels' });
    return Response.json({ error: 'Les versements n\'ont pas pu être enregistrés.' }, { status: 500 });
  }

  return Response.json({ ok: true, count: (crees || []).length, ignores, versements: crees || [] });
});
