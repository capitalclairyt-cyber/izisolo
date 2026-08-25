import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { reportError } from '@/lib/report';
import { REGEX_MOIS, moisDePaiement, labelMois } from '@/lib/factures';
import { genererFacturePdf, reponsePdf } from '@/lib/facture-pdf';
import { chargerFacturation, facturesPourPaiements, emettreFacture, nomFichierFacture } from '@/lib/factures-service';

export const runtime = 'nodejs';

/**
 * « Facture du mois » côté PROF (v84) — GET ?client=<id>&mois=YYYY-MM.
 * Regroupe les paiements réglés du mois PAS ENCORE facturés de cette fiche
 * sur un seul document — miroir exact du bouton élève (même règle d'or :
 * un paiement n'est jamais porté par deux factures).
 */
export const GET = withRoute({ auth: 'active' }, async ({ request, auth }) => {
  const { studioId, user, profile } = auth;
  const admin = createAdminClient();

  const url = new URL(request.url);
  const clientId = url.searchParams.get('client') || '';
  const mois = url.searchParams.get('mois') || '';
  if (!clientId || !REGEX_MOIS.test(mois)) {
    return new Response('Paramètres invalides (client + mois AAAA-MM attendus).', { status: 400 });
  }

  const { active, facturation } = await chargerFacturation(admin, user.id);
  if (!active) {
    return new Response('Renseigne d\'abord ton SIRET (Paramètres → Profil & studio → Activité) pour émettre des factures.', { status: 409 });
  }

  const { data: client, error: cliErr } = await admin
    .from('clients')
    .select('id, prenom, nom, email, adresse, adresse_postale, ville')
    .eq('id', clientId)
    .eq('profile_id', studioId)
    .single();
  if (cliErr || !client) return new Response('Fiche élève introuvable', { status: 404 });

  try {
    const { data: paiements, error: payErr } = await admin
      .from('paiements')
      .select('id, intitule, montant, mode, date, date_encaissement, statut')
      .eq('profile_id', studioId)
      .eq('client_id', client.id)
      .eq('statut', 'paid');
    if (payErr) throw payErr;

    const duMois = (paiements || []).filter(p => moisDePaiement(p) === mois);
    if (duMois.length === 0) {
      return new Response(`Aucun paiement encaissé en ${labelMois(mois)} pour cette fiche.`, { status: 404 });
    }

    const dejaFactures = await facturesPourPaiements(admin, duMois.map(p => p.id));
    const facturables = duMois.filter(p => !dejaFactures.has(p.id));
    if (facturables.length === 0) {
      return new Response(`Tous les paiements de ${labelMois(mois)} sont déjà facturés — chaque ligne de paiement re-télécharge sa facture.`, { status: 409 });
    }

    const res = await emettreFacture(admin, {
      profileId: user.id,
      clientId: client.id,
      profile,
      facturation,
      client,
      paiements: facturables,
    });
    if (!res.facture) {
      return new Response('La facture n\'a pas pu être émise — réessaie (si ça persiste, la migration v84 n\'est peut-être pas appliquée).', { status: 500 });
    }

    const pdfBytes = await genererFacturePdf({
      type: 'facture',
      numeroAffiche: res.facture.numero_affiche,
      dateEmission: res.facture.date_emission,
      snapshot: res.facture.snapshot,
    });
    return reponsePdf(pdfBytes, nomFichierFacture(res.facture));
  } catch (err) {
    reportError('[factures mois] génération err:', err, { route: '/api/factures/mois' });
    return new Response('La facture n\'a pas pu être générée — réessaie.', { status: 500 });
  }
});
