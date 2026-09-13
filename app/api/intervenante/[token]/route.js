import { withRoute } from '@/lib/api-route';
import {
  membrePourIntervenante, seancePourIntervenante, classerSeances, FENETRE_JOURS,
} from '@/lib/lien-intervenante';
import { ouvrirLienIntervenante } from '@/lib/lien-intervenante-serveur';
import { compterPlacesOccupeesParCours } from '@/lib/presences';

/**
 * /api/intervenante/[token] — le chemin PUBLIC du lien permanent (v111).
 *
 * ⚠️ En service_role : la personne n'a pas de session Supabase, la RLS ne
 * protège rien ici. Le membre est lu par le sha256 du jeton, jamais par un
 * paramètre ; ses séances sont lues par SON studio et SON identifiant de
 * membre ; ce qui sort passe par lib/lien-intervenante (minimisation).
 *
 * GET → qui elle est (prénom, studio), ses séances de la fenêtre (7 jours en
 *       arrière, 30 en avant), et les séances sans intervenante désignée
 *       (une séance orpheline reste pointable par l'équipe, comme en v103).
 *       Avant v103, la colonne `intervenant_id` n'existe pas : toutes les
 *       séances de la fenêtre sont servies comme « sans intervenante », et
 *       la réponse le dit.
 */
const RATE = { max: 240, windowSeconds: 3600, scope: 'intervenante' };
const iso = (d) => d.toISOString().slice(0, 10);

export const GET = withRoute({ auth: 'public', rateLimit: RATE }, async ({ params }) => {
  const ouvert = await ouvrirLienIntervenante(params.token);
  if (ouvert.erreur) return ouvert.erreur;
  const { admin, membre, profile } = ouvert;

  const debut = iso(new Date(Date.now() - FENETRE_JOURS.avant * 86400000));
  const fin = iso(new Date(Date.now() + FENETRE_JOURS.apres * 86400000));
  // `intervenant_id` À PART (pré-v103 la colonne manque) : on relit sans elle
  // et on le dit, plutôt que de rendre une page vide. Listes en toutes lettres
  // (verifier-selects ne lit pas un template, §12).
  let { data: cours, error } = await admin
    .from('cours')
    .select('id, nom, type_cours, date, heure, duree_minutes, lieu, format, est_annule, intervenant_id')
    .eq('profile_id', membre.profile_id)
    .gte('date', debut)
    .lte('date', fin)
    .order('date').order('heure')
    .limit(200);
  let sansIntervenantes = false;
  if (error && ['PGRST204', '42703'].includes(error.code)) {
    sansIntervenantes = true;
    ({ data: cours } = await admin
      .from('cours')
      .select('id, nom, type_cours, date, heure, duree_minutes, lieu, format, est_annule')
      .eq('profile_id', membre.profile_id)
      .gte('date', debut)
      .lte('date', fin)
      .order('date').order('heure')
      .limit(200));
  }

  const { miennes, orphelines } = classerSeances(cours || [], membre.id);
  const ids = [...miennes, ...orphelines].map(c => c.id);
  let places = {};
  try { places = ids.length ? await compterPlacesOccupeesParCours(admin, ids) : {}; } catch { places = {}; }

  // Usage tracé : combien de fois le lien a servi, et quand (l'écran de la
  // prof le dit). Une lecture n'est pas un pointage, mais c'est déjà une
  // utilisation.
  await admin.from('studio_membres').update({
    lien_usages: (membre.lien_usages || 0) + 1,
    lien_derniere_utilisation_at: new Date().toISOString(),
  }).eq('id', membre.id);

  return Response.json({
    moi: membrePourIntervenante(membre, profile.studio_nom),
    studio_slug: profile.studio_slug || null,
    miennes: miennes.map(c => seancePourIntervenante({ ...c, mienne: true }, places[c.id] ?? null)),
    orphelines: orphelines.map(c => seancePourIntervenante(c, places[c.id] ?? null)),
    sans_intervenantes: sansIntervenantes,
    expire_at: membre.lien_expire_at,
  });
});
