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
import { COOKIE_LANGUE, langueEleve, normaliserLangue, resoudreLangue, traducteur } from '@/lib/i18n-portail';

/** Le cookie de langue de la visiteuse courante, normalisé, ou null. */
export async function cookieLangueVisiteuse() {
  try {
    const store = await cookies();
    return normaliserLangue(store.get(COOKIE_LANGUE)?.value) || null;
  } catch {
    return null;
  }
}

// ── v122 : la langue mémorisée sur la FICHE, pour les emails et les push ──
// Une élève qui bascule EN sur son téléphone doit recevoir son rappel J-1 en
// anglais, et le cron n'a pas son cookie. On écrit donc son choix sur sa
// fiche (par studio), par un UPDATE séparé et conditionnel : jamais dans un
// insert ni dans un select principal (patron poserLienVisio v86 / v120).
// Sans la colonne (pré-v122) l'UPDATE échoue en silence et rien ne change.

/**
 * Pose la langue choisie sur une fiche, seulement si elle diffère (un seul
 * UPDATE, aucune lecture). `langue` null ou inconnue : on n'écrit rien.
 */
export async function poserLangueFiche(admin, clientId, langue) {
  const l = normaliserLangue(langue);
  if (!admin || !clientId || !l) return false;
  try {
    const { error } = await admin
      .from('clients')
      .update({ langue: l })
      .eq('id', clientId)
      .or(`langue.is.null,langue.neq.${l}`);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Les langues mémorisées d'un lot de fiches : Map(id → 'fr' | 'en' | null).
 * Défensif : colonne absente ou erreur → une Map vide (tout le monde suit le
 * studio, puis le français). Par paquets de 200 ids.
 */
export async function chargerLanguesFiches(admin, clientIds) {
  const out = new Map();
  const ids = [...new Set((clientIds || []).filter(Boolean))];
  if (!admin || !ids.length) return out;
  try {
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await admin
        .from('clients')
        .select('id, langue')
        .in('id', ids.slice(i, i + 200));
      if (error) return out;
      for (const row of data || []) out.set(row.id, normaliserLangue(row.langue));
    }
  } catch { /* pré-v122 */ }
  return out;
}

/** Les langues par défaut d'un lot de studios : Map(id → 'fr' | 'en' | null). */
export async function chargerLanguesStudios(admin, profileIds) {
  const out = new Map();
  const ids = [...new Set((profileIds || []).filter(Boolean))];
  if (!admin || !ids.length) return out;
  try {
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await admin
        .from('profiles')
        .select('id, langue_portail')
        .in('id', ids.slice(i, i + 200));
      if (error) return out;
      for (const row of data || []) out.set(row.id, normaliserLangue(row.langue_portail));
    }
  } catch { /* pré-v121 */ }
  return out;
}

/**
 * La langue d'UN email à UNE élève : fiche > studio > fr. Deux lectures
 * défensives ; pour un lot, préférer chargerLanguesFiches + chargerLanguesStudios.
 * `clientId` peut être null (flux anonyme sans fiche : le studio décide).
 */
export async function langueEmailEleve(admin, { clientId, profileId }) {
  const fiches = await chargerLanguesFiches(admin, clientId ? [clientId] : []);
  const studios = await chargerLanguesStudios(admin, profileId ? [profileId] : []);
  return langueEleve({
    client: clientId ? { langue: fiches.get(clientId) } : null,
    studio: profileId ? { langue_portail: studios.get(profileId) } : null,
  });
}

/** Le `t` d'un email à une élève : `const t = await traducteurEleve(admin, { clientId, profileId })`. */
export async function traducteurEleve(admin, ids) {
  return traducteur(await langueEmailEleve(admin, ids));
}

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

/** Le cookie de langue porté par une requête API, normalisé, ou null. */
export function cookieLangueDeRequete(request) {
  let cookie = null;
  try {
    cookie = request?.cookies?.get?.(COOKIE_LANGUE)?.value || null;
    if (!cookie) {
      const brut = request?.headers?.get?.('cookie') || '';
      const m = brut.match(new RegExp(`(?:^|;\\s*)${COOKIE_LANGUE}=([^;]+)`));
      cookie = m ? decodeURIComponent(m[1]) : null;
    }
  } catch { /* requête sans cookies */ }
  return normaliserLangue(cookie) || null;
}

/** Langue d'une route API, depuis le cookie de la requête (+ studio). */
export async function langueDepuisRequete(request, studioSlug) {
  const cookie = cookieLangueDeRequete(request);
  const studio = await langueDuStudio(studioSlug);
  return resoudreLangue({ cookie, studio });
}
