import { withRoute } from '@/lib/api-route';
import { createServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { resoudreFicheEleve } from '@/lib/fiche-eleve';
import { reportError } from '@/lib/report';
import { construireSnapshot } from '@/lib/factures';
import { genererFacturePdf, reponsePdf } from '@/lib/facture-pdf';
import { chargerFacturation, obtenirOuEmettreFacture, nomFichierFacture } from '@/lib/factures-service';

export const runtime = 'nodejs';

/**
 * Justificatif PDF d'un paiement, téléchargé par l'élève authentifié
 * (uniquement ses propres paiements RÉGLÉS).
 *
 * v84 : si le studio a configuré sa facturation (SIRET dans Paramètres), le
 * document est une vraie FACTURE acquittée — numéro séquentiel, snapshot gelé,
 * re-téléchargeable à l'identique. Si le paiement figure déjà sur une facture
 * (individuelle OU mensuelle), on re-sert CE document — jamais deux factures
 * pour le même paiement. Sans SIRET (ou migration absente) : le reçu simple
 * historique, comme avant.
 */
export const GET = withRoute({ auth: 'public' }, async ({ params }) => {
  const { studioSlug, paiementId } = params;

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

  // Fiche liée à ce compte dans ce studio — v83 : FK douce d'abord.
  // ⚠️ `clients.code_postal` N'EXISTE PAS (adresse particulier = adresse_postale).
  const client = await resoudreFicheEleve(supabaseAdmin, profile.id, user, 'id, prenom, nom, email, adresse, adresse_postale, ville');
  if (!client) return new Response('Client introuvable', { status: 404 });

  // Paiement (vérification que c'est bien le sien)
  const { data: paiement } = await supabaseAdmin
    .from('paiements')
    .select('id, intitule, montant, mode, date, date_encaissement, statut')
    .eq('id', paiementId)
    .eq('profile_id', profile.id)
    .eq('client_id', client.id)
    .single();
  if (!paiement) return new Response('Facture introuvable', { status: 404 });

  // B1f (rouge) : garde serveur — pas de justificatif pour un paiement non
  // réglé (un « reçu » forgeable sur du pending était opposable à la prof).
  if (paiement.statut !== 'paid') {
    return new Response('Ce paiement n\'est pas encore réglé — le justificatif sera disponible après encaissement.', { status: 403 });
  }

  try {
    // ── Facturation configurée → vraie facture (émise ou re-servie) ─────────
    const { active, facturation } = await chargerFacturation(supabaseAdmin, profile.id);
    if (active) {
      const res = await obtenirOuEmettreFacture(supabaseAdmin, {
        profileId: profile.id,
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
        // paiement_invalide, etc. — état inattendu (le paiement est vérifié
        // paid ci-dessus) : on le voit dans erreurs_app et on sert le reçu.
        reportError('[facture portail] émission refusée:', new Error(res.erreur), { route: `/api/portail/${studioSlug}/facture` });
      }
      // res.fallback → migration absente : reçu simple ci-dessous.
    }

    // ── Reçu simple historique (facturation non configurée) ─────────────────
    const snapshot = construireSnapshot({ profile, facturation: null, client, paiements: [paiement] });
    const pdfBytes = await genererFacturePdf({
      type: 'recu',
      numeroAffiche: `N° ${paiement.id.slice(0, 8).toUpperCase()}`,
      dateEmission: paiement.date_encaissement || paiement.date,
      snapshot,
    });
    const nomStudio = profile.studio_nom?.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'studio';
    return reponsePdf(pdfBytes, `recu-${nomStudio}-${paiement.id.slice(0, 8)}.pdf`);
  } catch (err) {
    reportError('[facture pdf] génération err:', err, { route: `/api/portail/${studioSlug}/facture` });
    return new Response('Le justificatif n\'a pas pu être généré — réessaie, ou contacte ton studio.', { status: 500 });
  }
});
