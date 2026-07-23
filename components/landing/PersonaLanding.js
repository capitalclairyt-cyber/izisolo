'use client';

import { useEffect } from 'react';
import { Nav, Footer, FAQ, FinalCta, Pricing } from './Sections';
import { IziSoloLogo, YogaLotusIllu, YogaTreeIllu, SunCurveIllu } from './Brand';
import Link from 'next/link';
import Image from 'next/image';
import { CITIES } from '@/content/cities';

const ILLUS = { lotus: YogaLotusIllu, tree: YogaTreeIllu, sun: SunCurveIllu };

/**
 * Landing personnalisée par persona (SEO long-tail).
 * Utilisée par :
 *   /profs-de-yoga          (persona = 'yoga')
 *   /profs-de-yoga-enfants  (persona = 'yoga-enfants')
 *   /profs-de-pilates       (persona = 'pilates')
 *   /coachs-bien-etre       (persona = 'coaching')
 *   /therapeutes            (persona = 'therapeutes')
 *   /profs-de-meditation    (persona = 'meditation')
 *   /sophrologues           (persona = 'sophrologie')
 *   /profs-de-danse         (persona = 'danse')
 */
export default function PersonaLanding({ persona }) {
  useEffect(() => {
    document.documentElement.dataset.palette = 'sable';
  }, []);

  const cfg = PERSONAS[persona];
  if (!cfg) return null;
  const Illu = ILLUS[cfg.illu] || YogaLotusIllu;

  return (
    <div className="izi-landing-root" data-palette="sable">
      <Nav />
      <main>
        {/* Hero persona-fit */}
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
                {cfg.eyebrow}
              </span>
              <h1 className="hero-title serif">
                {cfg.titre1}<br />
                <em>{cfg.titre2}</em>
              </h1>
              <p className="hero-lead">{cfg.lead}</p>
              <div className="hero-ctas">
                <Link href="/register" className="btn btn-primary btn-lg">Essayer gratuitement →</Link>
                <Link href="/" className="btn btn-ghost btn-lg">En savoir plus sur IziSolo</Link>
              </div>
            </div>
            <div className="persona-hero-photo">
              <Image
                src="/icons/hero-portrait.png"
                alt={`Professeur·e ${cfg.qui} consultant l'application IziSolo sur son téléphone`}
                width={1122}
                height={1402}
                priority
                sizes="(max-width: 768px) 100vw, 480px"
                style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 'var(--r-lg)' }}
              />
              <div className="persona-hero-illu" aria-hidden="true">
                <Illu size={140} />
              </div>
            </div>
          </div>
        </section>

        {/* Pourquoi pour ce persona */}
        <section className="benefits">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">Pour {cfg.qui}</span>
              <h2 className="serif">{cfg.h2_quoi}<br /><em>{cfg.h2_em}</em></h2>
            </div>
            <div className="benefits-grid">
              {cfg.benefices.map((b, i) => (
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

        {/* Use cases concrets */}
        <section className="features">
          <div className="container">
            <div className="section-head">
              <span className="eyebrow">Cas d'usage concrets</span>
              <h2 className="serif">Ton quotidien, simplifié.</h2>
            </div>
            <ul style={{
              listStyle: 'none', padding: 0, maxWidth: 720, margin: '0 auto',
              display: 'flex', flexDirection: 'column', gap: 18,
            }}>
              {cfg.use_cases.map((u, i) => (
                <li key={i} style={{
                  display: 'flex', gap: 16, padding: '20px 24px',
                  background: 'var(--c-surface)', borderRadius: 16,
                  border: '1px solid var(--c-line)',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'var(--c-accent-soft)', color: 'var(--c-accent-deep)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.875rem', flexShrink: 0,
                  }}>{i + 1}</div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--c-ink)', marginBottom: 4 }}>{u.titre}</div>
                    <div style={{ color: 'var(--c-ink-soft)', fontSize: '0.9375rem', lineHeight: 1.55 }}>{u.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Villes — maillage interne hub → pages locales (yoga & pilates uniquement) */}
        {(persona === 'yoga' || persona === 'pilates') && (
          <section className="benefits" aria-label="Villes">
            <div className="container">
              <div className="section-head">
                <span className="eyebrow">Partout en France</span>
                <h2 className="serif">
                  {persona === 'pilates' ? 'Le Pilates' : 'Le yoga'} <em>près de chez toi.</em>
                </h2>
                <p style={{ maxWidth: 640, margin: '14px auto 0', color: 'var(--c-ink-soft)', textAlign: 'center', lineHeight: 1.6 }}>
                  On a écrit une page rien que pour ta ville : contexte local, lieux de pratique,
                  marché et tarifs du coin. Trouve la tienne.
                </p>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 12, maxWidth: 900, margin: '0 auto',
              }}>
                {Object.entries(CITIES).map(([slug, c]) => (
                  <Link
                    key={slug}
                    href={`/prof-${persona}-${slug}`}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: 2,
                      padding: '14px 18px', borderRadius: 14,
                      background: 'var(--c-surface)', border: '1px solid var(--c-line)',
                      color: 'var(--c-ink)', textDecoration: 'none',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>
                      {persona === 'pilates' ? 'Pilates' : 'Yoga'} à {c.name}
                    </span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--c-ink-soft)' }}>{c.region}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <Pricing />
        <FAQ />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

export const PERSONAS = {
  'yoga-enfants': {
    qui: 'profs de yoga pour enfants',
    eyebrow: 'Pour les profs de yoga enfants (3-16 ans)',
    titre1: 'Gérer tes cours yoga enfants',
    titre2: 'sans s\'arracher les cheveux.',
    lead: "Cours hebdo, stages vacances scolaires, interventions écoles et mairies. Les inscriptions sont gérées par les parents, les paiements aussi, les autorisations parentales sont obligatoires. IziSolo a tous les workflows spécifiques : autorisations, contacts d'urgence, communication aux parents, conventions écoles, suivi par enfant.",
    illu: 'lotus',
    h2_quoi: 'Yoga enfants,',
    h2_em: 'l\'admin en plus.',
    benefices: [
      { kw: 'Fiche par enfant', title: 'Toutes les infos qu\'il faut', desc: "Date de naissance, école, classe, allergies, contre-indications, contacts d'urgence, droit à l'image. Tout est là, sans bricolage Excel." },
      { kw: 'Parents = comptes', title: 'Les parents inscrivent, payent, gèrent', desc: "Le parent crée un compte, inscrit son ou ses enfants, paye, reçoit les notifs. L'enfant ne touche pas à l'app — toi non plus aux SMS parents." },
      { kw: 'Stages vacances', title: 'Cycles 3-5 séances en 1 clic', desc: "Crée une offre 'Stage Toussaint 3 séances 60 €', publie le lien, les parents inscrivent leurs enfants. Pas de chronopost de chèques à gérer." },
      { kw: 'Écoles & mairies', title: 'Conventions et factures clean', desc: "Tarifs séance, planning trimestriel, facturation institution avec mention TVA. Tu joues dans la cour des grands sans armée d'administratifs." },
    ],
    use_cases: [
      { titre: 'Rentrée scolaire — créer 12 cours hebdo en 30 sec', desc: 'Tu choisis jour, heure, lieu, capacité (10 enfants), et l\'app génère les 12 occurrences du trimestre. Les parents voient le planning sur leur portail.' },
      { titre: 'Stage vacances Toussaint 3 séances', desc: 'Tu crées une offre cycle (3 séances pour 60 €), publies le lien sur tes réseaux. Les parents inscrivent leurs enfants directement, paient en ligne. Tu vois la liste en temps réel.' },
      { titre: 'Convention école — facturer la mairie', desc: 'Tu crées un "élève institutionnel" (École Jean Jaurès), planifies tes 30 séances annuelles, génères la facture trimestrielle avec ton SIRET. La mairie te paye par virement.' },
      { titre: 'Absence d\'un enfant — prévenir le parent', desc: 'L\'enfant n\'est pas là, tu pointes "absent". Si c\'est en délai d\'annulation, la séance est décomptée du carnet. Le parent reçoit automatiquement la notif.' },
    ],
  },
  yoga: {
    qui: 'profs de yoga',
    eyebrow: 'Pensé pour les profs de yoga indépendant·e·s',
    titre1: "L'outil de gestion",
    titre2: 'fait pour les yogis.',
    lead: "Hatha, Vinyasa, Yin, Ashtanga, Prénatal... Que tu donnes 3 ou 30 cours par semaine, IziSolo t'aide à gérer ton agenda, tes élèves et tes paiements en restant fidèle à l'esprit du yoga : calme, sans agressivité.",
    illu: 'lotus',
    h2_quoi: 'Yoga ne rime pas',
    h2_em: 'avec usine à gaz.',
    benefices: [
      { kw: 'Tout-en-un', title: 'Une journée plus légère', desc: "Plus de jongles entre Excel et un agenda papier. Tes cours, tes élèves, tes paiements en un seul endroit." },
      { kw: 'Vocabulaire yoga', title: 'Parle ton langage', desc: 'L\'app utilise « élève » et « séance », pas « client » et « rendez-vous ». Personnalisable par métier.' },
      { kw: 'Portail élève', title: 'Une page propre pour réserver', desc: 'Tes élèves voient tes cours et réservent en 30 secondes — sans devoir t\'envoyer un SMS.' },
      { kw: 'Annulation auto', title: "L'app applique tes règles", desc: 'Délai d\'annulation, séance comptée si tardive : c\'est l\'app qui dit non, pas toi.' },
    ],
    use_cases: [
      { titre: 'Ouvre un Vinyasa hebdo en 30 secondes', desc: 'Tu choisis le jour, l\'heure, la salle, et l\'app génère 12 occurrences automatiquement. Tes élèves le voient immédiatement sur leur portail.' },
      { titre: 'Une élève annule à la dernière minute', desc: 'Si elle est dans le délai (24h par défaut, configurable), c\'est libre. Sinon, la séance est décomptée de son carnet — toi tu n\'as pas à t\'en occuper.' },
      { titre: 'Tu pointes les présences en fin de cours', desc: 'Sur ton téléphone, en deux taps. Le carnet de chaque élève se met à jour, les paiements en attente apparaissent.' },
      { titre: 'Une retraite à organiser', desc: 'Crée une offre spéciale "Retraite Bali 2026", génère un Stripe Payment Link, partage-le sur Insta. Les inscriptions arrivent toutes seules.' },
    ],
  },
  pilates: {
    qui: 'studios pilates',
    eyebrow: 'Pour les profs et studios Pilates',
    titre1: 'Mat, Reformer,',
    titre2: 'gestion fluide.',
    lead: "Que tu enseignes seul·e ou en petit collectif, IziSolo gère ton planning, tes capacités par appareil, tes carnets et tes abonnements — sans formation longue ni tarif d'agence.",
    illu: 'tree',
    h2_quoi: 'Pilates demande de la précision —',
    h2_em: 'ton outil aussi.',
    benefices: [
      { kw: 'Capacité', title: 'Limite tes places par cours', desc: 'Tu sais qu\'un Reformer ne tient pas 12. Définis 6 places, l\'app verrouille à 6.' },
      { kw: 'Listes d\'attente', title: 'Quand un cours est complet', desc: 'L\'élève s\'inscrit en liste d\'attente. Si une place se libère, on lui envoie un email — automatiquement.' },
      { kw: 'Tarifs lisibles', title: 'Tes carnets sans calcul', desc: 'Carnets 5/10/20 séances, abonnements mensuels, cours unitaires. L\'app calcule le restant pour chaque élève.' },
      { kw: 'Import express', title: 'Changer d\'outil sans douleur', desc: 'Ton fichier d\'élèves s\'importe en quelques minutes — et l\'IA sait même lire tes fiches papier.' },
    ],
    use_cases: [
      { titre: 'Vendre un carnet 10 séances en boutique', desc: 'En 1 clic depuis la fiche élève : choix de l\'offre, mode de paiement (espèces, chèque, CB), reçu PDF généré.' },
      { titre: 'Un nouveau client à intégrer', desc: 'Crée sa fiche en 20 secondes : prénom, niveau, objectif. Plus tard, tu vois son historique complet en un coup d\'œil.' },
      { titre: 'Un cours complet à 6 — la 7e t\'écrit', desc: 'Inutile de la noter dans ton carnet. Tu lui envoies le lien, elle s\'inscrit en liste d\'attente, et l\'app la prévient si quelqu\'un annule.' },
      { titre: 'Encaisser en CB sans terminal', desc: 'Génère un Stripe Payment Link sur ton offre, l\'élève paye depuis son téléphone. L\'argent va sur ton compte. Pas de matériel à acheter.' },
    ],
  },
  coaching: {
    qui: 'coachs bien-être',
    eyebrow: 'Pour les coachs en accompagnement individuel ou collectif',
    titre1: 'Ton coaching mérite',
    titre2: 'mieux qu\'un Calendly.',
    lead: "Sessions individuelles, programmes en groupe, suivi sur la durée. IziSolo réunit tes RDV, tes notes confidentielles et tes paiements dans un outil pensé pour le bien-être.",
    illu: 'sun',
    h2_quoi: 'Au-delà du calendrier,',
    h2_em: "garde le lien avec tes client·e·s.",
    benefices: [
      { kw: 'Fiches client·e·s', title: 'Garde la mémoire', desc: 'Notes confidentielles, objectifs, historique des séances. Tout reste accessible mais privé.' },
      { kw: 'Programmes', title: 'Vends des séries', desc: 'Pack de 5 séances, programme 3 mois — IziSolo gère le décompte automatique.' },
      { kw: 'Communication', title: 'Reste présent·e', desc: 'Templates email pour relancer, féliciter, accompagner. Sans avoir à tout retaper.' },
      { kw: 'Mini-compta', title: 'Tu sais ce qui rentre', desc: 'Espèces, chèques, virements, CB : tout au même endroit. Export CSV pour ton comptable.' },
    ],
    use_cases: [
      { titre: 'Un·e nouveau·elle client·e', desc: 'Tu crées sa fiche, ses objectifs, son budget. Tout est en place pour démarrer la 1re séance.' },
      { titre: 'Programmer 5 séances mensuelles', desc: 'Tu vends un pack de 5, l\'app décompte à chaque RDV. Tu vois en temps réel les crédits restants.' },
      { titre: 'Une absence à gérer', desc: 'Selon ta règle (24h, 48h, 72h), l\'app applique la politique automatiquement — tu n\'as pas à expliquer la facture.' },
      { titre: 'Un message hebdomadaire à tous tes client·e·s', desc: 'Un template, un clic, c\'est envoyé. Pas besoin d\'un outil de mailing séparé.' },
    ],
  },
  therapeutes: {
    qui: 'thérapeutes & praticien·ne·s bien-être',
    eyebrow: 'Pour sophro, naturo, énergéticien·ne·s, hypno...',
    titre1: 'Une alternative douce',
    titre2: 'à Doctolib.',
    lead: "Spécialement pensé pour les praticien·ne·s non-conventionné·e·s : agenda public, fiche patient·e RGPD-friendly, paiements et facturation conformes — sans la lourdeur médicale.",
    illu: 'lotus',
    h2_quoi: 'Tu pratiques pour aider —',
    h2_em: "pas pour gérer.",
    benefices: [
      { kw: 'RDV en ligne', title: 'Page de prise de RDV publique', desc: 'Tes patient·e·s réservent leur créneau seul·e·s, à toute heure.' },
      { kw: 'RGPD-friendly', title: 'Données hébergées en Europe', desc: 'Supabase Frankfurt + Vercel Paris. Pas de transfert hors UE.' },
      { kw: 'Annulation auto', title: 'Délai et règles à toi', desc: 'Tu fixes ton délai d\'annulation libre. Au-delà, la séance est due — l\'app applique sans ambiguïté.' },
      { kw: 'Reçus PDF', title: 'Facturation conforme', desc: 'Reçu généré automatiquement après chaque encaissement. Mention TVA non applicable (art. 293 B du CGI).' },
    ],
    use_cases: [
      { titre: 'Premier RDV — anamnèse', desc: 'Tu crées la fiche patient·e avec tes notes confidentielles. Au prochain RDV, tu retrouves tout en 2 clics.' },
      { titre: 'Encaissement en chèque + virement', desc: 'L\'app gère tous les modes de paiement, pas seulement la CB. Tu enregistres le mode au paiement, c\'est dans ta compta.' },
      { titre: 'Une absence non excusée', desc: 'L\'app marque la séance comme due automatiquement. Au prochain RDV, tu vois la dette en évidence.' },
      { titre: 'Comptable de fin d\'année', desc: 'Export CSV en 1 clic. Toutes tes recettes, par mode et par mois. Plus de Excel.' },
    ],
  },
  sophrologie: {
    qui: 'sophrologues',
    eyebrow: 'Pour les sophrologues praticien·ne·s indépendant·e·s',
    titre1: 'Tes séances comptent.',
    titre2: 'Ton outil aussi.',
    lead: "Anamnèse, séances individuelles, programmes thématiques (prénatal, sommeil, stress, sport), ateliers groupe. IziSolo réunit ta page de RDV publique, ton suivi client·e·s confidentiel, et tes paiements — sans la rigidité Doctolib ni les frais de plateforme.",
    illu: 'sun',
    h2_quoi: 'La sophro mérite',
    h2_em: 'un cadre à sa hauteur.',
    benefices: [
      { kw: 'RDV public 24/7', title: 'Tes patient·e·s réservent seul·e·s', desc: 'Page de prise de RDV à ton image, accessible à toute heure. Filtres par type de séance (1ère anamnèse, séance suivi, atelier).' },
      { kw: 'Fiches confidentielles', title: 'Anamnèse et suivi en sécurité', desc: 'Notes par séance, objectifs, observations — privées et hébergées en France. Retrouvées en 2 clics au RDV suivant.' },
      { kw: 'Programmes thématiques', title: 'Vends des cycles de 6-10 séances', desc: 'Pack préparation accouchement, sommeil, gestion du stress, préparation sportive. Décompte automatique séance après séance.' },
      { kw: 'Reçus PDF conformes', title: 'Mention art. 293 B CGI', desc: 'Reçu généré automatiquement avec la mention TVA non applicable (article 293 B). Pour les patient·e·s qui en demandent à leur mutuelle.' },
    ],
    use_cases: [
      { titre: 'Première anamnèse en 3 minutes', desc: 'Tu crées la fiche pendant la séance : objectifs, contexte, historique. Au RDV suivant, tout est là — pas d\'effort de mémoire.' },
      { titre: 'Programme "préparation accouchement" 8 séances', desc: 'Tu vends un cycle complet d\'un coup, l\'app décompte à chaque RDV. La patient·e voit son avancée en temps réel.' },
      { titre: 'Atelier groupe 6 personnes — encaisser sur place', desc: 'CB, espèces, chèque, virement — l\'app enregistre chaque mode. Reçu PDF généré, exportable à fin d\'année.' },
      { titre: 'Bilan annuel pour l\'URSSAF', desc: 'Export CSV en 1 clic : toutes tes recettes, par mode de paiement, par mois. Plus jamais à reconstruire ton chiffre d\'affaires à la main.' },
    ],
  },
  meditation: {
    qui: 'profs de méditation',
    eyebrow: 'Pour les profs de méditation et mindfulness indépendant·e·s',
    titre1: 'Enseigner la présence',
    titre2: 'sans en perdre soi-même.',
    lead: "Pleine conscience, MBSR, vipassana, méditation guidée, transcendantale. Que tu enseignes en présentiel, en visio ou en retraite silencieuse, IziSolo gère ton agenda et tes participant·e·s pendant que tu restes dans la pratique.",
    illu: 'lotus',
    h2_quoi: 'La méditation,',
    h2_em: 'pas la paperasse.',
    benefices: [
      { kw: 'Sans création de compte', title: 'Inscriptions fluides pour tes élèves', desc: 'Les participant·e·s s\'inscrivent en 30 secondes, sans mot de passe à retenir. Un lien magique par email pour retrouver leurs réservations.' },
      { kw: 'Cycles MBSR 8 semaines', title: 'Vente de programmes complets', desc: 'Tu vends un cycle MBSR ou MBCT d\'un coup, l\'app gère le décompte semaine par semaine et envoie les liens visio si besoin.' },
      { kw: 'Retraites silencieuses', title: 'Gestion participant·e·s clean', desc: 'Pré-inscriptions avec acompte, validation manuelle (entretiens préalables), liste d\'attente. Tu te concentres sur la pratique, pas sur l\'admin.' },
      { kw: 'Communication respectueuse', title: 'Pas de spam, pas d\'urgence', desc: 'Notifications calmes, fréquence raisonnable, ton aligné sur ta pratique. L\'app ne harcèle pas tes méditant·e·s.' },
    ],
    use_cases: [
      { titre: 'Cycle MBSR 8 semaines — vente unique', desc: 'Tu crées une "offre programme" à 380 €, tu publies le lien, les inscriptions arrivent. L\'app gère les 8 séances + le journal de bord.' },
      { titre: 'Méditation guidée hebdo en drop-in', desc: 'Cours unique à 12 €, l\'élève peut payer en ligne ou venir avec son carnet. Pointage en 2 taps en début de séance.' },
      { titre: 'Retraite silencieuse week-end', desc: 'Page de pré-inscription avec acompte non-remboursable, entretien préalable obligatoire. Tu valides ou refuses depuis ton tableau de bord.' },
      { titre: 'Diffusion de méditations audio', desc: 'Upload tes enregistrements sur un drive partagé, ajoute le lien dans le portail. Tes élèves accèdent aux replays entre les séances.' },
    ],
  },
  danse: {
    qui: 'profs de danse',
    eyebrow: 'Pour les profs de danse indépendant·e·s',
    titre1: 'Tes cours, tes troupes,',
    titre2: 'ton studio.',
    lead: "Classique, contemporain, hip-hop, danse africaine, swing, salsa, jazz. Pour cours réguliers, stages, performances et événements. IziSolo gère ton planning multi-niveaux, tes cycles trimestriels et tes paiements échelonnés.",
    illu: 'tree',
    h2_quoi: 'La danse,',
    h2_em: 'sans la prise de tête admin.',
    benefices: [
      { kw: 'Cycles trimestriels', title: 'Vente d\'un trimestre complet', desc: 'Tu vends un cycle 10 ou 12 cours en septembre, l\'app décompte à chaque séance. Les élèves voient leur planning de cours sur 3 mois.' },
      { kw: 'Multi-niveaux par cours', title: 'Débutant, intermédiaire, avancé', desc: 'Plusieurs niveaux dans une même discipline, capacités configurables par niveau. Tes élèves choisissent leur tranche.' },
      { kw: 'Paiement échelonné 3x', title: 'Trimestre payé en 3 fois', desc: 'Stripe Payment Link gère le découpage automatiquement. Tu touches ton dû même si l\'élève abandonne en cours de trimestre.' },
      { kw: 'Stages week-end', title: 'Inscriptions + acompte en ligne', desc: 'Page dédiée par stage (ex: "Lindy hop débutant — week-end"), inscription avec acompte 30 %, liste d\'attente automatique.' },
    ],
    use_cases: [
      { titre: 'Inscription trimestre — paiement 3x', desc: 'L\'élève s\'inscrit en septembre, paye 1/3 immédiatement, 1/3 en novembre, 1/3 en janvier. Toi tu touches ton dû même en cas d\'abandon.' },
      { titre: 'Stage week-end "Lindy hop débutant"', desc: 'Page de stage à 95 €, acompte 30 €, fermeture des inscriptions 7 jours avant. Briefing logistique auto-envoyé aux inscrit·e·s.' },
      { titre: 'Cours hebdo intermédiaire complet', desc: 'Cours à 15 places maxi, liste d\'attente automatique. Quand une place se libère, l\'app prévient la 1ère personne en attente.' },
      { titre: 'Spectacle de fin d\'année — billetterie', desc: 'Crée une offre "place de spectacle 18 €", génère un lien public, partage sur Insta. Les places se vendent en ligne, tu vois le remplissage en temps réel.' },
    ],
  },
};
