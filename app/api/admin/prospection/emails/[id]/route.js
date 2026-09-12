import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { reportError } from '@/lib/report';
import { enregistrerTexte, envoyerEmailProspection, annulerProgramme } from '@/lib/prospection-service';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('enregistrer'), objet: z.string().max(160), corps: z.string().max(6000) }),
  z.object({ action: z.literal('envoyer'), a: z.string().regex(/^\d{2}:\d{2}$/).optional() }),
  z.object({ action: z.literal('annuler') }),
]);

// Un email de prospection (v109) : on l'enregistre, on l'envoie (tout de
// suite ou programmé à HH:MM Paris), on annule un envoi programmé.
export const PATCH = withRoute({ auth: 'admin', schema }, async ({ body, params }) => {
  const admin = createAdminClient();
  const id = String(params?.id || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: 'Email introuvable' }, { status: 404 });

  let r;
  if (body.action === 'enregistrer') r = await enregistrerTexte(admin, id, body);
  else if (body.action === 'envoyer') r = await envoyerEmailProspection(admin, id, { a: body.a || null });
  else r = await annulerProgramme(admin, id);

  if (!r.ok) {
    if (r.status >= 500) reportError('[admin/prospection] email:', new Error(r.message), { route: '/api/admin/prospection/emails/[id]', code: r.code, action: body.action });
    return Response.json({ error: r.message, code: r.code }, { status: r.status || 400 });
  }
  return Response.json({ ok: true, email: r.email, programme: !!r.programme });
});
