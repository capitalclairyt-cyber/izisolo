export const metadata = { title: "Politique de confidentialité & RGPD | IziSolo" };

export default function RGPDPage() {
  return (
    <div className="legal-content">
      <h1>Politique de confidentialité</h1>
      <p className="legal-date">Dernière mise à jour : mars 2025 — Conforme RGPD (UE 2016/679)</p>

      <div className="legal-box">
        Chez IziSolo, vos données et celles de vos élèves nous sont confiées, pas vendues.
        Nous appliquons le principe de minimisation des données : nous ne collectons que ce qui est
        strictement nécessaire au fonctionnement du service.
      </div>

      <h2>1. Responsable du traitement</h2>
      <p>
        <strong>Mélutek</strong> est responsable du traitement des données personnelles collectées
        via IziSolo. Contact DPO : <a href="mailto:dpo@izisolo.fr">dpo@izisolo.fr</a>
      </p>

      <h2>2. Données collectées</h2>

      <h3>2.1 Données de l'utilisateur (praticien·e)</h3>
      <ul>
        <li>Nom, prénom, adresse email (compte)</li>
        <li>Nom du studio, ville (profil)</li>
        <li>Informations de facturation (gérées par Stripe, non stockées chez nous)</li>
        <li>Données d'usage (connexions, fonctionnalités utilisées)</li>
      </ul>

      <h3>2.2 Données des élèves/clients (saisies par l'utilisateur)</h3>
      <p>
        Ces données sont saisies par le praticien dans le cadre de son activité.
        Le praticien est <strong>responsable de traitement secondaire</strong> vis-à-vis de ses propres élèves
        et doit les informer conformément au RGPD.
      </p>
      <ul>
        <li>Prénom, nom, email, téléphone (optionnel)</li>
        <li>Données d'abonnement et de présence aux cours</li>
        <li>Notes et commentaires libres</li>
      </ul>

      <h2>3. Bases légales des traitements</h2>
      <ul>
        <li><strong>Exécution du contrat</strong> : gestion du compte, facturation, service</li>
        <li><strong>Intérêt légitime</strong> : sécurité, prévention de la fraude, amélioration du service</li>
        <li><strong>Obligation légale</strong> : conservation des données de facturation (10 ans)</li>
        <li><strong>Consentement</strong> : communications marketing (opt-in)</li>
      </ul>

      <h2>4. Durée de conservation</h2>
      <ul>
        <li>Données de compte actif : durée de l'abonnement + 3 ans</li>
        <li>Données après suppression du compte : 30 jours (anonymisation)</li>
        <li>Données de facturation : 10 ans (obligation légale)</li>
        <li>Logs de sécurité : 12 mois</li>
      </ul>

      <h2>5. Sous-traitants et transferts</h2>
      <p>Nous faisons appel aux sous-traitants suivants, tous conformes RGPD :</p>
      <ul>
        <li><strong>Supabase</strong> (hébergement base de données) — serveurs UE</li>
        <li><strong>Stripe</strong> (paiements) — conforme PCI-DSS, DPA signé</li>
        <li><strong>Resend</strong> (emails transactionnels) — DPA signé</li>
        <li><strong>Anthropic / Claude</strong> (assistant IA) — aucune donnée client transmise</li>
        <li><strong>Vercel</strong> (hébergement application) — DPA signé, serveurs UE optionnels</li>
      </ul>

      <h2>6. Vos droits</h2>
      <p>Conformément au RGPD, vous disposez des droits suivants :</p>
      <ul>
        <li><strong>Accès</strong> : obtenir une copie de vos données</li>
        <li><strong>Rectification</strong> : corriger des données inexactes</li>
        <li><strong>Effacement</strong> (droit à l'oubli) : supprimer votre compte et vos données</li>
        <li><strong>Portabilité</strong> : exporter vos données (format CSV/JSON depuis les paramètres)</li>
        <li><strong>Opposition</strong> : vous opposer à certains traitements</li>
        <li><strong>Limitation</strong> : demander la limitation du traitement</li>
      </ul>
      <p>
        Pour exercer ces droits : <a href="mailto:dpo@izisolo.fr">dpo@izisolo.fr</a>.
        Délai de réponse : 30 jours maximum.
      </p>
      <p>
        Vous pouvez également adresser une réclamation à la <strong>CNIL</strong> :
        <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer"> www.cnil.fr</a>
      </p>

      <h2>7. Cookies</h2>
      <p>
        IziSolo utilise uniquement des cookies techniques strictement nécessaires au fonctionnement
        (session d'authentification). Aucun cookie publicitaire ou de tracking tiers n'est utilisé.
      </p>

      <h2>8. Sécurité</h2>
      <p>
        Les données sont chiffrées en transit (TLS 1.3) et au repos. L'accès aux données est limité
        aux seules personnes nécessitant d'y accéder dans le cadre de leur mission.
        Des audits de sécurité sont conduits régulièrement.
      </p>

      <h2>9. Contact</h2>
      <p>
        Délégué à la Protection des Données : <a href="mailto:dpo@izisolo.fr">dpo@izisolo.fr</a>
      </p>
    </div>
  );
}
