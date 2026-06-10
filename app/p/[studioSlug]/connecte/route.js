import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

/**
 * GET /p/[studioSlug]/connecte — Callback d'auth ÉLÈVE dédié au portail.
 *
 * C'est le `redirect_to` des magic links élève (cf. lib/portail-magic-link.js).
 * Le studioSlug est dans le PATH (pas en query param), donc il ne peut PAS être
 * perdu/tronqué par Supabase — contrairement à l'ancien `?next=/p/slug/espace`
 * qui se perdait et faisait atterrir l'élève sur /onboarding (création studio).
 *
 * Gère les deux formats Supabase :
 *   - PKCE : ?code=...
 *   - OTP server-side : ?token_hash=...&type=magiclink
 *
 * Après échange réussi → redirige vers l'espace élève /p/[slug]/espace.
 * En cas d'échec → renvoie vers la page de connexion du studio.
 */
export async function GET(request, { params }) {
  const { studioSlug } = await params;
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  const espaceUrl = `${origin}/p/${studioSlug}/espace`;
  const connexionUrl = `${origin}/p/${studioSlug}/connexion`;

  // 1) PKCE (?code=...)
  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(espaceUrl);
    }
  }

  // 2) OTP server-side (?token_hash=...&type=...) — chemin NOMINAL depuis le
  // Sprint 4 : les liens élève sont construits avec hashed_token.
  if (tokenHash && type) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(espaceUrl);
    }
    // Lien expiré ou déjà utilisé → écran clair avec renvoi en un clic
    return NextResponse.redirect(`${connexionUrl}?erreur=expire`);
  }

  // 3) Format inattendu → retour à la connexion du studio
  return NextResponse.redirect(connexionUrl);
}
