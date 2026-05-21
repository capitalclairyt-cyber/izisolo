'use client';

/**
 * LocalLanding — Template réutilisable pour les pages locales SEO
 * (ex: /prof-yoga-paris, /prof-yoga-lyon, /prof-pilates-paris).
 *
 * Pourquoi : capter le long tail "prof de yoga [ville]" + "logiciel
 * gestion studio [ville]". Chaque ville = 1 page unique, contenu
 * différencié (statistiques locales, points de pratique connus, témoignages)
 * pour éviter le duplicate content que Google sanctionne.
 *
 * Props :
 *   city : { name, region, slug, codePostal, profDescription, lieuxConnus, stats, citation }
 *   discipline : 'yoga' | 'pilates' | 'danse' (default 'yoga')
 */

import Link from 'next/link';

const DISCIPLINE_LABEL = {
  yoga: 'yoga',
  pilates: 'Pilates',
  danse: 'danse',
};

const DISCIPLINE_LABEL_CAPITAL = {
  yoga: 'Yoga',
  pilates: 'Pilates',
  danse: 'Danse',
};

export default function LocalLanding({ city, discipline = 'yoga' }) {
  const d = DISCIPLINE_LABEL[discipline] || 'yoga';
  const D = DISCIPLINE_LABEL_CAPITAL[discipline] || 'Yoga';

  // Si l'objet city contient un sous-objet pour la discipline (ex: city.pilates),
  // on l'utilise pour surcharger profDescription/lieuxConnus/stats/citation.
  // Sinon fallback sur les valeurs racine (= yoga par défaut). Garantit la
  // rétrocompatibilité des 11 pages /prof-yoga-{ville} existantes.
  const data = (discipline !== 'yoga' && city[discipline])
    ? { ...city, ...city[discipline] }
    : city;

  return (
    <div className="izi-landing-root" data-palette="sable">
      <main className="local-page">
        <div className="container">

          {/* Breadcrumb */}
          <nav className="local-breadcrumb" aria-label="Fil d'Ariane">
            <Link href="/">Accueil</Link>
            <span>›</span>
            <Link href={`/profs-de-${discipline === 'pilates' ? 'pilates' : 'yoga'}`}>
              Profs de {d}
            </Link>
            <span>›</span>
            <span className="current">{city.name}</span>
          </nav>

          {/* Hero */}
          <header className="local-hero">
            <span className="eyebrow">{city.name.toUpperCase()} · {city.region}</span>
            <h1 className="local-h1 serif">
              Logiciel pour profs de {d} <em>à {city.name}</em>.
            </h1>
            <p className="local-lead">
              IziSolo est l'outil de gestion pensé pour les profs de {d} indépendant·e·s.
              Agenda, élèves, paiements, portail public, communication — tout-en-un.
              Utilisé par des profs solo dans toute la France, y compris à {city.name} et {city.region}.
            </p>
            <div className="local-ctas">
              <Link href="/register" className="btn btn-primary btn-lg">
                Essai gratuit 14 jours →
              </Link>
              <Link href="/calculateur" className="btn btn-ghost btn-lg">
                Calculer mon coût
              </Link>
            </div>
            <p className="local-sub">
              Sans carte bancaire · Annulation 1 clic · Setup offert pour les 100 premières
            </p>
          </header>

          {/* Contexte local */}
          <section className="local-context">
            <div className="local-context-grid">
              <div className="local-context-text">
                <span className="eyebrow">Le contexte {d} à {city.name}</span>
                <h2 className="serif">
                  Une scène <em>{d}</em> en pleine effervescence.
                </h2>
                <p>{data.profDescription}</p>
                {data.stats && (
                  <ul className="local-stats">
                    {data.stats.map((s, i) => (
                      <li key={i}>
                        <strong>{s.value}</strong>
                        <span>{s.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {data.citation && (
                <aside className="local-citation">
                  <blockquote>
                    <p>{data.citation.text}</p>
                    <footer>— {data.citation.author}</footer>
                  </blockquote>
                </aside>
              )}
            </div>
          </section>

          {/* Lieux de pratique connus */}
          {data.lieuxConnus && data.lieuxConnus.length > 0 && (
            <section className="local-lieux">
              <span className="eyebrow">Quelques lieux de pratique connus à {city.name}</span>
              <h2 className="serif">Tu pratiques peut-être déjà à...</h2>
              <p className="local-lieux-intro">
                IziSolo n'est affilié à aucun de ces lieux. C'est un outil pour les profs
                indépendant·e·s qui louent leur salle ou ont leur studio propre, peu importe l'endroit.
              </p>
              <ul className="local-lieux-list">
                {data.lieuxConnus.map((lieu, i) => (
                  <li key={i}>{lieu}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Pourquoi IziSolo pour les profs à [ville] */}
          <section className="local-why">
            <span className="eyebrow">Pour les profs {d} de {city.name}</span>
            <h2 className="serif">Pourquoi {city.name === 'Paris' ? 'les profs parisien·ne·s' : `les profs à ${city.name}`} aiment IziSolo.</h2>
            <div className="local-why-grid">
              <div className="local-why-card">
                <div className="local-why-icon">🌿</div>
                <h3>Pensé pour les profs solo</h3>
                <p>
                  Pas un CRM d'entreprise reconverti. Une app calme conçue pour les
                  indépendant·e·s qui jonglent 12-15 cours par semaine et veulent
                  récupérer leur dimanche soir.
                </p>
              </div>
              <div className="local-why-card">
                <div className="local-why-icon">💳</div>
                <h3>Paiement en ligne intégré</h3>
                <p>
                  Stripe Payment Link inclus. Tes élèves payent en CB depuis ton portail,
                  les fonds arrivent direct sur ton compte. {city.name === 'Paris' && "Pratique quand tes élèves enchaînent les RER et veulent pré-payer pendant le trajet."}
                </p>
              </div>
              <div className="local-why-card">
                <div className="local-why-icon">📅</div>
                <h3>Agenda multi-lieux</h3>
                <p>
                  Tu enseignes dans 2-3 salles différentes ? Studio + paroisse + visio ?
                  Tout est sur le même planning, avec capacité dédiée par lieu.
                </p>
              </div>
              <div className="local-why-card">
                <div className="local-why-icon">💬</div>
                <h3>Messagerie & annonces</h3>
                <p>
                  Annoncer une annulation, un nouveau créneau, un stage — à tous tes
                  élèves d'un cours précis ou à tous les détenteurs d'un carnet, en 2 clics.
                </p>
              </div>
              <div className="local-why-card">
                <div className="local-why-icon">🌐</div>
                <h3>Portail public</h3>
                <p>
                  Page publique à ton image, où tes élèves voient ton planning,
                  réservent, payent — sans créer de compte. PWA installable comme une app.
                </p>
              </div>
              <div className="local-why-card">
                <div className="local-why-icon">📊</div>
                <h3>Mini-compta intégrée</h3>
                <p>
                  Export comptable CSV en 2 clics pour ton expert-comptable.
                  Plus jamais à reconstruire ton chiffre d'affaires à la main.
                </p>
              </div>
            </div>
          </section>

          {/* CTA finale */}
          <section className="local-cta">
            <div className="local-cta-inner">
              <span className="eyebrow">Prêt·e ?</span>
              <h2 className="serif">
                Démarre ton studio {d} à {city.name} <em>en 15 minutes</em>.
              </h2>
              <p>
                14 jours d'essai gratuit sans CB. 12 €/mois à vie pour les 100 premières
                inscrites (Founding 100), au lieu de 17 €/mois. Setup offert.
              </p>
              <Link href="/register" className="btn btn-primary btn-lg">
                Créer mon studio →
              </Link>
              <p className="local-cta-sub">
                Annulation en 1 clic à tout moment. Export complet de tes données quand tu veux.
              </p>
            </div>
          </section>

          {/* Liens internes maillage */}
          <nav className="local-related" aria-label="Articles connexes">
            <h2 className="serif">À lire aussi</h2>
            <div className="local-related-grid">
              <Link href="/blog/combien-gagne-prof-yoga-france-2026" className="local-related-card">
                <span className="eyebrow">Revenus</span>
                <h3>Combien gagne un·e prof de yoga indépendant·e en France ?</h3>
              </Link>
              <Link href="/blog/excel-vs-logiciel-gestion-eleves-prof-yoga" className="local-related-card">
                <span className="eyebrow">Organisation</span>
                <h3>Excel vs logiciel pour gérer ses élèves — le comparatif honnête</h3>
              </Link>
              <Link href="/blog/statut-juridique-prof-yoga-france" className="local-related-card">
                <span className="eyebrow">Juridique</span>
                <h3>Quel statut juridique pour prof de yoga en France ?</h3>
              </Link>
            </div>
          </nav>

        </div>
      </main>

      <style jsx global>{`
        .local-page {
          padding-top: var(--sp-8);
          padding-bottom: var(--sp-16);
          background: var(--c-bg);
          min-height: 100vh;
        }

        .local-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: color-mix(in oklch, var(--c-ink) 55%, transparent);
          margin-bottom: var(--sp-8);
          flex-wrap: wrap;
        }
        .local-breadcrumb a {
          color: inherit;
          text-decoration: none;
        }
        .local-breadcrumb a:hover { color: var(--c-accent-deep); }
        .local-breadcrumb .current {
          color: var(--c-ink);
          font-weight: 600;
        }

        /* Hero */
        .local-hero {
          text-align: center;
          margin-bottom: var(--sp-14);
          max-width: 760px;
          margin-left: auto;
          margin-right: auto;
        }
        .local-h1 {
          font-size: clamp(2.5rem, 6vw, 4.5rem);
          letter-spacing: -0.02em;
          line-height: 1.02;
          margin: var(--sp-4) 0 var(--sp-5);
          color: var(--c-ink);
        }
        .local-h1 em {
          font-style: italic;
          color: var(--c-accent-deep);
        }
        .local-lead {
          font-size: 1.125rem;
          line-height: 1.65;
          color: var(--c-ink-soft);
          max-width: 60ch;
          margin: 0 auto var(--sp-6);
        }
        .local-ctas {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: var(--sp-3);
        }
        .local-sub {
          font-size: 0.8125rem;
          color: color-mix(in oklch, var(--c-ink) 55%, transparent);
          font-family: var(--font-mono);
          letter-spacing: 0.05em;
          margin: 0;
        }

        /* Contexte local */
        .local-context {
          margin-bottom: var(--sp-14);
        }
        .local-context-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: var(--sp-10);
          align-items: center;
        }
        @media (max-width: 768px) {
          .local-context-grid {
            grid-template-columns: 1fr;
            gap: var(--sp-8);
          }
        }
        .local-context-text h2 {
          font-size: clamp(1.875rem, 4vw, 2.75rem);
          letter-spacing: -0.015em;
          line-height: 1.1;
          margin: var(--sp-3) 0 var(--sp-5);
          color: var(--c-ink);
        }
        .local-context-text h2 em {
          font-style: italic;
          color: var(--c-accent-deep);
        }
        .local-context-text p {
          font-size: 1.0625rem;
          line-height: 1.65;
          color: var(--c-ink-soft);
        }
        .local-stats {
          list-style: none;
          padding: 0;
          margin: var(--sp-6) 0 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: var(--sp-4);
        }
        .local-stats li {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .local-stats strong {
          font-family: 'Instrument Serif', Georgia, serif;
          font-size: clamp(1.75rem, 4vw, 2.5rem);
          color: var(--c-accent-deep);
          line-height: 1;
        }
        .local-stats span {
          font-size: 0.8125rem;
          color: var(--c-ink-soft);
        }
        .local-citation blockquote {
          margin: 0;
          padding: var(--sp-6) var(--sp-7);
          background: linear-gradient(135deg, #fefaf5, #fef0dc);
          border-left: 3px solid var(--c-accent);
          border-radius: 16px;
          font-family: 'Instrument Serif', Georgia, serif;
          font-style: italic;
          font-size: 1.25rem;
          line-height: 1.45;
          color: var(--c-ink);
        }
        .local-citation footer {
          font-family: var(--font-geist);
          font-style: normal;
          font-size: 0.875rem;
          margin-top: var(--sp-3);
          color: var(--c-ink-soft);
        }

        /* Lieux connus */
        .local-lieux {
          margin-bottom: var(--sp-14);
          padding: var(--sp-10);
          background: white;
          border-radius: 24px;
          border: 1px solid color-mix(in oklch, var(--c-ink) 8%, transparent);
        }
        .local-lieux h2 {
          font-size: clamp(1.5rem, 3vw, 2rem);
          letter-spacing: -0.015em;
          margin: var(--sp-3) 0 var(--sp-3);
          color: var(--c-ink);
        }
        .local-lieux-intro {
          font-size: 0.9375rem;
          color: var(--c-ink-soft);
          margin: 0 0 var(--sp-5);
          font-style: italic;
        }
        .local-lieux-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .local-lieux-list li {
          background: color-mix(in oklch, var(--c-accent) 8%, transparent);
          color: var(--c-accent-deep);
          padding: 6px 14px;
          border-radius: 99px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        /* Pourquoi */
        .local-why {
          margin-bottom: var(--sp-14);
          text-align: center;
        }
        .local-why h2 {
          font-size: clamp(1.875rem, 4vw, 2.75rem);
          letter-spacing: -0.015em;
          margin: var(--sp-3) 0 var(--sp-8);
          color: var(--c-ink);
        }
        .local-why-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: var(--sp-5);
          text-align: left;
        }
        .local-why-card {
          background: white;
          border-radius: 20px;
          padding: var(--sp-7);
          border: 1px solid color-mix(in oklch, var(--c-ink) 8%, transparent);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .local-why-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 36px rgba(0,0,0,0.06);
        }
        .local-why-icon {
          font-size: 2rem;
          margin-bottom: var(--sp-3);
        }
        .local-why-card h3 {
          font-size: 1.125rem;
          font-weight: 700;
          margin: 0 0 var(--sp-2);
          color: var(--c-ink);
        }
        .local-why-card p {
          font-size: 0.9375rem;
          line-height: 1.55;
          color: var(--c-ink-soft);
          margin: 0;
        }

        /* CTA finale */
        .local-cta {
          margin-bottom: var(--sp-14);
        }
        .local-cta-inner {
          background: linear-gradient(135deg, #fefaf5 0%, #fef0dc 100%);
          border: 1.5px solid color-mix(in oklch, var(--c-accent) 30%, transparent);
          border-radius: 24px;
          padding: var(--sp-12) var(--sp-10);
          text-align: center;
        }
        .local-cta-inner h2 {
          font-size: clamp(1.75rem, 4vw, 2.75rem);
          letter-spacing: -0.015em;
          line-height: 1.1;
          margin: var(--sp-3) 0 var(--sp-4);
          color: var(--c-ink);
        }
        .local-cta-inner h2 em {
          font-style: italic;
          color: var(--c-accent-deep);
        }
        .local-cta-inner p {
          max-width: 50ch;
          margin: 0 auto var(--sp-5);
          font-size: 1.0625rem;
          line-height: 1.55;
          color: var(--c-ink-soft);
        }
        .local-cta-sub {
          font-size: 0.8125rem !important;
          color: color-mix(in oklch, var(--c-ink) 55%, transparent) !important;
          margin-top: var(--sp-4) !important;
          margin-bottom: 0 !important;
        }

        /* Articles connexes */
        .local-related h2 {
          font-size: clamp(1.5rem, 3vw, 2rem);
          letter-spacing: -0.015em;
          text-align: center;
          margin: 0 0 var(--sp-6);
          color: var(--c-ink);
        }
        .local-related-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: var(--sp-4);
        }
        .local-related-card {
          background: white;
          border-radius: 16px;
          padding: var(--sp-5);
          border: 1px solid color-mix(in oklch, var(--c-ink) 8%, transparent);
          text-decoration: none;
          color: inherit;
          transition: transform 0.2s ease, border-color 0.2s ease;
          display: block;
        }
        .local-related-card:hover {
          transform: translateY(-2px);
          border-color: color-mix(in oklch, var(--c-accent) 40%, transparent);
        }
        .local-related-card h3 {
          font-size: 1rem;
          margin: var(--sp-2) 0 0;
          color: var(--c-ink);
          font-weight: 600;
          line-height: 1.35;
        }
      `}</style>
    </div>
  );
}
