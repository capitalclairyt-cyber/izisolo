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
import { cookies, headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase-admin';
import { COOKIE_LANGUE, langueEleve, langueNavigateur, normaliserLangue, reglageLangueStudio, resoudreLangue, traducteur } from '@/lib/i18n-portail';

/** La langue annoncée par le navigateur de la visiteuse courante (Accept-Language), ou null. */
export async function langueNavigateurVisiteuse() {
  try {
    const h = await headers();
    return langueNavigateur(h.get('accept-language'));
  } catch {
    return null;
  }
}

/** Idem, depuis une requête API. */
export function langueNavigateurDeRequete(request) {
  try {
    return langueNavigateur(request?.headers?.get?.('accept-language'));
  } catch {
    return null;
  }
}

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
    // v124 : un CHOIX (cookie) efface aussi le drapeau « devinée ». Une fiche
    // qui portait déjà ce choix n'est pas réécrite ; une fiche qui le portait
    // par déduction l'est, pour que la provenance devienne « choisie ».
    const { error } = await admin
      .from('clients')
      .update({ langue: l, langue_deduite: false })
      .eq('id', clientId)
      .or(`langue.is.null,langue.neq.${l},langue_deduite.eq.true`);
    if (!error) return true;
    if (!colonneAbsente(error)) return false;
    // Pré-v124 : la même écriture, sans la provenance.
    const { error: e2 } = await admin
      .from('clients')
      .update({ langue: l })
      .eq('id', clientId)
      .or(`langue.is.null,langue.neq.${l}`);
    return !e2;
  } catch {
    return false;
  }
}

/** PostgREST répond PGRST204 (cache de schéma) pour une colonne inconnue, Postgres 42703. */
function colonneAbsente(error) {
  return error?.code === 'PGRST204' || error?.code === '42703' || /column|colonne/i.test(error?.message || '');
}

/**
 * Pose une langue DEVINÉE (repli navigateur, v123) sur une fiche : un signal
 * faible qui ne remplace jamais un choix explicite (cookie) déjà mémorisé.
 * v124 : elle est marquée `langue_deduite = true`, et une fiche déjà devinée
 * suit le navigateur si celui-ci change (un téléphone repassé en français ne
 * doit pas garder un « en » deviné pour toujours). Pré-v124 : seulement si la
 * fiche n'a rien, sans provenance.
 */
export async function poserLangueFicheSiVide(admin, clientId, langue) {
  const l = normaliserLangue(langue);
  if (!admin || !clientId || !l) return false;
  try {
    const { error } = await admin
      .from('clients')
      .update({ langue: l, langue_deduite: true })
      .eq('id', clientId)
      .or(`langue.is.null,and(langue_deduite.eq.true,langue.neq.${l})`);
    if (!error) return true;
    if (!colonneAbsente(error)) return false;
    const { error: e2 } = await admin
      .from('clients')
      .update({ langue: l })
      .eq('id', clientId)
      .is('langue', null);
    return !e2;
  } catch {
    return false;
  }
}

/**
 * Ce qu'une VISITE d'une élève connue laisse sur sa fiche : son cookie (choix
 * explicite, toujours) ; sinon, si le studio est en « auto » et que son
 * navigateur annonce fr ou en, cette langue, seulement si la fiche n'en a pas.
 * Sans ça, une anglophone qui lit l'anglais grâce à son navigateur recevrait
 * ses emails en français (le cron n'a pas d'en-tête Accept-Language).
 */
export async function memoriserLangueVisite(admin, clientId, studioSlug) {
  if (!admin || !clientId) return;
  const cookie = await cookieLangueVisiteuse();
  if (cookie) { await poserLangueFiche(admin, clientId, cookie); return; }
  const nav = await langueNavigateurVisiteuse();
  if (nav && reglageLangueStudio({ langue_portail: await langueDuStudio(studioSlug) }) === 'auto') {
    await poserLangueFicheSiVide(admin, clientId, nav);
  }
}

/** Idem pour une route API (réservation, essai, liste d'attente, annulation). */
export async function memoriserLangueVisiteRequete(admin, clientId, request, studioSlug) {
  if (!admin || !clientId) return;
  const cookie = cookieLangueDeRequete(request);
  if (cookie) { await poserLangueFiche(admin, clientId, cookie); return; }
  const nav = langueNavigateurDeRequete(request);
  if (nav && reglageLangueStudio({ langue_portail: await langueDuStudio(studioSlug) }) === 'auto') {
    await poserLangueFicheSiVide(admin, clientId, nav);
  }
}

/**
 * Les langues mémorisées d'un lot de fiches :
 * Map(id → { langue: 'fr' | 'en' | null, langue_deduite: boolean }), à passer
 * tel quel comme `client` à langueEleve. Défensif : colonne absente ou
 * erreur → une Map vide (tout le monde suit le studio, puis le français).
 * Pré-v124, `langue_deduite` manque : on relit sans elle (toute langue
 * mémorisée compte alors comme choisie, l'état d'avant). Par paquets de 200.
 */
export async function chargerLanguesFiches(admin, clientIds) {
  const out = new Map();
  const ids = [...new Set((clientIds || []).filter(Boolean))];
  if (!admin || !ids.length) return out;
  try {
    let avecProvenance = true;
    for (let i = 0; i < ids.length; i += 200) {
      const lot = ids.slice(i, i + 200);
      let { data, error } = avecProvenance
        ? await admin.from('clients').select('id, langue, langue_deduite').in('id', lot)
        : { data: null, error: { code: 'PGRST204' } };
      if (error && colonneAbsente(error)) {
        avecProvenance = false;
        ({ data, error } = await admin.from('clients').select('id, langue').in('id', lot));
      }
      if (error) return out;
      for (const row of data || []) out.set(row.id, { langue: normaliserLangue(row.langue), langue_deduite: row.langue_deduite === true });
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
    client: clientId ? (fiches.get(clientId) || null) : null,
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
  const navigateur = await langueNavigateurVisiteuse();
  return resoudreLangue({ cookie, studio, navigateur });
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
  const navigateur = langueNavigateurDeRequete(request);
  return resoudreLangue({ cookie, studio, navigateur });
}
