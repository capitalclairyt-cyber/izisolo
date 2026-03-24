import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

/**
 * Route de callback Supabase Auth
 * Gère : magic links, confirmation email, reset password, OAuth
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get('code');
  const next  = searchParams.get('next') ?? '/dashboard';
  const type  = searchParams.get('type'); // 'recovery' pour reset password

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Reset de mot de passe → rediriger vers la page de nouveau mot de passe
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/nouveau-mot-de-passe`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Erreur ou pas de code → retour login avec message
  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
