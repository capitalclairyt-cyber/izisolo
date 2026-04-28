'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { IziSoloLogo, YogaLotusIllu, YogaTreeIllu, SunCurveIllu, WaveOrnament } from './Brand';
import AppMockup from './AppMockup';

/* ---- NAV ----------------------------------------------------- */
export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header className={`nav ${scrolled ? 'nav-scrolled' : ''}`}>
      <div className="container nav-inner">
        <Link href="/" className="nav-brand"><IziSoloLogo size={26} /></Link>
        <nav className="nav-links">
          <a href="#fonctionnalites">Fonctionnalités</a>
          <a href="#pour-qui">Pour qui</a>
          <a href="#tarifs">Tarifs</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="nav-cta">
          <Link href="/login" className="nav-link-soft">Se connecter</Link>
          <Link href="/register" className="btn btn-primary btn-sm">Essayer gratuitement</Link>
        </div>
      </div>
    </header>
  );
}

/* ---- HERO ---------------------------------------------------- */
export function Hero() {
  return (
    <section className="hero">
      <div className="hero-bg" aria-hidden="true">
        <div className="hero-blob hero-blob-1" />
        <div className="hero-blob hero-blob-2" />
        <div className="hero-blob hero-blob-3" />
      </div>
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="pill">
            <span className="pill-dot" />
            Nouveau · pensé pour les indépendants du bien-être
          </span>
          <h1 className="hero-title serif">
            Moins d'admin.<br />
            <em>Plus de présence.</em>
          </h1>
          <p className="hero-lead">
            IziSolo réunit ton agenda, tes élèves, tes paiements et ta communication
            dans un seul outil clair et beau. Pour que tu puisses revenir à
            l'essentiel&nbsp;: ta pratique, tes cours, tes élèves.
          </p>
          <div className="hero-ctas">
            <Link href="/register" className="btn btn-primary btn-lg">Essayer gratuitement →</Link>
            <a href="#demo" className="btn btn-ghost btn-lg">
              <PlayIcon /> Voir la démo
            </a>
          </div>
          <div className="hero-trust">
            <div className="avatars">
              {['A', 'M', 'S', 'L', 'K'].map((c, i) => (
                <span
                  key={i}
                  className="trust-avatar"
                  style={{ background: `var(--c-accent-${['soft', 'tint', 'soft', 'tint', 'soft'][i]})` }}
                >
                  {c}
                </span>
              ))}
            </div>
            <div className="trust-text">
              <strong>Les premiers studios</strong> nous testent déjà
            </div>
          </div>
        </div>
        <div className="hero-app">
          <AppMockup tab="accueil" />
          <FloatingPing top="-12px" right="20px" delay="0s">
            <div className="ping-row"><span className="dot dot-sage" /> Léa s'est inscrite</div>
          </FloatingPing>
          <FloatingPing bottom="20px" left="-30px" delay="2s">
            <div className="ping-row mono">+ 240 € · Marc a renouvelé</div>
          </FloatingPing>
        </div>
      </div>
    </section>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M3 2 L11 7 L3 12 Z" />
    </svg>
  );
}

function FloatingPing({ children, ...pos }) {
  return (
    <div className="floating-ping" style={{ ...pos, animationDelay: pos.delay }}>
      {children}
    </div>
  );
}

/* ---- BÉNÉFICES ----------------------------------------------- */
export function Benefits() {
  const items = [
    { kw: 'Tout-en-un', title: 'Agenda, élèves, paiements', desc: "Plus de jongles entre Excel, Calendly et ton appli de paiement. Tout est au même endroit, propre et synchronisé." },
    { kw: 'Gain de temps', title: '5 minutes par jour', desc: "Inscriptions, rappels, encaissements automatisés. Tu ouvres, tu jettes un œil, tu fermes. Ton temps reste à toi." },
    { kw: 'Pour toi', title: 'Pensé pour les indépendant·e·s', desc: "Pas un CRM d'entreprise. Une app calme, douce, qui parle ton langage et qui s'adapte à ta pratique." },
    { kw: 'Ton image', title: 'Une expérience belle pour tes élèves', desc: "Page d'inscription personnalisée, rappels élégants, factures claires. Ton studio mérite une vitrine soignée." },
  ];
  return (
    <section className="benefits">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Pourquoi IziSolo</span>
          <h2 className="serif">Une journée plus légère,<br /><em>un studio plus serein.</em></h2>
        </div>
        <div className="benefits-grid">
          {items.map((b, i) => (
            <div key={i} className="benefit-card">
              <div className="benefit-num mono">0{i + 1}</div>
              <div className="benefit-kw eyebrow">{b.kw}</div>
              <h3 className="serif">{b.title}</h3>
              <p>{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- POUR QUI ------------------------------------------------ */
export function ForWhom() {
  const personas = [
    { name: 'Profs de yoga', desc: 'Hatha, vinyasa, yin, kundalini — gère tes cours réguliers et tes ateliers.', illu: 'lotus' },
    { name: 'Pilates', desc: 'Studios solo, cours collectifs, suivi postural et abonnements.', illu: 'tree' },
    { name: 'Méditation', desc: 'Sessions guidées, retraites, paiements à la séance ou à l\'abonnement.', illu: 'sun' },
    { name: 'Danse & mouvement', desc: 'Cours hebdo, stages, gestion des présences et listes d\'attente.', illu: 'tree' },
    { name: 'Coachs bien-être', desc: 'Suivi 1-à-1, programmes, rappels personnalisés à tes client·e·s.', illu: 'sun' },
    { name: 'Thérapeutes', desc: 'Rendez-vous, anamnèse, factures conformes — sans paperasse.', illu: 'lotus' },
  ];
  return (
    <section id="pour-qui" className="for-whom">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Pour qui</span>
          <h2 className="serif">Si tu travailles seul·e<br /><em>ou en petit collectif…</em></h2>
        </div>
        <div className="personas-grid">
          {personas.map((p, i) => (
            <div key={i} className="persona-card">
              <div className="persona-illu">
                {p.illu === 'lotus' && <YogaLotusIllu size={120} />}
                {p.illu === 'tree' && <YogaTreeIllu size={120} />}
                {p.illu === 'sun' && <SunCurveIllu size={110} />}
              </div>
              <h3 className="serif">{p.name}</h3>
              <p>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- FONCTIONNALITÉS ---------------------------------------- */
export function Features() {
  return (
    <section id="fonctionnalites" className="features">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Fonctionnalités</span>
          <h2 className="serif">Tout ce qu'il te faut.<br /><em>Rien de plus.</em></h2>
        </div>

        <FeatureRow
          eyebrow="Agenda"
          title="Une vue claire de ta semaine"
          desc="Cours réguliers, ateliers, rendez-vous individuels. Vues jour, semaine et mois. Tes élèves voient et réservent en un clic depuis ton portail."
          bullets={['Récurrences flexibles', 'Rappels automatiques par email', 'Portail élève public']}
          mockupTab="agenda"
          flip={false}
        />

        <FeatureRow
          eyebrow="Revenus & paiements"
          title="Encaisse sans y penser"
          desc="Espèces, chèques, virements, CB via Stripe Payment Link. Mini-compta intégrée, export CSV pour ton comptable, vue claire de tes revenus en temps réel."
          bullets={['Stripe Payment Link', 'Mini-compta tous modes', 'Export comptable CSV']}
          mockupTab="revenus"
          flip={true}
        />

        <FeatureRow
          eyebrow="Élèves & communication"
          title="Garde le lien, sans effort"
          desc="Fiche élève complète, historique des présences, paiements et impayés. Envoie un mot doux après une absence, des rappels avant un cours."
          bullets={['Fiches élèves complètes', 'Email automatisés (Resend)', 'Suivi des impayés']}
          mockupTab="accueil"
          flip={false}
        />
      </div>
    </section>
  );
}

function FeatureRow({ eyebrow, title, desc, bullets, mockupTab, flip }) {
  return (
    <div className={`feature-row ${flip ? 'flip' : ''}`}>
      <div className="feature-copy">
        <span className="eyebrow">{eyebrow}</span>
        <h3 className="serif">{title}</h3>
        <p>{desc}</p>
        <ul className="feature-bullets">
          {bullets.map(b => (
            <li key={b}><CheckIcon /> {b}</li>
          ))}
        </ul>
      </div>
      <div className="feature-mockup">
        <AppMockup tab={mockupTab} floating={false} />
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7 L6 11 L12 3" />
    </svg>
  );
}

/* ---- COMPARATIF VS EXCEL ------------------------------------ */
export function Comparison() {
  const rows = [
    { k: "Inscription d'un nouvel élève", excel: '5 min · ressaisie manuelle', izi: '30s · auto' },
    { k: 'Encaisser un paiement', excel: 'TPE + relance + facture à la main', izi: 'CB en ligne via Stripe' },
    { k: 'Voir mes revenus du mois', excel: 'Calculer à la main 😐', izi: "1 coup d'œil" },
    { k: 'Suivre les impayés', excel: 'Tu y penses... ou pas', izi: 'Vue dédiée' },
    { k: 'Export pour le comptable', excel: 'Recopier dans un autre fichier', izi: 'CSV en 1 clic' },
    { k: 'Tes soirées', excel: 'Encore au boulot', izi: 'Libérées' },
  ];
  return (
    <section className="comparison">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Avant / Après</span>
          <h2 className="serif">Excel a fait son temps.<br /><em>Tu mérites mieux.</em></h2>
        </div>
        <div className="compare-table">
          <div className="compare-head">
            <div></div>
            <div className="compare-col-h compare-old">
              <span className="compare-label">Excel & agenda papier</span>
            </div>
            <div className="compare-col-h compare-new">
              <IziSoloLogo size={20} wordmark={true} />
            </div>
          </div>
          {rows.map((r, i) => (
            <div key={i} className="compare-row">
              <div className="compare-key">{r.k}</div>
              <div className="compare-cell compare-old">{r.excel}</div>
              <div className="compare-cell compare-new"><CheckIcon /> {r.izi}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- DÉMO VIDÉO PLACEHOLDER --------------------------------- */
export function DemoVideo() {
  return (
    <section id="demo" className="demo">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Démo · 90 secondes</span>
          <h2 className="serif">Vois IziSolo<br /><em>en mouvement.</em></h2>
        </div>
        <div className="demo-frame">
          <div className="demo-placeholder">
            <button className="demo-play" aria-label="Lire la démo">
              <PlayIcon />
            </button>
            <div className="demo-stripes" />
            <div className="demo-caption mono">/ démo · 90 s · sans son ·</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---- TÉMOIGNAGES -------------------------------------------- */
export function Testimonials() {
  const quotes = [
    { q: "J'ai gagné une demi-journée par semaine. Sans rire. Mes élèves trouvent l'expérience plus pro, et moi je dors mieux.", n: 'Camille R.', r: 'Prof de Hatha, Lyon', t: 'rose' },
    { q: "Je n'aurais jamais pensé qu'un outil de gestion puisse être aussi doux à utiliser. Ça correspond à ce que je veux transmettre.", n: 'Yannick D.', r: 'Pilates & méditation, Bordeaux', t: 'sage' },
    { q: 'Avant, j\'avais peur des fins de mois — maintenant je vois mes revenus en temps réel. Ça change tout dans ma tête.', n: 'Inès M.', r: 'Yoga & coaching, Marseille', t: 'sand' },
    { q: "L'inscription se fait toute seule, le paiement aussi. Mes élèves m'envoient des messages plus chaleureux qu'avant — c'est bête mais ça compte.", n: 'Théo L.', r: 'Vinyasa, Nantes', t: 'lavender' },
  ];
  return (
    <section className="testimonials">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Elles & ils en parlent</span>
          <h2 className="serif">Des studios plus calmes,<br /><em>des journées plus douces.</em></h2>
        </div>
        <div className="quotes-grid">
          {quotes.map((q, i) => (
            <figure key={i} className={`quote-card tone-${q.t}`}>
              <div className="quote-mark serif">"</div>
              <blockquote>{q.q}</blockquote>
              <figcaption>
                <div className="quote-name">{q.n}</div>
                <div className="quote-role">{q.r}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- TARIFS — Free / Solo / Pro ---------------------------- */
export function Pricing() {
  const plans = [
    {
      name: 'Free',
      price: '0 €',
      sub: 'pour toujours',
      desc: 'Pour démarrer ou tester en douceur, sans engagement.',
      features: ["Jusqu'à 15 élèves", 'Agenda complet', 'Portail élève public', 'Support email'],
      cta: 'Commencer',
      ctaHref: '/register',
      featured: false,
    },
    {
      name: 'Solo',
      price: '14 €',
      sub: '/mois — sans engagement',
      desc: "L'essentiel pour faire vivre ton studio sereinement.",
      features: ['Élèves illimités', 'Mini-compta tous modes', 'Stripe Payment Link', 'Export CSV comptable', 'Email automatisés'],
      cta: 'Choisir Solo',
      ctaHref: '/register',
      featured: true,
    },
    {
      name: 'Pro',
      price: '29 €',
      sub: '/mois — sans engagement',
      desc: 'Pour les collectifs et studios à plusieurs prof·e·s.',
      features: ['Tout Solo inclus', 'Multi-utilisateurs', 'Domaine personnalisé', 'Support prioritaire'],
      cta: 'Choisir Pro',
      ctaHref: '/register',
      featured: false,
    },
  ];
  return (
    <section id="tarifs" className="pricing">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Tarifs</span>
          <h2 className="serif">Simple,<br /><em>comme tout le reste.</em></h2>
          <p className="section-sub">Sans engagement · annulable en 1 clic · 14 jours d'essai sur Solo et Pro.</p>
        </div>
        <div className="pricing-grid">
          {plans.map((p, i) => (
            <div key={i} className={`price-card ${p.featured ? 'featured' : ''}`}>
              {p.featured && <div className="price-badge">Le plus choisi</div>}
              <div className="price-name serif">{p.name}</div>
              <div className="price-amt">
                <span className="price-num serif">{p.price}</span>
                <span className="price-sub">{p.sub}</span>
              </div>
              <p className="price-desc">{p.desc}</p>
              <ul className="price-features">
                {p.features.map(f => (
                  <li key={f}><CheckIcon /> {f}</li>
                ))}
              </ul>
              <Link href={p.ctaHref} className={`btn ${p.featured ? 'btn-primary' : 'btn-ghost'} btn-lg`} style={{ width: '100%', justifyContent: 'center' }}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- FAQ ---------------------------------------------------- */
export function FAQ() {
  const items = [
    { q: 'Combien de temps pour mettre en place IziSolo ?', a: "Compte 15 minutes pour créer ton studio, importer tes élèves (CSV ou copier-coller) et caler ton agenda. On t'accompagne par message si tu cales." },
    { q: 'Mes élèves doivent-ils créer un compte ?', a: "Non. Ils peuvent réserver et payer sans compte. On leur envoie un lien magique par email pour gérer leurs réservations s'ils le souhaitent." },
    { q: 'Et si je veux arrêter ?', a: "Annulation en 1 clic, à tout moment. Tu peux exporter toutes tes données (élèves, séances, paiements) à n'importe quel moment via /paramètres." },
    { q: 'Comment sont gérés les paiements ?', a: "Tu choisis : encaissement manuel (espèces, chèque, virement, CB) avec mini-compta intégrée, OU Stripe Payment Link pour permettre à tes élèves de payer en CB depuis ton portail. Les fonds Stripe arrivent directement sur ton compte bancaire." },
    { q: 'Quels sont les frais sur les paiements en ligne ?', a: "Frais de fonctionnement IziSolo : 1% du volume payé en ligne via Stripe (ajoutés à ta facture mensuelle, jamais prélevés sur tes paiements). Plus les frais Stripe standard (1.5% + 0.25 €) qui vont à Stripe." },
    { q: 'Application mobile ?', a: "IziSolo est pensé en web responsive : ouvre-le sur n'importe quel téléphone, tablette ou ordi. Le portail élève s'installe comme une app (PWA) sur l'écran d'accueil." },
  ];
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="faq">
      <div className="container faq-container">
        <div className="section-head">
          <span className="eyebrow">FAQ</span>
          <h2 className="serif">Questions<br /><em>fréquentes.</em></h2>
        </div>
        <div className="faq-list">
          {items.map((it, i) => (
            <button key={i} className={`faq-item ${open === i ? 'open' : ''}`} onClick={() => setOpen(open === i ? -1 : i)}>
              <div className="faq-q">
                <span>{it.q}</span>
                <span className="faq-toggle">{open === i ? '−' : '+'}</span>
              </div>
              <div className="faq-a">
                <p>{it.a}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- CTA FINAL ---------------------------------------------- */
export function FinalCta() {
  return (
    <section id="cta" className="final-cta">
      <div className="container">
        <div className="final-card">
          <div className="final-illu" aria-hidden="true">
            <YogaLotusIllu size={140} />
          </div>
          <span className="eyebrow">Prêt·e&nbsp;?</span>
          <h2 className="serif">
            Lance ton studio<br />
            <em>en 5 minutes.</em>
          </h2>
          <p>Gratuit jusqu'à 15 élèves · sans carte bancaire · prends ton temps.</p>
          <div className="hero-ctas">
            <Link href="/register" className="btn btn-primary btn-lg">Créer mon studio →</Link>
            <a href="mailto:contact@izisolo.fr" className="btn btn-ghost btn-lg">Parler à l'équipe</a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---- FOOTER ------------------------------------------------- */
export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <IziSoloLogo size={28} />
          <p>L'outil de gestion calme et beau pour les indépendant·e·s du bien-être.</p>
          <WaveOrnament width={140} />
        </div>
        <FooterCol
          title="Produit"
          links={[
            { label: 'Fonctionnalités', href: '#fonctionnalites' },
            { label: 'Tarifs', href: '#tarifs' },
            { label: 'Démo', href: '#demo' },
            { label: 'FAQ', href: '#faq' },
          ]}
        />
        <FooterCol
          title="Compte"
          links={[
            { label: 'Se connecter', href: '/login' },
            { label: 'Créer un studio', href: '/register' },
            { label: 'Mot de passe oublié', href: '/mot-de-passe-oublie' },
          ]}
        />
        <FooterCol
          title="Légal"
          links={[
            { label: 'Mentions légales', href: '/legal/mentions' },
            { label: 'CGU', href: '/legal/cgu' },
            { label: 'CGV', href: '/legal/cgv' },
            { label: 'Confidentialité (RGPD)', href: '/legal/rgpd' },
          ]}
        />
      </div>
      <div className="footer-bottom container">
        <span>© 2026 IziSolo · Mélutek · fait avec ☼ en France</span>
        <span className="mono">contact@izisolo.fr</span>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div className="footer-col">
      <div className="footer-col-title eyebrow">{title}</div>
      <ul>
        {links.map(l => (
          <li key={l.label}>
            {l.href.startsWith('#') || l.href.startsWith('mailto:')
              ? <a href={l.href}>{l.label}</a>
              : <Link href={l.href}>{l.label}</Link>
            }
          </li>
        ))}
      </ul>
    </div>
  );
}
