/**
 * « On crée ton studio » — règles pures du guichet public (v96, 2026-08-23).
 *
 * La création concierge existait depuis le 2026-08-21 côté équipe
 * (/admin/studios/nouveau + lien d'appropriation). Ce module est sa porte
 * d'entrée : ce qu'on demande à la prospecte, ce qu'on lui répond, et ce qu'on
 * refuse de collecter.
 *
 * ⚠️ AUCUNE LISTE D'ÉLÈVES dans le formulaire, décision assumée. Un CSV de
 * tiers déposé par une personne non authentifiée sur une page publique, c'est
 * de la donnée personnelle d'autrui collectée sans canal sûr. La liste est
 * réclamée par l'EMAIL de réponse (canal identifié, elle répond avec sa pièce
 * jointe si elle veut) et reste FACULTATIVE : sans elle on monte quand même le
 * studio, elle importera ses élèves elle-même.
 *
 * Ne dépend que de lib/utils (pur) : importable par les specs Node pures.
 */

/** Les activités proposées, alignées sur le vocabulaire de l'app. */
import { escapeHtml } from './utils';

export const ACTIVITES = [
  'Yoga', 'Pilates', 'Danse', 'Méditation', 'Sophrologie',
  'Coaching', 'Fitness', 'Autre',
];

export const STATUTS_DEMANDE = {
  nouvelle: { label: 'Nouvelle', ton: 'warning' },
  en_cours: { label: 'En cours', ton: 'info' },
  creee: { label: 'Studio créé', ton: 'success' },
  sans_suite: { label: 'Sans suite', ton: 'neutral' },
};

/** Le délai annoncé publiquement. Ouvrés : un samedi ne compte pas. */
export const DELAI_HEURES = 48;

const texte = (v, max) => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
};

/**
 * Nettoie ce qui arrive du formulaire public, aux longueurs des CHECK de v96
 * (une chaîne trop longue ferait échouer l'insert : on tronque plutôt que de
 * perdre une demande).
 * @returns {{ok: boolean, erreur?: string, valeurs?: object}}
 */
export function sanitizeDemande(brut = {}) {
  const prenom = texte(brut.prenom, 80);
  const email = texte(brut.email, 160)?.toLowerCase();

  if (!prenom) return { ok: false, erreur: 'Ton prénom, pour qu\'on sache à qui on écrit.' };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, erreur: 'Une adresse email valide : c\'est là qu\'on t\'envoie ton studio.' };
  }

  const activite = texte(brut.activite, 60);
  return {
    ok: true,
    valeurs: {
      prenom,
      nom: texte(brut.nom, 80),
      email,
      telephone: texte(brut.telephone, 40),
      studio_nom: texte(brut.studio_nom, 120),
      activite: ACTIVITES.includes(activite) ? activite : (activite ? 'Autre' : null),
      ville: texte(brut.ville, 120),
      site_web: texte(brut.site_web, 300),
      planning: texte(brut.planning, 4000),
      offres: texte(brut.offres, 4000),
      message: texte(brut.message, 4000),
    },
  };
}

/**
 * L'email de réponse immédiate. Il fait trois choses, dans cet ordre :
 * accuser réception avec le délai, RÉCLAMER ce qui manque pour construire
 * (planning, tarifs, et la liste d'élèves — sans obligation), et donner un
 * visage (c'est Maude qui monte le studio, pas « notre équipe »).
 *
 * Le canal de retour est la réponse à cet email : elle y attache son CSV,
 * son export, ou la photo de son cahier. Rien de tout ça n'a sa place sur un
 * formulaire public.
 */
export function renderEmailAccuse({ prenom = '', studioNom = '', manque = {} } = {}) {
  const bonjour = `Bonjour ${prenom || ''}`.trimEnd() + ',';
  const studio = studioNom ? ` « ${studioNom} »` : '';

  // On ne redemande QUE ce qui n'a pas été renseigné : réclamer ce qu'elle
  // vient d'écrire donnerait l'impression que personne n'a lu.
  const aFournir = [];
  if (manque.planning) {
    aFournir.push('<li style="margin-bottom:8px;"><strong>Ton planning</strong> : tes cours, leurs jours et horaires, tes lieux. Une copie de ta grille actuelle suffit.</li>');
  }
  if (manque.offres) {
    aFournir.push('<li style="margin-bottom:8px;"><strong>Tes tarifs</strong> : carnets, abonnements, cours à l\'unité, tarif d\'essai. Tels que tu les annonces à tes élèves.</li>');
  }
  aFournir.push(
    '<li style="margin-bottom:8px;"><strong>Ta liste d\'élèves</strong>, si tu l\'as sous la main et si tu le souhaites : '
    + 'un export de ton outil actuel, un fichier Excel, ou même la photo de ton cahier. '
    + 'Ça nous permet de préparer aussi leurs carnets et leurs abonnements en cours. '
    + '<em>Ce n\'est pas obligatoire</em> : sans elle on monte quand même ton studio, tu ajouteras tes élèves quand tu voudras.</li>'
  );

  return {
    subject: `On monte ton studio${studio} sous ${DELAI_HEURES} h`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <h2 style="color:#b87333;margin:0 0 6px;">C'est noté, on s'en occupe</h2>
        <p style="color:#555;margin:0 0 14px;">${bonjour}</p>
        <p style="color:#555;margin:0 0 14px;">
          Merci pour ta demande. On te monte ton studio${studio} sous <strong>${DELAI_HEURES} heures ouvrées</strong>,
          et tu recevras un email avec ton accès : tu n'auras plus qu'à choisir ton mot de passe.
        </p>
        <p style="color:#555;margin:0 0 10px;">
          Pour qu'il soit prêt à l'emploi le jour où tu le découvres, réponds simplement à cet email avec :
        </p>
        <ul style="color:#555;margin:0 0 16px;padding-left:20px;">
          ${aFournir.join('\n          ')}
        </ul>
        <p style="color:#555;margin:0 0 14px;">
          Tu peux répondre en pièce jointe, en copier-coller, ou en photo. On se débrouille avec ce que tu as.
        </p>
        <p style="color:#555;margin:20px 0 0;">
          À très vite,<br>
          <strong>Maude</strong>, prof de yoga et cofondatrice d'IziSolo
        </p>
        <p style="color:#999;margin:16px 0 0;font-size:0.8125rem;">
          Une question d'ici là ? Réponds à cet email, c'est nous qui lisons.
        </p>
      </div>
    `,
  };
}

/** L'alerte interne : tout ce qu'il faut pour créer le studio, dans l'email. */
export function renderEmailInterne(d = {}) {
  // ⚠️ escapeHtml AVANT le <br> : ces champs sont saisis par une inconnue sur
  // une page publique, et cet email part chez nous. Sans échappement, elle
  // écrit le HTML de notre propre courrier (même trou que la demande d'offre,
  // corrigé le même jour).
  const ligne = (label, valeur) => (valeur
    ? `<tr><td style="padding:4px 12px 4px 0;color:#999;vertical-align:top;white-space:nowrap;">${label}</td><td style="padding:4px 0;color:#333;">${escapeHtml(valeur).replace(/\n/g, '<br>')}</td></tr>`
    : '');

  return {
    subject: `Nouvelle demande de studio : ${d.prenom || ''} ${d.nom || ''}`.trim(),
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:620px;margin:0 auto;padding:24px;">
        <h2 style="color:#b87333;margin:0 0 12px;">Nouvelle demande « crée mon studio »</h2>
        <table style="border-collapse:collapse;font-size:0.9rem;">
          ${ligne('Prénom / nom', `${d.prenom || ''} ${d.nom || ''}`.trim())}
          ${ligne('Email', d.email)}
          ${ligne('Téléphone', d.telephone)}
          ${ligne('Studio', d.studio_nom)}
          ${ligne('Activité', d.activite)}
          ${ligne('Ville', d.ville)}
          ${ligne('Site', d.site_web)}
          ${ligne('Planning', d.planning)}
          ${ligne('Tarifs', d.offres)}
          ${ligne('Message', d.message)}
        </table>
        <p style="color:#555;margin:18px 0 0;font-size:0.875rem;">
          À traiter dans <strong>/admin/demandes</strong>. L'accusé de réception est déjà parti chez elle.
        </p>
      </div>
    `,
  };
}

/**
 * Ce qui manque pour construire le studio — sert à ne réclamer que l'utile.
 */
export function cequiManque(valeurs = {}) {
  return {
    planning: !valeurs.planning,
    offres: !valeurs.offres,
  };
}

/**
 * Le site web est du TEXTE LIBRE saisi par une inconnue sur une page publique.
 * Le rendre cliquable tel quel, comme /admin/demandes le faisait, a deux
 * conséquences que la première demande spam a mises au jour (31/08/2026) :
 *
 *   1. Un href SANS protocole est une URL RELATIVE. « Vbn » devenait donc
 *      « capsule.izisolo.fr/vbn » : notre propre hôte admin, ce qui a
 *      légitimement inquiété. Et pour une VRAIE prospecte, qui écrit
 *      « monsite.fr » sans jamais taper https://, le lien mène vers
 *      izisolo.fr/monsite.fr — un 404 qui donne l'air d'un site mort.
 *   2. « javascript:… » et « data:text/html,… » sont des href VALIDES. Un
 *      clic depuis l'hôte admin les exécuterait avec la session admin, et
 *      ni target="_blank" ni rel="noopener" n'y changent rien.
 *
 * D'où : seuls http et https deviennent des liens, un domaine nu est préfixé,
 * et TOUT le reste reste affiché en texte brut. On ne jette jamais la valeur
 * (perdre une prospecte pour une adresse mal tapée serait pire que tout) :
 * on refuse seulement d'en faire un lien.
 *
 * @returns {{href: string|null, texte: string|null}}
 */
export function lienSite(site) {
  const texte = String(site ?? '').trim() || null;
  if (!texte) return { href: null, texte: null };

  // Un espace ne peut pas être dans un nom d'hôte : c'est une phrase, pas une
  // adresse (« je n'ai pas de site », « voir ma page facebook »).
  const candidat = /^[a-z][a-z0-9+.-]*:/i.test(texte) ? texte
    : (/\s/.test(texte) || !texte.includes('.')) ? null
    : 'https://' + texte;
  if (!candidat) return { href: null, texte };

  try {
    const url = new URL(candidat);
    // Liste BLANCHE de protocoles : tout ce qui n'est pas nommé ici est refusé,
    // y compris ce qu'on n'a pas imaginé.
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return { href: null, texte };
    if (!url.hostname.includes('.')) return { href: null, texte };
    return { href: url.href, texte };
  } catch {
    return { href: null, texte };
  }
}
