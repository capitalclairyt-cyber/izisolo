'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Nav, Footer } from './Sections';
import ScrollReveal from './ScrollReveal';
import { PLANS } from '@/lib/constantes';

// ═══════════════════════════════════════════════════════════════════════════
// Les vitrines « Associations » et « Studios » (lot 5 Associations & Studios,
// 2026-09-13, PLAN-ASSOS-STUDIOS-2026.md §6.9). Une page par famille, la même
// écriture que « Changer d'outil » : un alignement, un souligné, aucun chiffre
// qui ne vienne du produit ou de la grille. Elles ne promettent QUE ce que
// les lots 1 à 4 ont livré, et disent ce que le plan ne fait pas (vote en
// ligne, signature électronique, comptabilité en partie double).
// ═══════════════════════════════════════════════════════════════════════════

const COMMUN = [
  { titre: 'Chaque prof a son compte, avec ses droits', texte: 'Tu invites tes intervenantes par email ; chacune voit ce que tu décides (ses cours, le pointage, les élèves, l’argent ou pas). Une intervenante sans compte reçoit un lien permanent pour pointer ses séances depuis son téléphone.' },
  { titre: 'Qui donne quelle séance', texte: 'Chaque cours et chaque série portent leur intervenante. Le planning public le dit (« avec Léa »), les élèves filtrent par prof, et l’onglet « L’équipe » présente tout le monde.' },
  { titre: 'Le relevé de chaque intervenante, sans tableur', texte: 'Ce que tu as convenu avec elle (par séance, à l’heure, en pourcentage, au forfait) et ses séances pointées font son relevé du mois, en PDF. Tu le valides, elle facture depuis son IziSolo, tu règles, tout se retrouve dans ta compta.' },
  { titre: 'Les dépenses, l’exercice, l’export', texte: 'Tes dépenses avec leurs justificatifs, et un export d’exercice pour la trésorière ou le comptable : recettes encaissées, dépenses, résultat.' },
];

const VARIANTES = {
  association: {
    eyebrow: 'Pour une association',
    titre: <>La vie de l’asso,<br /><span className="accent">sans AssoConnect.</span></>,
    lead: 'Le bureau, les adhésions, les documents et l’assemblée générale, à côté des cours, des adhérentes et de l’argent des cours. Rien de plus : IziSolo reste l’outil du quotidien, pas un logiciel de fédération.',
    ctaPrincipal: { href: '/register?structure=association', label: 'Ouvrir l’espace de mon association' },
    prix: `${PLANS.asso.prix} € par mois, ou ${PLANS.asso.prixAnnuel} € à l’année`,
    reserve: 'Réservé aux associations déclarées : le numéro RNA (W + neuf chiffres) est demandé à l’inscription.',
    propre: [
      { titre: 'Le bureau', texte: 'Présidente, trésorière, secrétaire, membre du bureau : une fonction propose des droits à l’invitation, tu ajustes case par case. La trésorière voit l’argent, la secrétaire les adhérentes et les documents.' },
      { titre: 'L’adhésion', texte: 'Une offre « Adhésion » par tarif (plein, réduit, famille), enregistrée depuis la fiche de chaque personne pour la saison, payée ou à régler. Le reçu de cotisation se télécharge. Une adhésion ne donne droit à aucune séance : les cours passent par les carnets. Si tes statuts l’exigent, une adhésion à jour peut être demandée pour réserver.' },
      { titre: 'Les documents', texte: 'Statuts, récépissé de préfecture, règlement intérieur, assurance, agrément, PV : déposés en PDF ou en photo, la dernière version fait foi, l’historique reste. Jamais publics.' },
      { titre: 'L’assemblée générale', texte: 'Date, lieu, ordre du jour ; la convocation part par la messagerie aux adhérentes à jour ; la feuille d’émargement s’imprime ; après l’AG, présentes et pouvoirs donnent le quorum, et le PV se dépose à côté.' },
    ],
    honnete: {
      titre: 'Ce que le plan Association ne fait pas',
      texte: 'Pas de vote électronique (il se fait en séance), pas de signature électronique (un document signé se dépose scanné), pas de comptabilité en partie double (l’export d’exercice sert ta trésorière et ton comptable). Et pas de déclaration URSSAF : ce sont tes intervenantes qui déclarent ce que tu leur règles.',
    },
    faq: [
      { q: 'On est une asso avec deux profs. Elles ont besoin de payer quelque chose ?', a: 'Non. L’espace de l’association porte l’abonnement ; tes profs y sont invitées gratuitement. Si une prof veut aussi son propre IziSolo pour ses cours à elle, il est gratuit (Essentiel), et ses relevés chez vous y arrivent tout seuls.' },
      { q: 'Nos adhérentes doivent créer un compte ?', a: 'Non. Elles reçoivent un lien vers leur espace, sans mot de passe, et y retrouvent leur adhésion, leurs carnets et leurs séances.' },
      { q: 'Qui installe tout ça ?', a: 'Maude, gratuitement, en visio : elle crée l’espace, importe la liste des adhérentes, pose les séries de cours et invite les profs. Tu arrives sur un espace qui tourne.' },
      { q: 'Et si on arrête l’abonnement ?', a: 'L’espace repasse sur Essentiel, gratuit : rien n’est effacé, les profs passent en lecture seule, et tout revient dès que vous reprenez.' },
    ],
  },
  studio: {
    eyebrow: 'Pour un studio',
    titre: <>Plusieurs profs, plusieurs salles,<br /><span className="accent">une seule caisse.</span></>,
    lead: 'Tout Complet, des intervenantes avec leurs droits, les salles qui ne se chevauchent pas, la marge de chaque séance et le résultat par salle, par intervenante et par type de cours.',
    ctaPrincipal: { href: '/register?structure=studio', label: 'Ouvrir l’espace de mon studio' },
    prix: `${PLANS.studio.prix} € par mois, ou ${PLANS.studio.prixAnnuel} € à l’année`,
    reserve: 'Sans engagement, 30 jours d’essai sans carte : l’essai est celui du plan Studio.',
    propre: [
      { titre: 'Les salles', texte: 'Un lieu, plusieurs salles avec leur capacité. Chaque séance porte sa salle, et deux séances ne peuvent pas occuper la même salle en même temps : l’écran refuse en nommant celle qui gêne, et la base le garantit.' },
      { titre: 'La marge et l’analyse', texte: 'Recettes, dépenses et résultat par mois, par salle, par intervenante, par type de cours, la TVA déductible par taux, et la marge de chaque séance : son chiffre d’affaires moins le coût de l’intervenante et les dépenses rattachées. Tout est recalculé, rien n’est inventé.' },
      { titre: 'Les contrats et les relevés', texte: 'Le contrat de chaque intervenante se dépose sur sa ligne d’équipe. Son relevé de séances peut partir tout seul le 1er du mois, en PDF ; tu le valides, elle facture, tu règles.' },
      { titre: 'Une page publique à votre nom', texte: 'Le planning avec la prof de chaque séance, l’onglet « L’équipe », les tarifs, la réservation et le paiement en ligne sur votre propre compte Stripe, comme pour une prof seule.' },
    ],
    honnete: {
      titre: 'Ce que le plan Studio ne fait pas',
      texte: 'Pas de caisse enregistreuse ni de vente de produits, pas de comptabilité en partie double (l’analyse et l’export servent ton comptable), pas de paie : les intervenantes restent indépendantes et facturent leurs prestations.',
    },
    faq: [
      { q: 'Combien d’intervenantes peut-on avoir ?', a: 'Autant que vous voulez : le prix est un forfait, jamais par siège. Chacune est invitée par email avec ses droits, ou reçoit un lien permanent si elle n’a pas de compte.' },
      { q: 'Une intervenante donne aussi des cours ailleurs ?', a: 'Elle a son propre IziSolo gratuit si elle le souhaite : ses séances chez vous apparaissent dans son tableau de bord, ses relevés y arrivent, et elle peut relier sa page et la vôtre.' },
      { q: 'Qui installe tout ça ?', a: 'Maude, gratuitement, en visio : elle crée l’espace, importe les élèves, pose les salles et les séries, invite les profs. Tu arrives sur un espace qui tourne.' },
      { q: 'Et si on arrête l’abonnement ?', a: 'L’espace repasse sur Essentiel, gratuit : rien n’est effacé, les profs passent en lecture seule, et tout revient dès que vous reprenez.' },
    ],
  },
};

export default function Structures({ variante = 'association' }) {
  const v = VARIANTES[variante] || VARIANTES.association;
  useEffect(() => { document.documentElement.dataset.palette = 'sable'; }, []);

  return (
    <div className="izi-landing-root" data-palette="sable">
      <ScrollReveal />
      <Nav />
      <main>
        <section className="hero-v3 cdo-hero" data-testid={`vitrine-${variante}`}>
          <div className="container hero-v3-grid">
            <div className="hero-v3-copy">
              <span className="eyebrow">{v.eyebrow}</span>
              <h1 className="serif">{v.titre}</h1>
              <p className="hero-v3-lead">{v.lead}</p>
              <div className="hero-v2-ctas hero-v3-ctas">
                <Link href="/creer-mon-studio?src=structures" className="btn btn-primary btn-lg">On monte notre espace avec Maude</Link>
                <Link href={v.ctaPrincipal.href} className="btn btn-ghost btn-lg">{v.ctaPrincipal.label}</Link>
              </div>
              <p className="hero-concierge"><strong>{v.prix}</strong>, deux mois offerts à l’année. {v.reserve}</p>
            </div>
            <div className="hero-v3-visuel st-visuel" aria-hidden="true">
              <div className="st-carte">
                <span className="st-carte-titre">{variante === 'association' ? 'Association' : 'Studio'}</span>
                <ul className="st-carte-liste">
                  {(variante === 'association'
                    ? ['Tout Complet', 'Profs illimitées, avec leurs droits', 'Bureau, adhésions, documents, AG', 'Relevés, dépenses, export de saison']
                    : ['Tout Complet', 'Profs illimitées, avec leurs droits', 'Salles sans chevauchement', 'Marge, analyse, contrats, relevés']
                  ).map(l => <li key={l}>{l}</li>)}
                </ul>
                <span className="st-carte-prix">{v.prix}</span>
              </div>
            </div>
          </div>
        </section>

        <section id="propre" className="cdo-section">
          <div className="container">
            <div className="head reveal">
              <span className="eyebrow">{variante === 'association' ? 'Ce qu’une association a en plus' : 'Ce qu’un studio a en plus'}</span>
              <h2 className="serif">Quatre choses, bornées.</h2>
            </div>
            <div className="cdo-grid st-grid">
              {v.propre.map(p => (
                <article key={p.titre} className="cdo-card reveal">
                  <h3>{p.titre}</h3>
                  <p>{p.texte}</p>
                </article>
              ))}
            </div>
            <aside className="cdo-honnete reveal">
              <h3>{v.honnete.titre}</h3>
              <p>{v.honnete.texte}</p>
            </aside>
          </div>
        </section>

        <section className="cdo-section cdo-section-alt">
          <div className="container">
            <div className="head reveal">
              <span className="eyebrow">Ce que les deux plans partagent</span>
              <h2 className="serif">Les intervenantes, et leur argent.</h2>
            </div>
            <div className="cdo-grid st-grid">
              {COMMUN.map(p => (
                <article key={p.titre} className="cdo-card reveal">
                  <h3>{p.titre}</h3>
                  <p>{p.texte}</p>
                </article>
              ))}
            </div>
            <div className="cdo-cta reveal">
              <Link href="/creer-mon-studio?src=structures" className="btn btn-primary btn-lg">On monte notre espace avec Maude</Link>
              <p className="hero-concierge">Gratuit, en visio. {variante === 'association' ? <Link href="/studios">Plutôt un studio ?</Link> : <Link href="/associations">Plutôt une association ?</Link>}</p>
            </div>
          </div>
        </section>

        <section className="cdo-section">
          <div className="container cdo-faq">
            <div className="head reveal">
              <span className="eyebrow">Questions</span>
              <h2 className="serif">Avant d’ouvrir l’espace</h2>
            </div>
            {v.faq.map(f => (
              <details key={f.q} className="cdo-q reveal">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <Footer />

      <style jsx global>{`
        .cdo-hero { padding-bottom: 40px; }
        .cdo-section { padding: 64px 0; }
        .cdo-section-alt { background: var(--c-bg-warm, #fdfbf7); }
        .cdo-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; margin-top: 28px; }
        .st-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .cdo-card { background: var(--c-bg-warm, #fdfbf7); border: 1px solid var(--c-accent-tint, #e8dccb); border-radius: 20px; padding: 24px; }
        .cdo-card h3, .cdo-honnete h3 { font-family: var(--font-display), serif; font-weight: 400; font-size: 1.3rem; margin: 0 0 10px; color: var(--c-ink); }
        .cdo-card p, .cdo-honnete p { color: var(--c-ink-soft); line-height: 1.6; margin: 0; }
        .cdo-honnete { margin-top: 20px; border-radius: 20px; padding: 24px 28px; background: var(--c-bg-sage, #eef1ea); border-left: 4px solid var(--c-sage, #6f8f5e); }
        .cdo-cta { margin-top: 36px; display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }
        .cdo-faq .head, .cdo-q { max-width: 760px; }
        .cdo-q { border-bottom: 1px solid var(--c-line, #e8dccb); padding: 14px 0; }
        .cdo-q summary { cursor: pointer; font-weight: 600; color: var(--c-ink); font-size: 1.05rem; }
        .cdo-q p { margin: 10px 0 0; color: var(--c-ink-soft); line-height: 1.6; }
        .st-visuel { display: flex; align-items: center; justify-content: center; }
        .st-carte { width: min(340px, 100%); background: var(--c-ink, #2a2320); color: #fff; border-radius: 24px; padding: 28px; box-shadow: 0 24px 60px rgba(0,0,0,.18); }
        .st-carte-titre { display: block; font-family: var(--font-display), serif; font-size: 1.6rem; margin-bottom: 14px; }
        .st-carte-liste { list-style: none; margin: 0 0 18px; padding: 0; display: grid; gap: 8px; }
        .st-carte-liste li { padding-left: 22px; position: relative; opacity: .92; }
        .st-carte-liste li::before { content: '✓'; position: absolute; left: 0; color: var(--c-accent, #c58a4a); }
        .st-carte-prix { display: block; font-weight: 700; font-size: 1.05rem; }
        @media (max-width: 900px) {
          .cdo-grid, .st-grid { grid-template-columns: 1fr; }
          .cdo-section { padding: 44px 0; }
        }
      `}</style>
    </div>
  );
}
