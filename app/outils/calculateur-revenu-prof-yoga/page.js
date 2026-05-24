import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import Link from 'next/link';
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

export default async function CalculateurRevenuPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

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
              <Link href="/blog">Le journal</Link>
              <span>›</span>
              <span className="current">Calculateur de revenu</span>
            </nav>

            {/* Header */}
            <header className="outil-header">
              <span className="eyebrow">Outil gratuit · sans inscription</span>
              <h1 className="outil-h1 serif">
                Combien tu gagnes <em>vraiment</em>,
                <br />prof solo ?
              </h1>
              <p className="outil-lead">
                Saisis tes chiffres — on calcule ton revenu net réel après charges,
                et on te dit où tu te situes vs les fourchettes 2026 par profil.
              </p>
            </header>

            {/* Grid 2 colonnes : inputs + output */}
            <div className="outil-grid">

              {/* ─── INPUTS ────────────────────────────────────── */}
              <section className="outil-inputs">

                <h2 className="serif">
                  <span className="eyebrow">Étape 1</span>
                  Tes revenus
                </h2>

                {/* Tarif cours collectif */}
                <div className="input-block is-revenu">
                  <label htmlFor="tarif-cours">
                    Tarif moyen par cours collectif
                    <span className="input-value">15 €</span>
                  </label>
                  <input
                    id="tarif-cours"
                    type="range"
                    min="8"
                    max="30"
                    defaultValue="15"
                    className="input-range"
                  />
                  <div className="input-scale">
                    <span>8 €</span>
                    <span>30 €</span>
                  </div>
                </div>

                {/* Cours par semaine */}
                <div className="input-block is-revenu">
                  <label htmlFor="cours-sem">
                    Nombre de cours par semaine
                    <span className="input-value">10</span>
                  </label>
                  <input
                    id="cours-sem"
                    type="range"
                    min="0"
                    max="25"
                    defaultValue="10"
                    className="input-range"
                  />
                  <div className="input-scale">
                    <span>0</span>
                    <span>25</span>
                  </div>
                </div>

                {/* Élèves par cours */}
                <div className="input-block is-revenu">
                  <label htmlFor="eleves-cours">
                    Élèves en moyenne par cours
                    <span className="input-value">7</span>
                  </label>
                  <input
                    id="eleves-cours"
                    type="range"
                    min="1"
                    max="20"
                    defaultValue="7"
                    className="input-range"
                  />
                  <div className="input-scale">
                    <span>1</span>
                    <span>20</span>
                  </div>
                </div>

                {/* Sources complémentaires */}
                <div className="input-divider">
                  <span>Sources complémentaires</span>
                </div>

                <div className="input-toggle-block is-revenu active">
                  <label className="input-toggle">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-track"><span className="toggle-thumb"></span></span>
                    <span className="toggle-label">Cours particuliers (1-à-1)</span>
                  </label>
                  <div className="toggle-inputs">
                    <div className="input-row">
                      <span className="micro-label">Nb / semaine</span>
                      <span className="input-value-mini">3</span>
                    </div>
                    <div className="input-row">
                      <span className="micro-label">Tarif moyen</span>
                      <span className="input-value-mini">60 €</span>
                    </div>
                  </div>
                </div>

                <div className="input-toggle-block is-revenu active">
                  <label className="input-toggle">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-track"><span className="toggle-thumb"></span></span>
                    <span className="toggle-label">Cours en entreprise (CSE)</span>
                  </label>
                  <div className="toggle-inputs">
                    <div className="input-row">
                      <span className="micro-label">Nb / mois</span>
                      <span className="input-value-mini">2</span>
                    </div>
                    <div className="input-row">
                      <span className="micro-label">Tarif moyen</span>
                      <span className="input-value-mini">120 €</span>
                    </div>
                  </div>
                </div>

                <div className="input-toggle-block is-revenu">
                  <label className="input-toggle">
                    <input type="checkbox" />
                    <span className="toggle-track"><span className="toggle-thumb"></span></span>
                    <span className="toggle-label">Stages week-end</span>
                  </label>
                </div>

                <h2 className="serif">
                  <span className="eyebrow">Étape 2</span>
                  Tes coûts
                </h2>

                <div className="input-block">
                  <label>Statut juridique</label>
                  <div className="radio-group">
                    <label className="radio-pill active">
                      <input type="radio" name="statut" defaultChecked />
                      <span>Micro-entreprise</span>
                    </label>
                    <label className="radio-pill">
                      <input type="radio" name="statut" />
                      <span>EI au réel</span>
                    </label>
                  </div>
                </div>

                <div className="input-block is-cout">
                  <label htmlFor="loyer">
                    Loyer salle mensuel
                    <span className="input-value">350 €</span>
                  </label>
                  <input
                    id="loyer"
                    type="range"
                    min="0"
                    max="1000"
                    defaultValue="350"
                    step="50"
                    className="input-range"
                  />
                  <div className="input-scale">
                    <span>0 €</span>
                    <span>1 000 €</span>
                  </div>
                </div>

              </section>

              {/* ─── OUTPUT ────────────────────────────────────── */}
              <section className="outil-output">

                {/* Hero number */}
                <div className="output-hero">
                  <span className="eyebrow">Ton revenu net mensuel estimé</span>
                  <div className="output-big-number">
                    3 694 <span className="output-unit">€</span>
                  </div>
                  <div className="output-period">par mois</div>
                  <div className="output-zone zone-yellow">
                    <span className="zone-dot"></span>
                    Zone <em>« Expérimentée »</em>
                    <span className="zone-range">2 900 — 4 900 € net / mois</span>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="output-breakdown">
                  <div className="breakdown-row breakdown-positive">
                    <span>Cours collectifs</span>
                    <span className="amount">+ 4 515 €</span>
                  </div>
                  <div className="breakdown-row breakdown-positive">
                    <span>Cours particuliers</span>
                    <span className="amount">+ 720 €</span>
                  </div>
                  <div className="breakdown-row breakdown-positive">
                    <span>Cours entreprise</span>
                    <span className="amount">+ 240 €</span>
                  </div>
                  <div className="breakdown-row breakdown-subtotal">
                    <span>Chiffre d'affaires brut</span>
                    <span className="amount">5 475 €</span>
                  </div>
                  <div className="breakdown-row">
                    <span>URSSAF (21,2 %)</span>
                    <span className="amount amount-negative">− 1 161 €</span>
                  </div>
                  <div className="breakdown-row">
                    <span>IR (versement libératoire 2,2 %)</span>
                    <span className="amount amount-negative">− 120 €</span>
                  </div>
                  <div className="breakdown-row">
                    <span>Loyer salle</span>
                    <span className="amount amount-negative">− 350 €</span>
                  </div>
                  <div className="breakdown-row">
                    <span>Autres charges (assurance, outils...)</span>
                    <span className="amount amount-negative">− 150 €</span>
                  </div>
                  <div className="breakdown-row breakdown-total">
                    <span>Revenu net réel</span>
                    <span className="amount">3 694 €</span>
                  </div>
                </div>

                {/* Camembert répartition */}
                <div className="output-chart">
                  <div className="chart-header">
                    <span className="eyebrow">Répartition de tes revenus</span>
                  </div>
                  <div className="chart-pie-wrapper">
                    <div
                      className="chart-pie"
                      style={{
                        background: 'conic-gradient(var(--calc-positive) 0% 82.5%, var(--calc-amber) 82.5% 95.7%, var(--calc-blush) 95.7% 100%)',
                      }}
                      aria-hidden="true"
                    />
                    <ul className="chart-legend">
                      <li>
                        <span className="legend-dot dot-deep"></span>
                        <span className="legend-label">Collectif</span>
                        <span className="legend-pct">82,5 %</span>
                      </li>
                      <li>
                        <span className="legend-dot dot-mid"></span>
                        <span className="legend-label">Particuliers</span>
                        <span className="legend-pct">13,2 %</span>
                      </li>
                      <li>
                        <span className="legend-dot dot-light"></span>
                        <span className="legend-label">Entreprise</span>
                        <span className="legend-pct">4,4 %</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Insight pédagogique */}
                <div className="output-insight">
                  <span className="insight-icon">💡</span>
                  <div>
                    <strong>Pour augmenter ton revenu net sans donner plus de cours :</strong>
                    <p>
                      Augmenter ton taux de remplissage de 7 → 10 élèves par cours,
                      sans changer ton planning, te ferait gagner <strong>+1 290 € net/mois</strong>.
                    </p>
                  </div>
                </div>

              </section>
            </div>

            {/* CTA discret IziSolo */}
            <section className="outil-cta">
              <div className="outil-cta-inner">
                <span className="eyebrow">Outil dans l'app</span>
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
                  14 jours d'essai gratuit · sans CB · annulation 1 clic
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
                  <span className="card-cta">Lire l'article →</span>
                </Link>
                <Link href="/blog/comment-fixer-tarifs-prof-yoga-2026" className="outil-related-card">
                  <span className="eyebrow">Tarification</span>
                  <h3>Comment fixer ses tarifs de prof de yoga sans se brader</h3>
                  <span className="card-cta">Lire l'article →</span>
                </Link>
                <Link href="/blog/statut-juridique-prof-yoga-france" className="outil-related-card">
                  <span className="eyebrow">Juridique</span>
                  <h3>Quel statut juridique pour prof de yoga en France ?</h3>
                  <span className="card-cta">Lire l'article →</span>
                </Link>
              </div>
            </nav>

          </div>
        </main>
      </div>
    </>
  );
}
