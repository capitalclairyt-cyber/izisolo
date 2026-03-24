export const metadata = { title: "CGU — Conditions Générales d'Utilisation | IziSolo" };

export default function CGUPage() {
  return (
    <div className="legal-content">
      <h1>Conditions Générales d'Utilisation</h1>
      <p className="legal-date">Dernière mise à jour : mars 2025</p>

      <h2>1. Présentation du service</h2>
      <p>
        IziSolo est une application de gestion destinée aux praticien·es indépendant·es (yoga, pilates,
        danse, musique, coaching, arts martiaux, etc.). Elle est éditée par la société <strong>Mélutek</strong>,
        dont les coordonnées figurent dans les mentions légales.
      </p>
      <p>
        L'accès au service est possible depuis un navigateur web ou via l'application installable (PWA)
        sur smartphone et tablette.
      </p>

      <h2>2. Acceptation des conditions</h2>
      <p>
        L'utilisation du service implique l'acceptation pleine et entière des présentes conditions.
        Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser IziSolo.
      </p>
      <p>
        Ces conditions peuvent être modifiées à tout moment. Les utilisateurs seront informés par email
        des modifications substantielles au moins 15 jours avant leur entrée en vigueur.
      </p>

      <h2>3. Inscription et compte utilisateur</h2>
      <p>
        Pour utiliser IziSolo, vous devez créer un compte en fournissant une adresse email valide et
        un mot de passe. Vous êtes responsable de la confidentialité de vos identifiants.
      </p>
      <p>
        Toute utilisation de votre compte sous votre responsabilité. En cas de suspicion d'utilisation
        non autorisée, vous devez nous contacter immédiatement à <a href="mailto:support@izisolo.fr">support@izisolo.fr</a>.
      </p>
      <div className="legal-box">
        Vous devez avoir au moins 18 ans pour créer un compte IziSolo. En vous inscrivant,
        vous certifiez utiliser le service dans un cadre professionnel ou para-professionnel.
      </div>

      <h2>4. Utilisation du service</h2>
      <p>Vous vous engagez à utiliser IziSolo de manière licite et à ne pas :</p>
      <ul>
        <li>Tenter d'accéder à des données qui ne vous appartiennent pas</li>
        <li>Perturber le fonctionnement du service ou de ses serveurs</li>
        <li>Utiliser le service pour des activités illégales ou frauduleuses</li>
        <li>Revendre, louer ou sous-licencier l'accès au service à des tiers</li>
        <li>Contourner les mesures de sécurité du service</li>
      </ul>

      <h2>5. Données utilisateurs</h2>
      <p>
        Les données que vous saisissez dans IziSolo (élèves, cours, paiements, etc.) vous appartiennent.
        Mélutek n'utilise pas ces données à des fins commerciales et ne les vend pas à des tiers.
      </p>
      <p>
        Vous pouvez exporter vos données à tout moment depuis les paramètres de votre compte.
        En cas de fermeture de compte, vos données sont supprimées dans un délai de 30 jours.
      </p>

      <h2>6. Disponibilité du service</h2>
      <p>
        Nous mettons tout en œuvre pour assurer une disponibilité maximale du service (objectif : 99,5 %
        de disponibilité mensuelle). Des maintenances planifiées peuvent occasionnellement interrompre
        le service ; elles seront annoncées en avance autant que possible.
      </p>
      <p>
        Mélutek ne peut être tenu responsable des interruptions indépendantes de sa volonté
        (pannes d'infrastructure tierce, force majeure, etc.).
      </p>

      <h2>7. Propriété intellectuelle</h2>
      <p>
        L'application IziSolo, son code, son design, ses textes et ses illustrations sont la propriété
        exclusive de Mélutek. Toute reproduction, même partielle, est interdite sans autorisation écrite.
      </p>

      <h2>8. Résiliation</h2>
      <p>
        Vous pouvez supprimer votre compte à tout moment depuis les paramètres.
        Mélutek se réserve le droit de suspendre ou résilier un compte en cas de violation des présentes CGU,
        après notification par email sauf comportement grave nécessitant une action immédiate.
      </p>

      <h2>9. Limitation de responsabilité</h2>
      <p>
        Dans les limites autorisées par la loi, Mélutek ne saurait être tenu responsable des dommages
        indirects, pertes de données ou manque à gagner résultant de l'utilisation ou de l'impossibilité
        d'utiliser le service.
      </p>

      <h2>10. Droit applicable</h2>
      <p>
        Les présentes CGU sont soumises au droit français. Tout litige sera soumis aux tribunaux compétents
        du ressort du siège social de Mélutek, sauf disposition légale contraire.
      </p>

      <h2>11. Contact</h2>
      <p>
        Pour toute question relative aux présentes CGU : <a href="mailto:legal@izisolo.fr">legal@izisolo.fr</a>
      </p>
    </div>
  );
}
