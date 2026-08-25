import { withRoute } from '@/lib/api-route';
import { reportError } from '@/lib/report';
import { parseJsonBody, urssafDeclarationSchema } from '@/lib/validation';
import { periodeParId, aujourdhuiParis } from '@/lib/urssaf';
import { montantADeclarer } from '@/lib/declaration-archive';

export const dynamic = 'force-dynamic';

/**
 * POST /api/urssaf/declaration — l'archive (v94).
 *
 *   action 'consultee' : trace le passage sur la page de détail. C'est le
 *     « retrouver ce qui a été demandé » : compteur + dernière fois + montant
 *     du moment. Silencieux et jamais bloquant.
 *   action 'declaree'  : la prof dit « c'est fait ». On FIGE le montant et le
 *     snapshot de ce qui était affiché. Sans cette photo, revenir sur la
 *     période des mois plus tard rendrait un total recalculé — pas celui
 *     qu'elle a réellement déclaré, et l'écart passerait inaperçu.
 *
 * Le montant est renvoyé par le client, mais il vient de la PAGE SERVEUR qui
 * l'a calculé : c'est un report d'affichage, pas une saisie. Il n'ouvre aucun
 * droit et n'entre dans aucun calcul — seulement dans l'archive de la prof,
 * bornée par RLS à ses propres lignes.
 */
export const POST = withRoute({ auth: 'user', perm: 'argent_gerer' }, async ({ request, auth }) => {
  const { studioId, supabase } = auth;
  const { data, errorResponse } = await parseJsonBody(request, urssafDeclarationSchema);
  if (errorResponse) return errorResponse;
  const { periodeId, action, montant, snapshot } = data;

  const today = aujourdhuiParis();
  const periode = periodeParId(periodeId, today);
  if (!periode) return Response.json({ error: 'Période inconnue.' }, { status: 400 });

  const base = {
    profile_id: studioId,
    periode_id: periode.id,
    periode_label: periode.label,
    periode_debut: periode.from,
    periode_fin: periode.to,
    montant_dernier: montant,
    derniere_consultation_at: new Date().toISOString(),
  };

  // Ligne existante : l'archive est un ÉTAT (une par période), pas un journal.
  const { data: existante, error: eLire } = await supabase
    .from('declarations_urssaf')
    .select('id, consultations, declaree_at, montant_declare')
    .eq('profile_id', studioId)
    .eq('periode_id', periode.id)
    .maybeSingle();

  if (eLire) {
    // Table absente (v94 pas encore appliquée) : la consultation ne doit JAMAIS
    // casser la page. Un « je déclare » explicite, lui, mérite d'être dit.
    if (action === 'consultee') return Response.json({ ok: false, archive: false });
    reportError('[urssaf/declaration] archive illisible', eLire.message, { route: '/api/urssaf/declaration' });
    return Response.json({
      error: 'L\'archive des déclarations attend une mise à jour de la base. Ton montant reste juste, il n\'est simplement pas encore mémorisé.',
    }, { status: 503 });
  }

  const patch = { ...base, consultations: (existante?.consultations || 0) + 1 };

  if (action === 'declaree') {
    // Ne se pose qu'UNE fois : re-cliquer ne réécrit pas la photo d'origine,
    // sinon l'écart qu'on veut détecter s'effacerait tout seul.
    if (existante?.declaree_at) {
      return Response.json({
        ok: true, deja: true,
        declaree_at: existante.declaree_at,
        montant_declare: existante.montant_declare,
      });
    }
    patch.declaree_at = new Date().toISOString();
    patch.montant_declare = montantADeclarer(montant);
    patch.snapshot = snapshot || null;
  }

  const { data: ligne, error } = await supabase
    .from('declarations_urssaf')
    .upsert(patch, { onConflict: 'profile_id,periode_id' })
    .select('declaree_at, montant_declare, consultations')
    .single();

  if (error) {
    if (action === 'consultee') return Response.json({ ok: false, archive: false });
    reportError('[urssaf/declaration] écriture', error.message, { route: '/api/urssaf/declaration' });
    return Response.json({ error: 'Enregistrement impossible : ' + error.message }, { status: 500 });
  }

  return Response.json({ ok: true, ...ligne });
});
