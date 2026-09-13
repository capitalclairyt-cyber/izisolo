import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { hashToken } from '@/lib/lien-pointage';
import { COOKIE_PARRAINAGE, verifierInvitation } from '@/lib/parrainage';

/**
 * /parrainage/[token] — le lien reçu par une structure invitée (pont 1, v111).
 *
 * Il ne crée RIEN : il pose un cookie (httpOnly, 7 jours) qui dit « cette
 * inscription vient d'une invitation », puis envoie vers l'inscription avec
 * le type de structure pré-choisi. L'onboarding lit le cookie
 * (/api/structures/parrainage) pour afficher qui invite, et l'acceptation
 * se fait APRÈS la création de l'espace, jamais avant : un robot de
 * messagerie qui ouvre ce lien (§12) ne déclenche rien.
 *
 * Un lien invalide ou expiré envoie vers /register avec un message : la
 * structure peut s'inscrire quand même, simplement sans le rattachement.
 */
const redirection = (url, cookie = null) => new Response(null, {
  status: 303,
  headers: { Location: url, ...(cookie ? { 'Set-Cookie': cookie } : {}) },
});

export const GET = withRoute({ auth: 'public', rateLimit: { max: 60, windowSeconds: 3600, scope: 'parrainage' } }, async ({ request, params }) => {
  const origine = new URL(request.url).origin;
  const admin = createAdminClient();
  const hash = hashToken(params.token);
  let inv = null;
  if (hash) {
    const { data } = await admin.from('invitations_structure').select('*').eq('token_hash', hash).maybeSingle();
    inv = data || null;
  }
  const verdict = verifierInvitation(inv, new Date());
  if (!verdict.ok) {
    return redirection(`${origine}/register?invitation=${encodeURIComponent(verdict.code.toLowerCase())}`);
  }
  const secure = origine.startsWith('https') ? '; Secure' : '';
  return redirection(
    `${origine}/register?structure=${encodeURIComponent(inv.type_structure)}&invitee=1`,
    `${COOKIE_PARRAINAGE}=${encodeURIComponent(params.token)}; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Lax; HttpOnly${secure}`
  );
});
