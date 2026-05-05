import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

/**
 * Route de callback Supabase Auth
 *
 * Gère TROIS formats de lien Supabase :
 *
 * 1) PKCE (recommandé moderne) — `?code=...`
 *    Magic links, OAuth, reset password configurés en mode PKCE.
 *
 * 2) OTP server-side — `?token_hash=...&type=signup|recovery|email|invite|magiclink`
 *    Format moderne pour confirmation email / magic link / reset
 *    quand le template utilise `{{ .TokenHash }}` (recommandé par Supabase
 *    pour Next.js SSR). Le serveur appelle `verifyOtp` directement.
 *    → Pas de fragment URL, pas de tokens perdus.
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
  }

  // ─── 2) OTP server-side (`?token_hash=...&type=...`) ──────────────────
  if (tokenHash && type) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.verifyOtp({
      type,         // signup | recovery | email | invite | magiclink
      token_hash: tokenHash,
    });
    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/nouveau-mot-de-passe`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // ─── 3) Aucun code/token_hash en query → erreur ───────────────────────
  // Probablement un lien legacy avec fragment URL : on renvoie vers une
  // page cliente capable de lire `window.location.hash`.
  return NextResponse.redirect(`${origin}/auth/finaliser?next=${encodeURIComponent(next)}`);
}
