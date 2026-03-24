// ============================================
// IziSolo — Validation & Formatage
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
