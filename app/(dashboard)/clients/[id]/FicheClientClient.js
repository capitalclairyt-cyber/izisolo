'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Phone, Mail, Edit3, Ticket, Calendar,
  CheckCircle2, XCircle, Plus, X, Building2, MapPin,
  Banknote, CreditCard, Landmark, FileText, ChevronRight,
  Package, Zap, CalendarCheck, Loader2, CreditCard as CardIcon,
  MessageSquare
} from 'lucide-react';
import { formatDate, formatMontant } from '@/lib/utils';
import { getVocabulaire } from '@/lib/vocabulaire';
import { STATUTS_CLIENT, STATUTS_ABONNEMENT } from '@/lib/constantes';
import { createClient } from '@/lib/supabase';

// ─── Icônes par type d'offre ────────────────────────────────────────────────
const TYPE_ICONS = { carnet: Ticket, abonnement: CalendarCheck, cours_unique: Zap };

// ─── Modes de paiement manuel ───────────────────────────────────────────────
const MODES_PAIEMENT = [
  { value: 'especes',  label: 'Espèces',  Icon: Banknote },
  { value: 'cheque',   label: 'Chèque',   Icon: FileText },
  { value: 'virement', label: 'Virement', Icon: Landmark },
  { value: 'CB',       label: 'CB',       Icon: CreditCard },
];

// ─── Helper : calcule la date de fin selon durée en jours ───────────────────
function calcDateFin(dureeJours) {
  if (!dureeJours) return null;
  const d = new Date();
  d.setDate(d.getDate() + dureeJours);
  return d.toISOString().split('T')[0];
}

// ═══════════════════════════════════════════════════════════════════════════
// Modal tunnel de vente — appelé depuis FicheClient (client déjà connu)
// ═══════════════════════════════════════════════════════════════════════════
function AssignerOffreModal({ client, onClose, onSuccess }) {
  const [step, setStep] = useState('offre'); // 'offre' | 'paiement' | 'confirming'
  const [offres, setOffres] = useState([]);
  const [loadingOffres, setLoadingOffres] = useState(true);
  const [selectedOffre, setSelectedOffre] = useState(null);
  const [montant, setMontant] = useState('');
  const [modePaiement, setModePaiement] = useState('especes');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Charge les offres actives
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('offres')
        .select('*')
        .eq('actif', true)
        .order('ordre');
      setOffres(data || []);
      setLoadingOffres(false);
    };
    load();
  }, []);

  const selectOffre = (offre) => {
    setSelectedOffre(offre);
    setMontant(String(offre.prix));
    setStep('paiement');
  };

  const handleConfirm = async () => {
    if (!selectedOffre || !montant) return;
    setSubmitting(true);
    setError('');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const today = new Date().toISOString().split('T')[0];

      // 1. Créer l'abonnement
      const { data: abo, error: aboErr } = await supabase.from('abonnements').insert({
        profile_id: user.id,
        client_id: client.id,
        offre_id: selectedOffre.id,
        offre_nom: selectedOffre.nom,
        type: selectedOffre.type,
        date_debut: today,
        date_fin: calcDateFin(selectedOffre.duree_jours),
        seances_total: selectedOffre.seances || null,
        seances_utilisees: 0,
        statut: 'actif',
      }).select().single();

      if (aboErr) throw aboErr;

      // 2. Enregistrer le paiement
      const { error: payErr } = await supabase.from('paiements').insert({
        profile_id: user.id,
        client_id: client.id,
        offre_id: selectedOffre.id,
        abonnement_id: abo.id,
        intitule: selectedOffre.nom,
        type: selectedOffre.type,
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
            <button className="modal-back" onClick={() => setStep('offre')} type="button">
              <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
            </button>
          ) : (
            <div style={{ width: 36 }} />
          )}
          <span className="modal-title">
            {step === 'offre' ? 'Choisir une offre' : 'Paiement'}
          </span>
          <button className="modal-close" onClick={onClose} type="button"><X size={20} /></button>
        </div>

        {/* Step 1 — Choix offre */}
        {step === 'offre' && (
          <div className="modal-body">
            {loadingOffres ? (
              <div className="modal-loading"><Loader2 size={24} className="spin" /> Chargement...</div>
            ) : offres.length === 0 ? (
              <div className="modal-empty">
                <Package size={32} />
                <p>Aucune offre active.</p>
                <Link href="/offres/nouveau" className="izi-btn izi-btn-secondary" onClick={onClose}>
                  Créer une offre
                </Link>
              </div>
            ) : (
              <div className="offre-list">
                {offres.map(offre => {
                  const TypeIcon = TYPE_ICONS[offre.type] || Package;
                  return (
                    <button key={offre.id} className="offre-choice-btn" onClick={() => selectOffre(offre)} type="button">
                      <div className="offre-choice-icon"><TypeIcon size={20} /></div>
                      <div className="offre-choice-info">
                        <span className="offre-choice-nom">{offre.nom}</span>
                        <span className="offre-choice-detail">
                          {offre.type === 'carnet' && `${offre.seances} séances`}
                          {offre.type === 'abonnement' && `${offre.duree_jours}j`}
                          {offre.type === 'cours_unique' && 'Séance unique'}
                        </span>
                      </div>
                      <span className="offre-choice-prix">{formatMontant(offre.prix)}</span>
                      <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Paiement */}
        {step === 'paiement' && selectedOffre && (
          <div className="modal-body">
            {/* Récap offre */}
            <div className="paiement-recap">
              <span className="paiement-recap-nom">{selectedOffre.nom}</span>
              <span className="paiement-recap-client">pour {[client.prenom, client.nom_structure || client.nom].filter(Boolean).join(' ')}</span>
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
              {/* Stripe — bientôt */}
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
            {parseFloat(montant) !== selectedOffre.prix && montant && (
              <p className="montant-hint">
                Prix catalogue : {formatMontant(selectedOffre.prix)}
              </p>
            )}

            {/* Notes optionnelles */}
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
export default function FicheClientClient({ client, profile, abonnements: abosInit, presences, lieux }) {
  const router = useRouter();
  const vocab = getVocabulaire(profile?.metier || 'yoga', profile?.vocabulaire);
  const [activeTab, setActiveTab] = useState('abonnements');
  const [showAssignerModal, setShowAssignerModal] = useState(false);
  const [abonnements, setAbonnements] = useState(abosInit);

  const statutInfo = STATUTS_CLIENT[client.statut] || STATUTS_CLIENT.prospect;
  const isPro = client.type_client && client.type_client !== 'particulier';
  const initials = isPro
    ? (client.nom_structure || client.nom || '?').substring(0, 2).toUpperCase()
    : ((client.prenom?.[0] || '') + (client.nom?.[0] || '')).toUpperCase();
  const displayName = isPro
    ? (client.nom_structure || client.nom)
    : [client.prenom, client.nom].filter(Boolean).join(' ');

  const proLabels = { association: 'Association', studio: 'Studio', entreprise: 'Entreprise', autre_pro: 'Autre pro' };

  const handleOffreAdded = async () => {
    // Recharge les abonnements du client
    const supabase = createClient();
    const { data } = await supabase
      .from('abonnements')
      .select('*, offre:offres(nom, type)')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false });
    setAbonnements(data || []);
    setShowAssignerModal(false);
  };

  return (
    <div className="fiche-client">
      {/* Header */}
      <div className="page-header animate-fade-in">
        <Link href="/clients" className="back-btn"><ArrowLeft size={20} /></Link>
        <span className="header-title">{isPro ? 'Fiche client pro' : `Fiche ${vocab.client || 'élève'}`}</span>
        <div className="header-actions">
          <Link
            href={`/communication?client_id=${client.id}`}
            className="header-msg-btn"
            title="Envoyer un message"
          >
            <MessageSquare size={16} />
            <span className="header-msg-label">Message</span>
          </Link>
          <Link href={`/clients/${client.id}/edit`} className="edit-btn"><Edit3 size={18} /></Link>
        </div>
      </div>

      {/* Profil card */}
      <div className="profile-card izi-card animate-slide-up">
        <div className={`profile-avatar ${isPro ? 'pro' : ''}`}>
          {isPro ? <Building2 size={32} /> : initials}
        </div>
        <h2 className="profile-name">{displayName}</h2>
        <div className="profile-badges">
          {isPro && <span className="izi-badge izi-badge-brand">{proLabels[client.type_client] || 'Pro'}</span>}
          <span className={`izi-badge izi-badge-${statutInfo.color}`}>{statutInfo.label}</span>
        </div>

        <div className="profile-contacts">
          {client.telephone && (
            <a href={`tel:${client.telephone}`} className="contact-btn contact-btn-tel"
               title="Appeler">
              <Phone size={16} /> {client.telephone}
            </a>
          )}
          {client.email && (
            <Link
              href={`/communication?client_id=${client.id}`}
              className="contact-btn contact-btn-mail"
              title="Envoyer un e-mail via Communication"
            >
              <Mail size={16} /> {client.email}
            </Link>
          )}
        </div>

        {isPro && (
          <div className="pro-details">
            {client.siret && <span className="pro-detail">SIRET : {client.siret}</span>}
            {client.adresse && <span className="pro-detail"><MapPin size={14} /> {client.adresse}</span>}
          </div>
        )}

        {client.notes && <p className="profile-notes">{client.notes}</p>}

        <div className="profile-meta">
          {!isPro && client.niveau && <span className="meta-item">Niveau : {client.niveau}</span>}
          {!isPro && client.source && <span className="meta-item">Via : {client.source}</span>}
          <span className="meta-item">Inscrit le {formatDate(client.created_at)}</span>
        </div>
      </div>

      {/* Lieux associés (client pro) */}
      {isPro && lieux && lieux.length > 0 && (
        <div className="lieux-section izi-card animate-slide-up">
          <div className="lieux-header"><MapPin size={16} /> Lieux / Salles</div>
          <div className="lieux-list">
            {lieux.map(l => (
              <div key={l.id} className="lieu-item">
                <span className="lieu-nom">{l.nom}</span>
                {l.adresse && <span className="lieu-adresse">{l.adresse}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs animate-slide-up">
        <button
          className={`tab ${activeTab === 'abonnements' ? 'active' : ''}`}
          onClick={() => setActiveTab('abonnements')}
        >
          <Ticket size={16} /> Offres ({abonnements.length})
        </button>
        <button
          className={`tab ${activeTab === 'presences' ? 'active' : ''}`}
          onClick={() => setActiveTab('presences')}
        >
          <CheckCircle2 size={16} /> Présences ({presences.length})
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'abonnements' && (
        <div className="tab-content">
          {/* Header avec bouton + */}
          <div className="tab-actions">
            <button
              className="izi-btn izi-btn-primary add-offre-btn"
              onClick={() => setShowAssignerModal(true)}
            >
              <Plus size={18} /> Ajouter une offre
            </button>
          </div>

          {abonnements.length === 0 ? (
            <div className="empty-mini">Aucune offre souscrite</div>
          ) : (
            abonnements.map(abo => {
              const sInfo = STATUTS_ABONNEMENT[abo.statut] || {};
              const restantes = abo.seances_total != null ? (abo.seances_total - (abo.seances_utilisees || 0)) : null;
              return (
                <div key={abo.id} className="abo-card izi-card">
                  <div className="abo-top">
                    <span className="abo-nom">{abo.offre_nom}</span>
                    <span className={`izi-badge izi-badge-${sInfo.color || 'neutral'}`}>{sInfo.label || abo.statut}</span>
                  </div>
                  {restantes !== null && (
                    <div className="abo-progress">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${Math.max(0, (restantes / abo.seances_total) * 100)}%` }}
                        />
                      </div>
                      <span className="progress-text">{restantes}/{abo.seances_total} séances</span>
                    </div>
                  )}
                  {abo.date_fin && <div className="abo-meta">Expire le {formatDate(abo.date_fin)}</div>}
                  {abo.date_debut && <div className="abo-meta">Depuis le {formatDate(abo.date_debut)}</div>}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'presences' && (
        <div className="tab-content">
          {presences.length === 0 ? (
            <div className="empty-mini">Aucune présence enregistrée</div>
          ) : (
            presences.map(p => (
              <div key={p.id} className="presence-item">
                <div className={`presence-icon ${p.pointee ? 'done' : 'absent'}`}>
                  {p.pointee ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                </div>
                <div className="presence-info">
                  <span className="presence-cours">{p.cours?.nom || 'Cours'}</span>
                  <span className="presence-date">
                    {p.cours?.date && formatDate(p.cours.date)}{p.cours?.heure && ` à ${p.cours.heure.substring(0, 5)}`}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal tunnel de vente */}
      {showAssignerModal && (
        <AssignerOffreModal
          client={client}
          onClose={() => setShowAssignerModal(false)}
          onSuccess={handleOffreAdded}
        />
      )}

      <style jsx global>{`
        .fiche-client { display: flex; flex-direction: column; gap: 16px; padding-bottom: 40px; }
        .page-header { display: flex; align-items: center; gap: 12px; }
        .header-title { flex: 1; font-size: 1.0625rem; font-weight: 600; }
        .back-btn, .edit-btn { width: 40px; height: 40px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--bg-card); display: flex; align-items: center; justify-content: center; color: var(--text-secondary); text-decoration: none; flex-shrink: 0; }
        .header-actions { display: flex; align-items: center; gap: 8px; }
        .header-msg-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 14px; height: 40px; border-radius: var(--radius-sm);
          border: 1px solid var(--brand); background: var(--brand-light);
          color: var(--brand-700); text-decoration: none;
          font-size: 0.8125rem; font-weight: 600;
          transition: all 0.15s;
        }
        .header-msg-btn:hover { background: var(--brand); color: white; }
        .header-msg-label { display: none; }
        @media (min-width: 400px) { .header-msg-label { display: inline; } }

        .profile-card { display: flex; flex-direction: column; align-items: center; padding: 24px 16px; gap: 8px; text-align: center; }
        .profile-avatar { width: 80px; height: 80px; border-radius: 50%; background: var(--brand); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; }
        .profile-avatar.pro { border-radius: var(--radius-md); }
        .profile-badges { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
        .profile-name { font-size: 1.25rem; font-weight: 700; }
        .pro-details { display: flex; flex-direction: column; gap: 4px; align-items: center; font-size: 0.8125rem; color: var(--text-secondary); }
        .pro-detail { display: flex; align-items: center; gap: 4px; }
        .profile-contacts { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 8px; }
        .contact-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: var(--radius-full); background: var(--brand-light); color: var(--brand-700); text-decoration: none; font-size: 0.8125rem; font-weight: 500; min-height: 40px; transition: all 0.15s; }
        .contact-btn:hover { filter: brightness(0.95); }
        .contact-btn:active { transform: scale(0.97); }
        /* Tel : vert pour indiquer que c'est un appel */
        .contact-btn-tel { background: #dcfce7; color: #166534; }
        /* Mail : pointe vers Communication, look légèrement différent */
        .contact-btn-mail { background: #eff6ff; color: #1d4ed8; }
        .profile-notes { font-size: 0.875rem; color: var(--text-secondary); font-style: italic; padding: 8px 12px; background: var(--cream-dark); border-radius: var(--radius-sm); max-width: 100%; }
        .profile-meta { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; font-size: 0.75rem; color: var(--text-muted); }

        .tabs { display: flex; gap: 4px; background: var(--cream-dark); border-radius: var(--radius-md); padding: 4px; }
        .tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border-radius: var(--radius-sm); border: none; background: none; color: var(--text-secondary); font-size: 0.8125rem; font-weight: 600; cursor: pointer; min-height: 44px; }
        .tab.active { background: var(--bg-card); color: var(--brand-700); box-shadow: var(--shadow-sm); }

        .tab-content { display: flex; flex-direction: column; gap: 8px; }
        .tab-actions { display: flex; justify-content: flex-end; }
        .add-offre-btn { font-size: 0.875rem; padding: 8px 14px; }
        .empty-mini { text-align: center; padding: 24px; color: var(--text-muted); font-size: 0.875rem; }

        .abo-card { padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
        .abo-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .abo-nom { font-weight: 600; font-size: 0.9375rem; flex: 1; }
        .abo-progress { display: flex; align-items: center; gap: 8px; }
        .progress-bar { flex: 1; height: 6px; background: var(--cream-dark); border-radius: 3px; overflow: hidden; }
        .progress-fill { height: 100%; background: var(--brand); border-radius: 3px; transition: width 0.3s ease; }
        .progress-text { font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; }
        .abo-meta { font-size: 0.75rem; color: var(--text-muted); }

        .presence-item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); }
        .presence-icon { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .presence-icon.done { background: #d4e8d4; color: #3d703d; }
        .presence-icon.absent { background: #f2d4d4; color: #8c2a2a; }
        .presence-info { display: flex; flex-direction: column; }
        .presence-cours { font-weight: 600; font-size: 0.875rem; }
        .presence-date { font-size: 0.75rem; color: var(--text-muted); }

        .lieux-section { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
        .lieux-header { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 0.9375rem; color: var(--brand-700); }
        .lieux-list { display: flex; flex-direction: column; gap: 6px; }
        .lieu-item { padding: 10px 12px; background: var(--cream, #faf8f5); border-radius: var(--radius-sm); border: 1px solid var(--border); display: flex; flex-direction: column; gap: 2px; }
        .lieu-nom { font-weight: 600; font-size: 0.875rem; }
        .lieu-adresse { font-size: 0.75rem; color: var(--text-muted); }

        /* ── Modal ── */
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

        /* Offre choice list */
        .offre-list { display: flex; flex-direction: column; gap: 6px; }
        .offre-choice-btn { display: flex; align-items: center; gap: 12px; padding: 14px 12px; background: var(--cream, #faf8f5); border: 1.5px solid var(--border); border-radius: var(--radius-md); cursor: pointer; text-align: left; transition: all var(--transition-fast); width: 100%; }
        .offre-choice-btn:hover { border-color: var(--brand); background: var(--brand-light); }
        .offre-choice-icon { width: 40px; height: 40px; border-radius: var(--radius-sm); background: var(--brand-light); color: var(--brand); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .offre-choice-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .offre-choice-nom { font-weight: 600; font-size: 0.9375rem; color: var(--text-primary); }
        .offre-choice-detail { font-size: 0.75rem; color: var(--text-muted); }
        .offre-choice-prix { font-weight: 700; font-size: 1rem; color: var(--brand); }

        /* Paiement step */
        .paiement-recap { padding: 12px 14px; background: var(--brand-light); border-radius: var(--radius-md); border: 1px solid var(--brand); display: flex; flex-direction: column; gap: 2px; }
        .paiement-recap-nom { font-weight: 700; font-size: 1rem; color: var(--brand-700); }
        .paiement-recap-client { font-size: 0.8125rem; color: var(--brand-700); opacity: 0.8; }

        .paiement-section-label { font-size: 0.8125rem; font-weight: 700; color: var(--text-secondary); margin-top: 4px; }

        .mode-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .mode-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; padding: 12px 8px; border-radius: var(--radius-md); border: 1.5px solid var(--border); background: var(--bg-card); font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all var(--transition-fast); min-height: 64px; position: relative; }
        .mode-btn.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
        .mode-btn:not(.active):hover { border-color: var(--brand); }
        .mode-btn-soon { opacity: 0.45; cursor: not-allowed; }
        .soon-badge { position: absolute; top: 4px; right: 4px; background: var(--text-muted); color: white; font-size: 0.625rem; font-weight: 700; padding: 1px 5px; border-radius: var(--radius-full); }

        .montant-row { display: flex; align-items: center; gap: 8px; }
        .montant-input { flex: 1; font-size: 1.25rem; font-weight: 700; text-align: right; }
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
