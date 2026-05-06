export const metadata = {
  title: "Mentions légales | IziSolo",
  description: "Éditeur, hébergement et informations légales de la plateforme IziSolo.",
};

export default function MentionsLegalesPage() {
  return (
    <div className="legal-content">
      <h1>Mentions légales</h1>
      <p className="legal-date">
        Conformément à l'article 6 III de la loi n° 2004-575 du 21 juin 2004 pour la
        confiance dans l'économie numérique (LCEN). Dernière mise à jour : 6 mai 2026.
      </p>

      <h2>1. Éditeur du service</h2>
      <p>
        La plateforme IziSolo, accessible à l'adresse{' '}
        <a href="https://izisolo.fr">izisolo.fr</a>, est éditée par :
      </p>
      <p>
        <strong>Atelier Mélusine</strong> — SASU au capital de 1 000 €<br />
        Siège social : 146 Rue Elsa Triolet, 38260 La Côte-Saint-André, France<br />
        Numéro SIREN : 889 060 901<br />
        Représentée par son Président<br />
        Adresse électronique :{' '}
        <a href="mailto:contact@izisolo.fr">contact@izisolo.fr</a>
      </p>
      <p className="legal-note">
        TVA non applicable, article 293 B du Code général des impôts (le cas échéant).
      </p>

      <h2>2. Directeur de la publication</h2>
      <p>
        Le Président de la SASU Atelier Mélusine est responsable de la publication des
        contenus diffusés sur le site IziSolo.
      </p>

      <h2>3. Hébergement et infrastructure</h2>
      <p>
        Le site et l'application sont hébergés par :
      </p>
      <p>
        <strong>Vercel Inc.</strong><br />
        440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis<br />
        <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a>
      </p>
      <p>
        La base de données et l'authentification sont assurées par :
      </p>
      <p>
        <strong>Supabase Inc.</strong><br />
        970 Toa Payoh North #07-04, Singapour 318992<br />
        <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">supabase.com</a>
      </p>
      <p>
        Les données stockées par Supabase sont hébergées dans la région{' '}
        <strong>Europe (Francfort, Allemagne)</strong>.
      </p>

      <h2>4. Sous-traitants techniques</h2>
      <p>
        Atelier Mélusine recourt aux prestataires suivants pour le fonctionnement du
        service. La liste détaillée et les pays de traitement figurent dans la{' '}
        <a href="/legal/rgpd">Politique de confidentialité</a> :
      </p>
      <ul>
        <li><strong>Stripe Payments Europe Ltd.</strong> — paiement en ligne</li>
        <li><strong>Resend Inc.</strong> — envoi d'emails transactionnels</li>
        <li><strong>Anthropic, PBC</strong> — assistant conversationnel (Claude)</li>
        <li><strong>Sentry</strong> — monitoring d'erreurs (anonymisé)</li>
      </ul>

      <h2>5. Propriété intellectuelle</h2>
      <p>
        L'ensemble du site et de l'application IziSolo, en ce compris sans limitation
        l'architecture logicielle, le code source, le design, les illustrations,
        photographies, marques, logos, textes et bases de données structurelles, est la
        propriété exclusive de la société <strong>Atelier Mélusine</strong> ou fait
        l'objet d'une autorisation d'utilisation. Ces éléments sont protégés par le Code
        de la propriété intellectuelle, le droit des marques, le droit des bases de
        données et l'ensemble des conventions internationales applicables.
      </p>
      <p>
        Toute reproduction, représentation, modification, adaptation, traduction,
        diffusion, exploitation commerciale, intégration ou rétro-ingénierie, totale ou
        partielle, par quelque procédé que ce soit, sans autorisation écrite préalable
        d'Atelier Mélusine, est strictement interdite et constitue une contrefaçon
        sanctionnée par les articles L.335-2 et suivants du Code de la propriété
        intellectuelle.
      </p>

      <h2>6. Marques</h2>
      <p>
        « IziSolo », son logo et ses signes distinctifs sont des marques, déposées ou en
        cours de dépôt, dont Atelier Mélusine détient les droits exclusifs. Toute
        utilisation non autorisée engage la responsabilité civile et pénale de son
        auteur.
      </p>

      <h2>7. Données personnelles</h2>
      <p>
        Le traitement des données personnelles est décrit dans notre{' '}
        <a href="/legal/rgpd">Politique de confidentialité</a>. Le responsable du
        traitement est Atelier Mélusine. Conformément au RGPD et à la loi Informatique
        et Libertés, vous disposez de droits sur vos données personnelles, exercés via{' '}
        <a href="mailto:dpo@izisolo.fr">dpo@izisolo.fr</a>.
      </p>

      <h2>8. Cookies</h2>
      <p>
        Le site utilise uniquement des cookies strictement nécessaires à son
        fonctionnement (session d'authentification, préférences d'affichage). Aucun
        cookie publicitaire, traqueur tiers ou outil de profilage n'est déposé. Pour le
        détail, consultez la{' '}
        <a href="/legal/rgpd#cookies">politique de confidentialité</a>.
      </p>

      <h2>9. Loi applicable et juridiction</h2>
      <p>
        Les présentes mentions légales sont régies par le droit français. Tout
        différend relatif à leur interprétation ou à leur exécution relève de la
        compétence exclusive des tribunaux du ressort de la Cour d'appel de Grenoble
        (siège social d'Atelier Mélusine), nonobstant pluralité de défendeurs ou appel
        en garantie.
      </p>

      <h2>10. Contact</h2>
      <p>
        Pour toute question, signalement ou notification (y compris au titre de l'article
        6 I 5° de la LCEN) :{' '}
        <a href="mailto:contact@izisolo.fr">contact@izisolo.fr</a>
      </p>
    </div>
  );
}
