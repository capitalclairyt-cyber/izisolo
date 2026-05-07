'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp, TrendingDown, Clock, Plus, Download, X, CheckCircle2,
  Banknote, FileText, Landmark, CreditCard, Loader2,
} from 'lucide-react';
import { formatMontant, formatDate } from '@/lib/utils';
import { STATUTS_PAIEMENT } from '@/lib/constantes';
import { useToast } from '@/components/ui/ToastProvider';

const MODES = [
  { value: 'especes',  label: 'Espèces',  Icon: Banknote },
  { value: 'cheque',   label: 'Chèque',   Icon: FileText },
  { value: 'virement', label: 'Virement', Icon: Landmark },
  { value: 'CB',       label: 'CB',       Icon: CreditCard },
];

const STATUTS = [
  { value: 'paid',    label: 'Payé' },
  { value: 'pending', label: 'En attente' },
  { value: 'unpaid',  label: 'Impayé' },
  { value: 'cb',      label: 'CB en cours' },
];

const PERIODES = [
  { value: 'mois',     label: 'Ce mois' },
  { value: 'dernier',  label: 'Mois dernier' },
  { value: '3mois',    label: '3 derniers mois' },
  { value: 'annee',    label: 'Cette année' },
  { value: '12mois',   label: '12 derniers mois' },
];

function clientName(c) {
  if (!c) return null;
  if (c.nom_structure) return c.nom_structure;
  return [c.prenom, c.nom].filter(Boolean).join(' ') || null;
}

function inPeriode(dateStr, periode) {
  const d = new Date(dateStr);
  const now = new Date();
  if (periode === 'mois') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  if (periode === 'dernier') {
    const m = (now.getMonth() - 1 + 12) % 12;
    const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return d.getFullYear() === y && d.getMonth() === m;
  }
  if (periode === '3mois') {
    const debut = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return d >= debut;
  }
  if (periode === 'annee') {
    return d.getFullYear() === now.getFullYear();
  }
  return true;
}

export default function RevenusClient({ paiements: initialPaiements }) {
  const { toast } = useToast();
  const [paiements, setPaiements] = useState(initialPaiements);
  const [periode, setPeriode] = useState('mois');
  const [filterMode, setFilterMode] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [encaisserModal, setEncaisserModal] = useState(null); // { id, intitule, montant, ... }
  const [encaisserMode, setEncaisserMode] = useState('especes');
  const [encaisserDate, setEncaisserDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [encaisserSubmitting, setEncaisserSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE_PAY = 50;

  // ── Filtres ────────────────────────────────────────────
  const periodeFilt = useMemo(
    () => paiements.filter(p => inPeriode(p.date, periode)),
    [paiements, periode]
  );

  const filtered = useMemo(() => {
    return periodeFilt.filter(p => {
      if (filterMode && p.mode !== filterMode) return false;
      if (filterStatut && p.statut !== filterStatut) return false;
      return true;
    });
  }, [periodeFilt, filterMode, filterStatut]);

  // Pagination — 50 paiements par page
  const totalPagesPay = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE_PAY));
  const currentPagePay = Math.min(page, totalPagesPay);
  const paginatedPay = useMemo(
    () => filtered.slice((currentPagePay - 1) * PAGE_SIZE_PAY, currentPagePay * PAGE_SIZE_PAY),
    [filtered, currentPagePay]
  );
  // Reset à la page 1 quand les filtres changent
  useMemo(() => { setPage(1); }, [periode, filterMode, filterStatut]);

  // ── Stats ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const paid = periodeFilt.filter(p => p.statut === 'paid');
    const pending = periodeFilt.filter(p => p.statut === 'pending' || p.statut === 'cb');
    const unpaid = periodeFilt.filter(p => p.statut === 'unpaid');
    const sum = arr => arr.reduce((s, p) => s + parseFloat(p.montant || 0), 0);
    const sumCommission = arr => arr.reduce((s, p) => s + parseFloat(p.commission_montant || 0), 0);

    const parMode = {};
    for (const m of MODES) parMode[m.value] = 0;
    for (const p of paid) {
      if (parMode[p.mode] !== undefined) parMode[p.mode] += parseFloat(p.montant || 0);
    }

    const stripeCount = paid.filter(p => p.stripe_session_id).length;
    const commission = sumCommission(paid);

    return {
      total: sum(paid),
      pending: sum(pending),
      unpaid: sum(unpaid),
      parMode,
      countPaid: paid.length,
      stripeCount,
      commission,
    };
  }, [periodeFilt]);

  // Variation vs période précédente (uniquement pour 'mois')
  const variation = useMemo(() => {
    if (periode !== 'mois') return null;
    const lastMonthPaiements = paiements.filter(p => inPeriode(p.date, 'dernier') && p.statut === 'paid');
    const lastTotal = lastMonthPaiements.reduce((s, p) => s + parseFloat(p.montant || 0), 0);
    if (lastTotal === 0) return null;
    return Math.round(((stats.total - lastTotal) / lastTotal) * 100);
  }, [paiements, stats.total, periode]);

  // ── Actions ────────────────────────────────────────────
  const openEncaisser = (paiement) => {
    setEncaisserModal(paiement);
    setEncaisserMode(paiement.mode || 'especes');
    setEncaisserDate(new Date().toISOString().slice(0, 10));
  };

  const submitEncaisser = async () => {
    if (!encaisserModal) return;
    setEncaisserSubmitting(true);
    try {
      const res = await fetch(`/api/paiements/${encaisserModal.id}/encaisser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: encaisserMode, date_encaissement: encaisserDate }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      setPaiements(prev => prev.map(p =>
        p.id === encaisserModal.id
          ? { ...p, statut: 'paid', mode: encaisserMode, date_encaissement: encaisserDate }
          : p
      ));
      toast.success('Paiement encaissé !');
      setEncaisserModal(null);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setEncaisserSubmitting(false);
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams({
      periode,
      ...(filterMode ? { mode: filterMode } : {}),
      ...(filterStatut ? { statut: filterStatut } : {}),
    });
    window.location.href = `/api/export/paiements-csv?${params.toString()}`;
  };

  const periodeLabel = PERIODES.find(p => p.value === periode)?.label || '';

  return (
    <div className="revenus-page">
      <div className="page-header animate-fade-in">
        <h1>Revenus</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExport} className="izi-btn izi-btn-ghost header-cta-btn" title="Export CSV pour ton comptable">
            <Download size={16} /> Export
          </button>
          <Link href="/revenus/nouveau" className="izi-btn izi-btn-primary header-cta-btn">
            <Plus size={16} /> Paiement
          </Link>
        </div>
      </div>

      {/* Sélecteur de période */}
      <div className="revenus-periode-row">
        {PERIODES.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriode(p.value)}
            className={`revenus-pill ${periode === p.value ? 'active' : ''}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stats principales */}
      <div className="stats-grid animate-slide-up">
        <div className="big-stat izi-card">
          <div className="big-stat-label">{periodeLabel} — encaissé</div>
          <div className="big-stat-value">{formatMontant(stats.total)}</div>
          {variation !== null && (
            <div className={`big-stat-trend ${variation >= 0 ? 'up' : 'down'}`}>
              {variation >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {variation >= 0 ? '+' : ''}{variation}% vs mois dernier
            </div>
          )}
        </div>
        {stats.pending > 0 && (
          <div className="small-stat izi-card">
            <Clock size={18} style={{ color: 'var(--warning)' }} />
            <div>
              <div className="small-stat-value">{formatMontant(stats.pending)}</div>
              <div className="small-stat-label">en attente</div>
            </div>
          </div>
        )}
        {stats.unpaid > 0 && (
          <div className="small-stat izi-card" style={{ borderColor: '#fca5a5' }}>
            <Clock size={18} style={{ color: '#dc2626' }} />
            <div>
              <div className="small-stat-value" style={{ color: '#dc2626' }}>{formatMontant(stats.unpaid)}</div>
              <div className="small-stat-label">impayés</div>
            </div>
          </div>
        )}
      </div>

      {/* Récap par mode */}
      {stats.countPaid > 0 && (
        <div className="izi-card recap-mode animate-slide-up">
          <div className="recap-mode-title">Encaissé par mode — {periodeLabel.toLowerCase()}</div>
          <div className="recap-mode-grid">
            {MODES.map(({ value, label, Icon }) => (
              <div key={value} className="recap-mode-item">
                <Icon size={14} style={{ color: 'var(--brand)' }} />
                <span className="recap-mode-label">{label}</span>
                <span className="recap-mode-value">{formatMontant(stats.parMode[value] || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Récap frais de fonctionnement IziSolo (sur paiements Stripe uniquement) */}
      {stats.commission > 0 && (
        <div className="commission-card animate-slide-up">
          <div className="commission-icon">💳</div>
          <div className="commission-text">
            <div className="commission-label">Frais IziSolo · {periodeLabel.toLowerCase()}</div>
            <div className="commission-sub">
              {stats.stripeCount} paiement{stats.stripeCount > 1 ? 's' : ''} en ligne · 1% pour le fonctionnement du portail
            </div>
          </div>
          <div className="commission-amount">{formatMontant(stats.commission)}</div>
        </div>
      )}

      {/* Filtres mode + statut */}
      <div className="revenus-filters">
        <div className="filter-group">
          <span className="filter-group-label">Mode :</span>
          <button onClick={() => setFilterMode('')} className={`filter-chip ${!filterMode ? 'active' : ''}`}>Tous</button>
          {MODES.map(({ value, label }) => (
            <button key={value} onClick={() => setFilterMode(filterMode === value ? '' : value)}
              className={`filter-chip ${filterMode === value ? 'active' : ''}`}>{label}</button>
          ))}
        </div>
        <div className="filter-group">
          <span className="filter-group-label">Statut :</span>
          <button onClick={() => setFilterStatut('')} className={`filter-chip ${!filterStatut ? 'active' : ''}`}>Tous</button>
          {STATUTS.map(({ value, label }) => (
            <button key={value} onClick={() => setFilterStatut(filterStatut === value ? '' : value)}
              className={`filter-chip ${filterStatut === value ? 'active' : ''}`}>{label}</button>
          ))}
        </div>
      </div>

      {/* Liste */}
      <div className="section animate-slide-up">
        <div className="section-header">
          <h2>{filtered.length} paiement{filtered.length > 1 ? 's' : ''}</h2>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state izi-card">
            <div className="empty-emoji">💰</div>
            <p className="empty-title">
              {periodeFilt.length === 0 ? 'Aucun paiement sur cette période' : 'Aucun résultat avec ces filtres'}
            </p>
            {periodeFilt.length === 0 ? (
              <Link href="/revenus/nouveau" className="izi-btn izi-btn-secondary">
                <Plus size={18} /> Saisir un paiement
              </Link>
            ) : (
              <button className="izi-btn izi-btn-ghost" onClick={() => { setFilterMode(''); setFilterStatut(''); }}>
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="paiements-list">
            {paginatedPay.map(p => {
              const sInfo = STATUTS_PAIEMENT[p.statut] || {};
              const canEncaisser = p.statut === 'pending' || p.statut === 'unpaid' || p.statut === 'cb';
              return (
                <div key={p.id} className="paiement-item izi-card">
                  <div className="paiement-info">
                    <div className="paiement-nom">
                      {clientName(p.clients) || p.intitule || 'Paiement'}
                    </div>
                    <div className="paiement-meta">
                      {p.intitule && clientName(p.clients) && <>{p.intitule} · </>}
                      {formatDate(p.date)} · {p.mode || '—'}
                      {p.statut === 'paid' && p.date_encaissement && p.date_encaissement !== p.date && (
                        <> · encaissé le {formatDate(p.date_encaissement)}</>
                      )}
                    </div>
                  </div>
                  <div className="paiement-right">
                    <div className="paiement-montant">{formatMontant(p.montant)}</div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span className={`izi-badge izi-badge-${sInfo.color || 'neutral'}`}>{sInfo.label || p.statut}</span>
                      {canEncaisser && (
                        <button
                          onClick={() => openEncaisser(p)}
                          className="encaisser-btn"
                          title="Marquer comme encaissé"
                        >
                          <CheckCircle2 size={13} /> Encaissé
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination — visible si > 50 paiements */}
        {totalPagesPay > 1 && (
          <div className="pay-pagination">
            <button
              type="button"
              className="pay-pagination-btn"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPagePay === 1}
            >
              ← Précédent
            </button>
            <span className="pay-pagination-info">
              Page {currentPagePay} / {totalPagesPay}
            </span>
            <button
              type="button"
              className="pay-pagination-btn"
              onClick={() => setPage(p => Math.min(totalPagesPay, p + 1))}
              disabled={currentPagePay === totalPagesPay}
            >
              Suivant →
            </button>
          </div>
        )}
      </div>

      {/* Modal encaisser */}
      {encaisserModal && (
        <div className="enc-overlay" onClick={() => !encaisserSubmitting && setEncaisserModal(null)}>
          <div className="enc-modal" onClick={e => e.stopPropagation()}>
            <button className="enc-close" onClick={() => setEncaisserModal(null)} aria-label="Fermer">
              <X size={16} />
            </button>
            <h3 className="enc-title">Encaisser ce paiement</h3>
            <div className="enc-recap">
              <strong>{encaisserModal.intitule || 'Paiement'}</strong> · {formatMontant(encaisserModal.montant)}
              {encaisserModal.clients && (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {clientName(encaisserModal.clients)}
                </div>
              )}
            </div>
            <div className="enc-field">
              <label>Mode de règlement</label>
              <div className="enc-modes">
                {MODES.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    onClick={() => setEncaisserMode(value)}
                    className={`enc-mode-btn ${encaisserMode === value ? 'active' : ''}`}
                  >
                    <Icon size={16} /> {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="enc-field">
              <label>Date d'encaissement</label>
              <input
                type="date"
                value={encaisserDate}
                onChange={e => setEncaisserDate(e.target.value)}
                className="izi-input"
              />
            </div>
            <div className="enc-actions">
              <button onClick={() => setEncaisserModal(null)} className="izi-btn izi-btn-ghost" disabled={encaisserSubmitting}>
                Annuler
              </button>
              <button onClick={submitEncaisser} className="izi-btn izi-btn-primary" disabled={encaisserSubmitting}>
                {encaisserSubmitting ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      <Link href="/revenus/nouveau" className="izi-fab" aria-label="Nouveau paiement"><Plus size={24} /></Link>

      <style jsx global>{`
        .revenus-page { display: flex; flex-direction: column; gap: 16px; padding-bottom: 80px; }
        .page-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
        .page-header h1 { font-size: 1.375rem; font-weight: 700; }
        .header-cta-btn { font-size: 0.8125rem; padding: 8px 14px; gap: 5px; }

        .revenus-periode-row {
          display: flex; gap: 6px; flex-wrap: wrap;
        }
        .revenus-pill {
          padding: 6px 14px; border-radius: var(--radius-full);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; transition: all 0.15s;
        }
        .revenus-pill:hover { border-color: var(--brand); color: var(--brand); }
        .revenus-pill.active { background: var(--brand); border-color: var(--brand); color: white; }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        @media (min-width: 600px) { .stats-grid { grid-template-columns: 2fr 1fr 1fr; } }
        .big-stat { padding: 20px; text-align: center; }
        .big-stat-label { font-size: 0.8125rem; color: var(--text-muted); font-weight: 500; }
        .big-stat-value { font-size: 2rem; font-weight: 700; color: var(--text-primary); margin: 4px 0; }
        .big-stat-trend { display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 0.8125rem; font-weight: 600; }
        .big-stat-trend.up { color: #16a34a; }
        .big-stat-trend.down { color: #dc2626; }
        .small-stat { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
        .small-stat-value { font-weight: 700; font-size: 1.0625rem; }
        .small-stat-label { font-size: 0.75rem; color: var(--text-muted); }

        .recap-mode { padding: 14px 16px; }
        .recap-mode-title {
          font-size: 0.75rem; font-weight: 700; color: var(--text-muted);
          text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;
        }
        .recap-mode-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 10px;
        }
        .recap-mode-item {
          display: flex; align-items: center; gap: 6px;
          background: var(--bg-soft, #faf8f5);
          border: 1px solid var(--border); border-radius: 8px;
          padding: 8px 10px; font-size: 0.8125rem;
        }
        .recap-mode-label { color: var(--text-secondary); }
        .recap-mode-value { margin-left: auto; font-weight: 700; color: var(--text-primary); }

        .commission-card {
          display: flex; align-items: center; gap: 12px;
          background: linear-gradient(135deg, #f6f9fc 0%, #ffffff 100%);
          border: 1px solid #635bff; border-radius: var(--radius-md);
          padding: 14px 16px;
        }
        .commission-icon { font-size: 1.4rem; flex-shrink: 0; }
        .commission-text { flex: 1; min-width: 0; }
        .commission-label {
          font-size: 0.8125rem; font-weight: 700; color: #635bff;
          text-transform: uppercase; letter-spacing: 0.04em;
        }
        .commission-sub { font-size: 0.7rem; color: var(--text-muted); margin-top: 2px; }
        .commission-amount {
          font-size: 1.125rem; font-weight: 700; color: #635bff;
        }

        .revenus-filters { display: flex; flex-direction: column; gap: 8px; }
        .filter-group { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
        .filter-group-label { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); padding-right: 4px; }
        .filter-chip {
          padding: 4px 10px; border-radius: var(--radius-full);
          border: 1px solid var(--border); background: var(--bg-card);
          font-size: 0.75rem; font-weight: 500; color: var(--text-secondary);
          cursor: pointer; transition: all 0.15s;
        }
        .filter-chip:hover { border-color: var(--brand); color: var(--brand); }
        .filter-chip.active { background: var(--brand); border-color: var(--brand); color: white; }

        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .section-header h2 { font-size: 1.0625rem; font-weight: 700; }
        .paiements-list { display: flex; flex-direction: column; gap: 6px; }
        .paiement-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; }
        .paiement-info { flex: 1; min-width: 0; }
        .paiement-nom { font-weight: 600; font-size: 0.9375rem; }
        .paiement-meta { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
        .paiement-right {
          text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;
          flex-shrink: 0; min-width: 90px;     /* assure qu'on a la place pour 999,99 € */
        }
        .paiement-montant { font-weight: 700; font-size: 1rem; white-space: nowrap; }

        .pay-pagination {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; margin-top: 16px; padding: 12px 0;
        }
        .pay-pagination-btn {
          padding: 8px 14px;
          background: white;
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 0.875rem; font-weight: 500;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: inherit;
        }
        .pay-pagination-btn:hover:not(:disabled) {
          border-color: var(--brand);
          color: var(--brand-700);
        }
        .pay-pagination-btn:disabled {
          opacity: 0.4; cursor: not-allowed;
        }
        .pay-pagination-info {
          font-size: 0.8125rem;
          color: var(--text-muted);
          font-family: var(--font-geist-mono), ui-monospace, monospace;
        }

        .encaisser-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 10px; border-radius: var(--radius-full);
          border: 1px solid #6ee7b7; background: #ecfdf5;
          font-size: 0.7rem; font-weight: 600; color: #065f46;
          cursor: pointer; transition: all 0.15s;
        }
        .encaisser-btn:hover { background: #6ee7b7; color: #064e3b; }

        .empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px 20px; text-align: center; }
        .empty-emoji { font-size: 2.5rem; }
        .empty-title { font-weight: 600; }

        /* Modal Encaisser */
        .enc-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 100; padding: 16px;
          animation: enc-fade-in 0.15s ease-out;
        }
        .enc-modal {
          position: relative; background: white; border-radius: 16px;
          padding: 24px 22px; width: 100%; max-width: 420px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.2);
          animation: enc-pop-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .enc-close {
          position: absolute; top: 12px; right: 12px;
          background: none; border: none; cursor: pointer;
          color: var(--text-muted); padding: 4px; border-radius: 50%;
        }
        .enc-close:hover { background: var(--bg-soft, #f5f5f5); }
        .enc-title { font-size: 1.0625rem; font-weight: 700; margin: 0 0 12px; }
        .enc-recap {
          background: var(--bg-soft, #faf8f5); border-radius: 10px;
          padding: 12px 14px; margin-bottom: 16px; font-size: 0.875rem;
        }
        .enc-field { margin-bottom: 14px; }
        .enc-field label {
          display: block; font-size: 0.8125rem; font-weight: 600;
          color: var(--text-secondary); margin-bottom: 6px;
        }
        .enc-modes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
        .enc-mode-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          padding: 8px 10px; border-radius: 8px;
          border: 1.5px solid var(--border); background: white;
          font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; transition: all 0.15s;
        }
        .enc-mode-btn.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
        .enc-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 18px; }

        @keyframes enc-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes enc-pop-in { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
