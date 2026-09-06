'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Nav, Footer, FinalCta, Pricing } from './Sections';
import ComparatifsLies from './ComparatifsLies';
import StylesPageSeo from './StylesPageSeo';
import { FAQ_COMPTA } from '@/content/faq-logiciel';
import { BookOpen, FileText, Landmark, Download, CalendarClock } from 'lucide-react';

/**
 * Page SEO catégorie-produit : « logiciel comptable / comptabilité pour prof de yoga ».
 *
 * Pourquoi elle existe (export Search Console du 2026-09-05, 3 mois) :
 * « logiciel comptable centre de yoga » vaut 86 impressions à lui seul, sa
 * variante « logiciel comptable POUR centre de yoga » 6 de plus, et nous
 * sortons en position 41 et 46. C'est la seule requête du corpus où le produit
 * a de l'avance sur le contenu : depuis v84 (factures), v93 (assiette en
 * trésorerie + déclaration URSSAF), v94 (archive) et v95 (hors compta), on sait
 * réellement faire ce qui est cherché, et une demi-section sur une autre page
 * ne pouvait pas le porter.
 *
 * Angle assumé : on commence par dire ce qu'on N'EST PAS. Se présenter comme un
 * logiciel de comptabilité serait faux, et une prof qui découvrirait la nuance
 * après avoir payé serait fondée à le mal prendre.
 */
const OBLIGATIONS = [
  {
    Icon: BookOpen,
    titre: 'Le livre des recettes',
    desc: "Le registre chronologique obligatoire en micro-entreprise, celui qu'on réclame en contrôle. Généré à la demande, en PDF paginé ou en CSV, avec les totaux par mois.",
  },
  {
    Icon: FileText,
    titre: 'Des factures qui passent',
    desc: "Numérotation séquentielle par année, ton numéro d'entreprise, tes mentions, et un document figé à l'émission. Celui qu'un comité d'entreprise accepte sans discuter.",
  },
  {
    Icon: Landmark,
    titre: 'Ta déclaration URSSAF',
    desc: "Le montant arrondi à l'euro comme le formulaire l'attend, l'échéance calculée, le détail par mois, et l'archive de ce que tu as déjà déclaré.",
  },
  {
    Icon: CalendarClock,
    titre: "Compté à la date d'encaissement",
    desc: "La micro déclare en trésorerie. Un chèque déposé en octobre pour une vente de septembre appartient au trimestre où il est encaissé, et c'est ainsi qu'il est compté.",
  },
  {
    Icon: Download,
    titre: 'Un export pour ton comptable',
    desc: "CSV filtrable par période, état, mode de règlement et offre, avec ligne de total, colonne par mois et récapitulatif. Inclus dès le plan à 15 €.",
  },
];

export default function ComptabiliteLanding() {
  useEffect(() => {
    document.documentElement.dataset.palette = 'sable';
  }, []);

  return (
    <div className="lg-page">
      <Nav />

      <header className="lg-hero">
        <span className="lg-eyebrow"><Landmark size={14} /> Compta &amp; déclaration</span>
        <h1 className="lg-h1">
          La compta d&apos;une <em>prof indépendante</em>, tenue par l&apos;outil qui encaisse.
        </h1>
        <p className="lg-sub">
          Livre des recettes, factures numérotées et montant à déclarer : les trois
          choses que la micro-entreprise réclame vraiment, tenues à jour toutes seules
          par les encaissements que tu saisis déjà.
        </p>
        <div className="lg-cta-row">
          <Link href="/register" className="lg-btn lg-btn-primary">Essayer gratuitement 30 jours</Link>
          <Link href="/logiciel-gestion-prof-yoga" className="lg-btn lg-btn-ghost">Voir tout l&apos;outil →</Link>
        </div>
        <p className="lg-cta-hint">Sans carte bancaire · toute la partie compta est dans le plan à 15 €/mois</p>
      </header>

      {/* On dit d'abord ce qu'on n'est pas. Une prof qui découvre la nuance
          APRÈS avoir payé est une prof qu'on a perdue, et à raison. */}
      <section className="lg-prose">
        <div className="lg-note">
          <p>
            <strong>Disons-le tout de suite : IziSolo n&apos;est pas un logiciel de comptabilité.</strong>
          </p>
          <p>
            Un logiciel de comptabilité tient un plan comptable, des écritures en partie
            double, et produit un bilan. C&apos;est l&apos;outil de ton expert-comptable si tu es
            à l&apos;impôt sur le revenu au réel ou en société.
          </p>
          <p>
            IziSolo tient ce que la <strong>micro-entreprise</strong> réclame réellement : le
            registre de tes recettes, tes factures, et le montant à reporter sur ta
            déclaration. Si tu es en micro, c&apos;est exactement tout ce que la loi te
            demande, et ça t&apos;évite d&apos;acheter un outil conçu pour un autre métier.
          </p>
        </div>
      </section>

      <section className="lg-features">
        <h2 className="lg-h2">Ce qui se remplit tout seul pendant que tu enseignes</h2>
        <div className="lg-grid">
          {OBLIGATIONS.map(({ Icon, titre, desc }) => (
            <div key={titre} className="lg-card">
              <div className="lg-card-icon"><Icon size={22} /></div>
              <h3 className="lg-card-titre">{titre}</h3>
              <p className="lg-card-desc">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lg-prose">
        <h2 className="lg-h2">Le détail qui fait tomber les déclarations dans le mauvais trimestre</h2>
        <p>
          C&apos;est l&apos;erreur la plus banale de la micro-entreprise, et elle est presque
          invisible : <strong>on déclare en trésorerie</strong>, c&apos;est-à-dire à la date où
          l&apos;argent est réellement rentré, pas à la date de la vente.
        </p>
        <p>
          Un exemple qui arrive tous les trimestres. Une élève achète un carnet le
          28 septembre et te tend un chèque. Tu le déposes le 3 octobre. Cette recette
          appartient au <strong>quatrième</strong> trimestre, pas au troisième. La plupart des
          outils datent la ligne au jour de la vente, et le montant que tu recopies dans
          le formulaire est faux des deux côtés : trop haut sur un trimestre, trop bas sur
          le suivant.
        </p>
        <p>
          IziSolo distingue les deux dates depuis le début et compte sur celle de
          l&apos;encaissement. Tu peux basculer sur la date de vente si ton comptable te le
          demande, mais le défaut est celui que l&apos;administration attend.
        </p>

        <h3>Ce que tu vois au moment de déclarer</h3>
        <ul>
          <li>Le <strong>montant arrondi à l&apos;euro</strong>, comme le formulaire l&apos;attend, avec un bouton pour le copier.</li>
          <li>L&apos;<strong>échéance calculée</strong> : le dernier jour du mois qui suit la fin de ta période.</li>
          <li>Le <strong>détail mois par mois</strong> et par mode de règlement, pour retrouver une ligne en cas de doute.</li>
          <li>Une <strong>estimation de tes cotisations</strong>, si tu as renseigné ton taux et ton régime.</li>
          <li>Un <strong>rappel par email</strong> à chaque période close, si tu l&apos;actives. Sinon, rien : c&apos;est un choix, pas un défaut.</li>
        </ul>

        <h3>Et une fois que c&apos;est déclaré</h3>
        <p>
          Tu peux marquer la période comme déclarée. Le montant et le détail sont alors
          <strong> figés</strong>, et si un encaissement est ajouté ou corrigé plus tard sur cette
          période, IziSolo t&apos;affiche l&apos;écart et te suggère la régularisation. Sans cette
          photo, retrouver une ancienne déclaration rendrait un chiffre recalculé, donc
          pas celui que tu as réellement déclaré.
        </p>

        <h3>Ce qu&apos;IziSolo ne fait pas</h3>
        <div className="lg-note">
          <p>
            Il ne <strong>télétransmet rien</strong> à ta place. Il calcule et prépare le montant,
            tu le reportes toi-même sur le site de l&apos;URSSAF. Nous préférons un chiffre
            juste que tu recopies en trente secondes à une automatisation qui déclarerait
            à ta place sans que tu aies rien vérifié.
          </p>
          <p>
            Il ne remplace pas un <strong>expert-comptable</strong> si tu es au réel ou en société,
            et il ne gère pas tes <strong>dépenses</strong> : la micro-entreprise se déclare sur
            les recettes, c&apos;est donc les recettes qu&apos;il tient.
          </p>
          <p>
            Il n&apos;est pas un <strong>logiciel de caisse certifié</strong>. Cette obligation vise
            les entreprises assujetties à la TVA qui encaissent des particuliers. À vérifier
            avec ton comptable si tu n&apos;es pas en franchise en base.
          </p>
        </div>
      </section>

      <section className="lg-faq">
        <h2 className="lg-h2">Questions fréquentes</h2>
        {FAQ_COMPTA.map(({ q, r }) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{r}</p>
          </details>
        ))}
      </section>

      <ComparatifsLies />
      <Pricing />
      <FinalCta />
      <Footer />

      <StylesPageSeo />
    </div>
  );
}
