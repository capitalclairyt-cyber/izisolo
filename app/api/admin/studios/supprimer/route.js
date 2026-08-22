import { withRoute } from '@/lib/api-route';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { parseJsonBody, adminSupprimerStudioSchema } from '@/lib/validation';
import { reportError } from '@/lib/report';
import { confirmationValide, motifsDeRefus, resumeSuppression } from '@/lib/admin-suppression';
import { emailsOrphelins } from '@/lib/admin-orphelins';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/studios/supprimer — supprime DÉFINITIVEMENT un studio.
 *
 * Mécanique : on supprime le compte auth. `profiles.id` référence
 * `auth.users(id) ON DELETE CASCADE`, et ~40 tables référencent `profiles`
 * en cascade : tout ce que la prof possédait part avec. Rien n'est
 * récupérable, il n'y a pas de corbeille.
 *
 * Garde-fous, dans l'ordre :
 *   • admin (withRoute exige aal2 si une MFA est posée) ;
 *   • motifs de refus (son propre compte, abonnement Stripe vivant) ;
 *   • le nom EXACT du studio doit être retapé ;
 *   • l'inventaire est RECALCULÉ ici : le client ne dicte rien de ce qui
 *     compte, il ne fait que confirmer.
 */
export const POST = withRoute({ auth: 'admin' }, async ({ request, auth }) => {
  const { data, errorResponse } = await parseJsonBody(request, adminSupprimerStudioSchema);
  if (errorResponse) return errorResponse;
  const { profileId, confirmation, supprimerOrphelins } = data;

  const { data: profil, error: eProfil } = await supabaseAdmin
    .from('profiles')
    .select('id, studio_nom, studio_slug, stripe_subscription_status')
    .eq('id', profileId)
    .single();
  if (eProfil || !profil) {
    return Response.json({ error: 'Studio introuvable.' }, { status: 404 });
  }

  const refus = motifsDeRefus({ profil, adminUserId: auth?.user?.id });
  if (refus.length > 0) {
    return Response.json({ error: refus.join(' '), refus }, { status: 409 });
  }

  if (!confirmationValide(confirmation, profil.studio_nom)) {
    return Response.json({
      error: `Pour confirmer, retape le nom exact du studio : « ${profil.studio_nom || '(sans nom)'} ».`,
    }, { status: 400 });
  }

  // Inventaire recalculé serveur : c'est ce qui part au journal, et le client
  // ne peut pas maquiller le compte-rendu.
  const inventaire = {};
  for (const table of ['clients', 'cours', 'paiements', 'factures']) {
    const { count } = await supabaseAdmin
      .from(table).select('id', { count: 'exact', head: true }).eq('profile_id', profileId);
    inventaire[table] = count || 0;
  }

  // Orphelins repérés AVANT la suppression (après, les fiches n'existent plus
  // et on ne saurait plus à qui ces comptes appartenaient).
  let orphelins = [];
  if (supprimerOrphelins) {
    try {
      orphelins = await emailsOrphelins(profileId);
    } catch (e) {
      reportError('[admin/supprimer] orphelins illisibles', e?.message, { route: '/api/admin/studios/supprimer' });
      return Response.json({
        error: 'Impossible de lister les comptes élèves orphelins. Suppression annulée pour ne pas laisser de comptes fantômes.',
      }, { status: 500 });
    }
  }

  let emailProf = null;
  try {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(profileId);
    emailProf = u?.user?.email || null;
  } catch { /* déjà absent : on supprime quand même le profil ci-dessous */ }

  // ── La suppression ────────────────────────────────────────────────────────
  const { error: eDelete } = await supabaseAdmin.auth.admin.deleteUser(profileId);
  if (eDelete) {
    reportError('[admin/supprimer] deleteUser', eDelete.message, { route: '/api/admin/studios/supprimer' });
    return Response.json({ error: 'Suppression impossible : ' + eDelete.message }, { status: 500 });
  }

  // Filet : si le compte auth n'existait plus (profil orphelin), la cascade
  // n'a rien fait — on supprime la ligne profiles à la main.
  const { data: reste } = await supabaseAdmin.from('profiles').select('id').eq('id', profileId).maybeSingle();
  if (reste) await supabaseAdmin.from('profiles').delete().eq('id', profileId);

  // Vérification RÉELLE de la cascade, pas une supposition : si des fiches
  // survivent, on le dit au lieu d'annoncer un ménage complet.
  const { count: clientsRestants } = await supabaseAdmin
    .from('clients').select('id', { count: 'exact', head: true }).eq('profile_id', profileId);
  const cascadeOk = (clientsRestants || 0) === 0;

  // ── Comptes élèves orphelins ──────────────────────────────────────────────
  let orphelinsSupprimes = 0;
  const orphelinsEchoues = [];
  for (const o of orphelins) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(o.id);
    if (error) orphelinsEchoues.push(o.email);
    else orphelinsSupprimes++;
  }

  const resume = resumeSuppression({ studio: profil.studio_nom, inventaire, orphelinsSupprimes });
  // Trace : la seule mémoire qu'il restera de ce studio.
  console.warn(`[admin] SUPPRESSION par ${auth?.user?.email || 'admin'} — ${resume} (profil ${profileId}, email ${emailProf || 'inconnu'})`);
  await reportError('[admin] suppression de studio', resume, {
    route: '/api/admin/studios/supprimer',
    par: auth?.user?.email || null,
    profileId,
    emailProf,
    inventaire,
    orphelinsSupprimes,
    cascadeOk,
  });

  return Response.json({
    ok: true,
    resume,
    inventaire,
    orphelinsSupprimes,
    orphelinsEchoues,
    cascadeOk,
    avertissement: cascadeOk ? null
      : `⚠️ ${clientsRestants} fiche(s) élève survivent à la cascade : à vérifier en base.`,
  });
});
