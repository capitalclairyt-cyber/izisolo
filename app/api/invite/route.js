import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api-route';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendPortailMagicLink } from '@/lib/portail-magic-link';

/**
 * POST /api/invite — La prof invite un·e élève à rejoindre son portail.
 *
 * 1) Crée une FICHE prospect dans le CRM si l'email n'en a pas encore une dans
 *    ce studio → la personne invitée apparaît immédiatement dans l'admin de la
 *    prof (même avant sa 1ʳᵉ connexion / réservation). Idempotent par email :
 *    si la fiche existe déjà (mode « Élève existant·e »), on n'y touche pas, et
 *    quand l'élève réservera, `reserver` retrouvera cette même fiche → 0 doublon.
 * 2) Génère un magic link DIRECT (generateLink serveur) + l'envoie par Resend.
 *    L'élève clique → connecté·e direct sur son espace.
 */
export const POST = withRoute({ auth: 'active' }, async ({ request, auth }) => {
  const { profile } = auth;
  const body = await request.json().catch(() => ({}));
  const { email, prenom, studioSlug, studioNom, profPrenom } = body;

  const slug = studioSlug || profile.studio_slug;
  if (!slug) {
    return NextResponse.json({ error: 'Studio non configuré' }, { status: 400 });
  }

  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
  }

  // ── 1) Fiche prospect (si pas déjà cliente de ce studio) ────────────────
  // On résout l'id du studio par son slug (robuste en mode équipe), puis on
  // upsert « manuel » : on ne crée la fiche que si aucune n'existe pour cet
  // email, pour éviter d'écraser une fiche réelle ou d'en dupliquer.
  const { data: studioProfile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('studio_slug', slug)
    .single();

  // On mémorise l'id de la fiche (existante ou créée) pour tracer l'invitation
  // APRÈS un envoi réussi (invitation_envoyee_at, v67).
  let ficheClientId = null;
  if (studioProfile) {
    const { data: existing } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('profile_id', studioProfile.id)
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (existing) {
      ficheClientId = existing.id;
    } else {
      // « Camille Dupont » → prénom + nom séparés (même découpage que reserver).
      // Saisie d'un seul mot → nom reste '' (colonne NOT NULL), la prof complétera.
      const saisie = (prenom || '').trim() || cleanEmail.split('@')[0];
      const parts = saisie.split(' ');
      const { data: inserted, error: ficheErr } = await supabaseAdmin
        .from('clients')
        .insert({
          profile_id: studioProfile.id,
          prenom: parts[0],
          nom: parts.slice(1).join(' '),
          email: cleanEmail,
          statut: 'prospect',
          source: 'invitation',
        })
        .select('id')
        .maybeSingle();
      // Non bloquant : si la création de fiche échoue, on envoie quand même
      // l'invitation (l'élève sera fiché·e au plus tard à sa 1ʳᵉ réservation).
      if (ficheErr) console.error('[invite] création fiche prospect (non-bloquant):', ficheErr);
      else ficheClientId = inserted?.id || null;
    }
  }

  // ── 2) Magic link + email ───────────────────────────────────────────────
  const result = await sendPortailMagicLink({
    email: cleanEmail,
    studioSlug: slug,
    studioNom: studioNom || profile.studio_nom || 'mon studio',
    prenom,
    profPrenom: profPrenom || profile.prenom || '',
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status || 500 });
  }

  // ── 3) Trace l'invitation sur la fiche (après envoi réussi, v67) ─────────
  if (ficheClientId) {
    const { error: majErr } = await supabaseAdmin
      .from('clients')
      .update({ invitation_envoyee_at: new Date().toISOString() })
      .eq('id', ficheClientId);
    // Non bloquant : la migration v67 peut ne pas être encore appliquée.
    if (majErr) console.error('[invite] maj invitation_envoyee_at (non-bloquant):', majErr);
  }

  return NextResponse.json({ ok: true });
});
