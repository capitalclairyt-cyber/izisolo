import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { withRoute } from '@/lib/api-route';
import { getTrialStatus } from '@/lib/trial';
import { sendEmail } from '@/lib/email';
import { reportError } from '@/lib/report';
import { choisirEmailOnboarding, renderEmailOnboarding } from '@/lib/onboarding-emails';

// Durée max explicite (fluid compute : 300 s = plafond Hobby)
export const maxDuration = 300;

// Cron quotidien : marquer les abonnements expirés
export const GET = withRoute({ auth: 'cron' }, async () => {
  const today = new Date().toISOString().split('T')[0];

  // Marquer comme expiré les abonnements dont la date_fin est dépassée
  const { data, error } = await supabaseAdmin
    .from('abonnements')
    .update({ statut: 'expire' })
    .eq('statut', 'actif')
    .not('date_fin', 'is', null)
    .lt('date_fin', today)
    .select('id');

  if (error) {
    reportError('[cron/expirations]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Marquer comme épuisé les carnets à 0 séances restantes
  const { data: epuises } = await supabaseAdmin
    .rpc('marquer_carnets_epuises');

  // ── Nettoyage liste d'attente ────────────────────────────────────────────
  // Les entrées de cours passés depuis > 60 jours ne servent plus à rien
  // (la place ne se libérera jamais rétroactivement). On les purge pour éviter
  // l'accumulation infinie (la table n'était jamais nettoyée).
  let listeAttentePurgee = 0;
  try {
    const il60jours = new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0];
    // Paginé (B1g) : sans .range, le cap PostgREST 1000 renvoyait les MÊMES
    // 1000 vieux cours chaque nuit (jamais supprimés) → la purge stagnait et
    // liste_attente s'accumulait sur les cours 1001+.
    const vieuxIds = [];
    for (let page = 0; page < 5; page++) {
      const { data: coursVieux, error: vieuxErr } = await supabaseAdmin
        .from('cours')
        .select('id')
        .lt('date', il60jours)
        .order('date', { ascending: true })
        .range(page * 1000, page * 1000 + 999);
      if (vieuxErr) {
        reportError('[cron/expirations] cours vieux err:', vieuxErr, { route: '/api/cron/expirations' });
        break;
      }
      vieuxIds.push(...(coursVieux || []).map(c => c.id));
      if (!coursVieux || coursVieux.length < 1000) break;
    }
    // Supprime par lots de 200 ids pour rester sous la limite d'URL PostgREST.
    for (let i = 0; i < vieuxIds.length; i += 200) {
      const lot = vieuxIds.slice(i, i + 200);
      const { data: del } = await supabaseAdmin
        .from('liste_attente')
        .delete()
        .in('cours_id', lot)
        .select('id');
      listeAttentePurgee += del?.length || 0;
    }
  } catch (e) {
    reportError('[cron/expirations] purge liste_attente:', e?.message);
  }

  // ── Purge du journal d'erreurs (v71) ─────────────────────────────────────
  // erreurs_app garde 30 jours glissants — au-delà, plus personne ne les lit.
  // console.error volontaire (PAS reportError : si la purge échoue parce que
  // la table n'existe pas, reportError re-tenterait d'y écrire → boucle).
  try {
    const il30jours = new Date(Date.now() - 30 * 86400000).toISOString();
    await supabaseAdmin.from('erreurs_app').delete().lt('created_at', il30jours);
  } catch (e) {
    console.error('[cron/expirations] purge erreurs_app:', e?.message);
  }

  // ── Purge des compteurs de rate-limit (v72) ──────────────────────────────
  // Les fenêtres font 1h max : une ligne de plus de 2 jours est morte.
  try {
    const il2jours = new Date(Date.now() - 2 * 86400000).toISOString();
    await supabaseAdmin.from('rate_limits').delete().lt('fenetre_debut', il2jours);
  } catch (e) {
    reportError('[cron/expirations] purge rate_limits:', e?.message);
  }

  // ── Auto-statut clients ──────────────────────────────────────────────────
  let promoCount = 0;

  // prospect → actif : dès qu'il y a au moins 1 paiement 'paid'.
  // Batché par 200 (limite d'URL PostgREST) + erreurs LUES : le .in() non
  // batché cassait au-delà de ~200 prospects → paidClientIds null → plus
  // AUCUNE promotion, toutes les nuits, sans un log (B1g).
  const { data: prospects, error: prospErr } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('statut', 'prospect');
  if (prospErr) reportError('[cron/expirations] prospects err:', prospErr, { route: '/api/cron/expirations' });

  if (prospects?.length) {
    const toActivateSet = new Set();
    for (let i = 0; i < prospects.length; i += 200) {
      const lot = prospects.slice(i, i + 200).map(c => c.id);
      const { data: paidClientIds, error: paidErr } = await supabaseAdmin
        .from('paiements')
        .select('client_id')
        .eq('statut', 'paid')
        .in('client_id', lot);
      if (paidErr) {
        reportError('[cron/expirations] paiements prospects err:', paidErr, { route: '/api/cron/expirations' });
        continue;
      }
      for (const p of (paidClientIds || [])) toActivateSet.add(p.client_id);
    }
    const toActivate = [...toActivateSet];
    for (let i = 0; i < toActivate.length; i += 200) {
      const lot = toActivate.slice(i, i + 200);
      const { data: activated, error: actErr } = await supabaseAdmin
        .from('clients')
        .update({ statut: 'actif' })
        .in('id', lot)
        .eq('statut', 'prospect')
        .select('id');
      if (actErr) reportError('[cron/expirations] promotion err:', actErr, { route: '/api/cron/expirations' });
      promoCount += activated?.length || 0;
    }
  }

  // ⛔ ARCHIVAGE AUTOMATIQUE SUPPRIMÉ (2026-07-23, retour terrain Maude).
  // L'ancien bloc « actif/fidele → archive après 300j sans activité » archivait
  // des élèves ACTIFS en silence, pour trois raisons cumulées :
  //   1. aucun plancher sur clients.created_at → une fiche « actif » créée la
  //      veille sans présence/paiement était « inactive depuis 10 mois » par
  //      vacuité → archivée la nuit même ;
  //   2. les requêtes d'activité (globales, tous studios) plafonnaient à la
  //      limite PostgREST de 1000 lignes → élèves actifs invisibles au hasard
  //      du volume ;
  //   3. erreurs de requête non vérifiées (data null → « personne n'est
  //      actif » → archivage de masse possible).
  // Décision produit : l'archivage est désormais un geste MANUEL de la prof,
  // avec confirmation (liste/fiche/édition). Aucun statut n'est plus écrit
  // automatiquement vers 'archive'. Fiches archivées à tort : réparation SQL
  // one-shot dans fix-desarchivage-fantome.sql.

  // ── Relance de fin d'essai SaaS (J-3 / J-1) ───────────────────────────────
  // Email transactionnel au prof dont l'essai 14j se termine bientôt (conversion
  // vers un plan payant). Flags trial_reminder_sent_j3/j1 (v33) = anti-doublon.
  // Pas de push (cron à 3h ≈ 5h Paris) : le canal email + la bannière in-app
  // suffisent. ⚠️ Sûr depuis v57 (plus d'élèves fantômes en faux trial).
  let trialJ3 = 0, trialJ1 = 0;
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.izisolo.fr';
    const { data: trialProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, prenom, email_contact, plan, trial_started_at, stripe_subscription_status, trial_reminder_sent_j3, trial_reminder_sent_j1')
      .not('trial_started_at', 'is', null)
      .neq('plan', 'free');

    for (const prof of (trialProfiles || [])) {
      const st = getTrialStatus(prof);
      if (!st.active) continue;
      // email_contact = champ « contact PUBLIC » modifiable/vidable dans les
      // paramètres : fallback sur l'email de connexion (B1d — sinon la prof
      // qui a mis l'email du studio, ou l'a vidé, n'était JAMAIS relancée).
      let to = prof.email_contact;
      if (!to) {
        try {
          const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(prof.id);
          to = authUser?.email || null;
        } catch { /* compte auth introuvable : on skip proprement */ }
      }
      if (!to) continue;

      const isJ1 = st.daysLeft <= 1 && !prof.trial_reminder_sent_j1;
      const isJ3 = !isJ1 && st.daysLeft <= 3 && !prof.trial_reminder_sent_j3;
      if (!isJ1 && !isJ3) continue;

      const jours = st.daysLeft;
      // « demain » mentait : daysLeft=1 (ceil) peut signifier « expire dans
      // 4 h » (cron à 3 h) — on donne la date réelle (B1d).
      const finLe = st.endsAt
        ? new Date(st.endsAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' })
        : null;
      const sujet = jours <= 1
        ? `Ton essai IziSolo se termine ${finLe ? `le ${finLe}` : 'très bientôt'}`
        : `Ton essai IziSolo se termine dans ${jours} jours`;
      try {
        const r = await sendEmail({
          categorie: 'transactionnel',
          to,
          subject: sujet,
          html: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;">
              <h2 style="color:#b87333;margin:0 0 6px;">Ton essai touche à sa fin</h2>
              <p style="color:#555;margin:0 0 14px;">Bonjour ${prof.prenom || ''},</p>
              <p style="color:#555;margin:0 0 14px;">
                Ton essai gratuit de 14 jours se termine ${jours <= 1 ? (finLe ? `le ${finLe}` : 'très bientôt') : `dans ${jours} jours`}.
                Pour continuer à gérer ton studio sans interruption, choisis ton plan dès maintenant.
              </p>
              <div style="text-align:center;margin:24px 0;">
                <a href="${appUrl}/parametres?tab=abonnement" style="display:inline-block;padding:14px 28px;background:#b87333;color:white;text-decoration:none;border-radius:99px;font-weight:700;">
                  Choisir mon plan
                </a>
              </div>
              <p style="color:#999;margin:16px 0 0;font-size:0.8125rem;">
                Une question ? Réponds simplement à cet email.
              </p>
            </div>
          `,
        });
        // Échec d'envoi = PAS de flag (B1g) : le flag posé sur un envoi raté
        // signifiait « la prof ne sera JAMAIS relancée », conversion perdue
        // en silence. Et l'update du flag est lui aussi vérifié.
        if (!r.ok) {
          reportError('[cron/expirations] trial reminder envoi échoué:', String(r.error || r.skipped || 'send failed'), { route: '/api/cron/expirations' });
          continue;
        }
        const { error: flagErr } = await supabaseAdmin
          .from('profiles')
          .update(isJ1 ? { trial_reminder_sent_j1: true } : { trial_reminder_sent_j3: true })
          .eq('id', prof.id);
        if (flagErr) {
          reportError('[cron/expirations] flag trial err:', flagErr, { route: '/api/cron/expirations' });
          continue;
        }
        if (isJ1) trialJ1++; else trialJ3++;
      } catch (e) {
        reportError('[cron/expirations] trial reminder err', prof.id, e?.message);
      }
    }
  } catch (e) {
    reportError('[cron/expirations] trial reminders section:', e?.message);
  }

  // ── Emails d'onboarding J+1 / J+3 (2026-08-01, plan « aide utilisateur ») ──
  // J+1 « premier cours récurrent » (skip si des cours existent), J+3 « invite
  // tes élèves » (skip si des élèves existent). Fenêtres [1,3) et [3,7) jours —
  // pas de backfill des comptes plus anciens. Dédup par claim emails_envoyes
  // (type 'onboarding', ref profileId:j1|j3), libéré si l'envoi échoue.
  let onboardingJ1 = 0, onboardingJ3 = 0;
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.izisolo.fr';
    const now = new Date();
    const il7jours = new Date(now.getTime() - 7 * 86400000).toISOString();
    const { data: nouveaux, error: nouveauxErr } = await supabaseAdmin
      .from('profiles')
      .select('id, prenom, email_contact, created_at')
      .gte('created_at', il7jours);
    if (nouveauxErr) throw nouveauxErr;

    for (const prof of (nouveaux || [])) {
      try {
        // Compteurs d'activation (head:true = pas de données, juste le count)
        const [{ count: nbCours }, { count: nbClients }] = await Promise.all([
          supabaseAdmin.from('cours').select('id', { count: 'exact', head: true }).eq('profile_id', prof.id),
          supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }).eq('profile_id', prof.id),
        ]);
        const type = choisirEmailOnboarding(
          { createdAt: prof.created_at, nbCours: nbCours || 0, nbClients: nbClients || 0 },
          now
        );
        if (!type) continue;

        // Même fallback email que la relance trial (B1d) : email_contact est
        // public et vidable → l'email de connexion en secours.
        let to = prof.email_contact;
        if (!to) {
          try {
            const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(prof.id);
            to = authUser?.email || null;
          } catch { /* compte auth introuvable : skip */ }
        }
        if (!to) continue;

        // Claim AVANT envoi (un cron re-joué ne double-envoie pas)
        const ref = `${prof.id}:${type}`;
        const { data: claim, error: clErr } = await supabaseAdmin
          .from('emails_envoyes')
          .upsert(
            { type: 'onboarding', destinataire: to.toLowerCase(), ref },
            { onConflict: 'type,destinataire,ref', ignoreDuplicates: true }
          )
          .select('id');
        if (clErr) throw clErr;
        if ((claim || []).length === 0) continue; // déjà envoyé

        const { subject, html } = renderEmailOnboarding(type, { prenom: prof.prenom, appUrl });
        const r = await sendEmail({ categorie: 'notification', to, subject, html });
        if (!r.ok) {
          // Échec → claim libéré : retentative au prochain run (pattern B1g)
          await supabaseAdmin.from('emails_envoyes').delete()
            .match({ type: 'onboarding', destinataire: to.toLowerCase(), ref })
            .then(() => {}, () => {});
          if (!r.skipped) {
            reportError('[cron/expirations] onboarding envoi échoué:', String(r.error || 'send failed'), { route: '/api/cron/expirations' });
          }
          continue;
        }
        if (type === 'j1') onboardingJ1++; else onboardingJ3++;
      } catch (e) {
        reportError('[cron/expirations] onboarding err', prof.id, e?.message);
      }
    }
  } catch (e) {
    reportError('[cron/expirations] onboarding section:', e?.message);
  }

  return NextResponse.json({
    expires: data?.length || 0,
    epuises: epuises?.length || 0,
    promoActif: promoCount,
    autoArchive: 0, // archivage auto supprimé (2026-07-23) — geste manuel avec confirmation
    listeAttentePurgee,
    trialJ3,
    trialJ1,
    onboardingJ1,
    onboardingJ3,
    timestamp: new Date().toISOString(),
  });
});
