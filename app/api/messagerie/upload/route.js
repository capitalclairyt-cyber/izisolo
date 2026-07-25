import { put } from '@vercel/blob';
import { withRoute } from '@/lib/api-route';
import { checkRateLimitIP } from '@/lib/antibot';
import { reportError } from '@/lib/report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024;     // 5 Mo (le client a déjà resize côté images)
const ALLOWED_IMAGES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_FILES  = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const ALLOWED = [...ALLOWED_IMAGES, ...ALLOWED_FILES];

/**
 * POST /api/messagerie/upload
 *  body : multipart/form-data { file: File }
 *  → upload Vercel Blob, retourne { url, kind: 'photo'|'file' }
 *
 * Variable d'env requise : BLOB_READ_WRITE_TOKEN
 */
export const POST = withRoute({ auth: 'user' }, async ({ request, auth }) => {
  const { user } = auth;

  // Un blob = jusqu'à 5 Mo sur le store partagé → on borne la cadence
  // (30 pièces jointes / heure / IP, largement au-dessus d'un usage réel).
  // Rate-limit gardé en interne : message d'erreur dédié (≠ générique wrapper).
  const rl = await checkRateLimitIP(request, { max: 30, windowSeconds: 3600, scope: 'messagerie-upload' });
  if (!rl.ok) {
    return Response.json({ error: 'Trop d\'envois de fichiers — réessaie dans un moment.' }, { status: 429 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({
      error: 'Upload pièce jointe non configuré côté serveur.',
    }, { status: 503 });
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
    return Response.json({ error: 'Format non supporté (JPG/PNG/WebP/GIF/PDF/DOC/DOCX)' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({
      error: `Fichier trop lourd (${Math.round(file.size / 1024)} Ko, max ${Math.round(MAX_BYTES / 1024 / 1024)} Mo)`,
    }, { status: 400 });
  }

  const isImage = ALLOWED_IMAGES.includes(file.type);
  const ext = file.name.split('.').pop().toLowerCase().slice(0, 8) || 'bin';
  const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(-50);
  const key = `messagerie/${user.id}/${Date.now()}-${safeName}`;

  let blob;
  try {
    blob = await put(key, file, {
      access: 'public',
      contentType: file.type,
      cacheControlMaxAge: 31536000,
      // URL non devinable même si la clé (user.id + nom) fuit quelque part.
      addRandomSuffix: true,
    });
  } catch (err) {
    reportError('[messagerie/upload] blob put err:', err);
    return Response.json({ error: 'Erreur téléversement' }, { status: 500 });
  }

  return Response.json({
    ok: true,
    url: blob.url,
    kind: isImage ? 'photo' : 'file',
    name: file.name,
    size: file.size,
    type: file.type,
  });
});
