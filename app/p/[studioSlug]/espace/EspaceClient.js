'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, MapPin, ArrowLeft, LogOut, CheckCircle, XCircle, Loader, AlertCircle, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const MOIS  = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
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

function isAnnulable(date, heure) {
  const h = heure || '00:00';
  const coursDateTime = new Date(`${date}T${h}:00`);
  const diffHeures = (coursDateTime - Date.now()) / (1000 * 60 * 60);
  return diffHeures >= 24;
}

function CoursCard({ presence, studioSlug, onAnnuler, annulEnCours }) {
  const c = presence.cours;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const aVenir = c.date >= today && !c.est_annule;
  const annulable = aVenir && isAnnulable(c.date, c.heure);

  return (
    <div className="espace-cours-card">
      <div className="espace-cours-info">
        <div className="espace-cours-nom">{c.nom}</div>
        {c.type_cours && <span className="portail-tag portail-tag-rose" style={{ marginBottom: 6, display: 'inline-block' }}>{c.type_cours}</span>}
        <div className="espace-cours-details">
          <span><Calendar size={13} /> {formatDate(c.date)}</span>
          {c.heure && <span><Clock size={13} /> {formatHeure(c.heure)}{c.duree ? ` · ${c.duree} min` : ''}</span>}
          {c.lieu && <span><MapPin size={13} /> {c.lieu}</span>}
        </div>
      </div>
      <div className="espace-cours-status">
        {c.est_annule ? (
          <span className="portail-tag portail-tag-amber">Annulé</span>
        ) : aVenir ? (
          presence.present
            ? <span className="portail-tag portail-tag-green">Présent·e</span>
            : <span className="portail-tag portail-tag-blue">Inscrit·e</span>
        ) : (
          presence.present
            ? <span className="portail-tag portail-tag-green">✓ Présent·e</span>
            : <span className="portail-tag" style={{ background: '#f5f5f5', color: '#999' }}>Absent·e</span>
        )}

        {aVenir && !c.est_annule && (
          !annulable ? (
            <span className="espace-annul-locked" title="Annulation impossible moins de 24h avant le cours">
              🔒 &lt;24h
            </span>
          ) : confirmOpen ? (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ fontSize: '0.8rem', color: '#c62828', margin: '0 0 4px', fontWeight: 600 }}>Confirmer l'annulation ?</p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => { onAnnuler(presence.id); setConfirmOpen(false); }}
                  disabled={annulEnCours}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: 'none', background: '#c62828', color: 'white', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  {annulEnCours ? <Loader size={12} className="spin" /> : 'Oui, annuler'}
                </button>
                <button
                  onClick={() => setConfirmOpen(false)}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e5e5', background: 'white', fontSize: '0.8rem', cursor: 'pointer', color: '#666' }}
                >
                  Non
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmOpen(true)}
              className="espace-annul-btn"
            >
              <XCircle size={13} /> Annuler
            </button>
          )
        )}
      </div>
    </div>
  );
}

export default function EspaceClient({ profile, client, aVenir, passes, studioSlug, userEmail }) {
  const router = useRouter();
  const [annulEnCours, setAnnulEnCours] = useState(null);
  const [annuleIds, setAnnuleIds]       = useState([]);
  const [errMsg, setErrMsg]             = useState('');
  const [loggingOut, setLoggingOut]     = useState(false);

  const handleAnnuler = async (presenceId) => {
    setAnnulEnCours(presenceId);
    setErrMsg('');
    try {
      const res = await fetch(`/api/portail/${studioSlug}/annuler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presenceId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      setAnnuleIds(prev => [...prev, presenceId]);
    } catch (e) {
      setErrMsg(e.message);
    } finally {
      setAnnulEnCours(null);
    }
  };

  const handleDeconnexion = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push(`/p/${studioSlug}`);
    router.refresh();
  };

  const aVenirFiltered = aVenir.filter(p => !annuleIds.includes(p.id));

  if (!client) {
    return (
      <div>
        <Link href={`/p/${studioSlug}`} className="portail-back-link">
          <ArrowLeft size={15} /> Retour aux cours
        </Link>
        <div className="portail-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>👋</div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 800, margin: '0 0 10px', color: '#1a1a2e' }}>
            Bienvenue sur {profile.studio_nom} !
          </h2>
          <p style={{ color: '#888', fontSize: '0.9rem', margin: '0 0 24px', lineHeight: 1.6 }}>
            Tu es connecté·e avec <strong>{userEmail}</strong>, mais tu n'as pas encore de réservation dans ce studio.
          </p>
          <Link href={`/p/${studioSlug}`} className="portail-btn-primary" style={{ maxWidth: 260, margin: '0 auto 12px' }}>
            Voir les cours disponibles
          </Link>
          <button onClick={handleDeconnexion} className="portail-btn-ghost" style={{ maxWidth: 260, margin: '0 auto' }}>
            <LogOut size={15} /> Se déconnecter
          </button>
        </div>
        <style jsx global>{`
          .portail-back-link { display: inline-flex; align-items: center; gap: 6px; color: #888; font-size: 0.875rem; text-decoration: none; margin-bottom: 20px; }
          .portail-back-link:hover { color: #d4a0a0; }
        `}</style>
      </div>
    );
  }

  const prenom = client.prenom || client.email;

  return (
    <div>
      <Link href={`/p/${studioSlug}`} className="portail-back-link">
        <ArrowLeft size={15} /> Retour aux cours
      </Link>

      {/* En-tête profil */}
      <div className="portail-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fce8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={20} style={{ color: '#d4a0a0' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1a1a2e' }}>
                {client.prenom} {client.nom}
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#888' }}>{client.email}</div>
            </div>
          </div>
          <button
            onClick={handleDeconnexion}
            disabled={loggingOut}
            title="Se déconnecter"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', padding: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem' }}
          >
            {loggingOut ? <Loader size={15} className="spin" /> : <LogOut size={15} />}
          </button>
        </div>
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f5f0ee', fontSize: '0.8125rem', color: '#888' }}>
          Studio : <strong style={{ color: '#555' }}>{profile.studio_nom}</strong>
        </div>
      </div>

      {errMsg && (
        <div style={{ background: '#fff0f0', border: '1px solid #ffcdd2', borderRadius: '10px', padding: '12px 14px', color: '#c62828', fontSize: '0.875rem', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertCircle size={15} /> {errMsg}
        </div>
      )}

      {/* Cours à venir */}
      <div style={{ marginBottom: 24 }}>
        <h2 className="espace-section-title">
          <CheckCircle size={16} style={{ color: '#d4a0a0' }} />
          Cours à venir
          {aVenirFiltered.length > 0 && <span className="espace-count">{aVenirFiltered.length}</span>}
        </h2>
        {aVenirFiltered.length === 0 ? (
          <div className="portail-card" style={{ textAlign: 'center', padding: '28px 20px' }}>
            <div style={{ fontSize: '1.75rem', marginBottom: 8 }}>📅</div>
            <p style={{ color: '#888', margin: 0, fontSize: '0.9rem' }}>Aucun cours à venir.</p>
            <Link href={`/p/${studioSlug}`} style={{ display: 'inline-block', marginTop: 12, fontSize: '0.875rem', color: '#d4a0a0', fontWeight: 600, textDecoration: 'none' }}>
              Réserver un cours →
            </Link>
          </div>
        ) : (
          aVenirFiltered.map(p => (
            <CoursCard
              key={p.id}
              presence={p}
              studioSlug={studioSlug}
              onAnnuler={handleAnnuler}
              annulEnCours={annulEnCours === p.id}
            />
          ))
        )}
      </div>

      {/* Historique */}
      {passes.length > 0 && (
        <div>
          <h2 className="espace-section-title" style={{ color: '#aaa' }}>
            Historique
            <span className="espace-count" style={{ background: '#f5f5f5', color: '#bbb' }}>{passes.length}</span>
          </h2>
          {passes.map(p => (
            <CoursCard
              key={p.id}
              presence={p}
              studioSlug={studioSlug}
              onAnnuler={handleAnnuler}
              annulEnCours={false}
            />
          ))}
        </div>
      )}

      {/* Bouton rebooking */}
      <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #f0ebe8', textAlign: 'center' }}>
        <Link href={`/p/${studioSlug}`} className="portail-btn-primary" style={{ maxWidth: 280, margin: '0 auto' }}>
          📅 Voir les prochains cours
        </Link>
      </div>

      <style jsx global>{`
        .portail-back-link { display: inline-flex; align-items: center; gap: 6px; color: #888; font-size: 0.875rem; text-decoration: none; margin-bottom: 20px; }
        .portail-back-link:hover { color: #d4a0a0; }

        .espace-section-title {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.875rem; font-weight: 700; color: #555;
          text-transform: uppercase; letter-spacing: 0.04em;
          margin: 0 0 10px; padding-left: 2px;
        }
        .espace-count {
          background: #fce8e8; color: #c06060;
          font-size: 0.75rem; font-weight: 700;
          padding: 2px 8px; border-radius: 99px; letter-spacing: 0;
        }

        .espace-cours-card {
          background: white; border-radius: 14px;
          padding: 16px; margin-bottom: 8px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.05);
          display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
        }
        .espace-cours-info { flex: 1; min-width: 0; }
        .espace-cours-nom { font-weight: 700; font-size: 0.9375rem; color: #1a1a2e; margin-bottom: 4px; }
        .espace-cours-details {
          display: flex; flex-direction: column; gap: 4px;
          font-size: 0.8125rem; color: #888; margin-top: 6px;
        }
        .espace-cours-details span { display: flex; align-items: center; gap: 5px; }
        .espace-cours-details svg { color: #d4a0a0; flex-shrink: 0; }
        .espace-cours-status { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }

        .espace-annul-btn {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 0.75rem; font-weight: 600; color: #888;
          background: none; border: 1px solid #e5e5e5; border-radius: 99px;
          padding: 4px 10px; cursor: pointer; transition: all 0.15s;
        }
        .espace-annul-btn:hover { color: #c62828; border-color: #c62828; background: #fff0f0; }
        .espace-annul-locked {
          font-size: 0.7rem; color: #bbb; background: #f8f8f8;
          border: 1px solid #eee; border-radius: 99px;
          padding: 3px 8px; cursor: default;
        }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
