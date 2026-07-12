import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireCronAuth } from '@/lib/api-auth';

// Durée max explicite (le re-seed touche plusieurs tables).
export const maxDuration = 300;

/**
 * Cron nocturne — remet le compte démo à son état seedé (TEMPORAIRE).
 * Appelle la fonction reset_demo_data() (wrap idempotent de seed-demo-bonjour).
 * ⚠️ À retirer avec la démo (cf. app/demo/[token]/route.js).
 */
export async function GET(request) {
  try {
    requireCronAuth(request);
  } catch (res) {
    return res;
  }

  const { error } = await supabaseAdmin.rpc('reset_demo_data');
  if (error) {
    console.error('[cron/reset-demo]', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, reset: 'demo', timestamp: new Date().toISOString() });
}
