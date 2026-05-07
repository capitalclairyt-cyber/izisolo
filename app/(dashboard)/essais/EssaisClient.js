'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Calendar, Clock, MapPin, Mail, Phone, Check, X, Loader, AlertCircle, Settings as SettingsIcon, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { toneForCours } from '@/lib/tones';
import Pagination, { usePagination } from '@/components/ui/Pagination';

const STATUT_CONFIG = {
  en_attente:  { label: 'En attente',  tone: 'sand'     },
  acceptee:    { label: 'Acceptée',    tone: 'sage'     },
  finalisee:   { label: 'Finalisée',   tone: 'sage'     },
  refusee:     { label: 'Refusée',     tone: 'rose'     },
};

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}
function formatHeure(h) {
  if (!h) return '';
  const [hh, mm] = h.split(':');
  return mm === '00' ? `${parseInt(hh)}h` : `${parseInt(hh)}h${mm}`;
}
function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return 'à l\'instant';
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return `il y a ${Math.floor(diff / 86400)}j`;
}

export default function EssaisClient({ profile, demandes: initialDemandes }) {
  const { toast } = useToast();
  const [demandes, setDemandes] = useState(initialDemandes);
  const [filterStatut, setFilterStatut] = useState('en_attente');
  const [pendingId, setPendingId] = useState(null);
  const [refusingId, setRefusingId] = useState(null);
  const [refusMotif, setRefusMotif] = useState('');

  const handleAction = async (id, action, motif = null) => {
    setPendingId(id);
    try {
      const res = await fetch(`/api/admin/essais/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, motif }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      setDemandes(prev => prev.map(d => d.id === id
        ? { ...d, statut: action === 'valider' ? 'finalisee' : 'refusee', motif_refus: motif }
        : d
      ));
      toast.success(action === 'valider' ? 'Demande validée — fiche client créée' : 'Demande refusée');
      setRefusingId(null);
      setRefusMotif('');
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setPendingId(null);
    }
  };

  const filtered = filterStatut === 'all'
    ? demandes
    : demandes.filter(d => d.statut === filterStatut);

  // Pagination 8/page
  const { paginated, currentPage, totalPages, setPage } = usePagination(filtered, 8);

  const counts = {
    en_attente: demandes.filter(d => d.statut === 'en_attente').length,
    finalisee:  demandes.filter(d => d.statut === 'finalisee').length,
    acceptee:   demandes.filter(d => d.statut === 'acceptee').length,
    refusee:    demandes.filter(d => d.statut === 'refusee').length,
    all:        demandes.length,
  };

  if (!profile?.essai_actif) {
    return (
      <div className="essais-empty">
        <Sparkles size={32} />
        <h2>Cours d'essai non activé</h2>
        <p>
          Active la fonctionnalité dans les paramètres pour permettre aux visiteurs
          de demander un cours d'essai depuis ton portail public.
        </p>
        <Link href="/parametres" className="izi-btn izi-btn-primary">
          <SettingsIcon size={16} /> Activer dans les paramètres
        </Link>
        <style jsx>{`
          .essais-empty {
            text-align: center; padding: 60px 24px;
            display: flex; flex-direction: column; align-items: center; gap: 12px;
          }
          .essais-empty h2 { font-size: 1.25rem; font-weight: 700; margin: 0; }
          .essais-empty p { color: var(--text-secondary); max-width: 400px; line-height: 1.5; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="essais-page">
      <header className="essais-header">
        <div>
          <h1><Sparkles size={20} /> Demandes de cours d'essai</h1>
          <p className="essais-subtitle">
            Mode : <strong>{profile.essai_mode === 'auto' ? 'Automatique' : profile.essai_mode === 'semi' ? 'Semi-auto' : 'Manuel'}</strong> ·
            Paiement : <strong>{profile.essai_paiement === 'gratuit' ? 'Gratuit' : profile.essai_paiement === 'sur_place' ? `${profile.essai_prix}€ sur place` : `${profile.essai_prix}€ Stripe`}</strong>
          </p>
        </div>
        <Link href="/parametres" className="essais-config-link">
          <SettingsIcon size={14} /> Configurer
        </Link>
      </header>

      {/* Filtres statut */}
      <div className="essais-filters">
        {[
          { val: 'en_attente', label: 'En attente', count: counts.en_attente },
          { val: 'finalisee',  label: 'Finalisées', count: counts.finalisee },
          { val: 'refusee',    label: 'Refusées',   count: counts.refusee },
          { val: 'all',        label: 'Toutes',     count: counts.all },
        ].map(f => (
          <button
            key={f.val}
            type="button"
            className={`essais-filter ${filterStatut === f.val ? 'active' : ''}`}
            onClick={() => setFilterStatut(f.val)}
          >
            {f.label}
            <span className="essais-filter-count">{f.count}</span>
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="essais-list-empty">
          <p>Aucune demande {filterStatut === 'en_attente' ? 'en attente' : filterStatut === 'finalisee' ? 'finalisée' : filterStatut === 'refusee' ? 'refusée' : ''}.</p>
        </div>
      ) : (
        <div className="essais-list">
          {paginated.map(d => {
            const cfg = STATUT_CONFIG[d.statut] || STATUT_CONFIG.en_attente;
            const tone = d.cours ? toneForCours(d.cours.type_cours) : 'sand';
            const isPending = pendingId === d.id;
            const isRefusing = refusingId === d.id;
            const canAct = d.statut === 'en_attente';
            return (
              <div key={d.id} className={`essai-card essai-card--${tone}`}>
                <div className="essai-card-head">
                  <div className="essai-card-name">
                    {d.prenom} {d.nom || ''}
                    <span className={`essai-statut tone-${cfg.tone}-bg`}>{cfg.label}</span>
                  </div>
                  <span className="essai-card-time">{timeAgo(d.created_at)}</span>
                </div>

                {d.cours && (
                  <div className="essai-card-cours">
                    <strong>{d.cours.nom}</strong>
                    <span className="essai-card-cours-meta">
                      <Calendar size={12} /> {formatDate(d.cours.date)}
                      <Clock size={12} /> {formatHeure(d.cours.heure)}
                      {d.cours.lieu && <><MapPin size={12} /> {d.cours.lieu}</>}
                    </span>
                  </div>
                )}

                <div className="essai-card-contact">
                  <a href={`mailto:${d.email}`} className="essai-card-link"><Mail size={12} /> {d.email}</a>
                  {d.telephone && <a href={`tel:${d.telephone}`} className="essai-card-link"><Phone size={12} /> {d.telephone}</a>}
                </div>

                {d.message_visiteur && (
                  <div className="essai-card-msg">
                    <MessageSquare size={12} />
                    <em>"{d.message_visiteur}"</em>
                  </div>
                )}

                {d.statut === 'refusee' && d.motif_refus && (
                  <div className="essai-card-refus-motif">
                    Motif : <em>{d.motif_refus}</em>
                  </div>
                )}

                {canAct && !isRefusing && (
                  <div className="essai-card-actions">
                    <button
                      type="button"
                      onClick={() => handleAction(d.id, 'valider')}
                      disabled={isPending}
                      className="essai-btn essai-btn-validate"
                    >
                      {isPending ? <Loader size={14} className="spin" /> : <Check size={14} />}
                      Valider
                    </button>
                    <button
                      type="button"
                      onClick={() => setRefusingId(d.id)}
                      disabled={isPending}
                      className="essai-btn essai-btn-refuse"
                    >
                      <X size={14} /> Refuser
                    </button>
                  </div>
                )}

                {canAct && isRefusing && (
                  <div className="essai-card-refus-form">
                    <textarea
                      value={refusMotif}
                      onChange={e => setRefusMotif(e.target.value)}
                      placeholder="Motif du refus (optionnel)"
                      rows={2}
                      maxLength={300}
                      className="izi-input"
                    />
                    <div className="essai-card-actions">
                      <button
                        type="button"
                        onClick={() => handleAction(d.id, 'refuser', refusMotif)}
                        disabled={isPending}
                        className="essai-btn essai-btn-refuse"
                      >
                        {isPending ? <Loader size={14} className="spin" /> : <X size={14} />}
                        Confirmer le refus
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRefusingId(null); setRefusMotif(''); }}
                        className="essai-btn essai-btn-ghost"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {d.statut === 'finalisee' && d.client_id && (
                  <div className="essai-card-meta-bottom">
                    <Link href={`/clients/${d.client_id}`} className="essai-card-link">
                      → Voir la fiche client
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onChange={setPage}
        label="demandes d'essai"
      />

      <style jsx>{`
        .essais-page { padding-bottom: 40px; }
        .essais-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 12px; margin-bottom: 16px; flex-wrap: wrap;
        }
        .essais-header h1 {
          font-size: 1.375rem; font-weight: 800; margin: 0;
          display: flex; align-items: center; gap: 8px; color: var(--text-primary);
        }
        .essais-subtitle {
          font-size: 0.8125rem; color: var(--text-muted); margin: 4px 0 0;
        }
        .essais-config-link {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 7px 12px; border-radius: 99px;
          background: white; border: 1.5px solid var(--border);
          color: var(--text-secondary); text-decoration: none;
          font-size: 0.8125rem; font-weight: 600;
          transition: all 0.15s;
        }
        .essais-config-link:hover { color: var(--brand); border-color: var(--brand); }

        .essais-filters {
          display: flex; gap: 6px; margin-bottom: 16px;
          overflow-x: auto; scrollbar-width: none;
          padding: 4px;
          background: var(--bg-soft, #faf8f5);
          border: 1px solid var(--border);
          border-radius: 999px;
          width: fit-content;
        }
        .essais-filter {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 14px; border-radius: 999px;
          background: transparent; border: none;
          font-size: 0.8125rem; font-weight: 600;
          color: var(--text-muted);
          cursor: pointer; white-space: nowrap;
        }
        .essais-filter.active { background: white; color: var(--text-primary); box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
        .essais-filter-count {
          background: var(--bg-soft, #f0ebe8);
          padding: 1px 7px; border-radius: 99px;
          font-size: 0.6875rem; font-weight: 700;
          color: var(--text-secondary);
        }
        .essais-filter.active .essais-filter-count { background: var(--brand-light); color: var(--brand-700); }

        .essais-list-empty {
          padding: 40px 24px; text-align: center;
          color: var(--text-muted); background: white; border-radius: 14px;
        }

        .essais-list { display: flex; flex-direction: column; gap: 10px; }
        .essai-card {
          background: white; border-radius: 14px; padding: 16px;
          box-shadow: 0 1px 6px rgba(0,0,0,0.05);
          border-left: 6px solid transparent;
          display: flex; flex-direction: column; gap: 10px;
        }
        .essai-card--rose     { background: var(--tone-rose-bg-soft);     border-left-color: var(--tone-rose-accent); }
        .essai-card--sage     { background: var(--tone-sage-bg-soft);     border-left-color: var(--tone-sage-accent); }
        .essai-card--sand     { background: var(--tone-sand-bg-soft);     border-left-color: var(--tone-sand-accent); }
        .essai-card--lavender { background: var(--tone-lavender-bg-soft); border-left-color: var(--tone-lavender-accent); }

        .essai-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .essai-card-name { font-weight: 700; font-size: 1rem; color: var(--text-primary); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .essai-card-time { font-size: 0.75rem; color: var(--text-muted); flex-shrink: 0; }
        .essai-statut {
          padding: 2px 9px; border-radius: 99px;
          font-size: 0.6875rem; font-weight: 700;
        }

        .essai-card-cours {
          display: flex; flex-direction: column; gap: 4px;
          padding: 10px 12px; background: white; border-radius: 10px;
          font-size: 0.875rem;
        }
        .essai-card-cours-meta {
          display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
          font-size: 0.75rem; color: var(--text-muted);
        }
        .essai-card-cours-meta svg { flex-shrink: 0; }

        .essai-card-contact { display: flex; flex-wrap: wrap; gap: 12px; font-size: 0.8125rem; }
        .essai-card-link {
          display: inline-flex; align-items: center; gap: 4px;
          color: var(--brand); text-decoration: none;
        }
        .essai-card-link:hover { text-decoration: underline; }

        .essai-card-msg {
          display: flex; gap: 6px; padding: 8px 10px;
          background: white; border-radius: 8px; font-size: 0.8125rem; color: #555;
          font-style: italic;
        }
        .essai-card-refus-motif { font-size: 0.8125rem; color: var(--tone-rose-ink); }
        .essai-card-meta-bottom { font-size: 0.8125rem; }

        .essai-card-actions { display: flex; gap: 6px; }
        .essai-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 10px;
          font-size: 0.8125rem; font-weight: 600;
          border: 1.5px solid transparent;
          cursor: pointer; transition: all 0.15s;
        }
        .essai-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .essai-btn-validate { background: var(--tone-sage-bg, #e2f0e0); color: var(--tone-sage-ink, #4d6b48); border-color: var(--tone-sage-accent, #7a9a72); }
        .essai-btn-validate:hover:not(:disabled) { background: var(--tone-sage-accent); color: white; }
        .essai-btn-refuse { background: white; color: var(--tone-rose-ink); border-color: var(--tone-rose-accent); }
        .essai-btn-refuse:hover:not(:disabled) { background: var(--tone-rose-bg); }
        .essai-btn-ghost { background: transparent; color: var(--text-muted); border-color: var(--border); }
        .essai-btn-ghost:hover { color: var(--text-primary); border-color: var(--text-primary); }

        .essai-card-refus-form { display: flex; flex-direction: column; gap: 8px; }

        @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
