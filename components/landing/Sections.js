'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { IziSoloLogo, WaveOrnament } from './Brand';
import ReelPhone from './ReelPhone';
import { FAQ_ITEMS } from '@/content/faq';

/* ================================================================
   Landing v2 « pro » — handoff design_handoff_landing_v2 (2026-08-19).
   Éditorial × organique : hero product-led (vraies captures), zéro
   faux témoignage / faux studio, section fondatrice « Créée par
   Maude », tarifs réels 2 plans. Copies du handoff, passées au filtre
   « zéro tiret quadratin » (règle Colin 2026-08-19).
   ================================================================ */

// Captures réelles de l'app (compte démo, scripts/capture-landing-app.mjs).
// 1280×800. À rafraîchir au même cadrage quand l'UI bouge.
const SCREENS = {
  accueil: { src: '/icons/screen-1-dashboard.png', alt: 'Tableau de bord IziSolo : prochains cours, élèves, revenus du mois' },
  agenda:  { src: '/icons/screen-2-agenda.png',    alt: 'Agenda IziSolo : vue semaine avec présences et inscrits' },
  revenus: { src: '/icons/screen-3-revenus.png',   alt: 'Revenus IziSolo : mini-compta tous modes de paiement' },
};

/* ---- Helpers partagés ---------------------------------------- */

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 7 L6 11 L12 3" />
    </svg>
  );
}

// Souligné éditorial « main levée » terminé par un lotus 3 pétales.
// Posé en absolu sous le span .accent (hero + CTA final).
function AccentUnderline() {
  return (
    <svg className="accent-underline" viewBox="0 0 224 22" preserveAspectRatio="none" fill="none" aria-hidden="true">
      <path d="M3 15 Q50 9 100 13 T192 12" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M206 14 C204 10 204.5 6 206 3.5 C207.5 6 208 10 206 14 Z" fill="currentColor" fillOpacity=".25" />
        <path d="M206 14 C202 12.5 200 9.5 199.5 6.5 C202.8 7.2 205 10 206 14 Z" fill="currentColor" fillOpacity=".12" />
        <path d="M206 14 C210 12.5 212 9.5 212.5 6.5 C209.2 7.2 207 10 206 14 Z" fill="currentColor" fillOpacity=".12" />
      </g>
    </svg>
  );
}

// Fonds « zen organiques » : blobs flous derrière la section (intensité
// médium figée — le panneau Tweaks de la maquette n'existe pas en prod).
function ZenLayer({ blobs }) {
  return (
    <div className="zen-layer" aria-hidden="true">
      {blobs.map(([tone, style], i) => (
        <div key={i} className={`zen-blob ${tone}`} style={style} />
      ))}
    </div>
  );
}

// Tête de section v2 : eyebrow à filets à gauche, H2 Fraunces à droite.
function Head({ eyebrow, sub, children }) {
  return (
    <div className="head reveal">
      <div><span className="eyebrow-line">{eyebrow}</span></div>
      <h2 className="serif">{children}</h2>
      {sub && <p className="head-sub">{sub}</p>}
    </div>
  );
}

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
          <Link href="/outils">Outils</Link>
          <Link href="/blog">Journal</Link>
        </nav>
        <div className="nav-cta">
          <Link href="/login" className="nav-link-soft">Se connecter</Link>
          <Link href="/register" className="btn btn-primary btn-sm">Essayer gratuitement</Link>
        </div>
      </div>
    </header>
  );
}

/* ---- HERO product-led ---------------------------------------- */
// Centré, headline « Moins de soucis. / Plus de tapis. », souligné
// lotus, ligne de confiance Maude, cadre navigateur avec 3 vraies
// captures (celle du centre décalée), fondu bas vers le bg.
export function Hero() {
  return (
    <section className="hero-v2 zen">
      <ZenLayer blobs={[['b1', { top: '-12%', right: '-6%' }], ['b2', { bottom: '10%', left: '-10%' }]]} />
      <div className="container">
        <span className="eyebrow-line eyebrow-line-hero">Pour les profs de yoga, pilates, danse &amp; bien-être</span>
        <h1 className="serif">
          Moins de soucis.<br />
          <span className="accent">Plus de tapis.<AccentUnderline /></span>
        </h1>
        <p className="hero-v2-lead">
          Agenda, réservations, paiements, factures, messagerie : <b>un seul outil clair et beau.</b> IziSolo
          gère les cas pénibles à ta place pour que tu reviennes à l&apos;essentiel : ta pratique, tes cours, tes élèves.
        </p>
        <div className="hero-v2-ctas">
          <Link href="/register" className="btn btn-primary btn-lg">Essayer 14 jours · sans CB →</Link>
          <Link href="/creer-mon-studio" className="btn btn-ghost btn-lg">On monte ton studio pour toi</Link>
        </div>
        {/* Ce second bouton menait à /login jusqu'au 2026-08-30. C'était une
            porte pour les CLIENTS, posée à l'endroit le plus cher de la page,
            alors que « Se connecter » vit déjà dans la nav ET dans le pied :
            le seul bouton du hero qui ne pouvait convertir personne. Le
            concierge, lui, y était relégué en petite ligne grise.

            La règle de v96 tient toujours et n'est pas contournée : ce n'est
            PAS un second CTA de même poids. On n'AJOUTE aucun bouton, on
            change la destination de celui qui existait, et la hiérarchie
            reste intacte (l'un plein, l'autre fantôme). C'est d'ailleurs ce
            que vérifie désormais proof-demande-studio, en lisant le fond
            CALCULÉ des deux boutons plutôt que leur place dans le DOM. */}
        <p className="hero-concierge">
          Essai sans carte bancaire. Et si on monte ton studio, c&apos;est offert.
        </p>
        <div className="hero-trust">
          {/* Photo placeholder : à remplacer par une vraie photo de Maude */}
          <span className="pic blob-a">
            <Image src="/icons/maude-foret.jpg" alt="Maude, fondatrice d'IziSolo" width={68} height={68} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </span>
          <span>Créée par <b>Maude</b>, prof de yoga · conçue et hébergée en France</span>
        </div>
        <div className="hero-product reveal">
          <div className="frame">
            <div className="bar" aria-hidden="true"><i /><i /><i /><span className="url mono">ton-studio.izisolo.fr</span></div>
            <div className="shots">
              <Image src={SCREENS.accueil.src} alt={SCREENS.accueil.alt} width={1280} height={800} priority sizes="(max-width: 640px) 50vw, 315px" />
              <Image src={SCREENS.agenda.src} alt={SCREENS.agenda.alt} width={1280} height={800} priority sizes="(max-width: 640px) 50vw, 315px" />
              <Image src={SCREENS.revenus.src} alt={SCREENS.revenus.alt} width={1280} height={800} sizes="(max-width: 640px) 50vw, 315px" />
            </div>
          </div>
          <div className="fade" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

/* ---- POURQUOI (bénéfices, grille filets 2×2) ------------------ */
export function Benefits() {
  const items = [
    { num: '01 · Tout-en-un', title: 'Agenda, élèves, paiements', desc: 'Plus de jongles entre Excel, Calendly et ton appli de paiement. Tout est au même endroit, propre et synchronisé.' },
    { num: '02 · Gain de temps', title: 'Cinq minutes par jour', desc: 'Réservations, rappels, encaissements, relances : automatisés. Tu ouvres, tu jettes un œil, tu fermes. Ton temps reste à toi.' },
    { num: '03 · Pour toi', title: 'Pensé pour les indépendant·e·s', desc: "Pas un CRM d'entreprise. Une app calme, douce, qui parle ton langage et s'adapte à ta pratique." },
    { num: '04 · Ton image', title: 'Une expérience belle pour tes élèves', desc: 'Portail de réservation à ton nom, rappels élégants, vraies factures numérotées. Ton studio mérite une vitrine soignée.' },
  ];
  return (
    <section className="zen">
      <ZenLayer blobs={[['b3', { top: '6%', left: '-8%' }], ['b2', { bottom: '-18%', right: '-8%' }]]} />
      <div className="container">
        <Head eyebrow="Pourquoi IziSolo">Une journée plus légère,<br /><span className="accent">un studio plus serein.</span></Head>
        <div className="bens">
          {items.map((b, i) => (
            <div key={i} className="ben reveal">
              <div className="ben-num mono">{b.num}</div>
              <h3 className="serif">{b.title}</h3>
              <p>{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- FONCTIONNALITÉS (4 rangées alternées) ------------------- */
function FeatRow({ k, title, desc, bullets, media, flip }) {
  return (
    <div className={`feat reveal ${flip ? 'flip' : ''}`}>
      <div className="feat-copy">
        <span className="k mono">{k}</span>
        <h3 className="serif">{title}</h3>
        <p>{desc}</p>
        <ul>
          {bullets.map(b => (
            <li key={b}><span className="ck"><CheckIcon /></span> {b}</li>
          ))}
        </ul>
      </div>
      <div className="feat-media">{media}</div>
    </div>
  );
}

export function Features() {
  return (
    <section id="fonctionnalites" className="rule-top">
      <div className="container">
        <Head eyebrow="Fonctionnalités">Tout ce qu&apos;il te faut.<br /><span className="accent">Rien de plus.</span></Head>

        <FeatRow
          k="Agenda"
          title="Ton agenda tourne tout seul"
          desc="Cours à l'unité, séries hebdo ou mensuelles, exceptions, vacances : tu configures une fois, l'app déroule. Une série qui se termine ? Tu la prolonges en 2 clics, avec aperçu des séances créées."
          bullets={[
            'Récurrences flexibles : hebdo, mensuel, exceptions, vacances',
            'Plusieurs lieux, aucun supplément',
            'Rappel automatique la veille de chaque séance',
          ]}
          media={(
            <>
              <div className="feat-shot"><Image src={SCREENS.agenda.src} alt={SCREENS.agenda.alt} width={1280} height={800} sizes="(max-width: 760px) 90vw, 440px" /></div>
              <span className="badge">↻ synchro temps réel</span>
            </>
          )}
        />

        <FeatRow
          flip
          k="Réservation"
          title="Tes élèves réservent sans toi"
          desc="Un portail de réservation à ton nom, installable comme une appli sur leur téléphone. Réservation d'une séance ou de toute une série, confirmation par email, et si c'est complet, liste d'attente automatique."
          bullets={[
            "Cours d'essai : validation automatique ou à la main",
            'Visibilité fine par cours : public, inscrits, abonnés, fidèles ou sur invitation',
            "Place libérée : la première en attente est prévenue",
          ]}
          media={(
            <>
              <div className="feat-shot"><Image src={SCREENS.accueil.src} alt={SCREENS.accueil.alt} width={1280} height={800} sizes="(max-width: 760px) 90vw, 440px" /></div>
              <span className="badge">Léa s&apos;est inscrite · +1</span>
            </>
          )}
        />

        <FeatRow
          k="Revenus & paiements"
          title="L'argent rentre, et tu vois tout"
          desc="Carnets, abonnements, séances à l'unité, cours mixtes. Payé maintenant, à régler plus tard ou en plusieurs fois : l'app suit chaque centime. Paiement CB en ligne, y compris à la séance."
          bullets={[
            '« À percevoir » : tout ce qu\'on te doit, encaissable en 1 clic',
            'Vraies factures numérotées, téléchargées par tes élèves (ton SIRET suffit)',
            'Export comptable filtrable par période, mode et offre',
          ]}
          media={(
            <>
              {/* Réel produit auto-hébergé (compressé ~3 Mo, muet, sous-titres
                  incrustés) — remplace la capture statique. Le master vit dans
                  ressources/ (gitignoré) ; workflow : cf. ReelPhone.js. */}
              <div className="feat-shot feat-shot-reel">
                <ReelPhone
                  src="/videos/reel-paiement-plusieurs-fois.mp4"
                  poster="/videos/reel-paiement-plusieurs-fois-poster.jpg"
                  titre="Démo en 35 secondes : vendre un carnet payé en plusieurs fois et suivre chaque versement"
                />
              </div>
              <span className="badge">En 3 fois, sans y penser</span>
            </>
          )}
        />

        <FeatRow
          flip
          k="Communication"
          title="Ta communication, sans y passer tes soirées"
          desc="Messagerie intégrée : conversations privées, canaux par cours, annonces groupées. Tes élèves reçoivent un email dès que tu écris, avec ta vraie adresse en réponse. Annulation d'une séance ? Chaque élève est prévenue, et son crédit restitué."
          bullets={[
            'Sondages planning : les créneaux gagnants deviennent des cours en 2 clics',
            'Relances impayés et rappels automatiques',
            'Cours en ligne : le lien visio n\'est servi qu\'aux élèves à jour',
          ]}
          media={(
            <div className="feat-photo blob-b">
              <Image src="/icons/photo-mala.jpg" alt="Détail mala, posture de méditation" width={3648} height={2432} sizes="(max-width: 760px) 90vw, 560px" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
        />
      </div>
    </section>
  );
}

/* ---- PETITES CHOSES (grille 3×2) ----------------------------- */
export function MoreFeatures() {
  const items = [
    { k: 'Pointage', title: 'Le pointage en 1 clic', desc: 'Tu pointes depuis ton téléphone à la fin du cours, les carnets se décomptent tout seuls. Les essais et séances offertes ne sont jamais décomptés. Jamais.' },
    { k: 'À traiter', title: 'Les galères gérées pour toi', desc: 'No-shows, annulations tardives, retards de paiement : tout arrive au même endroit, réglé en 2 clics, annulable pendant 7 jours.' },
    { k: 'Automations', title: 'Des règles SI/ALORS', desc: "Règles d'annulation à ta façon : délai, sanction, message. L'app applique, toi tu enseignes. Relances, alertes et notifications en pilote automatique." },
    { k: 'Base élèves', title: 'Propre et vivante', desc: "Import CSV depuis n'importe où, accents compris. Tu photographies une fiche papier, l'IA la transforme en fiche prête à enregistrer. Doublons fusionnés en 1 clic." },
    { k: 'Vitrine', title: 'QR code prêt à imprimer', desc: 'Carte de visite, flyer, affiche A4 générée pour toi. Ton planning intégrable sur ton propre site, à tes couleurs, en liste ou en grille semaine.' },
    { k: 'Accompagnement', title: "Tu n'es jamais seule", desc: "Guide intégré avec 15 pas-à-pas, un « ? » contextuel sur chaque page, et une ligne directe avec l'équipe IziSolo dans ta messagerie." },
  ];
  return (
    <section className="rule-top zen">
      <ZenLayer blobs={[['b2', { top: '-10%', right: '-8%' }], ['b3', { bottom: '-14%', left: '-6%' }]]} />
      <div className="container">
        <Head eyebrow="Plus encore">Et tout un tas de petites choses<br /><span className="accent">qui font la différence.</span></Head>
        <div className="mini reveal r-stagger">
          {items.map((it, i) => (
            <article key={i} className="mini-card">
              <div className="k mono">{it.k}</div>
              <h3 className="serif">{it.title}</h3>
              <p>{it.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- POUR QUI (6 personas compacts, photos blob) ------------- */
export function ForWhom() {
  const personas = [
    { idx: '01', name: 'Profs de yoga', desc: 'Hatha, vinyasa, yin : cours, ateliers, retraites en pleine nature.', photo: '/icons/persona-yoga.jpg', alt: 'Professeure de yoga en posture de méditation au bord de la mer', blob: 'blob-a' },
    { idx: '02', name: 'Pilates', desc: 'Reformer ou tapis, suivi postural et abonnements.', photo: '/icons/persona-pilates.jpg', alt: 'Professeure de pilates en exercice sur reformer', blob: 'blob-b' },
    { idx: '03', name: 'Méditation', desc: 'Sessions guidées, retraites, ateliers de pleine conscience.', photo: '/icons/persona-meditation.jpg', alt: 'Groupe en posture de méditation lotus', blob: 'blob-a' },
    { idx: '04', name: 'Danse & mouvement', desc: "Cours hebdo, stages, présences, listes d'attente.", photo: '/icons/persona-danse.jpg', alt: 'Chorégraphe dirigeant des danseuses contemporaines', blob: 'blob-b' },
    { idx: '05', name: 'Coachs bien-être', desc: 'Suivi 1-à-1, visio, rappels personnalisés.', photo: '/icons/persona-coach.jpg', alt: "Coach en méditation lotus à côté d'un ordinateur portable", blob: 'blob-a' },
    { idx: '06', name: 'Thérapeutes', desc: 'Rendez-vous, anamnèse, factures conformes, suivi long terme.', photo: '/icons/persona-therapeutes.jpg', alt: 'Thérapeute en consultation dans son cabinet', blob: 'blob-b' },
  ];
  return (
    <section id="pour-qui" className="rule-top">
      <div className="container">
        <Head eyebrow="Pour qui">Si tu travailles seul·e<br /><span className="accent">ou en petit collectif…</span></Head>
        <div className="personas reveal r-stagger">
          {personas.map(p => (
            <div key={p.idx} className="persona">
              <div className={`pic ${p.blob}`}>
                <Image src={p.photo} alt={p.alt} fill sizes="72px" style={{ objectFit: 'cover' }} />
              </div>
              <div>
                <div className="idx mono">{p.idx}</div>
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

/* ---- FONDATRICE ---------------------------------------------- */
// « On crée ton studio » (v96, 2026-08-23) — le guichet public de la
// création concierge que l'équipe fait déjà en visio depuis le 21/08. Ce qui a
// coûté une bêta (Kim, partie sur un concurrent pour la rentrée), c'est le
// temps de mise en route, pas le produit.
export function Concierge() {
  return (
    <section className="section rule-top" id="concierge">
      <div className="wrap conc-grid">
        <div>
          <span className="eyebrow mono">Mise en route</span>
          <h2 className="conc-h2">On monte ton studio,<br /><span className="accent">tu ouvres les yeux dessus</span></h2>
          <p className="conc-lead">
            Le plus dur, ce n&apos;est pas l&apos;outil : c&apos;est de trouver la soirée pour tout
            saisir. Alors on le fait à ta place. Tu nous donnes ton planning et tes tarifs,
            on te livre ton studio prêt à l&apos;emploi sous 48 h ouvrées.
          </p>
          <ul className="conc-liste">
            <li>Tes cours et tes récurrences, déjà créés</li>
            <li>Tes carnets et tes abonnements, déjà paramétrés</li>
            <li>Tes lieux, ton portail élève, ta page publique</li>
            <li>Tes élèves si tu nous envoies ta liste, sinon tu les ajoutes quand tu veux</li>
          </ul>
          <Link href="/creer-mon-studio" className="btn btn-primary btn-lg">On me monte mon studio →</Link>
          <p className="conc-note">Gratuit, sans engagement. C&apos;est Maude qui s&apos;en occupe.</p>
        </div>
        <div className="conc-carte">
          <div className="conc-etape"><b>1.</b> Tu remplis un formulaire, cinq minutes</div>
          <div className="conc-etape"><b>2.</b> On te répond et on construit</div>
          <div className="conc-etape"><b>3.</b> Tu reçois ton accès, tout est en place</div>
        </div>
      </div>
      <style jsx>{`
        .conc-grid { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 48px; align-items: center; }
        .conc-h2 {
          font-family: var(--font-display), serif; font-weight: 400;
          font-size: clamp(1.9rem, 3.4vw, 2.7rem); line-height: 1.1;
          margin: 12px 0 16px; color: var(--c-ink);
        }
        .conc-h2 .accent { color: var(--c-accent-deep); }
        .conc-lead { color: var(--c-ink-soft); line-height: 1.6; margin: 0 0 18px; }
        .conc-liste { list-style: none; padding: 0; margin: 0 0 26px; }
        .conc-liste li {
          position: relative; padding-left: 24px; margin-bottom: 9px;
          color: var(--c-ink); font-size: 0.95rem;
        }
        .conc-liste li::before {
          content: '✓'; position: absolute; left: 0; color: var(--c-accent-deep); font-weight: 700;
        }
        .conc-note { font-size: 0.85rem; color: var(--c-ink-soft); margin: 12px 0 0; }
        .conc-carte {
          display: flex; flex-direction: column; gap: 12px;
          background: var(--c-bg-sage, #eef1ea); border-radius: 20px; padding: 28px;
        }
        .conc-etape { font-size: 0.95rem; color: var(--c-ink); line-height: 1.5; }
        .conc-etape b { color: var(--c-accent-deep); margin-right: 6px; }
        @media (max-width: 860px) {
          .conc-grid { grid-template-columns: 1fr; gap: 28px; }
        }
      `}</style>
    </section>
  );
}

export function Founder() {
  return (
    <section className="rule-top zen">
      <ZenLayer blobs={[['b1', { top: '-8%', left: '-8%' }], ['b3', { bottom: '-14%', right: '-6%' }]]} />
      <div className="container founder reveal">
        {/* Photo placeholder : à remplacer par une vraie photo de Maude */}
        <div className="founder-photo blob-a">
          <Image src="/icons/maude-foret.jpg" alt="Maude, fondatrice d'IziSolo, assise en forêt" width={2592} height={3240} sizes="(max-width: 800px) 320px, 420px" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div className="founder-copy">
          <span className="eyebrow-line">Qui est derrière IziSolo</span>
          <blockquote className="serif">
            « J&apos;ai créé IziSolo parce que je suis prof de yoga, et que je passais mes soirées sur
            Excel au lieu de préparer mes cours. <span className="accent">Je voulais un outil calme, qui me ressemble.</span> »
          </blockquote>
          <div className="who">
            <div>
              <div className="sig serif">Maude</div>
              <div className="role mono">Fondatrice · Prof de yoga</div>
            </div>
          </div>
          <div className="fr">☼ Conçue, développée et hébergée en France</div>
        </div>
      </div>
    </section>
  );
}

/* ---- TARIFS — 2 plans (grille définitive Colin 2026-07-27 :
   Essentiel 15 € / Complet 29 € TTC). Items alignés sur la matrice
   CAPACITES (constantes.js) : tout ce qui touche l'élève = Complet,
   tout ce que la prof gère seule = Essentiel. Factures, QR code et
   planning intégrable = tous les plans, donc listés en Essentiel.
   Offre de lancement LANCEMENT50 (−50 % pendant 3 mois). */
export function Pricing() {
  const plans = [
    {
      name: 'Essentiel',
      price: '15',
      desc: 'Ton cahier, en mieux. Tout ce que tu gères seule, sans aucune limite de volume.',
      features: [
        'Élèves illimités · fiches complètes · fusion des doublons en 1 clic',
        "Import/export CSV de ta base : tes données t'appartiennent",
        'Agenda, récurrences, séries prolongeables, lieux illimités',
        'Pointage 1-clic + carnets et abos gérés à la main',
        'Mini-compta : encaissements, « à percevoir », export comptable',
        'Vraies factures numérotées (ton SIRET suffit pour activer)',
        'Cas à traiter : no-show, paiement en attente, tout au même endroit',
        'Ta vitrine : planning public, appli installable, QR code à imprimer, planning intégrable sur ton site',
      ],
      featured: false,
    },
    {
      name: 'Complet',
      price: '29',
      desc: 'Tes élèves entrent dans la boucle : ils réservent, annulent, paient et te parlent en ligne.',
      features: [
        'Tout du plan Essentiel',
        "Réservation en ligne + annulation élève + règles d'annulation à ta façon",
        'Espace élève connecté : compte, historique, rappel la veille de chaque séance',
        "Cours d'essai · liste d'attente automatique · cours privés sur invitation",
        "Documents d'inscription (questionnaire santé, CGV) proposés à l'inscription",
        'Messagerie · annonces groupées · sondages planning',
        "Paiement en ligne sur ton propre Stripe : carnets ET séance à l'unité",
        'Cours en visio : ton lien Zoom ou Meet servi aux élèves à jour, déverrouillé dès le paiement',
        'Import de fiche élève par photo (IA)',
      ],
      featured: true,
    },
  ];

  return (
    <section id="tarifs" className="rule-top pricing">
      <div className="container">
        <Head eyebrow="Tarifs" sub="14 jours d'essai gratuit · sans carte bancaire · annulable en 1 clic.">
          Simple,<br /><span className="accent">comme tout le reste.</span>
        </Head>
        <div className="promo reveal">
          Offre de lancement : <b>−50 % pendant tes 3 premiers mois</b> avec le code <span className="code mono">LANCEMENT50</span>
        </div>
        <div className="prices reveal r-stagger">
          {plans.map((p, i) => (
            <div key={i} className={`price ${p.featured ? 'featured' : ''}`}>
              {p.featured && <span className="tag">Le plus choisi</span>}
              <div className="nm serif">{p.name}</div>
              <div className="amt"><b className="serif">{p.price} €</b><span>/mois</span></div>
              <div className="ds">{p.desc}</div>
              <ul>
                {p.features.map(f => (
                  <li key={f}><span className="ck"><CheckIcon /></span> {f}</li>
                ))}
              </ul>
              <Link href="/register" className={`btn ${p.featured ? 'btn-primary' : 'btn-ghost'}`}>
                Essayer 14 jours · sans CB
              </Link>
            </div>
          ))}
        </div>
        <p className="stripe-note">
          Paiements en ligne (Complet) : <strong>tu encaisses sur ton propre compte Stripe</strong>.
          Frais transparents : 1 % IziSolo (sur ta facture mensuelle, jamais prélevé sur tes paiements)
          + frais Stripe standard (1,5 % + 0,25 € par transaction).
        </p>
      </div>
    </section>
  );
}

/* ---- FAQ ---------------------------------------------------- */
export function FAQ() {
  // Items extraits dans content/faq.js (source unique partagée avec le
  // Schema.org FAQPage de app/page.js → rich snippets Google).
  const items = FAQ_ITEMS;
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="rule-top faq">
      <div className="container">
        <Head eyebrow="FAQ">Questions<br /><span className="accent">fréquentes.</span></Head>
        <div className="faq-list reveal">
          {items.map((it, i) => (
            <button key={i} type="button" className={`faq-item ${open === i ? 'open' : ''}`} aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
              <div className="faq-q">
                <span className="q serif">{it.q}</span>
                <span className="pm" aria-hidden="true">+</span>
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

/* ---- CTA FINAL ----------------------------------------------- */
export function FinalCta() {
  return (
    <section id="cta" className="final zen">
      <ZenLayer blobs={[
        ['b1', { top: '-20%', left: '50%', transform: 'translateX(-50%)' }],
        ['b2', { bottom: '-30%', right: '-6%' }],
        ['b3', { bottom: '-10%', left: '-6%' }],
      ]} />
      <div className="container">
        <span className="eyebrow-line">Prêt·e&nbsp;?</span>
        <h2 className="serif">
          Lance ton studio<br />
          <span className="accent">en 5 minutes.<AccentUnderline /></span>
        </h2>
        <p>
          14 jours d&apos;essai gratuit · sans carte bancaire · annulable en 1 clic.
          On t&apos;accompagne par message si tu cales, réponse sous 24 h.
        </p>
        <div className="ctas">
          <Link href="/register" className="btn btn-primary btn-lg">Créer mon studio →</Link>
          <a href="mailto:bonjour@izisolo.fr" className="btn btn-ghost btn-lg">Parler à l&apos;équipe</a>
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
          <p>L&apos;outil de gestion calme et beau pour les indépendant·e·s du bien-être. Créé par Maude, prof de yoga, en France.</p>
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
          title="Ressources"
          links={[
            { label: 'Outils gratuits', href: '/outils' },
            { label: 'Le journal', href: '/blog' },
            { label: 'Calculateur de frais', href: '/calculateur' },
            { label: 'Profs de yoga', href: '/profs-de-yoga' },
            { label: 'Profs de yoga enfants', href: '/profs-de-yoga-enfants' },
            { label: 'Profs de pilates', href: '/profs-de-pilates' },
            { label: 'Profs de méditation', href: '/profs-de-meditation' },
            { label: 'Profs de danse', href: '/profs-de-danse' },
            { label: 'Coachs bien-être', href: '/coachs-bien-etre' },
            { label: 'Thérapeutes', href: '/therapeutes' },
            { label: 'Sophrologues', href: '/sophrologues' },
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
        <span className="mono">bonjour@izisolo.fr</span>
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
