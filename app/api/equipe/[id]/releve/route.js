import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { chargerReleve } from '@/lib/releve-service';
import { genererRelevePdf } from '@/lib/releve-pdf';
import { reponsePdf } from '@/lib/facture-pdf';
import { labelIntervenante } from '@/lib/intervenante';
import { REGEX_MOIS, moisPrecedent } from '@/lib/remuneration';
import { validerReleve } from '@/lib/prestations-service';
import { prestationPourStructure } from '@/lib/prestations';

export const runtime = 'nodejs';

/**
 * /api/equipe/[id]/releve — le relevé mensuel d'une intervenante (v112).
 *
 * GET  ?mois=AAAA-MM[&format=pdf] → le relevé recalculé (JSON ou PDF).
 *      Plan `equipe`, permission `argent_voir` : c'est de l'argent.
 * POST { mois, montant? } → la structure VALIDE le relevé : une prestation
 *      naît (avec sa dépense « à régler »), l'intervenante reçoit le PDF.
 *      Permission `argent_gerer`.
 */
async function chargerMembre(supabase, studioId, id) {
  const { data } = await supabase.from('studio_membres').select('*').eq('id', id).eq('profile_id', studioId).maybeSingle();
  return data;
}

export const GET = withRoute({ auth: 'user', plan: 'equipe', perm: 'argent_voir' }, async ({ request, params, auth }) => {
  const { studioId, supabase, profile } = auth;
  const membre = await chargerMembre(supabase, studioId, params.id);
  if (!membre) return Response.json({ error: 'Membre introuvable', code: 'INTROUVABLE' }, { status: 404 });
  const url = new URL(request.url);
  const mois = REGEX_MOIS.test(url.searchParams.get('mois') || '') ? url.searchParams.get('mois') : moisPrecedent();
  const r = await chargerReleve(supabase, { studioId, membreId: membre.id, mois });
  if (!r.ok) {
    const migration = r.code === 'MIGRATION_V103_REQUISE';
    return Response.json({ error: migration ? 'Les intervenantes par séance ne sont pas encore actives (mise à jour en cours).' : 'Relevé illisible.', code: r.code }, { status: migration ? 503 : 400 });
  }
  if (url.searchParams.get('format') === 'pdf') {
    const pdf = await genererRelevePdf({ structureNom: profile?.studio_nom, intervenanteNom: labelIntervenante(membre), mois, releve: r.releve });
    return reponsePdf(pdf, `releve-${mois}-${labelIntervenante(membre).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`);
  }
  return Response.json({ mois, membre: { id: membre.id, label: labelIntervenante(membre) }, releve: r.releve });
});

const validerSchema = z.object({
  mois: z.string().regex(REGEX_MOIS),
  montant: z.union([z.number(), z.string()]).optional(),
});

export const POST = withRoute({ auth: 'active', schema: validerSchema, plan: 'equipe', perm: 'argent_gerer' }, async ({ params, auth, body }) => {
  const { studioId } = auth;
  const montant = body.montant === undefined || body.montant === '' ? null : Number(String(body.montant).replace(',', '.'));
  if (montant !== null && !Number.isFinite(montant)) return Response.json({ error: 'Montant invalide.', code: 'MONTANT' }, { status: 400 });
  const r = await validerReleve(createAdminClient(), { studioId, membreId: params.id, mois: body.mois, montantOverride: montant });
  if (!r.ok) {
    const status = r.code === 'MIGRATION_V112_REQUISE' || r.code === 'MIGRATION_V103_REQUISE' ? 503 : r.code === 'DEJA_VALIDE' ? 409 : r.code === 'MEMBRE_INTROUVABLE' ? 404 : 400;
    return Response.json({ error: r.message || 'Validation impossible.', code: r.code }, { status });
  }
  const { data: membre } = await auth.supabase.from('studio_membres').select('id, prenom, nom, email, auth_user_id').eq('id', params.id).maybeSingle();
  return Response.json({ ok: true, prestation: prestationPourStructure(r.prestation, { label: labelIntervenante(membre), auth_user_id: membre?.auth_user_id }) });
});
