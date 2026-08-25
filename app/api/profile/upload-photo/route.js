import { put, del } from '@vercel/blob';
import { withRoute } from '@/lib/api-route';
import { reportError } from '@/lib/report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 2 * 1024 * 1024;     // 2 Mo (le client a déjà resize)
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

// Deux familles de kinds :
//  - ceux qui VIVENT dans une colonne de profiles : la route écrit elle-même ;
//  - ceux que l'appelant range ailleurs (une carte jsonb par type de cours, la
//    colonne photo_url d'UNE séance — v99) : la route se contente de stocker et
//    de rendre l'URL, et c'est le formulaire qui l'enregistre en la validant.
const KIND_FIELDS = { profil: 'photo_url', couverture: 'photo_couverture' };
const KINDS_SANS_COLONNE = ['vignette', 'cours'];

/**
 * POST /api/profile/upload-photo?kind=profil|couverture|vignette|cours[&remplace=<url>]
 *  body : multipart/form-data { file: File }
 *  → upload Vercel Blob, puis :
 *      profil|couverture  : supprime l'ancienne et met à jour la colonne du profil
 *      vignette|cours     : rend juste { url }, l'appelant l'enregistre
 *
 * `remplace` (kinds sans colonne) : l'URL que cette photo remplace, supprimée du
 * Blob pour ne pas laisser un orphelin. Contrôle de propriété OBLIGATOIRE sur le
 * chemin `profiles/<user.id>/` — sans lui, le paramètre serait une primitive de
 * suppression du fichier de n'importe qui.
 *
 * Variable d'env requise : BLOB_READ_WRITE_TOKEN (Vercel Dashboard → Storage → Blob)
 */
export const POST = withRoute({ auth: 'user' }, async ({ request, auth }) => {
  const { studioId, user, profile, supabase } = auth;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({
      error: 'Upload photo non configuré côté serveur. L\'admin doit créer un Blob store sur Vercel.',
    }, { status: 503 });
  }

  const url = new URL(request.url);
  const kind = url.searchParams.get('kind') || 'profil';
  const targetField = KIND_FIELDS[kind] || null;
  if (!targetField && !KINDS_SANS_COLONNE.includes(kind)) {
    return Response.json({ error: 'kind invalide (profil, couverture, vignette ou cours)' }, { status: 400 });
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
      // Vignettes et photos de séance se déposent parfois en rafale (une par
      // type) : sans suffixe, deux uploads dans la même milliseconde
      // partageraient la clé et la seconde écraserait la première.
      ...(targetField ? {} : { addRandomSuffix: true }),
    });
  } catch (err) {
    reportError('[upload-photo] blob put error:', err);
    return Response.json({ error: 'Erreur lors du téléversement' }, { status: 500 });
  }

  // L'ancienne photo à jeter : celle du profil pour les kinds à colonne, celle
  // que l'appelant déclare remplacer pour les autres.
  const ancienneUrl = targetField
    ? profile?.[targetField]
    : url.searchParams.get('remplace');

  const estANous = typeof ancienneUrl === 'string'
    && ancienneUrl.includes('.public.blob.vercel-storage.com')
    // Propriété prouvée par le chemin (les clés sont `profiles/<uid>/…`) :
    // sans ce contrôle, `remplace` supprimerait le fichier de n'importe qui.
    && (targetField || ancienneUrl.includes(`/profiles/${user.id}/`));

  if (estANous) {
    try { await del(ancienneUrl); } catch (e) { console.warn('[upload-photo] cleanup ancienne:', e?.message); }
  }

  // Kinds sans colonne (vignette par type, photo d'une séance) : c'est
  // l'appelant qui enregistre, après validation par lib/vignette-cours.js.
  if (!targetField) {
    return Response.json({ ok: true, url: blob.url, field: null });
  }

  // Update profile
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ [targetField]: blob.url })
    .eq('id', studioId);

  if (updateErr) {
    reportError('[upload-photo] update profile error:', updateErr);
    return Response.json({ error: 'Erreur lors de la mise à jour du profil' }, { status: 500 });
  }

  return Response.json({ ok: true, url: blob.url, field: targetField });
});
