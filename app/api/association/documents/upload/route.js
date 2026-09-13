import { put } from '@vercel/blob';
import { withRoute } from '@/lib/api-route';
import { reportError } from '@/lib/report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

/**
 * POST /api/association/documents/upload — dépôt d'un document de la
 * structure (v113) : statuts, récépissé, PV… Même chemin que v85 (Vercel
 * Blob, URL non devinable). Permission `documents`.
 */
export const POST = withRoute({ auth: 'active', plan: 'vie_asso', perm: 'documents', rateLimit: { max: 30, windowSeconds: 3600, scope: 'asso-docs' } }, async ({ request, auth }) => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: 'Dépôt de documents non configuré côté serveur.', code: 'BLOB_ABSENT' }, { status: 503 });
  }
  let formData;
  try { formData = await request.formData(); } catch {
    return Response.json({ error: 'Requête invalide (multipart attendu)' }, { status: 400 });
  }
  const file = formData.get('file');
  if (!file || typeof file === 'string') return Response.json({ error: 'Fichier manquant' }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return Response.json({ error: 'Format non supporté : PDF, JPEG, PNG ou WebP.' }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: `Fichier trop lourd (${Math.round(file.size / 1024)} Ko, max 10 Mo)` }, { status: 400 });
  const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(-60);
  try {
    const blob = await put(`association/${auth.studioId}/${Date.now()}-${safeName}`, file, { access: 'public', contentType: file.type, cacheControlMaxAge: 31536000, addRandomSuffix: true });
    const titre = file.name.replace(/\.(pdf|jpe?g|png|webp)$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 120);
    return Response.json({ ok: true, url: blob.url, titre });
  } catch (err) {
    reportError('[association/documents/upload] blob put err:', err);
    return Response.json({ error: 'Erreur téléversement' }, { status: 500 });
  }
});
