import { withRoute } from '@/lib/api-route';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * /api/eleve/compte — Compte élève (Sprint E, cf. AUDIT-REPRISE-2026-07.md §2).
 *
 * Depuis v57, un élève créé via le portail (role='eleve' en user_metadata)
 * n'a PAS de ligne `profiles` : son espace vit dans `clients`. Cette route
 * sert l'écran dédié affiché par /onboarding quand un compte élève atterrit
 * côté app prof (login prof, mot de passe oublié, visite directe) :
 *
 *   GET  → liste des portails où son email est élève (pour le rediriger
 *          vers SON espace au lieu d'un onboarding prof).
 *   POST → « devenir prof » VOLONTAIRE : passe role='prof' et crée le
 *          profil — le trigger v33 pose trial_started_at=NOW(), donc un
 *          essai 14 jours NEUF (avant v57, son trial courait depuis sa
 *          1re réservation en tant qu'élève).
 */

// Échappe les wildcards ilike (% et _) — même précaution que le portail.
function escapeIlike(s) {
  return s.replace(/[%_]/g, '\\$&');
}

export const GET = withRoute(
  { auth: 'user', rateLimit: { max: 30, scope: 'eleve-compte' } },
  async ({ auth }) => {
    const email = (auth.user.email || '').trim().toLowerCase();
    if (!email) return Response.json({ portails: [] });

    // Client admin : l'élève n'a aucun droit RLS sur `clients` (ce sont les
    // fiches des studios). On ne renvoie que le strict minimum public.
    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('profile_id, profiles(studio_slug, studio_nom, portail_actif)')
      .ilike('email', escapeIlike(email));

    if (error) {
      console.error('[eleve/compte] GET error:', error.message);
      return Response.json({ portails: [] });
    }

    const vus = new Set();
    const portails = [];
    for (const row of data || []) {
      const p = row.profiles;
      if (!p?.studio_slug || !p.portail_actif || vus.has(p.studio_slug)) continue;
      vus.add(p.studio_slug);
      portails.push({ slug: p.studio_slug, nom: p.studio_nom || p.studio_slug });
    }
    return Response.json({ portails });
  }
);

export const POST = withRoute(
  { auth: 'user', rateLimit: { max: 5, scope: 'eleve-devenir-prof' } },
  async ({ auth }) => {
    const { user, profile } = auth;

    if (user.user_metadata?.role !== 'eleve') {
      return Response.json(
        { error: "Ton compte n'est pas un compte élève", code: 'NOT_ELEVE' },
        { status: 400 }
      );
    }

    // 1. Le role passe à 'prof' (merge shallow : les autres clés restent).
    const { error: metaErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { role: 'prof' },
    });
    if (metaErr) {
      console.error('[eleve/compte] updateUserById error:', metaErr.message);
      return Response.json({ error: 'Erreur serveur', code: 'INTERNAL' }, { status: 500 });
    }

    // 2. Créer le profil prof s'il n'existe pas. L'insert déclenche le
    //    trigger v33 → trial_started_at = NOW() → essai 14 jours neuf.
    if (!profile) {
      const { error: insertErr } = await supabaseAdmin.from('profiles').insert({
        id: user.id,
        prenom: user.user_metadata?.prenom || '',
        email_contact: user.email,
      });
      // 23505 = le profil existe déjà (course) : non bloquant.
      if (insertErr && insertErr.code !== '23505') {
        console.error('[eleve/compte] insert profil error:', insertErr.message);
        return Response.json({ error: 'Erreur serveur', code: 'INTERNAL' }, { status: 500 });
      }
    }

    return Response.json({ ok: true });
  }
);
