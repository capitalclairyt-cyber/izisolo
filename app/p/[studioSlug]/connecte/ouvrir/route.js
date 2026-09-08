import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

/**
 * POST /p/[studioSlug]/connecte/ouvrir — LE geste qui consomme le lien élève.
 *
 * Appelée par le formulaire de /p/[slug]/connecte (bouton « Ouvrir mon
 * espace »). Le jeton n'est vérifié qu'ici, jamais au GET : un robot de
 * messagerie qui pré-ouvre le lien ne peut pas l'user (2026-09-08).
 *
 * Deux formats acceptés, comme l'ancienne route :
 *   - OTP server-side : token_hash + type (le chemin nominal, lib/portail-magic-link)
 *   - PKCE : code
 * Réussite → 303 vers l'espace (le navigateur repart en GET, jamais de
 * re-POST au rafraîchissement). Échec → la page de connexion avec le
 * renvoi en un clic (?erreur=expire).
 */
export async function POST(request, { params }) {
  const { studioSlug } = await params;
  const { origin } = new URL(request.url);
  const espaceUrl = `${origin}/p/${studioSlug}/espace`;
  const connexionUrl = `${origin}/p/${studioSlug}/connexion`;

  let form = null;
  try { form = await request.formData(); } catch { /* corps illisible : on retombe sur la connexion */ }
  const champ = (k) => { const v = form?.get(k); return typeof v === 'string' ? v : ''; };
  const tokenHash = champ('token_hash');
  const type = champ('type');
  const code = champ('code');

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(espaceUrl, 303);
  }

  if (tokenHash && type) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(espaceUrl, 303);
    return NextResponse.redirect(`${connexionUrl}?erreur=expire`, 303);
  }

  return NextResponse.redirect(connexionUrl, 303);
}

// Un GET ici (lien tapé, robot, retour arrière) ne doit rien consommer ni
// planter : retour à la connexion du studio.
export async function GET(request, { params }) {
  const { studioSlug } = await params;
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/p/${studioSlug}/connexion`);
}
