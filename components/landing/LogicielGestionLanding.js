'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Nav, Footer, FinalCta, Pricing } from './Sections';
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
  { Icon: Bell, titre: 'Rappels automatiques', desc: 'Rappels de séance, relances, liste d\'attente — l\'admin qui se fait tout seul.' },
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
          Agenda, élèves, présences, paiements et portail de réservation —
          un seul outil, calme et beau, sur ton téléphone. Fini le tableur, les
          carnets papier et les relances à la main.
        </p>
        <div className="lg-cta-row">
          <Link href="/register" className="lg-btn lg-btn-primary">Essayer gratuitement 14 jours</Link>
          <Link href="/profs-de-yoga" className="lg-btn lg-btn-ghost">Voir pour les profs de yoga →</Link>
        </div>
        <p className="lg-cta-hint">Sans carte bancaire · dès 17 €/mois (12 € pour les 100 premières)</p>
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
          fait tout ça pour toi — pensé pour une prof <strong>solo</strong>, pas pour
          un centre avec un secrétariat. Tu gardes le temps pour ce qui compte : tes cours.
        </p>
      </section>

      <Pricing />
      <FinalCta />
      <Footer />

      <style jsx>{`
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
      `}</style>
    </div>
  );
}
