import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { reportError } from '@/lib/report';
import { construireSnapshot } from '@/lib/factures';
import { genererFacturePdf, reponsePdf } from '@/lib/facture-pdf';
import { chargerFacturation, obtenirOuEmettreFacture, nomFichierFacture } from '@/lib/factures-service';

export const runtime = 'nodejs';

/**
 * Justificatif PDF d'un paiement, côté PROF (fiche élève → Paiements) — v84.
 * Même moteur que le portail : facture acquittée si le SIRET est configuré
 * (émise à la 1re demande, re-servie ensuite — même document que celui que
 * l'élève télécharge), reçu simple sinon. La prof peut ainsi préparer le
 * justificatif d'une cliente qui le demande de vive voix.
 */
export const GET = withRoute({ auth: 'active' }, async ({ params, auth }) => {
  const { studioId, user, profile } = auth;
  const { paiementId } = params;
  const admin = createAdminClient();

  const { data: paiement, error: payErr } = await admin
    .from('paiements')
    .select('id, intitule, montant, mode, date, date_encaissement, statut, client_id')
    .eq('id', paiementId)
    .eq('profile_id', studioId)
    .single();
  if (payErr || !paiement) return new Response('Paiement introuvable', { status: 404 });

  if (!paiement.client_id) {
    return new Response('Ce paiement n\'est rattaché à aucune fiche élève — pas de facture possible (le document est nominatif).', { status: 409 });
  }
  if (paiement.statut !== 'paid') {
    return new Response('Ce paiement n\'est pas encore encaissé — encaisse-le d\'abord (une facture acquittée ne porte que des règlements reçus).', { status: 409 });
  }

  const { data: client, error: cliErr } = await admin
    .from('clients')
    .select('id, prenom, nom, email, adresse, adresse_postale, ville')
    .eq('id', paiement.client_id)
    .eq('profile_id', studioId)
    .single();
  if (cliErr || !client) return new Response('Fiche élève introuvable', { status: 404 });

  try {
    const { active, facturation } = await chargerFacturation(admin, user.id);
    if (active) {
      const res = await obtenirOuEmettreFacture(admin, {
        profileId: user.id,
        clientId: client.id,
        profile,
        facturation,
        client,
        paiement,
      });
      if (res.facture) {
        const pdfBytes = await genererFacturePdf({
          type: 'facture',
          numeroAffiche: res.facture.numero_affiche,
          dateEmission: res.facture.date_emission,
          snapshot: res.facture.snapshot,
        });
        return reponsePdf(pdfBytes, nomFichierFacture(res.facture));
      }
      if (res.erreur) {
        reportError('[facture prof] émission refusée:', new Error(res.erreur), { route: '/api/factures/paiement' });
      }
      // fallback → reçu simple ci-dessous (migration pas appliquée)
    }

    const snapshot = construireSnapshot({ profile, facturation: null, client, paiements: [paiement] });
    const pdfBytes = await genererFacturePdf({
      type: 'recu',
      numeroAffiche: `N° ${paiement.id.slice(0, 8).toUpperCase()}`,
      dateEmission: paiement.date_encaissement || paiement.date,
      snapshot,
    });
    return reponsePdf(pdfBytes, `recu-${paiement.id.slice(0, 8)}.pdf`);
  } catch (err) {
    reportError('[facture prof] génération err:', err, { route: '/api/factures/paiement' });
    return new Response('Le justificatif n\'a pas pu être généré — réessaie.', { status: 500 });
  }
});
