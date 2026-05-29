'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Clock, Users, Calendar, MapPin, ArrowRight, Loader2, X, CheckCircle2, Send, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { formatDate } from '@/lib/utils';
import EmptyState from '@/components/ui/EmptyState';

function formatHeure(h) {
  if (!h) return '';
  const [hh, mm] = h.split(':');
  return mm === '00' ? `${parseInt(hh)}h` : `${parseInt(hh)}h${mm}`;
}

function urgenceClass(dateStr) {
  const today = new Date().toISOString().slice(0, 10);
  const diff = (new Date(dateStr) - new Date(today)) / (1000 * 60 * 60 * 24);
  if (diff <= 0) return 'today';
  if (diff <= 2) return 'soon';
  if (diff <= 7) return 'week';
  return 'later';
}

export default function ListeAttenteClient({ groupes: groupesInit }) {
  const router = useRouter();
  const { toast } = useToast();
  const [groupes, setGroupes] = useState(groupesInit);
  const [submittingId, setSubmittingId] = useState(null);

  const totalEnAttente = groupes.reduce((s, g) => s + g.enAttente.length, 0);

  const promouvoir = async (entryId) => {
    setSubmittingId(entryId);
    try {
      const res = await fetch(`/api/liste-attente/${entryId}/promouvoir`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      toast.success('Personne promue — email envoyé');
      router.refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmittingId(null);
    }
  };

  const retirer = async (entryId, nom) => {
    if (!confirm(`Retirer ${nom || 'cette personne'} de la liste d'attente ?`)) return;
    setSubmittingId(entryId);
    try {
      const res = await fetch(`/api/liste-attente/${entryId}/promouvoir`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      toast.success('Personne retirée de la liste d\'attente');
      router.refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="la-page">
      <div className="la-header animate-fade-in">
        <h1>
          <Clock size={20} />
          Liste d'attente
          {totalEnAttente > 0 && <span className="la-count">{totalEnAttente}</span>}
        </h1>
        <p className="la-subtitle">
          Personnes en attente d'une place sur tes cours à venir.
        </p>
      </div>

      {groupes.length === 0 ? (
        <EmptyState
          className="animate-fade-in"
          icon={<CheckCircle2 size={36} />}
          title="Personne en attente"
          description="Quand un cours sera complet et qu'un·e élève rejoindra la liste d'attente, tu le verras ici."
        />
      ) : (
        <div className="la-list animate-slide-up">
          {groupes.map(g => {
            const u = urgenceClass(g.cours.date);
            return (
              <div key={g.cours.id} className={`la-card la-card-${u}`}>
                <div className="la-card-head">
                  <Link href={`/cours/${g.cours.id}`} className="la-card-title">
                    {g.cours.nom}
                    {g.cours.type_cours && <span className="la-type">{g.cours.type_cours}</span>}
                  </Link>
                  <div className="la-card-meta">
                    <span><Calendar size={12} /> {formatDate(g.cours.date)}</span>
                    {g.cours.heure && <span>· {formatHeure(g.cours.heure)}</span>}
                    {g.cours.lieu && <span>· <MapPin size={12} /> {g.cours.lieu}</span>}
                  </div>
                  <div className="la-card-stats">
                    {g.cours.capacite_max != null && (
                      <span className="la-stat">
                        <Users size={12} /> {g.inscrits}/{g.cours.capacite_max} inscrits
                      </span>
                    )}
                    <span className={`la-stat ${g.placesDispos === null || g.placesDispos > 0 ? 'la-stat-ok' : 'la-stat-full'}`}>
                      {g.placesDispos === null
                        ? 'Places libres'
                        : g.placesDispos > 0
                          ? `${g.placesDispos} place${g.placesDispos > 1 ? 's' : ''} libre${g.placesDispos > 1 ? 's' : ''}`
                          : 'Complet'}
                    </span>
                    <span className="la-stat la-stat-waiting">
                      <Clock size={12} /> {g.enAttente.length} en attente
                    </span>
                  </div>
                </div>

                <div className="la-entries">
                  {g.enAttente.map((entry, idx) => (
                    <div key={entry.id} className="la-entry">
                      <div className="la-entry-rank">{idx + 1}</div>
                      <div className="la-entry-info">
                        <span className="la-entry-nom">{entry.nom || '(sans nom)'}</span>
                        <span className="la-entry-contact">
                          <a href={`mailto:${entry.email}`}>{entry.email}</a>
                          {entry.telephone && <> · <a href={`tel:${entry.telephone}`}>{entry.telephone}</a></>}
                        </span>
                      </div>
                      <div className="la-entry-actions">
                        {(g.placesDispos === null || g.placesDispos > 0) ? (
                          <button
                            type="button"
                            className="la-btn la-btn-primary"
                            onClick={() => promouvoir(entry.id)}
                            disabled={submittingId === entry.id}
                            title="Lui donner la place + email de notification"
                          >
                            {submittingId === entry.id
                              ? <Loader2 size={13} className="spin" />
                              : <><Send size={13} /> Promouvoir</>}
                          </button>
                        ) : (
                          <span className="la-stat-tag">En attente d'une place</span>
                        )}
                        <button
                          type="button"
                          className="la-btn la-btn-ghost"
                          onClick={() => retirer(entry.id, entry.nom)}
                          disabled={submittingId === entry.id}
                          title="Retirer de la liste d'attente"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style jsx global>{`
        .la-page { display: flex; flex-direction: column; gap: 18px; padding-bottom: 48px; }
        .la-header h1 {
          display: flex; align-items: center; gap: 10px;
          font-size: 1.375rem; font-weight: 800; color: #1a1a2e; margin: 0;
        }
        .la-count {
          background: #fde8d0; color: #7c4a03;
          font-size: 0.75rem; font-weight: 700;
          padding: 3px 10px; border-radius: 99px;
        }
        .la-subtitle {
          color: var(--text-muted); font-size: 0.875rem; margin: 6px 0 0;
        }

        .la-empty {
          text-align: center; padding: 60px 24px;
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--radius-md);
          display: flex; flex-direction: column; align-items: center; gap: 10px;
        }
        .la-empty h2 { margin: 0; font-size: 1rem; color: var(--text-primary); }
        .la-empty p { margin: 0; color: var(--text-muted); font-size: 0.875rem; max-width: 380px; line-height: 1.5; }

        .la-list { display: flex; flex-direction: column; gap: 12px; }

        .la-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--radius-md); overflow: hidden;
          border-left-width: 4px;
        }
        .la-card-today { border-left-color: #dc2626; }
        .la-card-soon { border-left-color: #d97706; }
        .la-card-week { border-left-color: #b87333; }
        .la-card-later { border-left-color: #9ca3af; }

        .la-card-head {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-soft, #faf8f5);
        }
        .la-card-title {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 1rem; font-weight: 700; color: #1a1a2e;
          text-decoration: none;
        }
        .la-card-title:hover { color: var(--brand-700); }
        .la-type {
          font-size: 0.6875rem; font-weight: 600;
          padding: 2px 7px; border-radius: 99px;
          background: var(--brand-light); color: var(--brand-700);
        }
        .la-card-meta {
          display: flex; flex-wrap: wrap; gap: 6px;
          font-size: 0.8125rem; color: var(--text-muted);
          margin-top: 4px;
        }
        .la-card-meta span { display: inline-flex; align-items: center; gap: 4px; }
        .la-card-stats {
          display: flex; flex-wrap: wrap; gap: 8px;
          margin-top: 10px;
        }
        .la-stat {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 10px; border-radius: 99px;
          font-size: 0.75rem; font-weight: 600;
          background: var(--border-light, #f3f4f6); color: var(--text-secondary);
        }
        .la-stat-ok { background: #dcfce7; color: #166534; }
        .la-stat-full { background: #fee2e2; color: #991b1b; }
        .la-stat-waiting { background: #fef3c7; color: #92400e; }

        .la-entries { display: flex; flex-direction: column; }
        .la-entry {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 16px;
          border-top: 1px solid var(--border);
        }
        .la-entry:first-child { border-top: none; }
        .la-entry-rank {
          width: 26px; height: 26px;
          border-radius: 50%;
          background: var(--brand-light); color: var(--brand-700);
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 0.75rem; font-weight: 700;
          flex-shrink: 0;
        }
        .la-entry-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .la-entry-nom { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
        .la-entry-contact { font-size: 0.75rem; color: var(--text-muted); }
        .la-entry-contact a { color: var(--text-secondary); text-decoration: none; }
        .la-entry-contact a:hover { text-decoration: underline; }
        .la-entry-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

        .la-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 6px 10px; border-radius: 8px;
          font-size: 0.75rem; font-weight: 600;
          border: 1.5px solid transparent;
          cursor: pointer; transition: all 0.15s;
        }
        .la-btn-primary {
          background: var(--brand); color: white; border-color: var(--brand);
        }
        .la-btn-primary:hover:not(:disabled) { background: var(--brand-dark, var(--brand)); }
        .la-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .la-btn-ghost {
          background: transparent; color: var(--text-muted); border-color: var(--border);
          padding: 6px 8px;
        }
        .la-btn-ghost:hover:not(:disabled) { background: rgba(0,0,0,0.04); color: #dc2626; border-color: #fecaca; }

        .la-stat-tag {
          font-size: 0.6875rem; color: var(--text-muted);
          padding: 4px 9px;
          background: var(--border-light, #f3f4f6); border-radius: 99px;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
