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
// table/env manquent. (SDK Sentry RETIRÉ en B2d 2026-07-25, décision D4 :
// compte supprimé depuis 2026-07, le no-op câblé partout n'apportait que du
// poids de bundle — un retour au SaaS de monitoring se ferait sur une
// intégration fraîche, pas sur ces vestiges.)
// ============================================================================

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

  // Journal DB (v71) : serveur uniquement. Renvoie la promesse d'écriture :
  // les appelants classiques l'ignorent (fire-and-forget inchangé), mais un
  // chemin d'erreur peut l'`await` — sur Vercel, la lambda peut geler dès la
  // réponse rendue, et un insert non attendu part parfois dans le vide.
  if (typeof window !== 'undefined') return;

  // Contexte enrichi : les objets simples passés en argument (ex: { route })
  // remontent dans `contexte` pour le groupement du radar.
  const contexte = { args_types: args.map(a => a instanceof Error ? 'Error' : typeof a) };
  for (const a of args) {
    if (a && typeof a === 'object' && !(a instanceof Error) && !Array.isArray(a)) {
      for (const [k, v] of Object.entries(a)) {
        if (contexte[k] !== undefined) continue;
        const s = typeof v === 'string' ? v : safeJson(v);
        if (s != null) contexte[k] = String(s).slice(0, 300);
      }
    }
  }

  return (async () => {
    try {
      const { createAdminClient } = await import('@/lib/supabase-admin');
      await createAdminClient().from('erreurs_app').insert({
        message,
        stack: (errObj?.stack || '').slice(0, 2000) || null,
        contexte,
      });
    } catch { /* table absente / env manquante : console.error a déjà tout dit */ }
  })();
}

function safeJson(v) {
  try { return JSON.stringify(v)?.slice(0, 200); } catch { return String(v); }
}
