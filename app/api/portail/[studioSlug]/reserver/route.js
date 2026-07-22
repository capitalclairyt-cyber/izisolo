import { createServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { parseJsonBody, reservationSchema } from '@/lib/validation';
import { checkAntiBot, ipFromRequest } from '@/lib/antibot';
import { getRegle } from '@/lib/regles-metier';
import { sendNotifElevePourRegle } from '@/lib/notif-eleve-regle';
import { sendPushToUser } from '@/lib/push-server';
import { wantsNotif } from '@/lib/notif-prefs';
import { getDelaiPourCours } from '@/lib/regles-annulation';
import { studioHasFeature } from '@/lib/plan-guard';
import { infosPratiquesBlock } from '@/lib/email-helpers';
import { sendEmail } from '@/lib/email';

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
  const supabaseAdmin = createAdminClient();

  // Vérifier que le studio existe et que le cours lui appartient.
  // Charge aussi regles_metier pour appliquer la règle "élève sans carnet".
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, studio_nom, regles_metier, regles_annulation, adresse, code_postal, ville, telephone, email_contact, notif_prefs, plan, trial_started_at, created_at, stripe_subscription_status, stripe_current_period_end')
    .eq('studio_slug', studioSlug)
    .single();

  if (!profile) return Response.json({ error: 'Studio introuvable' }, { status: 404 });

  const { data: cours } = await supabaseAdmin
    .from('cours')
    .select('id, nom, date, heure, lieu, capacite_max, est_annule, profile_id, tarif_unitaire, stripe_payment_link_unit, type_cours')
    .eq('id', coursId)
    .eq('profile_id', profile.id)
    .single();

  if (!cours) return Response.json({ error: 'Cours introuvable' }, { status: 404 });
  if (cours.est_annule) return Response.json({ error: 'Ce cours est annulé' }, { status: 400 });

  // Refuse un cours passé ou déjà commencé. Compare date+heure en heure de
  // Paris (le serveur Vercel tourne en UTC) ; 'sv-SE' → 'YYYY-MM-DD HH:MM:SS'.
  // Sans heure renseignée : on ne bloque qu'à partir du lendemain (jour révolu).
  const nowParis = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Paris' });
  const dejaCommence = cours.heure
    ? `${cours.date} ${cours.heure.slice(0, 5)}` <= nowParis.slice(0, 16)
    : cours.date < nowParis.slice(0, 10);
  if (dejaCommence) {
    return Response.json({ error: 'Ce cours a déjà commencé' }, { status: 400 });
  }

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
    .ilike('email', email.replace(/([%_\\])/g, '\\$1')) // échappe les jokers ilike (_ %)
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
        statut: 'prospect',
        source: 'Réservation portail',
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

  // Variable partagée : cas à logger après création presence
  let casATraiterAttendu = null;

  // ─── Cas particulier : workshop / cours payant à l'unité ─────────────────
  // Si le cours a tarif_unitaire défini, c'est un évènement séparé du
  // carnet/abo régulier (cf. règle workshop_vs_cours).
  // - Si stripe_payment_link_unit défini → on retourne l'URL pour paiement
  //   immédiat. La résa ne se finalise PAS automatiquement après paiement
  //   (manque webhook par cours), c'est à la prof de créer la presence
  //   manuellement OU à l'élève de revenir confirmer.
  // - Si pas de lien Stripe → on crée la presence + log un cas "à régler sur place".
  if (cours.tarif_unitaire) {
    // Workshop / cours payant à l'unité (séparé du carnet/abo régulier).
    // ⚠️ Le paiement Stripe en ligne À LA RÉSERVATION est DÉSACTIVÉ tant qu'il
    // n'existe pas de webhook « paiement par cours » : sinon l'élève payait sur
    // Stripe SANS être inscrit (place non décomptée) + risque de double paiement
    // au re-clic (cf. AUDIT-PORTAIL-ELEVE-2026 §P0). On réserve donc TOUJOURS la
    // place et on log le montant en « à régler » (visible espace élève + côté
    // prof, qui encaisse en 1 clic ou envoie un lien Stripe séparément).
    casATraiterAttendu = casATraiterAttendu || {
      case_type: 'workshop_vs_cours',
      context: {
        choix_applique: 'paiement_a_regler',
        tarif_unitaire: cours.tarif_unitaire,
        raison: 'Workshop payant à l\'unité — à régler (paiement en ligne à la résa désactivé, manque webhook par cours)',
      },
    };
  }

  // ─── Règle métier : élève sans carnet ni abonnement actif ────────────────
  // Vérifier si le client a un abonnement / carnet actif avec séances restantes
  // (et non expiré). Si non, appliquer la règle eleve_sans_carnet de la prof.
  const { data: abosActifs } = await supabaseAdmin
    .from('abonnements')
    .select('id, statut, seances_total, seances_utilisees, date_fin, date_pause_debut, date_pause_fin, types_cours_autorises, offre:offres(seances_par_semaine, types_cours_autorises)')
    .eq('client_id', clientId)
    .eq('statut', 'actif');

  const todayStr = new Date().toISOString().slice(0, 10);
  // Helper : un abo est-il applicable à CE cours (en tenant compte du type de cours)
  const aboApplicableACeCours = (a) => {
    const typesAutorises = a.types_cours_autorises?.length
      ? a.types_cours_autorises
      : a.offre?.types_cours_autorises;
    if (typesAutorises?.length && cours.type_cours && !typesAutorises.includes(cours.type_cours)) {
      return false;
    }
    return true;
  };
  // Abonnement valide AUJOURD'HUI pour CE cours (séances restantes + non expiré + pas en pause + bon type)
  const aboValide = (abosActifs || []).some(a => {
    if (a.seances_total != null) {
      const reste = (a.seances_total || 0) - (a.seances_utilisees || 0);
      if (reste <= 0) return false;
    }
    if (a.date_fin && a.date_fin < todayStr) return false;
    // Pause en cours : l'abo n'est pas utilisable aujourd'hui
    if (a.date_pause_debut && a.date_pause_fin
        && a.date_pause_debut <= todayStr && a.date_pause_fin >= todayStr) return false;
    if (!aboApplicableACeCours(a)) return false;
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
    if (!aboApplicableACeCours(a)) return false;
    return true;
  });
  const carnetExpireraAvant = aboValide && !aboValideADate;

  // L'élève a-t-il un carnet UTILISABLE (séances restantes, non expiré, pas en
  // pause) mais exclu UNIQUEMENT par le type de cours ? → l'email « tu n'as pas
  // de carnet actif » serait faux et vexant ; on enverra la variante « ton
  // carnet ne couvre pas ce type de cours » (corpsMauvaisType).
  const carnetInapplicable = !aboValide && (abosActifs || []).some(a => {
    if (a.seances_total != null) {
      const reste = (a.seances_total || 0) - (a.seances_utilisees || 0);
      if (reste <= 0) return false;
    }
    if (a.date_fin && a.date_fin < todayStr) return false;
    if (a.date_pause_debut && a.date_pause_fin
        && a.date_pause_debut <= todayStr && a.date_pause_fin >= todayStr) return false;
    return !aboApplicableACeCours(a); // tout est bon SAUF le type
  });

  const regleSansCarnet = getRegle({ regles_metier: profile.regles_metier }, 'eleve_sans_carnet');
  const regleExpireAvant = getRegle({ regles_metier: profile.regles_metier }, 'carnet_expire_avant_cours');

  // ─── Limite de fréquence (seances_par_semaine) ───────────────────────────
  // Si l'élève a un abonnement valide avec un cap de séances/semaine, on
  // compte ses présences déjà existantes sur la même semaine ISO que le cours
  // et on bloque si on dépasse le cap.
  if (aboValide) {
    const aboCap = Math.max(0, ...(abosActifs || []).map(a => a.offre?.seances_par_semaine || 0));
    if (aboCap > 0) {
      // Lundi de la semaine du cours
      const dCours = new Date(cours.date + 'T00:00:00');
      const day = dCours.getDay() || 7; // 0=dim → 7
      const lundi = new Date(dCours);
      lundi.setDate(dCours.getDate() - (day - 1));
      const dimanche = new Date(lundi);
      dimanche.setDate(lundi.getDate() + 6);
      const debSemaine = lundi.toISOString().slice(0, 10);
      const finSemaine = dimanche.toISOString().slice(0, 10);

      const { data: presencesSemaine } = await supabaseAdmin
        .from('presences')
        .select('id, cours:cours_id(date)')
        .eq('client_id', clientId)
        .eq('profile_id', profile.id);

      const nbDansSemaine = (presencesSemaine || []).filter(p =>
        p.cours?.date >= debSemaine && p.cours?.date <= finSemaine
      ).length;

      if (nbDansSemaine >= aboCap) {
        return Response.json({
          error: `Ton abonnement inclut ${aboCap} séance${aboCap > 1 ? 's' : ''} par semaine. Tu as déjà ${nbDansSemaine} cours réservé${nbDansSemaine > 1 ? 's' : ''} cette semaine-là.`,
          code: 'WEEKLY_LIMIT',
        }, { status: 403 });
      }
    }
  }

  // ⚠️ Les règles de carnet NE s'appliquent PAS aux workshops (tarif_unitaire) :
  // ces cours sont payables à la séance par nature, l'absence de carnet est
  // normale. Sinon l'élève recevait à tort l'email « achète un carnet d'avance »
  // alors qu'aucun carnet ne couvre ce type de cours.
  if (!cours.tarif_unitaire && !aboValide) {
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
  } else if (!cours.tarif_unitaire && carnetExpireraAvant) {
    // Carnet valide aujourd'hui MAIS expirera avant la date du cours
    // → applique la règle carnet_expire_avant_cours (jamais pour un workshop)
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

  // Créer la présence ATOMIQUEMENT (RPC v53) : doublon + capacité vérifiés
  // sous verrou par cours. Remplace l'ancien check-insert-recheck-delete où
  // deux résas simultanées sur la dernière place s'annulaient mutuellement.
  const { data: resa, error: presenceErr } = await supabaseAdmin
    .rpc('reserver_place', {
      p_profile_id: profile.id,
      p_cours_id: coursId,
      p_client_id: clientId,
    });

  if (presenceErr) {
    console.error('create presence error:', presenceErr);
    return Response.json({ error: 'Erreur lors de la réservation : ' + presenceErr.message }, { status: 500 });
  }
  if (!resa?.ok) {
    if (resa?.reason === 'doublon') {
      return Response.json({ error: 'Tu es déjà inscrit·e à ce cours' }, { status: 409 });
    }
    if (resa?.reason === 'complet') {
      return Response.json({ error: 'Ce cours est complet' }, { status: 409 });
    }
    if (resa?.reason === 'annule') {
      return Response.json({ error: 'Ce cours est annulé' }, { status: 400 });
    }
    return Response.json({ error: 'Cours introuvable' }, { status: 404 });
  }
  const newPresence = { id: resa.presence_id };

  // Notif prof « nouvelle réservation » — cloche in-app + push. La cloche est
  // le canal fiable (le push exige un abonnement web push) : sans elle, une
  // résa d'un élève existant ne laissait AUCUNE trace côté prof.
  {
    const dStr = cours.date
      ? new Date(cours.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      : '';
    const hStr = cours.heure ? ' · ' + cours.heure.slice(0, 5).replace(':', 'h') : '';

    // Cloche in-app (gaté sur la pref inapp ; défaut ON). ref_key = presence_id
    // → une notif par réservation, dédupée. Expire 3j après pour ne pas encombrer.
    // Non-bloquant : une notif ratée ne doit jamais faire échouer la résa.
    if (wantsNotif(profile.notif_prefs, 'reservation', 'prof', 'inapp')) {
      try {
        const expire = new Date(); expire.setDate(expire.getDate() + 3);
        await supabaseAdmin.from('notifications').upsert({
          profile_id: profile.id,
          type: 'reservation',
          titre: `🎉 Nouvelle réservation — ${prenom || email}`,
          corps: `${cours.nom || 'un cours'}${dStr ? ` · ${dStr}` : ''}${hStr}`,
          data: { client_id: clientId, cours_id: coursId, cours_date: cours.date, presence_id: newPresence?.id || null, prenom },
          ref_key: `reservation_${newPresence?.id || coursId + '_' + clientId}`,
          expires_at: expire.toISOString(),
        }, { onConflict: 'profile_id,ref_key', ignoreDuplicates: true });
      } catch (e) { console.warn('[reserver] notif cloche non-bloquant:', e?.message); }
    }

    // Push (gaté sur la pref push ; no-op sans abonnement)
    sendPushToUser(profile.id, {
      title: `Nouvelle réservation 🎉`,
      body: `${prenom || email} — ${cours.nom || 'un cours'}${dStr ? ` (${dStr})` : ''}`,
      url: '/agenda',
      tag: `resa-${coursId}`,
    }, { type: 'reservation' }).catch(() => {});
  }

  // Nettoyer toute entrée liste_attente pour cet élève sur ce cours
  // (cas où l'élève était inscrit en LA puis trouve une place via résa directe)
  try {
    // Deux deletes séparés plutôt qu'un .or(...) : l'email est une donnée
    // utilisateur, on ne l'interpole JAMAIS dans la syntaxe d'un filtre
    // PostgREST (cf. la validation regex du webhook Stripe pour le même
    // risque). Les .eq()/.ilike() passent par des paramètres, pas la syntaxe.
    await supabaseAdmin
      .from('liste_attente')
      .delete()
      .eq('cours_id', coursId)
      .eq('profile_id', profile.id)
      .eq('client_id', clientId);
    // ilike : on échappe % et _ pour que l'email ne devienne pas un wildcard.
    await supabaseAdmin
      .from('liste_attente')
      .delete()
      .eq('cours_id', coursId)
      .eq('profile_id', profile.id)
      .ilike('email', email.replace(/([%_\\])/g, '\\$1'));
  } catch (e) {
    console.warn('[reserver] cleanup liste_attente non-bloquant:', e?.message);
  }

  // Si une règle a remonté un cas → log dans cas_a_traiter (sauf si la prof a
  // désactivé l'alerte dashboard ET qu'on est en mode auto = pas d'encombrement
  // de l'inbox pour les cas où l'app a déjà tout géré silencieusement).
  // En parallèle, envoyer un email à l'élève si la règle l'a configuré.
  if (casATraiterAttendu) {
    // Sélectionne la bonne règle selon le case_type
    let regleAct;
    if (casATraiterAttendu.case_type === 'carnet_expire_avant_cours') {
      regleAct = regleExpireAvant;
    } else if (casATraiterAttendu.case_type === 'workshop_vs_cours') {
      regleAct = getRegle({ regles_metier: profile.regles_metier }, 'workshop_vs_cours');
    } else {
      regleAct = regleSansCarnet;
    }
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
        // Un carnet/abo est-il ACHETABLE pour CE type de cours ? Si aucun ne le
        // couvre (ex. « Yoga Renfo » payable uniquement à la séance), on ne
        // suggère PAS « achète un carnet d'avance » (message trompeur).
        let carnetAchetable = true;
        if (casATraiterAttendu.case_type === 'eleve_sans_carnet') {
          const { data: offresVente } = await supabaseAdmin
            .from('offres')
            .select('type, types_cours_autorises')
            .eq('profile_id', profile.id)
            .eq('actif', true)
            .in('type', ['carnet', 'abonnement']);
          carnetAchetable = (offresVente || []).some(o => {
            const types = o.types_cours_autorises;
            return !types?.length || (cours.type_cours && types.includes(cours.type_cours));
          });
        }
        await sendNotifElevePourRegle({
          caseType: casATraiterAttendu.case_type,
          regle: regleAct,
          profile: { id: profile.id, studio_nom: profile.studio_nom },
          client: { prenom, nom, email },
          contexte: { cours: cours.nom, date: dateStr, heure: cours.heure?.slice(0, 5).replace(':', 'h') || '', carnetAchetable, carnetInapplicable },
        });
      } catch (e) { console.warn('[reserver] notif élève non-bloquant:', e?.message); }
    }
  }

  // Si l'utilisateur n'est pas authentifié, générer un magic link pour qu'il accède
  // à son espace en un clic. Le lien sera intégré dans l'email Resend de confirmation.
  let magicLink = null;
  if (!isAuthenticated) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.izisolo.fr';
      // Garantir l'existence du compte auth (idempotent) AVANT generateLink :
      // sans ça, generateLink peut échouer pour un email encore inconnu → pas de
      // lien → l'élève qui vient de réserver ne peut pas rejoindre son espace en
      // un clic. email_confirm: true ⇒ aucun email Supabase parasite n'est envoyé.
      // role: 'eleve' ⇒ handle_new_user (v57) ne crée pas de profil prof.
      try {
        await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { role: 'eleve' },
        });
      } catch { /* user déjà existant : normal, on continue */ }

      // Lien construit avec hashed_token (Sprint 4) : clic → /p/[slug]/connecte
      // ?token_hash=… → verifyOtp server-side → espace. Plus de passage par
      // supabase.co/verify (qui renvoyait les tokens en fragment #, invisibles
      // côté serveur → 5 sauts de rattrapage client).
      const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });
      if (linkErr) {
        console.error('magic link error (non-blocking):', linkErr);
      } else if (linkData?.properties?.hashed_token) {
        magicLink = `${appUrl}/p/${studioSlug}/connecte?token_hash=${encodeURIComponent(linkData.properties.hashed_token)}&type=magiclink`;
      }
    } catch (linkErr) {
      console.error('magic link exception (non-blocking):', linkErr);
    }
  }

  // Récupérer l'email du pro pour reply_to
  let proEmail = null;
  try {
    const { data: { user: proUser } } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    proEmail = proUser?.email || null;
  } catch {}

  // Envoyer email de confirmation (si Resend configuré)
  let magicLinkSent = false;
  try {
    if (process.env.RESEND_API_KEY) {
      const dateStr = new Date(cours.date + 'T12:00:00').toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      });
      const heureStr = cours.heure ? cours.heure.slice(0, 5).replace(':', 'h') : '';
      const espaceUrl = magicLink || `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.izisolo.fr'}/p/${studioSlug}/espace`;
      const delaiAnnulation = getDelaiPourCours(profile, cours.type_cours);
      const infosBlock = infosPratiquesBlock({ adresse: profile.adresse, codePostal: profile.code_postal, ville: profile.ville, telephone: profile.telephone, email: profile.email_contact, studioSlug, profileNom: profile.studio_nom });
      magicLinkSent = !!magicLink;

      // Transactionnel : confirmation de SA réservation (contient le lien d'accès)
      await sendEmail({
        categorie: 'transactionnel',
        replyTo: proEmail,
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
            ${cours.tarif_unitaire ? `
            <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 12px 16px; margin: 0 0 16px; color: #9a3412; font-size: 0.875rem;">
              <strong>Cours à régler à la séance</strong><br/>
              Tarif : ${Number(cours.tarif_unitaire).toFixed(2).replace('.', ',')} € — à régler directement avec ton studio.
            </div>` : ''}
            <div style="background: #fffaf0; border: 1px solid #ffe0b2; border-radius: 10px; padding: 12px 16px; margin: 0 0 16px; color: #7c4a03; font-size: 0.875rem;">
              ${studioHasFeature(profile, 'annulationParEleve')
                ? `<strong>Annulation flexible</strong><br/>Tu peux annuler depuis ton espace jusqu'à ${delaiAnnulation}h avant la séance.`
                : `<strong>Annulation</strong><br/>Pour toute annulation, contacte directement ton studio.`}
            </div>
            ${infosBlock}
            <p style="color: #aaa; font-size: 0.8rem; margin: 32px 0 0; border-top: 1px solid #eee; padding-top: 16px; text-align: center;">
              Propulsé par <a href="https://www.izisolo.fr" style="color: #d4a0a0;">IziSolo</a>
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
