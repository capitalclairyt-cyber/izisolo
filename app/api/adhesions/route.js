import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { chargerAdhesions, vendreAdhesion } from '@/lib/vie-asso-service';
import { adherentesAJour } from '@/lib/vie-asso';

/**
 * /api/adhesions — les adhésions d'une association (v113, lot 3).
 *
 * GET  ?saison=&date= → la liste (et les adhérentes À JOUR à la date).
 * POST { client_id, offre_id, saison, montant, paye, mode, date } → vend une
 *      adhésion : un paiement (réglé ou à régler) + l'adhésion de la saison.
 * Plan `vie_asso` (Association seulement) ; lire = eleves_voir, vendre =
 * argent_gerer. Une adhésion ne donne droit à aucune séance : elle ne passe
 * JAMAIS par le tunnel des carnets.
 */
const venteSchema = z.object({
  client_id: z.string().uuid(),
  offre_id: z.string().uuid().nullable().optional(),
  saison: z.string().regex(/^\d{4}-\d{4}$/),
  montant: z.union([z.number(), z.string()]).optional(),
  paye: z.boolean().optional(),
  mode: z.enum(['especes', 'cheque', 'virement', 'CB']).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const GET = withRoute({ auth: 'user', plan: 'vie_asso', perm: 'eleves_voir' }, async ({ request, auth }) => {
  const { studioId, supabase } = auth;
  const url = new URL(request.url);
  const saison = /^\d{4}-\d{4}$/.test(url.searchParams.get('saison') || '') ? url.searchParams.get('saison') : null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('date') || '') ? url.searchParams.get('date') : new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  const { adhesions, migrationManquante } = await chargerAdhesions(supabase, studioId, { saison });
  if (migrationManquante) return Response.json({ adhesions: [], a_jour: [], indisponible: true, error: 'MIGRATION_V113_REQUISE' }, { status: 503 });
  return Response.json({ adhesions, a_jour: [...adherentesAJour(adhesions, date).keys()], date });
});

export const POST = withRoute({ auth: 'active', schema: venteSchema, plan: 'vie_asso', perm: 'argent_gerer' }, async ({ auth, body }) => {
  const { studioId, supabase } = auth;
  const { data: client } = await supabase.from('clients').select('id, prenom, nom').eq('id', body.client_id).eq('profile_id', studioId).maybeSingle();
  if (!client) return Response.json({ error: 'Fiche introuvable', code: 'INTROUVABLE' }, { status: 404 });
  let offre = null;
  if (body.offre_id) {
    const { data } = await supabase.from('offres').select('id, nom, prix, type').eq('id', body.offre_id).eq('profile_id', studioId).maybeSingle();
    if (!data || data.type !== 'adhesion') return Response.json({ error: 'Cette offre n\'est pas une adhésion.', code: 'OFFRE' }, { status: 400 });
    offre = data;
  }
  const aujourdhui = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  const brut = { ...body, montant: body.montant ?? offre?.prix ?? 0 };
  const r = await vendreAdhesion(supabase, { studioId, clientId: client.id, offre, brut, aujourdhui });
  if (!r.ok) {
    const status = r.code === 'MIGRATION_V113_REQUISE' ? 503 : r.code === 'DEJA_ADHERENTE' ? 409 : r.code === 'INVALIDE' ? 400 : 500;
    return Response.json({ error: r.message, code: r.code }, { status });
  }
  return Response.json({ ok: true, adhesion: r.adhesion, paiement_id: r.paiementId });
});
