/**
 * lib/vignette-cours.js — L'IDENTITÉ VISUELLE D'UN COURS (v99, 2026-08-24).
 *
 * Deux niveaux, UN seul lecteur :
 *   1. par TYPE de cours   → profiles.tons_par_type + profiles.vignettes_par_type
 *      La prof règle ses 5 types une fois et tout son planning s'habille, y
 *      compris les séances qui n'existent pas encore.
 *   2. par SÉANCE          → cours.photo_url
 *      L'atelier ponctuel a SA photo (« Yoga Pleine Lune » n'est pas « un
 *      cours de Yin »), et elle PRIME sur celle de son type.
 *
 * Règles figées (verrou tests/e2e/vignette-cours.spec.js) :
 *   - la photo d'une séance prime sur celle de son type, jamais l'inverse ;
 *   - le TON reste attaché au type : deux séances du même type ne se colorent
 *     pas différemment, c'est un code de lecture et pas une décoration ;
 *   - `toneForCours` (lib/tones.js) devient un DÉFAUT PROPOSÉ. Son mapping est
 *     du vocabulaire de yoga et tout le reste tombait sur un repli « première
 *     lettre modulo 4 » : Pilates, Danse, Barre et Sophrologie héritaient
 *     d'une couleur arbitraire que la prof ne pouvait pas corriger ;
 *   - seules les URL de NOS hosts sont acceptées (next.config.mjs →
 *     images.remotePatterns). Ce n'est pas du zèle : `next/image` sur un host
 *     non déclaré ne rend pas une image cassée, il JETTE au rendu ;
 *   - les colonnes v99 ne vont JAMAIS dans un select principal (anti-pattern
 *     « colonnes fantômes » §12, qui a déjà tué 4 features en silence) : elles
 *     se chargent par `chargerVignettesConfig` et `chargerPhotosCours`,
 *     requêtes SÉPARÉES et défensives.
 */

import { toneForCours } from './tones';

/** Les tons de la palette (globals.css → --tone-*). */
export const TONES = ['rose', 'sage', 'sand', 'lavender', 'ink'];

/** Libellés pour l'écran de réglage (français, tutoiement maison). */
export const TONES_LABELS = {
  rose: 'Rose',
  sage: 'Sauge',
  sand: 'Sable',
  lavender: 'Lavande',
  ink: 'Encre',
};

const MAX_TYPES = 40;      // types_cours tient en une poignée d'entrées
const MAX_URL = 500;
const HOSTS_OK = /^https:\/\/[^/]+\.(supabase\.co|public\.blob\.vercel-storage\.com)\//;

/**
 * Une URL que `next/image` peut servir ? (hosts déclarés dans next.config.mjs)
 * Source unique : un vieil upload ou un lien collé à la main retombe sur
 * <img> brut plutôt que de faire planter le rendu.
 */
export function imageOptimisable(url) {
  return typeof url === 'string' && HOSTS_OK.test(url);
}

/** Nettoie {type: url} : nos hosts uniquement, clés non vides. null si rien ne survit. */
export function sanitizeVignettesParType(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (Object.keys(out).length >= MAX_TYPES) break;
    const type = String(k || '').trim().slice(0, 80);
    if (!type) continue;
    if (typeof v !== 'string') continue;
    const url = v.trim();
    if (!url || url.length > MAX_URL || !imageOptimisable(url)) continue;
    out[type] = url;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Nettoie {type: ton} : tons de la liste blanche uniquement. null si rien ne survit. */
export function sanitizeTonsParType(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (Object.keys(out).length >= MAX_TYPES) break;
    const type = String(k || '').trim().slice(0, 80);
    if (!type) continue;
    const ton = String(v || '').trim().toLowerCase();
    if (!TONES.includes(ton)) continue;
    out[type] = ton;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Le ton d'un cours : le choix de la prof pour ce TYPE, sinon le défaut déduit.
 * @param {{type_cours?: string}|string|null} cours  un cours ou directement son type
 * @param {object|null} tons  carte {type: ton} (brute acceptée)
 */
export function toneCours(cours, tons) {
  const type = typeof cours === 'string' ? cours : cours?.type_cours;
  const carte = sanitizeTonsParType(tons);
  if (type && carte && carte[type]) return carte[type];
  return toneForCours(type);
}

/**
 * La vignette d'un cours : sa photo à lui d'abord, celle de son type ensuite.
 * @param {{photo_url?: string, type_cours?: string}|null} cours
 * @param {object|null} vignettes  carte {type: url} (brute acceptée)
 * @returns {string|null}
 */
export function vignetteCours(cours, vignettes) {
  const propre = typeof cours?.photo_url === 'string' ? cours.photo_url.trim() : '';
  if (propre && imageOptimisable(propre)) return propre;
  const type = cours?.type_cours;
  const carte = sanitizeVignettesParType(vignettes);
  if (type && carte && carte[type]) return carte[type];
  return null;
}

/**
 * Au moins une vignette dans ce lot ? Sert à choisir une mise en page : une
 * grille où une seule carte sur douze porte une image est plus laide qu'une
 * grille sans aucune image.
 */
export function auMoinsUneVignette(coursListe, vignettes) {
  if (!Array.isArray(coursListe)) return false;
  return coursListe.some(c => vignetteCours(c, vignettes) !== null);
}

/**
 * Le texte alternatif d'une vignette. Décoratif au sens strict (le nom du
 * cours est juste à côté), donc court et sans « photo de » qui n'apprend rien.
 */
export function altVignette(cours) {
  const nom = String(cours?.nom || '').trim();
  return nom ? `Illustration de ${nom}` : 'Illustration du cours';
}

// ═══════════════════════════════════════════════════════════════════════════
// CHARGEMENTS DÉFENSIFS — les colonnes v99 hors de tout select principal.
// Une erreur (migration pas encore appliquée, cache de schéma PostgREST) rend
// « aucune vignette », ce qui est visuellement identique à « pas encore de
// photo déposée » : la dégradation ne peut donc RIEN faire croire de faux.
// ═══════════════════════════════════════════════════════════════════════════

const CHUNK = 120; // longueur d'URL PostgREST : ~37 caractères par uuid

/** {tons, vignettes} d'un studio. Jamais throw, jamais de select principal. */
export async function chargerVignettesConfig(supabase, profileId) {
  const vide = { tons: null, vignettes: null };
  if (!supabase || !profileId) return vide;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('tons_par_type, vignettes_par_type')
      .eq('id', profileId)
      .maybeSingle();
    if (error) {
      console.warn('[vignette-cours] config indisponible:', error.code || error.message);
      return vide;
    }
    return {
      tons: sanitizeTonsParType(data?.tons_par_type),
      vignettes: sanitizeVignettesParType(data?.vignettes_par_type),
    };
  } catch (e) {
    console.warn('[vignette-cours] config exception:', e?.message);
    return vide;
  }
}

/**
 * Map(coursId → url) des photos propres aux séances. Les ids sans photo sont
 * absents de la Map (et non présents à null) pour que `map.get()` suffise.
 */
export async function chargerPhotosCours(supabase, coursIds) {
  const map = new Map();
  if (!supabase || !Array.isArray(coursIds) || coursIds.length === 0) return map;
  const ids = [...new Set(coursIds.filter(Boolean))];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const lot = ids.slice(i, i + CHUNK);
    try {
      const { data, error } = await supabase
        .from('cours')
        .select('id, photo_url')
        .in('id', lot);
      if (error) {
        console.warn('[vignette-cours] photos de séances indisponibles:', error.code || error.message);
        return map; // inutile d'insister sur les lots suivants : même colonne
      }
      for (const ligne of data || []) {
        const url = typeof ligne.photo_url === 'string' ? ligne.photo_url.trim() : '';
        if (url && imageOptimisable(url)) map.set(ligne.id, url);
      }
    } catch (e) {
      console.warn('[vignette-cours] photos de séances exception:', e?.message);
      return map;
    }
  }
  return map;
}

/**
 * Recolle les photos chargées à part sur les cours, pour que les composants
 * d'affichage n'aient qu'UN objet à lire (`c.photo_url`) qu'on soit avant ou
 * après la migration.
 */
export function greffePhotos(coursListe, mapPhotos) {
  if (!Array.isArray(coursListe)) return [];
  if (!mapPhotos || mapPhotos.size === 0) return coursListe;
  return coursListe.map(c => {
    const url = mapPhotos.get(c?.id);
    return url ? { ...c, photo_url: url } : c;
  });
}
