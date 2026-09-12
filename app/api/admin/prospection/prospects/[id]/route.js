import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { reportError } from '@/lib/report';
import { MOTIFS_ECART } from '@/lib/prospection';
import { marquerReponse, ecarterProspect, remettreDansLaPile, preparerRelance } from '@/lib/prospection-service';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('repondu') }),
  z.object({ action: z.literal('non_repondu') }),
  z.object({ action: z.literal('ecarter'), motif: z.enum(Object.keys(MOTIFS_ECART)) }),
  z.object({ action: z.literal('remettre') }),
  z.object({ action: z.literal('relance') }),
]);

// Une prof du module (v109) : a répondu, écartée, remise dans la pile, relance préparée.
export const PATCH = withRoute({ auth: 'admin', schema }, async ({ body, params }) => {
  const admin = createAdminClient();
  const id = String(params?.id || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: 'Prof introuvable' }, { status: 404 });

  let r;
  if (body.action === 'repondu') r = await marquerReponse(admin, id, true);
  else if (body.action === 'non_repondu') r = await marquerReponse(admin, id, false);
  else if (body.action === 'ecarter') r = await ecarterProspect(admin, id, body.motif);
  else if (body.action === 'remettre') r = await remettreDansLaPile(admin, id);
  else r = await preparerRelance(admin, id);

  if (!r.ok) {
    if (r.status >= 500) reportError('[admin/prospection] prospect:', new Error(r.message), { route: '/api/admin/prospection/prospects/[id]', code: r.code, action: body.action });
    return Response.json({ error: r.message, code: r.code }, { status: r.status || 400 });
  }
  return Response.json({ ok: true, prospect: r.prospect || null, email: r.email || null });
});
