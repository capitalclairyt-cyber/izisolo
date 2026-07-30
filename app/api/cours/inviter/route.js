import { withRoute } from '@/lib/api-route';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { coursInviterSchema } from '@/lib/validation';
import { buildPortailMagicLink } from '@/lib/portail-magic-link';
import { sendEmail } from '@/lib/email';
import { reportError } from '@/lib/report';

/**
 * POST /api/cours/inviter — « Prévenir par email » d'un cours privé (v73).
 *
 * Pour chaque élève DÉJÀ ajouté·e au cours (présence-réservation) et ayant un
 * email : envoie date/heure/lieu + un magic link direct vers son espace.
 * Dédupé par (invitation_cours, email, coursId) via emails_envoyes (v52) :
 * re-cliquer ne prévient que les personnes ajoutées depuis — jamais deux fois
 * le même email. Marche que l'élève ait déjà un compte ou non (magic link
 * passwordless, createUser idempotent role='eleve').
 */
export const POST = withRoute({ auth: 'active', schema: coursInviterSchema }, async ({ auth, body }) => {
  const { profile } = auth;
  const { coursId } = body;

  const { data: cours, error: coursErr } = await supabaseAdmin
    .from('cours')
    .select('id, nom, date, heure, lieu, duree_minutes, visibilite')
    .eq('id', coursId)
    .eq('profile_id', profile.id)
    .single();
  if (coursErr || !cours) {
    return Response.json({ error: 'Cours introuvable' }, { status: 404 });
  }

  const { data: presences, error: presErr } = await supabaseAdmin
    .from('presences')
    .select('id, clients(id, prenom, email)')
    .eq('cours_id', cours.id)
    .eq('profile_id', profile.id);
  if (presErr) {
    reportError('[cours/inviter] presences:', presErr);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }

  const slug = profile.studio_slug;
  const studio = profile.studio_nom || 'ton studio';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.izisolo.fr';

  const dateFR = cours.date
    ? new Date(`${cours.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';
  const heureFR = cours.heure ? cours.heure.slice(0, 5).replace(':', 'h') : '';

  let envoyes = 0;
  let dejaPrevenus = 0;
  let sansEmail = 0;

  for (const p of presences || []) {
    const email = (p.clients?.email || '').trim().toLowerCase();
    if (!email) { sansEmail++; continue; }

    // Dédup (v52) : une seule invitation par (email, cours). Conflit = déjà
    // prévenu·e. Autre erreur → on log et on envoie quand même (fail-open).
    const { error: dedupErr } = await supabaseAdmin
      .from('emails_envoyes')
      .insert({ type: 'invitation_cours', destinataire: email, ref: cours.id });
    if (dedupErr) {
      if (dedupErr.code === '23505') { dejaPrevenus++; continue; }
      reportError('[cours/inviter] dédup (non-bloquant):', dedupErr.message);
    }

    const magicLink = slug ? await buildPortailMagicLink({ email, studioSlug: slug }) : null;
    const lien = magicLink || (slug ? `${appUrl}/p/${slug}/connexion` : appUrl);
    // « Bonjour » plutôt que « Salut »/« Coucou » (retour Maude 2026-07-30).
    const salutation = p.clients?.prenom ? `Bonjour ${p.clients.prenom}` : 'Bonjour';

    try {
      // Transactionnel : concerne une séance réservée pour l'élève et porte
      // un lien de connexion — même statut que les magic links du portail.
      await sendEmail({
        categorie: 'transactionnel',
        to: email,
        subject: `Ta séance « ${cours.nom} »${dateFR ? ` — ${dateFR}` : ''} · ${studio}`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;">
            <h2 style="color:#b87333;margin:0 0 6px;">Une séance t'attend 🌿</h2>
            <p style="color:#555;margin:0 0 12px;">${salutation},</p>
            <p style="color:#555;margin:0 0 16px;">
              ${profile.prenom ? `<strong>${profile.prenom}</strong> t'a` : 'Ta prof t\'a'} réservé une place pour
              <strong>« ${cours.nom} »</strong>.
            </p>
            <div style="background:#faf6ef;border:1px solid #eee2cf;border-radius:12px;padding:14px 18px;margin:0 0 20px;color:#555;">
              ${dateFR ? `📅 ${dateFR.charAt(0).toUpperCase() + dateFR.slice(1)}<br/>` : ''}
              ${heureFR ? `🕐 ${heureFR}${cours.duree_minutes ? ` (${cours.duree_minutes} min)` : ''}<br/>` : ''}
              ${cours.lieu ? `📍 ${cours.lieu}` : ''}
            </div>
            <div style="text-align:center;margin:24px 0;">
              <a href="${lien}" style="display:inline-block;padding:14px 28px;background:#b87333;color:white;text-decoration:none;border-radius:99px;font-weight:700;font-size:1rem;">
                Voir dans mon espace
              </a>
            </div>
            <p style="color:#999;margin:16px 0 0;font-size:0.8125rem;">
              Cette séance est privée : elle n'apparaît que dans ton espace. Le lien te connecte sans mot de passe et expire dans 1 heure — après, connecte-toi simplement avec ton email sur le portail.
            </p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
            <p style="color:#bbb;font-size:0.6875rem;text-align:center;">
              Envoyé via <a href="https://www.izisolo.fr" style="color:#b87333;">IziSolo</a> de la part de ${studio}
            </p>
          </div>
        `,
      });
      envoyes++;
    } catch (e) {
      reportError('[cours/inviter] envoi email:', e?.message, email);
      // L'envoi a raté : on libère la ligne de dédup pour permettre un retry.
      await supabaseAdmin
        .from('emails_envoyes')
        .delete()
        .match({ type: 'invitation_cours', destinataire: email, ref: cours.id });
    }
  }

  return Response.json({ ok: true, envoyes, dejaPrevenus, sansEmail });
});
