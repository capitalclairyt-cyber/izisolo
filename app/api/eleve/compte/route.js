import { withRoute } from '@/lib/api-route';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { reportError } from '@/lib/report';

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
    // v90 : lookup indexé lower(email) via RPC (le .ilike global seq-scannait
    // toute la table — AUDIT-PERF 2.6), chemin historique en fallback.
    let data = null;
    const { data: viaRpc, error: rpcErr } = await supabaseAdmin
      .rpc('fiches_par_email', { p_email: email });
    if (!rpcErr && viaRpc) {
      const ids = [...new Set(viaRpc.map(f => f.profile_id))];
      const { data: profs } = ids.length > 0
        ? await supabaseAdmin.from('profiles').select('id, studio_slug, studio_nom, portail_actif').in('id', ids)
        : { data: [] };
      const profById = new Map((profs || []).map(p => [p.id, p]));
      data = viaRpc.map(f => ({ profile_id: f.profile_id, profiles: profById.get(f.profile_id) || null }));
    } else {
      const { data: viaIlike, error } = await supabaseAdmin
        .from('clients')
        .select('profile_id, profiles(studio_slug, studio_nom, portail_actif)')
        .ilike('email', escapeIlike(email));
      if (error) {
        reportError('[eleve/compte] GET error:', error.message);
        return Response.json({ portails: [] });
      }
      data = viaIlike;
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
  async ({ request, auth }) => {
    const { user, profile } = auth;

    if (user.user_metadata?.role !== 'eleve') {
      return Response.json(
        { error: "Ton compte n'est pas un compte élève", code: 'NOT_ELEVE' },
        { status: 400 }
      );
    }

    // Durcissement (fausse manip réelle du 26/07 : un élève cherchant son
    // espace a créé un studio fantôme au nom de sa prof). Le flip est
    // engageant et sans retour dans l'app → consentement EXPLICITE exigé
    // aussi côté serveur (l'UI n'envoie confirme:true qu'après une case
    // cochée). Un POST nu ne peut plus créer de studio.
    let body = {};
    try { body = await request.json(); } catch { /* body absent = pas de consentement */ }
    if (body?.confirme !== true) {
      return Response.json(
        { error: 'Confirmation explicite requise', code: 'CONFIRMATION_REQUISE' },
        { status: 400 }
      );
    }

    // 1. Créer le profil prof s'il n'existe pas — AVANT de flipper le role
    //    (B1d : dans l'ordre inverse, un échec d'insert laissait un compte
    //    prof SANS profil → onboarding « réussi » factice → boucle infinie
    //    dashboard↔wizard). L'insert déclenche le trigger v33 →
    //    trial_started_at = NOW() → essai 14 jours neuf.
    if (!profile) {
      const { error: insertErr } = await supabaseAdmin.from('profiles').insert({
        id: user.id,
        prenom: user.user_metadata?.prenom || '',
        email_contact: user.email,
      });
      // 23505 = le profil existe déjà (course) : non bloquant.
      if (insertErr && insertErr.code !== '23505') {
        reportError('[eleve/compte] insert profil error:', insertErr.message);
        return Response.json({ error: 'Erreur serveur', code: 'INTERNAL' }, { status: 500 });
      }
    }

    // 2. Le role passe à 'prof' (merge shallow : les autres clés restent).
    //    En cas d'échec ici, le compte reste élève avec un profil déjà créé :
    //    un nouveau clic sur « Ouvrir mon studio » ne refait que ce flip.
    //    `ex_eleve` = traçabilité admin (studios nés d'un compte élève).
    const { error: metaErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { role: 'prof', ex_eleve: true },
    });
    if (metaErr) {
      reportError('[eleve/compte] updateUserById error:', metaErr.message);
      return Response.json({ error: 'Erreur serveur', code: 'INTERNAL' }, { status: 500 });
    }

    return Response.json({ ok: true });
  }
);
