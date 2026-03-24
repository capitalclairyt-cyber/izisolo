export const metadata = { title: "CGV — Conditions Générales de Vente | IziSolo" };

export default function CGVPage() {
  return (
    <div className="legal-content">
      <h1>Conditions Générales de Vente</h1>
      <p className="legal-date">Dernière mise à jour : mars 2025</p>

      <h2>1. Vendeur</h2>
      <p>
        Les présentes CGV régissent les ventes de services d'abonnement à la plateforme IziSolo,
        éditée par <strong>Mélutek</strong>. Coordonnées complètes disponibles dans les mentions légales.
      </p>

      <h2>2. Offres et tarifs</h2>
      <p>
        IziSolo propose plusieurs formules d'abonnement (Gratuit, Solo, Pro, Studio, Premium)
        dont les caractéristiques et les tarifs sont détaillés sur la page de tarification accessible
        depuis l'application. Les prix sont exprimés en euros TTC.
      </p>
      <p>
        Mélutek se réserve le droit de modifier ses tarifs à tout moment. Les modifications tarifaires
        seront communiquées par email au moins 30 jours avant leur application.
        Les abonnements en cours ne sont pas rétroactivement affectés.
      </p>

      <h2>3. Commande et paiement</h2>
      <p>
        Le paiement s'effectue en ligne par carte bancaire via notre prestataire de paiement sécurisé
        <strong> Stripe</strong>. Les données de paiement ne sont jamais stockées sur nos serveurs.
      </p>
      <p>Les abonnements sont :</p>
      <ul>
        <li>Facturés mensuellement ou annuellement selon le choix lors de la souscription</li>
        <li>Renouvelés automatiquement à échéance sauf résiliation</li>
        <li>Activés immédiatement après confirmation du paiement</li>
      </ul>

      <h2>4. Droit de rétractation</h2>
      <p>
        Conformément à l'article L.221-28 du Code de la consommation, le droit de rétractation
        de 14 jours ne s'applique pas aux services numériques dont l'exécution a commencé avec
        l'accord préalable du consommateur.
      </p>
      <div className="legal-box">
        Cependant, si vous n'êtes pas satisfait dans les 7 premiers jours suivant votre premier
        abonnement payant, contactez-nous à <a href="mailto:support@izisolo.fr">support@izisolo.fr</a> —
        nous examinerons votre demande de remboursement au cas par cas.
      </div>

      <h2>5. Résiliation</h2>
      <p>
        Vous pouvez résilier votre abonnement à tout moment depuis les paramètres de votre compte.
        La résiliation prend effet à la fin de la période d'abonnement en cours.
        Aucun remboursement au prorata n'est effectué sauf disposition contraire expresse.
      </p>

      <h2>6. Suspension pour impayé</h2>
      <p>
        En cas d'échec de paiement, Mélutek se réserve le droit de suspendre l'accès aux fonctionnalités
        premium après une période de grâce de 7 jours et notification par email.
        Les données de l'utilisateur sont conservées pendant 30 jours après la suspension.
      </p>

      <h2>7. Factures</h2>
      <p>
        Une facture est automatiquement générée à chaque paiement et disponible dans les paramètres
        de votre compte. En cas de besoin spécifique (facturation à une entreprise, TVA intracommunautaire),
        contactez <a href="mailto:facturation@izisolo.fr">facturation@izisolo.fr</a>.
      </p>

      <h2>8. Litiges et médiation</h2>
      <p>
        En cas de litige, vous pouvez contacter notre service client à <a href="mailto:support@izisolo.fr">support@izisolo.fr</a>.
        Conformément aux articles L.616-1 et R.616-1 du Code de la consommation, vous pouvez également
        recourir à une médiation de la consommation.
      </p>

      <h2>9. Droit applicable</h2>
      <p>
        Les présentes CGV sont soumises au droit français. Tout litige sera soumis aux tribunaux
        compétents du ressort du siège social de Mélutek.
      </p>
    </div>
  );
}
