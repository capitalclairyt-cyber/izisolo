import { put } from '@vercel/blob';
import { withRoute } from '@/lib/api-route';
import { reportError } from '@/lib/report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

/**
 * POST /api/depenses/justificatif — le justificatif d'une dépense (v112) :
 * une facture PDF, ou la photo d'un ticket. Même chemin que les documents
 * d'inscription (v85) : Vercel Blob, URL non devinable. Plan `depenses`,
 * permission `argent_gerer`.
 */
export const POST = withRoute({ auth: 'active', plan: 'depenses', perm: 'argent_gerer', rateLimit: { max: 40, windowSeconds: 3600, scope: 'depenses-justif' } }, async ({ request, auth }) => {
  const { studioId } = auth;
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: 'Dépôt de justificatifs non configuré côté serveur.', code: 'BLOB_ABSENT' }, { status: 503 });
  }
  let formData;
  try { formData = await request.formData(); } catch {
    return Response.json({ error: 'Requête invalide (multipart attendu)' }, { status: 400 });
  }
  const file = formData.get('file');
  if (!file || typeof file === 'string') return Response.json({ error: 'Fichier manquant' }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return Response.json({ error: 'Format non supporté : PDF, JPEG, PNG ou WebP.' }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: `Fichier trop lourd (${Math.round(file.size / 1024)} Ko, max 8 Mo)` }, { status: 400 });
  const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(-60);
  try {
    const blob = await put(`depenses/${studioId}/${Date.now()}-${safeName}`, file, { access: 'public', contentType: file.type, cacheControlMaxAge: 31536000, addRandomSuffix: true });
    return Response.json({ ok: true, url: blob.url });
  } catch (err) {
    reportError('[depenses/justificatif] blob put err:', err);
    return Response.json({ error: 'Erreur téléversement' }, { status: 500 });
  }
});
