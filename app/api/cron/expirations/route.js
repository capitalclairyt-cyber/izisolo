import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireCronAuth } from '@/lib/api-auth';

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

  return NextResponse.json({
    expires: data?.length || 0,
    epuises: epuises?.length || 0,
    timestamp: new Date().toISOString(),
  });
}
