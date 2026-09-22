/**
 * lib/i18n-portail-serveur.js — la langue du portail, côté SERVEUR.
 *
 * Deux lecteurs, un seul principe (lib/i18n-portail) : le cookie de la
 * visiteuse d'abord, le réglage du studio ensuite, le français sinon.
 *
 *   - `languePortail(studioSlug)` : pour un composant ou une page serveur
 *     (lit `cookies()` de Next).
 *   - `langueDepuisRequete(request, studioSlug)` : pour une route API (lit le
 *     cookie sur la requête), utilisée pour écrire un EMAIL dans la langue de
 *     l'élève qui vient de réserver ou de demander son lien.
 *
 * Le réglage du studio est lu par une requête SÉPARÉE et défensive (patron
 * v104 / v108) : `langue_portail` n'entre jamais dans un select de portail.
 * Sans v121, la colonne manque et tout le monde reste en français, ou dans la
 * langue de son cookie, exactement comme si le studio n'avait rien réglé.
 */
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase-admin';
import { COOKIE_LANGUE, resoudreLangue, traducteur } from '@/lib/i18n-portail';

/** Le réglage du studio, ou null (colonne absente, service_role absente…). */
export async function langueDuStudio(studioSlug) {
  if (!studioSlug) return null;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('profiles')
      .select('langue_portail')
      .eq('studio_slug', studioSlug)
      .maybeSingle();
    if (error) return null;
    return data?.langue_portail || null;
  } catch {
    return null;
  }
}

/** Langue d'une page ou d'un layout serveur du portail. */
export async function languePortail(studioSlug) {
  let cookie = null;
  try {
    const store = await cookies();
    cookie = store.get(COOKIE_LANGUE)?.value || null;
  } catch { /* hors contexte de requête : pas de cookie */ }
  const studio = await langueDuStudio(studioSlug);
  return resoudreLangue({ cookie, studio });
}

/** Le `t` d'une page serveur : `const t = await traducteurPortail(slug)`. */
export async function traducteurPortail(studioSlug) {
  return traducteur(await languePortail(studioSlug));
}

/** Langue d'une route API, depuis le cookie de la requête (+ studio). */
export async function langueDepuisRequete(request, studioSlug) {
  let cookie = null;
  try {
    cookie = request?.cookies?.get?.(COOKIE_LANGUE)?.value || null;
    if (!cookie) {
      const brut = request?.headers?.get?.('cookie') || '';
      const m = brut.match(new RegExp(`(?:^|;\\s*)${COOKIE_LANGUE}=([^;]+)`));
      cookie = m ? decodeURIComponent(m[1]) : null;
    }
  } catch { /* requête sans cookies */ }
  const studio = await langueDuStudio(studioSlug);
  return resoudreLangue({ cookie, studio });
}
