'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock, MapPin, Calendar, Users, ArrowLeft, CheckCircle, AlertCircle, Loader, Mail, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

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

export default function CoursReservationClient({ cours, profile, nbInscrits, studioSlug, currentUser, alreadyRegistered = false }) {
  const { toast } = useToast();
  const [nom, setNom]       = useState(currentUser?.nom || '');
  const [email, setEmail]   = useState(currentUser?.email || '');
  const [tel, setTel]       = useState(currentUser?.tel || '');
  const [loading, setLoading] = useState(false);
  const [done, setDone]     = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError]   = useState('');
  const isConnected = !!currentUser;

  const places = cours.capacite_max ? cours.capacite_max - nbInscrits : null;
  const complet = places !== null && places <= 0;
  const today = new Date().toISOString().slice(0, 10);
  const passe = cours.date < today;
  const annule = !!cours.est_annule;

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
      setMagicLinkSent(!!json.magicLinkSent);
      setDone(true);
      toast.success('Réservation confirmée !');
    } catch (e) {
      setError(e.message);
      toast.error(e.message);
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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px' }}>C'est réservé !</h2>
          <p style={{ color: '#666', margin: '0 0 16px', lineHeight: 1.6 }}>
            Tu es inscrit·e pour <strong>{cours.nom}</strong><br />
            le <strong>{formatDate(cours.date)}</strong> à <strong>{formatHeure(cours.heure)}</strong>.
          </p>

          <div style={{ background: '#f0faf0', border: '1px solid #c8e6c9', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '0.875rem', color: '#2e7d32', display: 'flex', alignItems: 'flex-start', gap: '8px', textAlign: 'left' }}>
            <Mail size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              Email envoyé à <strong>{email}</strong>
              {!isConnected && magicLinkSent && (
                <><br /><span style={{ fontSize: '0.8125rem', color: '#1b5e20' }}>Il contient un lien pour accéder à ton espace en un clic.</span></>
              )}
            </div>
          </div>

          <div style={{ background: '#fffaf0', border: '1px solid #ffe0b2', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.8125rem', color: '#7c4a03', display: 'flex', alignItems: 'flex-start', gap: '8px', textAlign: 'left' }}>
            <Shield size={15} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>Tu peux annuler depuis ton espace jusqu'à <strong>24h avant le cours</strong>.</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {isConnected && (
              <Link href={`/p/${studioSlug}/espace`} className="portail-btn-primary" style={{ maxWidth: '320px', margin: '0 auto', width: '100%' }}>
                Voir mon espace
              </Link>
            )}
            <Link href={`/p/${studioSlug}`} className={isConnected ? 'portail-btn-ghost' : 'portail-btn-primary'} style={{ maxWidth: '320px', margin: '0 auto', width: '100%' }}>
              Voir d'autres cours
            </Link>
          </div>
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

      {/* Politique d'annulation — visible AVANT le formulaire */}
      {!passe && !complet && (
        <div className="resa-policy">
          <Shield size={15} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong style={{ display: 'block', marginBottom: 2 }}>Annulation flexible</strong>
            Tu pourras annuler depuis ton espace jusqu'à <strong>24h avant le cours</strong>.
          </div>
        </div>
      )}

      {/* Formulaire de réservation */}
      {annule ? (
        <div className="portail-card" style={{ textAlign: 'center', color: '#888' }}>
          <AlertCircle size={32} style={{ margin: '0 auto 8px', display: 'block', color: '#dc2626' }} />
          <p style={{ margin: '0 0 12px', fontWeight: 600 }}>Ce cours a été annulé par le studio.</p>
          <Link href={`/p/${studioSlug}`} style={{ fontSize: '0.875rem', color: '#d4a0a0', fontWeight: 600, textDecoration: 'none' }}>
            Voir d'autres cours →
          </Link>
        </div>
      ) : passe ? (
        <div className="portail-card" style={{ textAlign: 'center', color: '#888' }}>
          <AlertCircle size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
          <p style={{ margin: 0 }}>Ce cours est passé.</p>
        </div>
      ) : alreadyRegistered ? (
        <div className="portail-card" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <CheckCircle size={40} style={{ color: '#4caf50', margin: '0 auto 12px', display: 'block' }} />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 8px', color: '#1a1a2e' }}>
            Tu es déjà inscrit·e à ce cours
          </h2>
          <p style={{ color: '#666', margin: '0 0 20px', fontSize: '0.9375rem' }}>
            Retrouve cette réservation dans ton espace personnel.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link href={`/p/${studioSlug}/espace`} className="portail-btn-primary" style={{ maxWidth: 280, margin: '0 auto', width: '100%' }}>
              Voir mon espace
            </Link>
            <Link href={`/p/${studioSlug}`} className="portail-btn-ghost" style={{ maxWidth: 280, margin: '0 auto', width: '100%' }}>
              Voir d'autres cours
            </Link>
          </div>
        </div>
      ) : complet ? (
        <div className="portail-card" style={{ textAlign: 'center', color: '#888' }}>
          <AlertCircle size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
          <p style={{ margin: '0 0 12px' }}>Ce cours est complet.</p>
          <Link href={`/p/${studioSlug}`} style={{ fontSize: '0.875rem', color: '#d4a0a0', fontWeight: 600, textDecoration: 'none' }}>
            Voir d'autres cours →
          </Link>
        </div>
      ) : (
        <div className="portail-card">
          <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: '0 0 16px', color: '#1a1a2e' }}>Réserver ma place</h2>

          {isConnected && (
            <div style={{ background: '#f0faf0', border: '1px solid #c8e6c9', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '0.8125rem', color: '#2e7d32', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ✓ Connecté·e en tant que <strong>{email}</strong>
            </div>
          )}

          <form onSubmit={handleReserver}>
            <div className="portail-field">
              <label className="portail-label" htmlFor="resa-nom">Prénom et nom *</label>
              <input
                id="resa-nom"
                type="text"
                className={`portail-input${isConnected && nom ? ' portail-input--readonly' : ''}`}
                value={nom}
                onChange={isConnected ? undefined : e => setNom(e.target.value)}
                readOnly={isConnected && !!nom}
                placeholder="Marie Dupont"
                required
                autoComplete="name"
              />
            </div>
            <div className="portail-field">
              <label className="portail-label" htmlFor="resa-email">Email *</label>
              <input
                id="resa-email"
                type="email"
                className={`portail-input${isConnected ? ' portail-input--readonly' : ''}`}
                value={email}
                onChange={isConnected ? undefined : e => setEmail(e.target.value)}
                readOnly={isConnected}
                placeholder="marie@exemple.fr"
                required
                autoComplete="email"
              />
              {!isConnected && (
                <p style={{ fontSize: '0.75rem', color: '#aaa', margin: '6px 0 0' }}>
                  On t'enverra un lien pour accéder à ton espace et gérer tes réservations.
                </p>
              )}
            </div>
            {!isConnected && (
              <div className="portail-field">
                <label className="portail-label" htmlFor="resa-tel">Téléphone <span style={{ color: '#aaa', fontWeight: 400 }}>(optionnel)</span></label>
                <input
                  id="resa-tel"
                  type="tel"
                  className="portail-input"
                  value={tel}
                  onChange={e => setTel(e.target.value)}
                  placeholder="06 12 34 56 78"
                  autoComplete="tel"
                />
              </div>
            )}

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
              En réservant, tu acceptes les <a href="/legal/cgu" target="_blank" rel="noopener noreferrer" style={{ color: '#d4a0a0' }}>CGU</a> d'IziSolo.
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
        .portail-input--readonly { background: #faf8f5; color: #888; cursor: default; border-color: #eee; }
        .resa-policy {
          display: flex; gap: 10px; align-items: flex-start;
          background: #fffaf0; border: 1px solid #ffe0b2; border-radius: 12px;
          padding: 12px 16px; margin-bottom: 16px;
          font-size: 0.8125rem; color: #7c4a03; line-height: 1.5;
        }
        .resa-policy svg { color: #d97706; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
