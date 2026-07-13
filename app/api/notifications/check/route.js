import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { wantsNotif } from '@/lib/notif-prefs';

export async function POST() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  // Préférences unifiées (canal 'inapp' = cloche) + anniversaire (feature à part)
  const { data: prof } = await supabase
    .from('profiles')
    .select('notif_prefs, anniversaire_mode')
    .eq('id', user.id)
    .single();
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
      .eq('profile_id', user.id)
      .not('date_naissance', 'is', null);

    for (const c of clientsB || []) {
      const mmdd    = c.date_naissance.slice(5);
      const isToday = mmdd === todayMMDD;
      const isTom   = mmdd === tomorrowMMDD;
      if (!isToday && !isTom) continue;

      toUpsert.push({
        profile_id: user.id,
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

  // ── 2. Paiements en retard (> 7 jours, non réglés) ───────────────────────
  if (wantInapp('paiement_retard')) {
  const sevenAgo = new Date(today); sevenAgo.setDate(today.getDate() - 7);

  const { data: retards } = await supabase
    .from('paiements')
    .select('id, intitule, montant, date, client_id, clients(prenom, nom)')
    .eq('profile_id', user.id)
    .neq('statut', 'paid')
    .lte('date', sevenAgo.toISOString().split('T')[0]);

  for (const p of retards || []) {
    const jours = Math.floor((today - new Date(p.date)) / 86400000);
    toUpsert.push({
      profile_id: user.id,
      type:       'paiement_retard',
      titre:      `💶 Paiement en attente — ${p.clients?.prenom} ${p.clients?.nom}`,
      corps:      `${p.intitule} · ${p.montant} € · en attente depuis ${jours} jour(s)`,
      data:       { paiement_id: p.id, client_id: p.client_id, montant: p.montant, jours },
      ref_key:    `paiement_retard_${todayStr}_${p.id}`,
      expires_at: null,
    });
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
    .eq('profile_id', user.id)
    .eq('statut', 'actif')
    .not('seances_total', 'is', null)
    .gt('seances_total', 1);

  for (const ab of carnets || []) {
    if (ab.type === 'cours_unique') continue;
    const reste = ab.seances_total - (ab.seances_utilisees || 0);
    if (reste >= 2) continue; // seulement les carnets presque/déjà finis
    toUpsert.push({
      profile_id: user.id,
      type:       'carnet_epuise',
      titre:      reste <= 0
        ? `📋 Carnet terminé — ${ab.clients?.prenom} ${ab.clients?.nom}`
        : `📋 Carnet presque fini — ${ab.clients?.prenom} ${ab.clients?.nom}`,
      corps:      `${ab.offres?.nom || 'Carnet'} · ${Math.max(0, reste)} séance(s) restante(s) — proposer la suite ?`,
      data:       { abonnement_id: ab.id, client_id: ab.client_id,
                    seances_restantes: Math.max(0, reste) },
      ref_key:    `carnet_epuise_${todayStr}_${ab.id}`,
      expires_at: null,
    });
  }
  } // fin notif_carnet_epuise

  // ── 4. Abonnements qui expirent dans < 14 jours ───────────────────────────
  if (wantInapp('abonnement_expire')) {
  const in14 = new Date(today); in14.setDate(today.getDate() + 14);

  const { data: expirant } = await supabase
    .from('abonnements')
    .select('id, date_fin, client_id, offres(nom), clients(prenom, nom)')
    .eq('profile_id', user.id)
    .eq('statut', 'actif')
    .not('date_fin', 'is', null)
    .gte('date_fin', todayStr)
    .lte('date_fin', in14.toISOString().split('T')[0]);

  for (const ab of expirant || []) {
    const jours = Math.max(0, Math.floor((new Date(ab.date_fin) - today) / 86400000));
    toUpsert.push({
      profile_id: user.id,
      type:       'abonnement_expire',
      titre:      `⏰ Abonnement expire bientôt — ${ab.clients?.prenom} ${ab.clients?.nom}`,
      corps:      `${ab.offres?.nom} · expire dans ${jours} jour(s)`,
      data:       { abonnement_id: ab.id, client_id: ab.client_id,
                    date_fin: ab.date_fin, jours },
      ref_key:    `abo_expire_${todayStr}_${ab.id}`,
      expires_at: new Date(ab.date_fin).toISOString(),
    });
  }
  } // fin notif_abonnement_expire

  // ── 5. Nouveaux clients (créés dans les dernières 48h) ───────────────────
  if (wantInapp('nouveau_client')) {
    const since48h = new Date(today); since48h.setHours(today.getHours() - 48);

    const { data: nouveaux } = await supabase
      .from('clients')
      .select('id, prenom, nom, created_at, source')
      .eq('profile_id', user.id)
      .gte('created_at', since48h.toISOString());

    // Les inscriptions via cours d'essai ont leur propre notif dédiée (évite le doublon)
    for (const c of (nouveaux || []).filter(c => c.source !== 'Cours d\'essai')) {
      const createdDay = c.created_at.split('T')[0];
      toUpsert.push({
        profile_id: user.id,
        type:       'nouveau_client',
        titre:      `👤 Nouvel élève ajouté — ${c.prenom} ${c.nom}`,
        corps:      `Ajouté le ${new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`,
        data:       { client_id: c.id, prenom: c.prenom, nom: c.nom },
        ref_key:    `nouveau_client_${createdDay}_${c.id}`,
        expires_at: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3).toISOString(),
      });
    }
  }

  // ── 6. Demandes de cours d'essai EN ATTENTE (mode manuel) ────────────────
  // Filet stateful : tant qu'une demande est 'en_attente', la prof la voit dans
  // la cloche. Même ref_key que la notif posée à la réservation (essai/route.js)
  // → dédup : si elle l'a déjà lue, ignoreDuplicates ne la ré-affiche pas ; si
  // l'insert event-time a été manqué, ce filet la rattrape au prochain check.
  if (wantInapp('essai_demande')) {
    const { data: demandes } = await supabase
      .from('cours_essai_demandes')
      .select('id, prenom, created_at, cours:cours_id(nom, date, heure)')
      .eq('profile_id', user.id)
      .eq('statut', 'en_attente');

    for (const d of demandes || []) {
      const coursNom = d.cours?.nom || 'un cours';
      const dStr = d.cours?.date
        ? new Date(d.cours.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
        : '';
      const hStr = d.cours?.heure ? ' · ' + d.cours.heure.slice(0, 5).replace(':', 'h') : '';
      toUpsert.push({
        profile_id: user.id,
        type:       'essai_demande',
        titre:      `✨ Demande d'essai à valider — ${d.prenom}`,
        corps:      `${coursNom}${dStr ? ` · ${dStr}` : ''}${hStr}`,
        data:       { demande_id: d.id, cours_id: d.cours?.id, prenom: d.prenom },
        ref_key:    `essai_demande_${d.id}`,
        expires_at: null,
      });
    }
  }

  // ── Upsert (ignoreDuplicates = ne pas écraser lu=true) ────────────────────
  if (toUpsert.length > 0) {
    await supabase
      .from('notifications')
      .upsert(toUpsert, { onConflict: 'profile_id,ref_key', ignoreDuplicates: true });
  }

  // ── Purge des notifs expirées ─────────────────────────────────────────────
  await supabase
    .from('notifications')
    .delete()
    .eq('profile_id', user.id)
    .not('expires_at', 'is', null)
    .lt('expires_at', new Date().toISOString());

  // ── Retourner toutes les non-lues ─────────────────────────────────────────
  const { data: unread } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', user.id)
    .eq('lu', false)
    .order('created_at', { ascending: false });

  return NextResponse.json({ notifications: unread || [] });
}
