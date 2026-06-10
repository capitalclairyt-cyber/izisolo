import * as Sentry from '@sentry/nextjs';
import { requireAuth, requireActiveAccount, requireCronAuth } from './api-auth';
import { checkRateLimitIP } from './antibot';

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
 *             'public' → aucune auth (le préciser explicitement)
 *   schema    schéma zod appliqué au body JSON (POST/PATCH/PUT). Le handler
 *             reçoit `body` validé. Sans schema, le handler lit request lui-même.
 *   rateLimit { max, windowSeconds?, scope } → checkRateLimitIP (429)
 *
 * Le handler reçoit { request, params, auth, body } :
 *   params  déjà awaités (Next 15+ les fournit en Promise)
 *   auth    { user, profile, supabase } ou null si auth: 'public'|'cron'
 *
 * Périmètres qui ne passent PAS par ce wrapper (patterns dédiés assumés) :
 *   portail public (antibot+zod+RPC, cf. Sprint 1), webhooks Stripe (raw
 *   body + signature), crons existants, admin (ADMIN_EMAILS), streaming LLM.
 */
export function withRoute(opts, handler) {
  const { auth = 'user', schema = null, rateLimit = null } = opts || {};

  return async function route(request, ctx) {
    try {
      if (rateLimit) {
        const rl = checkRateLimitIP(request, rateLimit);
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
      Sentry.captureException(err);
      let pathname = '';
      try { pathname = new URL(request.url).pathname; } catch {}
      console.error(`[api] ${request?.method || '?'} ${pathname} :`, err);
      return Response.json({ error: 'Erreur serveur', code: 'INTERNAL' }, { status: 500 });
    }
  };
}
