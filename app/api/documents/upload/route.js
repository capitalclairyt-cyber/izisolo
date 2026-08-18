import { put } from '@vercel/blob';
import { withRoute } from '@/lib/api-route';
import { reportError } from '@/lib/report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024; // 5 Mo — un QS-SPORT ou des CGV tiennent large
const ALLOWED = ['application/pdf'];

/**
 * POST /api/documents/upload — dépôt d'un document d'inscription (v85).
 *  body : multipart/form-data { file: File (PDF) }
 *  → upload Vercel Blob (comme les PJ messagerie), retourne { url, nom }
 *
 * auth 'active' : configurer ses documents = geste de compte actif (pas gelé).
 * La liste elle-même est sauvée par Paramètres dans profiles.docs_inscription
 * (carte « Documents d'inscription », max lib/docs-inscription.MAX_DOCS).
 */
export const POST = withRoute({ auth: 'active', rateLimit: { max: 15, windowSeconds: 3600, scope: 'docs-upload' } }, async ({ request, auth }) => {
  const { user } = auth;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: 'Dépôt de documents non configuré côté serveur.' }, { status: 503 });
  }

  let formData;
  try { formData = await request.formData(); } catch {
    return Response.json({ error: 'Requête invalide (multipart attendu)' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return Response.json({ error: 'Fichier manquant' }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return Response.json({ error: 'Format non supporté — dépose un PDF.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({
      error: `Fichier trop lourd (${Math.round(file.size / 1024)} Ko, max 5 Mo)`,
    }, { status: 400 });
  }

  const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(-50);
  const key = `docs-inscription/${user.id}/${Date.now()}-${safeName}`;

  let blob;
  try {
    blob = await put(key, file, {
      access: 'public',
      contentType: file.type,
      cacheControlMaxAge: 31536000,
      addRandomSuffix: true, // URL non devinable
    });
  } catch (err) {
    reportError('[documents/upload] blob put err:', err);
    return Response.json({ error: 'Erreur téléversement' }, { status: 500 });
  }

  // nom proposé = nom du fichier sans extension, humanisé (la prof peut le renommer)
  const nom = file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 80) || 'Document';

  return Response.json({ ok: true, url: blob.url, nom });
});
