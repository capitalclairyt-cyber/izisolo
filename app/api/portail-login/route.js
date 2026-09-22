import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api-route';
import { studioCan } from '@/lib/plan-guard';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendPortailMagicLink } from '@/lib/portail-magic-link';
import { checkRateLimitIP } from '@/lib/antibot';
import { reportError } from '@/lib/report';
import { langueDepuisRequete } from '@/lib/i18n-portail-serveur';
import { traducteur } from '@/lib/i18n-portail';

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
export const POST = withRoute({ auth: 'public' }, async ({ request: req }) => {
  // Le français tant que la requête n'est pas lue : le catch final s'en sert.
  let t = traducteur('fr');
  try {
    const { email, studioSlug } = await req.json();

    // La langue de l'élève (2026-09-22) : cookie de la visiteuse > réglage du
    // studio > français. Elle sert aux messages d'erreur ET à l'email envoyé.
    t = traducteur(await langueDepuisRequete(req, studioSlug));

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: t('Email invalide') }, { status: 400 });
    }
    if (!studioSlug) {
      return NextResponse.json({ error: t('Studio manquant') }, { status: 400 });
    }

    // Rate-limit IP : route publique qui déclenche un email signé du studio
    // (+ createUser idempotent) — borne anti-spam. 15/h et pas 5 : plusieurs
    // élèves peuvent partager l'IP du studio (wifi) avant un cours.
    const rl = await checkRateLimitIP(req, { max: 15, scope: 'portail-login' });
    if (!rl.ok) return NextResponse.json({ error: rl.reason }, { status: 429 });

    // Vérifie que le studio existe (et récupère son nom pour l'email)
    const { data: studio, error: studioErr } = await supabaseAdmin
      .from('profiles')
      .select('studio_nom, studio_slug, prenom, plan, trial_started_at, stripe_subscription_status, type_structure')
      .eq('studio_slug', studioSlug)
      .single();

    if (studioErr || !studio) {
      return NextResponse.json({ error: t('Studio introuvable') }, { status: 404 });
    }

    // Frontière des plans (2026-09-07) : pas de lien magique vers un espace
    // que le studio n'a pas (Essentiel).
    if (!studioCan(studio, 'espace_eleve')) {
      return NextResponse.json({
        error: t("{studio} n'a pas activé l'espace élève en ligne : contacte-le directement.", { studio: studio.studio_nom || t('Ce studio') }),
        code: 'PLAN_REQUIS',
      }, { status: 403 });
    }

    const result = await sendPortailMagicLink({
      email,
      studioSlug,
      studioNom: studio.studio_nom,
      profPrenom: studio.prenom,
      langue: t.langue,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status || 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    reportError('[portail-login] error:', err);
    return NextResponse.json({ error: t('Erreur serveur') }, { status: 500 });
  }
});
