/**
 * REFRESH du compte démo « L'Atelier Soleil » (Camille Leroux) — LE moteur.
 * ─────────────────────────────────────────────────────────────────────────────
 * Extrait du script CLI le 2026-08-18 (demande Colin : bouton dans l'admin)
 * pour être appelable des DEUX côtés :
 *   - CLI  : scripts/refresh-demo-atelier-soleil.mjs (wrapper mince)
 *   - Admin: POST /api/admin/demo/refresh (auth admin, maxDuration 300)
 *
 * Dates RELATIVES à la date du run : tout le seed est décalé d'un nombre
 * entier de semaines (jours de semaine préservés), TODAY simulé recule de
 * 0-6 j sans jamais avancer, anniversaires recalés sur le vrai jour,
 * textes datés calculés. Re-runnable à vie. Garde-fou : ne touche QUE le
 * profil atelier-soleil (vérifié par slug + email avant toute purge).
 *
 * @param {object} sb   client Supabase service_role
 * @param {object} opts { demoToday?: 'YYYY-MM-DD', log?: fn }
 * @returns {Promise<{failures: number}>}
 */
// eslint-disable-next-line no-console -- défaut CLI assumé : la sortie console EST le rapport du script
export async function refreshDemoAtelierSoleil(sb, { demoToday = null, log = console.log } = {}) {
  const PROFILE_ID = '17a6194a-87e6-47e2-ac31-c6224cd78f44'; // L'Atelier Soleil
  // ── Ancrage temporel RELATIF (2026-08-18, programme démo) ────────────────────
  // Le seed original était ancré au 13/08/2026. On décale TOUT d'un nombre
  // ENTIER de semaines vers la date du run : les jours de semaine sont préservés
  // (séries hebdo, « vendredi » de la pleine lune, clés `serie:date`), et le
  // « aujourd'hui simulé » (TODAY) RECULE de 0 à 6 jours sur le vrai jour, jamais
  // en avance (floor) : aucune séance future « déjà pointée » — au pire, quelques
  // séances récentes restent à pointer (réaliste, et parfait pour une démo de
  // pointage en direct). Les anniversaires d'Emma/Bastien sont recalés sur le
  // VRAI aujourd'hui (la cloche les dérive de date_naissance vs date réelle).
  // Les textes datés des messages sont calculés (fmtLong/fmtJM), jamais en dur.
  // Test du décalage sans attendre : DEMO_TODAY=2026-10-06 node scripts/…
  const ANCHOR = '2026-08-13';
  const REAL_TODAY = demoToday || new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  const addDaysRaw = (iso, n) => { const dt = new Date(`${iso}T12:00:00Z`); dt.setUTCDate(dt.getUTCDate() + n); return dt.toISOString().slice(0, 10); };
  const daysBetween = (a, b) => Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 86400000);
  const OFFSET = Math.floor(daysBetween(ANCHOR, REAL_TODAY) / 7) * 7; // semaines entières, jamais en avance
  const D = (iso) => addDaysRaw(iso, OFFSET); // décale une date du seed original
  const TODAY = D(ANCHOR); // « aujourd'hui simulé » (±3 j du réel)
  const YEST = addDaysRaw(TODAY, -1);
  const WINDOW_START = D('2026-07-27'); // 1re occurrence des séries
  const WINDOW_END = D('2026-09-26');   // dernière occurrence
  const ANNIV_AUJ = '1991-' + REAL_TODAY.slice(5);                   // Emma — anniversaire le jour du run
  const ANNIV_DEMAIN = '1991-' + addDaysRaw(REAL_TODAY, 1).slice(5); // Bastien — demain
  const fmtJM = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  const jourDe = (iso) => String(parseInt(iso.slice(8, 10), 10));
  const fmtJMois = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const fmtLong = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  log(`Ancrage : aujourd'hui réel ${REAL_TODAY} · décalage ${OFFSET} j · TODAY simulé ${TODAY}`);

  // ── Helpers dates (Europe/Paris = UTC+2 sur juil→sept 2026) ──────────────────
  const T = (d, h) => `${d}T${h}:00+02:00`;
  const addDays = (iso, n) => {
    const dt = new Date(`${iso}T12:00:00Z`); dt.setUTCDate(dt.getUTCDate() + n);
    return dt.toISOString().slice(0, 10);
  };
  const weekday = (iso) => { const w = new Date(`${iso}T12:00:00Z`).getUTCDay(); return w === 0 ? 7 : w; }; // 1=lundi…7=dimanche
  const datesFor = (jour) => { // toutes les dates du jour de semaine dans la fenêtre
    const out = [];
    for (let d = WINDOW_START; d <= WINDOW_END; d = addDays(d, 1)) if (weekday(d) === jour) out.push(d);
    return out;
  };
  const plusMin = (h, n) => {
    const [hh, mm] = h.split(':').map(Number);
    const t = hh * 60 + mm + n;
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  };

  let failures = 0;
  const die = (step, error) => { throw new Error(`${step}: ${error?.message || error}`); };
  const soft = (step, error) => { if (error) { failures++; log(`⚠️ ${step}: ${error.message}`); } };

  // ═════════════════════════════════════════════════════════════════════════════
  // 0. GARDE-FOU — on ne touche QUE l'Atelier Soleil
  // ═════════════════════════════════════════════════════════════════════════════
  const { data: prof, error: eProf } = await sb.from('profiles')
    .select('id, studio_slug, email_contact, studio_nom, plan, stripe_subscription_status, types_cours, notif_prefs')
    .eq('id', PROFILE_ID).single();
  if (eProf) die('profil', eProf);
  if (prof.studio_slug !== 'atelier-soleil' || prof.email_contact !== 'camille@atelier-soleil.fr') {
    die('garde-fou', `profil inattendu (${prof.studio_slug} / ${prof.email_contact}) — abandon`);
  }
  log(`🎯 Studio : ${prof.studio_nom} (${prof.studio_slug}) — plan ${prof.plan}/${prof.stripe_subscription_status}`);

  // Fiches à préserver (liées à un vrai compte auth)
  const { data: fichesReelles } = await sb.from('clients')
    .select('id, prenom, nom, email').eq('profile_id', PROFILE_ID).not('auth_user_id', 'is', null);
  log(`🔒 Fiches préservées (compte auth lié) : ${(fichesReelles || []).map(f => f.email).join(', ') || 'aucune'}`);

  // ═════════════════════════════════════════════════════════════════════════════
  // 1. PURGE (ordre FK sûr — cheat sheet agent ; tout scopé au profil)
  // ═════════════════════════════════════════════════════════════════════════════
  log('\n🧹 PURGE…');

  // Facturation v84 (avant paiements)
  {
    const { data: fx } = await sb.from('factures').select('id').eq('profile_id', PROFILE_ID);
    if (fx?.length) {
      soft('factures_paiements', (await sb.from('factures_paiements').delete().in('facture_id', fx.map(f => f.id))).error);
      soft('factures', (await sb.from('factures').delete().eq('profile_id', PROFILE_ID)).error);
    }
  }
  // Messagerie (enfants → parent)
  {
    const { data: convs } = await sb.from('conversations').select('id').eq('profile_id', PROFILE_ID);
    const convIds = (convs || []).map(c => c.id);
    if (convIds.length) {
      const { data: msgs } = await sb.from('messages').select('id').in('conversation_id', convIds);
      const msgIds = (msgs || []).map(m => m.id);
      if (msgIds.length) soft('messages_reactions', (await sb.from('messages_reactions').delete().in('message_id', msgIds)).error);
      soft('messages', (await sb.from('messages').delete().in('conversation_id', convIds)).error);
      soft('conversation_members', (await sb.from('conversation_members').delete().in('conversation_id', convIds)).error);
      soft('conversations', (await sb.from('conversations').delete().eq('profile_id', PROFILE_ID)).error);
    }
  }
  // Sondages (3 niveaux)
  {
    const { data: sondages } = await sb.from('sondages_planning').select('id').eq('profile_id', PROFILE_ID);
    const sIds = (sondages || []).map(s => s.id);
    if (sIds.length) {
      const { data: cren } = await sb.from('sondages_creneaux').select('id').in('sondage_id', sIds);
      const crIds = (cren || []).map(c => c.id);
      if (crIds.length) soft('sondages_reponses', (await sb.from('sondages_reponses').delete().in('creneau_id', crIds)).error);
      soft('sondages_creneaux', (await sb.from('sondages_creneaux').delete().in('sondage_id', sIds)).error);
      soft('sondages_planning', (await sb.from('sondages_planning').delete().eq('profile_id', PROFILE_ID)).error);
    }
  }
  // Journaux / engagement
  for (const t of ['notifications', 'notifications_eleves', 'messages_envoyes', 'liste_attente', 'cours_essai_demandes']) {
    soft(t, (await sb.from(t).delete().eq('profile_id', PROFILE_ID)).error);
  }
  // Métier (ordre strict : paiements AVANT presences — FK presence_id v65)
  for (const t of ['cas_a_traiter', 'paiements', 'presences', 'inscriptions_evenements', 'abonnements', 'cours', 'recurrences', 'evenements', 'videos_cours', 'templates_communication', 'mailings']) {
    soft(t, (await sb.from(t).delete().eq('profile_id', PROFILE_ID)).error);
  }
  // Clients fictifs seulement (préserve les fiches à compte auth)
  soft('clients (fictifs)', (await sb.from('clients').delete().eq('profile_id', PROFILE_ID).is('auth_user_id', null)).error);
  soft('offres', (await sb.from('offres').delete().eq('profile_id', PROFILE_ID)).error);
  // lieux : conservés (Salle Lumière + Salle du Parc)
  log('🧹 purge OK');

  const { data: lieux } = await sb.from('lieux').select('id, nom').eq('profile_id', PROFILE_ID).order('ordre');
  if (!lieux?.length) die('lieux', 'aucun lieu — inattendu');
  const LUMIERE = lieux.find(l => l.nom.includes('Lumière'))?.id || lieux[0].id;
  const PARC = lieux.find(l => l.nom.includes('Parc'))?.id || lieux[lieux.length - 1].id;

  // ═════════════════════════════════════════════════════════════════════════════
  // 2. PROFIL — types de cours yoga, bio portail, digest email prof OFF
  // ═════════════════════════════════════════════════════════════════════════════
  {
    const types = Array.from(new Set([...(prof.types_cours || []), 'Yoga', 'Yoga enfants']));
    const notifPrefs = { ...(prof.notif_prefs || {}), message: { ...(prof.notif_prefs?.message || {}), email: false } };
    const { error } = await sb.from('profiles').update({
      types_cours: types,
      bio: "Pilates & yoga au cœur de Bordeaux. Petits groupes (8 à 12), beaucoup d'attention, zéro esprit de compétition 🌞",
      annees_experience: 9,
      website_url: null,
      page_publique_draft: null,
      afficher_tarifs: true,
      notif_prefs: notifPrefs, // digest messagerie email OFF (adresse du studio fictive)
    }).eq('id', PROFILE_ID);
    if (error) die('profil update', error);
    log('👤 profil mis à jour (types + bio + tarifs affichés)');
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // 3. OFFRES
  // ═════════════════════════════════════════════════════════════════════════════
  const offresRows = [
    { profile_id: PROFILE_ID, nom: 'Carnet 5 séances', type: 'carnet', seances: 5, duree_jours: 90, prix: 80, actif: true, ordre: 1 },
    { profile_id: PROFILE_ID, nom: 'Carnet 10 séances', type: 'carnet', seances: 10, duree_jours: 150, prix: 140, actif: true, ordre: 2 },
    { profile_id: PROFILE_ID, nom: 'Abonnement mensuel illimité', type: 'abonnement', seances: null, duree_jours: 30, prix: 99, actif: true, ordre: 3 },
  ];
  const { data: offres, error: eOffres } = await sb.from('offres').insert(offresRows).select('id, nom, type, seances, duree_jours, prix');
  if (eOffres) die('offres', eOffres);
  const O = { c5: offres[0], c10: offres[1], abo: offres[2] };
  log(`🎫 offres : ${offres.map(o => o.nom).join(' · ')}`);

  // ═════════════════════════════════════════════════════════════════════════════
  // 4. ÉLÈVES
  // ═════════════════════════════════════════════════════════════════════════════
  // Prefs élève : tout OFF (emails @example.com → aucun envoi réel par les crons)
  const PREFS_OFF = {
    rappel_cours: { email: false, push: false }, cours_annule: { email: false, push: false },
    place_liberee: { email: false, push: false }, carnet: { email: false, push: false },
    message: { email: false, push: false }, paiement: { push: false }, essai: { push: false },
  };
  const mail = (p, n) => `${p}.${n}`.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z.]/g, '') + '@example.com';

  const CAST = [
    // clé, prénom, nom, ddn, ville, statut, niveau, source, créée le, notes, tel
    ['lea',     'Léa',     'Marchand',  '1992-03-14', 'Bordeaux', 'fidele',   'Intermédiaire', 'Instagram',        '2026-02-10', 'Toujours au premier rang — adore les équilibres.', '06 41 22 87 03'],
    ['sophie',  'Sophie',  'Bergeron',  '1985-08-16', 'Bordeaux', 'actif',    'Avancé',        'Bouche à oreille', '2026-03-02', null, '06 52 18 44 91'],
    ['emma',    'Emma',    'Costa',     ANNIV_AUJ, 'Talence',  'fidele',   'Intermédiaire', 'Instagram',        '2026-02-24', null, '06 63 05 77 12'],
    ['chloe',   'Chloé',   'Dubreuil',  '1997-05-02', 'Bordeaux', 'actif',    'Débutant',      'Google',           '2026-06-18', null, '06 74 90 21 55'],
    ['ines',    'Inès',    'Bachiri',   '1998-08-20', 'Bordeaux', 'actif',    'Intermédiaire', 'Instagram',        '2026-08-06', null, '06 85 33 60 28'],
    ['margaux', 'Margaux', 'Sentier',   '1994-06-30', 'Le Bouscat', 'actif',  'Tous niveaux',  'Bouche à oreille', '2026-05-11', 'Lombaires sensibles — proposer les adaptations.', '06 96 47 15 82'],
    ['thomas',  'Thomas',  'Rivière',   '1982-02-11', 'Bordeaux', 'actif',    'Intermédiaire', 'Google',           '2026-04-07', null, '06 07 51 38 46'],
    ['nadia',   'Nadia',   'El Amrani', '1987-09-09', 'Pessac',   'actif',    'Avancé',        'Bouche à oreille', '2026-03-30', null, '06 18 62 49 73'],
    ['lucie',   'Lucie',   'Fabre',     '1990-01-25', 'Bordeaux', 'actif',    'Débutant',      'Événement',        '2026-07-29', 'Maman de Maë (7 ans) — yoga enfants le mercredi.', '06 29 73 50 84'],
    ['anouk',   'Anouk',   'Pelletier', '1996-04-18', 'Bègles',   'actif',    'Intermédiaire', 'Instagram',        '2026-06-02', null, '06 30 84 61 95'],
    ['claire',  'Claire',  'Vasseur',   '1979-10-07', 'Bordeaux', 'actif',    'Débutant',      'Bouche à oreille', '2026-07-20', null, '06 41 95 72 06'],
    ['hugo',    'Hugo',    'Bianchi',   '1993-07-19', 'Bordeaux', 'prospect', 'Débutant',      'Portail IziSolo',  '2026-08-05', `Venu via un cours d'essai le ${fmtJM(D('2026-08-08'))} — à relancer.`, '06 52 06 83 17'],
    ['elise',   'Élise',   'Ferrand',   '1975-11-30', 'Bordeaux', 'fidele',   'Avancé',        'Bouche à oreille', '2026-02-12', null, '06 63 17 94 28'],
    ['marion',  'Marion',  'Dutertre',  '1988-03-03', 'Mérignac', 'actif',    'Intermédiaire', 'Instagram',        '2026-05-26', null, '06 74 28 05 39'],
    ['salome',  'Salomé',  'Nguyen',    '2000-09-12', 'Bordeaux', 'actif',    'Débutant',      'Instagram',        '2026-07-31', null, '06 85 39 16 40'],
    ['bastien', 'Bastien', 'Morel',     ANNIV_DEMAIN, 'Talence',  'actif',    'Débutant',      'Google',           '2026-08-03', null, '06 96 40 27 51'],
    ['justine', 'Justine', 'Aubert',    '1986-12-14', 'Bordeaux', 'actif',    'Tous niveaux',  'Événement',        '2026-06-25', 'Vient aux ateliers — règle sur place à la séance.', '06 07 61 38 62'],
    // Nouvelles venues via le portail (pleine lune)
    ['apolline', 'Apolline', 'Garcia',   '1995-02-27', 'Bordeaux', 'prospect', null, 'Portail IziSolo', '2026-08-10', 'Amie de Léa — venue pour la pleine lune 🌕', '06 18 72 49 73'],
    ['maelys',  'Maëlys',  'Berthier',  '1999-07-04', 'Bègles',   'prospect', null, 'Portail IziSolo', '2026-08-12', null, '06 29 83 50 84'],
    ['louise',  'Louise',  'Brun',      '1992-10-19', 'Bordeaux', 'prospect', null, 'Portail IziSolo', '2026-08-12', null, '06 30 94 61 95'],
    ['zoe',     'Zoé',     'Lambert',   '1997-01-08', 'Bordeaux', 'prospect', null, 'Portail IziSolo', '2026-08-12', null, '06 41 05 72 06'],
    ['thea',    'Théa',    'Vidal',     '1994-09-23', 'Talence',  'prospect', null, 'Portail IziSolo', '2026-08-12', null, '06 52 16 83 17'],
    ['romain',  'Romain',  'Costes',    '1989-05-15', 'Bordeaux', 'prospect', null, 'Portail IziSolo', '2026-08-13', null, '06 63 27 94 28'],
  ];
  // Enfants (yoga océan) — pas d'email → aucun flux mail possible
  const KIDS = [
    ['mae',    'Maë',    'Fabre',  '2019-03-12', 'Yoga enfants — contact : Lucie Fabre (maman).'],
    ['jade',   'Jade',   'Moreau', '2018-11-05', 'Yoga enfants — copine de Maë. Contact : Lucie Fabre.'],
    ['nino',   'Nino',   'Perez',  '2019-06-21', 'Yoga enfants — contact : papa au 06 74 39 16 40.'],
    ['leonie', 'Léonie', 'Chan',   '2018-09-30', 'Yoga enfants — contact : maman au 06 85 40 27 51.'],
    ['suzanne','Suzanne','Bidart', '2019-01-17', 'Yoga enfants — contact : papa au 06 96 51 38 62.'],
  ];
  const clientRows = [
    ...CAST.map(([, prenom, nom, ddn, ville, statut, niveau, source, created, notes, tel]) => ({
      profile_id: PROFILE_ID, prenom, nom, email: mail(prenom, nom), telephone: tel,
      date_naissance: ddn, ville, statut, niveau, source, notes,
      type_client: 'particulier', notif_prefs: PREFS_OFF, created_at: T(D(created), '10:00'),
    })),
    ...KIDS.map(([, prenom, nom, ddn, notes]) => ({
      profile_id: PROFILE_ID, prenom, nom, email: null, telephone: null,
      date_naissance: ddn, ville: 'Bordeaux', statut: 'actif', niveau: null, source: 'Événement', notes,
      type_client: 'particulier', notif_prefs: PREFS_OFF, created_at: T(D('2026-08-08'), '11:00'),
    })),
  ];
  const { data: clients, error: eClients } = await sb.from('clients').insert(clientRows).select('id, prenom, nom, email');
  if (eClients) die('clients', eClients);
  const C = {}; // clé → {id, prenom, nom, email}
  [...CAST, ...KIDS].forEach((row, i) => { C[row[0]] = clients[i]; });
  log(`🧑‍🤝‍🧑 élèves : ${clients.length} fiches créées (+ ${(fichesReelles || []).length} préservées)`);

  // ═════════════════════════════════════════════════════════════════════════════
  // 5. SÉRIES + COURS (occurrences) + ÉVÈNEMENTS
  // ═════════════════════════════════════════════════════════════════════════════
  const SERIES = [
    { key: 'mat',    nom: 'Pilates Mat — niveau 1&2', type_cours: 'Mat',          jour: 1, heure: '18:30', duree: 55, cap: 12, lieu: LUMIERE },
    { key: 'flow',   nom: 'Yoga Flow — pause déj',    type_cours: 'Yoga',         jour: 2, heure: '12:15', duree: 45, cap: 12, lieu: LUMIERE },
    { key: 'reformer', nom: 'Reformer — petit groupe', type_cours: 'Reformer',    jour: 3, heure: '18:00', duree: 55, cap: 8,  lieu: LUMIERE },
    { key: 'barre',  nom: 'Barre au sol',             type_cours: 'Barre au sol', jour: 4, heure: '19:00', duree: 55, cap: 10, lieu: PARC },
    { key: 'doux',   nom: 'Pilates doux',             type_cours: 'Mat',          jour: 5, heure: '10:30', duree: 55, cap: 8,  lieu: LUMIERE },
    { key: 'stretch', nom: 'Stretching & mobilité',   type_cours: 'Stretching',   jour: 6, heure: '10:00', duree: 45, cap: 12, lieu: PARC },
  ];
  const coursByKey = {}; // 'mat:2026-08-10' → cours row ; 'ev:pl' → row
  for (const s of SERIES) {
    const { data: rec, error: eRec } = await sb.from('recurrences').insert({
      profile_id: PROFILE_ID, nom: s.nom, type_cours: s.type_cours, heure: s.heure,
      duree_minutes: s.duree, lieu_id: s.lieu, capacite_max: s.cap,
      frequence: 'hebdomadaire', jours_semaine: [s.jour], intervalle: 1,
      date_debut: WINDOW_START, date_fin: WINDOW_END, actif: true,
    }).select('id').single();
    if (eRec) die(`recurrence ${s.key}`, eRec);
    const occRows = datesFor(s.jour).map(date => ({
      profile_id: PROFILE_ID, nom: s.nom, type_cours: s.type_cours, date, heure: s.heure,
      duree_minutes: s.duree, lieu_id: s.lieu, capacite_max: s.cap,
      recurrence_parent_id: rec.id, est_annule: false, format: 'presentiel',
      visibilite: 'public', tarif_unitaire: null, carnets_acceptes: false,
    }));
    const { data: occs, error: eOccs } = await sb.from('cours').insert(occRows).select('id, date');
    if (eOccs) die(`cours ${s.key}`, eOccs);
    occs.forEach(o => { coursByKey[`${s.key}:${o.date}`] = o; });
  }
  const EVENTS = [
    { key: 'pl',    nom: 'Yoga Pleine Lune 🌕', type_cours: 'Yoga', date: D('2026-08-28'), heure: '20:30', duree: 75, cap: 16, lieu: PARC, tarif: 25, notes: "Séance douce au coucher du soleil, suivie d'une tisane sous les arbres. Amène ton tapis et un plaid !" },
    { key: 'ocean', nom: 'Yoga enfants — thème Océan 🐠', type_cours: 'Yoga enfants', date: D('2026-08-26'), heure: '15:00', duree: 45, cap: 8, lieu: LUMIERE, tarif: 12, notes: 'Pour les 6-10 ans : vagues, crabes et étoiles de mer au programme.' },
    { key: 'rentree', nom: 'Atelier Rentrée : Pilates & brunch', type_cours: 'Mat', date: D('2026-09-12'), heure: '10:00', duree: 120, cap: 12, lieu: LUMIERE, tarif: 35, notes: '2 h de pratique + brunch maison pour lancer la saison ensemble.' },
    { key: 'sonore', nom: 'Bain sonore & étirements', type_cours: 'Stretching', date: D('2026-09-20'), heure: '18:00', duree: 75, cap: 14, lieu: PARC, tarif: 28, notes: 'Bols tibétains et étirements profonds — repartez sur un nuage.' },
  ];
  for (const ev of EVENTS) {
    const { data, error } = await sb.from('cours').insert({
      profile_id: PROFILE_ID, nom: ev.nom, type_cours: ev.type_cours, date: ev.date, heure: ev.heure,
      duree_minutes: ev.duree, lieu_id: ev.lieu, capacite_max: ev.cap,
      est_annule: false, format: 'presentiel', visibilite: 'public',
      tarif_unitaire: ev.tarif, carnets_acceptes: false, notes: ev.notes,
    }).select('id, date').single();
    if (error) die(`évènement ${ev.key}`, error);
    coursByKey[`ev:${ev.key}`] = data;
  }
  const nbCours = Object.keys(coursByKey).length;
  log(`📅 cours : ${nbCours} séances (6 séries + 4 évènements)`);

  // ═════════════════════════════════════════════════════════════════════════════
  // 6. CARNETS & ABOS (compteurs = présences liées, vérifié plus bas)
  // ═════════════════════════════════════════════════════════════════════════════
  const CARNETS = [
    // clé client, offre, début, utilisées
    ['lea',     'c10', '2026-07-27', 6], ['emma',   'c10', '2026-07-06', 9],
    ['thomas',  'c10', '2026-07-15', 4], ['anouk',  'c10', '2026-07-20', 3],
    ['bastien', 'c10', '2026-08-05', 2], ['ines',   'c10', '2026-08-10', 1],
    ['elise',   'c10', '2026-07-25', 8],
    ['chloe',   'c5',  '2026-07-28', 2], ['nadia',  'c5',  '2026-07-20', 3],
    ['salome',  'c5',  '2026-08-04', 2], ['lucie',  'c5',  '2026-08-05', 1],
    ['claire',  'c5',  '2026-07-28', 2], // paiement en attente (cf. §7)
  ];
  const ABOS = [
    ['margaux', '2026-07-01', '2026-07-31', 'expire'],
    ['margaux', '2026-08-01', '2026-08-31', 'actif'],
    ['sophie',  '2026-08-01', '2026-08-31', 'actif'],
    ['marion',  '2026-08-01', '2026-08-31', 'actif'],
  ];
  const aboRows = [
    ...CARNETS.map(([c, o, debut, used]) => ({
      profile_id: PROFILE_ID, client_id: C[c].id, offre_id: O[o].id, offre_nom: O[o].nom,
      type: 'carnet', date_debut: D(debut), date_fin: addDays(D(debut), O[o].duree_jours),
      seances_total: O[o].seances, seances_utilisees: used, statut: 'actif',
      created_at: T(D(debut), '10:30'),
    })),
    ...ABOS.map(([c, debut, fin, statut]) => ({
      profile_id: PROFILE_ID, client_id: C[c].id, offre_id: O.abo.id, offre_nom: O.abo.nom,
      type: 'abonnement', date_debut: D(debut), date_fin: D(fin),
      seances_total: null, seances_utilisees: 0, statut,
      created_at: T(D(debut), '09:00'),
    })),
  ];
  const { data: abos, error: eAbos } = await sb.from('abonnements').insert(aboRows).select('id, client_id, type, statut, date_debut');
  if (eAbos) die('abonnements', eAbos);
  const carnetOf = {}; // clé client → abonnement_id (carnet OU abo actif, pour lier les présences)
  CARNETS.forEach(([c], i) => { carnetOf[c] = abos[i].id; });
  const aboActifOf = {};
  ABOS.forEach(([c, , , statut], i) => { const row = abos[CARNETS.length + i]; if (statut === 'actif') aboActifOf[c] = row.id; else aboActifOf[`${c}:juillet`] = row.id; });
  log(`🎟️ carnets/abos : ${abos.length}`);

  // ═════════════════════════════════════════════════════════════════════════════
  // 7. PRÉSENCES — passées pointées, futures réservées, évènements
  // ═════════════════════════════════════════════════════════════════════════════
  // Rosters par série : [cléClient, depuis?] — depuis = 1re date d'assiduité
  const ROSTERS = {
    mat:      [['emma'], ['thomas'], ['elise'], ['margaux'], ['marion', '2026-08-01'], ['sophie', '2026-08-01'], ['bastien', '2026-08-05']],
    flow:     [['lea'], ['anouk'], ['margaux'], ['marion', '2026-08-01'], ['sophie', '2026-08-01'], ['ines', '2026-08-10']],
    reformer: [['elise'], ['nadia'], ['margaux'], ['lea'], ['emma'], ['salome', '2026-08-06']],
    barre:    [['chloe'], ['margaux'], ['marion', '2026-08-01'], ['salome', '2026-08-06'], ['bastien', '2026-08-05'], ['lucie', '2026-08-13'], ['ines', '2026-08-13']],
    doux:     [['claire'], ['justine'], ['elise'], ['margaux'], ['lucie', '2026-08-07']],
    stretch:  [['justine'], ['emma'], ['sophie', '2026-08-01'], ['chloe', '2026-08-08'], ['lea', '2026-08-15']],
  };
  // Écarts ponctuels : absente non prévenue (cas), annulation tardive (cas), excusée
  const SPECIAL = {
    [`flow:${D('2026-08-11')}:anouk`]: { statut_pointage: 'absent', motif_absence: null },
    [`barre:${D('2026-08-06')}:chloe`]: { statut_pointage: 'annule', annulation_tardive: true, est_due: true, motif_due: 'Annulation 2 h avant la séance' },
    [`mat:${D('2026-08-10')}:marion`]: { statut_pointage: 'excuse', motif_absence: 'Prévenue le matin — souci de garde' },
  };
  // Le lien carnet : carnet si présent·e, sinon abo actif (juillet pour les dates < 01/08)
  const lienAbo = (c, date) => {
    if (carnetOf[c]) return carnetOf[c];
    if (aboActifOf[c] && date >= D('2026-08-01')) return aboActifOf[c];
    if (aboActifOf[`${c}:juillet`] && date < D('2026-08-01')) return aboActifOf[`${c}:juillet`];
    return null;
  };

  const presenceRows = [];
  const linkedPresentCount = {}; // clé client → nb de présences 'present' liées à SON CARNET (vérif compteurs)
  for (const s of SERIES) {
    for (const date of datesFor(s.jour)) {
      const cours = coursByKey[`${s.key}:${date}`];
      const past = date < TODAY;
      // Au-delà de 2 semaines dans le futur, on n'inscrit presque personne (réaliste)
      const farFuture = date > addDays(TODAY, 13);
      for (let i = 0; i < ROSTERS[s.key].length; i++) {
        const [c, since] = ROSTERS[s.key][i];
        if (since && date < D(since)) continue;
        if (farFuture && i >= 2 + (s.jour % 3)) continue; // septembre clairsemé
        const special = SPECIAL[`${s.key}:${date}:${c}`];
        const abo = lienAbo(c, date);
        const row = {
          profile_id: PROFILE_ID, cours_id: cours.id, client_id: C[c].id,
          abonnement_id: abo, type_presence: 'normal', payer_plus_tard: false,
          annulation_tardive: false, est_due: false,
          created_at: T(addDays(date, -(1 + ((i + s.jour) % 5))), `${10 + (i % 9)}:${15 + (i % 4) * 10}`),
          ...(past
            ? { statut_pointage: 'present', pointee: true, heure_pointage: T(date, plusMin(s.heure, 5)) }
            : { statut_pointage: 'inscrit', pointee: false }),
          ...(special || {}),
        };
        if (special) {
          row.pointee = past && special.statut_pointage !== 'annule';
          if (special.statut_pointage !== 'present' && special.statut_pointage !== 'excuse') row.heure_pointage = null;
        }
        presenceRows.push(row);
        if (row.statut_pointage === 'present' && abo && carnetOf[c] === abo) {
          linkedPresentCount[c] = (linkedPresentCount[c] || 0) + 1;
        }
      }
    }
  }
  // Essai d'Hugo (Stretching du 08/08, gratuit, sans carnet)
  presenceRows.push({
    profile_id: PROFILE_ID, cours_id: coursByKey[`stretch:${D('2026-08-08')}`].id, client_id: C.hugo.id,
    abonnement_id: null, type_presence: 'essai', statut_pointage: 'present', pointee: true,
    heure_pointage: T(D('2026-08-08'), '10:05'), created_at: T(D('2026-08-05'), '09:12'),
  });
  // La réservation « sans carnet » de Justine (cas à traiter) — Mat du 17/08
  presenceRows.push({
    profile_id: PROFILE_ID, cours_id: coursByKey[`mat:${D('2026-08-17')}`].id, client_id: C.justine.id,
    abonnement_id: null, type_presence: 'normal', statut_pointage: 'inscrit', pointee: false,
    payer_plus_tard: true, created_at: T(D('2026-08-12'), '10:12'),
  });
  // Reformer du 19/08 : 2 venues ponctuelles → 8/8 COMPLET (l'annonce du canal + la liste d'attente)
  for (const c of ['sophie', 'thomas']) {
    presenceRows.push({
      profile_id: PROFILE_ID, cours_id: coursByKey[`reformer:${D('2026-08-19')}`].id, client_id: C[c].id,
      abonnement_id: lienAbo(c, D('2026-08-19')), type_presence: 'normal', statut_pointage: 'inscrit', pointee: false,
      created_at: T(D('2026-08-11'), c === 'sophie' ? '09:40' : '11:05'),
    });
  }
  // Évènements
  const EV_INSCRITS = {
    pl: ['lea', 'sophie', 'emma', 'ines', 'margaux', 'thomas', 'nadia', 'lucie', 'elise', 'marion', 'salome', 'bastien', 'justine', 'apolline', 'maelys', 'louise'], // 16/16 COMPLET
    ocean: ['mae', 'jade', 'nino', 'leonie', 'suzanne'], // 5/8
    rentree: ['lea', 'sophie', 'elise', 'marion', 'justine', 'lucie', 'claire'], // 7/12
    sonore: ['nadia', 'margaux', 'emma', 'thomas'], // 4/14
  };
  for (const [evKey, inscrits] of Object.entries(EV_INSCRITS)) {
    const cours = coursByKey[`ev:${evKey}`];
    inscrits.forEach((c, i) => {
      presenceRows.push({
        profile_id: PROFILE_ID, cours_id: cours.id, client_id: C[c].id,
        abonnement_id: null, type_presence: 'normal', statut_pointage: 'inscrit', pointee: false,
        created_at: T(addDays(TODAY, -(1 + (i % 6))), `${9 + (i % 10)}:${5 + (i % 5) * 10}`),
      });
    });
  }
  const { data: presences, error: ePres } = await sb.from('presences').insert(presenceRows).select('id, cours_id, client_id');
  if (ePres) die('presences', ePres);
  const findPresence = (coursId, clientId) => presences.find(p => p.cours_id === coursId && p.client_id === clientId);
  log(`✅ présences : ${presences.length}`);

  // Vérif compteurs carnets : utilisées ≥ présences liées pointées (l'écart = usage antérieur à la fenêtre)
  for (const [c, , , used] of CARNETS) {
    const linked = linkedPresentCount[c] || 0;
    if (linked > used) log(`⚠️ compteur carnet ${c} : ${linked} présences liées > ${used} utilisées !`);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // 8. PAIEMENTS (modes en minuscules sauf CB — piège v62)
  // ═════════════════════════════════════════════════════════════════════════════
  const paiementRows = [];
  const pay = (c, offre, aboId, montant, date, mode, statut = 'paid', extra = {}) => paiementRows.push({
    profile_id: PROFILE_ID, client_id: C[c].id, offre_id: offre?.id || null, abonnement_id: aboId || null,
    intitule: extra.intitule || `${offre?.nom} — ${C[c].prenom}`, type: extra.type || offre?.type || 'carnet',
    montant, statut, mode, date, date_encaissement: statut === 'paid' ? date : null,
    presence_id: extra.presence_id || null, notes: extra.notes || null, created_at: T(date, '10:45'),
  });
  pay('emma', O.c10, carnetOf.emma, 140, D('2026-07-06'), 'virement');
  pay('thomas', O.c10, carnetOf.thomas, 140, D('2026-07-15'), 'CB');
  pay('nadia', O.c5, carnetOf.nadia, 80, D('2026-07-20'), 'CB');
  pay('anouk', O.c10, carnetOf.anouk, 140, D('2026-07-20'), 'CB');
  pay('elise', O.c10, carnetOf.elise, 140, D('2026-07-25'), 'cheque');
  pay('lea', O.c10, carnetOf.lea, 140, D('2026-07-27'), 'CB');
  pay('chloe', O.c5, carnetOf.chloe, 80, D('2026-07-28'), 'especes');
  pay('salome', O.c5, carnetOf.salome, 80, D('2026-08-04'), 'especes');
  pay('bastien', O.c10, carnetOf.bastien, 140, D('2026-08-05'), 'virement');
  pay('lucie', O.c5, carnetOf.lucie, 80, D('2026-08-05'), 'CB');
  pay('ines', O.c10, carnetOf.ines, 140, D('2026-08-10'), 'CB');
  pay('margaux', O.abo, aboActifOf['margaux:juillet'], 99, D('2026-07-01'), 'CB');
  pay('margaux', O.abo, aboActifOf.margaux, 99, D('2026-08-01'), 'CB');
  pay('sophie', O.abo, aboActifOf.sophie, 99, D('2026-08-01'), 'virement');
  pay('marion', O.abo, aboActifOf.marion, 99, D('2026-08-03'), 'CB');
  // En attente depuis 16 j (seuil cloche : 14 j) — Claire règle « ce week-end »
  pay('claire', O.c5, carnetOf.claire, 80, D('2026-07-28'), 'virement', 'pending');
  // Pleine lune : 3 règlements à la séance (25 €)
  const plCours = coursByKey['ev:pl'];
  for (const [c, date, mode] of [['apolline', '2026-08-10', 'CB'], ['maelys', '2026-08-12', 'CB'], ['justine', '2026-08-09', 'especes']]) {
    pay(c, null, null, 25, D(date), mode, 'paid', {
      intitule: `Yoga Pleine Lune 🌕 — ${C[c].prenom}`, type: 'cours_unique',
      presence_id: findPresence(plCours.id, C[c].id)?.id || null,
    });
  }
  const { error: ePaie } = await sb.from('paiements').insert(paiementRows);
  if (ePaie) die('paiements', ePaie);
  const encaisseAout = paiementRows.filter(p => p.statut === 'paid' && p.date >= D('2026-08-01')).reduce((s, p) => s + p.montant, 0);
  log(`💶 paiements : ${paiementRows.length} (encaissé sur ~2 semaines : ${encaisseAout} € · 1 en attente 80 €)`);

  // ═════════════════════════════════════════════════════════════════════════════
  // 9. LISTE D'ATTENTE — pleine lune complète (3) + Reformer du 19/08 (2)
  // ═════════════════════════════════════════════════════════════════════════════
  const laRows = [
    ...[['zoe', 1], ['thea', 2], ['romain', 3]].map(([c, position], i) => ({
      profile_id: PROFILE_ID, cours_id: plCours.id, client_id: C[c].id,
      email: C[c].email, nom: `${C[c].prenom} ${C[c].nom}`, position,
      notified_at: null, created_at: T(addDays(TODAY, -(1 - Math.min(i, 1))), `${17 + i}:2${i}`),
    })),
    ...[['marion', 1], ['zoe', 2]].map(([c, position], i) => ({
      profile_id: PROFILE_ID, cours_id: coursByKey[`reformer:${D('2026-08-19')}`].id, client_id: C[c].id,
      email: C[c].email, nom: `${C[c].prenom} ${C[c].nom}`, position,
      notified_at: null, created_at: T(YEST, `1${2 + i}:40`),
    })),
  ];
  const { error: eLA } = await sb.from('liste_attente').insert(laRows);
  if (eLA) die('liste_attente', eLA);
  log(`⏳ liste d'attente : ${laRows.length}`);

  // ═════════════════════════════════════════════════════════════════════════════
  // 10. DEMANDES D'ESSAI — Julien en attente (badge nav + cloche), Hugo finalisée
  // ═════════════════════════════════════════════════════════════════════════════
  const { error: eEssai1 } = await sb.from('cours_essai_demandes').insert({
    profile_id: PROFILE_ID, cours_id: coursByKey[`flow:${D('2026-08-18')}`].id,
    prenom: 'Julien', nom: 'Lefort', email: 'julien.lefort@example.com', telephone: '06 74 50 27 39',
    message_visiteur: 'Bonjour ! Je cherche un cours le midi pour me remettre en douceur. Mardi prochain, c\'est possible ?',
    statut: 'en_attente', created_at: T(YEST, '18:40'),
  });
  if (eEssai1) die('essai Julien', eEssai1);
  const { error: eEssai2 } = await sb.from('cours_essai_demandes').insert({
    profile_id: PROFILE_ID, cours_id: coursByKey[`stretch:${D('2026-08-08')}`].id,
    prenom: 'Hugo', nom: 'Bianchi', email: C.hugo.email, telephone: '06 52 06 83 17',
    message_visiteur: 'Un ami m\'a parlé du studio, je peux venir tester le stretching samedi ?',
    statut: 'finalisee', client_id: C.hugo.id,
    presence_id: findPresence(coursByKey[`stretch:${D('2026-08-08')}`].id, C.hugo.id)?.id || null,
    created_at: T(D('2026-08-05'), '09:10'), decided_at: T(D('2026-08-06'), '08:30'),
  });
  if (eEssai2) die('essai Hugo', eEssai2);
  log('🙋 essais : 1 en attente (Julien) + 1 finalisé (Hugo)');

  // ═════════════════════════════════════════════════════════════════════════════
  // 11. MESSAGERIE — 4 conversations 1-à-1 (2 non lues) + 2 canaux de cours
  // ═════════════════════════════════════════════════════════════════════════════
  const mkConv = async ({ type, clientKey, coursKey, titre, messages, profLastRead, membres }) => {
    const { data: conv, error: e1 } = await sb.from('conversations').insert({
      profile_id: PROFILE_ID, type,
      client_id: type === 'client' ? C[clientKey].id : null,
      cours_id: type === 'cours' ? coursByKey[coursKey].id : null,
      titre: titre || null, archived: false,
    }).select('id').single();
    if (e1) die(`conversation ${clientKey || coursKey}`, e1);
    const msgRows = messages.map(m => ({
      conversation_id: conv.id,
      sender_type: m.de === 'pro' ? 'pro' : 'eleve',
      sender_profile_id: m.de === 'pro' ? PROFILE_ID : null,
      sender_client_id: m.de === 'pro' ? null : C[m.de].id,
      message_type: 'text', content: m.texte, created_at: m.a,
    }));
    const { data: inserted, error: e2 } = await sb.from('messages').insert(msgRows).select('id, created_at');
    if (e2) die(`messages ${clientKey || coursKey}`, e2);
    const memberRows = [
      { conversation_id: conv.id, profile_id: PROFILE_ID, client_id: null, last_read_at: profLastRead, notif_canal: 'digest' },
      ...membres.map(([c, lastRead]) => ({
        conversation_id: conv.id, profile_id: null, client_id: C[c].id,
        last_read_at: lastRead || null, notif_canal: 'digest', // NULL explicite = jamais lu (piège « Lu fantôme »)
      })),
    ];
    const { error: e3 } = await sb.from('conversation_members').insert(memberRows);
    if (e3) die(`membres ${clientKey || coursKey}`, e3);
    const lastAt = messages[messages.length - 1].a;
    await sb.from('conversations').update({ last_message_at: lastAt }).eq('id', conv.id);
    return { convId: conv.id, messageIds: inserted.map(m => m.id) };
  };

  // Léa — question pleine lune, dernier message NON LU par Camille
  await mkConv({
    type: 'client', clientKey: 'lea',
    messages: [
      { de: 'lea', a: T(TODAY, '08:47'), texte: 'Coucou Camille ! Il reste des places pour le yoga pleine lune vendredi prochain ? 🌕' },
      { de: 'pro', a: T(TODAY, '09:02'), texte: 'Hello Léa ! Oui, il en restait deux — je viens de t\'inscrire 😊 Pense à prendre un plaid !' },
      { de: 'lea', a: T(TODAY, '09:10'), texte: 'Trop bien, merci !! J\'ai transféré le lien à Apolline du coup, elle veut venir aussi 🙏' },
    ],
    profLastRead: T(TODAY, '09:02'),
    membres: [['lea', T(TODAY, '09:10')]],
  });
  // Claire — promesse de virement, NON LU
  await mkConv({
    type: 'client', clientKey: 'claire',
    messages: [
      { de: 'claire', a: T(YEST, '19:34'), texte: 'Coucou, désolée pour le retard du carnet 🙈 Je te fais le virement ce week-end, promis !' },
    ],
    profLastRead: T(YEST, '12:00'),
    membres: [['claire', T(YEST, '19:34')]],
  });
  // Sophie — question abo / atelier rentrée, lu
  await mkConv({
    type: 'client', clientKey: 'sophie',
    messages: [
      { de: 'sophie', a: T(YEST, '14:05'), texte: `Petite question : mon abo couvre aussi l'atelier rentrée du ${fmtJMois(D('2026-09-12'))} ?` },
      { de: 'pro', a: T(YEST, '14:32'), texte: 'Hello Sophie ! L\'atelier est en tarif à part (35 € avec le brunch 🥐), ton abo couvre tous les cours de la semaine. Je te garde une place ?' },
    ],
    profLastRead: T(YEST, '14:40'),
    membres: [['sophie', T(YEST, '15:02')]],
  });
  // Lucie — yoga océan pour Maë et Jade, lu
  await mkConv({
    type: 'client', clientKey: 'lucie',
    messages: [
      { de: 'lucie', a: T(D('2026-08-12'), '17:48'), texte: 'Maë est surexcitée pour le yoga océan 🐙 Est-ce que sa copine Jade peut venir aussi ?' },
      { de: 'pro', a: T(D('2026-08-12'), '18:02'), texte: `Mais oui, avec plaisir ! Il reste de la place — j'ai ajouté Jade à la liste 🌊 Rendez-vous le ${jourDe(D('2026-08-26'))} à 15 h !` },
    ],
    profLastRead: T(D('2026-08-12'), '18:05'),
    membres: [['lucie', T(D('2026-08-12'), '18:20')]],
  });
  // Canal du cours Pleine Lune — annonce + réponse de Léa + réactions
  const canalPL = await mkConv({
    type: 'cours', coursKey: 'ev:pl', titre: `Yoga Pleine Lune 🌕 · ${fmtJM(D('2026-08-28'))} 20:30`,
    messages: [
      { de: 'pro', a: T(D('2026-08-10'), '20:05'), texte: `Bonsoir à toutes et à tous 🌕 Rendez-vous ${fmtLong(D('2026-08-28'))} à 20 h 30 à la Salle du Parc. Amenez tapis, plaid et gourde — si le ciel est dégagé, on pratique dehors sous les étoiles ✨` },
      { de: 'lea', a: T(D('2026-08-10'), '20:40'), texte: 'On a trop hâte !! 🌕' },
    ],
    profLastRead: T(TODAY, '09:02'),
    membres: [
      ['lea', T(D('2026-08-10'), '20:40')], ['sophie', T(D('2026-08-10'), '21:30')], ['emma', T(D('2026-08-10'), '22:10')],
      ['marion', T(D('2026-08-11'), '08:15')], ['ines'], ['margaux'], ['thomas'], ['nadia'], ['lucie'], ['elise'],
      ['salome'], ['bastien'], ['justine'], ['apolline'], ['maelys'], ['louise'],
    ],
  });
  const { error: eReact } = await sb.from('messages_reactions').insert([
    { message_id: canalPL.messageIds[0], user_type: 'eleve', user_id: C.sophie.id, emoji: '🙏' },
    { message_id: canalPL.messageIds[0], user_type: 'eleve', user_id: C.marion.id, emoji: '✨' },
    { message_id: canalPL.messageIds[0], user_type: 'eleve', user_id: C.emma.id, emoji: '🌕' },
  ]);
  soft('réactions', eReact);
  // Canal Reformer du 19/08 — annonce complet → liste d'attente
  await mkConv({
    type: 'cours', coursKey: `reformer:${D('2026-08-19')}`, titre: `Reformer — petit groupe · ${fmtJM(D('2026-08-19'))} 18:00`,
    messages: [
      { de: 'pro', a: T(YEST, '12:30'), texte: `La séance Reformer de ${fmtLong(D('2026-08-19'))} est complète 💪 Si vous visez une place, inscrivez-vous en liste d'attente — je vous préviens dès qu'une place se libère !` },
    ],
    profLastRead: T(YEST, '12:30'),
    membres: [['elise', T(YEST, '13:05')], ['nadia'], ['margaux'], ['lea'], ['emma'], ['salome'], ['sophie'], ['thomas']],
  });
  log('💬 messagerie : 6 conversations (2 non lues côté prof) + 3 réactions');

  // ═════════════════════════════════════════════════════════════════════════════
  // 12. SONDAGE — « Nouveaux créneaux de la rentrée » (11 votants)
  // ═════════════════════════════════════════════════════════════════════════════
  const { data: sondage, error: eSond } = await sb.from('sondages_planning').insert({
    profile_id: PROFILE_ID, slug: `rentree-2026-${PROFILE_ID.slice(0, 6)}`,
    titre: 'Nouveaux créneaux de la rentrée 🍂',
    message: 'Dis-moi ce qui t\'arrange le mieux — j\'ouvre les créneaux plébiscités dès la fin du sondage !',
    date_fin: D('2026-08-31'), visibilite: 'mixte', actif: true, created_at: T(D('2026-08-05'), '11:20'),
  }).select('id').single();
  if (eSond) die('sondage', eSond);
  const creneauxDef = [
    { type_cours: 'Mat', jour_semaine: 2, heure: '08:00', duree_minutes: 55, ordre: 0, notes: 'Réveil Pilates avant le boulot' },
    { type_cours: 'Yoga', jour_semaine: 4, heure: '12:30', duree_minutes: 45, ordre: 1, notes: 'Flow du midi' },
    { type_cours: 'Reformer', jour_semaine: 6, heure: '11:15', duree_minutes: 55, ordre: 2, notes: 'Découverte Reformer' },
  ];
  const { data: creneaux, error: eCren } = await sb.from('sondages_creneaux')
    .insert(creneauxDef.map(c => ({ ...c, sondage_id: sondage.id }))).select('id, ordre');
  if (eCren) die('créneaux', eCren);
  const CR = Object.fromEntries(creneaux.map(c => [c.ordre, c.id]));
  const VOTES = { // clé client → [mardi 8h, jeudi 12h30, samedi 11h15]
    lea: ['peut_etre', 'oui', 'oui'], sophie: ['oui', 'peut_etre', 'peut_etre'], emma: ['non', 'oui', 'oui'],
    thomas: ['oui', 'non', 'oui'], marion: ['oui', 'non', 'peut_etre'], nadia: ['peut_etre', 'oui', 'oui'],
    chloe: ['non', 'peut_etre', 'oui'], ines: ['non', 'oui', 'oui'], margaux: ['non', 'oui', 'oui'],
    elise: ['oui', 'non', 'non'], salome: ['non', 'oui', 'oui'],
  };
  const voteRows = [];
  Object.entries(VOTES).forEach(([c, valeurs], vi) => {
    valeurs.forEach((valeur, i) => voteRows.push({
      creneau_id: CR[i], client_id: C[c].id, email: null, prenom: C[c].prenom,
      valeur, created_at: T(addDays(D('2026-08-05'), 1 + (vi % 6)), `${9 + (vi % 11)}:${10 + (i * 7)}`),
    }));
  });
  const { error: eVotes } = await sb.from('sondages_reponses').insert(voteRows);
  if (eVotes) die('votes', eVotes);
  log(`🗳️ sondage : 3 créneaux, ${Object.keys(VOTES).length} votants (${voteRows.length} réponses)`);

  // ═════════════════════════════════════════════════════════════════════════════
  // 13. CAS À TRAITER — 3 ouverts
  // ═════════════════════════════════════════════════════════════════════════════
  const flowMardi = coursByKey[`flow:${D('2026-08-11')}`];
  const barreJeudi = coursByKey[`barre:${D('2026-08-06')}`];
  const matLundi = coursByKey[`mat:${D('2026-08-17')}`];
  const casRows = [
    {
      profile_id: PROFILE_ID, case_type: 'no_show', client_id: C.anouk.id, cours_id: flowMardi.id,
      presence_id: findPresence(flowMardi.id, C.anouk.id)?.id || null,
      context: { mode: 'cas', seance_decomptee: false, client_nom: 'Anouk Pelletier', cours_nom: 'Yoga Flow — pause déj', cours_date: D('2026-08-11'), message: `Anouk ne s'est pas présentée — Yoga Flow du ${fmtLong(D('2026-08-11'))}`, montant_potentiel: 14 },
      created_at: T(D('2026-08-11'), '13:35'),
    },
    {
      profile_id: PROFILE_ID, case_type: 'annulation_hors_delai', client_id: C.chloe.id, cours_id: barreJeudi.id,
      presence_id: findPresence(barreJeudi.id, C.chloe.id)?.id || null,
      context: { choix_applique: 'creer_dette', dette_a_regler: true, delai_h: 2, client_nom: 'Chloé Dubreuil', client_email: C.chloe.email, cours_date: D('2026-08-06') },
      created_at: T(D('2026-08-06'), '17:05'),
    },
    {
      profile_id: PROFILE_ID, case_type: 'eleve_sans_carnet', client_id: C.justine.id, cours_id: matLundi.id,
      presence_id: findPresence(matLundi.id, C.justine.id)?.id || null,
      context: { choix_applique: 'paiement_sur_place' },
      created_at: T(D('2026-08-12'), '10:12'),
    },
  ];
  const { error: eCas } = await sb.from('cas_a_traiter').insert(casRows);
  if (eCas) die('cas', eCas);
  log('📋 cas à traiter : 3 ouverts (no-show, annulation tardive, sans carnet)');

  // ═════════════════════════════════════════════════════════════════════════════
  // 14. NOTIFICATIONS cloche (évènementielles — le reste est régénéré par /check :
  //     anniversaires d'Emma (auj.) et Bastien (demain), carnet d'Emma 9/10,
  //     paiement en attente de Claire 16 j, essai de Julien)
  // ═════════════════════════════════════════════════════════════════════════════
  const presApolline = findPresence(plCours.id, C.apolline.id);
  const notifRows = [
    {
      profile_id: PROFILE_ID, type: 'reservation',
      titre: '🎉 Nouvelle réservation — Apolline',
      corps: `Yoga Pleine Lune 🌕 · ${fmtLong(D('2026-08-28'))} à 20:30`,
      data: { client_id: C.apolline.id, cours_id: plCours.id, cours_date: D('2026-08-28'), presence_id: presApolline?.id || null, prenom: 'Apolline' },
      ref_key: `reservation_${presApolline?.id}`, lu: false,
      created_at: T(TODAY, '09:14'), expires_at: T(addDays(TODAY, 2), '09:14'),
    },
    {
      profile_id: PROFILE_ID, type: 'liste_attente',
      titre: 'Nouvelle inscription en liste d\'attente',
      corps: `Zoé Lambert attend une place — Yoga Pleine Lune 🌕 (${fmtJM(D('2026-08-28'))} à 20:30).`,
      data: { cours_id: plCours.id, email: C.zoe.email }, lu: false,
      created_at: T(YEST, '17:21'),
    },
  ];
  const { error: eNotif } = await sb.from('notifications').insert(notifRows);
  if (eNotif) die('notifications', eNotif);
  log('🔔 notifications : 2 évènementielles insérées (le reste sera dérivé à l\'ouverture de la cloche)');

  // ═════════════════════════════════════════════════════════════════════════════
  // 15. RÉCAP + VÉRIFS
  // ═════════════════════════════════════════════════════════════════════════════
  log('\n── VÉRIFICATIONS ──');
  const count = async (t, filter) => {
    let q = sb.from(t).select('*', { count: 'exact', head: true });
    q = filter ? filter(q) : q.eq('profile_id', PROFILE_ID);
    const { count: n, error } = await q;
    return error ? `ERR ${error.message}` : n;
  };
  log('clients:', await count('clients'), '| cours:', await count('cours'), '| présences:', await count('presences'),
    '| abos:', await count('abonnements'), '| paiements:', await count('paiements'));
  log('conversations:', await count('conversations'), '| cas ouverts:', await count('cas_a_traiter', q => q.eq('profile_id', PROFILE_ID).is('resolu_at', null)),
    '| liste attente:', await count('liste_attente'), '| essais en attente:', await count('cours_essai_demandes', q => q.eq('profile_id', PROFILE_ID).eq('statut', 'en_attente')));
  // Pleine lune : complet ?
  const { data: plPres } = await sb.from('presences').select('statut_pointage, annulation_tardive').eq('cours_id', plCours.id);
  const occupees = (plPres || []).filter(p => !p.annulation_tardive && !['annule', 'declinee'].includes(p.statut_pointage || 'inscrit')).length;
  log(`Pleine lune : ${occupees}/16 places occupées + ${laRows.filter(r => r.cours_id === plCours.id).length} en liste d'attente`);
  // Cours futurs
  const { data: futurs } = await sb.from('cours').select('id').eq('profile_id', PROFILE_ID).gte('date', TODAY);
  log(`Cours à venir (>= ${TODAY}) : ${futurs?.length}`);
  log(failures ? `\n⚠️ terminé avec ${failures} avertissement(s) non bloquant(s)` : '\n✅ REFRESH TERMINÉ SANS ERREUR');
  return { failures };
}
