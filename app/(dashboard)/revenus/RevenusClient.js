'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp, TrendingDown, Clock, Plus, Download, X, CheckCircle2,
  Banknote, FileText, Landmark, CreditCard, Loader2, Pencil, Save, Trash2, AlertTriangle,
} from 'lucide-react';
import { formatMontant, formatDate } from '@/lib/utils';
import { STATUTS_PAIEMENT } from '@/lib/constantes';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';

const MODES = [
  { value: 'especes',  label: 'Espèces',  Icon: Banknote },
  { value: 'cheque',   label: 'Chèque',   Icon: FileText },
  { value: 'virement', label: 'Virement', Icon: Landmark },
  { value: 'CB',       label: 'CB',       Icon: CreditCard },
];

const STATUTS = [
  { value: 'paid',    label: 'Payé' },
  { value: 'pending', label: 'En attente' },
  { value: 'overdue', label: 'En retard' },
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

export default function RevenusClient({ paiements: initialPaiements, seancesDues = [], annulationsDues = [] }) {
  const { toast } = useToast();
  const [paiements, setPaiements] = useState(initialPaiements);
  // Annulations tardives « séance due » : la ligne se ferme via « Réglée »
  // (clear presences.est_due — la prof a encaissé comme elle veut, ou excuse).
  const [annulations, setAnnulations] = useState(annulationsDues);
  const reglerAnnulation = async (row) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('presences')
      .update({ est_due: false })
      .eq('id', row.id);
    if (error) { toast.error('Non enregistré, réessaie.'); return; }
    setAnnulations(prev => prev.filter(a => a.id !== row.id));
    toast.success('Séance marquée réglée ✓');
  };
  const [periode, setPeriode] = useState('mois');
  const [filterMode, setFilterMode] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [encaisserModal, setEncaisserModal] = useState(null); // { id, intitule, montant, ... }
  const [encaisserMode, setEncaisserMode] = useState('especes');
  const [encaisserDate, setEncaisserDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [encaisserNotes, setEncaisserNotes] = useState('');
  const [encaisserSubmitting, setEncaisserSubmitting] = useState(false);

  // Édition paiement
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSubmitting, setEditSubmitting] = useState(false);

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

  // Pagination 8/page (cf. components/ui/Pagination.js)
  const {
    paginated: paginatedPay,
    currentPage: currentPagePay,
    totalPages: totalPagesPay,
    setPage,
  } = usePagination(filtered, 8);

  // ── Stats ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const paid = periodeFilt.filter(p => p.statut === 'paid');
    const pending = periodeFilt.filter(p => p.statut === 'pending');
    const overdue = periodeFilt.filter(p => p.statut === 'overdue');
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
      overdue: sum(overdue),
      aPercevoir: sum(pending) + sum(overdue),
      parMode,
      countPaid: paid.length,
      countAPercevoir: pending.length + overdue.length,
      stripeCount,
      commission,
    };
  }, [periodeFilt]);

  // Total dû, TOUTES périodes confondues (l'argent qu'on te doit n'est pas
  // mensuel) — alimente les tuiles d'en-tête « à encaisser » / « en retard ».
  const outstanding = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const du = paiements.filter(p => p.statut === 'pending' || p.statut === 'overdue');
    const enRetard = du.filter(p => p.statut === 'overdue' || (p.statut === 'pending' && p.date < today));
    const sum = arr => arr.reduce((s, p) => s + parseFloat(p.montant || 0), 0);
    return { aEncaisser: sum(du), retards: sum(enRetard), retardCount: enRetard.length };
  }, [paiements]);

  // Variation vs période précédente (uniquement pour 'mois')
  const variation = useMemo(() => {
    if (periode !== 'mois') return null;
    const lastMonthPaiements = paiements.filter(p => inPeriode(p.date, 'dernier') && p.statut === 'paid');
    const lastTotal = lastMonthPaiements.reduce((s, p) => s + parseFloat(p.montant || 0), 0);
    if (lastTotal === 0) return null;
    return Math.round(((stats.total - lastTotal) / lastTotal) * 100);
  }, [paiements, stats.total, periode]);

  // ── Actions ────────────────────────────────────────────
  const openEdit = (paiement) => {
    setEditModal(paiement);
    setEditForm({
      montant: String(paiement.montant),
      mode: paiement.mode || 'especes',
      date: paiement.date || '',
      date_encaissement: paiement.date_encaissement || '',
      notes: paiement.notes || '',
      statut: paiement.statut || 'pending',
    });
  };

  const submitEdit = async () => {
    if (!editModal || editSubmitting) return;
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/paiements/${editModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          montant: parseFloat(editForm.montant),
          mode: editForm.mode,
          date: editForm.date,
          date_encaissement: editForm.date_encaissement || null,
          notes: editForm.notes || null,
          statut: editForm.statut,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      setPaiements(prev => prev.map(p =>
        p.id === editModal.id
          ? { ...p, montant: parseFloat(editForm.montant), mode: editForm.mode, date: editForm.date, date_encaissement: editForm.date_encaissement, notes: editForm.notes, statut: editForm.statut }
          : p
      ));
      toast.success('Paiement modifié !');
      setEditModal(null);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const deletePaiement = async (paiement) => {
    if (!confirm(`Supprimer le paiement "${paiement.intitule || 'Paiement'}" de ${formatMontant(paiement.montant)} ?`)) return;
    try {
      const res = await fetch(`/api/paiements/${paiement.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      setPaiements(prev => prev.filter(p => p.id !== paiement.id));
      toast.success('Paiement supprimé');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const openEncaisser = (paiement) => {
    setEncaisserModal(paiement);
    setEncaisserMode(paiement.mode || 'especes');
    setEncaisserDate(new Date().toISOString().slice(0, 10));
    setEncaisserNotes('');
  };

  const submitEncaisser = async () => {
    if (!encaisserModal) return;
    setEncaisserSubmitting(true);
    try {
      const res = await fetch(`/api/paiements/${encaisserModal.id}/encaisser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: encaisserMode, date_encaissement: encaisserDate, ...(encaisserNotes.trim() ? { notes: encaisserNotes.trim() } : {}) }),
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

      {/* Stats principales — répond en un coup d'œil : encaissé (période) /
          à encaisser / en retard (total dû). Les 3 tuiles sont TOUJOURS là. */}
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
        <div className="small-stat izi-card">
          <Clock size={18} style={{ color: 'var(--warning, #ca8a04)' }} />
          <div>
            <div className="small-stat-value">{formatMontant(outstanding.aEncaisser)}</div>
            <div className="small-stat-label">à encaisser</div>
          </div>
        </div>
        <div className="small-stat izi-card" style={outstanding.retards > 0 ? { borderColor: '#fca5a5' } : undefined}>
          <AlertTriangle size={18} style={{ color: outstanding.retards > 0 ? '#dc2626' : 'var(--text-muted, #999)' }} />
          <div>
            <div className="small-stat-value" style={outstanding.retards > 0 ? { color: '#dc2626' } : undefined}>{formatMontant(outstanding.retards)}</div>
            <div className="small-stat-label">{outstanding.retards > 0 ? `en retard${outstanding.retardCount > 1 ? ` · ${outstanding.retardCount}` : ''}` : 'aucun retard ✓'}</div>
          </div>
        </div>
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

      {/* Bloc "À percevoir" — TOUT l'argent dû (audit cohérence 2026-07-22) :
          paiements pending/overdue + séances payables à la séance non
          encaissées (dérivées présences+paiements liés v65) + annulations
          tardives « séance due » sans montant fixe. */}
      {(() => {
        const aPercevoir = paiements.filter(p => p.statut === 'pending' || p.statut === 'overdue');
        if (aPercevoir.length === 0 && seancesDues.length === 0 && annulations.length === 0) return null;
        const today = new Date().toISOString().split('T')[0];
        // Tri par date CROISSANTE : les échéances les plus proches d'abord.
        // (Les paiements arrivent en date DESC → sans ce tri, « À venir »
        // montrait d'abord les dates les plus LOINTAINES — feedback #7.)
        const byDateAsc = (a, b) => (a.date || '').localeCompare(b.date || '');
        // Fusion paiements + séances dues, réparties retard / à venir par date.
        const rows = [
          ...aPercevoir.map(p => ({ kind: 'paiement', key: `p-${p.id}`, data: p, date: p.date || '', late: p.statut === 'overdue' || (p.statut === 'pending' && p.date < today) })),
          ...seancesDues.map(s => ({ kind: 'seance', key: `s-${s.id}`, data: s, date: s.date || '', late: (s.date || '') < today })),
        ];
        const overdueList = rows.filter(r => r.late).sort(byDateAsc);
        const upcomingList = rows.filter(r => !r.late).sort(byDateAsc);
        const totalDu = aPercevoir.reduce((s, p) => s + parseFloat(p.montant || 0), 0)
          + seancesDues.reduce((s, w) => s + (parseFloat(w.montant) || 0), 0);

        const renderRow = (r) => r.kind === 'paiement' ? (
          <div key={r.key} className={`a-percevoir-row${r.late ? ' overdue' : ''}`}>
            <span className="a-percevoir-who">{clientName(r.data.clients) || r.data.intitule || 'Paiement'}</span>
            <span className="a-percevoir-date">{formatDate(r.data.date)}</span>
            <span className="a-percevoir-montant">{formatMontant(r.data.montant)}</span>
            <button
              className="a-percevoir-action"
              onClick={() => openEncaisser(r.data)}
              title="Marquer comme encaissé"
            >
              <CheckCircle2 size={13} /> Encaisser
            </button>
          </div>
        ) : (
          <div key={r.key} className={`a-percevoir-row${r.late ? ' overdue' : ''}`}>
            <span className="a-percevoir-who">
              {clientName(r.data.clients) || 'Élève'}
              <span className="a-percevoir-sub"> · {r.data.cours_nom}{r.data.annulationTardive ? ' (annulation tardive)' : ' (à la séance)'}</span>
            </span>
            <span className="a-percevoir-date">{formatDate(r.data.date)}</span>
            <span className="a-percevoir-montant">{formatMontant(r.data.montant)}</span>
            <Link
              className="a-percevoir-action"
              href={`/pointage/${r.data.cours_id}`}
              title="Encaisser depuis le pointage de la séance"
            >
              <CheckCircle2 size={13} /> Encaisser
            </Link>
          </div>
        );

        return (
          <div className="a-percevoir-section izi-card animate-slide-up">
            <div className="a-percevoir-header">
              <AlertTriangle size={18} style={{ color: '#ca8a04' }} />
              <span className="a-percevoir-title">À percevoir</span>
              <span className="a-percevoir-total">{formatMontant(totalDu)}</span>
            </div>
            {overdueList.length > 0 && (
              <div className="a-percevoir-group">
                <div className="a-percevoir-group-label overdue">En retard ({overdueList.length})</div>
                {overdueList.slice(0, 5).map(renderRow)}
                {overdueList.length > 5 && <div className="a-percevoir-more">+ {overdueList.length - 5} autre{overdueList.length - 5 > 1 ? 's' : ''}</div>}
              </div>
            )}
            {upcomingList.length > 0 && (
              <div className="a-percevoir-group">
                <div className="a-percevoir-group-label upcoming">À venir ({upcomingList.length})</div>
                {upcomingList.slice(0, 5).map(renderRow)}
                {upcomingList.length > 5 && <div className="a-percevoir-more">+ {upcomingList.length - 5} autre{upcomingList.length - 5 > 1 ? 's' : ''}</div>}
              </div>
            )}
            {annulations.length > 0 && (
              <div className="a-percevoir-group">
                <div className="a-percevoir-group-label upcoming">Annulations tardives — séance due ({annulations.length})</div>
                {annulations.slice(0, 5).map(a => (
                  <div key={`a-${a.id}`} className="a-percevoir-row">
                    <span className="a-percevoir-who">
                      {clientName(a.clients) || 'Élève'}
                      <span className="a-percevoir-sub"> · {a.cours_nom}</span>
                    </span>
                    <span className="a-percevoir-date">{formatDate(a.date)}</span>
                    <span className="a-percevoir-montant" style={{ color: 'var(--text-muted)' }}>montant libre</span>
                    <Link
                      className="a-percevoir-action"
                      href={`/clients/${a.client_id}`}
                      title="Encaisser depuis la fiche de l'élève (« Encaisser une séance »)"
                    >
                      Fiche
                    </Link>
                    <button
                      className="a-percevoir-action"
                      onClick={() => reglerAnnulation(a)}
                      title="Marquer la séance comme réglée (encaissée ou excusée)"
                    >
                      <CheckCircle2 size={13} /> Réglée
                    </button>
                  </div>
                ))}
                {annulations.length > 5 && <div className="a-percevoir-more">+ {annulations.length - 5} autre{annulations.length - 5 > 1 ? 's' : ''}</div>}
              </div>
            )}
          </div>
        );
      })()}

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
          <EmptyState
            icon="💰"
            title={periodeFilt.length === 0 ? 'Aucun paiement sur cette période' : 'Aucun résultat avec ces filtres'}
          >
            {periodeFilt.length === 0 ? (
              <Link href="/revenus/nouveau" className="izi-btn izi-btn-secondary">
                <Plus size={18} /> Saisir un paiement
              </Link>
            ) : (
              <button className="izi-btn izi-btn-ghost" onClick={() => { setFilterMode(''); setFilterStatut(''); }}>
                Réinitialiser les filtres
              </button>
            )}
          </EmptyState>
        ) : (
          <div className="paiements-list">
            {paginatedPay.map(p => {
              const sInfo = STATUTS_PAIEMENT[p.statut] || {};
              const canEncaisser = p.statut === 'pending' || p.statut === 'overdue';
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
                      <button onClick={() => openEdit(p)} className="edit-pay-btn" title="Modifier">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => deletePaiement(p)} className="delete-pay-btn" title="Supprimer">
                        <Trash2 size={13} />
                      </button>
                      {canEncaisser && (
                        <button
                          onClick={() => openEncaisser(p)}
                          className="encaisser-btn"
                          title="Marquer comme encaissé"
                        >
                          <CheckCircle2 size={13} /> Encaisser
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Pagination
          currentPage={currentPagePay}
          totalPages={totalPagesPay}
          onChange={setPage}
          label="paiements"
        />
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
            <div className="enc-field">
              <label>Notes (optionnel)</label>
              <input
                type="text"
                value={encaisserNotes}
                onChange={e => setEncaisserNotes(e.target.value)}
                className="izi-input"
                placeholder="N° chèque, référence virement..."
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

      {/* Modal édition paiement */}
      {editModal && (
        <div className="enc-overlay" onClick={() => !editSubmitting && setEditModal(null)}>
          <div className="enc-modal edit-modal" onClick={e => e.stopPropagation()}>
            <button className="enc-close" onClick={() => setEditModal(null)} aria-label="Fermer">
              <X size={16} />
            </button>
            <h3 className="enc-title">Modifier le paiement</h3>
            <div className="enc-recap">
              <strong>{editModal.intitule || 'Paiement'}</strong>
              {editModal.clients && (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {clientName(editModal.clients)}
                </div>
              )}
            </div>

            <div className="enc-field">
              <label>Montant</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number" step="0.01" min="0"
                  className="izi-input" style={{ flex: 1 }}
                  value={editForm.montant}
                  onChange={e => setEditForm(f => ({ ...f, montant: e.target.value }))}
                />
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>€</span>
              </div>
            </div>

            <div className="enc-field">
              <label>Mode de règlement</label>
              <div className="enc-modes">
                {MODES.map(({ value, label, Icon }) => (
                  <button
                    key={value} type="button"
                    onClick={() => setEditForm(f => ({ ...f, mode: value }))}
                    className={`enc-mode-btn ${editForm.mode === value ? 'active' : ''}`}
                  >
                    <Icon size={16} /> {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="enc-field">
              <label>Date</label>
              <input
                type="date" className="izi-input"
                value={editForm.date}
                onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>

            <div className="enc-field">
              <label>Date d'encaissement</label>
              <input
                type="date" className="izi-input"
                value={editForm.date_encaissement}
                onChange={e => setEditForm(f => ({ ...f, date_encaissement: e.target.value }))}
              />
            </div>

            <div className="enc-field">
              <label>Notes</label>
              <input
                type="text" className="izi-input"
                value={editForm.notes}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="N° chèque, référence..."
              />
            </div>

            <div className="enc-field">
              <label>Statut</label>
              <div className="enc-modes">
                {STATUTS.map(({ value, label }) => (
                  <button
                    key={value} type="button"
                    onClick={() => setEditForm(f => ({ ...f, statut: value }))}
                    className={`enc-mode-btn ${editForm.statut === value ? 'active' : ''}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="enc-actions">
              <button onClick={() => setEditModal(null)} className="izi-btn izi-btn-ghost" disabled={editSubmitting}>
                Annuler
              </button>
              <button onClick={submitEdit} className="izi-btn izi-btn-primary" disabled={editSubmitting}>
                {editSubmitting ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                Enregistrer
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

        .encaisser-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 10px; border-radius: var(--radius-full);
          border: 1px solid #6ee7b7; background: #ecfdf5;
          font-size: 0.7rem; font-weight: 600; color: #065f46;
          cursor: pointer; transition: all 0.15s;
        }
        .encaisser-btn:hover { background: #6ee7b7; color: #064e3b; }

        .edit-pay-btn {
          display: inline-flex; align-items: center;
          padding: 4px 6px; border-radius: var(--radius-sm, 6px);
          border: none; background: none;
          color: var(--text-muted); cursor: pointer; transition: all 0.15s;
        }
        .edit-pay-btn:hover { background: var(--cream-dark, #f0ebe4); color: var(--brand); }
        .delete-pay-btn {
          display: inline-flex; align-items: center;
          padding: 4px 6px; border-radius: var(--radius-sm, 6px);
          border: none; background: none;
          color: var(--text-muted); cursor: pointer; transition: all 0.15s;
        }
        .delete-pay-btn:hover { background: #fef2f2; color: #dc2626; }
        .edit-modal { max-width: 460px; }

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

        /* À percevoir */
        .a-percevoir-section { padding: 16px; display: flex; flex-direction: column; gap: 12px; border-left: 3px solid #ca8a04; }
        .a-percevoir-header { display: flex; align-items: center; gap: 8px; }
        .a-percevoir-title { font-weight: 700; font-size: 0.9375rem; flex: 1; }
        .a-percevoir-total { font-weight: 700; font-size: 1.0625rem; color: #ca8a04; }
        .a-percevoir-group { display: flex; flex-direction: column; gap: 4px; }
        .a-percevoir-group-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 2px 0; }
        .a-percevoir-group-label.overdue { color: #dc2626; }
        .a-percevoir-group-label.upcoming { color: #ca8a04; }
        .a-percevoir-row {
          display: flex; align-items: center; gap: 8px; padding: 8px 10px;
          background: var(--cream, #faf8f5); border-radius: var(--radius-sm); font-size: 0.8125rem;
        }
        .a-percevoir-row.overdue { background: #fef2f2; }
        .a-percevoir-who { font-weight: 600; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .a-percevoir-sub { font-weight: 400; color: var(--text-muted); font-size: 0.75rem; }
        .a-percevoir-date { color: var(--text-muted); font-size: 0.75rem; flex-shrink: 0; }
        .a-percevoir-montant { font-weight: 700; flex-shrink: 0; }
        .a-percevoir-action {
          display: inline-flex; align-items: center; gap: 3px;
          padding: 3px 8px; border-radius: var(--radius-full);
          border: 1px solid #6ee7b7; background: #ecfdf5;
          font-size: 0.6875rem; font-weight: 600; color: #065f46;
          cursor: pointer; flex-shrink: 0; transition: all 0.15s;
          text-decoration: none; /* la version lien (séance/fiche) garde le même look */
        }
        .a-percevoir-action:hover { background: #6ee7b7; color: #064e3b; }
        .a-percevoir-more { font-size: 0.75rem; color: var(--text-muted); padding-left: 10px; }
      `}</style>
    </div>
  );
}
