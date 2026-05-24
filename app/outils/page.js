import Link from 'next/link';
import Image from 'next/image';
import { getBreadcrumbSchema, ogImageUrl, BASE_URL } from '@/lib/seo';
import '../landing.css';
import './outils.css';

const OG = ogImageUrl({
  eyebrow: 'Outils gratuits',
  title: 'Tes outils gratuits pour prof solo bien-être',
  subtitle: 'Calculateur, comparateur, grille tarifaire, checklist de lancement.',
  palette: 'sable',
});

export const metadata = {
  title: 'Outils gratuits pour prof de yoga, pilates, bien-être indépendant·e | IziSolo',
  description: "4 outils gratuits pour profs solo bien-être : calculateur de revenu net, comparateur de statuts juridiques (micro/EI/SASU), grille tarifaire personnalisable et imprimable, checklist de lancement. Sans inscription, sans email demandé.",
  alternates: { canonical: `${BASE_URL}/outils` },
  openGraph: {
    title: 'Outils gratuits pour prof solo bien-être — IziSolo',
    description: '4 outils interactifs pour structurer ton activité solo : revenus, statut juridique, tarifs, lancement.',
    url: `${BASE_URL}/outils`,
    type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: 'Outils gratuits pour prof solo bien-être' }],
  },
  twitter: { card: 'summary_large_image', images: [OG] },
};

const OUTILS = [
  {
    slug: 'calculateur-revenu-prof-yoga',
    eyebrow: 'Simulateur de revenus',
    title: 'Calculateur de revenu net',
    description:
      "Combien tu gagnes vraiment ? Entre ton tarif, le nombre de cours, ton statut. L'outil calcule en direct ton CA, tes charges (URSSAF, IR, IziSolo), ton revenu net mensuel et te place dans une zone (débutante, confirmée, studio).",
    photo: '/outils/hero-calculateur.jpg',
    color: 'sage',
    cta: 'Calculer mon revenu',
    timeNeeded: '3 min',
  },
  {
    slug: 'comparateur-statuts-prof-yoga',
    eyebrow: 'Aide à la décision',
    title: 'Comparateur de statuts juridiques',
    description:
      "Micro-entreprise, EI au réel ou SASU — lequel pour toi ? L'outil calcule ton revenu net annuel dans chaque statut selon ton CA, tes charges et ton objectif (simplicité, optimisation, protection, image). Avec recommandation finale.",
    photo: '/outils/hero-statuts.jpg',
    color: 'sky',
    cta: 'Comparer les 3 statuts',
    timeNeeded: '4 min',
  },
  {
    slug: 'grille-tarifaire-prof-yoga',
    eyebrow: 'Personnalisable · imprimable',
    title: 'Grille tarifaire belle et claire',
    description:
      "Ta grille tarifaire éditable en direct. Ajoute tes prix, choisis ta palette (sable, sauge, blush, ciel), supprime ou ajoute des lignes et sections. Imprime sur 1 page A4 pour ton studio, ton site, ou ton porte-clé bureau.",
    photo: '/outils/hero-grille.jpg',
    color: 'blush',
    cta: 'Créer ma grille',
    timeNeeded: '5 min',
  },
  {
    slug: 'checklist-lancement-prof-yoga',
    eyebrow: '~30 étapes interactives',
    title: 'Checklist de lancement prof solo',
    description:
      "Du statut juridique aux premiers élèves : 7 phases (admin, légal, marque, tarifs, lieu, élèves, gestion). Coche au fur et à mesure, ajoute tes notes perso, imprime quand c'est prêt. Tu peux revenir quand tu veux, tout est sauvegardé.",
    photo: '/outils/hero-checklist.jpg',
    color: 'amber',
    cta: 'Ouvrir ma checklist',
    timeNeeded: '~1 h cumulé',
  },
];

const FAQ = [
  {
    q: 'Ces outils sont vraiment gratuits ?',
    r: "Oui. Pas de compte à créer, pas d'email demandé, pas de tunnel de vente. Tu peux les utiliser autant de fois que tu veux, les imprimer, les partager. On les met à disposition parce qu'on développe IziSolo (notre app de gestion pour profs solo) et qu'on aime construire des choses utiles à la communauté.",
  },
  {
    q: 'Mes données sont-elles envoyées quelque part ?',
    r: "Non. Tout est stocké dans le localStorage de ton navigateur. Tes prix, tes notes, tes coches restent sur ta machine. Ferme l'onglet, reviens dans 3 mois — tout est encore là. Mais si tu changes de navigateur ou tu vides ton cache, c'est perdu (donc imprime ce qui est important).",
  },
  {
    q: 'Je peux les utiliser sur mobile ?',
    r: "Oui, tout est responsive. Mais pour l'impression PDF, on recommande de finaliser ta grille tarifaire ou ta checklist sur ordinateur — c'est plus confortable et la mise en page A4 est garantie.",
  },
  {
    q: "Si je m'inscris à IziSolo, je récupère mes données ?",
    r: "Pas automatiquement. Les outils tournent côté navigateur, IziSolo c'est ton espace cloud sécurisé. Mais si tu as fixé tes tarifs avec le calculateur et la grille, tu pourras les recopier dans ton compte IziSolo en 5 minutes (et après, l'app les applique automatiquement à chaque inscription, paiement et reçu PDF).",
  },
];

export default function OutilsIndexPage() {
  const breadcrumb = getBreadcrumbSchema([
    { name: 'Accueil', url: '/' },
    { name: 'Outils', url: '/outils' },
  ]);

  // Schema.org ItemList pour le SEO
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Outils gratuits pour prof solo bien-être',
    description: '4 outils interactifs pour structurer ton activité solo : revenus, statut juridique, tarifs, lancement.',
    numberOfItems: OUTILS.length,
    itemListElement: OUTILS.map((o, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE_URL}/outils/${o.slug}`,
      name: o.title,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      <div className="izi-landing-root" data-palette="sable">
        <main className="outils-index-page">
          <div className="container">

            <nav className="outil-breadcrumb" aria-label="Fil d'Ariane">
              <Link href="/">Accueil</Link>
              <span>›</span>
              <span className="current">Outils</span>
            </nav>

            {/* Hero */}
            <header className="outils-hero">
              <span className="eyebrow">Outils gratuits · sans inscription</span>
              <h1 className="serif">
                Tes outils pour
                <br /><em>construire ton activité solo.</em>
              </h1>
              <p className="outils-lead">
                4 outils interactifs pour structurer ce qui pèse quand on se
                lance : <strong>combien tu gagnes vraiment</strong>, <strong>quel
                statut</strong> choisir, <strong>quels tarifs</strong> afficher,
                et <strong>par où commencer</strong>. Tout est gratuit, sans
                compte, sauvegardé dans ton navigateur.
              </p>
              <div className="outils-meta">
                <span className="meta-pill">✓ Sans inscription</span>
                <span className="meta-pill">✓ Sans email demandé</span>
                <span className="meta-pill">✓ Sauvegarde auto</span>
                <span className="meta-pill">✓ Imprimables A4</span>
              </div>
            </header>

            {/* Grille des 4 outils */}
            <section className="outils-grid" aria-label="Liste des outils">
              {OUTILS.map((outil) => (
                <Link
                  key={outil.slug}
                  href={`/outils/${outil.slug}`}
                  className="outil-card"
                  data-color={outil.color}
                >
                  <div className="outil-card-photo">
                    <Image
                      src={outil.photo}
                      alt={outil.title}
                      width={600}
                      height={400}
                      sizes="(max-width: 720px) 100vw, 50vw"
                      style={{ objectFit: 'cover', objectPosition: 'center 40%' }}
                    />
                    <span className="outil-card-time">⏱ {outil.timeNeeded}</span>
                  </div>
                  <div className="outil-card-body">
                    <span className="outil-card-eyebrow">{outil.eyebrow}</span>
                    <h2 className="serif">{outil.title}</h2>
                    <p>{outil.description}</p>
                    <span className="outil-card-cta">{outil.cta} →</span>
                  </div>
                </Link>
              ))}
            </section>

            {/* Pourquoi gratuit */}
            <section className="outils-pourquoi">
              <div className="outils-pourquoi-inner">
                <span className="eyebrow">Pourquoi on offre ces outils</span>
                <h2 className="serif">
                  Parce qu&apos;on construit IziSolo
                  <br /><em>pour les vraies questions de prof solo.</em>
                </h2>
                <p>
                  Quand on a démarré IziSolo, on a passé des semaines à discuter
                  avec des profs de yoga, pilates, danse, méditation, des coachs,
                  des thérapeutes. Les mêmes questions revenaient sans arrêt :
                  <em>« Combien je gagne vraiment après les charges ? »</em>,
                  <em>« Quel statut, micro ou SASU ? »</em>, <em>« Comment poser
                  mes tarifs sans me brader ? »</em>, <em>« Par où je commence
                  pour me lancer ? »</em>
                </p>
                <p>
                  Au lieu de te demander ton mail en échange de PDF, on a
                  construit <strong>les vrais outils interactifs</strong> qui
                  répondent à ces questions. Gratuits, sans tunnel. Si après
                  ça tu veux pousser plus loin et automatiser ton agenda, tes
                  paiements et tes relances élèves —{' '}
                  <Link href="/" className="inline-link">on a IziSolo pour ça</Link>.
                  Mais utilise les outils, même si tu ne nous prends jamais.
                </p>
              </div>
            </section>

            {/* FAQ */}
            <section className="outils-faq" aria-label="Questions fréquentes">
              <h2 className="serif">Questions fréquentes</h2>
              <div className="faq-list">
                {FAQ.map((item, i) => (
                  <details key={i} className="faq-item">
                    <summary>{item.q}</summary>
                    <p>{item.r}</p>
                  </details>
                ))}
              </div>
            </section>

            {/* CTA IziSolo */}
            <section className="outils-cta">
              <div className="outils-cta-inner">
                <span className="eyebrow">Quand tes outils sont remplis</span>
                <h2 className="serif">
                  Pose ton activité dans IziSolo,
                  <br /><em>en 5 minutes.</em>
                </h2>
                <p>
                  Carnets, abonnements, cours unitaires, packs particuliers,
                  encaissement en ligne, no-show, mailing groupé, sondages
                  planning — l&apos;app reprend ta grille tarifaire et l&apos;applique
                  automatiquement à chaque inscription, paiement et reçu.
                </p>
                <Link href="/" className="btn btn-primary btn-lg">
                  Découvrir IziSolo →
                </Link>
                <p className="outils-cta-sub">
                  14 jours d&apos;essai gratuit · sans CB · annulation 1 clic
                </p>
              </div>
            </section>

          </div>
        </main>
      </div>

      {/* FAQ Schema.org */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ.map((item) => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: { '@type': 'Answer', text: item.r },
            })),
          }),
        }}
      />
    </>
  );
}
