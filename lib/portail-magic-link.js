import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/email';
import { traducteur } from '@/lib/i18n-portail';

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
 * Sprint 4 audit : le lien est CONSTRUIT par nous avec `hashed_token` et
 * pointe directement sur /p/[slug]/connecte (verifyOtp server-side).
 * Il ne passe plus par supabase.co/verify → plus de fragment #access_token,
 * plus aucune dépendance à l'allowlist Redirect URLs ni au Site URL.
 *
 * @param {Object} p
 * @param {string} p.email      Email de l'élève (sera l'identifiant)
 * @param {string} p.studioSlug Slug du studio cible
 * @param {string} [p.studioNom] Nom affiché du studio
 * @param {string} [p.prenom]   Prénom de l'élève (pour la salutation)
 * @param {string} [p.profPrenom] Prénom de la prof (signature)
 * @param {string} [p.langue]   'fr' (défaut) ou 'en' : la langue de l'email
 *                              (2026-09-22, cookie de la visiteuse > réglage du studio)
 * @returns {Promise<{ ok: true } | { error: string, status: number }>}
 */
/**
 * Construit (sans l'envoyer) un magic link de connexion élève vers son espace.
 * createUser idempotent (role='eleve') + generateLink → URL /connecte?token_hash.
 * Utilisé pour glisser un bouton « Accéder à mon espace » dans un email métier
 * déjà envoyé par ailleurs (ex : confirmation de cours d'essai).
 *
 * `langue` est acceptée pour que les deux fonctions aient la même signature ;
 * l'URL ne porte aucun texte, la page /connecte lit elle-même la langue de la
 * visiteuse au clic. Les appelants qui ne la passent pas restent en français.
 *
 * @returns {Promise<string|null>} l'URL, ou null si non générable (non bloquant).
 */
export async function buildPortailMagicLink({ email, studioSlug, langue: _langue = 'fr' }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@') || !studioSlug) return null;
  if (!process.env.RESEND_API_KEY && !process.env.NEXT_PUBLIC_APP_URL) {
    // pas d'appUrl fiable, mais on continue avec le défaut
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.izisolo.fr';
  try {
    await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      email_confirm: true,
      user_metadata: { role: 'eleve' },
    });
  } catch { /* user déjà existant : normal */ }
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: cleanEmail,
  });
  const hashedToken = data?.properties?.hashed_token;
  if (error || !hashedToken) {
    console.error('[buildPortailMagicLink] generateLink error:', error);
    return null;
  }
  return `${appUrl}/p/${studioSlug}/connecte?token_hash=${encodeURIComponent(hashedToken)}&type=magiclink`;
}

export async function sendPortailMagicLink({ email, studioSlug, studioNom, prenom, profPrenom, langue = 'fr' }) {
  // La langue de l'élève (2026-09-22) : l'email part dans la langue de l'écran
  // qui l'a demandé. Sans `langue`, le français, comme avant.
  const t = traducteur(langue);
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { error: t('Email invalide'), status: 400 };
  }
  if (!studioSlug) {
    return { error: t('Studio manquant'), status: 400 };
  }
  if (!process.env.RESEND_API_KEY) {
    return { error: t('Envoi email non configuré'), status: 500 };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.izisolo.fr';

  // 1) Créer l'utilisateur s'il n'existe pas encore (idempotent).
  //    email_confirm: true → pas d'email de confirmation Supabase, l'élève
  //    est considéré confirmé d'emblée (le magic link fait foi).
  //    role: 'eleve' → handle_new_user (v57) ne crée PAS de profil prof
  //    (sinon l'élève devenait une "prof en trial 30 j" en DB).
  //    Si l'user existe déjà, createUser échoue → on ignore et on continue
  //    (un compte prof existant garde son role d'origine).
  try {
    await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      email_confirm: true,
      user_metadata: { role: 'eleve' },
    });
  } catch {
    // user déjà existant : normal, on continue vers generateLink
  }

  // 2) Générer le lien — on construit NOUS-MÊMES l'URL avec hashed_token.
  // L'ancien action_link passait par supabase.co/verify qui renvoie les
  // tokens en FRAGMENT #access_token (flux implicite) : le callback serveur
  // ne les voyait jamais et tout reposait sur un rattrapage client fragile
  // (5 sauts). Ici : clic → /p/[slug]/connecte?token_hash=… → verifyOtp
  // server-side → espace. 2 sauts, cross-device OK.
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: cleanEmail,
  });

  const hashedToken = linkData?.properties?.hashed_token;
  if (linkErr || !hashedToken) {
    console.error('[portail-magic-link] generateLink error:', linkErr);
    return { error: t('Erreur lors de la génération du lien'), status: 500 };
  }
  const magicLink = `${appUrl}/p/${studioSlug}/connecte?token_hash=${encodeURIComponent(hashedToken)}&type=magiclink`;

  // 3) Envoyer l'email Resend (wording élève, lien direct).
  const studio = studioNom || t('ton espace');
  // « Bonjour » plutôt que « Salut »/« Coucou » (retour Maude 2026-07-30).
  const salutation = prenom ? t('Bonjour {prenom}', { prenom }) : t('Bonjour');
  const prof = profPrenom || '';
  const lienIziSolo = '<a href="https://www.izisolo.fr" style="color:#b87333;">IziSolo</a>';

  // Transactionnel : lien d'auth demandé par l'élève → jamais bloqué par la blacklist
  await sendEmail({
    categorie: 'transactionnel',
    to: cleanEmail,
    subject: t('Ton lien de connexion · {studio}', { studio }),
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <h2 style="color:#b87333;margin:0 0 6px;">${t("Ton espace élève t'attend !")}</h2>
        <p style="color:#555;margin:0 0 16px;">${salutation},</p>
        <p style="color:#555;margin:0 0 12px;">
          ${t("Voici ton accès direct à l'espace élève de {studio}.", { studio: `<strong>${studio}</strong>` })}
        </p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${magicLink}" style="display:inline-block;padding:14px 28px;background:#b87333;color:white;text-decoration:none;border-radius:99px;font-weight:700;font-size:1rem;">
            ${t('Accéder à mon espace')}
          </a>
        </div>
        <p style="color:#555;margin:0 0 12px;font-size:0.875rem;">
          ${t("Tu pourras voir tes cours réservés, t'inscrire à de nouveaux créneaux et garder un œil sur ton carnet de séances.")}
        </p>
        <p style="color:#999;margin:16px 0 0;font-size:0.8125rem;">
          ${t("Ce lien te connecte automatiquement, sans mot de passe. Il expire dans 1 heure. Si tu n'as rien demandé, ignore simplement cet email.")}
        </p>
        <p style="color:#555;margin:16px 0 0;">
          ${prof ? t('À très vite, {prof}', { prof }) : t('À très vite')} 🌿
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
        <p style="color:#bbb;font-size:0.6875rem;text-align:center;">
          ${t('Envoyé via {izisolo} de la part de {studio}', { izisolo: lienIziSolo, studio })}
        </p>
      </div>
    `,
  });

  return { ok: true };
}
