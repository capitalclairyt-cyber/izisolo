export const metadata = {
  title: "Politique de confidentialité (RGPD) | IziSolo",
  description: "Politique de confidentialité et de protection des données personnelles de la plateforme IziSolo, conforme RGPD.",
};

export default function RGPDPage() {
  return (
    <div className="legal-content">
      <h1>Politique de confidentialité</h1>
      <p className="legal-date">
        Conforme au Règlement (UE) 2016/679 (« <strong>RGPD</strong> ») et à la loi
        Informatique et Libertés du 6 janvier 1978 modifiée. Dernière mise à jour : 6
        mai 2026.
      </p>

      <h2>1. Responsable de traitement</h2>
      <p>
        La société <strong>Atelier Mélusine</strong>, SASU au capital de 1 000 €,
        SIREN 889 060 901, dont le siège social est situé 146 Rue Elsa Triolet, 38260
        La Côte-Saint-André, France (ci-après « <strong>l'Éditeur</strong> » ou
        « <strong>nous</strong> »), est responsable du traitement des données
        personnelles relatives aux utilisateurs professionnels du service IziSolo
        (« <strong>vous</strong> », « <strong>le Client</strong> »).
      </p>
      <p>
        Pour les données concernant <strong>les élèves du Client</strong> saisies
        dans la plateforme par le Client lui-même, l'Éditeur agit en qualité de{' '}
        <strong>sous-traitant au sens de l'article 28 du RGPD</strong>. Les
        conditions de cette sous-traitance figurent à la section 8 ci-dessous.
      </p>

      <h2>2. Données collectées et finalités</h2>
      <p>
        Nous collectons et traitons les données suivantes, pour les finalités
        précisées :
      </p>
      <table className="legal-table">
        <thead>
          <tr>
            <th>Catégorie</th>
            <th>Données</th>
            <th>Finalité</th>
            <th>Base légale</th>
            <th>Conservation</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Compte</td>
            <td>email, mot de passe (haché), nom du studio</td>
            <td>création et gestion du compte</td>
            <td>exécution du contrat</td>
            <td>durée du compte + 30 j</td>
          </tr>
          <tr>
            <td>Facturation</td>
            <td>nom, adresse, identifiants Stripe, factures</td>
            <td>facturation, comptabilité</td>
            <td>obligation légale</td>
            <td>10 ans (Code de commerce)</td>
          </tr>
          <tr>
            <td>Usage</td>
            <td>logs techniques, adresse IP, user-agent</td>
            <td>sécurité, prévention de la fraude, debugging</td>
            <td>intérêt légitime</td>
            <td>12 mois max</td>
          </tr>
          <tr>
            <td>Support</td>
            <td>échanges email, tickets, conversations assistant</td>
            <td>réponse au support, amélioration du service</td>
            <td>exécution du contrat / intérêt légitime</td>
            <td>3 ans après le dernier échange</td>
          </tr>
          <tr>
            <td>Communication</td>
            <td>email, préférences</td>
            <td>emails transactionnels, newsletter (opt-in)</td>
            <td>exécution du contrat / consentement</td>
            <td>jusqu'au retrait du consentement</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Aucun usage commercial des données</h2>
      <p>
        Nous <strong>ne vendons jamais</strong> vos données ni celles de vos élèves à
        des tiers. Nous ne procédons à aucun profilage publicitaire. Aucune donnée
        n'est communiquée à des annonceurs, courtiers en données ou agrégateurs.
      </p>

      <h2>4. Sous-traitants et destinataires</h2>
      <p>
        Pour fournir le service, nous recourons à des prestataires soigneusement
        sélectionnés, eux-mêmes liés par une obligation de confidentialité et de
        conformité RGPD :
      </p>
      <table className="legal-table">
        <thead>
          <tr>
            <th>Prestataire</th>
            <th>Rôle</th>
            <th>Pays d'hébergement</th>
            <th>Garantie</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Vercel Inc.</td>
            <td>Hébergement applicatif</td>
            <td>UE / États-Unis</td>
            <td>Clauses contractuelles types (CCT)</td>
          </tr>
          <tr>
            <td>Supabase Inc.</td>
            <td>Base de données, authentification</td>
            <td>UE (Francfort)</td>
            <td>Hébergement européen</td>
          </tr>
          <tr>
            <td>Stripe Payments Europe Ltd.</td>
            <td>Paiement par carte bancaire</td>
            <td>UE (Irlande)</td>
            <td>Conformité PCI-DSS, RGPD</td>
          </tr>
          <tr>
            <td>Resend Inc.</td>
            <td>Envoi d'emails transactionnels</td>
            <td>États-Unis</td>
            <td>Clauses contractuelles types</td>
          </tr>
          <tr>
            <td>Anthropic, PBC</td>
            <td>Assistant conversationnel (Claude)</td>
            <td>États-Unis</td>
            <td>Clauses contractuelles types, données non utilisées pour l'entraînement</td>
          </tr>
          <tr>
            <td>Sentry</td>
            <td>Monitoring d'erreurs (anonymisé)</td>
            <td>UE / États-Unis</td>
            <td>Données techniques uniquement, pas de PII</td>
          </tr>
        </tbody>
      </table>

      <h2>5. Transferts hors Union européenne</h2>
      <p>
        Certains de nos sous-traitants peuvent traiter des données aux États-Unis
        (Vercel, Resend, Anthropic, Sentry partiellement). Ces transferts sont encadrés
        par les clauses contractuelles types adoptées par la Commission européenne ou
        par toute autre garantie appropriée au sens des articles 44 à 49 du RGPD.
      </p>

      <h2>6. Sécurité</h2>
      <p>
        Nous mettons en œuvre des mesures techniques et organisationnelles
        appropriées pour protéger vos données :
      </p>
      <ul>
        <li>chiffrement TLS 1.3 sur l'ensemble des communications réseau ;</li>
        <li>chiffrement au repos des données stockées par Supabase ;</li>
        <li>mots de passe hachés (bcrypt) — jamais stockés en clair ;</li>
        <li>cloisonnement strict des données entre studios via Row-Level Security PostgreSQL ;</li>
        <li>journalisation et audit des accès, alertes en cas d'activité suspecte ;</li>
        <li>sauvegardes quotidiennes par l'hébergeur, conservation 7 jours ;</li>
        <li>processus de gestion des vulnérabilités et mises à jour de sécurité.</li>
      </ul>
      <p>
        En cas de violation de données affectant vos données personnelles et
        susceptible d'engendrer un risque pour vos droits et libertés, nous
        notifierons l'incident à la CNIL dans les 72 heures, et vous informerons
        sans délai si nécessaire.
      </p>

      <h2>7. Vos droits</h2>
      <p>
        Conformément au RGPD, vous disposez sur vos données personnelles des droits
        suivants : <strong>accès</strong>, <strong>rectification</strong>,{' '}
        <strong>effacement</strong> (« droit à l'oubli »),{' '}
        <strong>limitation</strong>, <strong>opposition</strong>,{' '}
        <strong>portabilité</strong>, <strong>retrait du consentement</strong> à
        tout moment, et droit de définir des directives relatives à leur sort après
        votre décès.
      </p>
      <p>
        Vous pouvez exercer ces droits en écrivant à{' '}
        <a href="mailto:bonjour@izisolo.fr">bonjour@izisolo.fr</a>. Nous nous engageons à
        répondre dans un délai d'un (1) mois maximum, prorogeable de deux (2) mois en
        cas de demande complexe.
      </p>
      <p>
        Si vous estimez, après nous avoir contactés, que vos droits ne sont pas
        respectés, vous pouvez introduire une réclamation auprès de la{' '}
        <strong>Commission Nationale de l'Informatique et des Libertés (CNIL)</strong>,
        3 place de Fontenoy, 75007 Paris —{' '}
        <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer">cnil.fr/plaintes</a>.
      </p>

      <h2>8. Sous-traitance des données des élèves (article 28 RGPD)</h2>
      <p>
        Lorsque le Client saisit dans IziSolo des données concernant ses élèves
        (nom, email, présences, paiements, messages, etc.), il agit en qualité de{' '}
        <strong>responsable de traitement</strong>, et l'Éditeur en qualité de{' '}
        <strong>sous-traitant</strong> au sens de l'article 28 du RGPD.
      </p>
      <p>
        Dans ce cadre, l'Éditeur s'engage notamment à :
      </p>
      <ul>
        <li>traiter les données uniquement sur instruction documentée du Client (en pratique : utilisation conforme du service) ;</li>
        <li>garantir la confidentialité des personnes autorisées à traiter les données ;</li>
        <li>mettre en place des mesures de sécurité appropriées (cf. section 6) ;</li>
        <li>n'engager aucun sous-traitant ultérieur sans information préalable du Client (la liste figurant en section 4 vaut autorisation) ;</li>
        <li>aider le Client à répondre aux demandes d'exercice des droits de ses élèves ;</li>
        <li>aider le Client à se conformer à ses obligations de sécurité, de notification de violation et d'analyse d'impact ;</li>
        <li>supprimer ou retourner les données au Client à l'expiration du contrat (cf. section 9 ci-dessous) ;</li>
        <li>mettre à disposition toute information nécessaire pour démontrer le respect de ses obligations.</li>
      </ul>
      <p>
        Le Client garantit avoir recueilli, vis-à-vis de ses élèves, les fondements
        juridiques et le cas échéant les consentements nécessaires au traitement de
        leurs données dans IziSolo. Il garantit l'Éditeur contre toute action de tiers
        liée à ses obligations propres de responsable de traitement.
      </p>

      <h2>9. Durée de conservation et restitution</h2>
      <p>
        Les durées de conservation par catégorie figurent dans le tableau de la
        section 2.
      </p>
      <p>
        À l'expiration du contrat, le Client dispose de trente (30) jours pour
        exporter l'intégralité de ses données depuis son compte (formats CSV/JSON).
        À l'issue de ce délai, l'ensemble des données du Client et de ses élèves
        est définitivement supprimé de nos systèmes, à l'exception des factures
        conservées dix (10) ans en application du Code de commerce, et des données
        nécessaires à la défense de droits éventuels (jusqu'au terme des
        prescriptions applicables).
      </p>

      <h2 id="cookies">10. Cookies et traceurs</h2>
      <p>
        Le site et l'application n'utilisent que des cookies <strong>strictement
        nécessaires</strong> à leur fonctionnement (authentification, préférences
        d'interface, jeton CSRF). Aucun cookie publicitaire, traqueur tiers, pixel de
        suivi ou outil d'analyse comportementale n'est déposé. Aucun consentement
        préalable n'est requis pour ces cookies essentiels (article 82 de la loi
        Informatique et Libertés).
      </p>

      <h2>11. Données traitées par l'assistant conversationnel</h2>
      <p>
        Si vous utilisez l'assistant conversationnel intégré (basé sur la technologie
        Claude d'Anthropic), vos messages sont transmis à Anthropic uniquement le
        temps de générer une réponse. Anthropic s'engage contractuellement à{' '}
        <strong>ne pas utiliser ces données pour entraîner ses modèles</strong>. Les
        échanges sont conservés dans votre compte IziSolo pour vous permettre de les
        consulter, et soumis à la durée de conservation des échanges support.
      </p>

      <h2>12. Modification de la présente politique</h2>
      <p>
        L'Éditeur peut modifier la présente politique à tout moment afin de l'adapter
        à l'évolution du service, de la réglementation ou de ses sous-traitants.
        Toute modification substantielle sera notifiée par email aux Clients actifs
        au moins quinze (15) jours avant son entrée en vigueur.
      </p>

      <h2>13. Contact</h2>
      <p>
        Pour toute question relative à la présente politique ou à l'exercice de vos
        droits :
      </p>
      <ul>
        <li>par email : <a href="mailto:bonjour@izisolo.fr">bonjour@izisolo.fr</a></li>
        <li>par courrier : Atelier Mélusine — DPO, 146 Rue Elsa Triolet, 38260 La Côte-Saint-André</li>
      </ul>
    </div>
  );
}
