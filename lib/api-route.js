import { requireAuth, requireActiveAccount, requireCronAuth } from './api-auth';
import { isAdminEmail } from './admin';
import { reportError } from './report';
import { checkRateLimitIP } from './antibot';
import { guardOrFail } from './plan-guard';

/**
 * withRoute — wrapper standard des routes API (Sprint 2 audit technique).
 *
 * Centralise : auth (+ 402 compte gelé), validation zod, rate-limit IP,
 * capture Sentry, et un format d'erreur UNIQUE : { error, code, issues? }.
 *
 * Usage :
 *   export const POST = withRoute(
 *     { auth: 'active', schema: monSchema },
 *     async ({ request, params, auth, body }) => {
 *       const { user, profile, supabase } = auth;
 *       return Response.json({ ok: true });
 *     }
 *   );
 *
 * Options :
 *   auth      'user'   → requireAuth() (session prof/élève requise)
 *             'active' → requireActiveAccount() (session + compte non gelé ;
 *                        402 si trial expiré / abo annulé) — OBLIGATOIRE sur
 *                        toute création/modification de ressource métier
 *             'cron'   → requireCronAuth(request) (Bearer CRON_SECRET)
 *             'admin'  → requireAuth() + isAdminEmail (403 JSON sinon)
 *             'public' → aucune auth (le préciser explicitement)
 *   schema    schéma zod appliqué au body JSON (POST/PATCH/PUT). Le handler
 *             reçoit `body` validé. Sans schema, le handler lit request lui-même.
 *   rateLimit { max, windowSeconds?, scope } → checkRateLimitIP (429)
 *   plan      action plan-guard (ex: 'mailing', 'export_compta') → 403 +
 *             { upgradeTo } si le plan EFFECTIF (trial inclus) ne l'inclut pas
 *
 * Le handler reçoit { request, params, auth, body } :
 *   params  déjà awaités (Next 15+ les fournit en Promise)
 *   auth    { user, profile, supabase } ou null si auth: 'public'|'cron'
 *
 * Depuis B2c (2026-07-25), TOUTES les routes passent par ce wrapper — y
 * compris portail public (auth:'public', antibot/zod conservés en interne),
 * webhooks Stripe (auth:'public', signature vérifiée dans le handler, le
 * wrapper ne consomme jamais le body sans `schema`), crons (auth:'cron'),
 * admin (auth:'admin') et streaming LLM (le handler peut retourner une
 * Response stream, le wrapper n'y touche pas). Le ratchet
 * tests/e2e/route-standards.spec.js fait échouer la CI si une nouvelle
 * route apparaît hors standard.
 */
export function withRoute(opts, handler) {
  const { auth = 'user', schema = null, rateLimit = null, plan = null } = opts || {};

  return async function route(request, ctx) {
    try {
      if (rateLimit) {
        const rl = await checkRateLimitIP(request, rateLimit);
        if (!rl.ok) {
          return Response.json({ error: rl.reason, code: 'RATE_LIMITED' }, { status: 429 });
        }
      }

      let authCtx = null;
      if (auth === 'cron') {
        requireCronAuth(request);
      } else if (auth === 'active') {
        authCtx = await requireActiveAccount();
      } else if (auth === 'user') {
        authCtx = await requireAuth();
      } else if (auth === 'admin') {
        authCtx = await requireAuth();
        if (!isAdminEmail(authCtx.user?.email)) {
          return Response.json({ error: 'Accès réservé', code: 'FORBIDDEN' }, { status: 403 });
        }
      }

      // Gate de plan (Sprint 3) : la feature doit être incluse dans le plan
      // EFFECTIF du compte (trial 14j = pro). 403 + upgradeTo sinon.
      if (plan && authCtx) {
        const guard = await guardOrFail(authCtx.supabase, authCtx.user.id, plan);
        if (guard) return guard;
      }

      let body;
      if (schema) {
        const raw = await request.json().catch(() => null);
        if (raw === null) {
          return Response.json({ error: 'Body JSON invalide', code: 'BAD_JSON' }, { status: 400 });
        }
        const parsed = schema.safeParse(raw);
        if (!parsed.success) {
          const issues = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
          return Response.json({ error: 'Données invalides', code: 'VALIDATION', issues }, { status: 400 });
        }
        body = parsed.data;
      }

      const params = ctx?.params ? await ctx.params : {};
      return await handler({ request, params, auth: authCtx, body });
    } catch (err) {
      // requireAuth / requireActiveAccount / requireCronAuth lancent des Response
      if (err instanceof Response) return err;
      let pathname = '';
      try { pathname = new URL(request.url).pathname; } catch { /* URL improbablement invalide : le rapport part sans route */ }
      // AWAITÉ : le chemin d'erreur paie ~50 ms pour garantir la ligne dans
      // erreurs_app même si la lambda gèle juste après la réponse.
      try { await reportError(`[api] ${request?.method || '?'} ${pathname} :`, err, { route: pathname }); } catch { /* le chemin d'erreur ne throw JAMAIS (pas de reportError du reportError) */ }
      return Response.json({ error: 'Erreur serveur', code: 'INTERNAL' }, { status: 500 });
    }
  };
}
