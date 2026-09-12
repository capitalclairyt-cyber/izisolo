import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { reportError } from '@/lib/report';
import { TIRAGE_MAX } from '@/lib/prospection';
import { tirerProspects } from '@/lib/prospection-service';

const schema = z.object({ n: z.number().int().min(1).max(TIRAGE_MAX).default(5) });

// Tire N profs « dans la pile » et les passe « à rédiger », avec un brouillon
// gabarit chacune (v109, /admin/prospection).
export const POST = withRoute({ auth: 'admin', schema }, async ({ body }) => {
  const r = await tirerProspects(createAdminClient(), body.n);
  if (!r.ok) {
    if (r.status >= 500) reportError('[admin/prospection] tirage:', new Error(r.message), { route: '/api/admin/prospection/tirage', code: r.code });
    return Response.json({ error: r.message, code: r.code }, { status: r.status || 400 });
  }
  return Response.json({ ok: true, tires: r.tires, restants: r.restants });
});
