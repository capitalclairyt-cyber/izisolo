import { withRoute } from '@/lib/api-route';
import { ouvrirLienIntervenante } from '@/lib/lien-intervenante-serveur';
import { chargerReleve } from '@/lib/releve-service';
import { genererRelevePdf } from '@/lib/releve-pdf';
import { reponsePdf } from '@/lib/facture-pdf';
import { labelIntervenante } from '@/lib/intervenante';
import { REGEX_MOIS, moisPrecedent, derniersMois } from '@/lib/remuneration';

export const runtime = 'nodejs';

/**
 * /api/intervenante/[token]/releve — SON relevé, sur son lien permanent (v112).
 * Sans session, en service_role : le membre vient du sha256 du jeton, le
 * relevé ne contient que ses séances (dates, durées, nombre de présentes, CA
 * rattaché, montant convenu), jamais un nom d'élève.
 *
 * GET ?mois=AAAA-MM → PDF ; sans format=pdf → JSON avec la liste des mois
 * proposés et le relevé du mois demandé (le mois précédent par défaut).
 */
const RATE = { max: 120, windowSeconds: 3600, scope: 'intervenante' };

export const GET = withRoute({ auth: 'public', rateLimit: RATE }, async ({ request, params }) => {
  const ouvert = await ouvrirLienIntervenante(params.token);
  if (ouvert.erreur) return ouvert.erreur;
  const { admin, membre, profile } = ouvert;
  const url = new URL(request.url);
  const mois = REGEX_MOIS.test(url.searchParams.get('mois') || '') ? url.searchParams.get('mois') : moisPrecedent();
  const r = await chargerReleve(admin, { studioId: membre.profile_id, membreId: membre.id, mois });
  if (!r.ok) return Response.json({ error: 'Relevé indisponible.', code: r.code }, { status: r.code === 'MIGRATION_V103_REQUISE' ? 503 : 400 });
  // Une prestation validée sur ce mois : le relevé figé prime (c'est ce que
  // la structure a signé), et le PDF le dit.
  let valide = null;
  try {
    const { data } = await admin.from('prestations').select('montant, releve, statut').eq('membre_id', membre.id).eq('periode', mois).neq('statut', 'annulee').maybeSingle();
    valide = data || null;
  } catch { valide = null; }
  const releve = valide?.releve && typeof valide.releve === 'object' ? valide.releve : r.releve;
  if (url.searchParams.get('format') === 'pdf') {
    const pdf = await genererRelevePdf({ structureNom: profile.studio_nom, intervenanteNom: labelIntervenante(membre), mois, releve, statut: valide ? 'valide' : 'brouillon' });
    return reponsePdf(pdf, `releve-${mois}.pdf`);
  }
  return Response.json({ mois, mois_proposes: derniersMois(6), releve, valide: !!valide, montant_valide: valide ? Number(valide.montant) : null });
});
