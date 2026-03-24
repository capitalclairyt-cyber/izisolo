export const metadata = { title: "Mentions légales | IziSolo" };

export default function MentionsLegalesPage() {
  return (
    <div className="legal-content">
      <h1>Mentions légales</h1>
      <p className="legal-date">Conformément à la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique</p>

      <h2>Éditeur du site</h2>
      <p>
        <strong>Mélutek</strong> — SAS<br />
        173 rue de Courcelles, 75017 Paris, France<br />
        SIRET : en cours d'immatriculation<br />
        Email : <a href="mailto:contact@izisolo.fr">contact@izisolo.fr</a>
      </p>

      <h2>Directeur de la publication</h2>
      <p>Le Président de la SAS Mélutek</p>

      <h2>Hébergement</h2>
      <p>
        <strong>Vercel Inc.</strong><br />
        440 N Barranca Ave #4133, Covina, CA 91723, États-Unis<br />
        <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a>
      </p>
      <p>
        <strong>Supabase Inc.</strong> (base de données)<br />
        970 Toa Payoh North, Singapour<br />
        <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">supabase.com</a>
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L'ensemble du contenu du site IziSolo (textes, images, logo, design, code source) est la
        propriété exclusive de Mélutek et est protégé par les lois françaises et internationales
        relatives à la propriété intellectuelle.
      </p>
      <p>
        Toute reproduction, représentation, modification ou diffusion, totale ou partielle,
        sans autorisation écrite préalable de Mélutek est strictement interdite.
      </p>

      <h2>Protection des données personnelles</h2>
      <p>
        Le traitement de vos données personnelles est décrit dans notre{' '}
        <a href="/legal/rgpd">Politique de confidentialité</a>.
        Le responsable du traitement est Mélutek.
        Conformément au RGPD, vous disposez de droits sur vos données personnelles,
        exercés via <a href="mailto:dpo@izisolo.fr">dpo@izisolo.fr</a>.
      </p>

      <h2>Cookies</h2>
      <p>
        Ce site utilise uniquement des cookies techniques nécessaires à son fonctionnement.
        Aucun cookie publicitaire n'est déposé. Pour en savoir plus, consultez notre{' '}
        <a href="/legal/rgpd#cookies">politique de confidentialité</a>.
      </p>

      <h2>Loi applicable</h2>
      <p>
        Les présentes mentions légales sont régies par le droit français.
        Tout litige relatif à l'utilisation du site sera soumis à la compétence exclusive
        des tribunaux français.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question ou signalement :<br />
        <a href="mailto:contact@izisolo.fr">contact@izisolo.fr</a>
      </p>
    </div>
  );
}
