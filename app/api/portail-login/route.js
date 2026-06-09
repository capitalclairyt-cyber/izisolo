import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendPortailMagicLink } from '@/lib/portail-magic-link';

/**
 * POST /api/portail-login — Demande de lien de connexion ÉLÈVE (self-service).
 *
 * Appelée par la page /p/[studioSlug]/connexion quand l'élève entre son email.
 * Remplace l'ancien `supabase.auth.signInWithOtp()` côté client qui déclenchait
 * le template email + le flux signup PROF de Supabase (bug "active ton compte
 * et gère ton studio" → redirection /onboarding).
 *
 * Route PUBLIQUE (élève non connecté). Sécurité :
 *   - valide le format email
 *   - vérifie que le studioSlug existe vraiment (évite l'envoi d'emails dans le
 *     vide / le spam vers des studios inexistants)
 */
export async function POST(req) {
  try {
    const { email, studioSlug } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }
    if (!studioSlug) {
      return NextResponse.json({ error: 'Studio manquant' }, { status: 400 });
    }

    // Vérifie que le studio existe (et récupère son nom pour l'email)
    const { data: studio, error: studioErr } = await supabaseAdmin
      .from('profiles')
      .select('studio_nom, studio_slug, prenom')
      .eq('studio_slug', studioSlug)
      .single();

    if (studioErr || !studio) {
      return NextResponse.json({ error: 'Studio introuvable' }, { status: 404 });
    }

    const result = await sendPortailMagicLink({
      email,
      studioSlug,
      studioNom: studio.studio_nom,
      profPrenom: studio.prenom,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status || 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[portail-login] error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
