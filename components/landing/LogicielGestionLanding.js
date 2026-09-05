'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Nav, Footer, FinalCta, Pricing } from './Sections';
import ComparatifsLies from './ComparatifsLies';
import StylesPageSeo from './StylesPageSeo';
import { FAQ_LOGICIEL } from '@/content/faq-logiciel';
import {
  CalendarDays, Users, CheckCircle2, CreditCard, Share2, Bell, Smartphone,
} from 'lucide-react';

/**
 * Page SEO catégorie-produit : « logiciel / appli de gestion pour prof de yoga ».
 * Angle distinct de /profs-de-yoga (persona) → cible les requêtes bottom-funnel
 * « gestionnaire du yoga avec son appli », « système de gestion pour yoga »,
 * « logiciel de gestion pour yoga » (cf. Search Console : fortes impressions,
 * 0 clic = à capter). Cadre réutilisé de la landing (Nav / Pricing / Footer).
 */
const FEATURES = [
  { Icon: CalendarDays, titre: 'Agenda & récurrences', desc: 'Cours uniques ou hebdo, exceptions, multi-lieux. Tout ton planning au même endroit.' },
  { Icon: Users, titre: 'Élèves & carnets', desc: 'Fiches complètes, carnets et abonnements, historique de présences et de paiements.' },
  { Icon: CheckCircle2, titre: 'Pointage en 1 clic', desc: 'Fais l\'appel depuis ton téléphone. Le carnet se décompte tout seul.' },
  { Icon: CreditCard, titre: 'Paiements & mini-compta', desc: 'Encaisse espèces, chèque, virement ou CB en ligne. Suivi des revenus + export comptable.' },
  { Icon: Share2, titre: 'Portail de réservation', desc: 'Une page publique où tes élèves réservent et paient seuls, sans que tu lèves le petit doigt.' },
  { Icon: Bell, titre: 'Rappels automatiques', desc: 'Rappels de séance, relances, liste d\'attente : l\'admin qui se fait tout seul.' },
];

export default function LogicielGestionLanding() {
  useEffect(() => {
    document.documentElement.dataset.palette = 'sable';
  }, []);

  return (
    <div className="lg-page">
      <Nav />

      <header className="lg-hero">
        <span className="lg-eyebrow"><Smartphone size={14} /> Appli de gestion tout-en-un</span>
        <h1 className="lg-h1">Le logiciel de gestion pensé pour les <em>profs de yoga</em>.</h1>
        <p className="lg-sub">
          Agenda, élèves, présences, paiements et portail de réservation :
          un seul outil, calme et beau, sur ton téléphone. Fini le tableur, les
          carnets papier et les relances à la main.
        </p>
        <div className="lg-cta-row">
          <Link href="/register" className="lg-btn lg-btn-primary">Essayer gratuitement 14 jours</Link>
          <Link href="/profs-de-yoga" className="lg-btn lg-btn-ghost">Voir pour les profs de yoga →</Link>
        </div>
        <p className="lg-cta-hint">Sans carte bancaire · dès 15 €/mois</p>
      </header>

      <section className="lg-features">
        <h2 className="lg-h2">Un système de gestion complet, rien d'autre à installer</h2>
        <div className="lg-grid">
          {FEATURES.map(({ Icon, titre, desc }) => (
            <div key={titre} className="lg-card">
              <div className="lg-card-icon"><Icon size={22} /></div>
              <h3 className="lg-card-titre">{titre}</h3>
              <p className="lg-card-desc">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lg-why">
        <h2 className="lg-h2">Pourquoi une appli plutôt qu'un tableur ?</h2>
        <p className="lg-why-text">
          Un tableur ne pointe pas les présences, ne relance pas tes élèves, ne
          décompte pas les carnets et ne laisse personne réserver en ligne. IziSolo
          fait tout ça pour toi, pensé pour une prof <strong>solo</strong>, pas pour
          un centre avec un secrétariat. Tu gardes le temps pour ce qui compte : tes cours.
        </p>
      </section>

      {/* Volet comptable — ajouté le 2026-08-30 après l'export Performances.
          « logiciel comptable centre de yoga » vaut 82 impressions à lui seul,
          en position 37, et « logiciel comptable pour centre de yoga » 6 de
          plus. On avait livré les factures (SIRET, numérotation séquentielle),
          le livre des recettes et la déclaration URSSAF, et cette page n'en
          disait qu'une demi-ligne dans une carte. */}
      <section className="lg-why">
        <h2 className="lg-h2">Et la comptabilité, dans tout ça ?</h2>
        <p className="lg-why-text">
          C&apos;est souvent ce qui décide, et c&apos;est rarement ce qu&apos;on montre.
          IziSolo émet de <strong>vraies factures</strong> avec ton numéro d&apos;entreprise,
          une numérotation séquentielle et tes mentions, celles qu&apos;un CSE ou un employeur
          accepte sans discuter. Il tient ton <strong>livre des recettes</strong>, le registre
          chronologique qu&apos;on te réclame en cas de contrôle. Et il calcule le montant à
          reporter sur ta <strong>déclaration URSSAF</strong>, à la date où l&apos;argent est
          réellement rentré et pas à celle de la vente, ce qui change de trimestre plus
          souvent qu&apos;on ne le croit. L&apos;export comptable se filtre par période, par
          mode de règlement et par offre, pour ton expert-comptable.
        </p>
        <p className="lg-cta-hint" style={{ marginTop: 16 }}>
          IziSolo n&apos;est pas un logiciel de caisse certifié. Cette obligation vise les
          entreprises assujetties à la TVA qui encaissent des particuliers : à vérifier avec
          ton comptable si tu n&apos;es pas en franchise en base.
        </p>
        <p style={{ marginTop: 18 }}>
          <Link href="/logiciel-comptabilite-prof-yoga" className="lg-btn lg-btn-ghost">
            Le détail de la partie compta →
          </Link>
        </p>
      </section>

      {/* ── Profondeur ajoutée le 2026-09-05 ───────────────────────────────
          Cette page ressortait en position 41,5 sur ses propres requêtes
          (« logiciel gestion yoga » 48, « logiciel de gestion studio de yoga »
          69,6) alors que ses métadonnées et son schema étaient déjà bons. Elle
          faisait 1 940 caractères de texte visible : il n'y avait rien à
          classer. Ce qui suit n'est pas du remplissage, c'est ce qu'une prof
          qui compare deux outils cherche réellement à savoir. */}
      <section className="lg-prose">
        <h2 className="lg-h2">Une semaine ordinaire, vue depuis l&apos;outil</h2>
        <p>
          La meilleure façon de juger un logiciel de gestion, ce n&apos;est pas sa liste de
          fonctions, c&apos;est ce qu&apos;il te demande de faire un jour normal.
        </p>

        <h3>Lundi, tu poses ta rentrée</h3>
        <p>
          Tu crées ton cours du mardi soir, tu choisis le jour et la fréquence, tu donnes
          une date de fin. IziSolo fabrique toutes les séances d&apos;un coup et saute les
          vacances scolaires de ta zone si tu le demandes. Si la série est trop courte ou
          trop longue trois semaines plus tard, tu la rallonges ou tu la raccourcis sans
          rien recréer, et les séances où quelqu&apos;un est déjà inscrit ne sont jamais
          supprimées en silence.
        </p>

        <h3>Mardi, tu fais l&apos;appel</h3>
        <p>
          Depuis ton téléphone, en trente secondes, avant ou après le cours. Chaque
          présence décompte la carte de l&apos;élève, et seulement si sa carte couvre ce
          type de cours. Une personne sans carnet apparaît en « à régler » plutôt que
          d&apos;être oubliée. Si tu te fais remplacer, tu peux envoyer un lien qui permet à
          quelqu&apos;un de pointer cette séance-là depuis son téléphone, sans compte et sans
          rien voir d&apos;autre de ton studio.
        </p>

        <h3>Mercredi, quelqu&apos;un annule</h3>
        <p>
          L&apos;élève annule depuis son espace. Selon la règle que tu as fixée, la séance lui
          est rendue ou décomptée, et la première personne en liste d&apos;attente est prévenue
          et prend la place. Tu n&apos;as rien fait.
        </p>

        <h3>Vendredi, tu regardes l&apos;argent</h3>
        <p>
          Tu vois ce qui est encaissé, ce qui reste à percevoir, et ce qui traîne depuis
          trop longtemps. Tu encaisses un chèque en un clic, tu envoies une facture à celle
          qui la réclame pour son comité d&apos;entreprise, et en fin de trimestre le montant
          à reporter sur ta déclaration est déjà calculé.
        </p>

        <h3>Ce qu&apos;IziSolo ne fait pas</h3>
        <div className="lg-note">
          <p>
            Il ne <strong>crée pas ton site web</strong>. Tu as une page publique à ton
            image avec ton planning et tes tarifs, et un bloc que tu peux coller sur ton
            site existant, mais ce n&apos;est pas un constructeur de site vitrine.
          </p>
          <p>
            Il ne fait ni <strong>vidéos à la demande</strong>, ni boutique en ligne, ni
            programme de fidélité. Ces choses existent ailleurs, souvent mieux faites.
          </p>
          <p>
            Il n&apos;est pas conçu pour un <strong>centre avec un secrétariat</strong> et
            plusieurs dizaines de créneaux quotidiens. Plusieurs profs dans un même studio,
            c&apos;est possible ; une salle de sport, non.
          </p>
        </div>
      </section>

      <section className="lg-faq">
        <h2 className="lg-h2">Questions fréquentes</h2>
        {FAQ_LOGICIEL.map(({ q, r }) => (
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
