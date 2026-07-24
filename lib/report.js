// ============================================================================
// IziSolo — reportError : console.error + journal d'erreurs (drop-in)
// ----------------------------------------------------------------------------
// L'angle mort n°1 du monitoring (carte de chaleur + campagne 2026-07-24) :
// ~42 routes API attrapaient leurs erreurs, faisaient console.error, et
// renvoyaient un 500 — rien ne remontait nulle part. Une 42703 a pu tuer
// l'annulation élève pendant des semaines sans une alerte.
//
// `reportError(...)` remplace `console.error(...)` à l'identique (mêmes
// arguments, même sortie console) et écrit EN PLUS l'erreur dans la table
// `erreurs_app` (migration v71), consultable sur /admin/erreurs.
// Fire-and-forget : ne bloque jamais la route, échoue en silence si la
// table/env manquent. (Sentry a été abandonné — plus de compte — mais si un
// SENTRY_DSN revient un jour, la capture se réactive toute seule.)
// ============================================================================

import * as Sentry from '@sentry/nextjs';

export function reportError(...args) {
  console.error(...args);

  const errObj = args.find(a => a instanceof Error) || null;
  const message = (
    args
      .map(a => typeof a === 'string' ? a : (a?.message || safeJson(a)))
      .filter(Boolean)
      .join(' ')
      .slice(0, 500)
  ) || 'Erreur inconnue';

  // Sentry : no-op sans DSN (compte supprimé 2026-07 — hook conservé).
  try { Sentry.captureException(errObj || new Error(message)); } catch { /* jamais bloquant */ }

  // Journal DB (v71) : serveur uniquement, fire-and-forget.
  if (typeof window !== 'undefined') return;
  void (async () => {
    try {
      const { createAdminClient } = await import('@/lib/supabase-admin');
      await createAdminClient().from('erreurs_app').insert({
        message,
        stack: (errObj?.stack || '').slice(0, 2000) || null,
        contexte: { args_types: args.map(a => a instanceof Error ? 'Error' : typeof a) },
      });
    } catch { /* table absente / env manquante : console.error a déjà tout dit */ }
  })();
}

function safeJson(v) {
  try { return JSON.stringify(v)?.slice(0, 200); } catch { return String(v); }
}
