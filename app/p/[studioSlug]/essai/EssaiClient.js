'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, MapPin, CheckCircle, AlertCircle, Loader, Sparkles, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { toneForCours } from '@/lib/tones';

const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MOIS = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${JOURS[date.getDay()]} ${d} ${MOIS[m - 1]}`;
}
function formatHeure(h) {
  if (!h) return '';
  const [hh, mm] = h.split(':');
  return mm === '00' ? `${parseInt(hh)}h` : `${parseInt(hh)}h${mm}`;
}

export default function EssaiClient({ profile, cours, studioSlug, preselectedCoursId }) {
  const { toast } = useToast();
  const [coursId, setCoursId] = useState(preselectedCoursId || '');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null); // { status, paiement, prix, stripeLink }

  const selectedCours = cours.find(c => c.id === coursId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!coursId || !prenom.trim() || !email.trim()) {
      toast.error('Choisis un cours, ton prénom et ton email');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/portail/${studioSlug}/essai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coursId,
          prenom: prenom.trim(),
          nom: nom.trim(),
          email: email.trim(),
          telephone: telephone.trim(),
          message: message.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      setDone(json);
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div>
        <div className="essai-confirm">
          <div className="essai-confirm-icon">
            <CheckCircle size={36} />
          </div>
          {done.status === 'en_attente' ? (
            <>
              <h1 className="essai-confirm-title">Demande reçue !</h1>
              <p className="essai-confirm-desc">
                Merci {prenom} ! Ta demande a été envoyée à {profile.studio_nom}.
                Tu recevras un email dès qu'elle sera validée.
              </p>
            </>
          ) : (
            <>
              <h1 className="essai-confirm-title">C'est confirmé !</h1>
              <p className="essai-confirm-desc">
                Ta place est réservée pour le cours d'essai chez {profile.studio_nom}.
                Un email de confirmation t'attend dans <strong>{email}</strong>.
              </p>
            </>
          )}

          {done.paiement === 'stripe' && done.stripePaymentLink && (
            <a
              href={done.stripePaymentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="essai-stripe-cta"
            >
              <ExternalLink size={16} /> Régler {done.prix}€ pour confirmer
            </a>
          )}
          {done.paiement === 'sur_place' && done.prix > 0 && (
            <div className="essai-paiement-info">
              💰 <strong>{done.prix}€</strong> à régler sur place le jour du cours
            </div>
          )}

          <Link href={`/p/${studioSlug}`} className="essai-back-link">
            ← Retour au studio
          </Link>
        </div>

        <style jsx>{`
          .essai-confirm {
            background: white; border-radius: 18px; padding: 40px 24px;
            text-align: center; box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          }
          .essai-confirm-icon {
            width: 72px; height: 72px; margin: 0 auto 18px;
            background: var(--tone-sage-bg, #e2f0e0); color: var(--tone-sage-ink, #4d6b48);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
          }
          .essai-confirm-title {
            font-size: 1.375rem; font-weight: 800;
            color: #1a1a2e; margin: 0 0 10px;
          }
          .essai-confirm-desc {
            font-size: 0.9375rem; color: #555; line-height: 1.6;
            margin: 0 0 22px; max-width: 380px; margin-left: auto; margin-right: auto;
          }
          .essai-stripe-cta {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 13px 22px; border-radius: 12px;
            background: #635bff; color: white;
            font-weight: 600; font-size: 0.9375rem; text-decoration: none;
            margin-bottom: 18px;
          }
          .essai-paiement-info {
            display: inline-block;
            padding: 10px 16px;
            background: var(--tone-sand-bg-soft, #fbf8f1);
            border: 1px solid var(--tone-sand-accent, #c4956a);
            color: var(--tone-sand-ink, #8a6a3d);
            border-radius: 10px;
            font-size: 0.875rem;
            margin-bottom: 18px;
          }
          .essai-back-link {
            display: block;
            color: #888; font-size: 0.875rem;
            text-decoration: none;
          }
          .essai-back-link:hover { color: var(--brand); }
        `}</style>
      </div>
    );
  }

  return (
    <div>
      <Link href={`/p/${studioSlug}`} className="essai-back-link">
        <ArrowLeft size={15} /> Retour au studio
      </Link>

      <div className="essai-header">
        <div className="essai-header-icon">
          <Sparkles size={22} />
        </div>
        <h1 className="essai-title">Cours d'essai</h1>
        {profile.essai_message && (
          <p className="essai-intro">{profile.essai_message}</p>
        )}
        <div className="essai-paiement-tag">
          {profile.essai_paiement === 'gratuit'   && '🎁 Cours d\'essai offert'}
          {profile.essai_paiement === 'sur_place' && `💰 ${profile.essai_prix}€ à régler sur place`}
          {profile.essai_paiement === 'stripe'    && `💳 ${profile.essai_prix}€ — paiement en ligne sécurisé`}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="essai-form">
        <div className="essai-section">
          <label className="essai-label">Choisis ton créneau</label>
          {cours.length === 0 ? (
            <div className="essai-empty">
              Aucun cours disponible dans les 30 prochains jours.
            </div>
          ) : (
            <div className="essai-cours-list">
              {cours.map(c => {
                const tone = toneForCours(c.type_cours);
                const selected = c.id === coursId;
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setCoursId(c.id)}
                    className={`essai-cours-card essai-cours-card--${tone} ${selected ? 'is-selected' : ''}`}
                  >
                    <div className="essai-cours-info">
                      <div className="essai-cours-nom">{c.nom}</div>
                      <div className="essai-cours-meta">
                        <span><Calendar size={12} /> {formatDate(c.date)}</span>
                        <span><Clock size={12} /> {formatHeure(c.heure)}</span>
                        {c.lieu && <span><MapPin size={12} /> {c.lieu}</span>}
                      </div>
                    </div>
                    {selected && <CheckCircle size={18} className="essai-cours-check" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="essai-section">
          <label className="essai-label">Tes coordonnées</label>
          <div className="essai-fields">
            <input
              type="text"
              className="essai-input"
              placeholder="Prénom *"
              value={prenom}
              onChange={e => setPrenom(e.target.value)}
              required
              autoComplete="given-name"
            />
            <input
              type="text"
              className="essai-input"
              placeholder="Nom (optionnel)"
              value={nom}
              onChange={e => setNom(e.target.value)}
              autoComplete="family-name"
            />
            <input
              type="email"
              className="essai-input"
              placeholder="Email *"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <input
              type="tel"
              className="essai-input"
              placeholder="Téléphone (optionnel)"
              value={telephone}
              onChange={e => setTelephone(e.target.value)}
              autoComplete="tel"
            />
          </div>
        </div>

        <div className="essai-section">
          <label className="essai-label">Un mot pour le studio (optionnel)</label>
          <textarea
            className="essai-input"
            rows={3}
            maxLength={500}
            placeholder="Comment tu nous as connu, ce qui t'amène, tes attentes..."
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !coursId || !prenom.trim() || !email.trim()}
          className="essai-submit"
        >
          {submitting ? <Loader size={16} className="spin" /> : <Sparkles size={16} />}
          {submitting ? 'Envoi…' : 'Demander mon cours d\'essai'}
        </button>
        <p className="essai-cgu">
          En envoyant, tu acceptes les <a href="/legal/cgu" target="_blank" rel="noopener">CGU</a> d'IziSolo.
        </p>
      </form>

      <style jsx>{`
        .essai-back-link {
          display: inline-flex; align-items: center; gap: 6px;
          color: #888; font-size: 0.875rem; text-decoration: none;
          margin-bottom: 16px;
        }
        .essai-back-link:hover { color: var(--brand); }

        .essai-header {
          background: var(--tone-rose-bg-soft, #fdf6f4);
          border: 1.5px solid var(--tone-rose-accent, #c47070);
          border-radius: 18px; padding: 24px; margin-bottom: 18px;
          text-align: center;
        }
        .essai-header-icon {
          width: 48px; height: 48px; margin: 0 auto 12px;
          background: var(--tone-rose-bg, #fce8e2); color: var(--tone-rose-ink, #8b3838);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }
        .essai-title { font-size: 1.5rem; font-weight: 800; margin: 0 0 8px; color: #1a1a2e; }
        .essai-intro {
          font-size: 0.9375rem; color: #6b6359; line-height: 1.5;
          margin: 0 0 14px;
        }
        .essai-paiement-tag {
          display: inline-block;
          padding: 6px 14px; border-radius: 999px;
          background: white; border: 1.5px solid var(--tone-rose-accent, #c47070);
          color: var(--tone-rose-ink, #8b3838);
          font-size: 0.8125rem; font-weight: 600;
        }

        .essai-form { display: flex; flex-direction: column; gap: 16px; }
        .essai-section {
          background: white; border-radius: 14px; padding: 16px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.04);
        }
        .essai-label {
          display: block; font-size: 0.8125rem; font-weight: 700;
          color: #555; text-transform: uppercase; letter-spacing: 0.04em;
          margin-bottom: 10px;
        }
        .essai-empty {
          padding: 20px; text-align: center; color: #888;
          background: #faf8f5; border-radius: 10px; font-size: 0.875rem;
        }
        .essai-cours-list { display: flex; flex-direction: column; gap: 6px; }
        .essai-cours-card {
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          padding: 12px 14px; border-radius: 12px;
          border-left: 5px solid transparent;
          background: white; border: 1px solid #f0ebe8;
          cursor: pointer; transition: all 0.15s;
          text-align: left;
        }
        .essai-cours-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .essai-cours-card--rose     { border-left-color: var(--tone-rose-accent); }
        .essai-cours-card--sage     { border-left-color: var(--tone-sage-accent); }
        .essai-cours-card--sand     { border-left-color: var(--tone-sand-accent); }
        .essai-cours-card--lavender { border-left-color: var(--tone-lavender-accent); }
        .essai-cours-card.is-selected {
          border-color: var(--brand);
          background: var(--brand-light);
          box-shadow: 0 0 0 3px rgba(212,160,160,0.20);
        }
        .essai-cours-info { flex: 1; min-width: 0; }
        .essai-cours-nom { font-weight: 600; font-size: 0.9375rem; color: #1a1a2e; }
        .essai-cours-meta {
          display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px;
          font-size: 0.75rem; color: #888;
        }
        .essai-cours-meta span { display: inline-flex; align-items: center; gap: 3px; }
        .essai-cours-check { color: var(--brand); flex-shrink: 0; }

        .essai-fields { display: flex; flex-direction: column; gap: 8px; }
        .essai-input {
          width: 100%; padding: 11px 14px;
          border: 1.5px solid #e8e0db; border-radius: 10px;
          font-size: 0.9375rem; outline: none;
          background: white;
          font-family: inherit;
        }
        .essai-input:focus { border-color: var(--brand); }

        .essai-submit {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 14px 24px;
          background: var(--brand); color: white; border: none;
          border-radius: 14px; font-weight: 700; font-size: 1rem;
          cursor: pointer; transition: background 0.15s;
        }
        .essai-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .essai-submit:hover:not(:disabled) { background: var(--brand-dark); }
        .essai-cgu {
          text-align: center; font-size: 0.75rem; color: #aaa; margin: 4px 0 0;
        }
        .essai-cgu a { color: var(--brand); }

        @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
