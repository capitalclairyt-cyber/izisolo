export const metadata = {
  title: "CGU — Conditions Générales d'Utilisation | IziSolo",
  description: "Conditions générales d'utilisation de la plateforme IziSolo.",
};

export default function CGUPage() {
  return (
    <div className="legal-content">
      <h1>Conditions Générales d'Utilisation</h1>
      <p className="legal-date">Dernière mise à jour : 6 mai 2026 — Version 2.0</p>

      <h2>1. Présentation et éditeur</h2>
      <p>
        IziSolo est une plateforme de gestion en ligne (SaaS) destinée exclusivement
        aux professionnels indépendants exerçant dans les domaines du yoga, pilates,
        danse, méditation, coaching, thérapies manuelles et toute discipline du
        bien-être et du mouvement. Elle est éditée par <strong>Atelier Mélusine</strong>,
        SASU au capital de 1 000 €, dont les coordonnées complètes figurent dans les{' '}
        <a href="/legal/mentions">mentions légales</a> (ci-après «{' '}
        <strong>l'Éditeur</strong> »).
      </p>
      <p>
        Le service est accessible depuis tout navigateur web et également sous forme
        d'application installable (Progressive Web App, PWA) sur smartphone et
        tablette.
      </p>

      <h2>2. Acceptation et opposabilité</h2>
      <p>
        L'utilisation du service implique l'acceptation pleine et entière des
        présentes Conditions Générales d'Utilisation (« <strong>CGU</strong> »), des{' '}
        <a href="/legal/cgv">Conditions Générales de Vente</a> et de la{' '}
        <a href="/legal/rgpd">Politique de confidentialité</a>. À défaut d'acceptation,
        l'utilisateur est invité à ne pas utiliser le service.
      </p>
      <p>
        Les présentes CGU peuvent être modifiées à tout moment par l'Éditeur. Toute
        modification substantielle sera notifiée par email au moins quinze (15) jours
        avant son entrée en vigueur. La poursuite de l'utilisation du service vaut
        acceptation des nouvelles conditions.
      </p>

      <h2>3. Inscription et compte</h2>
      <p>
        L'accès aux fonctionnalités de gestion d'IziSolo nécessite la création d'un
        compte personnel via un email valide et un mot de passe choisi par
        l'utilisateur. L'utilisateur est seul responsable de la confidentialité de
        ses identifiants et de toute action effectuée depuis son compte.
      </p>
      <p>
        En cas de suspicion d'utilisation non autorisée, il appartient à
        l'utilisateur d'en informer immédiatement l'Éditeur à{' '}
        <a href="mailto:bonjour@izisolo.fr">bonjour@izisolo.fr</a>.
      </p>
      <div className="legal-box">
        <strong>Capacité.</strong> L'utilisateur certifie avoir au moins dix-huit
        (18) ans, être juridiquement capable de contracter, et utiliser le service
        exclusivement dans le cadre de son activité professionnelle. Toute inscription
        à des fins purement personnelles ou de loisir est interdite.
      </div>

      <h2>4. Usages autorisés et interdits</h2>
      <p>
        L'utilisateur s'engage à utiliser IziSolo de manière loyale, licite et
        conforme à sa destination. Il est notamment interdit, sans que cette liste
        soit exhaustive :
      </p>
      <ul>
        <li>de tenter d'accéder, de modifier ou de supprimer des données qui ne lui appartiennent pas ;</li>
        <li>de tester la sécurité, contourner ou compromettre les mesures techniques de protection ;</li>
        <li>d'utiliser le service à des fins illégales, frauduleuses, diffamatoires ou contraires à l'ordre public ;</li>
        <li>de revendre, louer, sous-licencier ou mettre à disposition de tiers tout ou partie de son accès ;</li>
        <li>d'utiliser le service de manière automatisée (bots, scripts) sans autorisation écrite préalable ;</li>
        <li>d'effectuer toute opération d'ingénierie inverse, décompilation, désassemblage ou copie du code source ;</li>
        <li>d'utiliser le service à des fins de spam, harcèlement ou démarchage non sollicité de tiers.</li>
      </ul>
      <p>
        Tout manquement expose l'utilisateur à la suspension ou à la résiliation
        immédiate de son compte, sans préavis ni indemnité, et sans préjudice de
        toute action judiciaire.
      </p>

      <h2>5. Données et contenus de l'utilisateur</h2>
      <p>
        Les données et contenus saisis par l'utilisateur (informations sur ses
        élèves, ses cours, ses paiements, ses messages, etc.) demeurent sa propriété.
        L'Éditeur n'utilise ces données ni à des fins commerciales ni publicitaires
        et ne les vend à aucun tiers.
      </p>
      <p>
        L'utilisateur garantit l'Éditeur :
      </p>
      <ul>
        <li>disposer de tous les droits, autorisations et consentements nécessaires pour saisir et faire traiter ces données ;</li>
        <li>respecter, vis-à-vis de ses élèves, l'ensemble des obligations RGPD lui incombant en sa qualité de responsable de traitement ;</li>
        <li>ne pas saisir de contenu illicite, dénigrant, diffamatoire, contrefaisant ou attentatoire aux droits de tiers.</li>
      </ul>
      <p>
        L'utilisateur peut exporter ses données à tout moment depuis son compte
        (formats CSV / JSON selon les modules). En cas de fermeture du compte, les
        données sont supprimées dans un délai de trente (30) jours, sous réserve des
        obligations légales de conservation incombant à l'Éditeur (factures
        notamment).
      </p>

      <h2>6. Disponibilité du service</h2>
      <p>
        L'Éditeur déploie ses meilleurs efforts pour assurer une disponibilité
        élevée du service (objectif indicatif et non contractuel : 99,5 % de
        disponibilité mensuelle). Aucun engagement de niveau de service (SLA) n'est
        garanti, sauf accord spécifique écrit.
      </p>
      <p>
        Des opérations de maintenance peuvent occasionnellement entraîner des
        interruptions, lesquelles seront annoncées dans la mesure du possible. Les
        interruptions imputables à une infrastructure tierce (Vercel, Supabase,
        Stripe, Resend, opérateur télécom…), à un cas de force majeure ou à un fait
        de l'utilisateur n'engagent pas la responsabilité de l'Éditeur.
      </p>

      <h2>7. Propriété intellectuelle</h2>
      <p>
        L'application IziSolo, son code source, son architecture, son design, ses
        textes, illustrations, marques et logos sont la propriété exclusive
        d'Atelier Mélusine. Toute reproduction, représentation, adaptation,
        traduction, modification ou diffusion, totale ou partielle, par quelque
        procédé que ce soit, est strictement interdite sans autorisation écrite
        préalable.
      </p>
      <p>
        Le contrat ne confère à l'utilisateur aucun autre droit que celui d'utiliser
        le service conformément à sa destination, pour la durée de son abonnement.
        Aucune cession de propriété intellectuelle n'est consentie.
      </p>

      <h2>8. Suspension et résiliation</h2>
      <p>
        L'utilisateur peut clôturer son compte à tout moment depuis ses paramètres ou
        en écrivant à <a href="mailto:bonjour@izisolo.fr">bonjour@izisolo.fr</a>. Les
        modalités financières sont régies par les{' '}
        <a href="/legal/cgv">CGV</a>.
      </p>
      <p>
        L'Éditeur peut suspendre ou résilier le compte d'un utilisateur, de plein
        droit et sans préavis, en cas de violation des présentes CGU, des CGV, de la
        loi ou des droits de tiers. La suspension peut être prononcée à titre
        conservatoire pendant l'examen d'un manquement allégué.
      </p>

      <h2>9. Limitation de responsabilité</h2>
      <p>
        L'utilisateur étant un professionnel, et dans toute la mesure permise par la
        loi, l'Éditeur ne saurait être tenu responsable des dommages indirects,
        immatériels, perte de chance, perte d'exploitation, perte de données, perte
        de clientèle ou manque à gagner, résultant de l'utilisation, de l'usage
        impropre ou de l'impossibilité d'utiliser le service.
      </p>
      <p>
        Pour les dommages directs et certains, le montant cumulé de toute somme
        susceptible d'être mise à la charge de l'Éditeur, toutes causes confondues,
        est expressément plafonné dans les conditions de l'article 12 des{' '}
        <a href="/legal/cgv">CGV</a>.
      </p>
      <p>
        L'Éditeur ne fournit aucune garantie quant à l'aptitude du service à
        atteindre un résultat particulier (croissance d'activité, fidélisation
        d'élèves, etc.). Les résultats dépendent de la situation propre à
        l'utilisateur, de la qualité de ses données et de sa pratique professionnelle.
      </p>

      <h2>10. Indépendance des parties</h2>
      <p>
        Les présentes ne créent ni mandat, ni société commune, ni relation
        d'employeur à employé entre les parties. Chaque partie reste indépendante et
        agit en son nom propre.
      </p>

      <h2>11. Loi applicable et juridiction</h2>
      <p>
        Les présentes CGU sont régies par le droit français. Tout différend relève
        de la <strong>compétence exclusive des tribunaux du ressort de la Cour
        d'appel de Grenoble</strong>, après tentative de résolution amiable de
        trente (30) jours.
      </p>

      <h2>12. Contact</h2>
      <p>
        Pour toute question relative aux présentes CGU :{' '}
        <a href="mailto:bonjour@izisolo.fr">bonjour@izisolo.fr</a>
      </p>
    </div>
  );
}
