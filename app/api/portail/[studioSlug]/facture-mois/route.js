import { withRoute } from '@/lib/api-route';
import { createServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { resoudreFicheEleve } from '@/lib/fiche-eleve';
import { reportError } from '@/lib/report';
import { REGEX_MOIS, moisDePaiement, labelMois } from '@/lib/factures';
import { genererFacturePdf, reponsePdf } from '@/lib/facture-pdf';
import { chargerFacturation, facturesPourPaiements, emettreFacture, nomFichierFacture } from '@/lib/factures-service';

export const runtime = 'nodejs';

/**
 * « Facture du mois » (v84) — l'élève regroupe TOUS ses paiements réglés du
 * mois PAS ENCORE facturés sur un seul document (le justificatif CSE de
 * l'élève qui paie à la séance). GET ?mois=YYYY-MM.
 *
 * La règle d'or tient toute seule : un paiement déjà porté par une facture
 * (individuelle ou mensuelle) est exclu — jamais deux justificatifs pour le
 * même argent. Réservée aux studios avec facturation configurée (SIRET).
 */
export const GET = withRoute({ auth: 'public' }, async ({ request, params }) => {
  const { studioSlug } = params;

  const mois = new URL(request.url).searchParams.get('mois') || '';
  if (!REGEX_MOIS.test(mois)) {
    return new Response('Mois invalide (format attendu : AAAA-MM).', { status: 400 });
  }

  // Auth
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const supabaseAdmin = createAdminClient();

  // Studio
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, studio_nom, adresse, code_postal, ville, telephone, email_contact')
    .eq('studio_slug', studioSlug)
    .single();
  if (!profile) return new Response('Studio introuvable', { status: 404 });

  const { active, facturation } = await chargerFacturation(supabaseAdmin, profile.id);
  if (!active) {
    return new Response('Ton studio n\'a pas activé les factures — demande-lui directement ton justificatif.', { status: 404 });
  }

  const client = await resoudreFicheEleve(supabaseAdmin, profile.id, user, 'id, prenom, nom, email, adresse, adresse_postale, ville');
  if (!client) return new Response('Client introuvable', { status: 404 });

  try {
    // Paiements réglés du mois (règlement = date_encaissement, échéance en
    // secours — même logique que l'affichage de l'espace).
    const { data: paiements, error: payErr } = await supabaseAdmin
      .from('paiements')
      .select('id, intitule, montant, mode, date, date_encaissement, statut')
      .eq('profile_id', profile.id)
      .eq('client_id', client.id)
      .eq('statut', 'paid');
    if (payErr) throw payErr;

    const duMois = (paiements || []).filter(p => moisDePaiement(p) === mois);
    if (duMois.length === 0) {
      return new Response(`Aucun paiement réglé en ${labelMois(mois)}.`, { status: 404 });
    }

    const dejaFactures = await facturesPourPaiements(supabaseAdmin, duMois.map(p => p.id));
    const facturables = duMois.filter(p => !dejaFactures.has(p.id));
    if (facturables.length === 0) {
      return new Response(`Tous les paiements de ${labelMois(mois)} sont déjà facturés — re-télécharge chaque facture depuis la ligne de son paiement.`, { status: 409 });
    }

    const res = await emettreFacture(supabaseAdmin, {
      profileId: profile.id,
      clientId: client.id,
      profile,
      facturation,
      client,
      paiements: facturables,
    });
    if (!res.facture) {
      // deja_facture (course) inclus : l'élève re-clique et la ligne du
      // paiement re-sert le document gagnant.
      return new Response('La facture n\'a pas pu être émise — réessaie, ou contacte ton studio.', { status: 500 });
    }

    const pdfBytes = await genererFacturePdf({
      type: 'facture',
      numeroAffiche: res.facture.numero_affiche,
      dateEmission: res.facture.date_emission,
      snapshot: res.facture.snapshot,
    });
    return reponsePdf(pdfBytes, nomFichierFacture(res.facture));
  } catch (err) {
    reportError('[facture-mois] génération err:', err, { route: `/api/portail/${studioSlug}/facture-mois` });
    return new Response('La facture n\'a pas pu être générée — réessaie, ou contacte ton studio.', { status: 500 });
  }
});
