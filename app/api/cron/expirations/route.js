import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireCronAuth } from '@/lib/api-auth';
import { getTrialStatus } from '@/lib/trial';
import { sendEmail } from '@/lib/email';

// Durée max explicite (fluid compute : 300 s = plafond Hobby)
export const maxDuration = 300;

// Cron quotidien : marquer les abonnements expirés
export async function GET(request) {
  try {
    requireCronAuth(request);
  } catch (res) {
    return res;
  }

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
    console.error('[cron/expirations]', error);
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
    const { data: coursVieux } = await supabaseAdmin
      .from('cours')
      .select('id')
      .lt('date', il60jours);
    const vieuxIds = (coursVieux || []).map(c => c.id);
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
    console.error('[cron/expirations] purge liste_attente:', e?.message);
  }

  // ── Auto-statut clients ──────────────────────────────────────────────────
  let promoCount = 0;
  let archiveCount = 0;

  // prospect → actif : dès qu'il y a au moins 1 paiement 'paid'
  const { data: prospects } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('statut', 'prospect');

  if (prospects?.length) {
    const { data: paidClientIds } = await supabaseAdmin
      .from('paiements')
      .select('client_id')
      .eq('statut', 'paid')
      .in('client_id', prospects.map(c => c.id));

    const toActivate = [...new Set((paidClientIds || []).map(p => p.client_id))];
    if (toActivate.length) {
      const { data: activated } = await supabaseAdmin
        .from('clients')
        .update({ statut: 'actif' })
        .in('id', toActivate)
        .eq('statut', 'prospect')
        .select('id');
      promoCount = activated?.length || 0;
    }
  }

  // actif/fidele → archive : aucune activité depuis 10 mois
  const il10mois = new Date(Date.now() - 300 * 86400000).toISOString().split('T')[0];
  const { data: candidats } = await supabaseAdmin
    .from('clients')
    .select('id')
    .in('statut', ['actif', 'fidele']);

  if (candidats?.length) {
    const candidatIds = candidats.map(c => c.id);

    const [{ data: recentPresences }, { data: recentPaiements }, { data: activeAbos }] = await Promise.all([
      // presences n'a pas de colonne `date` (la date est sur `cours`) — on filtre
      // sur created_at, qui date la création de la présence ≈ activité de l'élève.
      supabaseAdmin.from('presences').select('client_id').gte('created_at', il10mois).in('client_id', candidatIds),
      supabaseAdmin.from('paiements').select('client_id').gte('date', il10mois).in('client_id', candidatIds),
      supabaseAdmin.from('abonnements').select('client_id').eq('statut', 'actif').in('client_id', candidatIds),
    ]);

    const activeIds = new Set([
      ...(recentPresences || []).map(p => p.client_id),
      ...(recentPaiements || []).map(p => p.client_id),
      ...(activeAbos || []).map(a => a.client_id),
    ]);

    const toArchive = candidatIds.filter(id => !activeIds.has(id));
    if (toArchive.length) {
      const { data: archived } = await supabaseAdmin
        .from('clients')
        .update({ statut: 'archive' })
        .in('id', toArchive)
        .select('id');
      archiveCount = archived?.length || 0;
    }
  }

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
      const to = prof.email_contact;
      if (!to) continue;

      const isJ1 = st.daysLeft <= 1 && !prof.trial_reminder_sent_j1;
      const isJ3 = !isJ1 && st.daysLeft <= 3 && !prof.trial_reminder_sent_j3;
      if (!isJ1 && !isJ3) continue;

      const jours = st.daysLeft;
      const sujet = jours <= 1 ? `Ton essai IziSolo se termine demain` : `Ton essai IziSolo se termine dans ${jours} jours`;
      try {
        await sendEmail({
          categorie: 'transactionnel',
          to,
          subject: sujet,
          html: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;">
              <h2 style="color:#b87333;margin:0 0 6px;">Ton essai touche à sa fin</h2>
              <p style="color:#555;margin:0 0 14px;">Bonjour ${prof.prenom || ''},</p>
              <p style="color:#555;margin:0 0 14px;">
                Ton essai gratuit de 14 jours se termine ${jours <= 1 ? 'demain' : `dans ${jours} jours`}.
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
        await supabaseAdmin
          .from('profiles')
          .update(isJ1 ? { trial_reminder_sent_j1: true } : { trial_reminder_sent_j3: true })
          .eq('id', prof.id);
        if (isJ1) trialJ1++; else trialJ3++;
      } catch (e) {
        console.error('[cron/expirations] trial reminder err', prof.id, e?.message);
      }
    }
  } catch (e) {
    console.error('[cron/expirations] trial reminders section:', e?.message);
  }

  return NextResponse.json({
    expires: data?.length || 0,
    epuises: epuises?.length || 0,
    promoActif: promoCount,
    autoArchive: archiveCount,
    listeAttentePurgee,
    trialJ3,
    trialJ1,
    timestamp: new Date().toISOString(),
  });
}
