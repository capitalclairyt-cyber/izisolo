'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import {
  ArrowLeft, Phone, Mail, Edit3, Ticket, Calendar,
  CheckCircle2, XCircle, Plus, X, Building2, MapPin,
  Banknote, CreditCard, Landmark, FileText, ChevronRight,
  Package, Zap, CalendarCheck, Loader2,
  MessageSquare, Wallet, AlertCircle, Trash2, PlusCircle,
} from 'lucide-react';
import { formatDate, formatMontant } from '@/lib/utils';
import { getVocabulaire } from '@/lib/vocabulaire';
import { STATUTS_CLIENT, STATUTS_ABONNEMENT, STATUTS_PAIEMENT } from '@/lib/constantes';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';
import PaiementStep from '@/components/paiements/PaiementStep';

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
// Sentinel pour le cas "Paiement libre" (pas d'abonnement créé, juste
// un paiement avec intitulé + montant libres — utile pour les cours
// spéciaux à tarif unique, frais ponctuels, etc.)
const OFFRE_LIBRE = {
  id: '__libre__',
  nom: 'Autre prestation',
  type: '__libre__',
  prix: 0,
};

function AssignerOffreModal({ client, onClose, onSuccess }) {
  const [step, setStep] = useState('offre'); // 'offre' | 'paiement'
  const [offres, setOffres] = useState([]);
  const [loadingOffres, setLoadingOffres] = useState(true);
  const [selectedOffre, setSelectedOffre] = useState(null);
  const [intituleLibre, setIntituleLibre] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isLibre = selectedOffre?.id === '__libre__';

  // Charge les offres actives
  // CRITIQUE : filtrer par profile_id côté client. La RLS v25 expose les
  // offres de TOUS les studios actifs, sans filtre on leakerait toutes
  // les offres de tout le monde.
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingOffres(false); return; }
      const { data } = await supabase
        .from('offres')
        .select('*')
        .eq('profile_id', user.id)
        .eq('actif', true)
        .order('ordre');
      setOffres(data || []);
      setLoadingOffres(false);
    };
    load();
  }, []);

  const selectOffre = (offre) => {
    setSelectedOffre(offre);
    if (offre.id === '__libre__') {
      setIntituleLibre('');
    }
    setStep('paiement');
  };

  const handleConfirm = async ({ montant, modePaiement, notes, multiVersement, versements }) => {
    if (!selectedOffre) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const today = new Date().toISOString().split('T')[0];

      let aboId = null;

      // Mode libre : pas d'abonnement à créer (juste un paiement one-shot)
      // Mode offre : on crée un abonnement lié à l'offre + le paiement
      if (!isLibre) {
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
        aboId = abo.id;
      }

      if (multiVersement && versements.length > 1) {
        const echId = crypto.randomUUID();
        const rows = versements.map((v, i) => ({
          profile_id: user.id,
          client_id: client.id,
          offre_id: isLibre ? null : selectedOffre.id,
          abonnement_id: aboId,
          echeancier_id: echId,
          intitule: `${isLibre ? intituleLibre.trim() : selectedOffre.nom} (${i + 1}/${versements.length})`,
          type: isLibre ? null : selectedOffre.type,
          montant: v.montant,
          statut: i === 0 ? 'paid' : 'pending',
          mode: i === 0 ? modePaiement : null,
          date: v.date,
          notes: i === 0 ? (notes || null) : null,
        }));
        const { error: payErr } = await supabase.from('paiements').insert(rows);
        if (payErr) throw payErr;
      } else {
        const { error: payErr } = await supabase.from('paiements').insert({
          profile_id: user.id,
          client_id: client.id,
          offre_id: isLibre ? null : selectedOffre.id,
          abonnement_id: aboId,
          intitule: isLibre ? intituleLibre.trim() : selectedOffre.nom,
          type: isLibre ? null : selectedOffre.type,
          montant: montant,
          statut: 'paid',
          mode: modePaiement,
          date: today,
          notes: notes || null,
        });
        if (payErr) throw payErr;
      }

      onSuccess();
    } catch (err) {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet animate-slide-up" role="dialog" aria-modal="true">

        {/* Header */}
        <div className="modal-header">
          {step === 'paiement' ? (
            <button className="modal-back" onClick={() => setStep('offre')} type="button" aria-label="Retour">
              <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
            </button>
          ) : (
            <div style={{ width: 36 }} />
          )}
          <span className="modal-title">
            {step === 'offre' ? 'Choisir une offre' : 'Paiement'}
          </span>
          <button className="modal-close" onClick={onClose} type="button" aria-label="Fermer"><X size={20} /></button>
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

                {/* Option "Autre prestation" — paiement libre sans abo lié.
                    Utile pour : cours spécial à tarif spécial, frais ponctuel,
                    paiement d'une commande extérieure au catalogue, etc. */}
                <button
                  className="offre-choice-btn offre-choice-libre"
                  onClick={() => selectOffre(OFFRE_LIBRE)}
                  type="button"
                >
                  <div className="offre-choice-icon"><Package size={20} /></div>
                  <div className="offre-choice-info">
                    <span className="offre-choice-nom">Autre prestation</span>
                    <span className="offre-choice-detail">
                      Saisie libre (intitulé + montant) — pas de carnet créé
                    </span>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Paiement (composant partagé) */}
        {step === 'paiement' && selectedOffre && (
          <PaiementStep
            offreNom={selectedOffre.nom}
            clientNom={[client.prenom, client.nom_structure || client.nom].filter(Boolean).join(' ')}
            offrePrix={selectedOffre.prix}
            isLibre={isLibre}
            intituleLibre={intituleLibre}
            onIntituleLibreChange={setIntituleLibre}
            onConfirm={handleConfirm}
            submitting={submitting}
          />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Composant principal
// ═══════════════════════════════════════════════════════════════════════════
export default function FicheClientClient({ client, profile, abonnements: abosInit, presences, paiements: paiementsInit = [], lieux }) {
  const router = useRouter();
  const { toast } = useToast();
  const vocab = getVocabulaire(profile?.metier || 'yoga', profile?.vocabulaire);
  const [activeTab, setActiveTab] = useState('abonnements');
  const [showAssignerModal, setShowAssignerModal] = useState(false);
  const [abonnements, setAbonnements] = useState(abosInit);
  const [paiements, setPaiements] = useState(paiementsInit);
  const [encaisserModal, setEncaisserModal] = useState(null);
  const [encaisserMode, setEncaisserMode] = useState('especes');
  const [encaisserNotes, setEncaisserNotes] = useState('');
  const [encaisserLoading, setEncaisserLoading] = useState(false);

  // Pagination 8/page sur les 3 onglets (présences, paiements, abonnements).
  // Cas concret du bug remonté 2026-05-07 : un élève avec 16 présences
  // affichait 16 lignes d'affilée. Avec 8/page, on a 2 pages max sur la
  // plupart des cas, et la fiche reste lisible même à 50+ items.
  const presencesPag    = usePagination(presences, 8);
  const paiementsPag    = usePagination(paiements, 8);
  const abonnementsPag  = usePagination(abonnements, 8);

  // Totaux paiements
  const totaux = (() => {
    const acc = { paid: 0, pending: 0, overdue: 0 };
    for (const p of paiements) {
      const m = parseFloat(p.montant || 0);
      if (p.statut === 'paid') acc.paid += m;
      else if (p.statut === 'pending') acc.pending += m;
      else if (p.statut === 'overdue') acc.overdue += m;
    }
    return acc;
  })();
  const nbImpayes = paiements.filter(p => p.statut === 'pending' || p.statut === 'overdue').length;

  const openEncaisser = (paiement) => {
    setEncaisserModal(paiement);
    setEncaisserMode(paiement.mode || 'especes');
    setEncaisserNotes('');
  };

  const submitEncaisser = async () => {
    if (!encaisserModal) return;
    setEncaisserLoading(true);
    try {
      const res = await fetch(`/api/paiements/${encaisserModal.id}/encaisser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: encaisserMode, ...(encaisserNotes.trim() ? { notes: encaisserNotes.trim() } : {}) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      const today = new Date().toISOString().slice(0, 10);
      setPaiements(prev => prev.map(p =>
        p.id === encaisserModal.id ? { ...p, statut: 'paid', mode: encaisserMode, date_encaissement: today } : p
      ));
      toast.success('Paiement encaissé !');
      setEncaisserModal(null);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setEncaisserLoading(false);
    }
  };

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
    // Recharge abonnements ET paiements après création (la modale crée
    // les 2 ressources, il faut donc rafraîchir les 2 tabs).
    // Bug fixé 2026-05-06 : avant on ne rechargeait que les abonnements,
    // donc le paiement créé n'apparaissait pas dans l'onglet Paiements
    // tant que la prof ne refreshait pas la page.
    const supabase = createClient();
    const [{ data: abos }, { data: pays }] = await Promise.all([
      supabase
        .from('abonnements')
        .select('*, offre:offres(nom, type)')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('paiements')
        .select('*')
        .eq('client_id', client.id)
        .order('date', { ascending: false }),
    ]);
    setAbonnements(abos || []);
    setPaiements(pays || []);
    setShowAssignerModal(false);
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

  const deleteAbonnement = async (abo) => {
    const aboPays = paiements.filter(p => p.abonnement_id === abo.id);
    const msg = aboPays.length > 0
      ? `Supprimer "${abo.offre_nom}" et ses ${aboPays.length} paiement(s) associé(s) ?`
      : `Supprimer "${abo.offre_nom}" ?`;
    if (!confirm(msg)) return;
    try {
      const res = await fetch(`/api/abonnements/${abo.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      setAbonnements(prev => prev.filter(a => a.id !== abo.id));
      setPaiements(prev => prev.filter(p => p.abonnement_id !== abo.id));
      toast.success('Offre supprimée');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const [editAboModal, setEditAboModal] = useState(null);
  const [editAboStatut, setEditAboStatut] = useState('actif');
  const [editAboDateFin, setEditAboDateFin] = useState('');
  const [editAboSeances, setEditAboSeances] = useState('');
  const [editAboSubmitting, setEditAboSubmitting] = useState(false);

  const openEditAbo = (abo) => {
    setEditAboModal(abo);
    setEditAboStatut(abo.statut || 'actif');
    setEditAboDateFin(abo.date_fin || '');
    setEditAboSeances(abo.seances_total != null ? String(abo.seances_total) : '');
  };

  const saveEditAbo = async () => {
    if (!editAboModal) return;
    setEditAboSubmitting(true);
    try {
      const body = { statut: editAboStatut };
      if (editAboDateFin) body.date_fin = editAboDateFin;
      else body.date_fin = null;
      if (editAboSeances !== '') body.seances_total = parseInt(editAboSeances, 10);
      const res = await fetch(`/api/abonnements/${editAboModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      setAbonnements(prev => prev.map(a => a.id === editAboModal.id ? { ...a, ...body } : a));
      setEditAboModal(null);
      toast.success('Offre modifiée');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setEditAboSubmitting(false);
    }
  };

  const [versementModal, setVersementModal] = useState(null);
  const [versementMontant, setVersementMontant] = useState('');
  const [versementMode, setVersementMode] = useState('especes');
  const [versementDate, setVersementDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [versementSubmitting, setVersementSubmitting] = useState(false);

  const ajouterVersement = async () => {
    if (!versementModal || !versementMontant) return;
    setVersementSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const existingEch = paiements.find(p => p.abonnement_id === versementModal.id && p.echeancier_id);
      const { error: payErr } = await supabase.from('paiements').insert({
        profile_id: user.id,
        client_id: client.id,
        offre_id: versementModal.offre_id || null,
        abonnement_id: versementModal.id,
        echeancier_id: existingEch?.echeancier_id || null,
        intitule: `${versementModal.offre_nom} (versement)`,
        type: versementModal.type,
        montant: parseFloat(versementMontant),
        statut: 'pending',
        mode: versementMode,
        date: versementDate,
      });
      if (payErr) throw payErr;
      const { data: pays } = await supabase
        .from('paiements')
        .select('*')
        .eq('client_id', client.id)
        .order('date', { ascending: false });
      setPaiements(pays || []);
      setVersementModal(null);
      toast.success('Versement ajouté');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setVersementSubmitting(false);
    }
  };

  const hasNoActivity = abonnements.length === 0 && paiements.length === 0;

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

        {/* Infos personnelles enrichies (v40 — date naissance + adresse + champs perso) */}
        {!isPro && (client.date_naissance || client.adresse_postale || (client.custom_fields && Object.keys(client.custom_fields).length > 0)) && (
          <div className="profile-extras">
            {client.date_naissance && (
              <div className="extra-item">
                <span className="extra-label">🎂 Anniversaire</span>
                <span className="extra-value">{formatDate(client.date_naissance)}</span>
              </div>
            )}
            {client.adresse_postale && (
              <div className="extra-item">
                <span className="extra-label">📍 Adresse</span>
                <span className="extra-value">{client.adresse_postale}</span>
              </div>
            )}
            {/* Champs perso : on lit les labels depuis profile.client_fields_config */}
            {client.custom_fields && Array.isArray(profile?.client_fields_config?.custom) &&
              profile.client_fields_config.custom
                .filter(cf => client.custom_fields[cf.id] !== undefined && client.custom_fields[cf.id] !== '')
                .map(cf => (
                  <div key={cf.id} className="extra-item">
                    <span className="extra-label">{cf.label || '(champ)'}</span>
                    <span className="extra-value">{client.custom_fields[cf.id]}</span>
                  </div>
                ))
            }
          </div>
        )}

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

      {/* Onboarding — visible si aucune offre ET aucun paiement */}
      {hasNoActivity && (
        <div className="onboarding-card izi-card animate-slide-up">
          <div className="onboarding-icon"><Ticket size={28} /></div>
          <div className="onboarding-text">
            <strong>Première étape</strong>
            <p>Associe une offre à {displayName} pour commencer le suivi des paiements et présences.</p>
          </div>
          <button
            className="izi-btn izi-btn-primary"
            onClick={() => setShowAssignerModal(true)}
          >
            <Plus size={18} /> Ajouter une offre
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-bar animate-slide-up">
        <button
          className={`tab-btn ${activeTab === 'abonnements' ? 'active' : ''}`}
          onClick={() => setActiveTab('abonnements')}
        >
          <Ticket size={16} /> Offres ({abonnements.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'paiements' ? 'active' : ''}`}
          onClick={() => setActiveTab('paiements')}
        >
          <Wallet size={16} /> Paiements ({paiements.length})
          {nbImpayes > 0 && <span className="tab-badge">{nbImpayes}</span>}
        </button>
        <button
          className={`tab-btn ${activeTab === 'presences' ? 'active' : ''}`}
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
            abonnementsPag.paginated.map(abo => {
              const sInfo = STATUTS_ABONNEMENT[abo.statut] || {};
              const restantes = abo.seances_total != null ? (abo.seances_total - (abo.seances_utilisees || 0)) : null;
              const aboPaiements = paiements.filter(p => p.abonnement_id === abo.id);
              const aboRecu = aboPaiements.filter(p => p.statut === 'paid').reduce((s, p) => s + parseFloat(p.montant || 0), 0);
              const aboTotal = aboPaiements.reduce((s, p) => s + parseFloat(p.montant || 0), 0);
              const aboReste = aboTotal - aboRecu;
              const fullyPaid = aboPaiements.length > 0 && aboReste < 0.01;
              return (
                <div key={abo.id} className="abo-card izi-card">
                  <div className="abo-top">
                    <span className="abo-nom">{abo.offre_nom}</span>
                    <div className="abo-top-right">
                      <span className={`izi-badge izi-badge-${sInfo.color || 'neutral'}`}>{sInfo.label || abo.statut}</span>
                      <button className="abo-action-btn" onClick={() => openEditAbo(abo)} title="Modifier"><Edit3 size={13} /></button>
                      <button className="abo-action-btn abo-action-delete" onClick={() => deleteAbonnement(abo)} title="Supprimer"><Trash2 size={13} /></button>
                    </div>
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
                  {fullyPaid ? (
                    <div className="abo-paiements-resume">
                      <span className="abo-regle"><CheckCircle2 size={14} /> Réglé — {formatMontant(aboRecu)}</span>
                      <div className="abo-pay-bar">
                        <div className="abo-pay-fill" style={{ width: '100%' }} />
                      </div>
                    </div>
                  ) : aboPaiements.length > 0 ? (
                    <div className="abo-paiements-resume">
                      <span className="abo-recu">{formatMontant(aboRecu)} reçu</span>
                      {aboReste > 0 && <span className="abo-reste">· {formatMontant(aboReste)} restant</span>}
                      {aboTotal > 0 && (
                        <div className="abo-pay-bar">
                          <div className="abo-pay-fill" style={{ width: `${Math.min(100, (aboRecu / aboTotal) * 100)}%` }} />
                        </div>
                      )}
                    </div>
                  ) : null}
                  {abo.date_fin && <div className="abo-meta">Expire le {formatDate(abo.date_fin)}</div>}
                  {abo.date_debut && <div className="abo-meta">Depuis le {formatDate(abo.date_debut)}</div>}
                  {abo.statut === 'actif' && !fullyPaid && (
                    <button
                      className="abo-add-versement"
                      onClick={() => {
                        setVersementModal(abo);
                        setVersementMontant('');
                        setVersementMode('especes');
                        setVersementDate(new Date().toISOString().split('T')[0]);
                      }}
                      type="button"
                    >
                      <PlusCircle size={14} /> Ajouter un versement
                    </button>
                  )}
                </div>
              );
            })
          )}
          <Pagination
            currentPage={abonnementsPag.currentPage}
            totalPages={abonnementsPag.totalPages}
            onChange={abonnementsPag.setPage}
            label="abonnements"
          />
        </div>
      )}

      {activeTab === 'paiements' && (
        <div className="tab-content">
          {/* Récap totaux */}
          <div className="paiements-totaux">
            <div className="totaux-item">
              <span className="totaux-label">Encaissé</span>
              <span className="totaux-value" style={{ color: '#16a34a' }}>{formatMontant(totaux.paid)}</span>
            </div>
            {totaux.pending > 0 && (
              <div className="totaux-item">
                <span className="totaux-label">En attente</span>
                <span className="totaux-value" style={{ color: '#ca8a04' }}>{formatMontant(totaux.pending)}</span>
              </div>
            )}
            {totaux.overdue > 0 && (
              <div className="totaux-item">
                <span className="totaux-label">En retard</span>
                <span className="totaux-value" style={{ color: '#dc2626' }}>{formatMontant(totaux.overdue)}</span>
              </div>
            )}
          </div>

          {/* Le bouton "Saisir un paiement" ouvre la MÊME modale que celle
              de l'onglet Offres (AssignerOffreModal) au lieu d'envoyer la
              prof sur la page /revenus/nouveau où elle devait re-chercher
              son client. La modale propose maintenant l'option "Autre
              prestation" pour les paiements libres (cours spécial, frais
              ponctuels, etc.). */}
          <div className="tab-actions">
            <button
              onClick={() => setShowAssignerModal(true)}
              className="izi-btn izi-btn-primary add-offre-btn"
              type="button"
            >
              <Plus size={18} /> Saisir un paiement
            </button>
          </div>

          {paiements.length === 0 ? (
            <div className="empty-mini">Aucun paiement enregistré pour {vocab.client || 'cet élève'}</div>
          ) : (
            <div className="paiements-list-fiche">
              {paiementsPag.paginated.map(p => {
                const sInfo = STATUTS_PAIEMENT[p.statut] || {};
                const canEncaisser = p.statut === 'pending' || p.statut === 'overdue';
                return (
                  <div key={p.id} className="paiement-fiche-item">
                    <div className="paiement-fiche-info">
                      <div className="paiement-fiche-nom">{p.intitule || 'Paiement'}</div>
                      <div className="paiement-fiche-meta">
                        {formatDate(p.date)} · {p.mode || '—'}
                        {p.date_encaissement && p.date_encaissement !== p.date && (
                          <> · encaissé le {formatDate(p.date_encaissement)}</>
                        )}
                      </div>
                      {p.notes && (
                        <div className="paiement-fiche-notes">{p.notes}</div>
                      )}
                    </div>
                    <div className="paiement-fiche-right">
                      <div className="paiement-fiche-montant">{formatMontant(p.montant)}</div>
                      <span className={`izi-badge izi-badge-${sInfo.color || 'neutral'}`}>{sInfo.label || p.statut}</span>
                      {canEncaisser && (
                        <button
                          onClick={() => openEncaisser(p)}
                          className="encaisser-btn-fiche"
                          title="Encaisser ce paiement"
                        >
                          <CheckCircle2 size={12} /> Encaisser
                        </button>
                      )}
                      <button
                        onClick={() => deletePaiement(p)}
                        className="delete-pay-btn-fiche"
                        title="Supprimer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Pagination
            currentPage={paiementsPag.currentPage}
            totalPages={paiementsPag.totalPages}
            onChange={paiementsPag.setPage}
            label="paiements"
          />
        </div>
      )}

      {activeTab === 'presences' && (
        <div className="tab-content">
          {presences.length === 0 ? (
            <div className="empty-mini">Aucune présence enregistrée</div>
          ) : (
            presencesPag.paginated.map(p => (
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
          <Pagination
            currentPage={presencesPag.currentPage}
            totalPages={presencesPag.totalPages}
            onChange={presencesPag.setPage}
            label="présences"
          />
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

      {/* Modal ajouter versement */}
      {versementModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setVersementModal(null); }}>
          <div className="modal-sheet versement-sheet animate-slide-up" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div style={{ width: 36 }} />
              <span className="modal-title">Ajouter un versement</span>
              <button className="modal-close" onClick={() => setVersementModal(null)} type="button" aria-label="Fermer"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="paiement-recap">
                <span className="paiement-recap-nom">{versementModal.offre_nom}</span>
                <span className="paiement-recap-client">pour {displayName}</span>
              </div>

              <div className="paiement-section-label">Mode de règlement</div>
              <div className="mode-grid">
                {MODES_PAIEMENT.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    className={`mode-btn ${versementMode === value ? 'active' : ''}`}
                    onClick={() => setVersementMode(value)}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <div className="paiement-section-label">Montant</div>
              <div className="montant-row">
                <input
                  className="izi-input montant-input"
                  type="number" step="0.01" min="0"
                  value={versementMontant}
                  onChange={e => setVersementMontant(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                />
                <span className="montant-currency">€</span>
              </div>

              <div className="paiement-section-label">Date d'échéance</div>
              <input
                className="izi-input"
                type="date"
                value={versementDate}
                onChange={e => setVersementDate(e.target.value)}
              />

              <button
                type="button"
                className="izi-btn izi-btn-primary confirm-btn"
                onClick={ajouterVersement}
                disabled={versementSubmitting || !versementMontant}
              >
                {versementSubmitting ? <><Loader2 size={16} className="spin" /> Enregistrement...</> : <>✓ Ajouter le versement</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal modifier abonnement */}
      {editAboModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setEditAboModal(null); }}>
          <div className="modal-sheet versement-sheet animate-slide-up" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div style={{ width: 36 }} />
              <span className="modal-title">Modifier l'offre</span>
              <button className="modal-close" onClick={() => setEditAboModal(null)} type="button" aria-label="Fermer"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="paiement-recap">
                <span className="paiement-recap-nom">{editAboModal.offre_nom}</span>
                <span className="paiement-recap-client">pour {displayName}</span>
              </div>

              <div className="paiement-section-label">Statut</div>
              <div className="edit-abo-statut-chips">
                {[
                  { value: 'actif', label: 'Actif' },
                  { value: 'suspendu', label: 'Suspendu' },
                  { value: 'expire', label: 'Expiré' },
                  { value: 'resilie', label: 'Résilié' },
                ].map(s => (
                  <button
                    key={s.value}
                    type="button"
                    className={`multi-nb-chip ${editAboStatut === s.value ? 'active' : ''}`}
                    onClick={() => setEditAboStatut(s.value)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {editAboModal.seances_total != null && (
                <>
                  <div className="paiement-section-label">Séances totales</div>
                  <input
                    className="izi-input"
                    type="number"
                    min="0"
                    value={editAboSeances}
                    onChange={e => setEditAboSeances(e.target.value)}
                  />
                </>
              )}

              <div className="paiement-section-label">Date de fin</div>
              <input
                className="izi-input"
                type="date"
                value={editAboDateFin}
                onChange={e => setEditAboDateFin(e.target.value)}
              />

              <button
                type="button"
                className="izi-btn izi-btn-primary confirm-btn"
                onClick={saveEditAbo}
                disabled={editAboSubmitting}
              >
                {editAboSubmitting ? <><Loader2 size={16} className="spin" /> Enregistrement...</> : <>Enregistrer</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal encaisser un paiement */}
      {encaisserModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setEncaisserModal(null); }}>
          <div className="modal-sheet versement-sheet animate-slide-up" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div style={{ width: 36 }} />
              <span className="modal-title">Encaisser</span>
              <button className="modal-close" onClick={() => setEncaisserModal(null)} type="button" aria-label="Fermer"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="paiement-recap">
                <span className="paiement-recap-nom">{encaisserModal.intitule || 'Paiement'}</span>
                <span className="paiement-recap-client">{formatMontant(encaisserModal.montant)} · pour {displayName}</span>
              </div>

              <div className="paiement-section-label">Mode de règlement</div>
              <div className="mode-grid">
                {MODES_PAIEMENT.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    className={`mode-btn ${encaisserMode === value ? 'active' : ''}`}
                    onClick={() => setEncaisserMode(value)}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <div className="paiement-section-label">Notes (optionnel)</div>
              <input
                className="izi-input"
                type="text"
                value={encaisserNotes}
                onChange={e => setEncaisserNotes(e.target.value)}
                placeholder="N° chèque, référence virement..."
              />

              <button
                type="button"
                className="izi-btn izi-btn-primary confirm-btn"
                onClick={submitEncaisser}
                disabled={encaisserLoading}
              >
                {encaisserLoading ? <><Loader2 size={16} className="spin" /> Enregistrement...</> : <><CheckCircle2 size={16} /> Encaisser</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .fiche-client { display: flex; flex-direction: column; gap: 16px; padding-bottom: 40px; }

        /* Tab badge (impayés) */
        .tab-badge {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 18px; height: 18px; border-radius: 99px;
          background: #fef2f2; color: #dc2626;
          font-size: 0.6875rem; font-weight: 700;
          padding: 0 5px; margin-left: 4px;
          border: 1px solid #fecaca;
        }

        /* Onglet Paiements */
        .paiements-totaux {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px;
          margin-bottom: 14px;
        }
        .totaux-item {
          display: flex; flex-direction: column; align-items: center;
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--radius-md); padding: 12px 10px; text-align: center;
        }
        .totaux-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }
        .totaux-value { font-size: 1.0625rem; font-weight: 700; margin-top: 4px; }

        .paiements-list-fiche { display: flex; flex-direction: column; gap: 6px; }
        .paiement-fiche-item {
          display: flex; align-items: flex-start; gap: 12px;
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--radius-md); padding: 12px 14px;
        }
        .paiement-fiche-info { flex: 1; min-width: 0; }
        .paiement-fiche-nom { font-weight: 600; font-size: 0.9375rem; color: var(--text-primary); }
        .paiement-fiche-meta { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
        .paiement-fiche-notes {
          font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;
          font-style: italic; line-height: 1.4;
        }
        .paiement-fiche-right {
          display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0;
        }
        .paiement-fiche-montant { font-weight: 700; font-size: 1rem; }
        .encaisser-btn-fiche {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 10px; border-radius: var(--radius-full);
          border: 1px solid #6ee7b7; background: #ecfdf5;
          font-size: 0.7rem; font-weight: 600; color: #065f46;
          cursor: pointer; transition: all 0.15s;
        }
        .encaisser-btn-fiche:hover:not(:disabled) { background: #6ee7b7; color: #064e3b; }
        .encaisser-btn-fiche:disabled { opacity: 0.6; cursor: wait; }
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

        /* Infos enrichies : date naissance + adresse + champs perso (v40) */
        .profile-extras {
          display: flex; flex-direction: column; gap: 6px;
          width: 100%; max-width: 480px;
          margin-top: 8px;
          padding: 10px 14px;
          background: var(--cream, #faf8f5);
          border-radius: var(--radius-sm);
          font-size: 0.8125rem;
        }
        .extra-item {
          display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline;
        }
        .extra-label {
          font-weight: 600; color: var(--text-secondary);
          flex-shrink: 0;
        }
        .extra-value {
          color: var(--text-primary);
          word-break: break-word;
        }

        /* tabs-bar / tab-btn → globals.css */

        .tab-content { display: flex; flex-direction: column; gap: 8px; }
        .tab-actions { display: flex; justify-content: flex-end; }
        .add-offre-btn { font-size: 0.875rem; padding: 8px 14px; }
        .empty-mini { text-align: center; padding: 24px; color: var(--text-muted); font-size: 0.875rem; }

        .abo-card { padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
        .abo-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .abo-top-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
        .abo-nom { font-weight: 600; font-size: 0.9375rem; flex: 1; }
        .abo-action-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 28px; height: 28px; border-radius: var(--radius-sm, 6px);
          border: none; background: none; color: var(--text-muted);
          cursor: pointer; transition: all 0.15s;
        }
        .abo-action-btn:hover { background: var(--cream-dark, #f0ede8); color: var(--text-primary); }
        .abo-action-delete:hover { background: #fef2f2; color: #dc2626; }
        .edit-abo-statut-chips { display: flex; gap: 6px; flex-wrap: wrap; }
        .abo-progress { display: flex; align-items: center; gap: 8px; }
        .progress-bar { flex: 1; height: 6px; background: var(--cream-dark); border-radius: 3px; overflow: hidden; }
        .progress-fill { height: 100%; background: var(--brand); border-radius: 3px; transition: width 0.3s ease; }
        .progress-text { font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; }
        .abo-meta { font-size: 0.75rem; color: var(--text-muted); }
        .abo-paiements-resume { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 0.8125rem; }
        .abo-recu { font-weight: 600; color: #16a34a; }
        .abo-regle { display: inline-flex; align-items: center; gap: 5px; font-weight: 600; color: #16a34a; font-size: 0.8125rem; }
        .abo-reste { color: #ca8a04; font-weight: 500; }
        .abo-pay-bar { width: 100%; height: 4px; background: var(--cream-dark, #eee); border-radius: 2px; overflow: hidden; margin-top: 2px; }
        .abo-pay-fill { height: 100%; background: #16a34a; border-radius: 2px; transition: width 0.3s ease; }

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

        /* Onboarding card */
        .onboarding-card {
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          padding: 28px 20px; text-align: center;
          border: 2px dashed var(--brand); background: var(--brand-light);
        }
        .onboarding-icon {
          width: 56px; height: 56px; border-radius: 50%;
          background: var(--brand); color: white;
          display: flex; align-items: center; justify-content: center;
        }
        .onboarding-text strong { display: block; font-size: 1rem; margin-bottom: 4px; }
        .onboarding-text p { font-size: 0.8125rem; color: var(--text-secondary); margin: 0; }

        /* Abo +Versement */
        .abo-add-versement {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 10px; border-radius: var(--radius-full);
          border: 1px solid var(--brand); background: var(--brand-light);
          font-size: 0.7rem; font-weight: 600; color: var(--brand-700);
          cursor: pointer; transition: all 0.15s; align-self: flex-start;
        }
        .abo-add-versement:hover { background: var(--brand); color: white; }

        /* Delete paiement btn */
        .delete-pay-btn-fiche {
          display: inline-flex; align-items: center;
          padding: 4px 6px; border-radius: var(--radius-sm, 6px);
          border: none; background: none;
          color: var(--text-muted); cursor: pointer; transition: all 0.15s;
        }
        .delete-pay-btn-fiche:hover { background: #fef2f2; color: #dc2626; }

        /* Multi-versement */
        .multi-toggle-row { display: flex; gap: 8px; }
        .multi-toggle-btn {
          flex: 1; padding: 8px 12px; border-radius: var(--radius-full);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; transition: all 0.15s;
        }
        .multi-toggle-btn.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
        .multi-nb-chips { display: flex; gap: 6px; flex-wrap: wrap; }
        .multi-nb-chip {
          padding: 6px 14px; border-radius: var(--radius-full);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; transition: all 0.15s;
        }
        .multi-nb-chip.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
        .multi-v-list { display: flex; flex-direction: column; gap: 6px; }
        .multi-v-row {
          display: flex; align-items: center; gap: 8px; padding: 8px 10px;
          background: var(--cream, #faf8f5); border-radius: var(--radius-sm);
          font-size: 0.8125rem;
        }
        .multi-v-label { font-weight: 600; flex-shrink: 0; min-width: 80px; }
        .multi-v-date { color: var(--text-muted); flex: 1; }
        .multi-v-montant { font-weight: 700; }
        .multi-v-statut { font-size: 0.6875rem; font-weight: 600; padding: 2px 8px; border-radius: var(--radius-full); }
        .multi-v-statut.paid { background: #dcfce7; color: #166534; }
        .multi-v-statut.pending { background: #fef3c7; color: #92400e; }
        .multi-total { font-size: 0.8125rem; font-weight: 600; text-align: right; }
        .multi-total.ok { color: #16a34a; }
        .multi-total.warn { color: #dc2626; }

        /* Versement sheet */
        .versement-sheet { max-width: 440px; }
      `}</style>
    </div>
  );
}
