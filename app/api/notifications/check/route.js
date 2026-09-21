import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api-route';
import { wantsNotif } from '@/lib/notif-prefs';
import { rappelPaiement, refRappel, expirationRappel, refsObsoletes } from '@/lib/rappel-paiement';

export const POST = withRoute({ auth: 'user' }, async ({ auth }) => {
  const { studioId, supabase } = auth;

  // Préférences unifiées (canal 'inapp' = cloche) + anniversaire (feature à
  // part) — profil déjà chargé par requireAuth (select *), pas de re-requête.
  const prof = auth.profile;
  const prefs = prof?.notif_prefs;
  const wantInapp = (type) => wantsNotif(prefs, type, 'prof', 'inapp');

  const today     = new Date();
  const todayStr  = today.toISOString().split('T')[0];
  const tomorrow  = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const todayMMDD    = todayStr.slice(5);
  const tomorrowMMDD = tomorrowStr.slice(5);

  const toUpsert = [];

  // ── 1. Anniversaires (si mode != off) ────────────────────────────────────
  if ((prof?.anniversaire_mode || 'semi') !== 'off') {
    const { data: clientsB } = await supabase
      .from('clients')
      .select('id, prenom, nom, date_naissance')
      .eq('profile_id', studioId)
      .not('date_naissance', 'is', null);

    for (const c of clientsB || []) {
      const mmdd    = c.date_naissance.slice(5);
      const isToday = mmdd === todayMMDD;
      const isTom   = mmdd === tomorrowMMDD;
      if (!isToday && !isTom) continue;

      toUpsert.push({
        profile_id: studioId,
        type:       'anniversaire',
        titre:      isToday
          ? `🎂 Anniversaire de ${c.prenom} ${c.nom} aujourd'hui !`
          : `🎂 Anniversaire de ${c.prenom} ${c.nom} demain`,
        corps:      isToday
          ? `${c.prenom} fête son anniversaire aujourd'hui.`
          : `${c.prenom} fête son anniversaire demain.`,
        data: { client_id: c.id, prenom: c.prenom, nom: c.nom,
                date_naissance: c.date_naissance, is_today: isToday },
        ref_key:    `anniversaire_${todayStr}_${c.id}`,
        expires_at: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2).toISOString(),
      });
    }
  }

  // ── 2. Paiements en retard (non réglés depuis X jours) ───────────────────
  // Seuil réglable : Paramètres → Élèves & cours → Seuils d'alerte → « Paiement en
  // attente » (B2e — avant, 7 j codés en dur pendant que l'UI affichait un
  // réglage à 14 jamais sauvegardé ni lu).
  if (wantInapp('paiement_retard')) {
  const seuilJours = parseInt(prof?.alerte_paiement_attente_jours) || 14;
  const seuilAgo = new Date(today); seuilAgo.setDate(today.getDate() - seuilJours);

  const { data: retards } = await supabase
    .from('paiements')
    .select('id, intitule, montant, date, client_id, echeancier_id, clients(prenom, nom)')
    .eq('profile_id', studioId)
    .neq('statut', 'paid')
    .lte('date', seuilAgo.toISOString().split('T')[0]);

  // Ce qui a DÉJÀ été reçu sur la même vente (2026-09-21, retour Maude) : les
  // lignes réglées sœurs par l'échéancier (imputation du 15/09, « Plusieurs
  // moyens »). Sans elles, le rappel du reste de Marie-Pierre disait « 235 €
  // en attente depuis 26 jours » six jours après son chèque de 245 €.
  const echeanciers = [...new Set((retards || []).map(p => p.echeancier_id).filter(Boolean))];
  let soeurs = [];
  if (echeanciers.length > 0) {
    const { data } = await supabase
      .from('paiements')
      .select('id, montant, statut, mode, date, date_encaissement, echeancier_id')
      .eq('profile_id', studioId)
      .eq('statut', 'paid')
      .in('echeancier_id', echeanciers);
    soeurs = data || [];
  }

  for (const p of retards || []) {
    const r = rappelPaiement(p, soeurs, today);
    toUpsert.push({
      profile_id: studioId,
      type:       'paiement_retard',
      titre:      r.titre,
      corps:      r.corps,
      data:       r.data,
      // ref_key STABLE (audit 2026-07-25) : l'ancien ref journalier créait une
      // notif non-lue DE PLUS chaque jour pour le même impayé (badges « 9+ »
      // permanents). Stable + expiration = 1 seule notif, ré-armée tant que
      // l'impayé persiste. Depuis le 2026-09-21 elle vit SEPT jours (48 h avant :
      // un reste connu de la prof revenait sonner tous les deux jours).
      ref_key:    refRappel(p.id),
      expires_at: expirationRappel(),
    });
  }

  // Les rappels dont la ligne n'attend PLUS rien (encaissée depuis) sont purgés
  // tout de suite, au lieu de sonner jusqu'à leur expiration.
  const { data: rappelsExistants } = await supabase
    .from('notifications')
    .select('ref_key')
    .eq('profile_id', studioId)
    .eq('type', 'paiement_retard');
  const obsoletes = refsObsoletes((rappelsExistants || []).map(n => n.ref_key), retards || []);
  if (obsoletes.length > 0) {
    await supabase
      .from('notifications')
      .delete()
      .eq('profile_id', studioId)
      .eq('type', 'paiement_retard')
      .in('ref_key', obsoletes);
  }
  } // fin notif_paiement_retard

  // ── 3. Carnets bientôt finis — OPPORTUNITÉ de renouvellement ──────────────
  // (cf. MODELE-PAIEMENTS-2026.md §4.4). Seulement de VRAIS packs : type
  // carnet/abo, seances_total > 1 (jamais un drop-in / cours à l'unité).
  // ⚠️ Il n'existe PAS de colonne seances_restantes : l'ancienne requête la
  // lisait → échec silencieux, notif jamais émise. On calcule total - utilisées.
  if (wantInapp('carnet_epuise')) {
  const { data: carnets } = await supabase
    .from('abonnements')
    .select('id, type, seances_total, seances_utilisees, client_id, offres(nom), clients(prenom, nom)')
    .eq('profile_id', studioId)
    .eq('statut', 'actif')
    .not('seances_total', 'is', null)
    .gt('seances_total', 1);

  // Même seuil que le dashboard et le cron notifs-eleves (alerte quand
  // reste <= alerte_seances_seuil) — la cloche codait « < 2 » en dur (B2e).
  const seuilSeances = parseInt(prof?.alerte_seances_seuil) || 2;
  for (const ab of carnets || []) {
    if (ab.type === 'cours_unique') continue;
    const reste = ab.seances_total - (ab.seances_utilisees || 0);
    if (reste > seuilSeances) continue; // seulement les carnets presque/déjà finis
    toUpsert.push({
      profile_id: studioId,
      type:       'carnet_epuise',
      titre:      reste <= 0
        ? `📋 Carnet terminé — ${ab.clients?.prenom} ${ab.clients?.nom}`
        : `📋 Carnet presque fini — ${ab.clients?.prenom} ${ab.clients?.nom}`,
      corps:      `${ab.offres?.nom || 'Carnet'} · ${Math.max(0, reste)} séance(s) restante(s) — proposer la suite ?`,
      data:       { abonnement_id: ab.id, client_id: ab.client_id,
                    seances_restantes: Math.max(0, reste) },
      ref_key:    `carnet_epuise_${ab.id}`, // stable (cf. paiement_retard)
      expires_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    });
  }
  } // fin notif_carnet_epuise

  // ── 4. Abonnements qui expirent bientôt ──────────────────────────────────
  // Fenêtre = alerte_expiration_jours (le réglage qui pilote déjà le cron
  // élèves et le dashboard) — la cloche codait 14 j en dur (B2e).
  if (wantInapp('abonnement_expire')) {
  const seuilExpJours = parseInt(prof?.alerte_expiration_jours) || 7;
  const finFenetre = new Date(today); finFenetre.setDate(today.getDate() + seuilExpJours);

  const { data: expirant } = await supabase
    .from('abonnements')
    .select('id, date_fin, client_id, offres(nom), clients(prenom, nom)')
    .eq('profile_id', studioId)
    .eq('statut', 'actif')
    .not('date_fin', 'is', null)
    .gte('date_fin', todayStr)
    .lte('date_fin', finFenetre.toISOString().split('T')[0]);

  // v107 : un abo prélevé par carte se renouvelle tout seul, l'alerte serait
  // du bruit. Lecture SÉPARÉE et défensive de la colonne (absente → rien
  // n'est filtré, comportement d'avant).
  let preleves = new Set();
  if ((expirant || []).length) {
    try {
      const { data: subs, error: subErr } = await supabase
        .from('abonnements').select('id, stripe_subscription_id').in('id', expirant.map(a => a.id));
      if (!subErr) preleves = new Set((subs || []).filter(s => s.stripe_subscription_id).map(s => s.id));
    } catch { /* pré-v107 */ }
  }

  for (const ab of expirant || []) {
    if (preleves.has(ab.id)) continue;
    const jours = Math.max(0, Math.floor((new Date(ab.date_fin) - today) / 86400000));
    toUpsert.push({
      profile_id: studioId,
      type:       'abonnement_expire',
      titre:      `⏰ Abonnement expire bientôt — ${ab.clients?.prenom} ${ab.clients?.nom}`,
      corps:      `${ab.offres?.nom} · expire dans ${jours} jour(s)`,
      data:       { abonnement_id: ab.id, client_id: ab.client_id,
                    date_fin: ab.date_fin, jours },
      ref_key:    `abo_expire_${ab.id}`, // stable (cf. paiement_retard)
      expires_at: new Date(ab.date_fin).toISOString(),
    });
  }
  } // fin notif_abonnement_expire

  // ── 5. Nouveaux clients — VOLONTAIREMENT DÉSACTIVÉ ───────────────────────
  // Cette notif se déclenchait pour TOUT client créé dans les 48h, sans distinguer
  // qui l'avait créé → la prof était notifiée pour les élèves qu'elle ajoutait
  // ELLE-MÊME (pointage « nouveau client », /clients/nouveau, import). Or :
  //   • un vrai signup self-service = réservation portail → déjà notifié
  //     « 🎉 Nouvelle réservation » (reserver/route.js) ;
  //   • une demande d'essai → déjà notifiée « ✨ Demande d'essai » ;
  //   • tout le reste = action manuelle de la prof (elle le sait déjà).
  // Donc « nouveau_client » était toujours redondant ou auto-infligé → retiré.
  // (Le type reste dans le catalogue notif-prefs pour rétrocompat ; plus rien
  //  ne le génère.)

  // ── 6. Demandes de cours d'essai EN ATTENTE (mode manuel) ────────────────
  // Filet stateful : tant qu'une demande est 'en_attente', la prof la voit dans
  // la cloche. Même ref_key que la notif posée à la réservation (essai/route.js)
  // → dédup : si elle l'a déjà lue, ignoreDuplicates ne la ré-affiche pas ; si
  // l'insert event-time a été manqué, ce filet la rattrape au prochain check.
  if (wantInapp('essai_demande')) {
    const { data: demandes } = await supabase
      .from('cours_essai_demandes')
      .select('id, prenom, created_at, cours:cours_id(nom, date, heure)')
      .eq('profile_id', studioId)
      .eq('statut', 'en_attente');

    for (const d of demandes || []) {
      const coursNom = d.cours?.nom || 'un cours';
      const dStr = d.cours?.date
        ? new Date(d.cours.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
        : '';
      const hStr = d.cours?.heure ? ' · ' + d.cours.heure.slice(0, 5).replace(':', 'h') : '';
      toUpsert.push({
        profile_id: studioId,
        type:       'essai_demande',
        titre:      `✨ Demande d'essai à valider — ${d.prenom}`,
        corps:      `${coursNom}${dStr ? ` · ${dStr}` : ''}${hStr}`,
        data:       { demande_id: d.id, cours_id: d.cours?.id, prenom: d.prenom },
        ref_key:    `essai_demande_${d.id}`,
        expires_at: null,
      });
    }
  }

  // ── Purge des notifs expirées (AVANT l'upsert : un rappel expiré est recréé
  //    au même check, pas au suivant) ────────────────────────────────────────
  await supabase
    .from('notifications')
    .delete()
    .eq('profile_id', studioId)
    .not('expires_at', 'is', null)
    .lt('expires_at', new Date().toISOString());

  // ── Upsert (ignoreDuplicates = ne pas écraser lu=true) ────────────────────
  if (toUpsert.length > 0) {
    await supabase
      .from('notifications')
      .upsert(toUpsert, { onConflict: 'profile_id,ref_key', ignoreDuplicates: true });
  }

  // ── Retourner toutes les non-lues ─────────────────────────────────────────
  const { data: unread } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', studioId)
    .eq('lu', false)
    .order('created_at', { ascending: false });

  return NextResponse.json({ notifications: unread || [] });
});
