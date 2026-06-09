import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { sendPortailMagicLink } from '@/lib/portail-magic-link';

/**
 * POST /api/invite — La prof invite un·e élève à rejoindre son portail.
 *
 * Génère un magic link DIRECT (via generateLink côté serveur) et l'envoie par
 * email avec Resend. L'élève clique → connecté·e direct sur /p/[slug]/espace.
 *
 * Avant : l'email pointait vers /p/[slug]/connexion où l'élève devait re-saisir
 * son email, ce qui déclenchait un 2ᵉ email (Supabase, wording prof "gère ton
 * studio") + une redirection vers /onboarding. Bug corrigé : un seul email,
 * lien direct, wording élève.
 */
export async function POST(req) {
  try {
    const { profile } = await requireAuth();
    const body = await req.json();
    const { email, prenom, studioSlug, studioNom, profPrenom } = body;

    const slug = studioSlug || profile.studio_slug;
    if (!slug) {
      return NextResponse.json({ error: 'Studio non configuré' }, { status: 400 });
    }

    const result = await sendPortailMagicLink({
      email,
      studioSlug: slug,
      studioNom: studioNom || profile.studio_nom || 'mon studio',
      prenom,
      profPrenom: profPrenom || profile.prenom || '',
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status || 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('Erreur envoi invitation:', err);
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
