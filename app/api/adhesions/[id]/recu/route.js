import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { reportError } from '@/lib/report';
import { construireSnapshot } from '@/lib/factures';
import { genererFacturePdf, reponsePdf } from '@/lib/facture-pdf';
import { chargerFacturation, obtenirOuEmettreFacture } from '@/lib/factures-service';

export const runtime = 'nodejs';

/**
 * /api/adhesions/[id]/recu — le REÇU DE COTISATION (v113). C'est la facture
 * v84 (même numérotation, même snapshot figé) intitulée « reçu de cotisation »
 * quand la structure a renseigné son identifiant, un reçu simple sinon. Il
 * ne porte que le paiement RÉGLÉ de l'adhésion.
 */
export const GET = withRoute({ auth: 'user', plan: 'vie_asso', perm: 'eleves_voir' }, async ({ params, auth }) => {
  const { studioId, profile } = auth;
  const admin = createAdminClient();
  const { data: a } = await admin.from('adhesions').select('id, client_id, paiement_id, saison, offre_nom').eq('id', params.id).eq('profile_id', studioId).maybeSingle();
  if (!a) return new Response('Adhésion introuvable', { status: 404 });
  if (!a.paiement_id) return new Response('Adhésion offerte : pas de règlement, donc pas de reçu.', { status: 409 });
  const { data: paiement } = await admin.from('paiements').select('id, intitule, montant, mode, date, date_encaissement, statut, client_id').eq('id', a.paiement_id).eq('profile_id', studioId).maybeSingle();
  if (!paiement) return new Response('Paiement introuvable', { status: 404 });
  if (paiement.statut !== 'paid') return new Response('La cotisation n\'est pas encore réglée : encaisse-la d\'abord.', { status: 409 });
  const { data: client } = await admin.from('clients').select('id, prenom, nom, email, adresse, adresse_postale, ville').eq('id', paiement.client_id).eq('profile_id', studioId).maybeSingle();
  if (!client) return new Response('Fiche introuvable', { status: 404 });
  try {
    const { active, facturation } = await chargerFacturation(admin, studioId);
    if (active) {
      const res = await obtenirOuEmettreFacture(admin, { profileId: studioId, clientId: client.id, profile, facturation, client, paiement });
      if (res.facture) {
        const pdf = await genererFacturePdf({ type: 'facture', numeroAffiche: res.facture.numero_affiche, dateEmission: res.facture.date_emission, snapshot: res.facture.snapshot, titre: 'REÇU DE COTISATION' });
        return reponsePdf(pdf, `recu-cotisation-${a.saison}-${String(client.prenom || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`);
      }
    }
    const snapshot = construireSnapshot({ profile, facturation: null, client, paiements: [paiement] });
    const pdf = await genererFacturePdf({ type: 'recu', numeroAffiche: `N° ${paiement.id.slice(0, 8).toUpperCase()}`, dateEmission: paiement.date_encaissement || paiement.date, snapshot, titre: 'REÇU DE COTISATION' });
    return reponsePdf(pdf, `recu-cotisation-${a.saison}.pdf`);
  } catch (err) {
    reportError('[adhesions/recu] err:', err, { route: '/api/adhesions/recu' });
    return new Response('Reçu indisponible', { status: 500 });
  }
});
