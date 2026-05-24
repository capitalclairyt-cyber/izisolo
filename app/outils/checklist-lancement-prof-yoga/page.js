import Link from 'next/link';
import Image from 'next/image';
import Checklist from './Checklist';
import { getBreadcrumbSchema, ogImageUrl, BASE_URL } from '@/lib/seo';
import '../../landing.css';
import './outil.css';

const OG = ogImageUrl({
  eyebrow: 'Outil gratuit',
  title: 'Ta checklist de lancement prof solo',
  subtitle: '~30 étapes — statut, légal, marque, tarifs, premiers élèves. Sauvegarde auto.',
  palette: 'sable',
});

export const metadata = {
  title: 'Checklist de lancement pour prof de yoga indépendant·e (gratuit, sauvegarde auto)',
  description: "Tu te lances comme prof de yoga, pilates ou coach indépendant·e ? Suis cette checklist interactive : statut juridique, assurance, identité, premiers élèves. Coche au fur et à mesure, ajoute tes notes, imprime quand c'est prêt.",
  alternates: { canonical: `${BASE_URL}/outils/checklist-lancement-prof-yoga` },
  openGraph: {
    title: 'Checklist de lancement prof yoga indépendant·e — IziSolo',
    description: '~30 étapes interactives pour structurer ton lancement d\'activité solo bien-être.',
    url: `${BASE_URL}/outils/checklist-lancement-prof-yoga`,
    type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: 'Checklist de lancement prof yoga' }],
  },
  twitter: { card: 'summary_large_image', images: [OG] },
};

export default function ChecklistLancementPage() {
  const breadcrumb = getBreadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: 'Outils', url: '/outils' },
    { name: 'Checklist de lancement', url: '/outils/checklist-lancement-prof-yoga' },
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
              <Link href="/outils">Outils</Link>
              <span>›</span>
              <span className="current">Checklist de lancement</span>
            </nav>

            <div className="outil-hero-photo">
              <Image
                src="/outils/hero-checklist.jpg"
                alt="Prof de yoga seule face à l'horizon, symbole d'un nouveau départ professionnel"
                width={1200}
                height={800}
                priority
                sizes="(max-width: 1000px) 100vw, 1200px"
                style={{ objectFit: 'cover', objectPosition: 'center 35%' }}
              />
              <div className="outil-hero-overlay">
                <span className="eyebrow">Outil gratuit · sauvegarde auto</span>
                <h1 className="outil-h1 serif">
                  Ta checklist de lancement,
                  <br /><em>du statut aux premiers élèves.</em>
                </h1>
                <p className="outil-lead">
                  ~30 étapes interactives pour structurer ton lancement de prof
                  solo bien-être. Coche au fur et à mesure, ajoute tes notes,
                  imprime quand c&apos;est prêt. Tu peux revenir quand tu veux.
                </p>
              </div>
            </div>

            <Checklist />

            {/* CTA discret IziSolo */}
            <section className="outil-cta">
              <div className="outil-cta-inner">
                <span className="eyebrow">Quand tu en seras à "Outils & gestion"</span>
                <h3 className="serif">
                  IziSolo coche pour toi :
                  <br /><em>agenda, paiements, élèves, no-show, mailing.</em>
                </h3>
                <p>
                  Tout ce que tu as listé dans la dernière phase (réservation,
                  routine compta, sauvegardes, process mensuel) — l&apos;app
                  l&apos;intègre par défaut. Tu te concentres sur tes cours.
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
                <Link href="/blog/statut-juridique-prof-yoga-france" className="outil-related-card">
                  <span className="eyebrow">Article complet</span>
                  <h3>Quel statut juridique pour un·e prof de yoga indépendant·e ?</h3>
                  <span className="card-cta">Lire l&apos;article →</span>
                </Link>
                <Link href="/outils/comparateur-statuts-prof-yoga" className="outil-related-card">
                  <span className="eyebrow">Outil complémentaire</span>
                  <h3>Comparateur de statuts (micro / EI / SASU)</h3>
                  <span className="card-cta">Essayer le comparateur →</span>
                </Link>
                <Link href="/outils/calculateur-revenu-prof-yoga" className="outil-related-card">
                  <span className="eyebrow">Outil complémentaire</span>
                  <h3>Calculateur de revenu net pour prof de yoga</h3>
                  <span className="card-cta">Essayer le calculateur →</span>
                </Link>
              </div>
            </nav>

          </div>
        </main>
      </div>
    </>
  );
}
