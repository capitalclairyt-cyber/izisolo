import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

/**
 * Route de callback Supabase Auth
 *
 * Gère TROIS formats de lien Supabase :
 *
 * 1) PKCE (recommandé moderne) — `?code=...`
 *    Magic links, OAuth, reset password configurés en mode PKCE.
 *    Sûr face aux robots de messagerie : l'échange exige le « verifier »
 *    posé en cookie dans le navigateur qui a demandé le lien.
 *
 * 2) OTP server-side — `?token_hash=...&type=signup|recovery|email|invite|magiclink`
 *    Format moderne pour confirmation email / magic link / reset
 *    quand le template utilise `{{ .TokenHash }}` (recommandé par Supabase
 *    pour Next.js SSR). ⚠️ Depuis le 2026-09-08 le GET ne vérifie PLUS le
 *    jeton : il renvoie vers /auth/ouvrir, une page à bouton, et c'est le
 *    POST de ce bouton (ci-dessous) qui appelle `verifyOtp`. Sinon le robot
 *    de la messagerie (Outlook/Hotmail « Safe Links », antivirus) consomme
 *    le jeton avant la personne, qui trouve son lien « expiré » à chaque
 *    fois (cas Juliette côté élève, même mécanique ici).
 *
 * 3) Fallback legacy fragment — pas de code ni token_hash
 *    Le template email pointe vers la racine avec `#access_token=...` dans
 *    le fragment. Le serveur ne voit RIEN. On redirige vers une page
 *    cliente `/auth/finaliser` qui lit le fragment et établit la session.
 *
 * Pour éviter le cas (3), il faut éditer dans Supabase Dashboard les
 * templates email "Confirm signup" / "Magic Link" / "Reset password" pour
 * pointer sur :
 *   {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup&next=/onboarding
 */
/**
 * Valide qu'un paramètre `next` est une URL relative interne sûre.
 * Empêche les open redirects type `next=//evil.com` ou `next=/\evil.com`
 * qui peuvent être utilisés pour du phishing via magic link.
 */
function safeNext(raw) {
  if (!raw) return '/dashboard';
  // Doit commencer par '/' mais pas '//' ni '/\' (qui sont schema-relative)
  if (!raw.startsWith('/')) return '/dashboard';
  if (raw.startsWith('//') || raw.startsWith('/\\')) return '/dashboard';
  // Pas de caractères de contrôle ni de retours à la ligne (injection)
  if (/[\x00-\x1f\x7f]/.test(raw)) return '/dashboard';
  return raw;
}

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code       = searchParams.get('code');
  const tokenHash  = searchParams.get('token_hash');
  const type       = searchParams.get('type'); // 'signup' | 'recovery' | 'email' | 'invite' | 'magiclink'
  const next       = safeNext(searchParams.get('next'));

  // ─── 1) PKCE flow (`?code=...`) ────────────────────────────────────────
  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/nouveau-mot-de-passe`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    // Échec d'exchange PKCE avec un code présent : cas ultra-courant = lien
    // de confirmation ouvert sur un AUTRE appareil que l'inscription
    // (verifier absent). L'email EST confirmé côté GoTrue — on le dit, au
    // lieu du générique « lien invalide » comme premier contact (B1d).
    return NextResponse.redirect(`${origin}/login?error=confirmed_login_needed`);
  }

  // ─── 2) OTP server-side (`?token_hash=...&type=...`) ──────────────────
  // On ne consomme RIEN ici : page à bouton, le POST fait le travail.
  if (tokenHash && type) {
    const q = new URLSearchParams({ token_hash: tokenHash, type, next });
    return NextResponse.redirect(`${origin}/auth/ouvrir?${q.toString()}`);
  }

  // ─── 3) Aucun code/token_hash en query → erreur ───────────────────────
  // Probablement un lien legacy avec fragment URL : on renvoie vers une
  // page cliente capable de lire `window.location.hash`.
  return NextResponse.redirect(`${origin}/auth/finaliser?next=${encodeURIComponent(next)}`);
}

/**
 * POST /auth/callback — LE geste qui consomme un lien à jeton (token_hash).
 * Formulaire de /auth/ouvrir. Réussite → 303 (le navigateur repart en GET),
 * recovery → /nouveau-mot-de-passe, sinon `next`. Échec → /login avec le
 * message « lien invalide ou expiré, demande un nouveau lien ».
 */
export async function POST(request) {
  const { origin } = new URL(request.url);
  let form = null;
  try { form = await request.formData(); } catch { /* corps illisible : on retombe sur le login */ }
  const champ = (k) => { const v = form?.get(k); return typeof v === 'string' ? v : ''; };
  const tokenHash = champ('token_hash');
  const type = champ('type');
  const next = safeNext(champ('next'));

  if (tokenHash && type) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/nouveau-mot-de-passe`, 303);
      }
      return NextResponse.redirect(`${origin}${next}`, 303);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth_callback`, 303);
}
