import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /demo/[token] — accès démo PRIVÉ sans inscription (TEMPORAIRE).
 *
 * Si [token] === DEMO_SECRET (env), on ouvre une session sur le compte démo
 * (free, déjà rempli) via un magic link vérifié server-side, puis on redirige
 * vers /dashboard. Sinon → accueil (fail-closed, aucune fuite).
 *
 * ⚠️ À retirer quand la démo n'est plus utile : supprimer ce dossier,
 *    l'entrée `/demo/` du proxy, le cron reset-demo, la fonction
 *    reset_demo_data() et l'env DEMO_SECRET.
 */
export async function GET(request, { params }) {
  const { token } = await params;
  const { origin } = new URL(request.url);
  const secret = process.env.DEMO_SECRET;

  // Fail-closed : pas de secret configuré, ou token qui ne matche pas → accueil.
  if (!secret || token !== secret) {
    return NextResponse.redirect(`${origin}/`);
  }

  const email = (process.env.DEMO_EMAIL || 'bonjour@melutek.com').toLowerCase();

  // 1) Magic link (hashed_token) généré côté admin, sans email envoyé.
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  const tokenHash = linkData?.properties?.hashed_token;
  if (linkErr || !tokenHash) {
    console.error('[demo] generateLink error:', linkErr?.message);
    return NextResponse.redirect(`${origin}/login`);
  }

  // 2) Vérification server-side → pose les cookies de session sur le compte démo.
  const supabase = await createServerClient();
  const { error: otpErr } = await supabase.auth.verifyOtp({ type: 'magiclink', token_hash: tokenHash });
  if (otpErr) {
    console.error('[demo] verifyOtp error:', otpErr?.message);
    return NextResponse.redirect(`${origin}/login`);
  }

  // 3) Connecté sur le compte démo (dashboard rempli).
  return NextResponse.redirect(`${origin}/dashboard`);
}
