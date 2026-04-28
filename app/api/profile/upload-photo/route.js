import { put, del } from '@vercel/blob';
import { requireAuth } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 2 * 1024 * 1024;     // 2 Mo (le client a déjà resize)
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const KIND_FIELDS = { profil: 'photo_url', couverture: 'photo_couverture' };

/**
 * POST /api/profile/upload-photo?kind=profil|couverture
 *  body : multipart/form-data { file: File }
 *  → upload Vercel Blob, supprime l'ancienne, update profile.photo_url|photo_couverture
 *
 * Variable d'env requise : BLOB_READ_WRITE_TOKEN (Vercel Dashboard → Storage → Blob)
 */
export async function POST(request) {
  let user, profile, supabase;
  try {
    ({ user, profile, supabase } = await requireAuth());
  } catch (res) {
    return res;
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({
      error: 'Upload photo non configuré côté serveur. L\'admin doit créer un Blob store sur Vercel.',
    }, { status: 503 });
  }

  const url = new URL(request.url);
  const kind = url.searchParams.get('kind') || 'profil';
  const targetField = KIND_FIELDS[kind];
  if (!targetField) {
    return Response.json({ error: 'kind invalide (profil ou couverture)' }, { status: 400 });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Requête invalide (multipart attendu)' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return Response.json({ error: 'Fichier manquant' }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return Response.json({ error: 'Format non supporté (JPG, PNG ou WebP uniquement)' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({
      error: `Fichier trop lourd (${Math.round(file.size / 1024)} Ko, max ${Math.round(MAX_BYTES / 1024 / 1024)} Mo)`,
    }, { status: 400 });
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const key = `profiles/${user.id}/${kind}-${Date.now()}.${ext}`;

  let blob;
  try {
    blob = await put(key, file, {
      access: 'public',
      contentType: file.type,
      cacheControlMaxAge: 31536000, // 1 an
    });
  } catch (err) {
    console.error('[upload-photo] blob put error:', err);
    return Response.json({ error: 'Erreur lors du téléversement' }, { status: 500 });
  }

  // Supprimer l'ancienne photo si elle est dans notre Blob
  const ancienneUrl = profile?.[targetField];
  if (ancienneUrl && ancienneUrl.includes('.public.blob.vercel-storage.com')) {
    try { await del(ancienneUrl); } catch (e) { console.warn('[upload-photo] cleanup ancienne:', e?.message); }
  }

  // Update profile
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ [targetField]: blob.url })
    .eq('id', user.id);

  if (updateErr) {
    console.error('[upload-photo] update profile error:', updateErr);
    return Response.json({ error: 'Erreur lors de la mise à jour du profil' }, { status: 500 });
  }

  return Response.json({ ok: true, url: blob.url, field: targetField });
}
