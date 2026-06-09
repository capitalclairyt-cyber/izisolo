import { supabaseAdmin } from '@/lib/supabase-admin';
import { Resend } from 'resend';

/**
 * Génère un magic link de connexion ÉLÈVE et l'envoie par email (Resend).
 *
 * Pourquoi cette fonction existe :
 * Les élèves et les profs partagent le même système d'auth Supabase. Si on
 * laisse un élève passer par `supabase.auth.signInWithOtp()` côté client, c'est
 * le template email + le flux de SIGNUP PROF de Supabase qui se déclenche
 * ("active ton compte et gère ton studio" → redirection vers /onboarding).
 *
 * Ici, on génère le lien côté serveur (service_role) et on l'envoie via Resend
 * avec un wording 100 % élève et un redirect maîtrisé vers le portail. Aucun
 * email Supabase n'est envoyé à l'élève.
 *
 * ⚠️ Le `redirectTo` (/auth/callback?next=...) doit être autorisé dans
 * Supabase → Auth → URL Configuration → Redirect URLs (wildcard
 * `https://www.izisolo.fr/**` recommandé), sinon Supabase retombe sur le
 * Site URL et le `next` est perdu.
 *
 * @param {Object} p
 * @param {string} p.email      Email de l'élève (sera l'identifiant)
 * @param {string} p.studioSlug Slug du studio cible
 * @param {string} [p.studioNom] Nom affiché du studio
 * @param {string} [p.prenom]   Prénom de l'élève (pour la salutation)
 * @param {string} [p.profPrenom] Prénom de la prof (signature)
 * @returns {Promise<{ ok: true } | { error: string, status: number }>}
 */
export async function sendPortailMagicLink({ email, studioSlug, studioNom, prenom, profPrenom }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { error: 'Email invalide', status: 400 };
  }
  if (!studioSlug) {
    return { error: 'Studio manquant', status: 400 };
  }
  if (!process.env.RESEND_API_KEY) {
    return { error: 'Envoi email non configuré', status: 500 };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.izisolo.fr';
  const redirectTo = `${appUrl}/auth/callback?next=/p/${studioSlug}/espace`;

  // 1) Créer l'utilisateur s'il n'existe pas encore (idempotent).
  //    email_confirm: true → pas d'email de confirmation Supabase, l'élève
  //    est considéré confirmé d'emblée (le magic link fait foi).
  //    Si l'user existe déjà, createUser échoue → on ignore et on continue.
  try {
    await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      email_confirm: true,
    });
  } catch {
    // user déjà existant : normal, on continue vers generateLink
  }

  // 2) Générer le magic link (action_link prêt à cliquer).
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: cleanEmail,
    options: { redirectTo },
  });

  const magicLink = linkData?.properties?.action_link;
  if (linkErr || !magicLink) {
    console.error('[portail-magic-link] generateLink error:', linkErr);
    return { error: 'Erreur lors de la génération du lien', status: 500 };
  }

  // 3) Envoyer l'email Resend (wording élève, lien direct).
  const studio = studioNom || 'ton espace';
  const salutation = prenom ? `Salut ${prenom}` : 'Coucou';
  const prof = profPrenom || '';

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'IziSolo <bonjour@izisolo.fr>',
    to: cleanEmail,
    subject: `Ton lien de connexion — ${studio}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <h2 style="color:#b87333;margin:0 0 6px;">Ton espace élève t'attend !</h2>
        <p style="color:#555;margin:0 0 16px;">${salutation},</p>
        <p style="color:#555;margin:0 0 12px;">
          Voici ton accès direct à l'espace élève de <strong>${studio}</strong>.
        </p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${magicLink}" style="display:inline-block;padding:14px 28px;background:#b87333;color:white;text-decoration:none;border-radius:99px;font-weight:700;font-size:1rem;">
            Accéder à mon espace
          </a>
        </div>
        <p style="color:#555;margin:0 0 12px;font-size:0.875rem;">
          Tu pourras voir tes cours réservés, t'inscrire à de nouveaux créneaux et garder un œil sur ton carnet de séances.
        </p>
        <p style="color:#999;margin:16px 0 0;font-size:0.8125rem;">
          Ce lien te connecte automatiquement, sans mot de passe. Il expire dans 1 heure. Si tu n'as rien demandé, ignore simplement cet email.
        </p>
        <p style="color:#555;margin:16px 0 0;">
          À très vite${prof ? ' — ' + prof : ''} 🌿
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="color:#bbb;font-size:0.6875rem;text-align:center;">
          Envoyé via <a href="https://www.izisolo.fr" style="color:#b87333;">IziSolo</a> de la part de ${studio}
        </p>
      </div>
    `,
  });

  return { ok: true };
}
