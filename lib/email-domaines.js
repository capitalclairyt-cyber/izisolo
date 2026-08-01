// ============================================================================
// IziSolo — domaines email réservés à la doc et aux tests (RFC 2606/6761)
// ----------------------------------------------------------------------------
// Ces domaines ne délivrent jamais : Resend les refuse à coup sûr. Sans ce
// filtre, chaque fixture seedée (@example.com du démo, relancée chaque jour
// par les crons) devenait une « erreur » au radar erreurs_app — 18 des 25
// lignes du 2026-08-01. sendEmail() les skippe en amont (non-envoi assumé,
// warn console — pas un échec, pas de reportError).
//
// Module volontairement SANS dépendance : lib/email.js tire supabase-admin
// (client instancié au chargement → env requise), ce helper doit rester
// importable par les specs Node pures. Verrou : email-domaine-test.spec.js.
// ============================================================================

const DOMAINES_TEST_RE = /(^|\.)example\.(com|org|net)$|(^|\.)(test|example|invalid|localhost)$/;

export function estEmailDeTest(email) {
  const domaine = String(email || '').trim().toLowerCase().split('@').pop() || '';
  return DOMAINES_TEST_RE.test(domaine);
}
