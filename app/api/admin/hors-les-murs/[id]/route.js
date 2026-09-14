import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { reportError } from '@/lib/report';
import { MOTIFS_ECART } from '@/lib/hors-les-murs';
import { appliquerAction } from '@/lib/hors-les-murs-service';

const texte = { objet: z.string().max(120).optional(), corps: z.string().max(4000).optional() };
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('enregistrer'), ...texte }),
  z.object({ action: z.literal('valider'), ...texte }),
  z.object({ action: z.literal('marquer_envoye'), ...texte }),
  z.object({ action: z.literal('demander_modif'), commentaire: z.string().min(1).max(2000) }),
  z.object({ action: z.literal('reponse'), reponse: z.string().max(2000).optional() }),
  z.object({ action: z.literal('en_cours'), reponse: z.string().max(2000).optional() }),
  z.object({ action: z.literal('ecarter'), motif: z.enum(Object.keys(MOTIFS_ECART)) }),
  z.object({ action: z.literal('remettre') }),
]);

// Une piste « Hors les murs » (v118) : relue, validée, envoyée depuis la boîte de Maude, répondue, écartée.
export const PATCH = withRoute({ auth: 'admin', schema }, async ({ body, params }) => {
  const admin = createAdminClient();
  const id = String(params?.id || '');
  const r = await appliquerAction(admin, id, body);
  if (!r.ok) {
    if (r.status >= 500) reportError('[admin/hors-les-murs]', new Error(r.message), { route: '/api/admin/hors-les-murs/[id]', code: r.code, action: body.action, id });
    return Response.json({ error: r.message, code: r.code }, { status: r.status || 400 });
  }
  return Response.json({ ok: true, fiche: r.fiche, notification: r.notification });
});
