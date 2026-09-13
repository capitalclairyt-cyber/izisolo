import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { facturerPrestation } from '@/lib/prestations-service';

/**
 * /api/prestations/[id]/facturer — l'intervenante émet SA facture (v112).
 *
 * POST → facture v2 non acquittée dans SA séquence (son compte, son SIRET),
 * PDF envoyé à la structure. `auth: 'active'` : c'est SON compte qui émet,
 * pas le studio affiché (une prestation se facture depuis n'importe où).
 * Refus honnêtes : pas la sienne (403), déjà facturée (409), sans SIRET
 * (409 SANS_SIRET, avec le chemin pour le renseigner).
 */
export const POST = withRoute({ auth: 'active' }, async ({ request, params, auth }) => {
  const r = await facturerPrestation(createAdminClient(), { prestationId: params.id, userId: auth.user.id, request });
  if (!r.ok) {
    const messages = {
      INTROUVABLE: ['Prestation introuvable.', 404],
      PAS_LA_TIENNE: ["Cette prestation n'est pas la tienne.", 403],
      DEJA_FACTUREE: ['Cette prestation est déjà facturée.', 409],
      STATUT: ['Cette prestation ne peut plus être facturée.', 409],
      SANS_SIRET: ["Renseigne d'abord ta facturation (Paramètres → Facturation : raison sociale et SIRET) : une facture sans numéro d'entreprise n'en est pas une.", 409],
      MIGRATION_V112_REQUISE: ['Les factures de prestation arrivent très bientôt : cette mise à jour n\'est pas encore appliquée.', 503],
    };
    const [error, status] = messages[r.code] || ['Facture impossible pour le moment.', 500];
    return Response.json({ error, code: r.code }, { status });
  }
  return Response.json({ ok: true, facture: { id: r.facture.id, numero_affiche: r.facture.numero_affiche, date_emission: r.facture.date_emission } });
});
