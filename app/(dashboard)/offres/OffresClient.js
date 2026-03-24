'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus, Package, Ticket, CalendarCheck, Zap, Trash2,
  ToggleLeft, ToggleRight, UserPlus, X, ChevronRight,
  Banknote, CreditCard, Landmark, FileText, Loader2,
  Search, CreditCard as CardIcon
} from 'lucide-react';
import { formatMontant } from '@/lib/utils';
import { TYPES_OFFRE } from '@/lib/constantes';
import { createClient } from '@/lib/supabase';

const TYPE_ICONS = { carnet: Ticket, abonnement: CalendarCheck, cours_unique: Zap };

const MODES_PAIEMENT = [
  { value: 'especes',  label: 'Espèces',  Icon: Banknote },
  { value: 'cheque',   label: 'Chèque',   Icon: FileText },
  { value: 'virement', label: 'Virement', Icon: Landmark },
  { value: 'CB',       label: 'CB',       Icon: CreditCard },
];

function calcDateFin(dureeJours) {
  if (!dureeJours) return null;
  const d = new Date();
  d.setDate(d.getDate() + dureeJours);
  return d.toISOString().split('T')[0];
}

// ═══════════════════════════════════════════════════════════════════════════
// Modal tunnel de vente — appelé depuis OffresClient (offre déjà connue)
// ═══════════════════════════════════════════════════════════════════════════
function AssignerClientModal({ offre, onClose, onSuccess }) {
  const [step, setStep] = useState('client'); // 'client' | 'paiement'
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [montant, setMontant] = useState(String(offre.prix));
  const [modePaiement, setModePaiement] = useState('especes');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('clients')
        .select('id, prenom, nom, nom_structure, type_client, statut, telephone')
        .order('nom');
      setClients(data || []);
      setLoadingClients(false);
    };
    load();
  }, []);

  const filtered = clients.filter(c => {
    const name = [c.prenom, c.nom_structure || c.nom].filter(Boolean).join(' ').toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const displayName = (c) => {
    const isPro = c.type_client && c.type_client !== 'particulier';
    return isPro
      ? (c.nom_structure || c.nom)
      : [c.prenom, c.nom].filter(Boolean).join(' ');
  };

  const selectClient = (c) => {
    setSelectedClient(c);
    setStep('paiement');
  };

  const handleConfirm = async () => {
    if (!selectedClient || !montant) return;
    setSubmitting(true);
    setError('');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const today = new Date().toISOString().split('T')[0];

      const { data: abo, error: aboErr } = await supabase.from('abonnements').insert({
        profile_id: user.id,
        client_id: selectedClient.id,
        offre_id: offre.id,
        offre_nom: offre.nom,
        type: offre.type,
        date_debut: today,
        date_fin: calcDateFin(offre.duree_jours),
        seances_total: offre.seances || null,
        seances_utilisees: 0,
        statut: 'actif',
      }).select().single();

      if (aboErr) throw aboErr;

      const { error: payErr } = await supabase.from('paiements').insert({
        profile_id: user.id,
        client_id: selectedClient.id,
        offre_id: offre.id,
        abonnement_id: abo.id,
        intitule: offre.nom,
        type: offre.type,
        montant: parseFloat(montant),
        statut: 'paid',
        mode: modePaiement,
        date: today,
        notes: notes.trim() || null,
      });

      if (payErr) throw payErr;

      onSuccess();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet animate-slide-up">

        {/* Header */}
        <div className="modal-header">
          {step === 'paiement' ? (
            <button className="modal-back" onClick={() => setStep('client')} type="button">
              <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
            </button>
          ) : (
            <div style={{ width: 36 }} />
          )}
          <span className="modal-title">
            {step === 'client' ? 'Choisir un élève' : 'Paiement'}
          </span>
          <button className="modal-close" onClick={onClose} type="button"><X size={20} /></button>
        </div>

        {/* Step 1 — Choisir un client */}
        {step === 'client' && (
          <div className="modal-body">
            {/* Récap offre */}
            <div className="offre-recap-pill">
              {(() => { const Icon = TYPE_ICONS[offre.type] || Package; return <Icon size={16} />; })()}
              <span>{offre.nom}</span>
              <span className="offre-recap-prix">{formatMontant(offre.prix)}</span>
            </div>

            {/* Search */}
            <div className="search-wrap">
              <Search size={16} className="search-icon" />
              <input
                className="izi-input search-input"
                type="text"
                placeholder="Rechercher un élève..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            {loadingClients ? (
              <div className="modal-loading"><Loader2 size={24} className="spin" /> Chargement...</div>
            ) : filtered.length === 0 ? (
              <div className="modal-empty">
                <p>Aucun élève trouvé.</p>
                <Link href="/clients/nouveau" className="izi-btn izi-btn-secondary" onClick={onClose}>
                  Ajouter un élève
                </Link>
              </div>
            ) : (
              <div className="client-list">
                {filtered.map(c => (
                  <button key={c.id} className="client-choice-btn" onClick={() => selectClient(c)} type="button">
                    <div className="client-choice-avatar">
                      {displayName(c).charAt(0).toUpperCase()}
                    </div>
                    <div className="client-choice-info">
                      <span className="client-choice-nom">{displayName(c)}</span>
                      {c.telephone && <span className="client-choice-tel">{c.telephone}</span>}
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Paiement */}
        {step === 'paiement' && selectedClient && (
          <div className="modal-body">
            {/* Récap */}
            <div className="paiement-recap">
              <span className="paiement-recap-nom">{offre.nom}</span>
              <span className="paiement-recap-client">pour {displayName(selectedClient)}</span>
            </div>

            {/* Mode de paiement */}
            <div className="paiement-section-label">Mode de règlement</div>
            <div className="mode-grid">
              {MODES_PAIEMENT.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  className={`mode-btn ${modePaiement === value ? 'active' : ''}`}
                  onClick={() => setModePaiement(value)}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
              <button type="button" className="mode-btn mode-btn-soon" disabled title="Paiement en ligne — bientôt disponible">
                <CardIcon size={18} />
                <span>Lien CB</span>
                <span className="soon-badge">Bientôt</span>
              </button>
            </div>

            {/* Montant */}
            <div className="paiement-section-label">Montant encaissé</div>
            <div className="montant-row">
              <input
                className="izi-input montant-input"
                type="number"
                step="0.01"
                min="0"
                value={montant}
                onChange={e => setMontant(e.target.value)}
                placeholder="0.00"
              />
              <span className="montant-currency">€</span>
            </div>
            {parseFloat(montant) !== offre.prix && montant && (
              <p className="montant-hint">Prix catalogue : {formatMontant(offre.prix)}</p>
            )}

            <div className="paiement-section-label">Notes (optionnel)</div>
            <input
              className="izi-input"
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="N° chèque, référence virement..."
            />

            {error && <p className="error-msg">{error}</p>}

            <button
              type="button"
              className="izi-btn izi-btn-primary confirm-btn"
              onClick={handleConfirm}
              disabled={submitting || !montant}
            >
              {submitting ? <><Loader2 size={16} className="spin" /> Enregistrement...</> : <>✓ Valider le paiement</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Composant principal
// ═══════════════════════════════════════════════════════════════════════════
export default function OffresClient({ offres, profile }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(null);
  const [assignModalOffre, setAssignModalOffre] = useState(null); // offre sélectionnée pour le modal

  const toggleActif = async (offre) => {
    const supabase = createClient();
    await supabase.from('offres').update({ actif: !offre.actif }).eq('id', offre.id);
    router.refresh();
  };

  const deleteOffre = async (id) => {
    if (!confirm('Supprimer cette offre ?')) return;
    setDeleting(id);
    const supabase = createClient();
    await supabase.from('offres').delete().eq('id', id);
    router.refresh();
    setDeleting(null);
  };

  const actives = offres.filter(o => o.actif);
  const inactives = offres.filter(o => !o.actif);

  const renderCard = (offre, active) => {
    const TypeIcon = TYPE_ICONS[offre.type] || Package;
    const typeInfo = TYPES_OFFRE[offre.type] || {};
    return (
      <div key={offre.id} className={`offre-card izi-card ${!active ? 'offre-inactive' : ''}`}>
        <div className="offre-icon"><TypeIcon size={20} /></div>
        <div className="offre-info">
          <div className="offre-nom">{offre.nom}</div>
          <div className="offre-details">
            <span className="izi-badge izi-badge-brand">{typeInfo.label || offre.type}</span>
            {offre.seances && <span className="offre-seances">{offre.seances} séances</span>}
            {offre.duree_jours && <span className="offre-duree">{offre.duree_jours}j</span>}
          </div>
        </div>
        <div className="offre-prix">{formatMontant(offre.prix)}</div>
        <div className="offre-actions">
          {active && (
            <button
              onClick={() => setAssignModalOffre(offre)}
              className="action-btn assign-btn"
              title="Assigner à un élève"
            >
              <UserPlus size={16} />
            </button>
          )}
          <button
            onClick={() => toggleActif(offre)}
            className="action-btn"
            title={active ? 'Désactiver' : 'Réactiver'}
          >
            {active
              ? <ToggleRight size={20} style={{ color: 'var(--success)' }} />
              : <ToggleLeft size={20} />
            }
          </button>
          <button
            onClick={() => deleteOffre(offre.id)}
            className="action-btn"
            title="Supprimer"
            disabled={deleting === offre.id}
          >
            <Trash2 size={16} style={{ color: 'var(--danger)' }} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="offres-page">
      <div className="page-header animate-fade-in">
        <div className="page-header-left">
          <h1>Tes offres</h1>
          {offres.length > 0 && <span className="count-badge">{offres.length}</span>}
        </div>
        <Link href="/offres/nouveau" className="izi-btn izi-btn-primary header-cta-btn">
          <Plus size={16} /> Nouvelle offre
        </Link>
      </div>

      {offres.length === 0 ? (
        <div className="empty-state izi-card animate-slide-up">
          <div className="empty-emoji">🎫</div>
          <p className="empty-title">Aucune offre créée</p>
          <p className="empty-desc">Crée tes carnets, abonnements ou cours à l'unité</p>
          <Link href="/offres/nouveau" className="izi-btn izi-btn-primary">
            <Plus size={18} /> Créer une offre
          </Link>
        </div>
      ) : (
        <>
          {actives.length > 0 && (
            <div className="section animate-slide-up">
              <div className="section-title">Actives</div>
              <div className="offres-list">{actives.map(o => renderCard(o, true))}</div>
            </div>
          )}

          {inactives.length > 0 && (
            <div className="section animate-slide-up">
              <div className="section-title" style={{ color: 'var(--text-muted)' }}>Inactives</div>
              <div className="offres-list">{inactives.map(o => renderCard(o, false))}</div>
            </div>
          )}
        </>
      )}

      <Link href="/offres/nouveau" className="izi-fab" aria-label="Nouvelle offre">
        <Plus size={24} />
      </Link>

      {/* Modal tunnel de vente */}
      {assignModalOffre && (
        <AssignerClientModal
          offre={assignModalOffre}
          onClose={() => setAssignModalOffre(null)}
          onSuccess={() => { setAssignModalOffre(null); router.refresh(); }}
        />
      )}

      <style jsx global>{`
        .offres-page { display: flex; flex-direction: column; gap: 16px; padding-bottom: 80px; }
        .page-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .page-header-left { display: flex; align-items: center; gap: 10px; }
        .page-header h1 { font-size: 1.375rem; font-weight: 700; }
        .count-badge { background: var(--brand-light); color: var(--brand-700); padding: 2px 10px; border-radius: var(--radius-full); font-size: 0.8125rem; font-weight: 600; }
        .header-cta-btn { font-size: 0.8125rem; padding: 8px 14px; gap: 5px; }
        .section { display: flex; flex-direction: column; gap: 8px; }
        .section-title { font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); }
        .offres-list { display: flex; flex-direction: column; gap: 8px; }
        .offre-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
        .offre-inactive { opacity: 0.55; }
        .offre-icon { width: 40px; height: 40px; border-radius: var(--radius-sm); background: var(--brand-light); color: var(--brand-700); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .offre-info { flex: 1; min-width: 0; }
        .offre-nom { font-weight: 600; font-size: 0.9375rem; }
        .offre-details { display: flex; gap: 6px; align-items: center; margin-top: 4px; flex-wrap: wrap; }
        .offre-seances, .offre-duree { font-size: 0.75rem; color: var(--text-muted); }
        .offre-prix { font-weight: 700; font-size: 1rem; color: var(--brand-700); white-space: nowrap; }
        .offre-actions { display: flex; gap: 2px; }
        .action-btn { width: 36px; height: 36px; border: none; background: none; border-radius: var(--radius-sm); cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-muted); transition: background var(--transition-fast); }
        .action-btn:active, .action-btn:hover { background: var(--cream-dark); }
        .assign-btn { color: var(--brand-700); }

        .empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px 20px; text-align: center; }
        .empty-emoji { font-size: 2.5rem; }
        .empty-title { font-weight: 600; color: var(--text-primary); }
        .empty-desc { font-size: 0.875rem; color: var(--text-muted); margin-bottom: 8px; }

        /* ── Modal partagé ── */
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 200; display: flex; align-items: flex-end; justify-content: center; }
        @media (min-width: 600px) { .modal-backdrop { align-items: center; } }
        .modal-sheet { background: var(--bg-card); border-radius: var(--radius-lg) var(--radius-lg) 0 0; width: 100%; max-width: 520px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; }
        @media (min-width: 600px) { .modal-sheet { border-radius: var(--radius-lg); } }

        .modal-header { display: flex; align-items: center; gap: 8px; padding: 16px 16px 12px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
        .modal-back { background: none; border: none; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); cursor: pointer; border-radius: var(--radius-sm); }
        .modal-back:hover { background: var(--cream-dark); }
        .modal-title { flex: 1; font-weight: 700; font-size: 1rem; text-align: center; }
        .modal-close { background: none; border: none; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); cursor: pointer; border-radius: var(--radius-sm); }
        .modal-close:hover { background: var(--cream-dark); }

        .modal-body { padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
        .modal-loading { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 32px; color: var(--text-muted); }
        .modal-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 32px 16px; color: var(--text-muted); text-align: center; }

        /* Récap offre pill */
        .offre-recap-pill { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: var(--brand-light); border-radius: var(--radius-full); color: var(--brand-700); font-weight: 600; font-size: 0.9rem; }
        .offre-recap-prix { margin-left: auto; font-weight: 700; }

        /* Search */
        .search-wrap { position: relative; }
        .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
        .search-input { padding-left: 36px !important; }

        /* Client list */
        .client-list { display: flex; flex-direction: column; gap: 4px; }
        .client-choice-btn { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--cream, #faf8f5); border: 1.5px solid var(--border); border-radius: var(--radius-md); cursor: pointer; text-align: left; width: 100%; transition: all var(--transition-fast); }
        .client-choice-btn:hover { border-color: var(--brand); background: var(--brand-light); }
        .client-choice-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--brand); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9375rem; flex-shrink: 0; }
        .client-choice-info { flex: 1; display: flex; flex-direction: column; gap: 1px; }
        .client-choice-nom { font-weight: 600; font-size: 0.9375rem; color: var(--text-primary); }
        .client-choice-tel { font-size: 0.75rem; color: var(--text-muted); }

        /* Paiement */
        .paiement-recap { padding: 12px 14px; background: var(--brand-light); border-radius: var(--radius-md); border: 1px solid var(--brand); display: flex; flex-direction: column; gap: 2px; }
        .paiement-recap-nom { font-weight: 700; font-size: 1rem; color: var(--brand-700); }
        .paiement-recap-client { font-size: 0.8125rem; color: var(--brand-700); opacity: 0.8; }
        .paiement-section-label { font-size: 0.8125rem; font-weight: 700; color: var(--text-secondary); }

        .mode-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .mode-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; padding: 12px 8px; border-radius: var(--radius-md); border: 1.5px solid var(--border); background: var(--bg-card); font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all var(--transition-fast); min-height: 64px; position: relative; }
        .mode-btn.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
        .mode-btn:not(.active):not(:disabled):hover { border-color: var(--brand); }
        .mode-btn-soon { opacity: 0.45; cursor: not-allowed; }
        .soon-badge { position: absolute; top: 4px; right: 4px; background: var(--text-muted); color: white; font-size: 0.625rem; font-weight: 700; padding: 1px 5px; border-radius: var(--radius-full); }

        .montant-row { display: flex; align-items: center; gap: 8px; }
        .montant-input { flex: 1; font-size: 1.25rem !important; font-weight: 700 !important; text-align: right; }
        .montant-currency { font-size: 1.25rem; font-weight: 700; color: var(--text-secondary); }
        .montant-hint { font-size: 0.75rem; color: var(--text-muted); text-align: right; margin-top: -8px; }

        .confirm-btn { width: 100%; margin-top: 4px; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .error-msg { color: var(--danger); font-size: 0.8125rem; text-align: center; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
