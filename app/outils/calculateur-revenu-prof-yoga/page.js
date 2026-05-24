import Link from 'next/link';
import Image from 'next/image';
import Calculateur from './Calculateur';
import { getBreadcrumbSchema, ogImageUrl, BASE_URL } from '@/lib/seo';
import '../../landing.css';
import './outil.css';

const OG = ogImageUrl({
  eyebrow: 'Calculateur gratuit',
  title: 'Combien tu gagnes vraiment, prof solo ?',
  subtitle: 'Saisis tes chiffres, on calcule ton revenu net réel + ta zone vs les fourchettes 2026.',
  palette: 'sable',
});

export const metadata = {
  title: 'Calculateur de revenu net pour prof de yoga indépendant·e (gratuit)',
  description: "Calculateur gratuit du revenu net réel d'un·e prof de yoga, pilates ou coach indépendant·e en France. Saisis tarif, nombre de cours, charges — obtiens ton net mensuel et ta position vs les fourchettes 2026.",
  alternates: { canonical: `${BASE_URL}/outils/calculateur-revenu-prof-yoga` },
  openGraph: {
    title: 'Calculateur de revenu net prof yoga — IziSolo',
    description: 'Saisis tarif + cours + charges → ton revenu net réel + ta zone vs les fourchettes 2026.',
    url: `${BASE_URL}/outils/calculateur-revenu-prof-yoga`,
    type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: 'Calculateur revenu net prof yoga' }],
  },
  twitter: { card: 'summary_large_image', images: [OG] },
};

export default function CalculateurRevenuPage() {
  const breadcrumb = getBreadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: 'Outils', url: '/outils' },
    { name: 'Calculateur de revenu net', url: '/outils/calculateur-revenu-prof-yoga' },
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

            {/* Breadcrumb */}
            <nav className="outil-breadcrumb" aria-label="Fil d'Ariane">
              <Link href="/">Accueil</Link>
              <span>›</span>
              <Link href="/outils">Outils</Link>
              <span>›</span>
              <span className="current">Calculateur de revenu</span>
            </nav>

            {/* Hero photo en bandeau (full-width container) */}
            <div className="outil-hero-photo">
              <Image
                src="/outils/hero-calculateur.jpg"
                alt="Prof de pilates en posture dans un studio moderne et lumineux avec luminaires en papier de riz"
                width={1200}
                height={800}
                priority
                sizes="(max-width: 1000px) 100vw, 1200px"
                style={{ objectFit: 'cover', objectPosition: 'center 35%' }}
              />
              <div className="outil-hero-overlay">
                <span className="eyebrow">Outil gratuit · sans inscription</span>
                <h1 className="outil-h1 serif">
                  Combien tu gagnes
                  <br /><em>vraiment</em>, prof solo&nbsp;?
                </h1>
                <p className="outil-lead">
                  Saisis tes chiffres — on calcule ton revenu net réel après charges,
                  et on te dit où tu te situes vs les fourchettes 2026 par profil.
                </p>
              </div>
            </div>

            {/* Calculateur interactif (client component) */}
            <Calculateur />

            {/* CTA discret IziSolo */}
            <section className="outil-cta">
              <div className="outil-cta-inner">
                <span className="eyebrow">Outil dans l&apos;app</span>
                <h3 className="serif">
                  Ce calculateur, ton agenda, tes paiements,
                  <br />tes carnets — <em>tout au même endroit.</em>
                </h3>
                <p>
                  IziSolo intègre ce calculateur en temps réel sur tes vraies données.
                  Plus besoin de te demander où tu en es chaque mois.
                </p>
                <Link href="/" className="btn btn-primary btn-lg">
                  Découvrir IziSolo →
                </Link>
                <p className="outil-cta-sub">
                  14 jours d&apos;essai gratuit · sans CB · annulation 1 clic
                </p>
              </div>
            </section>

            {/* Pour aller plus loin */}
            <nav className="outil-related" aria-label="Articles connexes">
              <h2 className="serif">Pour aller plus loin</h2>
              <div className="outil-related-grid">
                <Link href="/blog/combien-gagne-prof-yoga-france-2026" className="outil-related-card">
                  <span className="eyebrow">Revenus</span>
                  <h3>Combien gagne un·e prof de yoga indépendant·e en France en 2026 ?</h3>
                  <span className="card-cta">Lire l&apos;article →</span>
                </Link>
                <Link href="/blog/comment-fixer-tarifs-prof-yoga-2026" className="outil-related-card">
                  <span className="eyebrow">Tarification</span>
                  <h3>Comment fixer ses tarifs de prof de yoga sans se brader</h3>
                  <span className="card-cta">Lire l&apos;article →</span>
                </Link>
                <Link href="/blog/statut-juridique-prof-yoga-france" className="outil-related-card">
                  <span className="eyebrow">Juridique</span>
                  <h3>Quel statut juridique pour prof de yoga en France ?</h3>
                  <span className="card-cta">Lire l&apos;article →</span>
                </Link>
                <Link href="/outils/checklist-lancement-prof-yoga" className="outil-related-card">
                  <span className="eyebrow">Outil complémentaire</span>
                  <h3>Checklist de lancement prof solo (~30 étapes interactives)</h3>
                  <span className="card-cta">Ouvrir ma checklist →</span>
                </Link>
              </div>
            </nav>

          </div>
        </main>
      </div>
    </>
  );
}
