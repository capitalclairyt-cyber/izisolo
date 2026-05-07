'use client';

/**
 * Page "Cas à traiter" — inbox des situations remontées par l'app que la
 * prof doit résoudre manuellement.
 *
 * Refonte 2026-05-06 :
 *   • Plus de clic = résolution figée. Chaque action ouvre une <ResolveCasModal>
 *     qui demande "Déjà fait" / "À faire" + note + confirmation explicite.
 *   • L'API /api/cas-a-traiter/[id]/resolve orchestre l'effet métier
 *     (création de paiement, abonnement, MAJ présence, etc.).
 *   • Bouton "↩️ Annuler" dans l'historique des cas résolus < 7 jours.
 *   • Au retour des formulaires (/revenus/nouveau ou /abonnements/nouveau)
 *     avec ?cas_resolu=ID, on affiche un toast et on rafraîchit la liste.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, Clock, AlertCircle, Loader2, Inbox, RotateCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';
import { CASES } from '@/lib/regles-metier';
import ResolveCasModal from '@/components/cas-a-traiter/ResolveCasModal';
import Pagination, { usePagination } from '@/components/ui/Pagination';

const ACTIONS_PAR_CAS = {
  eleve_sans_carnet: [
    { value: 'encaisse',     label: 'Encaissé sur place',         desc: 'L\'élève a payé.' },
    { value: 'carnet_vendu', label: 'Carnet vendu',                desc: 'Élève a acheté un carnet ; cours décompté.' },
    { value: 'offert',       label: 'Cours offert',                desc: 'Geste commercial, on n\'encaisse pas.' },
    { value: 'ignore',       label: 'À gérer plus tard',           desc: 'Marquer comme vu mais pas réglé.' },
  ],
  annulation_hors_delai: [
    { value: 'decompte',     label: 'Séance décomptée',            desc: 'On retire la séance du carnet.' },
    { value: 'excuse',       label: 'Excusé exceptionnellement',   desc: 'On rend la séance.' },
    { value: 'dette_creee',  label: 'Dette créée',                 desc: 'À régulariser au prochain achat.' },
  ],
  no_show: [
    { value: 'decompte',     label: 'Séance décomptée',            desc: 'Politique stricte appliquée cette fois.' },
    { value: 'excuse',       label: 'Excusé',                      desc: 'Crédit reporté.' },
  ],
  cours_annule_prof: [
    { value: 'credit_rendu', label: 'Crédit restitué',             desc: 'La séance est recréditée sur le carnet.' },
    { value: 'rembourse',    label: 'Remboursement effectué',      desc: 'Cash / virement / Stripe refund.' },
    { value: 'reporte',      label: 'Reporté sur autre cours',     desc: 'L\'élève a basculé sur une autre séance.' },
    { value: 'ignore',       label: 'Pas d\'action requise',       desc: 'Élève prévenue, rien à faire de plus.' },
  ],
  carnet_expire_avant_cours: [
    { value: 'prolonge',       label: 'Carnet prolongé',           desc: 'Date de fin étendue jusqu\'à ce cours.' },
    { value: 'nouveau_carnet', label: 'Nouveau carnet vendu',      desc: 'L\'élève a renouvelé son carnet.' },
    { value: 'unitaire',       label: 'Cours payé à l\'unité',     desc: 'L\'élève a payé ce cours en one-shot.' },
    { value: 'annule',         label: 'Réservation annulée',       desc: 'On retire l\'inscription.' },
  ],
  liste_attente: [
    { value: 'place_donnee', label: 'Place attribuée',             desc: 'L\'élève a confirmé son inscription.' },
    { value: 'declinee',     label: 'Place déclinée',              desc: 'L\'élève n\'a pas confirmé / pas pris la place.' },
  ],
  workshop_vs_cours: [
    { value: 'paye_stripe',  label: 'Paiement Stripe reçu',        desc: 'L\'élève a réglé via le lien Stripe.' },
    { value: 'paye_place',   label: 'Paiement sur place',          desc: 'Cash / chèque / virement reçu.' },
    { value: 'ignore',       label: 'À gérer plus tard',           desc: 'Marquer comme vu mais pas réglé.' },
  ],
};

const UNDO_WINDOW_DAYS = 7;

export default function CasATraiterClient({ casOuverts, casResolus }) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [items, setItems] = useState(casOuverts);
  const [history, setHistory] = useState(casResolus);
  const [activeTab, setActiveTab] = useState('ouverts');
  const [undoLoadingId, setUndoLoadingId] = useState(null);

  // Pagination 8/page sur les 2 onglets
  const itemsPag   = usePagination(items, 8);
  const historyPag = usePagination(history, 8);

  // Modal state
  const [modalItem, setModalItem] = useState(null);
  const [modalAction, setModalAction] = useState(null);
  const [modalActionLabel, setModalActionLabel] = useState('');

  // Détection du retour depuis un formulaire (?cas_resolu=ID)
  useEffect(() => {
    const casResoluId = searchParams.get('cas_resolu');
    if (casResoluId) {
      toast.success('Cas résolu après création de la ressource ✓');
      // Refresh : on retire le cas des items (s'il y était) et on l'ajoute en historique
      setItems(prev => prev.filter(c => c.id !== casResoluId));
      // Soft refresh côté serveur — on ne refetch pas, le user_will reload pour voir
      // Nettoyer l'URL
      router.replace('/cas-a-traiter', { scroll: false });
    }
  }, [searchParams, toast, router]);

  const openModal = (item, action) => {
    const actionDef = (ACTIONS_PAR_CAS[item.case_type] || []).find(a => a.value === action);
    setModalItem(item);
    setModalAction(action);
    setModalActionLabel(actionDef?.label || action);
  };

  const closeModal = () => {
    setModalItem(null);
    setModalAction(null);
  };

  const handleResolved = (resolvedCas) => {
    setItems(prev => prev.filter(c => c.id !== resolvedCas.id));
    setHistory(prev => [resolvedCas, ...prev].slice(0, 30));
    toast.success('Cas résolu ✓');
  };

  // Annulation d'un cas résolu (limite 7j)
  const undoResolve = async (item) => {
    if (!confirm('Annuler la résolution de ce cas ? Il repassera en "Ouverts".')) return;
    setUndoLoadingId(item.id);
    try {
      const res = await fetch(`/api/cas-a-traiter/${item.id}/undo`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');

      setHistory(prev => prev.filter(c => c.id !== item.id));
      setItems(prev => [json.cas, ...prev]);
      toast.success(json.ressource_warning || 'Cas réouvert ✓');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUndoLoadingId(null);
    }
  };

  const isUndoable = (item) => {
    if (!item.resolu_at) return false;
    const ageDays = (Date.now() - new Date(item.resolu_at).getTime()) / (1000 * 60 * 60 * 24);
    return ageDays <= UNDO_WINDOW_DAYS;
  };

  const caseLabel = (caseType) => {
    const c = CASES.find(x => x.id === caseType);
    return c ? `${c.icone} ${c.titre}` : caseType;
  };

  const fmtDateCours = (d) => {
    if (!d) return '';
    return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  };

  const fmtRelativeTime = (iso) => {
    if (!iso) return '';
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'à l\'instant';
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `il y a ${days} j`;
    return new Date(iso).toLocaleDateString('fr-FR');
  };

  return (
    <div className="cas-page">
      <div className="page-header animate-fade-in">
        <h1>Cas à traiter</h1>
        {items.length > 0 && (
          <span className="count-badge count-badge-hot">{items.length}</span>
        )}
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 16, maxWidth: 720 }}>
        Situations détectées par l'app qui demandent ton attention. Chaque action te demande
        confirmation et te précise ce qui sera fait — pas de clic-piège. Le paramétrage
        des cas se fait dans <Link href="/parametres" style={{ color: 'var(--brand-700)', fontWeight: 600 }}>Paramètres → Règles → Cas particuliers</Link>.
      </p>

      <div className="cas-tabs">
        <button
          className={`cas-tab ${activeTab === 'ouverts' ? 'active' : ''}`}
          onClick={() => setActiveTab('ouverts')}
        >
          <Clock size={14} /> Ouverts ({items.length})
        </button>
        <button
          className={`cas-tab ${activeTab === 'historique' ? 'active' : ''}`}
          onClick={() => setActiveTab('historique')}
        >
          <CheckCircle2 size={14} /> Historique ({history.length})
        </button>
      </div>

      {/* Tab : Ouverts */}
      {activeTab === 'ouverts' && (
        <>
          {items.length === 0 ? (
            <div className="cas-empty">
              <Inbox size={32} />
              <div className="cas-empty-title">Tout est sous contrôle 🌿</div>
              <div className="cas-empty-desc">Aucun cas à traiter pour le moment.</div>
            </div>
          ) : (
            <div className="cas-list">
              {itemsPag.paginated.map(item => {
                const actions = ACTIONS_PAR_CAS[item.case_type] || [
                  { value: 'ignore', label: 'Marquer comme traité', desc: 'Action enregistrée.' },
                ];
                const ctx = item.context || {};
                const clientName = item.clients
                  ? [item.clients.prenom, item.clients.nom].filter(Boolean).join(' ')
                  : ctx.client_nom || 'Élève';
                const coursName = item.cours?.nom || ctx.cours_nom || '?';
                const coursDate = item.cours?.date || ctx.cours_date;

                return (
                  <div key={item.id} className="cas-card">
                    <div className="cas-card-header">
                      <AlertCircle size={18} className="cas-card-icon" />
                      <div className="cas-card-title-block">
                        <div className="cas-card-title">{caseLabel(item.case_type)}</div>
                        <div className="cas-card-subtitle">
                          <strong>{clientName}</strong> · {coursName} · {fmtDateCours(coursDate)}
                        </div>
                      </div>
                      <div className="cas-card-time">{fmtRelativeTime(item.created_at)}</div>
                    </div>

                    {ctx.choix_applique && (
                      <div className="cas-card-context">
                        Action auto appliquée : <strong>{ctx.choix_applique}</strong>
                        {ctx.dette_a_regler && <span className="cas-card-tag">💰 Dette à régler</span>}
                      </div>
                    )}
                    {item.clients?.email && (
                      <div className="cas-card-context">
                        Contact : <a href={`mailto:${item.clients.email}`}>{item.clients.email}</a>
                        {item.clients.telephone && <> · <a href={`tel:${item.clients.telephone}`}>{item.clients.telephone}</a></>}
                      </div>
                    )}

                    <div className="cas-actions">
                      {actions.map(action => (
                        <button
                          key={action.value}
                          className="cas-action-btn"
                          onClick={() => openModal(item, action.value)}
                          title={action.desc}
                        >
                          <CheckCircle2 size={14} />
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Pagination
            currentPage={itemsPag.currentPage}
            totalPages={itemsPag.totalPages}
            onChange={itemsPag.setPage}
            label="cas"
          />
        </>
      )}

      {/* Tab : Historique */}
      {activeTab === 'historique' && (
        <>
          {history.length === 0 ? (
            <div className="cas-empty">
              <CheckCircle2 size={32} />
              <div className="cas-empty-title">Pas encore d'historique</div>
              <div className="cas-empty-desc">Les cas que tu auras résolus apparaîtront ici.</div>
            </div>
          ) : (
            <div className="cas-list">
              {historyPag.paginated.map(item => {
                const ctx = item.context || {};
                const clientName = item.clients
                  ? [item.clients.prenom, item.clients.nom].filter(Boolean).join(' ')
                  : ctx.client_nom || 'Élève';
                const undoable = isUndoable(item);
                return (
                  <div key={item.id} className="cas-card cas-card-resolved">
                    <CheckCircle2 size={18} className="cas-card-icon" style={{ color: 'var(--success)' }} />
                    <div style={{ flex: 1 }}>
                      <div className="cas-card-title" style={{ fontSize: '0.875rem' }}>
                        {caseLabel(item.case_type)}
                      </div>
                      <div className="cas-card-subtitle">
                        <strong>{clientName}</strong> · {item.cours?.nom || ctx.cours_nom} ·
                        Résolu : <strong>{item.resolu_action}</strong>
                      </div>
                      {item.resolu_notes && (
                        <div className="cas-card-context" style={{ fontStyle: 'italic' }}>
                          📝 {item.resolu_notes}
                        </div>
                      )}
                    </div>
                    <div className="cas-card-resolved-right">
                      <div className="cas-card-time">{fmtRelativeTime(item.resolu_at)}</div>
                      {undoable && (
                        <button
                          className="cas-undo-btn"
                          onClick={() => undoResolve(item)}
                          disabled={undoLoadingId === item.id}
                          title="Annuler la résolution (sous 7 jours)"
                        >
                          {undoLoadingId === item.id ? <Loader2 size={12} className="spin" /> : <RotateCcw size={12} />}
                          <span>Annuler</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Pagination
            currentPage={historyPag.currentPage}
            totalPages={historyPag.totalPages}
            onChange={historyPag.setPage}
            label="cas résolus"
          />
        </>
      )}

      {/* Modal de résolution */}
      {modalItem && modalAction && (
        <ResolveCasModal
          item={modalItem}
          action={modalAction}
          actionLabel={modalActionLabel}
          onClose={closeModal}
          onResolved={handleResolved}
        />
      )}

      <style jsx global>{`
        .cas-page { display: flex; flex-direction: column; gap: 12px; padding-bottom: 80px; }
        .count-badge-hot { background: var(--hot-light); color: var(--hot); }

        .cas-tabs {
          display: flex; gap: 4px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 14px;
        }
        .cas-tab {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 14px;
          background: none; border: none;
          font-size: 0.875rem; font-weight: 500;
          color: var(--text-muted);
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          font-family: inherit;
        }
        .cas-tab.active {
          color: var(--brand-700);
          border-bottom-color: var(--brand);
          font-weight: 600;
        }

        .cas-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 8px; padding: 60px 20px; text-align: center;
          color: var(--text-muted);
        }
        .cas-empty-title { font-weight: 600; font-size: 1rem; color: var(--text-primary); }
        .cas-empty-desc { font-size: 0.875rem; }

        .cas-list { display: flex; flex-direction: column; gap: 8px; }

        .cas-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-left: 3px solid var(--hot);
          border-radius: var(--radius-md);
          padding: 14px 16px;
        }
        .cas-card-resolved {
          border-left-color: var(--success);
          opacity: 0.92;
          display: flex; align-items: flex-start; gap: 12px;
        }
        .cas-card-header {
          display: flex; align-items: flex-start; gap: 12px;
          margin-bottom: 6px;
        }
        .cas-card-icon { color: var(--hot); flex-shrink: 0; margin-top: 2px; }
        .cas-card-title-block { flex: 1; }
        .cas-card-title {
          font-weight: 600; font-size: 0.9375rem;
          color: var(--text-primary);
        }
        .cas-card-subtitle {
          font-size: 0.8125rem; color: var(--text-secondary);
          margin-top: 2px;
        }
        .cas-card-time {
          font-size: 0.75rem; color: var(--text-muted);
          flex-shrink: 0;
        }
        .cas-card-context {
          font-size: 0.8125rem; color: var(--text-secondary);
          margin: 6px 0 0; line-height: 1.4;
        }
        .cas-card-context a {
          color: var(--brand-700); text-decoration: none; font-weight: 500;
        }
        .cas-card-tag {
          display: inline-block;
          background: var(--hot-light); color: var(--hot);
          padding: 2px 8px; border-radius: 99px;
          font-size: 0.6875rem; font-weight: 600;
          margin-left: 6px;
        }

        .cas-card-resolved-right {
          display: flex; flex-direction: column; align-items: flex-end; gap: 6px;
          flex-shrink: 0;
        }
        .cas-undo-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 8px;
          background: white;
          border: 1px solid var(--border);
          border-radius: 99px;
          font-size: 0.75rem;
          color: var(--text-muted);
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s ease;
        }
        .cas-undo-btn:hover:not(:disabled) {
          border-color: var(--brand);
          color: var(--brand-700);
          background: var(--brand-light);
        }
        .cas-undo-btn:disabled { opacity: 0.6; cursor: wait; }

        .cas-actions {
          display: flex; flex-wrap: wrap; gap: 6px;
          margin-top: 12px;
        }
        .cas-action-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 7px 12px;
          background: var(--bg-card-hover);
          border: 1px solid var(--border);
          border-radius: 99px;
          font-size: 0.8125rem; font-weight: 500;
          color: var(--text-primary);
          cursor: pointer;
          transition: all var(--transition-fast);
          font-family: inherit;
        }
        .cas-action-btn:hover {
          background: var(--brand-light);
          border-color: var(--brand);
          color: var(--brand-700);
        }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
