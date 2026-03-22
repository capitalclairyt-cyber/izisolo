import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireCronAuth } from '@/lib/api-auth';

// Cron quotidien : calcul des alertes (pour notifications futures)
export async function GET(request) {
  try {
    requireCronAuth(request);
  } catch (res) {
    return res;
  }

  // Pour l'instant, on log juste le nombre d'alertes potentielles
  // Les notifications email seront ajoutées en Phase 3

  const { data: abosActifs } = await supabaseAdmin
    .from('abonnements')
    .select('id, client_id, profile_id, seances_total, seances_utilisees, date_fin')
    .eq('statut', 'actif');

  let alertesCount = 0;

  if (abosActifs) {
    for (const abo of abosActifs) {
      if (abo.seances_total !== null) {
        const reste = (abo.seances_total || 0) - (abo.seances_utilisees || 0);
        if (reste <= 2) alertesCount++;
      }
      if (abo.date_fin) {
        const jours = Math.ceil((new Date(abo.date_fin) - new Date()) / (1000 * 60 * 60 * 24));
        if (jours <= 7 && jours > 0) alertesCount++;
      }
    }
  }

  return NextResponse.json({
    alertes: alertesCount,
    timestamp: new Date().toISOString(),
  });
}
