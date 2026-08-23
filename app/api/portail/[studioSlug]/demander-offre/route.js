import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { createServerClient } from '@/lib/supabase-server';
import { checkAntiBot, ipFromRequest } from '@/lib/antibot';
import { resoudreFicheEleve } from '@/lib/fiche-eleve';
import { sendPushToUser } from '@/lib/push-server';
import { wantsNotif } from '@/lib/notif-prefs';
import { sendEmail } from '@/lib/email';
import { reportError } from '@/lib/report';
import { formatMontant } from '@/lib/utils';
import { sanitizeDemandeOffre, nomDemandeur, confirmationEleve } from '@/lib/demande-offre';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/portail/[studioSlug]/demander-offre — « je veux cette offre » (v97).
 *
 * Une DEMANDE, pas une vente : aucun abonnement, aucun paiement, aucune place
 * réservée. La prof valide et encaisse ensuite par le tunnel de vente, où elle
 * choisit son mode de règlement. C'est ce qui rend la boucle possible sans
 * Stripe, donc sur le plan Essentiel et pour toutes celles qui encaissent en
 * espèces ou en chèque au cours suivant.
 *
 * Deux portes : élève connectée (fiche résolue par lib/fiche-eleve, FK d'abord)
 * ou prospecte sur la grille publique (prénom + email). Antibot dans les deux
 * cas — c'est une route publique.
 */
export const POST = withRoute({ auth: 'public' }, async ({ request, params }) => {
  const { studioSlug } = params;
  const brut = await request.json().catch(() => null);
  if (!brut) return Response.json({ error: 'Requête invalide' }, { status: 400 });

  const antibot = await checkAntiBot(request, {
    honeypot: brut.verif_hp,
    max: 10,
    windowSeconds: 3600,
    scope: 'demande-offre',
  });
  if (!antibot.ok) {
    console.warn('[demander-offre] antibot:', antibot.code, 'ip=', ipFromRequest(request));
    return Response.json({ error: antibot.reason }, { status: antibot.code === 'RATE_LIMITED' ? 429 : 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id, studio_nom, studio_slug, prenom, email_contact, notif_prefs')
    .eq('studio_slug', studioSlug)
    .maybeSingle();
  if (!profile) return Response.json({ error: 'Studio introuvable' }, { status: 404 });

  // Élève connectée : sa fiche fait foi, jamais l'identité déclarée dans le
  // corps de la requête (sinon n'importe qui demande au nom de n'importe qui).
  let clientId = null;
  let ficheNom = null;
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const fiche = await resoudreFicheEleve(admin, profile.id, user, 'id, prenom, nom, email');
      if (fiche) { clientId = fiche.id; ficheNom = `${fiche.prenom || ''} ${fiche.nom || ''}`.trim(); }
    }
  } catch (e) {
    reportError('[demander-offre] resolution fiche:', e?.message, { studioSlug });
  }

  const { ok, erreur, valeurs } = sanitizeDemandeOffre({ ...brut, clientId });
  if (!ok) return Response.json({ error: erreur }, { status: 400 });

  // L'offre doit exister, être active, et appartenir à CE studio : sans ça,
  // l'id d'une offre d'un autre studio suffirait à polluer une file.
  const { data: offre } = await admin
    .from('offres')
    .select('id, nom, prix, type')
    .eq('id', valeurs.offre_id)
    .eq('profile_id', profile.id)
    .eq('actif', true)
    .maybeSingle();
  if (!offre) return Response.json({ error: 'Cette offre n\'est plus disponible.' }, { status: 404 });

  const { data: demande, error } = await admin
    .from('demandes_offre')
    .insert({ profile_id: profile.id, ...valeurs })
    .select('id')
    .single();

  if (error) {
    // 23505 : une demande en attente existe déjà pour cette offre et cette
    // personne (index partiels v97). Ce n'est pas une erreur pour elle : sa
    // demande EST enregistrée, on le lui dit calmement.
    if (error.code === '23505') {
      return Response.json({
        ok: true, deja: true,
        message: 'Ta demande est déjà enregistrée, ta prof revient vers toi.',
      });
    }
    // Table absente (pré-v97). On ne fait pas semblant d'avoir enregistré : on
    // renvoie l'élève vers le canal qui, lui, marche.
    // ⚠️ Deux codes, comme pour les colonnes (leçon v95) : 42P01 vient de
    // Postgres, PGRST205 du cache de schéma PostgREST — c'est celui-là qu'on
    // reçoit en pratique, et la preuve l'a rattrapé.
    if (['42P01', 'PGRST205'].includes(error.code) || /demandes_offre/.test(error.message || '')) {
      return Response.json({
        error: 'Les demandes en ligne arrivent très bientôt. En attendant, parles-en directement à ton studio.',
        code: 'MIGRATION_MANQUANTE',
      }, { status: 503 });
    }
    reportError('[demander-offre] insert:', error, { route: '/api/portail/[studioSlug]/demander-offre' });
    return Response.json({ error: 'Demande impossible pour le moment.' }, { status: 500 });
  }

  const qui = ficheNom || nomDemandeur(valeurs);
  const titre = `🛒 Demande d'offre — ${qui}`;
  const corps = `${offre.nom}${offre.prix != null ? ` · ${formatMontant(offre.prix)}` : ''}`;

  if (wantsNotif(profile.notif_prefs, 'offre_demande', 'prof', 'inapp')) {
    await admin.from('notifications').upsert({
      profile_id: profile.id,
      type: 'offre_demande',
      titre,
      corps,
      data: { demande_id: demande.id, offre_id: offre.id },
      ref_key: `offre_demande_${demande.id}`,
      expires_at: null,
    }, { onConflict: 'profile_id,ref_key', ignoreDuplicates: true });
  }

  sendPushToUser(profile.id, {
    title: 'Demande d\'offre 🛒',
    body: `${qui} — ${corps}`,
    url: '/offres',
    tag: `offre-demande-${demande.id}`,
  }, { type: 'offre_demande' }).catch(() => {});

  if (wantsNotif(profile.notif_prefs, 'offre_demande', 'prof', 'email') && profile.email_contact) {
    await sendEmail({
      to: profile.email_contact,
      subject: titre,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <h2 style="color:#b87333;margin:0 0 6px;">Une élève veut une de tes offres</h2>
          <p style="color:#555;margin:0 0 14px;"><strong>${qui}</strong> demande : <strong>${offre.nom}</strong>${offre.prix != null ? ` (${formatMontant(offre.prix)})` : ''}.</p>
          ${valeurs.message ? `<p style="color:#555;margin:0 0 14px;">« ${valeurs.message} »</p>` : ''}
          <p style="color:#555;margin:0 0 14px;">
            Rien n'est encaissé : tu valides et tu choisis le règlement (payé maintenant, à régler plus tard, en plusieurs fois) depuis ta page Offres.
          </p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.izisolo.fr'}/offres" style="display:inline-block;padding:14px 28px;background:#b87333;color:white;text-decoration:none;border-radius:99px;font-weight:700;">
              Voir la demande
            </a>
          </div>
        </div>
      `,
      replyTo: valeurs.email || null,
      categorie: 'notification',
    });
  }

  return Response.json({
    ok: true,
    id: demande.id,
    message: confirmationEleve({ offreNom: offre.nom, studioNom: profile.studio_nom }),
  });
});
