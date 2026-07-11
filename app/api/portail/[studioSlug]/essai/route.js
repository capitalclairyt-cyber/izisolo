import { createAdminClient } from '@/lib/supabase-admin';
import { finaliserDemande, emailConfirmationVisiteur, emailEnAttenteVisiteur, emailNotifPro } from '@/lib/essai';
import { buildPortailMagicLink } from '@/lib/portail-magic-link';
import { sendPushToUser } from '@/lib/push-server';
import { wantsNotif } from '@/lib/notif-prefs';
import { checkAntiBot, ipFromRequest } from '@/lib/antibot';
import { essaiSchema } from '@/lib/validation';
import { studioHasFeature } from '@/lib/plan-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/portail/[studioSlug]/essai
 *
 * Body :
 *   {
 *     coursId,              // uuid du cours choisi
 *     prenom,                // requis
 *     nom,                   // optionnel
 *     email,                 // requis
 *     telephone,             // optionnel
 *     message,               // optionnel — "comment vous nous avez connu", motivation
 *   }
 *
 * Workflow :
 *   1. Vérifier que le studio a essai_actif=true
 *   2. Vérifier que le cours existe, n'est pas annulé, n'est pas passé
 *   3. Insérer dans cours_essai_demandes
 *   4. Selon le mode :
 *      - auto : finaliser immédiatement (client + presence créés)
 *      - semi : finaliser + email pro
 *      - manuel : laisser en 'en_attente', email d'attente au visiteur, email pro
 *   5. Si paiement Stripe : retourner le payment_link
 *
 * Réponse :
 *   { ok: true, status: 'finalisee'|'en_attente', stripePaymentLink?: string }
 */
export async function POST(request, { params }) {
  const { studioSlug } = await params;

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'JSON invalide' }, { status: 400 }); }

  const { coursId, prenom, nom, email, telephone, message, website, turnstileToken } = body;
  if (!coursId || !prenom || !email) {
    return Response.json({ error: 'coursId, prenom et email sont requis' }, { status: 400 });
  }
  // Validation zod : coursId UUID + prenom/email (passthrough conserve les
  // autres champs). On ne renvoie pas le détail brut zod.
  if (!essaiSchema.safeParse(body).success) {
    return Response.json({ error: 'Données invalides' }, { status: 400 });
  }

  // ── Anti-bot : honeypot + rate limit + Turnstile ──
  const antibotCheck = await checkAntiBot(request, { honeypot: website, turnstileToken });
  if (!antibotCheck.ok) {
    console.warn('[essai] antibot rejected:', antibotCheck.code, 'ip=', ipFromRequest(request));
    return Response.json({ error: antibotCheck.reason }, { status: antibotCheck.code === 'RATE_LIMITED' ? 429 : 400 });
  }

  const supabaseAdmin = createAdminClient();

  const emailLower = email.trim().toLowerCase();

  // 1. Profil + config essai
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, prenom, studio_nom, email_contact, adresse, code_postal, ville, telephone, essai_actif, essai_mode, essai_paiement, essai_prix, essai_stripe_payment_link, essai_message, plan, trial_started_at, stripe_subscription_status, notif_prefs')
    .eq('studio_slug', studioSlug)
    .single();

  if (!profile) return Response.json({ error: 'Studio introuvable' }, { status: 404 });
  if (!profile.essai_actif) return Response.json({ error: 'Les cours d\'essai ne sont pas activés sur ce studio' }, { status: 403 });

  // Gate plan (Sprint 3) : le cours d'essai est une feature Pro du STUDIO
  // (essai_actif peut rester true après un downgrade — le plan prime).
  if (!studioHasFeature(profile, 'coursEssai')) {
    return Response.json({ error: 'Les cours d\'essai ne sont pas activés sur ce studio' }, { status: 403 });
  }

  // ── Anti-doublon : un même email ne peut pas demander 2 essais sur le même studio ──
  const { data: demandeMemeStudio } = await supabaseAdmin
    .from('cours_essai_demandes')
    .select('id, statut, created_at')
    .eq('profile_id', profile.id)
    .ilike('email', emailLower)
    .neq('statut', 'refusee')
    .maybeSingle();

  if (demandeMemeStudio) {
    return Response.json({
      error: 'Tu as déjà demandé un cours d\'essai dans ce studio. Si c\'est une erreur, contacte directement ' + (profile.studio_nom || 'le studio') + '.',
      code: 'ALREADY_REQUESTED',
    }, { status: 409 });
  }

  const { data: clientExistant } = await supabaseAdmin
    .from('clients')
    .select('id, statut')
    .eq('profile_id', profile.id)
    .ilike('email', emailLower)
    .maybeSingle();

  if (clientExistant) {
    return Response.json({
      error: 'Tu es déjà inscrit·e dans ce studio. Connecte-toi à ton espace pour réserver.',
      code: 'ALREADY_CLIENT',
    }, { status: 409 });
  }

  // 2. Cours
  const { data: cours } = await supabaseAdmin
    .from('cours')
    .select('id, nom, date, heure, lieu, est_annule, profile_id')
    .eq('id', coursId)
    .eq('profile_id', profile.id)
    .single();

  if (!cours) return Response.json({ error: 'Cours introuvable' }, { status: 404 });
  if (cours.est_annule) return Response.json({ error: 'Ce cours est annulé' }, { status: 400 });
  // Vérif date+heure
  const todayIso = new Date().toISOString().slice(0, 10);
  if (cours.date < todayIso) return Response.json({ error: 'Ce cours est passé' }, { status: 400 });

  // 3. Insérer la demande
  const initialStatut = profile.essai_mode === 'manuel' ? 'en_attente' : 'acceptee';
  const { data: demande, error: demandeErr } = await supabaseAdmin
    .from('cours_essai_demandes')
    .insert({
      profile_id: profile.id,
      cours_id: cours.id,
      prenom: prenom.trim(),
      nom: (nom || '').trim() || null,
      email: email.trim().toLowerCase(),
      telephone: (telephone || '').trim() || null,
      message_visiteur: (message || '').trim() || null,
      statut: initialStatut,
    })
    .select('*')
    .single();

  if (demandeErr) {
    console.error('[essai] insert demande err:', demandeErr);
    return Response.json({ error: 'Erreur lors de la création de la demande' }, { status: 500 });
  }

  // 4. Selon le mode
  const isManuel = profile.essai_mode === 'manuel';

  if (!isManuel) {
    // auto OU semi : finaliser immédiatement
    try {
      await finaliserDemande(supabaseAdmin, demande);
    } catch (err) {
      console.error('[essai] finaliserDemande err:', err);
      return Response.json({ error: 'Erreur lors de la finalisation : ' + err.message }, { status: 500 });
    }
  }

  // 5. Notif in-app pour la prof (cloche) — TOUS les modes, pour qu'elle soit
  // toujours au courant d'une nouvelle demande/inscription d'essai (avant, la
  // demande tombait en "Finalisées" sans aucune alerte en mode auto/semi).
  const coursDateStr = new Date(cours.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const coursHeureStr = cours.heure ? ' · ' + cours.heure.slice(0, 5).replace(':', 'h') : '';
  if (wantsNotif(profile.notif_prefs, 'essai_demande', 'prof', 'inapp')) {
    await supabaseAdmin.from('notifications').upsert({
      profile_id: profile.id,
      type: 'essai_demande',
      titre: isManuel ? `✨ Demande d'essai à valider — ${prenom}` : `✨ Nouveau cours d'essai — ${prenom}`,
      corps: `${cours.nom} · ${coursDateStr}${coursHeureStr}`,
      data: { demande_id: demande.id, cours_id: cours.id, prenom },
      ref_key: `essai_demande_${demande.id}`,
      expires_at: null,
    }, { onConflict: 'profile_id,ref_key', ignoreDuplicates: true });
  }

  // Push prof (gaté sur pref essai_demande ; no-op sans abonnement)
  sendPushToUser(profile.id, {
    title: isManuel ? `Demande d'essai à valider ✨` : `Nouveau cours d'essai ✨`,
    body: `${prenom} — ${cours.nom} · ${coursDateStr}${coursHeureStr}`,
    url: '/essais',
    tag: `essai-demande-${demande.id}`,
  }, { type: 'essai_demande' }).catch(() => {});

  // 6. Emails (non-bloquants)
  const stripeLink = profile.essai_paiement === 'stripe' ? profile.essai_stripe_payment_link : null;
  const proWantsEmail = wantsNotif(profile.notif_prefs, 'essai_demande', 'prof', 'email');
  if (isManuel) {
    emailEnAttenteVisiteur({ profileNom: profile.studio_nom, prenom, email, cours });
    if (proWantsEmail) emailNotifPro({ proEmail: profile.email_contact, proNom: profile.prenom, modeManuel: true, demande, cours });
  } else {
    // Accès direct à l'espace pour l'invité inscrit (auto/semi).
    const magicLink = await buildPortailMagicLink({ email, studioSlug });
    emailConfirmationVisiteur({
      profileNom: profile.studio_nom,
      studioSlug,
      prenom,
      email,
      cours,
      paiement: profile.essai_paiement,
      prix: profile.essai_prix,
      stripeLink,
      proEmail: profile.email_contact,
      adresse: profile.adresse,
      codePostal: profile.code_postal,
      ville: profile.ville,
      telephone: profile.telephone,
      magicLink,
    });
    // auto ET semi : on prévient la prof par email d'une inscription (gaté)
    if (proWantsEmail) emailNotifPro({ proEmail: profile.email_contact, proNom: profile.prenom, modeManuel: false, demande, cours });
  }

  return Response.json({
    ok: true,
    status: isManuel ? 'en_attente' : 'finalisee',
    paiement: profile.essai_paiement,
    prix: profile.essai_prix,
    stripePaymentLink: stripeLink,
    message: profile.essai_message,
  });
}
