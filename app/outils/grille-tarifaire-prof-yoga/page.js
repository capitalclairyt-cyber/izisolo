import Link from 'next/link';
import Image from 'next/image';
import Grille from './Grille';
import { getBreadcrumbSchema, ogImageUrl, BASE_URL } from '@/lib/seo';
import '../../landing.css';
import './outil.css';

const OG = ogImageUrl({
  eyebrow: 'Outil gratuit',
  title: 'Ta grille tarifaire, personnalisable et imprimable',
  subtitle: 'Édite, choisis ta palette, imprime. Pour ton studio, ta page web, ton porte-clé bureau.',
  palette: 'sable',
});

export const metadata = {
  title: 'Grille tarifaire personnalisable pour prof de yoga (gratuit, imprimable)',
  description: "Outil gratuit pour créer ta grille tarifaire de prof de yoga / pilates / coaching. Édite tes prix en direct, choisis ta palette, imprime ou exporte en PDF. Sauvegarde auto dans ton navigateur.",
  alternates: { canonical: `${BASE_URL}/outils/grille-tarifaire-prof-yoga` },
  openGraph: {
    title: 'Grille tarifaire personnalisable prof yoga — IziSolo',
    description: 'Édite tes prix, choisis ta palette, imprime. Template gratuit pour profs solo bien-être.',
    url: `${BASE_URL}/outils/grille-tarifaire-prof-yoga`,
    type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: 'Grille tarifaire personnalisable prof yoga' }],
  },
  twitter: { card: 'summary_large_image', images: [OG] },
};

export default function GrilleTarifairePage() {
  const breadcrumb = getBreadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: 'Outils', url: '/outils' },
    { name: 'Grille tarifaire personnalisable', url: '/outils/grille-tarifaire-prof-yoga' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <div className="izi-landing-root" data-palette="sable">
        <main className="outil-page">
          <div className="container">

            <nav className="outil-breadcrumb" aria-label="Fil d'Ariane">
              <Link href="/">Accueil</Link>
              <span>›</span>
              <Link href="/blog">Le journal</Link>
              <span>›</span>
              <span className="current">Grille tarifaire</span>
            </nav>

            <div className="outil-hero-photo">
              <Image
                src="/outils/hero-grille.jpg"
                alt="Cours de yoga collectif en plein air sur un ponton en bois au bord de l'eau"
                width={1200}
                height={800}
                priority
                sizes="(max-width: 1000px) 100vw, 1200px"
                style={{ objectFit: 'cover', objectPosition: 'center 40%' }}
              />
              <div className="outil-hero-overlay">
                <span className="eyebrow">Outil gratuit · imprimable</span>
                <h1 className="outil-h1 serif">
                  Ta grille tarifaire,
                  <br /><em>belle et claire.</em>
                </h1>
                <p className="outil-lead">
                  Édite tes prix en direct, choisis ta palette, imprime ou
                  exporte en PDF. Pour afficher dans ton studio, l&apos;envoyer
                  par mail ou la coller dans ton porte-clé bureau.
                </p>
              </div>
            </div>

            <Grille />

            {/* CTA discret IziSolo */}
            <section className="outil-cta">
              <div className="outil-cta-inner">
                <span className="eyebrow">Tes tarifs dans l&apos;app</span>
                <h3 className="serif">
                  Une fois tes tarifs posés ici,
                  <br /><em>charge-les dans IziSolo en 5 minutes.</em>
                </h3>
                <p>
                  Carnets, abonnements, cours unitaires, packs particuliers —
                  l&apos;app applique ta grille automatiquement à chaque
                  inscription, paiement et reçu PDF.
                </p>
                <Link href="/" className="btn btn-primary btn-lg">
                  Découvrir IziSolo →
                </Link>
                <p className="outil-cta-sub">
                  14 jours d&apos;essai gratuit · sans CB · annulation 1 clic
                </p>
              </div>
            </section>

            <nav className="outil-related" aria-label="Articles connexes">
              <h2 className="serif">Pour aller plus loin</h2>
              <div className="outil-related-grid">
                <Link href="/blog/comment-fixer-tarifs-prof-yoga-2026" className="outil-related-card">
                  <span className="eyebrow">Article complet</span>
                  <h3>Comment fixer ses tarifs de prof de yoga sans se brader (méthode 2026)</h3>
                  <span className="card-cta">Lire l&apos;article →</span>
                </Link>
                <Link href="/outils/calculateur-revenu-prof-yoga" className="outil-related-card">
                  <span className="eyebrow">Outil complémentaire</span>
                  <h3>Calculateur de revenu net pour prof de yoga</h3>
                  <span className="card-cta">Essayer le calculateur →</span>
                </Link>
                <Link href="/outils/comparateur-statuts-prof-yoga" className="outil-related-card">
                  <span className="eyebrow">Outil complémentaire</span>
                  <h3>Comparateur de statuts juridiques (micro / EI / SASU)</h3>
                  <span className="card-cta">Essayer le comparateur →</span>
                </Link>
              </div>
            </nav>

          </div>
        </main>
      </div>
    </>
  );
}
