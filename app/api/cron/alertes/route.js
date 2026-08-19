import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { withRoute } from '@/lib/api-route';
import { sendNotifEleve } from '@/lib/notifs-eleves';
import { sendPushToEmail, sendPushToUser, claimCronPush } from '@/lib/push-server';
import { wantsNotif } from '@/lib/notif-prefs';
import { can } from '@/lib/plan-guard';
import { reportError } from '@/lib/report';
import { getVisioCoursMap, lienVisioVisible } from '@/lib/visio';

// Durée max explicite (fluid compute : 300 s = plafond Hobby)
export const maxDuration = 300;

/**
 * Cron quotidien (7h UTC ≈ 9h Paris) — RAPPEL DE COURS J-1.
 *
 * Pour chaque élève inscrit·e à un cours DEMAIN, envoie un rappel (email dédupé
 * + push), gaté sur sa préférence `rappel_cours` (défaut ON). Anti no-show +
 * laisse le temps d'annuler pour libérer la place.
 *
 * Dédup : sendNotifEleve insère dans notifications_eleves avec UNIQUE
 * (client_id, type, related_id, channel) → un rappel par réservation, jamais 2.
 */
export const GET = withRoute({ auth: 'cron' }, async () => {
  // « Demain » en heure de Paris (le serveur Vercel tourne en UTC).
  const parisDate = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 10);
  const d = new Date(parisDate + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  const demain = d.toISOString().slice(0, 10);

  // 1. Cours de demain, non annulés (tous studios) — PAGINÉ (AUDIT-PERF 2.2 :
  // le select nu plafonnait à 1000 → au-delà, des rappels J-1 disparaissaient
  // en silence). L'index cours(date) v89 porte ce scan.
  const coursDemain = [];
  for (let page = 0; page < 50; page++) {
    const { data: lot, error: cdErr } = await supabaseAdmin
      .from('cours')
      .select('id, nom, heure, lieu, profile_id, format')
      .eq('date', demain)
      .eq('est_annule', false)
      .order('id')
      .range(page * 1000, page * 1000 + 999);
    if (cdErr) {
      reportError('[cron/alertes] cours demain err:', cdErr, { route: '/api/cron/alertes' });
      break;
    }
    coursDemain.push(...(lot || []));
    if (!lot || lot.length < 1000) break;
  }
  if (!coursDemain || coursDemain.length === 0) {
    return NextResponse.json({ rappels: 0, sent: 0, demain });
  }
  const coursById = Object.fromEntries(coursDemain.map(c => [c.id, c]));
  const coursIds = coursDemain.map(c => c.id);
  const profileIds = [...new Set(coursDemain.map(c => c.profile_id))];

  // 2. Présences sur ces cours — par LOTS de 200 ids (limite d'URL
  // PostgREST : au-delà de ~200 cours/jour tous studios, la requête cassait
  // → zéro rappel J-1 ce jour-là, en silence — B1g) + erreurs lues.
  const presences = [];
  for (let i = 0; i < coursIds.length; i += 200) {
    const lot = coursIds.slice(i, i + 200);
    const { data: lotPres, error: presErr } = await supabaseAdmin
      .from('presences')
      .select('id, cours_id, client_id, statut_pointage, annulation_tardive, abonnement_id, type_presence')
      .in('cours_id', lot);
    if (presErr) {
      reportError('[cron/alertes] presences err:', presErr, { route: '/api/cron/alertes' });
      continue;
    }
    presences.push(...(lotPres || []));
  }
  // annulation_tardive : l'élève a annulé (et payé la sanction) — lui rappeler
  // « tu es inscrit·e demain ! » était vexant (audit 2026-07-25). Idem
  // absent_compte/declinee (statuts posés par la résolution de cas).
  const pres = (presences || []).filter(p =>
    p.client_id
    && !p.annulation_tardive
    && !['absent', 'excuse', 'annule', 'absent_compte', 'declinee'].includes(p.statut_pointage));
  if (pres.length === 0) {
    return NextResponse.json({ rappels: 0, sent: 0, demain });
  }

  // 3. Clients + profils en batch (pas de N+1).
  const clientIds = [...new Set(pres.map(p => p.client_id))];
  const clients = [];
  for (let i = 0; i < clientIds.length; i += 200) {
    const lot = clientIds.slice(i, i + 200);
    const { data: lotClients, error: cliErr } = await supabaseAdmin
      .from('clients')
      .select('id, prenom, nom, email, telephone, notif_prefs')
      .in('id', lot);
    if (cliErr) {
      reportError('[cron/alertes] clients err:', cliErr, { route: '/api/cron/alertes' });
      continue;
    }
    clients.push(...(lotClients || []));
  }
  const clientById = Object.fromEntries(clients.map(c => [c.id, c]));

  // Profils par lots de 200 (limite d'URL PostgREST — même règle que les
  // presences/clients ci-dessus, AUDIT-PERF 2.2).
  const profiles = [];
  for (let i = 0; i < profileIds.length; i += 200) {
    const lot = profileIds.slice(i, i + 200);
    const { data: lotProfs, error: profErr } = await supabaseAdmin
      .from('profiles')
      // plan + champs trial : le rappel J-1 est une capacité Complet (matrice
      // B3a, « espace élève connecté … rappels J-1 ») — sans ces champs, can()
      // lirait undefined et gâterait tout le monde.
      .select('id, studio_nom, studio_slug, email_contact, notifs_eleves, plan, trial_started_at, stripe_subscription_status')
      .in('id', lot);
    if (profErr) {
      reportError('[cron/alertes] profiles err:', profErr, { route: '/api/cron/alertes' });
      continue;
    }
    profiles.push(...(lotProfs || []));
  }
  const profileById = Object.fromEntries(profiles.map(p => [p.id, p]));

  const dateStr = new Date(demain + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  // Cours en ligne (v86) : le lien de visio entre dans le rappel J-1 selon LA
  // règle unique (lib/visio.lienVisioVisible) — jamais envoyé à une inscrite
  // dont la séance verrouillée n'est ni couverte ni réglée.
  const visioIds = coursDemain.filter(c => c.format === 'visio' || c.format === 'hybride').map(c => c.id);
  const visioMap = await getVisioCoursMap(supabaseAdmin, visioIds);
  const paidPres = new Set();
  {
    const presVisioIds = pres.filter(p => visioMap[p.cours_id]).map(p => p.id);
    for (let i = 0; i < presVisioIds.length; i += 200) {
      const lot = presVisioIds.slice(i, i + 200);
      const { data: paids, error: paidErr } = await supabaseAdmin
        .from('paiements').select('presence_id').in('presence_id', lot).eq('statut', 'paid');
      if (paidErr) { reportError('[cron/alertes] paiements visio err:', paidErr, { route: '/api/cron/alertes' }); continue; }
      for (const x of paids || []) paidPres.add(x.presence_id);
    }
  }

  // 4. Envoi (email dédupé + push), gaté sur la pref élève rappel_cours
  //    ET sur la capacité du studio (B3b : rappels J-1 = Complet).
  //    Par LOTS de 6 en parallèle (AUDIT-PERF 2.2 : la boucle séquentielle
  //    aurait crevé maxDuration vers 10-25k rappels/jour ; 6 = assez pour
  //    diviser le temps par ~5 sans marteler Resend/GoTrue).
  let sent = 0, skipped = 0, prefOff = 0, plansGates = 0;
  const traiterRappel = async (p) => {
    const client = clientById[p.client_id];
    const cours = coursById[p.cours_id];
    const profile = cours ? profileById[cours.profile_id] : null;
    if (!client || !cours || !profile) return;
    if (!can(profile, 'espace_eleve')) { plansGates++; return; }

    const prefs = client.notif_prefs;
    const wantEmail = wantsNotif(prefs, 'rappel_cours', 'eleve', 'email');
    const wantPush = wantsNotif(prefs, 'rappel_cours', 'eleve', 'push');
    if (!wantEmail && !wantPush) { prefOff++; return; }

    const heureStr = cours.heure ? cours.heure.slice(0, 5).replace(':', 'h') : '';
    const enLigne = cours.format === 'visio' || cours.format === 'hybride';
    const visio = enLigne ? (visioMap[p.cours_id] || null) : null;
    const lienOk = visio && lienVisioVisible(visio, p, paidPres.has(p.id) ? [{ statut: 'paid' }] : []);
    const lieuStr = enLigne ? ' — en ligne 🖥' : (cours.lieu ? ` — ${cours.lieu}` : '');
    const ligneVisio = lienOk
      ? `

🎥 Le lien pour rejoindre la séance : ${visio.lien_visio}`
      : (visio ? `

Le lien de la séance apparaîtra dans ton espace une fois ta séance réglée.` : '');

    try {
      // Email (canal indépendant, dédupé par sendNotifEleve)
      if (wantEmail) {
        const r = await sendNotifEleve(supabaseAdmin, {
          profile, client,
          type: 'rappel_cours',
          relatedId: p.id,
          // replyTo = la PROF : une élève qui répond « je ne pourrai pas
          // venir » écrivait chez IziSolo, le message se perdait (B1g —
          // la plomberie replyTo existait, aucun appelant ne la remplissait).
          proEmail: profile.email_contact || null,
          prefsOverride: { email: true, sms: false },
          contexte: { cours_nom: cours.nom, date: dateStr, heure: heureStr },
          templates: {
            email: {
              sujet: `Rappel : ${cours.nom} demain`,
              corps:
`Bonjour {{prenom}},

Petit rappel : tu es inscrit·e à la séance ${cours.nom} demain ${dateStr}${heureStr ? ` à ${heureStr}` : ''}${lieuStr} chez ${profile.studio_nom}.${ligneVisio}

À demain !`,
            },
          },
        });
        sent += r.sent;
        skipped += r.skipped;
      }

      // Push (canal indépendant, dédupé par claimCronPush)
      if (wantPush && client.email) {
        const fresh = await claimCronPush({ profileId: profile.id, clientId: client.id, type: 'rappel_cours', relatedId: p.id });
        if (fresh) {
          sendPushToEmail(client.email, {
            title: `Demain : ${cours.nom} ⏰`,
            body: `${dateStr}${heureStr ? ` à ${heureStr}` : ''}${lieuStr}`,
            url: profile.studio_slug ? `/p/${profile.studio_slug}/espace` : '/',
            tag: `rappel-${p.id}`,
          }, { type: 'rappel_cours', profileId: profile.id }).catch(() => {});
        }
      }
    } catch (e) {
      reportError('[cron alertes] rappel err', p.id, e?.message);
    }
  };
  for (let i = 0; i < pres.length; i += 6) {
    await Promise.all(pres.slice(i, i + 6).map(traiterRappel));
  }

  // ── Rappel de pointage (prof) — cours d'HIER non pointés ──────────────────
  // Défaut OFF (pref pointage_rappel) → seuls les profs qui l'activent le
  // reçoivent. Dédup 1×/jour via notifications.ref_key. Cloche + push.
  let pointageRappels = 0;
  try {
    const hierD = new Date(parisDate + 'T12:00:00Z');
    hierD.setUTCDate(hierD.getUTCDate() - 1);
    const hier = hierD.toISOString().slice(0, 10);

    // Paginé + chunké (AUDIT-PERF 2.2) — mêmes plafonds que la branche J-1.
    const coursHier = [];
    for (let page = 0; page < 50; page++) {
      const { data: lot, error: chErr } = await supabaseAdmin
        .from('cours').select('id, profile_id').eq('date', hier).eq('est_annule', false)
        .order('id').range(page * 1000, page * 1000 + 999);
      if (chErr) { reportError('[cron/alertes] cours hier err:', chErr, { route: '/api/cron/alertes' }); break; }
      coursHier.push(...(lot || []));
      if (!lot || lot.length < 1000) break;
    }
    if (coursHier && coursHier.length) {
      const hierIds = coursHier.map(c => c.id);
      const presH = [];
      for (let i = 0; i < hierIds.length; i += 200) {
        const { data: lotPres, error: phErr } = await supabaseAdmin
          .from('presences').select('cours_id, statut_pointage').in('cours_id', hierIds.slice(i, i + 200));
        if (phErr) { reportError('[cron/alertes] presences hier err:', phErr, { route: '/api/cron/alertes' }); continue; }
        presH.push(...(lotPres || []));
      }
      const nonPointes = new Set();
      for (const p of (presH || [])) {
        if (!p.statut_pointage || p.statut_pointage === 'inscrit') nonPointes.add(p.cours_id);
      }
      const parProfil = {};
      for (const c of coursHier) {
        if (nonPointes.has(c.id)) parProfil[c.profile_id] = (parProfil[c.profile_id] || 0) + 1;
      }
      const profIds = Object.keys(parProfil);
      if (profIds.length) {
        const profs = [];
        for (let i = 0; i < profIds.length; i += 200) {
          const { data: lotP } = await supabaseAdmin
            .from('profiles').select('id, notif_prefs').in('id', profIds.slice(i, i + 200));
          profs.push(...(lotP || []));
        }
        for (const prof of (profs || [])) {
          // La cloche (Appli) est l'ancre de dédup du rappel de pointage :
          // sans elle activée, on ne déclenche rien (feature niche, défaut OFF).
          if (!wantsNotif(prof.notif_prefs, 'pointage_rappel', 'prof', 'inapp')) continue;
          const wantPush = wantsNotif(prof.notif_prefs, 'pointage_rappel', 'prof', 'push');
          const n = parProfil[prof.id];
          const titre = `${n} cours non pointé${n > 1 ? 's' : ''} hier`;
          const corps = `Pense à pointer les présences pour fiabiliser tes carnets.`;
          // Dédup : ref_key par jour → un seul rappel, même si le cron re-tourne.
          const { data: ins } = await supabaseAdmin.from('notifications').upsert({
            profile_id: prof.id, type: 'pointage_rappel', titre, corps,
            ref_key: `pointage_${hier}`, lu: false,
          }, { onConflict: 'profile_id,ref_key', ignoreDuplicates: true }).select('id');
          if (ins && ins.length) {
            pointageRappels++;
            if (wantPush) sendPushToUser(prof.id, { title: titre, body: corps, url: '/agenda', tag: `pointage-${hier}` }, { type: 'pointage_rappel' }).catch(() => {});
          }
        }
      }
    }
  } catch (e) {
    reportError('[cron alertes] pointage rappel:', e?.message);
  }

  return NextResponse.json({
    rappels: pres.length,
    sent,
    skipped,
    prefOff,
    plans_gates: plansGates,
    pointageRappels,
    demain,
    timestamp: new Date().toISOString(),
  });
});
