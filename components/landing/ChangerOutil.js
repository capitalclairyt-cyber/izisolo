'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Nav, Footer } from './Sections';
import ScrollReveal from './ScrollReveal';
import ReelPhone from './ReelPhone';
import { DELAI_HEURES } from '@/lib/demande-studio';

// ═══════════════════════════════════════════════════════════════════════════
// « Changer d'outil » (2026-09-10). La page pour le segment le plus nombreux
// rencontré en DM cette rentrée : « je suis déjà équipée ». Elle ne promet
// que ce que le produit fait aujourd'hui, et elle DIT ce qu'on ne reprend
// pas : une page qui cache une limite fabrique une déçue à J+3.
//
// Repris : les fiches (n'importe quel export CSV ou Excel, accents compris,
// doublons fusionnés), les carnets en cours (réattribués UN PAR UN par Maude,
// avec les séances restantes), le planning (recréé en séries). Pas repris :
// l'historique des paiements et des présences de l'ancien outil.
// Aucun concurrent nommé : la règle vaut aussi ici.
// ═══════════════════════════════════════════════════════════════════════════

const REPRIS = [
  {
    titre: 'Tes élèves',
    texte: 'Depuis l’export de ton ancien outil, ou de ton tableur. Prénoms, noms, emails, téléphones : les accents tiennent, les doublons sont fusionnés, rien n’est écrasé.',
  },
  {
    titre: 'Tes carnets en cours',
    texte: 'Chaque élève retrouve son carnet avec les séances qui lui restent. C’est Maude qui les réattribue, un par un, à partir de ce que tu lui envoies.',
  },
  {
    titre: 'Ton planning',
    texte: 'Tes cours recréés en séries, jours, heures, lieux, capacités, vacances et fériés sautés. Depuis une capture, un PDF ou ta grille actuelle.',
  },
];

const ETAPES = [
  { n: '1', titre: 'Tu nous envoies ton export', texte: 'La liste de tes élèves, ton planning, tes tarifs, et pour chaque carnet en cours le nombre de séances restantes. Une photo de cahier marche aussi.' },
  { n: '2', titre: `On monte ton studio en ${DELAI_HEURES} h`, texte: 'Fiches importées, carnets réattribués, planning en place, ta page publique à ton nom. Tu reçois ton accès par email.' },
  { n: '3', titre: 'Tu compares, l’ancien outil ouvert', texte: 'Rien ne t’oblige à couper quoi que ce soit le premier jour. Tu fais tourner les deux, et tu décides quand tu es sûre.' },
];

const FAQ = [
  {
    q: 'Depuis quel outil peut-on venir ?',
    a: 'N’importe lequel qui sait exporter ta liste d’élèves en CSV ou en Excel, et c’est le cas de tous. Si le tien ne le permet pas, une capture de tes fiches ou une photo de ton cahier suffit : c’est Maude qui saisit.',
  },
  {
    q: 'Et mes paiements passés, mes présences ?',
    a: 'Ils restent dans ton ancien outil : on ne les reprend pas. Avant de le fermer, exporte-les ou garde une copie, ta compta en a besoin. Dans IziSolo, l’historique commence le jour où tu arrives, et tes carnets partent avec le bon nombre de séances.',
  },
  {
    q: 'Mes élèves doivent refaire quelque chose ?',
    a: 'Non. Elles reçoivent un lien vers leur espace, sans compte à créer, et retrouvent leurs carnets. Si tu veux, on leur envoie l’invitation groupée le jour où tu bascules.',
  },
  {
    q: 'Combien ça coûte ?',
    a: 'Rien. Le montage est gratuit et sans engagement, l’essai dure 30 jours sans carte bancaire. Ensuite 15 ou 29 € par mois, résiliable en un clic.',
  },
];

export default function ChangerOutil() {
  useEffect(() => { document.documentElement.dataset.palette = 'sable'; }, []);

  return (
    <div className="izi-landing-root" data-palette="sable">
      <ScrollReveal />
      <Nav />
      <main>
        <section className="hero-v3 cdo-hero">
          <div className="container hero-v3-grid">
            <div className="hero-v3-copy">
              <span className="eyebrow">Déjà équipée ?</span>
              <h1 className="serif">
                On reprend<br />
                <span className="accent">ce qui se reprend.</span>
              </h1>
              <p className="hero-v3-lead">
                Tes élèves depuis ton export, tes carnets avec les séances qui restent, ton planning
                recréé. Monté par Maude en {DELAI_HEURES} heures, gratuitement. Et tu gardes ton ancien
                outil ouvert le temps de comparer.
              </p>
              <div className="hero-v2-ctas hero-v3-ctas">
                <Link href="/creer-mon-studio?src=changer" className="btn btn-primary btn-lg">On reprend mon studio</Link>
                <a href="#ce-quon-reprend" className="btn btn-ghost btn-lg">Voir ce qu’on reprend</a>
              </div>
              <p className="hero-concierge">
                Rien à couper le premier jour. Rien à payer pour le montage.
              </p>
            </div>
            <div className="hero-v3-visuel">
              <ReelPhone clip="migration" priorite sizes="(max-width: 900px) 260px, 300px"
                titre="IziSolo sur un téléphone : un export d’élèves entre dans la liste, un carnet avec ses séances restantes, l’agenda qui se remplit" />
            </div>
          </div>
        </section>

        <section id="ce-quon-reprend" className="cdo-section">
          <div className="container">
            <div className="head reveal">
              <span className="eyebrow">Ce qu’on reprend</span>
              <h2 className="serif">Trois choses, et on te le dit franchement.</h2>
            </div>
            <div className="cdo-grid">
              {REPRIS.map((r) => (
                <article key={r.titre} className="cdo-card reveal">
                  <h3>{r.titre}</h3>
                  <p>{r.texte}</p>
                </article>
              ))}
            </div>
            <aside className="cdo-honnete reveal">
              <h3>Ce qu’on ne reprend pas</h3>
              <p>
                L’historique de tes paiements et de tes présences reste dans ton ancien outil. Avant de le
                fermer, exporte-le : ta comptabilité en a besoin, et personne ne peut le recréer à ta place.
                Dans IziSolo, l’historique commence le jour où tu arrives.
              </p>
            </aside>
          </div>
        </section>

        <section className="cdo-section cdo-section-alt">
          <div className="container">
            <div className="head reveal">
              <span className="eyebrow">Comment ça se passe</span>
              <h2 className="serif">Trois étapes, {DELAI_HEURES} heures.</h2>
            </div>
            <ol className="cdo-etapes">
              {ETAPES.map((e) => (
                <li key={e.n} className="reveal">
                  <span className="cdo-num">{e.n}</span>
                  <div>
                    <h3>{e.titre}</h3>
                    <p>{e.texte}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="cdo-cta reveal">
              <Link href="/creer-mon-studio?src=changer" className="btn btn-primary btn-lg">On reprend mon studio</Link>
              <p className="hero-concierge">Gratuit, sans engagement. C’est Maude qui s’en occupe.</p>
            </div>
          </div>
        </section>

        <section className="cdo-section">
          <div className="container cdo-faq">
            <div className="head reveal">
              <span className="eyebrow">Questions</span>
              <h2 className="serif">Avant de changer</h2>
            </div>
            {FAQ.map((f) => (
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
        .cdo-card {
          background: var(--c-bg-warm, #fdfbf7); border: 1px solid var(--c-accent-tint, #e8dccb);
          border-radius: 20px; padding: 24px;
        }
        .cdo-card h3, .cdo-honnete h3, .cdo-etapes h3 {
          font-family: var(--font-display), serif; font-weight: 400; font-size: 1.3rem; margin: 0 0 10px; color: var(--c-ink);
        }
        .cdo-card p, .cdo-honnete p, .cdo-etapes p { color: var(--c-ink-soft); line-height: 1.6; margin: 0; }
        .cdo-honnete {
          margin-top: 20px; border-radius: 20px; padding: 24px 28px;
          background: var(--c-bg-sage, #eef1ea); border-left: 4px solid var(--c-sage, #6f8f5e);
        }
        .cdo-etapes { list-style: none; margin: 28px 0 0; padding: 0; display: grid; gap: 18px; max-width: 760px; }
        .cdo-etapes li { display: flex; gap: 18px; align-items: flex-start; }
        .cdo-num {
          flex: 0 0 40px; width: 40px; height: 40px; border-radius: 999px; display: flex; align-items: center; justify-content: center;
          background: var(--c-accent-deep); color: #fff; font-weight: 700;
        }
        .cdo-cta { margin-top: 36px; display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }
        .cdo-faq .head, .cdo-q { max-width: 760px; }
        .cdo-q {
          border-bottom: 1px solid var(--c-line, #e8dccb); padding: 14px 0;
        }
        .cdo-q summary { cursor: pointer; font-weight: 600; color: var(--c-ink); font-size: 1.05rem; }
        .cdo-q p { margin: 10px 0 0; color: var(--c-ink-soft); line-height: 1.6; }
        @media (max-width: 900px) {
          .cdo-grid { grid-template-columns: 1fr; }
          .cdo-section { padding: 44px 0; }
        }
      `}</style>
    </div>
  );
}
