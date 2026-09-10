'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { IziSoloLogo } from './Brand';
import { FAQ_ITEMS } from '@/content/faq';
import VISUELS from '@/public/icons/landing/manifest.json';
import ReelPhone from './ReelPhone';
import Callouts from './Callouts';

/* ================================================================
   Landing v4 « en mouvement » (2026-09-09, demande Colin : « des vidéos
   du même genre que le réel, alterner avec des hauts de mockups, des
   flèches animées, une belle photo en fond de section »).
   · Les CLIPS du réel (reel/src/scenes.js → reel/scripts/rendre-clips.mjs)
     vivent dans les téléphones : hero (navigation), réservation (portail),
     encaissement (vente, haut du téléphone seulement), messagerie.
   · Entre deux clips, un HAUT DE MOCKUP desktop fixe (agenda, revenus)
     fléché en SVG dans la page (Callouts) : net à toute taille, texte vrai.
   · UNE photo pleine largeur, en fond du CTA final (photo-mala.jpg) : la
     seule image de banque qui tient la palette ; les images Gemini restent
     hors landing (zéro faux, jusque dans les écrans qu'elles affichent).
   La discipline v3 tient : un alignement, un souligné, des visuels réels.
   ================================================================ */

/* ================================================================
   Landing v3 « claire » (2026-09-06, plan de lancement rentrée).
   Une règle par problème constaté face aux concurrents :
   · un seul alignement (à gauche) et un seul rythme d'espacement ;
   · une seule signature décorative : le souligné cuivre du hero
     (plus de blobs, de texture, de pastilles flottantes, de tirets) ;
   · un seul visuel produit dans le hero, LISIBLE (le pointage sur
     un téléphone), et des visuels réels recadrés sur chaque rangée ;
   · 4 rangées au lieu de 4 bénéfices + 4 rangées + 6 mini-cartes ;
   · 5 puces par tarif, 6 questions à l'écran (les autres en repli).
   Tout visuel vient du démo Atelier Soleil : scripts/shoot-landing-visuels.mjs
   les refait quand l'UI change. Zéro faux témoignage, zéro tiret quadratin.
   ================================================================ */

// Visuels réels (public/icons/landing/, dimensions du manifest écrit par le script).
const V = (id, alt) => ({ src: `/icons/landing/${id}.jpg`, alt, width: VISUELS[id].w, height: VISUELS[id].h });
const VISUEL = {
  agenda:  V('row-agenda',  'Agenda IziSolo en vue semaine'),
  revenus: V('row-revenus', 'Revenus IziSolo : encaissé sur trois mois, par mode de paiement, et le reste à percevoir'),
};

/* ---- Helpers partagés ---------------------------------------- */

// Haut de mockup desktop : barre de navigateur + capture, le bas qui s'efface
// (`coupe`) quand la capture est plus haute que ce qu'on veut montrer.
function MockupDesktop({ visuel, url, coupe = false, hauteur, sizes = '(max-width: 760px) 92vw, 700px' }) {
  return (
    <div className={`mock-desk ${coupe ? 'mock-coupe' : ''}`} style={hauteur ? { '--mock-h': `${hauteur}px` } : undefined}>
      <div className="mock-bar" aria-hidden="true"><i /><i /><i /><span className="mock-url">izisolo.fr/{url}</span></div>
      <div className="mock-body">
        <Image src={visuel.src} alt={visuel.alt} width={visuel.width} height={visuel.height} sizes={sizes} data-cible-ref="" />
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

// LA signature décorative conservée : le souligné cuivre « main levée »
// sous « Plus de tapis. » (hero) et sous l'accent du CTA final.
function AccentUnderline() {
  return (
    <svg className="accent-underline" viewBox="0 0 430 14" preserveAspectRatio="none" fill="none" aria-hidden="true">
      <path d="M3 9C120 3 260 2 427 7" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

// Tête de section v3 : eyebrow, H2, sous-titre facultatif, tout à gauche.
function Head({ eyebrow, sub, children }) {
  return (
    <div className="head reveal">
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="serif">{children}</h2>
      {sub && <p className="head-sub">{sub}</p>}
    </div>
  );
}

// Téléphone : cadre sombre, écran arrondi, une image dedans. `coupe` = le bas
// du téléphone sort du panneau (rangées), sinon téléphone entier (hero).
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
        <nav className="nav-links" aria-label="Navigation principale">
          <a href="#fonctionnalites">Fonctionnalités</a>
          <a href="#tarifs">Tarifs</a>
          <a href="#pour-qui">Pour qui</a>
          {/* Journal, outils et FAQ vivent sous une seule entrée : quatre
              entrées lisibles d'un coup d'œil au lieu de sept. Menu CSS pur
              (survol + focus clavier), rien à hydrater. */}
          <div className="nav-menu">
            <button type="button" className="nav-menu-btn" aria-haspopup="true">
              Ressources
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
            <div className="nav-menu-panel">
              <Link href="/blog">Le journal</Link>
              <Link href="/outils">Outils gratuits</Link>
              <Link href="/calculateur">Calculateur de frais</Link>
              <Link href="/changer-d-outil">Changer d’outil</Link>
              <a href="#faq">Questions fréquentes</a>
            </div>
          </div>
        </nav>
        <div className="nav-cta">
          <Link href="/login" className="nav-link-soft">Se connecter</Link>
          <Link href="/register" className="btn btn-primary btn-sm">Essayer gratuitement</Link>
        </div>
      </div>
    </header>
  );
}

/* ---- HERO ----------------------------------------------------- */
// Deux colonnes : la promesse à gauche, UN visuel à droite (le pointage
// d'une vraie séance du démo, sur un téléphone). Le concierge est le bouton
// principal (plan de lancement rentrée 2026 : le trou est l'activation, pas
// la notoriété) ; l'essai reste en bouton fantôme. Jamais deux CTA de même
// poids, l'invariant de v96 tient. Pas de .reveal ici : au-dessus de la ligne
// de flottaison, une animation au scroll ne démarre jamais dans Safari (§12).
export function Hero() {
  return (
    <section className="hero-v3">
      <div className="container hero-v3-grid">
        <div className="hero-v3-copy">
          <span className="eyebrow">Pour les profs de yoga, pilates, danse et bien-être</span>
          <h1 className="serif">
            Moins de soucis.<br />
            <span className="accent">Plus de tapis.<AccentUnderline /></span>
          </h1>
          <p className="hero-v3-lead">
            Agenda, réservations, paiements, factures, messagerie : un seul outil, clair et calme.
            IziSolo gère les cas pénibles à ta place, tu reviens à tes cours et à tes élèves.
          </p>
          <div className="hero-v2-ctas hero-v3-ctas">
            <Link href="/creer-mon-studio" className="btn btn-primary btn-lg">On monte ton studio pour toi</Link>
            <Link href="/register" className="btn btn-ghost btn-lg">Essayer 30 jours, sans CB</Link>
          </div>
          <p className="hero-concierge">
            Gratuit, sous 48 h, c&apos;est Maude qui s&apos;en occupe. Ou tu pars seule, sans carte bancaire.
          </p>
        </div>
        <div className="hero-v3-visuel">
          <ReelPhone clip="navigation" priorite sizes="(max-width: 900px) 260px, 300px"
            titre="IziSolo sur un téléphone : l'accueil du studio, le menu qui s'ouvre, l'agenda de la semaine" />
        </div>
      </div>
    </section>
  );
}

/* ---- BANDE DE CONFIANCE -------------------------------------- */
// Quatre faits vérifiables, aucun chiffre inventé : la seule « preuve
// sociale » qu'on s'autorise tant que les témoignages nommés n'existent pas.
export function TrustStrip() {
  return (
    <section className="trust" aria-label="Ce qu'il faut savoir">
      <div className="container trust-grid">
        <div className="trust-item">
          <Image src="/icons/maude-avatar.jpg" alt="Maude" width={200} height={200} className="trust-avatar" />
          <span>Créée par <b>Maude</b>, prof de yoga</span>
        </div>
        <div className="trust-item">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2L3 6v6c0 5 3.8 8.6 9 10 5.2-1.4 9-5 9-10V6l-9-4z" /></svg>
          <span>Conçue et hébergée en France</span>
        </div>
        <div className="trust-item">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></svg>
          <span>30 jours d&apos;essai, sans carte bancaire</span>
        </div>
        <div className="trust-item">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
          <span>Sans engagement, résiliable en un clic</span>
        </div>
      </div>
    </section>
  );
}

/* ---- FONCTIONNALITÉS (4 rangées) ------------------------------ */
function FeatRow({ k, title, desc, bullets, media, flip }) {
  return (
    <div className={`feat reveal ${flip ? 'flip' : ''}`}>
      <div className="feat-copy">
        <span className="eyebrow">{k}</span>
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
    <section id="fonctionnalites" className="features-v3">
      <div className="container">
        <Head eyebrow="Fonctionnalités">Tout ce qu&apos;il te faut. <span className="accent">Rien de plus.</span></Head>

        <FeatRow
          k="Agenda"
          title="Ton agenda tourne tout seul"
          desc="Cours à l'unité, séries hebdo ou mensuelles, exceptions, vacances : tu configures une fois, l'app déroule. Une série qui se termine se prolonge en deux clics."
          bullets={[
            'Plusieurs lieux, aucun supplément',
            'Rappel automatique la veille de chaque séance',
            'Planning intégrable sur ton propre site',
          ]}
          media={(
            <Callouts points={[
              { cible: [36, 76], carte: [3, 82], courbure: -40,
                label: 'Séries récurrentes', sous: 'Vacances et fériés sautés, une fois pour toutes' },
              { cible: [82, 9], carte: [56, 82], courbure: 40,
                label: 'Jour, semaine, mois', sous: 'Ton planning à l’échelle du moment' },
            ]}>
              <MockupDesktop visuel={VISUEL.agenda} url="agenda" />
            </Callouts>
          )}
        />

        <FeatRow
          flip
          k="Réservation"
          title="Tes élèves réservent sans toi"
          desc="Un portail à ton nom, installable comme une appli sur leur téléphone. Réservation d'une séance ou d'une série, confirmation par email, liste d'attente automatique quand c'est complet."
          bullets={[
            "Cours d'essai, validation automatique ou à la main",
            'Visibilité par cours : public, inscrits, abonnés, sur invitation',
            'Place libérée : la première en attente est prévenue',
          ]}
          media={(
            <div className="feat-panneau">
              <ReelPhone clip="portail" coupe sizes="(max-width: 760px) 240px, 300px"
                titre="Le planning public d'un studio sur IziSolo, qui défile jusqu'aux places disponibles" />
            </div>
          )}
        />

        <FeatRow
          k="Encaisser"
          title="Encaisse comme tes élèves te paient"
          desc="Payé maintenant, à régler plus tard, en plusieurs fois, ou en plusieurs moyens le même jour : chaque euro est enregistré avec son mode de règlement, et part en compta au bon endroit."
          bullets={[
            'Espèces + carte le même jour, chacun sur sa ligne',
            'Échéancier : le reste s\'encaisse en un clic, à chaque versement',
            'Virement : RIB et QR code envoyés à l\'élève par email',
          ]}
          media={(
            <div className="feat-panneau feat-panneau-court">
              <ReelPhone clip="vente" coupe sizes="(max-width: 760px) 240px, 300px"
                titre="Le tunnel de vente IziSolo : espèces et carte le même jour, puis un échéancier en trois fois" />
            </div>
          )}
        />

        <FeatRow
          flip
          k="Revenus"
          title="L'argent rentre, et tu vois tout"
          desc="Carnets, abonnements, séances à l'unité : l'app suit chaque centime, sépare ce qui est encaissé de ce qu'on te doit, et te mâche ta déclaration URSSAF."
          bullets={[
            '« À percevoir » : tout ce qu\'on te doit, encaissable en un clic',
            'Vraies factures numérotées, téléchargées par tes élèves',
            'Paiement CB en ligne sur ton propre Stripe, y compris à la séance',
          ]}
          media={(
            <Callouts points={[
              { cible: [25, 32], carte: [4, 80], courbure: 50,
                label: 'Encaissé, à jour', sous: 'À chaque paiement, par mode de règlement' },
              { cible: [58, 30], carte: [56, 80], courbure: -40,
                label: 'Ce qu’on te doit', sous: 'Relancé pour toi, encaissable en un clic' },
            ]}>
              <MockupDesktop visuel={VISUEL.revenus} url="revenus" coupe hauteur={340} />
            </Callouts>
          )}
        />

        <FeatRow
          k="Communication"
          title="Ta communication, sans y passer tes soirées"
          desc="Messagerie intégrée, annonces groupées, canaux par cours. Tes élèves reçoivent un email dès que tu écris, avec ta vraie adresse en réponse. Une séance annulée ? Chaque élève est prévenue, et son crédit restitué."
          bullets={[
            "Relances d'impayés et rappels automatiques",
            'Sondage planning : tes élèves votent, tu crées les cours en deux clics',
            "Cours en visio : le lien n'est servi qu'aux élèves à jour",
          ]}
          media={(
            <div className="feat-panneau">
              <ReelPhone clip="messagerie" coupe sizes="(max-width: 760px) 240px, 300px"
                titre="La messagerie IziSolo : le canal d'un cours de yoga pleine lune, avec une photo et les réponses des élèves" />
            </div>
          )}
        />
      </div>
    </section>
  );
}

/* ---- POUR QUI (une ligne de liens vers les pages métier) ------ */
// Les six personas gardent leur entrée de nav et leurs liens internes (SEO),
// sans les photos ni les cartes : une ligne suffit à dire « c'est pour toi ».
export function ForWhom() {
  const personas = [
    { name: 'Profs de yoga', href: '/profs-de-yoga' },
    { name: 'Pilates', href: '/profs-de-pilates' },
    { name: 'Méditation', href: '/profs-de-meditation' },
    { name: 'Danse et mouvement', href: '/profs-de-danse' },
    { name: 'Coachs bien-être', href: '/coachs-bien-etre' },
    { name: 'Thérapeutes', href: '/therapeutes' },
  ];
  return (
    <section id="pour-qui" className="pourqui">
      <div className="container pourqui-grid reveal">
        <div>
          <span className="eyebrow">Pour qui</span>
          <h2 className="serif">Si tu travailles seul·e, <span className="accent">ou en petit collectif.</span></h2>
        </div>
        <ul className="pourqui-liste">
          {personas.map(p => (
            <li key={p.href}><Link href={p.href}>{p.name}</Link></li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---- ON MONTE TON STUDIO (concierge, v96) ---------------------- */
// Le guichet public de la création concierge. Depuis le 2026-09-06 c'est LE
// chemin mis en avant : un essai qui commence seul finit vide (quatre essais
// sur onze morts à zéro cours), un studio monté par Maude se garde.
export function Concierge() {
  return (
    <section className="conc" id="concierge">
      <div className="container conc-grid">
        <div className="conc-copy">
          <span className="eyebrow">Mise en route</span>
          <h2 className="serif">On monte ton studio,<br /><span className="accent">tu ouvres les yeux dessus.</span></h2>
          <p className="conc-lead">
            Le plus dur, ce n&apos;est pas l&apos;outil, c&apos;est de trouver la soirée pour tout saisir.
            Alors on le fait à ta place. Tu nous donnes ton planning et tes tarifs, on te livre ton
            studio prêt à l&apos;emploi sous 48 h.
          </p>
          <ul className="conc-liste">
            <li><span className="ck"><CheckIcon /></span> Tes cours et tes récurrences, déjà créés</li>
            <li><span className="ck"><CheckIcon /></span> Tes carnets, tes abonnements, ton portail élève</li>
            <li><span className="ck"><CheckIcon /></span> Tes élèves importées depuis un autre outil, un tableur ou un cahier</li>
          </ul>
          <div className="conc-ctas">
            <Link href="/creer-mon-studio" className="btn btn-primary btn-lg">On me monte mon studio</Link>
            <span className="conc-note">Gratuit, sans engagement. C&apos;est Maude qui s&apos;en occupe.</span>
          </div>
        </div>
        <ol className="conc-carte">
          <li><span className="conc-num serif">1</span><div><b>Tu remplis un formulaire</b><span>Cinq minutes, depuis ton téléphone.</span></div></li>
          <li><span className="conc-num serif">2</span><div><b>Maude construit ton studio</b><span>Elle te pose une ou deux questions, puis elle saisit tout.</span></div></li>
          <li><span className="conc-num serif">3</span><div><b>Tu reçois ton accès</b><span>Tout est en place. Tu vérifies, tu partages le lien à tes élèves.</span></div></li>
        </ol>
      </div>
    </section>
  );
}

/* ---- FONDATRICE ---------------------------------------------- */
// Vraie photo de Maude dans son studio (2026-09-06, choisie parmi les treize
// envoyées : mains jointes devant le panneau Maude Yoga, le calme de la pose
// dit la citation). Le témoignage de Manon prendra place à côté quand elle
// aura donné son accord, jamais avant.
export function Founder() {
  return (
    <section className="founder-v3">
      <div className="container founder reveal">
        <div className="founder-photo">
          <Image src="/icons/maude-studio.jpg" alt="Maude, fondatrice d'IziSolo, mains jointes dans son studio de yoga" width={960} height={1200} sizes="(max-width: 800px) 240px, 300px" />
        </div>
        <div className="founder-copy">
          <span className="eyebrow">Qui est derrière IziSolo</span>
          <blockquote className="serif">
            « J&apos;ai créé IziSolo parce que je suis prof de yoga, et que je passais mes soirées sur
            Excel au lieu de préparer mes cours. <span className="accent">Je voulais un outil calme, qui me ressemble.</span> »
          </blockquote>
          <div className="who"><b>Maude</b> · fondatrice, prof de yoga</div>
        </div>
      </div>
    </section>
  );
}

/* ---- TARIFS — 2 plans (grille définitive Colin 2026-07-27 :
   Essentiel 15 € / Complet 29 € TTC). Cinq puces par plan, alignées
   sur la matrice CAPACITES (constantes.js) : tout ce qui touche l'élève
   = Complet, tout ce que la prof gère seule = Essentiel. Le détail
   complet vit sur la page d'inscription et dans le guide. */
export function Pricing() {
  const plans = [
    {
      name: 'Essentiel',
      price: '15',
      desc: 'Ton cahier, en mieux. Tout ce que tu gères toi-même, au même endroit.',
      features: [
        'Élèves illimités, agenda, récurrences, lieux',
        'Pointage en un clic, carnets et abonnements',
        'Encaissements, vraies factures numérotées, déclaration URSSAF',
        'Planning public, QR code, planning intégrable sur ton site',
        'Import et export de ta base élèves',
      ],
      featured: false,
    },
    {
      name: 'Complet',
      price: '29',
      desc: 'Tes élèves font le travail à ta place : elles réservent, elles paient, elles reçoivent.',
      features: [
        'Tout Essentiel',
        "Réservation en ligne, espace élève, liste d'attente",
        'Paiement CB en ligne sur ton propre Stripe',
        'Messagerie, annonces groupées, sondages planning',
        'Cours en visio : ton lien Zoom ou Meet servi aux élèves à jour',
      ],
      featured: true,
    },
  ];

  return (
    <section id="tarifs" className="pricing-v3">
      <div className="container">
        <Head eyebrow="Tarifs" sub="30 jours d'essai gratuit, sans carte bancaire, résiliable en un clic. Offre de lancement : moitié prix pendant 3 mois avec le code LANCEMENT50.">
          Simple, <span className="accent">comme tout le reste.</span>
        </Head>
        <div className="prices reveal r-stagger">
          {plans.map((p, i) => (
            <div key={i} className={`price ${p.featured ? 'featured' : ''}`}>
              {p.featured && <span className="tag">Le plus choisi</span>}
              <div className="nm serif">{p.name}</div>
              <div className="amt"><b className="serif">{p.price} €</b><span>/ mois</span></div>
              <div className="ds">{p.desc}</div>
              <ul>
                {p.features.map(f => (
                  <li key={f}><span className="ck"><CheckIcon /></span> {f}</li>
                ))}
              </ul>
              <Link href="/register" className={`btn ${p.featured ? 'btn-primary' : 'btn-ghost'}`}>
                Essayer 30 jours
              </Link>
            </div>
          ))}
        </div>
        <p className="stripe-note">
          Paiements en ligne (Complet) : <strong>tu encaisses sur ton propre compte Stripe</strong>.
          1 % IziSolo sur ta facture mensuelle, jamais prélevé sur tes paiements, plus les frais Stripe standard (1,5 % + 0,25 € par transaction).
        </p>
      </div>
    </section>
  );
}

/* ---- FAQ ---------------------------------------------------- */
// Les 13 questions de content/faq.js restent toutes dans le DOM (Schema.org
// FAQPage de app/page.js) ; l'écran en montre six, les autres se déplient.
const FAQ_VISIBLES = 6;
export function FAQ() {
  const items = FAQ_ITEMS;
  const [open, setOpen] = useState(0);
  const [toutes, setToutes] = useState(false);
  return (
    <section id="faq" className="faq-v3">
      <div className="container faq-grid">
        <div className="faq-head reveal">
          <span className="eyebrow">Questions fréquentes</span>
          <h2 className="serif">Ce qu&apos;on nous demande le plus.</h2>
          {!toutes && items.length > FAQ_VISIBLES && (
            <button type="button" className="faq-more" onClick={() => setToutes(true)}>
              Voir les {items.length - FAQ_VISIBLES} autres questions
            </button>
          )}
        </div>
        <div className="faq-list reveal">
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              className={`faq-item ${open === i ? 'open' : ''}`}
              hidden={!toutes && i >= FAQ_VISIBLES}
              aria-expanded={open === i}
              onClick={() => setOpen(open === i ? -1 : i)}
            >
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
    <section id="cta" className="final-v4">
      {/* La photo pleine largeur de la page (v4) : mains en mudra, bokeh sable et
          sauge, aucun visage — photo de banque libre de droits, la seule de la
          banque qui tient la palette. Décorative : alt vide, le texte porte. */}
      <div className="final-photo" aria-hidden="true">
        <Image src="/icons/photo-mala.jpg" alt="" fill sizes="100vw" quality={70} />
      </div>
      <div className="final-voile" aria-hidden="true" />
      <div className="container">
        <div className="final-carte">
          <div className="final-copy">
            <h2 className="serif">
              Ta rentrée, montée en 48 h.<br />
              <span className="accent">Par une prof.<AccentUnderline /></span>
            </h2>
            <p>
              Envoie-nous ton planning et ta liste d&apos;élèves. Demain, ton studio tourne.
              Ou pars seule : 30 jours d&apos;essai, sans carte.
            </p>
          </div>
          <div className="final-ctas">
            <Link href="/creer-mon-studio" className="btn btn-primary btn-lg">On me monte mon studio</Link>
            <Link href="/register" className="btn btn-ghost btn-lg btn-sur-sombre">Essayer 30 jours, sans CB</Link>
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
          <p>L&apos;outil de gestion calme et beau pour les indépendant·e·s du bien-être. Créé par Maude, prof de yoga, en France.</p>
        </div>
        <FooterCol
          title="Produit"
          links={[
            { label: 'Fonctionnalités', href: '#fonctionnalites' },
            { label: 'Tarifs', href: '#tarifs' },
            { label: 'Pour qui', href: '#pour-qui' },
            { label: 'Questions fréquentes', href: '#faq' },
            { label: 'On monte ton studio', href: '/creer-mon-studio' },
            { label: 'Changer d’outil', href: '/changer-d-outil' },
          ]}
        />
        <FooterCol
          title="Ressources"
          links={[
            { label: 'Le journal', href: '/blog' },
            { label: 'Outils gratuits', href: '/outils' },
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
          title="Compte et légal"
          links={[
            { label: 'Se connecter', href: '/login' },
            { label: 'Créer un studio', href: '/register' },
            { label: 'Mot de passe oublié', href: '/mot-de-passe-oublie' },
            { label: 'Mentions légales', href: '/legal/mentions' },
            { label: 'CGU', href: '/legal/cgu' },
            { label: 'CGV', href: '/legal/cgv' },
            { label: 'Confidentialité (RGPD)', href: '/legal/rgpd' },
          ]}
        />
      </div>
      <div className="footer-bottom container">
        <span>© 2026 IziSolo · Mélutek · fait en France</span>
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
