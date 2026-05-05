// ============================================
// IziSolo — Validation & Formatage
// ============================================
//
// Ce fichier contient :
//  - Helpers UI (validerEmail, formaterTelephone, validerSiret…)
//  - Schemas zod + parseJsonBody (validation API server-side)
//
// Les schemas zod servent aux routes API publiques pour valider les bodies
// et renvoyer une 400 propre avec détails. Ils sont importés depuis les
// route handlers via `@/lib/validation`.

import { z } from 'zod';

// ─── Helpers schemas zod réutilisables ──────────────────────────────────────
const trimmedString = (max) => z.string().trim().min(1).max(max);
const optionalString = (max) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));
const zEmail = z.string().trim().toLowerCase().email().max(254);
const zUuid = z.string().uuid();

// ─── Schemas API ────────────────────────────────────────────────────────────
export const reservationSchema = z.object({
  coursId: zUuid,
  nom: trimmedString(120),
  email: zEmail,
  tel: optionalString(40),
});

export const annulationSchema = z.object({
  presenceId: zUuid,
});

export const listeAttenteSchema = z.object({
  coursId: zUuid,
  nom: trimmedString(120),
  email: zEmail,
  tel: optionalString(40),
});

export const supportTicketSchema = z.object({
  subject: optionalString(200),
  message: trimmedString(5000),
});

export const adminTicketUpdateSchema = z.object({
  ticketId: zUuid,
  status: z.enum(['open', 'in_progress', 'resolved']).optional(),
  admin_reply: z.string().trim().max(5000).optional(),
});

export const sondageReponseSchema = z.object({
  // Pour visiteur anonyme :
  email:       z.string().email('Email invalide').max(200).optional(),
  prenom:      z.string().min(1).max(80).optional(),
  // Réponses : map { creneau_id (uuid) : 'oui' | 'peut_etre' | 'non' }
  reponses:    z.record(z.string().uuid(), z.enum(['oui', 'peut_etre', 'non'])),
  commentaire: z.string().max(500).optional(),
  // Honeypot anti-bot — doit rester vide
  website:     z.string().max(0, 'spam détecté').optional(),
});

// Plans valides pour l'API admin/users/update-plan.
// Aligné avec ALL_PLANS de lib/constantes.js. `studio` retiré (jamais
// finalisé, pas testé). `free` reste accessible pour exempter Colin/Maude.
export const adminUpdatePlanSchema = z.object({
  userId: zUuid,
  plan: z.enum(['free', 'solo', 'pro', 'premium']),
});

// ─── Studio slug ────────────────────────────────────────────────────────────
// Slug public utilisé dans /p/{slug}. Doit être :
//  - ASCII alphanum + tirets uniquement
//  - 3-40 caractères
//  - Ne pas commencer/finir par un tiret
//  - Pas dans la blocklist (collision avec routes Next ou impersonation)
const SLUG_BLOCKLIST = new Set([
  'admin', 'api', 'auth', 'login', 'register', 'logout', 'dashboard',
  'agenda', 'cours', 'clients', 'eleves', 'offres', 'revenus',
  'abonnements', 'messagerie', 'sondages', 'essais', 'support',
  'parametres', 'settings', 'profil', 'profile', 'plus',
  'cas-a-traiter', 'pointage', 'communication', 'mailing', 'videos',
  'assistant', 'evenements', 'onboarding', 'mot-de-passe-oublie',
  'nouveau-mot-de-passe', 'p', 'public', 'static', '_next',
  'about', 'legal', 'cgu', 'cgv', 'mentions-legales',
  'privacy', 'terms', 'rgpd', 'help', 'docs', 'blog', 'news',
  'izisolo', 'izi', 'melutek', 'maude',
]);

export function validateStudioSlug(slug) {
  if (!slug || typeof slug !== 'string') {
    return { ok: false, error: 'Slug requis' };
  }
  const s = slug.trim().toLowerCase();
  if (s.length < 3 || s.length > 40) {
    return { ok: false, error: 'Le slug doit faire entre 3 et 40 caractères' };
  }
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(s)) {
    return { ok: false, error: 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets (pas au début ni à la fin)' };
  }
  if (SLUG_BLOCKLIST.has(s)) {
    return { ok: false, error: 'Ce slug est réservé, choisis-en un autre' };
  }
  return { ok: true, slug: s };
}

/**
 * Parse + valide le body JSON d'une Request avec un schéma zod.
 * Usage:
 *   const { data, errorResponse } = await parseJsonBody(request, mySchema);
 *   if (errorResponse) return errorResponse;
 *   // ... use data
 */
export async function parseJsonBody(request, schema) {
  let raw;
  try {
    raw = await request.json();
  } catch {
    return {
      errorResponse: Response.json(
        { error: 'Body JSON invalide' },
        { status: 400 }
      ),
    };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map(i => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    return {
      errorResponse: Response.json(
        { error: 'Données invalides', issues },
        { status: 400 }
      ),
    };
  }
  return { data: result.data };
}

// ============================================
// Helpers UI (validation côté client)
// ============================================

/**
 * Valide un email
 */
export function validerEmail(email) {
  if (!email) return { valide: true, message: '' }; // optionnel
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return {
    valide: re.test(email),
    message: re.test(email) ? '' : 'Email invalide',
  };
}

/**
 * Formate et valide un numéro de téléphone français
 * Accepte : 06 12 34 56 78, 0612345678, +33 6 12 34 56 78
 * Retourne le format : 06 12 34 56 78
 */
export function formaterTelephone(tel) {
  if (!tel) return '';
  // Nettoyer
  let cleaned = tel.replace(/[\s.\-()]/g, '');

  // +33 → 0
  if (cleaned.startsWith('+33')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('0033')) {
    cleaned = '0' + cleaned.slice(4);
  }

  // Formater en XX XX XX XX XX
  if (/^\d{10}$/.test(cleaned)) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }

  return tel; // Retourner tel quel si pas français standard
}

export function validerTelephone(tel) {
  if (!tel) return { valide: true, message: '' }; // optionnel
  const cleaned = tel.replace(/[\s.\-()]/g, '');
  const isValid = /^(\+33|0033|0)\d{9}$/.test(cleaned);
  return {
    valide: isValid,
    message: isValid ? '' : 'Numéro invalide (ex: 06 12 34 56 78)',
  };
}

/**
 * Formate un SIRET (14 chiffres) : XXX XXX XXX XXXXX
 */
export function formaterSiret(siret) {
  if (!siret) return '';
  const cleaned = siret.replace(/\s/g, '');
  if (/^\d{14}$/.test(cleaned)) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }
  return siret;
}

export function validerSiret(siret) {
  if (!siret) return { valide: true, message: '' }; // optionnel
  const cleaned = siret.replace(/\s/g, '');
  if (!/^\d{14}$/.test(cleaned)) {
    return { valide: false, message: 'SIRET : 14 chiffres' };
  }
  // Algorithme de Luhn pour SIRET
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = parseInt(cleaned[i], 10);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  const valid = sum % 10 === 0;
  return {
    valide: valid,
    message: valid ? '' : 'SIRET invalide (vérification Luhn)',
  };
}

/**
 * Formate un code postal (5 chiffres)
 */
export function validerCodePostal(cp) {
  if (!cp) return { valide: true, message: '' };
  const valid = /^\d{5}$/.test(cp.trim());
  return {
    valide: valid,
    message: valid ? '' : 'Code postal : 5 chiffres',
  };
}
