import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireCronAuth } from '@/lib/api-auth';

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

  return NextResponse.json({
    expires: data?.length || 0,
    epuises: epuises?.length || 0,
    promoActif: promoCount,
    autoArchive: archiveCount,
    timestamp: new Date().toISOString(),
  });
}
