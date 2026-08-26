// ============================================================================
// IziSolo — « Le paiement en ligne est-il vraiment branché ? », en UN endroit
// ----------------------------------------------------------------------------
// Contexte (2026-08-26, retour Manon / Soleya via une de ses élèves) : Gaëlle
// dit avoir pris une carte 10 séances depuis l'application. Aucune trace côté
// prof — ni paiement, ni carnet, ni notification.
//
// La cause : brancher le paiement en ligne demande DEUX gestes, et l'app n'en
// vérifiait qu'un.
//   1. coller un Payment Link sur l'offre (facile, visible, gratifiant) ;
//   2. déclarer le webhook Stripe dans Paramètres → Paiement en ligne, pour
//      qu'IziSolo apprenne que l'argent est arrivé (invisible, technique).
//
// Manon avait fait le 1 et pas le 2. Ses élèves voyaient donc un vrai bouton
// de paiement, sur un vrai lien LIVE : l'argent partait bien vers son compte
// Stripe, mais IziSolo n'en savait jamais rien. L'élève se croit titulaire
// d'une carte que le studio ne voit pas — et personne n'est prévenu.
// Mesuré le jour du diagnostic : 0 paiement Stripe élève enregistré en
// production, tous studios confondus, depuis la naissance de la feature.
//
// Décision (Colin, 2026-08-26) : tant que le webhook manque, l'élève ne se
// voit PAS proposer de payer en ligne. Elle « demande » l'offre (v97), la
// demande atterrit dans la file de la prof, qui encaisse comme elle veut.
// Une vente dont personne ne sait rien est pire qu'une demande à traiter.
//
// ⚠️ RÈGLE DE SÉCURITÉ : `stripe_webhook_secret` est un SECRET. Il ne doit
// jamais atteindre le navigateur. Les pages serveur le lisent, en dérivent le
// booléen `webhookConfigure()`, et ne passent QUE ce booléen au client — et
// surtout, elles RETIRENT les liens de paiement des offres envoyées quand il
// est faux (le client ne peut pas afficher un bouton dont il n'a pas l'URL).
// Le verrou CI fige ce contrat.
// ============================================================================

/**
 * Le studio peut-il ENCAISSER en ligne, c'est-à-dire : IziSolo saura-t-il que
 * le paiement a eu lieu ? Un Payment Link sans webhook encaisse quand même
 * chez Stripe, mais l'app reste aveugle — ce n'est pas « configuré ».
 *
 * @param {{stripe_webhook_secret?: string|null}} profile
 * @returns {boolean}
 */
export function webhookConfigure(profile) {
  return typeof profile?.stripe_webhook_secret === 'string'
    && profile.stripe_webhook_secret.trim().length > 0;
}

/**
 * Le lien de paiement réellement servable pour une offre, ou null.
 * null = l'écran doit proposer « Demander » (v97) à la place.
 *
 * @param {{stripe_payment_link?: string|null}} offre
 * @param {{stripe_webhook_secret?: string|null}} profile
 */
export function lienPaiementOffre(offre, profile) {
  if (!webhookConfigure(profile)) return null;
  const lien = offre?.stripe_payment_link;
  return typeof lien === 'string' && lien.trim() ? lien.trim() : null;
}

/**
 * Le lien de paiement à la séance (v86 v2), même règle.
 *
 * @param {{stripe_payment_link_unit?: string|null}} cours
 * @param {{stripe_webhook_secret?: string|null}} profile
 */
export function lienPaiementSeance(cours, profile) {
  if (!webhookConfigure(profile)) return null;
  const lien = cours?.stripe_payment_link_unit;
  return typeof lien === 'string' && lien.trim() ? lien.trim() : null;
}

/**
 * Retire les liens de paiement d'une liste d'offres quand le webhook manque.
 * À appeler dans TOUTE page serveur qui envoie des offres au navigateur : le
 * client ne doit pas recevoir une URL qu'il ne doit pas afficher.
 *
 * Rend toujours un nouveau tableau (jamais de mutation de l'entrée).
 */
export function masquerLiensSiNonBranche(offres, profile) {
  const ok = webhookConfigure(profile);
  return (offres || []).map(o => (
    ok ? o : { ...o, stripe_payment_link: null }
  ));
}

/**
 * Les offres qui PROMETTENT un paiement en ligne que le studio ne peut pas
 * encaisser proprement. Sert l'alerte côté prof (page Offres, formulaire) :
 * on ne coupe jamais quelque chose en silence, on dit ce qui manque.
 *
 * Rend [] quand le webhook est configuré.
 */
export function offresEnAttenteDeWebhook(offres, profile) {
  if (webhookConfigure(profile)) return [];
  return (offres || []).filter(o => {
    const lien = o?.stripe_payment_link;
    return typeof lien === 'string' && lien.trim().length > 0;
  });
}

/**
 * La date COMPTABLE d'un paiement Stripe : celle de la session, pas celle du
 * traitement. Sans ça, un événement rejoué depuis le dashboard Stripe (le
 * geste de rattrapage quand on branche le webhook après coup) daterait
 * l'encaissement du jour du rejeu — et la déclaration URSSAF (v93, qui
 * compte en trésorerie) tomberait dans le mauvais trimestre.
 *
 * @param {{created?: number}} session - session Stripe (created = epoch secondes)
 * @param {string} [aujourdhui] - repli ISO (yyyy-mm-dd)
 * @returns {string} date ISO yyyy-mm-dd
 */
export function dateSessionStripe(session, aujourdhui) {
  const repli = aujourdhui || new Date().toISOString().slice(0, 10);
  const created = session?.created;
  if (typeof created !== 'number' || !Number.isFinite(created) || created <= 0) return repli;
  const d = new Date(created * 1000);
  if (Number.isNaN(d.getTime())) return repli;
  return d.toISOString().slice(0, 10);
}
