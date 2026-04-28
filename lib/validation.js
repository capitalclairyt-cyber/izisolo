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

export const adminUpdatePlanSchema = z.object({
  userId: zUuid,
  plan: z.enum(['free', 'solo', 'pro', 'studio', 'premium']),
});

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
