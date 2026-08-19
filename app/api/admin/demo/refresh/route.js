import { withRoute } from '@/lib/api-route';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { refreshDemoAtelierSoleil } from '@/lib/demo-atelier-soleil';
import { reportError } from '@/lib/report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Le refresh fait des centaines d'écritures séquentielles (~1-2 min depuis
// Vercel CDG). 300 s = plafond du plan. Re-runnable : un timeout se répare
// en relançant (la purge repart de zéro).
export const maxDuration = 300;

/**
 * POST /api/admin/demo/refresh — le bouton « Rafraîchir le démo » de /admin/demo
 * (2026-08-18, demande Colin : Maude prépare ses démos sans terminal).
 * Même moteur que le CLI (lib/demo-atelier-soleil) : garde-fou intégré, ne
 * touche QUE le profil atelier-soleil.
 */
export const POST = withRoute({ auth: 'admin' }, async () => {
  const logs = [];
  try {
    const { failures } = await refreshDemoAtelierSoleil(supabaseAdmin, {
      log: (...args) => logs.push(args.join(' ')),
    });
    return Response.json({ ok: true, failures, logs });
  } catch (e) {
    reportError('[admin/demo/refresh]', e?.message, { route: '/api/admin/demo/refresh' });
    return Response.json({ ok: false, error: e.message, logs }, { status: 500 });
  }
});
