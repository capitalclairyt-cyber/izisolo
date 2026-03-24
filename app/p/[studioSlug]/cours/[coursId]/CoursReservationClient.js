'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock, MapPin, Calendar, Users, ArrowLeft, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${JOURS[date.getDay()]} ${d} ${MOIS[m - 1]} ${y}`;
}
function formatHeure(h) {
  if (!h) return '';
  const [hh, mm] = h.split(':');
  return mm === '00' ? `${parseInt(hh)}h` : `${parseInt(hh)}h${mm}`;
}

export default function CoursReservationClient({ cours, profile, nbInscrits, studioSlug }) {
  const [nom, setNom]       = useState('');
  const [email, setEmail]   = useState('');
  const [tel, setTel]       = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone]     = useState(false);
  const [error, setError]   = useState('');

  const places = cours.capacite_max ? cours.capacite_max - nbInscrits : null;
  const complet = places !== null && places <= 0;
  const today = new Date().toISOString().slice(0, 10);
  const passe = cours.date < today;

  const handleReserver = async (e) => {
    e.preventDefault();
    if (!nom.trim() || !email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/portail/${studioSlug}/reserver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coursId: cours.id, nom: nom.trim(), email: email.trim(), tel: tel.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur lors de la réservation');
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div>
        <Link href={`/p/${studioSlug}`} className="portail-back-link">
          <ArrowLeft size={15} /> Retour aux cours
        </Link>
        <div className="portail-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <CheckCircle size={48} style={{ color: '#4caf50', margin: '0 auto 16px', display: 'block' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px' }}>Réservation confirmée !</h2>
          <p style={{ color: '#666', margin: '0 0 24px', lineHeight: 1.6 }}>
            Tu es inscrit·e pour <strong>{cours.nom}</strong> le <strong>{formatDate(cours.date)}</strong> à <strong>{formatHeure(cours.heure)}</strong>.
            <br />Un email de confirmation a été envoyé à <strong>{email}</strong>.
          </p>
          <Link href={`/p/${studioSlug}`} className="portail-btn-primary" style={{ maxWidth: '280px', margin: '0 auto' }}>
            Voir d'autres cours
          </Link>
        </div>
        <style jsx global>{`
          .portail-back-link { display: inline-flex; align-items: center; gap: 6px; color: #888; font-size: 0.875rem; text-decoration: none; margin-bottom: 20px; }
          .portail-back-link:hover { color: #d4a0a0; }
        `}</style>
      </div>
    );
  }

  return (
    <div>
      <Link href={`/p/${studioSlug}`} className="portail-back-link">
        <ArrowLeft size={15} /> Retour aux cours
      </Link>

      {/* Fiche cours */}
      <div className="portail-card" style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 800, margin: '0 0 6px', color: '#1a1a2e' }}>{cours.nom}</h1>
        {cours.type_cours && (
          <span className="portail-tag portail-tag-rose" style={{ marginBottom: '14px', display: 'inline-block' }}>{cours.type_cours}</span>
        )}
        <div className="resa-details">
          <div className="resa-detail-row"><Calendar size={15} /><span>{formatDate(cours.date)}</span></div>
          <div className="resa-detail-row"><Clock size={15} /><span>{formatHeure(cours.heure)}{cours.duree ? ` · ${cours.duree} min` : ''}</span></div>
          {cours.lieu && <div className="resa-detail-row"><MapPin size={15} /><span>{cours.lieu}</span></div>}
          {cours.capacite_max && (
            <div className="resa-detail-row">
              <Users size={15} />
              <span>
                {nbInscrits}/{cours.capacite_max} inscrits
                {complet
                  ? <span className="portail-tag portail-tag-amber" style={{ marginLeft: '8px' }}>Complet</span>
                  : places <= 3
                  ? <span className="portail-tag portail-tag-amber" style={{ marginLeft: '8px' }}>{places} place{places > 1 ? 's' : ''} restante{places > 1 ? 's' : ''}</span>
                  : null
                }
              </span>
            </div>
          )}
        </div>
        {cours.description && (
          <p style={{ marginTop: '14px', fontSize: '0.9375rem', color: '#555', lineHeight: 1.6 }}>{cours.description}</p>
        )}
      </div>

      {/* Formulaire de réservation */}
      {passe ? (
        <div className="portail-card" style={{ textAlign: 'center', color: '#888' }}>
          <AlertCircle size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
          <p style={{ margin: 0 }}>Ce cours est passé.</p>
        </div>
      ) : complet ? (
        <div className="portail-card" style={{ textAlign: 'center', color: '#888' }}>
          <AlertCircle size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
          <p style={{ margin: 0 }}>Ce cours est complet.</p>
        </div>
      ) : (
        <div className="portail-card">
          <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: '0 0 16px', color: '#1a1a2e' }}>Réserver ma place</h2>
          <form onSubmit={handleReserver}>
            <div className="portail-field">
              <label className="portail-label">Prénom et nom *</label>
              <input
                type="text"
                className="portail-input"
                value={nom}
                onChange={e => setNom(e.target.value)}
                placeholder="Marie Dupont"
                required
                autoComplete="name"
              />
            </div>
            <div className="portail-field">
              <label className="portail-label">Email *</label>
              <input
                type="email"
                className="portail-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="marie@exemple.fr"
                required
                autoComplete="email"
              />
            </div>
            <div className="portail-field">
              <label className="portail-label">Téléphone <span style={{ color: '#aaa', fontWeight: 400 }}>(optionnel)</span></label>
              <input
                type="tel"
                className="portail-input"
                value={tel}
                onChange={e => setTel(e.target.value)}
                placeholder="06 12 34 56 78"
                autoComplete="tel"
              />
            </div>

            {error && (
              <div style={{ background: '#fff0f0', border: '1px solid #ffcdd2', borderRadius: '8px', padding: '10px 14px', color: '#c62828', fontSize: '0.875rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !nom.trim() || !email.trim()}
              className="portail-btn-primary"
            >
              {loading ? <Loader size={16} className="spin" /> : null}
              {loading ? 'Réservation en cours…' : 'Confirmer ma réservation'}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#aaa', margin: '12px 0 0' }}>
              En réservant, tu acceptes les <a href="/legal/cgu" target="_blank" style={{ color: '#d4a0a0' }}>CGU</a> d'IziSolo.
            </p>
          </form>
        </div>
      )}

      <style jsx global>{`
        .portail-back-link { display: inline-flex; align-items: center; gap: 6px; color: #888; font-size: 0.875rem; text-decoration: none; margin-bottom: 20px; }
        .portail-back-link:hover { color: #d4a0a0; }
        .resa-details { display: flex; flex-direction: column; gap: 8px; }
        .resa-detail-row { display: flex; align-items: center; gap: 8px; font-size: 0.9375rem; color: #555; }
        .resa-detail-row svg { color: #d4a0a0; flex-shrink: 0; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
