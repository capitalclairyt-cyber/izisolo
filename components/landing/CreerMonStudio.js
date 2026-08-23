'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Nav, Footer } from './Sections';
import ScrollReveal from './ScrollReveal';
import { ACTIVITES, DELAI_HEURES } from '@/lib/demande-studio';

// ═══════════════════════════════════════════════════════════════════════════
// « On crée ton studio » — le guichet public de la création concierge (v96).
//
// Ce que le formulaire NE demande PAS, volontairement : la liste des élèves.
// Un fichier de tiers déposé sur une page publique par une personne non
// authentifiée, c'est de la donnée personnelle d'autrui collectée sans canal
// sûr. Elle est réclamée juste après, dans l'email de réponse, et reste
// facultative. La page le dit, pour que l'absence ne passe pas pour un oubli.
// ═══════════════════════════════════════════════════════════════════════════

const VIDE = {
  prenom: '', nom: '', email: '', telephone: '',
  studio_nom: '', activite: '', ville: '', site_web: '',
  planning: '', offres: '', message: '',
};

export default function CreerMonStudio() {
  useEffect(() => { document.documentElement.dataset.palette = 'sable'; }, []);

  const [form, setForm] = useState(VIDE);
  const [hp, setHp] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [envoyee, setEnvoyee] = useState(null); // { emailEnvoye }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const soumettre = async (e) => {
    e.preventDefault();
    if (envoi) return;
    setEnvoi(true);
    setErreur('');
    try {
      const res = await fetch('/api/demande-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, verif_hp: hp }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Envoi impossible pour le moment.');
      setEnvoyee({ emailEnvoye: json.emailEnvoye === true });
    } catch (err) {
      setErreur(String(err.message || err));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="izi-landing-root" data-palette="sable">
      <ScrollReveal />
      <Nav />
      <main>
        <section className="cms-hero">
          <div className="cms-wrap">
            <span className="cms-eyebrow">Mise en route accompagnée</span>
            <h1 className="cms-h1">
              On monte ton studio,<br /><span className="accent">tu ouvres les yeux dessus</span>
            </h1>
            <p className="cms-sous">
              Tu remplis ce formulaire, on construit ton studio à ta place, et tu reçois
              ton accès sous {DELAI_HEURES} heures ouvrées. Ton planning, tes tarifs, tes
              lieux : déjà en place quand tu arrives. C&apos;est gratuit, et c&apos;est
              Maude qui s&apos;en occupe.
            </p>
          </div>
        </section>

        <section className="cms-form-section">
          <div className="cms-wrap">
            {envoyee ? (
              <div className="cms-merci">
                <div className="cms-merci-ico">🌿</div>
                <h2>C&apos;est noté, on s&apos;en occupe</h2>
                <p>
                  On te monte ton studio sous <strong>{DELAI_HEURES} heures ouvrées</strong> et
                  tu recevras un email avec ton accès : tu n&apos;auras plus qu&apos;à choisir
                  ton mot de passe.
                </p>
                {envoyee.emailEnvoye ? (
                  <p>
                    Un email vient de partir à <strong>{form.email}</strong>. Réponds-y avec ton
                    planning, tes tarifs, et ta liste d&apos;élèves si tu l&apos;as sous la main :
                    ça nous permet de tout paramétrer avant que tu arrives. Rien
                    d&apos;obligatoire, on se débrouille avec ce que tu as.
                  </p>
                ) : (
                  <p>
                    Écris-nous à <a href="mailto:bonjour@izisolo.fr">bonjour@izisolo.fr</a> avec
                    ton planning et tes tarifs : ça nous permet de tout paramétrer avant que
                    tu arrives.
                  </p>
                )}
                <Link href="/" className="cms-btn cms-btn-ghost">Retour à l&apos;accueil</Link>
              </div>
            ) : (
              <form className="cms-form" onSubmit={soumettre}>
                <h2 className="cms-form-titre">Parle-nous de toi</h2>

                <div className="cms-row">
                  <label className="cms-champ">
                    <span>Prénom *</span>
                    <input value={form.prenom} onChange={set('prenom')} required maxLength={80} autoComplete="given-name" />
                  </label>
                  <label className="cms-champ">
                    <span>Nom</span>
                    <input value={form.nom} onChange={set('nom')} maxLength={80} autoComplete="family-name" />
                  </label>
                </div>

                <div className="cms-row">
                  <label className="cms-champ">
                    <span>Email *</span>
                    <input type="email" value={form.email} onChange={set('email')} required maxLength={160} autoComplete="email" />
                  </label>
                  <label className="cms-champ">
                    <span>Téléphone</span>
                    <input type="tel" value={form.telephone} onChange={set('telephone')} maxLength={40} autoComplete="tel" />
                  </label>
                </div>

                <h2 className="cms-form-titre">Ton activité</h2>

                <div className="cms-row">
                  <label className="cms-champ">
                    <span>Nom de ton studio</span>
                    <input value={form.studio_nom} onChange={set('studio_nom')} maxLength={120} placeholder="Ex : L'Atelier Soleil" />
                  </label>
                  <label className="cms-champ">
                    <span>Ville</span>
                    <input value={form.ville} onChange={set('ville')} maxLength={120} autoComplete="address-level2" />
                  </label>
                </div>

                <div className="cms-row">
                  <label className="cms-champ">
                    <span>Ce que tu enseignes</span>
                    <select value={form.activite} onChange={set('activite')}>
                      <option value="">Choisis…</option>
                      {ACTIVITES.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </label>
                  <label className="cms-champ">
                    <span>Ton site ou ton Instagram</span>
                    <input value={form.site_web} onChange={set('site_web')} maxLength={300} placeholder="https://…" />
                  </label>
                </div>

                <label className="cms-champ">
                  <span>Ton planning</span>
                  <textarea
                    value={form.planning} onChange={set('planning')} rows={4} maxLength={4000}
                    placeholder="Ex : Hatha lundi 18h30 et jeudi 12h15 à la salle des fêtes, Yin samedi 10h chez moi. Reprise le 8 septembre."
                  />
                  <small>Copie-colle ta grille actuelle, on s&apos;en contente très bien.</small>
                </label>

                <label className="cms-champ">
                  <span>Tes tarifs</span>
                  <textarea
                    value={form.offres} onChange={set('offres')} rows={4} maxLength={4000}
                    placeholder="Ex : carnet 10 séances 120 €, abonnement au mois 55 €, cours d'essai 10 €."
                  />
                  <small>Carnets, abonnements, cours à l&apos;unité, tarif d&apos;essai.</small>
                </label>

                <label className="cms-champ">
                  <span>Autre chose ?</span>
                  <textarea value={form.message} onChange={set('message')} rows={3} maxLength={4000} />
                </label>

                {/* Honeypot : identité DOM opaque (incident autofill Nathalie
                    2026-07-30 — un champ nommé « website » se faisait remplir
                    par le remplissage automatique d'une vraie élève). */}
                <input
                  type="text" name="verif_hp" value={hp} onChange={e => setHp(e.target.value)}
                  tabIndex={-1} autoComplete="off" aria-hidden="true"
                  style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
                />

                <div className="cms-note">
                  <strong>Et tes élèves ?</strong> On ne te les demande pas ici : une liste de
                  personnes n&apos;a pas sa place sur un formulaire public. Tu pourras nous
                  l&apos;envoyer en répondant à l&apos;email que tu vas recevoir, si tu le
                  souhaites. Sans elle aussi, ton studio sera prêt.
                </div>

                {erreur && <div className="cms-erreur">{erreur}</div>}

                <button type="submit" className="cms-btn" disabled={envoi}>
                  {envoi ? 'Envoi…' : `On me monte mon studio sous ${DELAI_HEURES} h`}
                </button>
                <p className="cms-legal">
                  Gratuit, sans engagement. Tes informations servent uniquement à créer ton
                  studio. <Link href="/legal/rgpd">Comment on traite tes données</Link>.
                </p>
              </form>
            )}
          </div>
        </section>
      </main>
      <Footer />

      <style jsx global>{`
        .cms-hero { padding: 72px 0 32px; text-align: center; }
        .cms-wrap { max-width: 720px; margin: 0 auto; padding: 0 20px; }
        .cms-eyebrow {
          font-family: var(--font-geist-mono), monospace; font-size: 0.78rem;
          letter-spacing: 0.12em; text-transform: uppercase; color: var(--c-accent-deep);
        }
        .cms-h1 {
          font-family: var(--font-display), serif; font-weight: 400;
          font-size: clamp(2.2rem, 5vw, 3.4rem); line-height: 1.08;
          margin: 14px 0 18px; color: var(--c-ink);
        }
        .cms-h1 .accent { color: var(--c-accent-deep); }
        .cms-sous { color: var(--c-ink-soft); font-size: 1.05rem; line-height: 1.6; margin: 0; }

        .cms-form-section { padding: 12px 0 80px; }
        .cms-form {
          display: flex; flex-direction: column; gap: 18px;
          background: var(--c-bg-warm, #fdfbf7); border: 1px solid var(--c-accent-tint, #e8dccb);
          border-radius: 20px; padding: 28px;
        }
        .cms-form-titre {
          font-family: var(--font-display), serif; font-weight: 400;
          font-size: 1.35rem; margin: 6px 0 0; color: var(--c-ink);
        }
        .cms-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .cms-champ { display: flex; flex-direction: column; gap: 6px; }
        .cms-champ > span { font-size: 0.85rem; font-weight: 600; color: var(--c-ink); }
        .cms-champ small { font-size: 0.76rem; color: var(--c-ink-soft); }
        .cms-champ input, .cms-champ select, .cms-champ textarea {
          font: inherit; font-size: 0.95rem; padding: 11px 13px;
          border: 1.5px solid var(--c-accent-tint, #e8dccb); border-radius: 12px;
          background: #fff; color: var(--c-ink); width: 100%;
        }
        .cms-champ textarea { resize: vertical; min-height: 84px; }
        .cms-champ input:focus, .cms-champ select:focus, .cms-champ textarea:focus {
          outline: none; border-color: var(--c-accent);
        }
        .cms-note {
          font-size: 0.85rem; line-height: 1.55; color: var(--c-ink-soft);
          background: var(--c-bg-sage, #eef1ea); border-radius: 12px; padding: 14px 16px;
        }
        .cms-erreur {
          font-size: 0.88rem; color: #8c2f0d; background: #fdece5;
          border-radius: 12px; padding: 12px 14px;
        }
        .cms-btn {
          align-self: flex-start; border: none; cursor: pointer;
          background: var(--c-accent-deep); color: #fff;
          font: inherit; font-size: 1rem; font-weight: 700;
          padding: 15px 30px; border-radius: 999px;
          transition: transform 0.12s ease, filter 0.12s ease;
        }
        .cms-btn:hover:not(:disabled) { filter: brightness(1.08); }
        .cms-btn:active:not(:disabled) { transform: scale(0.97); }
        .cms-btn:disabled { opacity: 0.6; cursor: default; }
        .cms-btn-ghost {
          display: inline-block; text-decoration: none; margin-top: 8px;
          background: transparent; color: var(--c-accent-deep);
          border: 1.5px solid var(--c-accent-tint, #e8dccb);
        }
        .cms-legal { font-size: 0.78rem; color: var(--c-ink-soft); margin: 0; }
        .cms-legal a { color: var(--c-accent-deep); }

        .cms-merci {
          text-align: center; background: var(--c-bg-warm, #fdfbf7);
          border: 1px solid var(--c-accent-tint, #e8dccb); border-radius: 20px; padding: 40px 28px;
        }
        .cms-merci-ico { font-size: 2.4rem; }
        .cms-merci h2 {
          font-family: var(--font-display), serif; font-weight: 400;
          font-size: 1.8rem; margin: 10px 0 14px; color: var(--c-ink);
        }
        .cms-merci p { color: var(--c-ink-soft); line-height: 1.6; margin: 0 auto 14px; max-width: 480px; }
        .cms-merci a { color: var(--c-accent-deep); }

        @media (max-width: 640px) {
          .cms-row { grid-template-columns: 1fr; }
          .cms-form { padding: 20px; }
        }
      `}</style>
    </div>
  );
}
