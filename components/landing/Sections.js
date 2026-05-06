'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { IziSoloLogo, WaveOrnament } from './Brand';
import AppScreenshot from './AppScreenshot';

// Mapping logique → screenshot réel (8 captures dans /public/landing/,
// générées via scripts/capture-landing-app.mjs sur le compte de démo).
const SCREENS = {
  accueil:    { src: '/icons/screen-1-dashboard.png',     urlPath: 'dashboard',     alt: 'Dashboard IziSolo : prochains cours, élèves, revenus du mois' },
  agenda:     { src: '/icons/screen-2-agenda.png',        urlPath: 'agenda',        alt: 'Agenda IziSolo : vue semaine avec présences et inscrits' },
  revenus:    { src: '/icons/screen-3-revenus.png',       urlPath: 'revenus',       alt: 'Revenus IziSolo : mini-compta tous modes de paiement' },
  eleves:     { src: '/icons/screen-4-eleves.png',        urlPath: 'clients',       alt: 'Élèves IziSolo : liste avec statuts et filtres' },
  cas:        { src: '/icons/screen-5-cas-a-traiter.png', urlPath: 'cas-a-traiter', alt: 'Cas à traiter : inbox des règles métier (no-show, carnet expiré, cours annulé)' },
  pointage:   { src: '/icons/screen-6-pointage.png',      urlPath: 'cours',         alt: 'Pointage : marquer les présences en 2 secondes' },
  messagerie: { src: '/icons/screen-7-messagerie.png',    urlPath: 'messagerie',    alt: 'Messagerie IziSolo : conversations avec les élèves' },
  sondage:    { src: '/icons/screen-8-sondage.png',       urlPath: 'sondages',      alt: 'Sondage planning : implique tes élèves dans les choix de créneaux' },
};

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

/* ---- HERO CINÉMATOGRAPHIQUE AVEC SCROLL-PINNING -------------- */
// Image full-width type bandeau Apple/Headspace, titre en overlay à gauche
// sur l'espace négatif (zone non occupée par la prof + son téléphone).
//
// Scroll-pinning: la section fait 200vh de haut, avec à l'intérieur un
// élément sticky 100vh. Pendant que l'utilisateur scrolle 100vh
// supplémentaires, le hero reste fixe à l'écran et :
//   • la photo zoome lentement (parallax)
//   • les mots du titre apparaissent en cascade (split-text dissolve)
//   • le lead + CTAs apparaissent en dernier
// Sur mobile, le pinning est désactivé (hauteur auto).
//
// Image générée par Gemini (Imagen) — prof yoga 3/4 regardant son tel
// avec l'app affichée à l'écran. /public/icons/hero-studio.png
export function Hero() {
  return (
    <section className="hero hero-cinema hero-pinned">
      <div className="hero-pin-stage">
        <div className="hero-pin-sticky">
          <div className="hero-cinema-photo" aria-hidden="false">
            <Image
              src="/icons/hero-studio.png"
              alt="Professeure de yoga consultant son tableau de bord IziSolo dans son studio"
              fill
              priority
              sizes="100vw"
              style={{ objectFit: 'cover', objectPosition: 'center right' }}
            />
            {/* Dégradé pour faire ressortir le texte sur la zone gauche
                (où la photo est plus claire / plante en bokeh) */}
            <div className="hero-cinema-overlay" aria-hidden="true" />
          </div>

          <div className="container hero-cinema-content">
            <span className="pill hero-pin-pill">
              <span className="pill-dot" />
              Pensé pour les profs de yoga, pilates, danse &amp; bien-être
            </span>
            <h1 className="hero-title serif">
              Moins d'admin.<br />
              <em>Plus de présence.</em>
            </h1>
            <p className="hero-lead hero-pin-lead">
              Agenda, élèves, paiements, présences, mailing, règles d'annulation —
              <strong> un seul outil clair et beau</strong>. IziSolo gère les
              cas chiants à ta place pour que tu reviennes à l'essentiel : ta
              pratique, tes cours, tes élèves.
            </p>
            <div className="hero-ctas hero-pin-ctas">
              <Link href="/register" className="btn btn-primary btn-lg">Démarrer en 14 jours →</Link>
              <Link href="/login" className="btn btn-ghost btn-lg">Se connecter</Link>
            </div>
          </div>

          {/* Indicateur scroll discret (flèche bas qui pulse) */}
          <div className="hero-scroll-hint" aria-hidden="true">
            <span className="hero-scroll-line" />
            <span className="hero-scroll-label mono">scroll</span>
          </div>
        </div>
      </div>
    </section>
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
        <div className="section-head reveal">
          <span className="eyebrow">Pourquoi IziSolo</span>
          <h2 className="serif">Une journée plus légère,<br /><em>un studio plus serein.</em></h2>
        </div>
        <div className="benefits-grid reveal r-stagger">
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
// Chaque persona a sa photo réelle (Pexels, libre de droit, copiées dans
// /public/icons/persona-*.jpg). Photo full-bleed en haut de card, titre +
// description en dessous. Hover = zoom doux sur la photo + spotlight cuivre.
export function ForWhom() {
  const personas = [
    {
      name: 'Profs de yoga',
      desc: 'Hatha, vinyasa, yin, kundalini — gère tes cours réguliers, tes ateliers et tes retraites en pleine nature.',
      photo: '/icons/persona-yoga.jpg',
      alt: 'Professeure de yoga en posture de méditation au bord de la mer',
      objectPosition: 'center 30%',
    },
    {
      name: 'Pilates',
      desc: 'Studios solo, cours collectifs sur reformer ou tapis, suivi postural personnalisé et abonnements.',
      photo: '/icons/persona-pilates.jpg',
      alt: 'Professeure de pilates en exercice sur reformer dans son studio',
      objectPosition: 'center center',
    },
    {
      name: 'Méditation',
      desc: 'Sessions guidées, retraites, ateliers de pleine conscience — paiements à la séance ou à l\'abonnement.',
      photo: '/icons/persona-meditation.jpg',
      alt: 'Groupe en posture de méditation lotus, mains sur les genoux',
      objectPosition: 'center 25%',
    },
    {
      name: 'Danse & mouvement',
      desc: 'Cours hebdo, stages, chorégraphies — gestion des présences, listes d\'attente, sondages planning.',
      photo: '/icons/persona-danse.jpg',
      alt: 'Chorégraphe dirigeant des danseuses contemporaines sur scène',
      objectPosition: 'center center',
    },
    {
      name: 'Coachs bien-être',
      desc: 'Suivi 1-à-1, programmes en visio, rappels personnalisés — un outil aussi calme que ta démarche.',
      photo: '/icons/persona-coach.jpg',
      alt: 'Coach en méditation lotus à côté d\'un ordinateur portable',
      objectPosition: 'center 30%',
    },
    {
      name: 'Thérapeutes',
      desc: 'Rendez-vous, anamnèse, factures conformes, suivi long terme — la paperasse en moins, le soin en plus.',
      photo: '/icons/persona-therapeutes.jpg',
      alt: 'Thérapeute en consultation avec un client dans son cabinet',
      objectPosition: 'center center',
    },
  ];
  return (
    <section id="pour-qui" className="for-whom">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">Pour qui</span>
          <h2 className="serif">Si tu travailles seul·e<br /><em>ou en petit collectif…</em></h2>
        </div>
        <div className="personas-grid reveal r-stagger">
          {personas.map((p, i) => (
            <div key={i} className="persona-card">
              <div className="persona-photo">
                <Image
                  src={p.photo}
                  alt={p.alt}
                  fill
                  sizes="(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 33vw"
                  style={{ objectFit: 'cover', objectPosition: p.objectPosition }}
                />
              </div>
              <div className="persona-card-body">
                <h3 className="serif">{p.name}</h3>
                <p>{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- FONCTIONNALITÉS ---------------------------------------- */
// Pattern simple : titre normal en haut + fine barre de progression
// scrubée tout en haut de la section (1px). Pas de sticky-head : ça
// mangeait trop de place et faisait baver le backdrop-filter sur la
// section précédente en mobile.
export function Features() {
  return (
    <section id="fonctionnalites" className="features">
      <div className="features-progress-track" aria-hidden="true">
        <div className="features-progress-fill" />
      </div>
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">Fonctionnalités</span>
          <h2 className="serif">Tout ce qu'il te faut.<br /><em>Rien de plus.</em></h2>
        </div>

        <FeatureRow
          eyebrow="Agenda"
          title="Une semaine claire en un coup d'œil"
          desc="Cours hebdomadaires, ateliers ponctuels, rendez-vous individuels — tout est au même endroit. Vues jour, semaine et mois. Tes élèves voient les places dispo et réservent eux-mêmes depuis ton portail public, sans te déranger."
          bullets={['Récurrences flexibles (hebdo, mensuel, exceptions)', 'Multi-lieux et plusieurs studios sur un seul compte', 'Rappels auto par email avant chaque cours']}
          mockupTab="agenda"
          flip={false}
        />

        <FeatureRow
          eyebrow="Revenus & paiements"
          title="Encaisse partout, suis tes finances en temps réel"
          desc="Espèces, chèques, virements, CB en ligne via Stripe Payment Link. Mini-compta intégrée tous modes confondus, repère les impayés en 2 secondes, exporte tout au format CSV pour ton comptable quand tu veux."
          bullets={['Stripe Payment Link · CB en ligne sécurisée', 'Mini-compta tous modes (espèces, CB, virement, chèque)', 'Vue dédiée des impayés + export comptable']}
          mockupTab="revenus"
          flip={true}
        />

        <FeatureRow
          eyebrow="Messagerie & mailing"
          title="Une messagerie complète, ciblée à tous les niveaux"
          desc="Une vraie boîte mail intégrée, plus seulement des notifs. Envoie un mail ou un SMS à un élève précis, à tous les inscrits d'un cours, à tous les détenteurs d'un type d'abonnement, ou à ton créneau du jeudi soir — en deux clics."
          bullets={['Conversations 1-à-1 + canaux par cours', 'Mailing groupé par type d\'abonnement, cours ou créneau', 'Relances impayés et rappels automatiques']}
          mockupTab="messagerie"
          flip={false}
        />

        <FeatureRow
          eyebrow="Pointage"
          title="Marque les présences en 2 secondes"
          desc="Avant, pendant ou après le cours : tape sur le prénom, c'est fait. Le carnet de l'élève est décrémenté tout seul, ses stats de fidélité se mettent à jour, et si quelqu'un manque IziSolo te le signale dans les cas à traiter."
          bullets={['Pointage 1-clic optimisé mobile', 'Décrémentation auto des carnets de cours', 'Détection des no-show remontée dans l\'inbox']}
          mockupTab="pointage"
          flip={true}
        />

        <FeatureRow
          eyebrow="Sondages planning"
          title="Lance un sondage, transforme les gagnants en cours"
          desc="Envie de tester de nouveaux créneaux pour la rentrée ? Lance un sondage en 30 secondes, tes élèves votent pour leurs préférences depuis leur espace, et tu transformes les vainqueurs en cours officiels en deux clics. Plus de planning à l'aveugle — tu sais exactement ce qui va remplir."
          bullets={['Vote des élèves depuis leur espace', 'Conversion sondage → cours officiel en 2 clics', 'Classement des créneaux par popularité']}
          mockupTab="sondage"
          flip={false}
        />

        <FeatureRow
          eyebrow="Règles métier"
          title="Définis tes règles, IziSolo applique."
          desc="No-show, annulation tardive, cours annulé par toi, élève sans carnet, retard de paiement… Tu décides comment chaque cas est géré (recrédit, débit, geste commercial). IziSolo applique la règle automatiquement et fait remonter les cas ambigus dans une inbox « À traiter » centralisée — zéro situation oubliée."
          bullets={['7 cas métier entièrement paramétrables', 'Délais d\'annulation configurables (24h, 48h…)', 'Inbox « À traiter » : aucune décision ne te file entre les doigts']}
          mockupTab="cas"
          flip={true}
        />
      </div>
    </section>
  );
}

function FeatureRow({ eyebrow, title, desc, bullets, mockupTab, flip }) {
  const screen = SCREENS[mockupTab] || SCREENS.accueil;
  return (
    <div className={`feature-row reveal ${flip ? 'flip' : ''}`}>
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
        <AppScreenshot
          src={screen.src}
          alt={screen.alt}
          urlPath={screen.urlPath}
          floating={false}
        />
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

/* ---- MORE FEATURES (mini-cards) ------------------------------ */
// Section "Plus encore" : 8 mini-cards qui rendent justice à la profondeur
// fonctionnelle de l'app — features qui ne méritent pas chacune leur
// FeatureRow pleine taille mais qu'il faut absolument mettre en avant.
// Ordre choisi pour alterner ce qui touche les profs (mode équipe,
// multi-lieux) et ce qui touche les élèves (cours d'essai, liste d'attente).
function MoreFeatureIcon({ kind }) {
  const props = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (kind) {
    case 'trial':       // étoile (cours d'essai = découverte)
      return <svg {...props}><path d="M12 2 L14.6 8.6 L21.6 9.2 L16.3 13.9 L17.9 20.8 L12 17.2 L6.1 20.8 L7.7 13.9 L2.4 9.2 L9.4 8.6 Z" /></svg>;
    case 'waitlist':    // file d'attente (3 personnes)
      return <svg {...props}><circle cx="12" cy="6" r="3" /><circle cx="6" cy="14" r="2.4" /><circle cx="18" cy="14" r="2.4" /><path d="M5 21 a4 4 0 0 1 8 0" /><path d="M11 21 a4 4 0 0 1 8 0" /></svg>;
    case 'pass':        // carnet de tickets
      return <svg {...props}><path d="M3 8 a2 2 0 0 1 2 -2 h14 a2 2 0 0 1 2 2 v2 a2 2 0 0 0 0 4 v2 a2 2 0 0 1 -2 2 h-14 a2 2 0 0 1 -2 -2 v-2 a2 2 0 0 0 0 -4 z" /><path d="M9 6 v12" strokeDasharray="2 2" /></svg>;
    case 'multilocation': // pin localisation
      return <svg {...props}><path d="M12 22 s7 -7 7 -12 a7 7 0 1 0 -14 0 c0 5 7 12 7 12 z" /><circle cx="12" cy="10" r="2.5" /></svg>;
    case 'team':        // équipe (2 personnes)
      return <svg {...props}><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20 a6 6 0 0 1 12 0" /><path d="M14 20 a5 5 0 0 1 7 -4" /></svg>;
    case 'pwa':         // smartphone + flèche download
      return <svg {...props}><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M11 18 h2" /><path d="M9 11 l3 3 l3 -3" /><path d="M12 6 v8" /></svg>;
    case 'fidelity':    // cœur + courbe
      return <svg {...props}><path d="M12 21 s-7 -4.5 -7 -10 a4.5 4.5 0 0 1 7 -3.5 a4.5 4.5 0 0 1 7 3.5 c0 5.5 -7 10 -7 10 z" /></svg>;
    case 'portal':      // globe + sparkle
      return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M3 12 h18" /><path d="M12 3 a14 14 0 0 1 0 18 a14 14 0 0 1 0 -18" /></svg>;
    default:
      return null;
  }
}

export function MoreFeatures() {
  const items = [
    {
      icon: 'trial',
      eyebrow: 'Cours d\'essai',
      title: 'Simplifie l\'arrivée des nouveaux',
      desc: 'Mode validation manuelle ou automatique, durée configurable, conversion en abonnement direct depuis l\'espace élève. Le premier pas devient évident.',
    },
    {
      icon: 'waitlist',
      eyebrow: 'Liste d\'attente',
      title: 'Tes créneaux toujours pleins',
      desc: 'Cours complet ? Tes élèves s\'inscrivent en attente. Dès qu\'une place se libère, IziSolo fait remonter le suivant et lui envoie un mail. Zéro chaise vide.',
    },
    {
      icon: 'pass',
      eyebrow: 'Carnets multi-formats',
      title: 'Tu vends ce que tu veux, comme tu veux',
      desc: 'Illimité, carnet 5/10/20 séances, à la séance, mensuel, trimestriel, annuel — paramètre tous tes formats d\'abonnement et compose ton offre.',
    },
    {
      icon: 'multilocation',
      eyebrow: 'Multi-lieux',
      title: 'Plusieurs salles, un seul compte',
      desc: 'Tu enseignes au studio le matin, à la salle paroissiale le soir, en visio le week-end ? Ajoute autant de lieux que nécessaire, tout reste synchro.',
    },
    {
      icon: 'team',
      eyebrow: 'Mode équipe',
      title: 'Invite ton/ta partenaire prof',
      desc: 'Plusieurs profs sur le même studio, chacun·e avec ses propres droits. Les paiements et les présences restent attribués à la bonne personne.',
    },
    {
      icon: 'pwa',
      eyebrow: 'Application installable',
      title: 'Sur ton tel, sans passer par les stores',
      desc: 'Tes élèves installent ton portail comme une vraie app sur leur écran d\'accueil (PWA). Pas de friction, pas de validation Apple, pas de mises à jour.',
    },
    {
      icon: 'fidelity',
      eyebrow: 'Statistiques élève',
      title: 'Repère qui s\'éloigne avant qu\'iel parte',
      desc: 'Pour chaque élève : taux de présence, dernier cours, fréquence, ancienneté. Un coup d\'œil te dit qui ne vient plus depuis trois semaines.',
    },
    {
      icon: 'portal',
      eyebrow: 'Portail public personnalisé',
      title: 'Une vraie vitrine pour ton studio',
      desc: 'Ton studio a son URL publique avec ton logo, ta photo de couverture, ta palette. Une page d\'inscription élégante, calme, qui fait honneur à ta pratique.',
    },
  ];
  return (
    <section className="more-features">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">Plus encore</span>
          <h2 className="serif">
            Et tout un tas de petites choses<br />
            <em>qui font la différence.</em>
          </h2>
          <p className="more-features-lead">
            Chaque détail a été pensé pour t'éviter les frictions du quotidien.
            Voici quelques pépites qui méritent qu'on s'y arrête.
          </p>
        </div>
        <div className="more-features-grid reveal r-stagger">
          {items.map((it, i) => (
            <article key={i} className="more-feature-card">
              <div className="more-feature-icon">
                <MoreFeatureIcon kind={it.icon} />
              </div>
              <span className="eyebrow">{it.eyebrow}</span>
              <h3 className="serif">{it.title}</h3>
              <p>{it.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
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
        <div className="section-head reveal">
          <span className="eyebrow">Avant / Après</span>
          <h2 className="serif">Excel a fait son temps.<br /><em>Tu mérites mieux.</em></h2>
        </div>
        <div className="compare-table reveal r-zoom">
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

/* ---- MOBILE SHOWCASE (preuve visuelle close-up) ------------- */
export function MobileShowcase() {
  return (
    <section className="mobile-showcase">
      <div className="container mobile-showcase-grid">
        <div className="mobile-showcase-copy reveal">
          <span className="eyebrow">Mobile-first</span>
          <h2 className="serif">
            Tout ton studio,<br />
            <em>dans ta poche.</em>
          </h2>
          <p>
            IziSolo est <strong>pensé d'abord pour ton téléphone</strong>. Tu pointes une présence
            depuis le studio, tu réponds à un message d'élève entre 2 cours, tu vois tes revenus
            du mois en sortant du métro. Tes élèves accèdent à ton portail comme à une vraie app
            (PWA, sans passer par les stores).
          </p>
          <ul className="mobile-showcase-bullets">
            <li><CheckIcon /> Pointage en 2 secondes au début du cours</li>
            <li><CheckIcon /> Portail élève installable sur l'écran d'accueil</li>
            <li><CheckIcon /> Notifications dans l'app + cloche en haut</li>
            <li><CheckIcon /> Réponse à un message en 1 clic</li>
          </ul>
        </div>
        <div className="mobile-showcase-photo reveal r-zoom">
          <Image
            src="/icons/hero-closeup-table.png"
            alt="Écran de l'app IziSolo affichant le dashboard avec revenus, élèves, sondage et cas à traiter — vue rapprochée"
            width={1200}
            height={896}
            sizes="(max-width: 768px) 100vw, 540px"
            style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 'var(--r-lg)' }}
          />
        </div>
      </div>
    </section>
  );
}

/* ---- TÉMOIGNAGES -------------------------------------------- */
export function Testimonials() {
  const quotes = [
    { q: "J'ai gagné une demi-journée par semaine. Sans rire. Mes élèves trouvent l'expérience plus pro, et moi je dors mieux.", n: 'Camille R.', r: 'Prof de Hatha, Lyon', t: 'rose', featured: true, photo: '/icons/hero-cocoon.png' },
    { q: "Je n'aurais jamais pensé qu'un outil de gestion puisse être aussi doux à utiliser. Ça correspond à ce que je veux transmettre.", n: 'Yannick D.', r: 'Pilates & méditation, Bordeaux', t: 'sage' },
    { q: 'Avant, j\'avais peur des fins de mois — maintenant je vois mes revenus en temps réel. Ça change tout dans ma tête.', n: 'Inès M.', r: 'Yoga & coaching, Marseille', t: 'sand' },
    { q: "L'inscription se fait toute seule, le paiement aussi. Mes élèves m'envoient des messages plus chaleureux qu'avant — c'est bête mais ça compte.", n: 'Théo L.', r: 'Vinyasa, Nantes', t: 'lavender' },
  ];
  return (
    <section className="testimonials">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">Elles & ils en parlent</span>
          <h2 className="serif">Des studios plus calmes,<br /><em>des journées plus douces.</em></h2>
        </div>
        <div className="quotes-grid reveal r-stagger">
          {quotes.map((q, i) => (
            <figure key={i} className={`quote-card tone-${q.t} ${q.featured ? 'quote-featured' : ''}`}>
              {q.photo && (
                <div className="quote-photo">
                  <Image
                    src={q.photo}
                    alt={`${q.n}, ${q.r}`}
                    width={1376}
                    height={768}
                    sizes="(max-width: 768px) 100vw, 480px"
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                </div>
              )}
              <div className="quote-content">
                <div className="quote-mark serif">"</div>
                <blockquote>{q.q}</blockquote>
                <figcaption>
                  <div className="quote-name">{q.n}</div>
                  <div className="quote-role">{q.r}</div>
                </figcaption>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- TARIFS — Solo 12€ / Pro 24€ / Premium 49€ (mensuel uniquement) ---- */
export function Pricing() {
  const plans = [
    {
      name: 'Solo',
      price: '12 €',
      sub: '/mois · 14 jours d\'essai',
      desc: 'Pour démarrer simplement. Tout l\'essentiel pour gérer ta pratique solo.',
      features: [
        'Jusqu\'à 40 élèves · 1 lieu',
        'Agenda complet · cours illimités',
        'Portail élève + PWA',
        'Mini-compta (espèces, chèque, virement, CB)',
        'Pointage des présences',
        'Cas à traiter (no-show, paiement en attente…)',
      ],
      cta: 'Démarrer en 14 jours',
      ctaHref: '/register',
      featured: false,
    },
    {
      name: 'Pro',
      price: '24 €',
      sub: '/mois · 14 jours d\'essai',
      desc: 'Le plan complet. Auto-pilote ton studio, encaisse en ligne, accueille une équipe.',
      features: [
        'Élèves illimités · jusqu\'à 3 lieux',
        'Tout du plan Solo',
        'Stripe Payment Link (CB par les élèves)',
        'Multi-utilisateurs (équipe)',
        'Mailing & relances auto · anniversaires',
        'Sondages planning · liste d\'attente',
        'Cours d\'essai · règles d\'annulation avancées',
        'Export comptable CSV',
      ],
      cta: 'Démarrer en 14 jours',
      ctaHref: '/register',
      featured: true,
    },
    {
      name: 'Premium',
      price: '49 €',
      sub: '/mois · bientôt disponible',
      desc: 'Le maximum. Vidéos, white-label, lieux illimités. Pour les studios qui scalent.',
      features: [
        'Tout Pro · sans limites',
        'Lieux illimités',
        'Vidéos de cours (visio + replay)',
        'Vente de vidéos à l\'unité ou abonnement',
        'White-label (logo dans tes emails)',
        'Support prioritaire',
      ],
      cta: 'Bientôt',
      ctaHref: '/register',
      featured: false,
      comingSoon: true,
    },
  ];

  return (
    <section id="tarifs" className="pricing">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">Tarifs</span>
          <h2 className="serif">Simple,<br /><em>comme tout le reste.</em></h2>
          <p className="section-sub">14 jours d'essai gratuit sur Solo et Pro · sans carte bancaire · annulable en 1 clic.</p>
        </div>

        <div className="pricing-grid reveal r-stagger">
          {plans.map((p, i) => (
            <div key={i} className={`price-card ${p.featured ? 'featured' : ''} ${p.comingSoon ? 'coming-soon' : ''}`}>
              {p.featured && <div className="price-badge">Le plus choisi</div>}
              {p.comingSoon && <div className="price-badge price-badge-soon">Bientôt</div>}
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
              {p.comingSoon ? (
                <button
                  disabled
                  className="btn btn-ghost btn-lg"
                  style={{ width: '100%', justifyContent: 'center', opacity: 0.55, cursor: 'not-allowed' }}
                >
                  {p.cta}
                </button>
              ) : (
                <Link href={p.ctaHref} className={`btn ${p.featured ? 'btn-primary' : 'btn-ghost'} btn-lg`} style={{ width: '100%', justifyContent: 'center' }}>
                  {p.cta}
                </Link>
              )}
            </div>
          ))}
        </div>

        <p className="pricing-fees">
          Paiements en ligne (Pro) : <strong>tu encaisses sur ton propre compte Stripe</strong> · IziSolo facture
          1 % du volume sur ta facture mensuelle (jamais prélevé sur tes paiements).
        </p>
      </div>
    </section>
  );
}

/* ---- FAQ ---------------------------------------------------- */
export function FAQ() {
  const items = [
    { q: 'Combien de temps pour mettre en place IziSolo ?', a: "Compte 15 minutes pour créer ton studio, importer tes élèves (CSV ou copier-coller) et caler ton agenda. On t'accompagne par message si tu cales — réponse sous 24 h." },
    { q: 'Mes élèves doivent-ils créer un compte ?', a: "Non. Ils peuvent réserver et payer sans compte depuis ton portail public (PWA installable sur leur téléphone). On leur envoie un lien magique par email pour retrouver leurs réservations s'ils le souhaitent." },
    { q: 'Comment fonctionnent les sondages planning ?', a: "Avant la rentrée (ou quand tu veux), tu crées un sondage avec tes créneaux candidats. Tes élèves votent depuis leur espace pour leurs préférences. Tu vois en temps réel les créneaux gagnants, et tu transformes les vainqueurs en cours officiels en deux clics. Plus jamais de planning lancé au pif — tu sais exactement ce qui va remplir." },
    { q: 'Et si un cours est complet, comment ça se passe ?', a: "Tes élèves peuvent s'inscrire en liste d'attente. Dès qu'une place se libère (annulation, désinscription), IziSolo place automatiquement le suivant et lui envoie un mail de confirmation. Tes créneaux restent toujours pleins, sans que tu aies à courir après personne." },
    { q: 'Je peux envoyer des mails ciblés à mes élèves ?', a: "Oui, à tous les niveaux. Un message à un élève précis, à tous les inscrits d'un cours, à tous les détenteurs d'un type d'abonnement (les illimités, les carnets de 10…), à tous ceux d'un créneau particulier. Tu peux aussi programmer des relances auto pour les paiements en attente, des rappels avant cours, des messages d'anniversaire." },
    { q: 'Et si je veux arrêter ?', a: "Annulation en 1 clic, à tout moment, depuis tes paramètres. Tu peux exporter toutes tes données (élèves, séances, paiements, présences) à n'importe quel moment au format CSV." },
    { q: 'Comment sont gérés les paiements ?', a: "Tu choisis : encaissement manuel (espèces, chèque, virement, CB en présentiel) avec mini-compta intégrée, OU Stripe Payment Link (plan Pro) pour permettre à tes élèves de payer en CB depuis ton portail. Les fonds Stripe arrivent directement sur ton compte bancaire." },
    { q: 'Quels sont les frais sur les paiements en ligne ?', a: "Frais de fonctionnement IziSolo : 1 % du volume payé en ligne via Stripe (ajoutés à ta facture mensuelle, jamais prélevés sur les paiements de tes élèves). À cela s'ajoutent les frais Stripe standard (1.5 % + 0,25 €) qui vont à Stripe directement." },
    { q: 'Comment IziSolo gère un no-show ou un cours annulé ?', a: "Tu paramètres tes propres règles métier dans ton tableau de bord : recrédit du carnet, débit, contact prioritaire à l'élève, etc. IziSolo applique automatiquement, et te remonte les cas ambigus dans une inbox « À traiter » dédiée. Aucun cas ne passe à la trappe." },
    { q: 'Plusieurs lieux, plusieurs studios, équipe : c\'est possible ?', a: "Oui à tout. Plusieurs lieux de pratique sur un seul compte (studio + salle paroissiale + visio), plusieurs studios pour les profs nomades, et plusieurs profs sur le même studio avec leurs propres droits. Les présences et les paiements restent attribués à la bonne personne." },
    { q: 'Application mobile ?', a: "IziSolo est conçu en web responsive : ouvre-le sur n'importe quel téléphone, tablette ou ordi. Le portail élève s'installe comme une app (PWA) sur l'écran d'accueil — comme une vraie app native, sans passer par les stores." },
  ];
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="faq">
      <div className="container faq-container">
        <div className="section-head reveal">
          <span className="eyebrow">FAQ</span>
          <h2 className="serif">Questions<br /><em>fréquentes.</em></h2>
        </div>
        <div className="faq-list reveal r-stagger">
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

/* ---- CTA FINAL (avec photo close-up mains) ----------------- */
export function FinalCta() {
  return (
    <section id="cta" className="final-cta">
      <div className="container final-cta-grid">
        <div className="final-cta-copy reveal">
          <span className="eyebrow">Prêt·e&nbsp;?</span>
          <h2 className="serif">
            Lance ton studio<br />
            <em>en 5 minutes.</em>
          </h2>
          <p>
            14 jours d'essai gratuit · sans carte bancaire · annulable en 1 clic.
            On t'accompagne par message si tu cales — réponse sous 24 h.
          </p>
          <div className="hero-ctas">
            <Link href="/register" className="btn btn-primary btn-lg">Créer mon studio →</Link>
            <a href="mailto:contact@izisolo.fr" className="btn btn-ghost btn-lg">Parler à l'équipe</a>
          </div>
        </div>
        <div className="final-cta-photo reveal r-zoom">
          <Image
            src="/icons/hero-closeup-mains.png"
            alt="Mains tenant un téléphone affichant l'application IziSolo"
            width={1376}
            height={768}
            sizes="(max-width: 768px) 100vw, 540px"
            style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 'var(--r-lg)' }}
          />
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
            { label: 'Pour qui', href: '#pour-qui' },
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
