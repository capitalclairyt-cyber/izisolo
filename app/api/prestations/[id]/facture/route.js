import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { genererFacturePdf, reponsePdf } from '@/lib/facture-pdf';
import { peut } from '@/lib/studio-membre';

export const runtime = 'nodejs';

/**
 * /api/prestations/[id]/facture — le PDF de la facture d'une prestation (v112).
 * Deux lectrices légitimes, et personne d'autre : l'intervenante qui l'a
 * émise (son compte), et la structure qui la reçoit (studio affiché =
 * la structure, permission argent_voir). Re-rendu depuis le snapshot figé :
 * même document, même numéro, à chaque téléchargement.
 */
export const GET = withRoute({ auth: 'user' }, async ({ params, auth }) => {
  const admin = createAdminClient();
  const { data: p } = await admin.from('prestations').select('id, profile_id, membre_id, facture_id').eq('id', params.id).maybeSingle();
  if (!p || !p.facture_id) return new Response('Aucune facture pour cette prestation.', { status: 404 });
  const { data: membre } = await admin.from('studio_membres').select('auth_user_id').eq('id', p.membre_id).maybeSingle();
  const estIntervenante = membre?.auth_user_id === auth.user.id;
  const estStructure = auth.studioId === p.profile_id && peut(auth.membre, 'argent_voir');
  if (!estIntervenante && !estStructure) return new Response('Accès refusé.', { status: 403 });
  const { data: f } = await admin.from('factures').select('id, numero_affiche, date_emission, statut, snapshot').eq('id', p.facture_id).maybeSingle();
  if (!f) return new Response('Facture introuvable.', { status: 404 });
  const pdf = await genererFacturePdf({ type: 'facture', numeroAffiche: f.numero_affiche, dateEmission: f.date_emission, snapshot: f.snapshot });
  return reponsePdf(pdf, `facture-${String(f.numero_affiche).toLowerCase()}.pdf`);
});
