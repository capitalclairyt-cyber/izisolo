import { createServerClient } from '@/lib/supabase-server';
import { createClient as createAdminSupabase } from '@supabase/supabase-js';
import { parseJsonBody, reservationSchema } from '@/lib/validation';
import { checkAntiBot, ipFromRequest } from '@/lib/antibot';
import { getRegle } from '@/lib/regles-metier';
import { sendNotifElevePourRegle } from '@/lib/notif-eleve-regle';

export async function POST(request, { params }) {
  const { studioSlug } = await params;
  // Lire le body brut une seule fois (request.json() n'est consommable qu'une fois)
  const rawBody = await request.json().catch(() => null);
  if (!rawBody) return Response.json({ error: 'JSON invalide' }, { status: 400 });

  // ── Anti-bot : honeypot + rate limit + Turnstile (si configuré) ──
  const antibotCheck = await checkAntiBot(request, {
    honeypot: rawBody.website,
    turnstileToken: rawBody.turnstileToken,
  });
  if (!antibotCheck.ok) {
    console.warn('[reserver] antibot rejected:', antibotCheck.code, 'ip=', ipFromRequest(request));
    return Response.json({ error: antibotCheck.reason }, { status: antibotCheck.code === 'RATE_LIMITED' ? 429 : 400 });
  }

  // Validation zod (Zod strip les champs inconnus comme website/turnstileToken)
  const parsed = reservationSchema.safeParse(rawBody);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return Response.json({ error: 'Données invalides', issues }, { status: 400 });
  }
  const { coursId, nom, email, tel } = parsed.data;

  // Détecter si la requête vient d'un user déjà authentifié
  const supabaseSession = await createServerClient();
  const { data: { user: authUser } } = await supabaseSession.auth.getUser();
  const isAuthenticated = !!authUser && authUser.email?.toLowerCase() === email.toLowerCase();

  // Utiliser le service role pour les opérations admin
  const supabaseAdmin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Vérifier que le studio existe et que le cours lui appartient.
  // Charge aussi regles_metier pour appliquer la règle "élève sans carnet".
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, studio_nom, regles_metier')
    .eq('studio_slug', studioSlug)
    .single();

  if (!profile) return Response.json({ error: 'Studio introuvable' }, { status: 404 });

  const { data: cours } = await supabaseAdmin
    .from('cours')
    .select('id, nom, date, heure, lieu, capacite_max, est_annule, profile_id')
    .eq('id', coursId)
    .eq('profile_id', profile.id)
    .single();

  if (!cours) return Response.json({ error: 'Cours introuvable' }, { status: 404 });
  if (cours.est_annule) return Response.json({ error: 'Ce cours est annulé' }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);
  if (cours.date < today) return Response.json({ error: 'Ce cours est passé' }, { status: 400 });

  // Vérifier la capacité
  if (cours.capacite_max) {
    const { count } = await supabaseAdmin
      .from('presences')
      .select('id', { count: 'exact', head: true })
      .eq('cours_id', coursId);
    if ((count || 0) >= cours.capacite_max) {
      return Response.json({ error: 'Ce cours est complet' }, { status: 409 });
    }
  }

  // Chercher ou créer le client dans la table clients du prof
  let clientId;
  let prenom;
  const { data: existingClient } = await supabaseAdmin
    .from('clients')
    .select('id, prenom')
    .eq('profile_id', profile.id)
    .ilike('email', email)
    .single();

  if (existingClient) {
    clientId = existingClient.id;
    prenom = existingClient.prenom;
  } else {
    const nomParts = nom.split(' ');
    prenom = nomParts[0];
    const clientNom = nomParts.slice(1).join(' ') || '';
    const { data: newClient, error: clientErr } = await supabaseAdmin
      .from('clients')
      .insert({
        profile_id: profile.id,
        prenom,
        nom: clientNom,
        email,
        telephone: tel || null,
      })
      .select('id')
      .single();
    if (clientErr) {
      console.error('create client error:', clientErr);
      return Response.json({ error: 'Erreur lors de la création du profil' }, { status: 500 });
    }
    clientId = newClient.id;
  }

  // Vérifier que l'élève n'est pas déjà inscrit
  const { data: dejaInscrit } = await supabaseAdmin
    .from('presences')
    .select('id')
    .eq('cours_id', coursId)
    .eq('client_id', clientId)
    .single();

  if (dejaInscrit) {
    return Response.json({ error: 'Tu es déjà inscrit·e à ce cours' }, { status: 409 });
  }

  // ─── Règle métier : élève sans carnet ni abonnement actif ────────────────
  // Vérifier si le client a un abonnement / carnet actif avec séances restantes
  // (et non expiré). Si non, appliquer la règle eleve_sans_carnet de la prof.
  const { data: abosActifs } = await supabaseAdmin
    .from('abonnements')
    .select('id, statut, seances_total, seances_utilisees, date_fin')
    .eq('client_id', clientId)
    .eq('statut', 'actif');

  const todayStr = new Date().toISOString().slice(0, 10);
  // Abonnement valide AUJOURD'HUI (séances restantes + non expiré aujourd'hui)
  const aboValide = (abosActifs || []).some(a => {
    if (a.seances_total != null) {
      const reste = (a.seances_total || 0) - (a.seances_utilisees || 0);
      if (reste <= 0) return false;
    }
    if (a.date_fin && a.date_fin < todayStr) return false;
    return true;
  });

  // Abonnement valide à la DATE DU COURS (pour la règle carnet_expire_avant_cours)
  // Si l'élève a un abo valide aujourd'hui mais qui expire AVANT le cours,
  // on déclenche la règle carnet_expire_avant_cours.
  const aboValideADate = (abosActifs || []).some(a => {
    if (a.seances_total != null) {
      const reste = (a.seances_total || 0) - (a.seances_utilisees || 0);
      if (reste <= 0) return false;
    }
    if (a.date_fin && a.date_fin < cours.date) return false;
    return true;
  });
  const carnetExpireraAvant = aboValide && !aboValideADate;

  const regleSansCarnet = getRegle({ regles_metier: profile.regles_metier }, 'eleve_sans_carnet');
  const regleExpireAvant = getRegle({ regles_metier: profile.regles_metier }, 'carnet_expire_avant_cours');
  let casATraiterAttendu = null; // si on doit logger un cas après création presence

  if (!aboValide) {
    // Mode AUTO : appliquer le choix
    if (regleSansCarnet.mode === 'auto') {
      switch (regleSansCarnet.choix) {
        case 'bloquer':
          return Response.json({
            error: 'Tu dois avoir un carnet ou un abonnement actif pour réserver. Contacte ton studio pour acheter un carnet.',
            code: 'NO_PACKAGE',
          }, { status: 403 });

        case 'forcer_stripe':
          // TODO vague suivante : créer une Checkout Session Stripe Payment Link
          // pour le cours unique, puis créer la presence après paiement réussi.
          // Pour l'instant : fallback vers paiement_sur_place (créer presence + log)
          casATraiterAttendu = {
            case_type: 'eleve_sans_carnet',
            context: { choix_applique: 'paiement_sur_place', raison: 'forcer_stripe pas encore implémenté' },
          };
          break;

        case 'creer_dette':
          casATraiterAttendu = {
            case_type: 'eleve_sans_carnet',
            context: { choix_applique: 'creer_dette', dette_a_regler: true },
          };
          break;

        case 'paiement_sur_place':
        default:
          casATraiterAttendu = {
            case_type: 'eleve_sans_carnet',
            context: { choix_applique: 'paiement_sur_place' },
          };
          break;
      }
    } else {
      // Mode MANUEL : on accepte la résa mais on remonte le cas à la prof
      casATraiterAttendu = {
        case_type: 'eleve_sans_carnet',
        context: { mode: 'manuel' },
      };
    }
  } else if (carnetExpireraAvant) {
    // Carnet valide aujourd'hui MAIS expirera avant la date du cours
    // → applique la règle carnet_expire_avant_cours
    if (regleExpireAvant.mode === 'auto') {
      switch (regleExpireAvant.choix) {
        case 'bloquer':
          return Response.json({
            error: 'Ton carnet expirera avant la date de ce cours. Renouvelle-le ou contacte ton studio.',
            code: 'CARNET_EXPIRE_AVANT',
          }, { status: 403 });

        case 'prolonger': {
          // Prolonger l'abo le plus pertinent jusqu'à la date du cours.
          // On choisit l'abo dont date_fin est la plus tardive parmi ceux valides aujourd'hui.
          const aboToExtend = (abosActifs || [])
            .filter(a => !a.date_fin || a.date_fin >= todayStr)
            .sort((a, b) => (b.date_fin || '').localeCompare(a.date_fin || ''))[0];
          if (aboToExtend) {
            try {
              await supabaseAdmin
                .from('abonnements')
                .update({ date_fin: cours.date })
                .eq('id', aboToExtend.id);
            } catch (e) { console.warn('prolongement abo non-bloquant:', e); }
          }
          casATraiterAttendu = {
            case_type: 'carnet_expire_avant_cours',
            context: { choix_applique: 'prolonger', nouvelle_date_fin: cours.date },
          };
          break;
        }

        case 'autoriser_avertir':
        default:
          // On laisse passer la résa, on log un cas pour avertir l'élève (email)
          casATraiterAttendu = {
            case_type: 'carnet_expire_avant_cours',
            context: { choix_applique: 'autoriser_avertir' },
          };
          break;
      }
    } else {
      // Mode manuel
      casATraiterAttendu = {
        case_type: 'carnet_expire_avant_cours',
        context: { mode: 'manuel' },
      };
    }
  }

  // Créer la présence (inscrit, pas encore pointé)
  // Schéma : pointee BOOLEAN (default false), statut_pointage TEXT (default 'inscrit')
  const { data: newPresence, error: presenceErr } = await supabaseAdmin
    .from('presences')
    .insert({
      cours_id: coursId,
      client_id: clientId,
      profile_id: profile.id,
      // pointee + statut_pointage prennent leurs defaults ('false' + 'inscrit')
    })
    .select('id')
    .single();

  if (presenceErr) {
    console.error('create presence error:', presenceErr);
    return Response.json({ error: 'Erreur lors de la réservation : ' + presenceErr.message }, { status: 500 });
  }

  // Si une règle a remonté un cas → log dans cas_a_traiter (sauf si la prof a
  // désactivé l'alerte dashboard ET qu'on est en mode auto = pas d'encombrement
  // de l'inbox pour les cas où l'app a déjà tout géré silencieusement).
  // En parallèle, envoyer un email à l'élève si la règle l'a configuré.
  if (casATraiterAttendu) {
    // Sélectionne la bonne règle selon le case_type
    const regleAct = casATraiterAttendu.case_type === 'carnet_expire_avant_cours'
      ? regleExpireAvant
      : regleSansCarnet;
    const shouldLog = regleAct.mode === 'manuel' || regleAct.notifProf;
    if (shouldLog) {
      try {
        await supabaseAdmin
          .from('cas_a_traiter')
          .insert({
            profile_id: profile.id,
            case_type: casATraiterAttendu.case_type,
            client_id: clientId,
            cours_id: coursId,
            presence_id: newPresence?.id || null,
            context: {
              ...casATraiterAttendu.context,
              client_nom: nom,
              client_email: email,
              cours_nom: cours.nom,
              cours_date: cours.date,
            },
          });
      } catch (logErr) {
        console.warn('[reserver] cas_a_traiter insert non-bloquant:', logErr?.message);
      }
    }

    // Email auto à l'élève si la règle est configurée pour
    if (regleAct.notifEleveEmail) {
      try {
        const dateStr = cours.date
          ? new Date(cours.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
          : '';
        await sendNotifElevePourRegle({
          caseType: casATraiterAttendu.case_type,
          regle: regleAct,
          profile: { id: profile.id, studio_nom: profile.studio_nom },
          client: { prenom, nom, email },
          contexte: { cours: cours.nom, date: dateStr, heure: cours.heure?.slice(0, 5).replace(':', 'h') || '' },
        });
      } catch (e) { console.warn('[reserver] notif élève non-bloquant:', e?.message); }
    }
  }

  // Si l'utilisateur n'est pas authentifié, générer un magic link pour qu'il accède
  // à son espace en un clic. Le lien sera intégré dans l'email Resend de confirmation.
  let magicLink = null;
  if (!isAuthenticated) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://izisolo.fr';
      const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo: `${appUrl}/auth/callback?next=/p/${studioSlug}/espace`,
        },
      });
      if (linkErr) {
        console.error('magic link error (non-blocking):', linkErr);
      } else {
        magicLink = linkData?.properties?.action_link || null;
      }
    } catch (linkErr) {
      console.error('magic link exception (non-blocking):', linkErr);
    }
  }

  // Envoyer email de confirmation (si Resend configuré)
  let magicLinkSent = false;
  try {
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const dateStr = new Date(cours.date + 'T12:00:00').toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      });
      const heureStr = cours.heure ? cours.heure.slice(0, 5).replace(':', 'h') : '';
      const espaceUrl = magicLink || `${process.env.NEXT_PUBLIC_APP_URL || 'https://izisolo.fr'}/p/${studioSlug}/espace`;
      magicLinkSent = !!magicLink;

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'IziSolo <no-reply@izisolo.fr>',
        to: email,
        subject: `Réservation confirmée — ${cours.nom}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #d4a0a0; margin: 0 0 6px;">Réservation confirmée !</h2>
            <p style="color: #555; margin: 0 0 16px;">Bonjour ${prenom || nom},</p>
            <p style="color: #555; margin: 0 0 12px;">Ta place est réservée pour :</p>
            <div style="background: #faf8f5; border-radius: 12px; padding: 16px 20px; margin: 0 0 20px;">
              <strong style="font-size: 1.1rem; color: #1a1a2e;">${cours.nom}</strong><br/>
              <span style="color: #888;">📅 ${dateStr}</span><br/>
              <span style="color: #888;">🕐 ${heureStr}</span>
              ${cours.lieu ? `<br/><span style="color: #888;">📍 ${cours.lieu}</span>` : ''}
              <br/><span style="color: #888;">🏠 ${profile.studio_nom}</span>
            </div>
            <div style="text-align: center; margin: 0 0 20px;">
              <a href="${espaceUrl}" style="display: inline-block; background: #d4a0a0; color: white; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 600; font-size: 0.95rem;">
                ${magicLink ? 'Accéder à mon espace' : 'Voir mon espace'}
              </a>
            </div>
            ${magicLink ? `
              <p style="color: #888; font-size: 0.8125rem; margin: 0 0 20px; text-align: center;">
                Ce lien te connecte automatiquement. Il expire dans 1 heure.
              </p>
            ` : ''}
            <div style="background: #fffaf0; border: 1px solid #ffe0b2; border-radius: 10px; padding: 12px 16px; margin: 0 0 16px; color: #7c4a03; font-size: 0.875rem;">
              <strong>Annulation flexible</strong><br/>
              Tu peux annuler depuis ton espace jusqu'à 24h avant le cours.
            </div>
            <p style="color: #aaa; font-size: 0.8rem; margin: 32px 0 0; border-top: 1px solid #eee; padding-top: 16px; text-align: center;">
              Propulsé par <a href="https://izisolo.fr" style="color: #d4a0a0;">IziSolo</a>
            </p>
          </div>
        `,
      });
    }
  } catch (emailErr) {
    console.error('email confirmation error (non-blocking):', emailErr);
    // On ne fait pas échouer la réservation si l'email plante
  }

  return Response.json({ ok: true, magicLinkSent });
}
