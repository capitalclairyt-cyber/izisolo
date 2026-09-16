/**
 * Le bilan chiffré d'un essai — règles PURES (aucune requête).
 *
 * Pourquoi (2026-09-16) : l'email J-3 et le bandeau de fin d'essai disaient ce
 * que la prof ALLAIT perdre, en général (« la réservation, l'espace élève, la
 * messagerie »). Une liste de fonctions ne pèse rien face à 29 € par mois. Ce
 * qui pèse, c'est ce que SES élèves ont fait, chez elle, ces trente jours.
 *
 * Trois règles de sincérité :
 *   1. une ligne à ZÉRO ne s'affiche pas. « 0 réservation » se lit comme un
 *      reproche, et fait de l'email une facture pour un service non rendu ;
 *   2. une ligne qu'on ne sait pas COMPTER ne s'affiche pas non plus (les
 *      réservations d'avant v119 n'ont pas de `source` : on ne les invente
 *      pas, on ne les devine pas, on se tait) ;
 *   3. quand tout est à zéro, l'email change de branche : il ne vend rien, il
 *      propose le geste qui manque. Une prof dont les élèves n'ont rien fait
 *      n'allait pas payer, et le lui rappeler avec un tableau vide est pire
 *      que de ne rien envoyer.
 */

const pluriel = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`;
const euros = (m) => `${Math.round(m)} €`;

// L'ordre est celui de la force : ce que les élèves ont FAIT d'abord, ce que
// la prof a envoyé ensuite, l'état du studio en dernier.
const LIGNES = [
  {
    cle: 'reservations',
    texte: (n) => `${pluriel(n, 'réservation faite', 'réservations faites')} en ligne par tes élèves`,
  },
  {
    cle: 'paiements',
    texte: (n, ctx) => `${pluriel(n, 'paiement encaissé', 'paiements encaissés')} par carte en ligne${ctx.montantPaiements > 0 ? ` (${euros(ctx.montantPaiements)})` : ''}`,
  },
  { cle: 'demandes', texte: (n) => `${pluriel(n, 'demande d’offre reçue', 'demandes d’offre reçues')} depuis ton portail` },
  { cle: 'essais', texte: (n) => `${pluriel(n, 'demande de cours d’essai', 'demandes de cours d’essai')}` },
  { cle: 'listeAttente', texte: (n) => `${pluriel(n, 'inscription', 'inscriptions')} en liste d’attente` },
  { cle: 'annonces', texte: (n) => `${pluriel(n, 'message envoyé', 'messages envoyés')} à tes élèves depuis la messagerie` },
  { cle: 'comptesEleves', texte: (n) => `${pluriel(n, 'élève a', 'élèves ont')} leur espace chez toi` },
];

/** Les lignes non vides, dans l'ordre. `comptes` accepte des valeurs absentes. */
export function lignesBilan(comptes = {}) {
  const ctx = { montantPaiements: Number(comptes.montantPaiements) || 0 };
  return LIGNES
    .map(({ cle, texte }) => {
      const n = Number(comptes[cle]);
      return Number.isFinite(n) && n > 0 ? { cle, n, texte: texte(n, ctx) } : null;
    })
    .filter(Boolean);
}

/**
 * Le bilan complet, prêt à écrire dans un email ou dans une carte.
 * `jours` = ce qu'il reste (J-3, J-1) ; 0 ou moins = l'essai est fini.
 */
export function bilanEssai({ comptes = {}, jours = 0, nomPlan = 'Complet', prix = 29 } = {}) {
  const lignes = lignesBilan(comptes);
  const fini = jours <= 0;
  if (!lignes.length) {
    return {
      vide: true,
      lignes: [],
      titre: fini
        ? `Tes élèves n’ont pas encore réservé en ligne`
        : `Il te reste ${pluriel(jours, 'jour', 'jours')} pour essayer ${nomPlan}`,
      conclusion: fini
        ? `Tu es sur Essentiel, gratuit : tes élèves, ton agenda, tes carnets et tes encaissements sont là, pour toujours. Le jour où tu veux que tes élèves réservent et paient elles-mêmes, ${nomPlan} est à ${prix} € par mois.`
        : `Partage ton lien de réservation à tes élèves : c’est le geste qui déclenche tout le reste, et il prend deux minutes.`,
    };
  }
  return {
    vide: false,
    lignes,
    titre: fini
      ? `Ce que tes élèves ont fait pendant tes 30 jours de ${nomPlan}`
      : `En 30 jours de ${nomPlan}, chez toi`,
    conclusion: fini
      ? `Depuis aujourd’hui, tu es sur Essentiel : tout ça s’arrête, le reste de ton studio continue. Pour le rouvrir, ${nomPlan} est à ${prix} € par mois, sans engagement.`
      : `Tout ça s’arrête ${jours <= 1 ? 'demain' : `dans ${jours} jours`}, sauf si tu gardes ${nomPlan} à ${prix} € par mois. Le reste de ton studio, lui, ne bouge pas.`,
  };
}
