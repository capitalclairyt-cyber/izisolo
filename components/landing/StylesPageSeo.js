'use client';

/**
 * StylesPageSeo — l'habillage commun des pages SEO catégorie-produit
 * (/logiciel-gestion-prof-yoga, /logiciel-comptabilite-prof-yoga).
 *
 * Extrait de LogicielGestionLanding le 2026-09-05, quand la deuxième page de la
 * famille est née : deux copies de la même feuille auraient divergé, comme les
 * deux cartes de séance du portail avant v99.
 *
 * ⚠️ Le bloc est `global` EXPRÈS, et ce n'est pas un détail : styled-jsx scopé
 * ne hashe QUE les éléments DOM natifs, jamais les composants. Une règle
 * `.lg-btn` scopée visant un `<Link className="lg-btn">` ne matche rien, et les
 * CTA de ces pages s'affichaient en liens bleus navigateur (sweep 2026-08-19).
 */
export default function StylesPageSeo() {
  return (
    <style jsx global>{`
      .lg-page { background: var(--c-bg, #fdfbf7); color: var(--c-ink, #2a2320); }
      .lg-hero {
        max-width: 820px; margin: 0 auto; padding: 72px 20px 40px; text-align: center;
      }
      .lg-eyebrow {
        display: inline-flex; align-items: center; gap: 6px;
        font-family: var(--font-mono), monospace; font-size: 0.78rem; letter-spacing: 0.04em;
        text-transform: uppercase; color: var(--c-accent-deep, #9c5a2c);
        background: var(--c-bg-sable, #f4ece0); padding: 5px 12px; border-radius: 99px;
      }
      .lg-h1 {
        font-family: var(--font-fraunces), Georgia, serif; font-weight: 500;
        font-size: clamp(2.1rem, 5vw, 3.4rem); line-height: 1.08; margin: 18px 0 0;
        letter-spacing: -0.02em;
      }
      .lg-h1 em { font-style: italic; color: var(--c-accent-deep, #9c5a2c); }
      .lg-sub { font-size: 1.06rem; line-height: 1.6; color: var(--c-ink-soft, #5c5148); margin: 18px auto 0; max-width: 620px; }
      .lg-cta-row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 26px; }
      .lg-btn { display: inline-flex; align-items: center; padding: 12px 22px; border-radius: 12px; font-weight: 600; text-decoration: none; font-size: 0.95rem; }
      .lg-btn-primary { background: var(--c-accent-deep, #9c5a2c); color: #fff; }
      .lg-btn-ghost { background: transparent; color: var(--c-ink, #2a2320); border: 1px solid var(--c-ink-soft, #cdbfae); }
      .lg-cta-hint { font-size: 0.8rem; color: var(--c-ink-soft, #7a6f64); margin-top: 12px; }

      .lg-features, .lg-why { max-width: 1000px; margin: 0 auto; padding: 32px 20px; }
      .lg-h2 {
        font-family: var(--font-fraunces), Georgia, serif; font-weight: 500;
        font-size: clamp(1.5rem, 3.5vw, 2.1rem); text-align: center; margin: 0 0 28px;
        letter-spacing: -0.01em;
      }
      .lg-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
      .lg-card { background: #fff; border: 1px solid var(--c-bg-sable, #ece3d5); border-radius: 16px; padding: 20px; }
      .lg-card-icon {
        width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
        background: var(--c-bg-sable, #f4ece0); color: var(--c-accent-deep, #9c5a2c); margin-bottom: 12px;
      }
      .lg-card-titre { font-size: 1.05rem; font-weight: 700; margin: 0 0 6px; }
      .lg-card-desc { font-size: 0.9rem; line-height: 1.5; color: var(--c-ink-soft, #5c5148); margin: 0; }

      .lg-why { max-width: 680px; text-align: center; }
      .lg-why-text { font-size: 1.02rem; line-height: 1.7; color: var(--c-ink-soft, #5c5148); }

      /* ── Ajouts du 2026-09-05 : de quoi porter du texte long ──────────────
         Les pages de cette famille tenaient en 1 900 caractères visibles et
         plafonnaient en position 41 sur leurs propres requêtes. Il leur
         manquait des blocs capables d'accueillir de la vraie matière. */
      .lg-prose { max-width: 720px; margin: 0 auto; padding: 32px 20px; }
      .lg-prose h2 { text-align: left; }
      .lg-prose p, .lg-prose li { font-size: 1.02rem; line-height: 1.7; color: var(--c-ink-soft, #5c5148); }
      .lg-prose h3 {
        font-family: var(--font-fraunces), Georgia, serif; font-weight: 500;
        font-size: 1.25rem; margin: 30px 0 8px; color: var(--c-ink, #2a2320);
      }
      .lg-prose ul { padding-left: 20px; margin: 12px 0; }
      .lg-prose li { margin-bottom: 8px; }
      .lg-prose strong { color: var(--c-ink, #2a2320); }

      /* Encart d'avertissement honnête (ce que l'outil ne fait PAS). */
      .lg-note {
        background: var(--c-bg-sable, #f7f1e7);
        border-left: 3px solid var(--c-accent, #b87333);
        border-radius: 12px; padding: 18px 22px; margin: 26px 0;
      }
      .lg-note p { margin: 0 0 10px; font-size: 0.95rem; line-height: 1.65; }
      .lg-note p:last-child { margin-bottom: 0; }

      /* FAQ dépliable. <details>/<summary> natif : zéro JS, et le contenu est
         dans le DOM au chargement, donc lisible par Google et par un lecteur
         d'écran même replié. */
      .lg-faq { max-width: 720px; margin: 0 auto; padding: 32px 20px 8px; }
      .lg-faq details {
        border-bottom: 1px solid var(--c-bg-sable, #ece3d5);
        padding: 14px 0;
      }
      .lg-faq summary {
        cursor: pointer; font-weight: 600; font-size: 1rem;
        color: var(--c-ink, #2a2320); list-style: none;
        display: flex; justify-content: space-between; align-items: center; gap: 16px;
      }
      .lg-faq summary::-webkit-details-marker { display: none; }
      .lg-faq summary::after {
        content: '+'; color: var(--c-accent-deep, #9c5a2c);
        font-size: 1.3rem; line-height: 1; flex: none; transition: transform 0.2s;
      }
      .lg-faq details[open] summary::after { transform: rotate(45deg); }
      .lg-faq details p {
        font-size: 0.97rem; line-height: 1.7;
        color: var(--c-ink-soft, #5c5148); margin: 12px 0 4px;
      }
    `}</style>
  );
}
