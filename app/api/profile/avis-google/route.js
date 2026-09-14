import { z } from 'zod';
import { withRoute } from '@/lib/api-route';
import { poserAvisGoogle, chargerAvisGoogle, lienAvisValide } from '@/lib/avis-google';

/**
 * PATCH /api/profile/avis-google — le lien d'avis Google et l'email
 * automatique (v117).
 *
 * Route SÉPARÉE (patron v104) : la colonne est neuve, et la mettre dans le
 * payload de la carte Page publique ferait échouer TOUTE la sauvegarde tant
 * que v117 n'est pas appliquée. Ici un échec ne coûte que ce réglage, et on
 * le DIT.
 *
 * `{ lien: null }` (ou vide) retire le réglage. Un lien qui n'est pas une
 * adresse Google en https est REFUSÉ (400) : on n'imprime pas un QR vers une
 * adresse cassée, et on n'envoie pas d'email vers n'importe où.
 */
const schema = z.object({
  lien: z.string().max(500).nullable().optional(),
  auto: z.boolean().optional(),
});

export const PATCH = withRoute(
  { auth: 'active', schema, perm: 'parametres' },
  async ({ auth, body }) => {
    const { studioId, supabase } = auth;
    const lien = typeof body.lien === 'string' ? body.lien.trim() : '';

    if (lien && !lienAvisValide(lien)) {
      return Response.json(
        {
          error: "Ce lien ne ressemble pas à une adresse d'avis Google. Copie celle que te donne ta fiche Google Business Profile (bouton « Demander des avis »).",
          code: 'LIEN_INVALIDE',
        },
        { status: 400 }
      );
    }

    const res = await poserAvisGoogle(supabase, studioId, lien ? { lien, auto: body.auto !== false } : null);
    if (!res.ok) {
      return Response.json(
        {
          error: res.migrationManquante
            ? "Cette mise à jour n'est pas encore appliquée : ton lien d'avis n'a pas pu être enregistré. Le reste de ta page publique n'est pas touché."
            : "Ton lien d'avis n'a pas pu être enregistré.",
          code: res.migrationManquante ? 'MIGRATION_V117_REQUISE' : 'UPDATE_FAILED',
        },
        { status: res.migrationManquante ? 503 : 500 }
      );
    }

    const config = await chargerAvisGoogle(supabase, studioId);
    return Response.json({ ok: true, avis_google: config });
  }
);
