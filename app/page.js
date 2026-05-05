import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import Landing from '@/components/landing/Landing';
import './landing.css';

/**
 * Home publique IziSolo (landing).
 *
 * Gère trois cas spéciaux d'arrivée AUTH AVANT d'afficher la landing,
 * pour récupérer les inscrits qui atterrissent ici via les liens de
 * confirmation email Supabase (templates par défaut qui pointent sur
 * SiteURL = `https://izisolo.fr/` au lieu de `/auth/callback`).
 *
 *   1) Visiteur déjà authentifié (cookie session valide) → /dashboard
 *
 *   2) ?code=XXX (PKCE flow Supabase) → forward vers /auth/callback?code=...
 *      qui sait échanger le code contre une session.
 *
 *   3) ?token_hash=XXX&type=signup (OTP server-side) → idem, /auth/callback
 *      qui sait appeler verifyOtp.
 *
 *   4) #access_token=...&refresh_token=... (OTP fragment legacy) → on ne
 *      peut pas le détecter côté serveur (le fragment n'est pas envoyé).
 *      Géré par AuthFragmentCatcher inline dans <head> de app/layout.js
 *      qui forward vers /auth/finaliser.
 *
 * Une fois ces cas évacués, on rend la landing publique normale.
 */
export default async function Home({ searchParams }) {
  // searchParams est async en Next.js 16 dans les Server Components
  const params = (await searchParams) || {};

  const code = params.code;
  const tokenHash = params.token_hash;
  const type = params.type;

  // Cas 2 & 3 : redirection AVANT auth check, pour ne pas perdre les params
  if (code) {
    const next = typeof params.next === 'string' && params.next.startsWith('/') && !params.next.startsWith('//')
      ? params.next
      : '/onboarding';
    redirect(`/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}${type ? `&type=${encodeURIComponent(type)}` : ''}`);
  }
  if (tokenHash) {
    const next = typeof params.next === 'string' && params.next.startsWith('/') && !params.next.startsWith('//')
      ? params.next
      : '/onboarding';
    redirect(`/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type || 'signup')}&next=${encodeURIComponent(next)}`);
  }

  // Cas 1 : déjà connecté → dashboard
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    redirect('/dashboard');
  }

  return <Landing />;
}
