import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { createAdminClient } from '@/lib/supabase-admin';
import { reportError } from '@/lib/report';
import { ajouterProspect } from '@/lib/prospection-service';

const schema = z.object({
  nom: z.string().trim().min(1).max(160),
  prenom: z.string().trim().max(80).optional(),
  email: z.string().trim().toLowerCase().email().max(160),
  ville: z.string().trim().max(160).optional(),
  site: z.string().trim().max(300).optional(),
  specialite: z.string().trim().max(200).optional(),
  source: z.string().trim().max(60).default('site'),
  notes: z.string().trim().max(4000).optional(),
});

// Une prof trouvée à la main (un site envoyé par Colin) entre dans le module
// avec un brouillon prêt à rédiger (v109). Dédup par adresse, écartée = refus.
export const POST = withRoute({ auth: 'admin', schema }, async ({ body }) => {
  const r = await ajouterProspect(createAdminClient(), body);
  if (!r.ok) {
    if (r.status >= 500) reportError('[admin/prospection] ajouter:', new Error(r.message), { route: '/api/admin/prospection/ajouter', code: r.code });
    return Response.json({ error: r.message, code: r.code }, { status: r.status || 400 });
  }
  return Response.json({ ok: true, prospect: r.prospect, email: r.email, reprise: r.reprise });
});
