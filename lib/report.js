// ============================================================================
// IziSolo — reportError : console.error + remontée Sentry (drop-in)
// ----------------------------------------------------------------------------
// L'angle mort n°1 du monitoring (carte de chaleur + campagne 2026-07-24) :
// ~42 routes API attrapaient leurs erreurs, faisaient console.error, et
// renvoyaient un 500 — Sentry ne voyait RIEN (instrumentation.js ne capture
// que le non-catché). Une 42703 a pu tuer l'annulation élève pendant des
// semaines sans une alerte.
//
// `reportError(...)` remplace `console.error(...)` à l'identique (mêmes
// arguments, même sortie console) et pousse EN PLUS l'erreur à Sentry :
//   - si un des arguments est une Error → capturée telle quelle ;
//   - sinon, un message synthétique est construit à partir des arguments.
// Sans SENTRY_DSN configurée, captureException est un no-op silencieux.
// ============================================================================

import * as Sentry from '@sentry/nextjs';

export function reportError(...args) {
  console.error(...args);
  try {
    const err = args.find(a => a instanceof Error)
      || new Error(
        args
          .map(a => typeof a === 'string' ? a : (a?.message || safeJson(a)))
          .filter(Boolean)
          .join(' ')
          .slice(0, 300) || 'Erreur inconnue'
      );
    Sentry.captureException(err);
  } catch { /* le monitoring ne doit jamais casser la route */ }
}

function safeJson(v) {
  try { return JSON.stringify(v)?.slice(0, 200); } catch { return String(v); }
}
