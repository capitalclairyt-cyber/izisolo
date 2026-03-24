'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Check, X, CheckCircle2, XCircle,
  UserPlus, Clock, Calendar, MapPin, AlertTriangle,
  CheckCheck, Info, Plus, Lock, CreditCard, Sparkles
} from 'lucide-react';
import { formatHeure } from '@/lib/utils';
import { parseDate } from '@/lib/dates';
import { getVocabulaire } from '@/lib/vocabulaire';
import { createClient } from '@/lib/supabase';
import { evaluerRegles } from '@/lib/regles';
import { useToast } from '@/components/ui/ToastProvider';


// ─────────────────────────────────────────────────────────
//  Déterminer si un élève est en situation de paiement dû
// ─────────────────────────────────────────────────────────
function isImpaye(presence, paidIds) {
  if (presence.type_presence === 'essai' || presence.type_presence === 'offert') return false;
  if (paidIds.has(presence.id)) return false;
  if (presence.payer_plus_tard) return false; // dette différée → traitée séparément
  const abo = presence.abonnements;
  if (!abo) return false;
  if (['epuise', 'expire', 'annule'].includes(abo.statut)) return true;
  if (abo.seances_total !== null && (abo.seances_utilisees || 0) >= abo.seances_total) return true;
  return false;
}
function isPtard(presence, paidIds) {
  if (paidIds.has(presence.id)) return false;
  return !!presence.payer_plus_tard;
}


// ─────────────────────────────────────────────────────────
//  Modal paiement rapide
// ─────────────────────────────────────────────────────────
function PaymentModal({ presence, coursNom, coursDate, onClose, onSaved, onPayerPlusTard, ptardAuto = false, ptardAutoNom = '' }) {
  const client  = presence.clients || {};
  const abo     = presence.abonnements;
  const { toast } = useToast();
  const [montant, setMontant]   = useState('');
  const [mode, setMode]         = useState('CB');
  const [saving, setSaving]     = useState(false);
  const [confirming, setConfirming] = useState(false); // étape confirmation "payer plus tard"

  const aboLabel = abo
    ? abo.statut === 'epuise'  ? '📭 Carnet épuisé'
    : abo.statut === 'expire'  ? '⌛ Abonnement expiré'
    : abo.statut === 'annule'  ? '❌ Abonnement annulé'
    : `Séances : ${abo.seances_utilisees || 0}/${abo.seances_total}`
    : null;

  const handleSave = async () => {
    const val = parseFloat(montant);
    if (!val || val <= 0) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('paiements').insert({
        profile_id: user.id,
        client_id:  presence.client_id,
        intitule:   `${coursNom} — ${coursDate}`,
        montant:    val,
        statut:     'paid',
        mode,
        date:       new Date().toISOString().split('T')[0],
        notes:      'Encaissement rapide depuis le pointage',
      });
      onSaved(presence.id);
      onClose();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmPtard = () => {
    onPayerPlusTard(presence);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="pm-modal" onClick={e => e.stopPropagation()}>

        <div className="pm-header">
          <h3><CreditCard size={18} /> Règlement — {client.prenom} {client.nom}</h3>
          <button className="modal-close-x" onClick={onClose}>✕</button>
        </div>

        {!confirming ? (
          <>
            <div className="pm-body">
              {aboLabel && <div className="pm-abo-warning">{aboLabel}</div>}

              <div className="form-group" style={{ marginTop: 10 }}>
                <label className="form-label">Montant (€)</label>
                <input
                  className="izi-input pm-amount-input"
                  type="number" min="0" step="0.5"
                  placeholder="ex : 15.00"
                  value={montant}
                  onChange={e => setMontant(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="pm-modes">
                {['CB', 'Espèces', 'Chèque', 'Virement'].map(m => (
                  <button key={m} className={`pm-mode-btn ${mode === m ? 'selected' : ''}`} onClick={() => setMode(m)}>
                    {m === 'CB'       && <CreditCard size={13} />}
                    {m === 'Espèces'  && <span>💶</span>}
                    {m === 'Chèque'   && <span>📝</span>}
                    {m === 'Virement' && <span>🔁</span>}
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="pm-footer">
              <button
                className={`izi-btn pm-ptard-btn ${ptardAuto ? 'pm-ptard-auto' : 'izi-btn-ghost'}`}
                onClick={() => ptardAuto ? handleConfirmPtard() : setConfirming(true)}
                title={ptardAuto ? `Accordé automatiquement — règle : "${ptardAutoNom}"` : undefined}
              >
                ⏰ Payer plus tard{ptardAuto && <span className="pm-auto-badge">auto</span>}
              </button>
              <button
                className="izi-btn pm-save-btn"
                onClick={handleSave}
                disabled={saving || !montant || parseFloat(montant) <= 0}
              >
                <Check size={15} />
                {saving ? 'Enregistrement…' : `Encaisser ${montant ? parseFloat(montant).toFixed(2) + ' €' : ''}`}
              </button>
            </div>
          </>
        ) : (
          <div className="pm-confirm-zone">
            <div className="pm-confirm-icon">⏰</div>
            <p className="pm-confirm-text">
              Confirmer que <strong>{client.prenom} {client.nom}</strong> paiera ce cours ultérieurement ?
            </p>
            <p className="pm-confirm-hint">
              Un rappel apparaîtra lors des prochains pointages.
            </p>
            <div className="pm-confirm-btns">
              <button className="izi-btn izi-btn-ghost" onClick={() => setConfirming(false)}>
                ← Retour
              </button>
              <button className="izi-btn pm-ptard-confirm-btn" onClick={handleConfirmPtard}>
                Oui, noter la dette
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────
//  Carte de présence (split cell)
// ─────────────────────────────────────────────────────────
function PresenceCard({ presence, onMarquer, onPayer, onTypePresence, loading, locked, impaye, ptard, nbDettes, essaisRestants }) {
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  // Fermer le menu au premier clic en dehors
  useEffect(() => {
    if (!showTypeMenu) return;
    const close = () => setShowTypeMenu(false);
    document.addEventListener('click', close, { once: true });
    return () => document.removeEventListener('click', close);
  }, [showTypeMenu]);

  const client   = presence.clients || {};
  const abo      = presence.abonnements;
  const statut   = presence.statut_pointage || (presence.pointee ? 'present' : 'inscrit');
  const typeP    = presence.type_presence || 'normal';
  const initials = ((client.prenom?.[0] || '') + (client.nom?.[0] || '')).toUpperCase() || '?';

  const seancesRestantes = abo?.seances_total != null
    ? Math.max(0, abo.seances_total - (abo.seances_utilisees || 0)) : null;

  const heurePointage = presence.heure_pointage
    ? new Date(presence.heure_pointage).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null;

  // Clic sur zone présent : marquer + auto-ouvrir paiement si impayé
  const handleOk = () => {
    if (locked) return;
    const newStatut = statut === 'present' ? 'inscrit' : 'present';
    onMarquer(presence, newStatut);
    if (newStatut === 'present' && impaye) onPayer(presence);
  };

  return (
    <div
      className={`pres-row state-${statut}${loading ? ' pres-loading' : ''}${impaye ? ' pres-impaye' : ''}${ptard ? ' pres-ptard' : ''}`}
      onClick={() => showTypeMenu && setShowTypeMenu(false)}
    >

      {/* ── Zone PRÉSENT (gauche) ── */}
      <button className="pres-zone zone-ok" onClick={handleOk} disabled={loading} aria-label="Marquer présent">
        <div className="zone-circle">
          {locked ? <Lock size={20} />
            : statut === 'present' ? <CheckCircle2 size={26} strokeWidth={2.5} />
            : <Check size={24} strokeWidth={2} />}
        </div>
        <span className="zone-txt">Présent</span>
      </button>

      {/* ── Centre élève ── */}
      <div className="pres-center">
        <div className={`pres-avatar av-${client.statut || 'actif'}`}>{initials}</div>

        <div className="pres-body">
          <div className="pres-name-row">
            <span className="pres-name">{client.prenom} {client.nom}</span>
            {/* Badge impayé */}
            {impaye && !locked && (
              <button className="impaye-btn" onClick={e => { e.stopPropagation(); onPayer(presence); }} title="Impayé — encaisser">€</button>
            )}
            {/* Badge payer plus tard */}
            {ptard && !locked && (
              <button className="ptard-btn" onClick={e => { e.stopPropagation(); onPayer(presence); }} title="Paiement différé — encaisser maintenant">⏰</button>
            )}
            {/* Alerte multi-dettes */}
            {nbDettes >= 2 && (
              <span className="dette-alert" title={`${nbDettes} cours non réglés au total`}>⚠ {nbDettes}</span>
            )}
          </div>

          <div className="pres-meta">
            {abo && typeP === 'normal' && (
              <span className="pres-abo">
                {abo.offre_nom}
                {seancesRestantes !== null && (
                  <span className={seancesRestantes <= 1 ? 'pres-abo-warn' : ''}>
                    {' '}· {seancesRestantes} séance{seancesRestantes !== 1 ? 's' : ''}
                  </span>
                )}
              </span>
            )}
            {typeP !== 'normal' && (
              <span className={`pres-type-badge tp-badge-${typeP}`}>
                {typeP === 'essai' ? '🎟 Essai' : '🎁 Offert'}
              </span>
            )}
            {statut === 'present' && heurePointage && (
              <span className="pres-heure">✓ {heurePointage}</span>
            )}
          </div>
        </div>

        {/* Chip excusé */}
        {statut === 'absent' && !loading && !locked && (
          <button className="excuse-chip" onClick={e => { e.stopPropagation(); onMarquer(presence, 'excuse'); }}>
            <AlertTriangle size={10} /> Excusé
          </button>
        )}
        {statut === 'excuse' && (
          <span className="excuse-tag"><AlertTriangle size={10} /> Excusé</span>
        )}

        {/* Bouton ··· type de séance (discret, derrière un tap) */}
        {!locked && (
          <div className="tp-more-wrap">
            <button
              className={`tp-more-btn ${typeP !== 'normal' ? 'tp-more-active' : ''}`}
              onClick={e => { e.stopPropagation(); setShowTypeMenu(s => !s); }}
              title="Type de séance"
            >
              ···
            </button>
            {showTypeMenu && (
              <div className="tp-menu" onClick={e => e.stopPropagation()}>
                {[
                  { val: 'normal', label: 'Normal',           hint: null },
                  { val: 'essai',  label: '🎟 Cours d\'essai', hint: essaisRestants !== null ? `${essaisRestants} restant${essaisRestants !== 1 ? 's' : ''}` : null },
                  { val: 'offert', label: '🎁 Cours offert',   hint: null },
                ].map(({ val, label, hint }) => (
                  <button key={val}
                    className={`tp-menu-item ${typeP === val ? 'selected' : ''}`}
                    onClick={() => { onTypePresence(presence, val); setShowTypeMenu(false); }}
                  >
                    <span className="tpm-label">{label}</span>
                    {hint && <span className="tpm-hint">{hint}</span>}
                    {typeP === val && <span className="tpm-check">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {loading && <div className="pres-spinner" />}
      </div>

      {/* ── Zone ABSENT (droite) ── */}
      <button
        className="pres-zone zone-ko"
        onClick={() => !locked && onMarquer(presence, (statut === 'absent' || statut === 'excuse') ? 'inscrit' : 'absent')}
        disabled={loading}
        aria-label="Marquer absent"
      >
        <div className="zone-circle">
          {locked ? <Lock size={20} />
            : (statut === 'absent' || statut === 'excuse') ? <XCircle size={26} strokeWidth={2.5} />
            : <X size={24} strokeWidth={2} />}
        </div>
        <span className="zone-txt">Absent</span>
      </button>

    </div>
  );
}


// ─────────────────────────────────────────────────────────
//  Composant principal
// ─────────────────────────────────────────────────────────
export default function PointageClient({ cours, presences: initialPresences, tousClients, profile, dettesParClient = {}, regles = [] }) {
  const vocab = getVocabulaire(profile?.metier || 'yoga', profile?.vocabulaire);
  const { toast } = useToast();

  const [presences, setPresences]         = useState(initialPresences);
  const [showAddModal, setShowAddModal]   = useState(false);
  const [searchAdd, setSearchAdd]         = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paidIds, setPaidIds]             = useState(new Set());
  const [now, setNow]                     = useState(() => new Date());

  // ── Ajout modal : mode search / new ──────────────────
  const [addMode, setAddMode]               = useState('search');
  const [addTypePresence, setAddTypePresence] = useState('normal');
  const [newClientForm, setNewClientForm]   = useState({ prenom: '', nom: '', email: '', telephone: '' });
  const [addingNew, setAddingNew]           = useState(false);

  // Mise à jour de l'heure toutes les 30s
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // ── Calcul du verrou temporel ──────────────────────────
  const coursDateTime = useMemo(() => {
    if (!cours.date || !cours.heure) return null;
    const [h, m] = cours.heure.split(':').map(Number);
    const d = parseDate(cours.date);
    d.setHours(h, m, 0, 0);
    return d;
  }, [cours]);

  const minutesAvant = coursDateTime
    ? Math.round((coursDateTime - now) / 60_000)
    : -999;

  // Bloqué si > 15 min avant le cours
  const locked = minutesAvant > 15;
  // "Live" si dans la fenêtre [-15min, +120min]
  const isLive = minutesAvant <= 15 && minutesAvant > -120;

  const lockLabel = minutesAvant > 60
    ? `Disponible dans ${Math.floor(minutesAvant / 60)}h${minutesAvant % 60 > 0 ? String(minutesAvant % 60).padStart(2, '0') : ''}`
    : `Disponible dans ${minutesAvant} min`;

  // ── Règles d'annulation ────────────────────────────────
  const reglesAnnulation = useMemo(() => {
    const g = profile?.regles_annulation || { delai_heures: 24 };
    const parType = g.regles_par_type || {};
    const specific = cours.type_cours && parType[cours.type_cours];
    return specific ? { ...g, ...specific } : g;
  }, [profile, cours]);

  const regleMessage = reglesAnnulation.message
    || `Annulation acceptée jusqu'à ${reglesAnnulation.delai_heures}h avant le cours`;

  // ── Date lisible ──────────────────────────────────────
  const dateLisible = cours.date
    ? parseDate(cours.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  // ── Stats ─────────────────────────────────────────────
  const getStatut = p => p.statut_pointage || (p.pointee ? 'present' : 'inscrit');
  const nbPresents  = presences.filter(p => getStatut(p) === 'present').length;
  const nbAbsents   = presences.filter(p => getStatut(p) === 'absent').length;
  const nbExcuses   = presences.filter(p => getStatut(p) === 'excuse').length;
  const nbEnAttente = presences.length - nbPresents - nbAbsents - nbExcuses;
  const nbTotal     = presences.length;
  const tousTraites = nbTotal > 0 && nbEnAttente === 0;
  const tauxPresence = nbTotal > 0 ? Math.round((nbPresents / nbTotal) * 100) : 0;
  const nbImpayes   = presences.filter(p => isImpaye(p, paidIds)).length;
  const nbPtards    = presences.filter(p => isPtard(p, paidIds)).length;

  // ── Compteur essais ───────────────────────────────────
  const essaisParDefaut   = profile?.essais_par_defaut ?? 1;
  const essaisUtilises    = presences.filter(p => p.type_presence === 'essai').length;
  const essaisRestants    = Math.max(0, essaisParDefaut - essaisUtilises);

  // ── Clients dispo pour ajout ──────────────────────────
  const clientsInscrits = new Set(presences.map(p => p.client_id));
  const clientsFiltres  = tousClients
    .filter(c => !clientsInscrits.has(c.id))
    .filter(c => !searchAdd || `${c.prenom} ${c.nom}`.toLowerCase().includes(searchAdd.toLowerCase()));

  // ── Tri : en attente → présents → absents/excusés ─────
  const sortedPresences = useMemo(() => {
    const order = { inscrit: 0, present: 1, absent: 2, excuse: 3 };
    return [...presences].sort((a, b) => {
      const sa = getStatut(a), sb = getStatut(b);
      if (order[sa] !== order[sb]) return order[sa] - order[sb];
      return `${a.clients?.prenom} ${a.clients?.nom}`
        .localeCompare(`${b.clients?.prenom} ${b.clients?.nom}`, 'fr');
    });
  }, [presences]);

  // ── Marquer un élève ──────────────────────────────────
  const handleMarquer = useCallback(async (presence, newStatut) => {
    if (locked) return;
    setActionLoading(presence.id);
    const oldStatut  = getStatut(presence);
    const isPresent  = newStatut === 'present';
    const wasPresent = oldStatut === 'present';

    const supabase = createClient();
    const { error } = await supabase
      .from('presences')
      .update({
        statut_pointage: newStatut,
        pointee:         isPresent,
        heure_pointage:  isPresent ? new Date().toISOString() : null,
      })
      .eq('id', presence.id);

    if (!error) {
      // Maj compteur séances
      if (presence.abonnement_id && presence.abonnements) {
        const delta = isPresent ? 1 : wasPresent ? -1 : 0;
        if (delta !== 0) {
          const current = presence.abonnements.seances_utilisees || 0;
          await supabase
            .from('abonnements')
            .update({ seances_utilisees: Math.max(0, current + delta) })
            .eq('id', presence.abonnement_id);
        }
      }
      setPresences(prev => prev.map(p =>
        p.id !== presence.id ? p : {
          ...p,
          statut_pointage: newStatut,
          pointee: isPresent,
          heure_pointage: isPresent ? new Date().toISOString() : null,
          abonnements: p.abonnements ? {
            ...p.abonnements,
            seances_utilisees: (() => {
              const c = p.abonnements.seances_utilisees || 0;
              if (isPresent && !wasPresent) return c + 1;
              if (!isPresent && wasPresent) return Math.max(0, c - 1);
              return c;
            })(),
          } : null,
        }
      ));
    }
    setActionLoading(null);
  }, [locked]);

  // ── Tout marquer présent ──────────────────────────────
  const toutPresent = async () => {
    const enAttente = presences.filter(p => getStatut(p) === 'inscrit');
    for (const p of enAttente) await handleMarquer(p, 'present');
  };

  // ── Ajouter un élève existant ─────────────────────────
  const ajouterClient = async (client, typePresence = 'normal') => {
    setActionLoading(client.id);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const aboActif = client.abonnements?.find(a => a.statut === 'actif');

    const { data, error } = await supabase
      .from('presences')
      .insert({
        profile_id:      user.id,
        cours_id:        cours.id,
        client_id:       client.id,
        abonnement_id:   aboActif?.id || null,
        pointee:         false,
        statut_pointage: 'inscrit',
        type_presence:   typePresence,
      })
      .select('*, clients(id, prenom, nom, statut, email, telephone), abonnements(id, offre_nom, seances_total, seances_utilisees, statut)')
      .single();

    if (!error && data) setPresences(prev => [...prev, data]);
    setActionLoading(null);
    setShowAddModal(false);
    setSearchAdd('');
    setAddTypePresence('normal');
    setAddMode('search');
  };

  // ── Créer un nouveau client et l'inscrire ─────────────
  const creerEtAjouter = async () => {
    const { prenom, nom, email, telephone } = newClientForm;
    if (!prenom.trim() || !nom.trim()) return;
    setAddingNew(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Créer le client
    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .insert({
        profile_id: user.id,
        prenom:     prenom.trim(),
        nom:        nom.trim(),
        email:      email.trim() || null,
        telephone:  telephone.trim() || null,
        statut:     'actif',
      })
      .select()
      .single();

    if (clientErr) {
      toast.error('Erreur création client : ' + clientErr.message);
      setAddingNew(false);
      return;
    }

    // 2. Créer la présence
    const { data: pres, error: presErr } = await supabase
      .from('presences')
      .insert({
        profile_id:      user.id,
        cours_id:        cours.id,
        client_id:       client.id,
        pointee:         false,
        statut_pointage: 'inscrit',
        type_presence:   addTypePresence,
      })
      .select('*, clients(id, prenom, nom, statut, email, telephone), abonnements(id, offre_nom, seances_total, seances_utilisees, statut)')
      .single();

    if (!presErr && pres) setPresences(prev => [...prev, pres]);
    setAddingNew(false);
    setShowAddModal(false);
    setNewClientForm({ prenom: '', nom: '', email: '', telephone: '' });
    setAddTypePresence('normal');
    setAddMode('search');
  };

  // ── Changer le type de présence ───────────────────────
  const handleTypePresence = useCallback(async (presence, newType) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('presences')
      .update({ type_presence: newType })
      .eq('id', presence.id);
    if (!error) {
      setPresences(prev => prev.map(p =>
        p.id !== presence.id ? p : { ...p, type_presence: newType }
      ));
    }
  }, []);

  // ── Payer plus tard ───────────────────────────────────
  const handlePayerPlusTard = useCallback(async (presence) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('presences')
      .update({ payer_plus_tard: true })
      .eq('id', presence.id);
    if (!error) {
      setPresences(prev => prev.map(p =>
        p.id !== presence.id ? p : { ...p, payer_plus_tard: true }
      ));
    }
  }, []);

  const getInitials = c => {
    const cl = c.clients || c;
    return ((cl.prenom?.[0] || '') + (cl.nom?.[0] || '')).toUpperCase() || '?';
  };

  // ──────────────────────────────────────────────────────
  return (
    <div className="pointage-page">

      {/* ─── Header ─── */}
      <div className="pt-header animate-fade-in">
        <Link href={`/cours/${cours.id}`} className="back-btn">
          <ArrowLeft size={20} />
        </Link>
        <div className="pt-header-info">
          <h1>{cours.nom}</h1>
          <div className="pt-meta">
            {cours.date && <><Calendar size={13} /><span>{dateLisible}</span></>}
            {cours.heure && <><Clock size={13} /><span>{formatHeure(cours.heure)}{cours.duree_minutes ? ` · ${cours.duree_minutes}min` : ''}</span></>}
            {cours.lieu  && <><MapPin size={13} /><span>{cours.lieu}</span></>}
          </div>
        </div>
        {isLive && <span className="live-badge">EN COURS</span>}
      </div>

      {/* ─── Verrou temporel ─── */}
      {locked && (
        <div className="lock-banner animate-fade-in">
          <Lock size={16} />
          <div>
            <strong>Pointage pas encore disponible</strong>
            <span>{lockLabel} · Le pointage s'ouvre 15 min avant le début</span>
          </div>
        </div>
      )}

      {/* ─── Stats 4 colonnes ─── */}
      <div className="stats-grid animate-slide-up">
        <div className="sc sc-attente">
          <span className="sc-n">{nbEnAttente}</span>
          <span className="sc-l">En attente</span>
        </div>
        <div className="sc sc-present">
          <span className="sc-n">{nbPresents}</span>
          <span className="sc-l">Présents</span>
        </div>
        <div className="sc sc-absent">
          <span className="sc-n">{nbAbsents}</span>
          <span className="sc-l">Absents</span>
        </div>
        <div className="sc sc-excuse">
          <span className="sc-n">{nbExcuses}</span>
          <span className="sc-l">Excusés</span>
        </div>
      </div>

      {/* ─── Barre de progression ─── */}
      {nbTotal > 0 && (
        <div className="prog-wrap animate-slide-up">
          <div className="prog-bar">
            <div className="prog-fill fill-present" style={{ width: `${(nbPresents / nbTotal) * 100}%` }} />
            <div className="prog-fill fill-excuse"  style={{ width: `${(nbExcuses  / nbTotal) * 100}%` }} />
            <div className="prog-fill fill-absent"  style={{ width: `${(nbAbsents  / nbTotal) * 100}%` }} />
          </div>
          <span className="prog-label">{nbPresents + nbExcuses}/{nbTotal} traités</span>
        </div>
      )}

      {/* ─── Alerte impayes ─── */}
      {nbImpayes > 0 && (
        <div className="impaye-banner animate-slide-up">
          <span className="impaye-icon">€</span>
          <span>
            <strong>{nbImpayes} élève{nbImpayes > 1 ? 's' : ''}</strong> à encaisser
            — touchez le badge <strong>€</strong> sur leur carte
          </span>
        </div>
      )}

      {/* ─── Rappel payer plus tard ─── */}
      {nbPtards > 0 && (
        <div className="ptard-banner animate-slide-up">
          <span className="ptard-icon">⏰</span>
          <span>
            <strong>{nbPtards} paiement{nbPtards > 1 ? 's' : ''} différé{nbPtards > 1 ? 's' : ''}</strong>
            {' '}— pensez à faire la relance
          </span>
        </div>
      )}

      {/* ─── Règle d'annulation ─── */}
      {!locked && reglesAnnulation.delai_heures && (
        <div className="regles-banner animate-slide-up">
          <Info size={13} />
          <span>{regleMessage}</span>
        </div>
      )}

      {/* ─── Actions ─── */}
      {!locked && (
        <div className="quick-actions animate-slide-up">
          {nbEnAttente > 0 && (
            <button className="izi-btn izi-btn-primary qa-btn" onClick={toutPresent}>
              <CheckCheck size={16} />
              Tous présents ({nbEnAttente})
            </button>
          )}
          <button
            className={`izi-btn izi-btn-secondary qa-btn ${isLive ? 'qa-live' : ''}`}
            onClick={() => setShowAddModal(true)}
          >
            <UserPlus size={16} />
            {isLive ? '+ Dernière minute' : 'Ajouter'}
          </button>
        </div>
      )}

      {/* ─── Bravo ! ─── */}
      {tousTraites && !locked && (
        <div className="done-banner animate-pop">
          <div className="done-left">
            <Sparkles size={28} className="done-sparkle" />
          </div>
          <div className="done-body">
            <div className="done-title">Pointage terminé ! 🎉</div>
            <div className="done-sub">
              {nbPresents} présent{nbPresents > 1 ? 's' : ''}
              {nbAbsents > 0  ? ` · ${nbAbsents} absent${nbAbsents > 1 ? 's' : ''}` : ''}
              {nbExcuses > 0  ? ` · ${nbExcuses} excusé${nbExcuses > 1 ? 's' : ''}` : ''}
            </div>
          </div>
          <div className="done-pct">
            <span className="done-pct-n">{tauxPresence}%</span>
            <span className="done-pct-l">présence</span>
          </div>
        </div>
      )}

      {/* ─── Liste ─── */}
      {presences.length === 0 ? (
        <div className="empty-state izi-card animate-slide-up">
          <div className="empty-emoji">📋</div>
          <p className="empty-title">Aucun inscrit</p>
          <p className="empty-desc">Ajoute des {(vocab.clients || 'élèves').toLowerCase()} pour commencer</p>
          <button className="izi-btn izi-btn-primary" onClick={() => setShowAddModal(true)}>
            <UserPlus size={16} /> Ajouter un {vocab.client || 'élève'}
          </button>
        </div>
      ) : (
        <div className="presences-list animate-slide-up">
          {sortedPresences.map(p => (
            <PresenceCard
              key={p.id}
              presence={p}
              onMarquer={handleMarquer}
              onPayer={setPaymentTarget}
              onTypePresence={handleTypePresence}
              loading={actionLoading === p.id}
              locked={locked}
              impaye={isImpaye(p, paidIds)}
              ptard={isPtard(p, paidIds)}
              nbDettes={dettesParClient[p.client_id] || 0}
              essaisRestants={essaisRestants}
            />
          ))}
        </div>
      )}

      {/* ─── Modal : ajouter un élève ─── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => { setShowAddModal(false); setAddMode('search'); setAddTypePresence('normal'); setNewClientForm({ prenom: '', nom: '', email: '', telephone: '' }); }}>
          <div className="add-modal" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="modal-header">
              <h3><UserPlus size={18} /> {isLive ? '⚡ Ajout dernière minute' : `Ajouter un ${vocab.client || 'élève'}`}</h3>
              <button className="modal-close-x" onClick={() => { setShowAddModal(false); setAddMode('search'); setAddTypePresence('normal'); setNewClientForm({ prenom: '', nom: '', email: '', telephone: '' }); }}>✕</button>
            </div>

            {/* Onglets */}
            <div className="add-tabs">
              <button className={`add-tab ${addMode === 'search' ? 'active' : ''}`} onClick={() => setAddMode('search')}>
                Élève existant
              </button>
              <button className={`add-tab ${addMode === 'new' ? 'active' : ''}`} onClick={() => setAddMode('new')}>
                <Plus size={13} /> Nouveau client
              </button>
            </div>

            {/* Sélecteur type de présence (commun aux deux onglets) */}
            <div className="add-type-row">
              <span className="add-type-label">Type de séance :</span>
              {['normal', 'essai', 'offert'].map(t => (
                <button
                  key={t}
                  className={`add-type-btn ${addTypePresence === t ? 'selected' : ''} atp-${t}`}
                  onClick={() => setAddTypePresence(t)}
                >
                  {t === 'normal' ? 'Normal' : t === 'essai' ? '🎟 Essai' : '🎁 Offert'}
                </button>
              ))}
              {addTypePresence === 'essai' && (
                <span className="add-type-hint">
                  {essaisRestants > 0
                    ? `${essaisRestants} essai${essaisRestants > 1 ? 's' : ''} restant${essaisRestants > 1 ? 's' : ''}`
                    : 'Limite atteinte'}
                </span>
              )}
            </div>

            {/* ── Onglet : élève existant ── */}
            {addMode === 'search' && (
              <>
                <input
                  className="izi-input modal-search"
                  placeholder="Rechercher par nom…"
                  value={searchAdd}
                  onChange={e => setSearchAdd(e.target.value)}
                  autoFocus
                />
                <div className="modal-list">
                  {clientsFiltres.length === 0 ? (
                    <p className="modal-empty">
                      {searchAdd ? 'Aucun résultat' : 'Tous les élèves sont déjà inscrits'}
                    </p>
                  ) : (
                    clientsFiltres.map(c => (
                      <button
                        key={c.id}
                        className="modal-item"
                        onClick={() => ajouterClient(c, addTypePresence)}
                        disabled={actionLoading === c.id}
                      >
                        <div className={`modal-avatar av-${c.statut}`}>{getInitials(c)}</div>
                        <div className="modal-item-info">
                          <span className="modal-item-name">{c.prenom} {c.nom}</span>
                          {c.abonnements?.[0] && (
                            <span className="modal-item-abo">{c.abonnements[0].offre_nom}</span>
                          )}
                        </div>
                        {actionLoading === c.id
                          ? <div className="pres-spinner" />
                          : <Plus size={18} className="modal-plus" />}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}

            {/* ── Onglet : nouveau client ── */}
            {addMode === 'new' && (
              <div className="new-client-form">
                <div className="nc-row">
                  <div className="form-group">
                    <label className="form-label">Prénom *</label>
                    <input
                      className="izi-input"
                      placeholder="Marie"
                      value={newClientForm.prenom}
                      onChange={e => setNewClientForm(p => ({ ...p, prenom: e.target.value }))}
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nom *</label>
                    <input
                      className="izi-input"
                      placeholder="Dupont"
                      value={newClientForm.nom}
                      onChange={e => setNewClientForm(p => ({ ...p, nom: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Téléphone</label>
                  <input
                    className="izi-input"
                    placeholder="06 12 34 56 78"
                    type="tel"
                    value={newClientForm.telephone}
                    onChange={e => setNewClientForm(p => ({ ...p, telephone: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    className="izi-input"
                    placeholder="marie@example.com"
                    type="email"
                    value={newClientForm.email}
                    onChange={e => setNewClientForm(p => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div className="nc-footer">
                  <button
                    className="izi-btn izi-btn-primary"
                    onClick={creerEtAjouter}
                    disabled={addingNew || !newClientForm.prenom.trim() || !newClientForm.nom.trim()}
                  >
                    {addingNew
                      ? <><div className="pres-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> Création…</>
                      : <><UserPlus size={16} /> Créer et inscrire</>
                    }
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ─── Modal : paiement rapide ─── */}
      {paymentTarget && (() => {
        // Évaluer les règles actives pour ce client
        const clientAbo = paymentTarget.abonnements ? [paymentTarget.abonnements] : [];
        const actionsRegles = evaluerRegles(paymentTarget.clients || {}, clientAbo, regles);
        return (
          <PaymentModal
            presence={paymentTarget}
            coursNom={cours.nom}
            coursDate={dateLisible}
            onClose={() => setPaymentTarget(null)}
            onSaved={id => setPaidIds(prev => new Set([...prev, id]))}
            onPayerPlusTard={handlePayerPlusTard}
            ptardAuto={!!actionsRegles.payer_plus_tard_auto}
            ptardAutoNom={actionsRegles.payer_plus_tard_auto?.regle_nom}
          />
        );
      })()}


      {/* ══════════════════════════════════ STYLES ══ */}
      <style jsx global>{`

        .pointage-page {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding-bottom: 56px;
        }

        /* ── Header ── */
        .pt-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .back-btn {
          width: 40px; height: 40px; flex-shrink: 0;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          background: var(--bg-card);
          display: flex; align-items: center; justify-content: center;
          color: var(--text-secondary);
          text-decoration: none;
        }
        .pt-header-info { flex: 1; }
        .pt-header-info h1 { font-size: 1.125rem; font-weight: 700; margin-bottom: 4px; }
        .pt-meta {
          display: flex; flex-wrap: wrap; align-items: center;
          gap: 4px 10px; font-size: 0.8rem; color: var(--text-muted);
        }
        .pt-meta svg { opacity: 0.7; }
        .live-badge {
          flex-shrink: 0;
          padding: 3px 9px;
          border-radius: var(--radius-full);
          background: #ef4444;
          color: white;
          font-size: 0.6rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          animation: livePulse 2s ease infinite;
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }

        /* ── Verrou ── */
        .lock-banner {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 14px 16px;
          background: #f8fafc;
          border: 1.5px solid var(--border);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
        }
        .lock-banner svg { flex-shrink: 0; margin-top: 1px; color: var(--text-muted); }
        .lock-banner strong { display: block; font-size: 0.9rem; font-weight: 700; }
        .lock-banner span   { font-size: 0.8125rem; opacity: 0.8; }

        /* ── Stats 4 colonnes ── */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        .sc {
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          padding: 12px 4px;
          border-radius: var(--radius-md);
          border: 1.5px solid;
        }
        .sc-n { font-size: 1.75rem; font-weight: 800; line-height: 1; }
        .sc-l { font-size: 0.575rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
        .sc-attente { background: var(--cream-dark); border-color: var(--border); color: var(--text-muted); }
        .sc-present { background: #f0fdf4; border-color: #86efac; color: #15803d; }
        .sc-absent  { background: #fff1f2; border-color: #fca5a5; color: #dc2626; }
        .sc-excuse  { background: #fffbeb; border-color: #fde68a; color: #92400e; }

        /* ── Progression ── */
        .prog-wrap { display: flex; align-items: center; gap: 10px; }
        .prog-bar {
          flex: 1; height: 7px; border-radius: 99px;
          background: var(--border); display: flex; overflow: hidden;
        }
        .prog-fill { height: 100%; transition: width 0.5s cubic-bezier(0.4,0,0.2,1); }
        .fill-present { background: #16a34a; }
        .fill-excuse  { background: #f59e0b; }
        .fill-absent  { background: #ef4444; }
        .prog-label { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); flex-shrink: 0; }

        /* ── Impayes ── */
        .impaye-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px;
          background: #fffbeb;
          border: 1.5px solid #fde68a;
          border-radius: var(--radius-sm);
          font-size: 0.8125rem;
          color: #78350f;
        }
        .impaye-icon {
          width: 26px; height: 26px; border-radius: 50%;
          background: #f59e0b; color: white;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 0.875rem;
          flex-shrink: 0;
        }

        /* ── Règle ── */
        .regles-banner {
          display: flex; align-items: center; gap: 7px;
          padding: 8px 12px;
          background: var(--brand-light, #f0f7ff);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          color: var(--brand-700, #4338ca);
        }

        /* ── Actions ── */
        .quick-actions { display: flex; gap: 8px; }
        .qa-btn { flex: 1; }
        .qa-live {
          border-color: var(--brand) !important;
          color: var(--brand) !important;
          animation: liveBorderPulse 2.5s ease infinite;
        }
        @keyframes liveBorderPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
          50%       { box-shadow: 0 0 0 4px rgba(99,102,241,0.15); }
        }

        /* ── Done banner ── */
        .done-banner {
          display: flex; align-items: center; gap: 14px;
          padding: 16px 18px;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border: 2px solid #86efac;
          border-radius: var(--radius-lg);
        }
        @keyframes popIn {
          0%   { transform: scale(0.82) translateY(8px); opacity: 0; }
          70%  { transform: scale(1.04); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-pop { animation: popIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        .done-left { flex-shrink: 0; }
        .done-sparkle { color: #16a34a; }
        .done-body { flex: 1; }
        .done-title { font-weight: 700; font-size: 1rem; color: #15803d; }
        .done-sub   { font-size: 0.8125rem; color: #166534; margin-top: 2px; }
        .done-pct   { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
        .done-pct-n { font-size: 1.5rem; font-weight: 800; color: #15803d; line-height: 1; }
        .done-pct-l { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; color: #15803d; opacity: 0.75; letter-spacing: 0.05em; }

        /* ══════════════════════════════════════
           SPLIT CELLS
           ══════════════════════════════════════ */
        .presences-list { display: flex; flex-direction: column; gap: 6px; }

        .pres-row {
          display: flex; align-items: stretch;
          border: 1.5px solid var(--border);
          border-radius: var(--radius-md);
          /* PAS de overflow:hidden → laisse le menu ··· déborder */
          background: rgba(255,255,255,0.72);
          min-height: 76px;
          transition: border-color 0.2s ease, background 0.2s ease;
          position: relative; /* contexte de stacking pour le menu */
        }
        .pres-row.state-present { background: rgba(240,253,244,0.82); border-color: #86efac; }
        .pres-row.state-absent  { background: rgba(255,241,242,0.82); border-color: #fca5a5; }
        .pres-row.state-excuse  { background: rgba(255,251,235,0.82); border-color: #fde68a; }
        .pres-row.pres-impaye   { border-left: 4px solid #f59e0b; }
        .pres-row.pres-ptard    { border-left: 4px solid #fb923c; }
        .pres-row.pres-loading  { opacity: 0.55; }

        /* ── Boutons de zone ── */
        .pres-zone {
          flex-shrink: 0;
          width: 88px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: none;
          cursor: pointer;
          padding: 8px 4px;
          transition: background 0.15s;
        }
        .pres-zone:disabled { cursor: default; }

        /* Cercle icône */
        .zone-circle {
          width: 46px; height: 46px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.18s, transform 0.12s, box-shadow 0.18s;
        }
        .pres-zone:active .zone-circle {
          transform: scale(0.86);
        }

        .zone-txt {
          font-size: 0.575rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        /* Zone PRÉSENT */
        .zone-ok {
          background: rgba(22, 163, 74, 0.06);
          color: #15803d;
          border-right: 1.5px solid rgba(22, 163, 74, 0.12);
          /* arrondi côté gauche (compense l'absence d'overflow:hidden) */
          border-radius: calc(var(--radius-md) - 1.5px) 0 0 calc(var(--radius-md) - 1.5px);
        }
        .zone-ok .zone-circle {
          background: rgba(22, 163, 74, 0.1);
          color: #15803d;
        }
        .zone-ok:hover .zone-circle   { background: rgba(22, 163, 74, 0.2); }
        .state-present .zone-ok {
          background: rgba(22, 163, 74, 0.12);
          border-right-color: rgba(22, 163, 74, 0.2);
        }
        .state-present .zone-ok .zone-circle {
          background: #16a34a;
          color: white;
          box-shadow: 0 3px 12px rgba(22, 163, 74, 0.45);
        }

        /* Zone ABSENT */
        .zone-ko {
          background: rgba(239, 68, 68, 0.06);
          color: #dc2626;
          border-left: 1.5px solid rgba(239, 68, 68, 0.12);
          /* arrondi côté droit */
          border-radius: 0 calc(var(--radius-md) - 1.5px) calc(var(--radius-md) - 1.5px) 0;
        }
        .zone-ko .zone-circle {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
        }
        .zone-ko:hover .zone-circle   { background: rgba(239, 68, 68, 0.2); }
        .state-absent .zone-ko {
          background: rgba(239, 68, 68, 0.1);
          border-left-color: rgba(239, 68, 68, 0.2);
        }
        .state-absent .zone-ko .zone-circle {
          background: #ef4444;
          color: white;
          box-shadow: 0 3px 12px rgba(239, 68, 68, 0.45);
        }
        .state-excuse .zone-ko .zone-circle {
          background: #f59e0b;
          color: white;
          box-shadow: 0 3px 12px rgba(245, 158, 11, 0.45);
        }

        /* ── Centre élève ── */
        .pres-center {
          flex: 1;
          display: flex; align-items: center; gap: 9px;
          padding: 10px 10px;
          min-width: 0;
        }
        .pres-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.75rem; font-weight: 700; flex-shrink: 0;
        }
        .av-fidele   { background: var(--brand-light, #ede9fe); color: var(--brand-700, #6d28d9); }
        .av-actif    { background: #f0fdf4; color: #15803d; }
        .av-prospect { background: #f0f9ff; color: #0369a1; }
        .av-inactif  { background: var(--cream-dark); color: var(--text-muted); }

        .pres-body { flex: 1; min-width: 0; }
        .pres-name-row { display: flex; align-items: center; gap: 6px; }
        .pres-name {
          font-weight: 600; font-size: 0.875rem;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          flex: 1;
        }

        /* Badge impayé */
        .impaye-btn {
          flex-shrink: 0;
          width: 22px; height: 22px;
          border-radius: 50%;
          background: #f59e0b;
          color: white;
          font-size: 0.7rem; font-weight: 800;
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.12s, transform 0.1s;
          line-height: 1;
        }
        .impaye-btn:hover  { background: #d97706; }
        .impaye-btn:active { transform: scale(0.88); }

        .pres-meta { display: flex; flex-wrap: wrap; gap: 3px 8px; margin-top: 2px; }
        .pres-abo  { font-size: 0.7rem; color: var(--text-muted); }
        .pres-abo-warn { color: #ef4444; font-weight: 600; }
        .pres-heure    { font-size: 0.7rem; color: #15803d; font-weight: 600; }

        /* Chips excuse */
        .excuse-chip {
          flex-shrink: 0;
          display: flex; align-items: center; gap: 3px;
          padding: 3px 8px; border-radius: var(--radius-full);
          background: #fffbeb; border: 1.5px solid #fde68a;
          color: #92400e; font-size: 0.65rem; font-weight: 700;
          cursor: pointer; white-space: nowrap;
          transition: background 0.12s;
        }
        .excuse-chip:hover { background: #fef3c7; }
        .excuse-tag {
          flex-shrink: 0;
          display: flex; align-items: center; gap: 3px;
          padding: 2px 8px; border-radius: var(--radius-full);
          background: #fef3c7; border: 1px solid #fde68a;
          color: #92400e; font-size: 0.65rem; font-weight: 700; white-space: nowrap;
        }

        /* Spinner */
        .pres-spinner {
          width: 18px; height: 18px; flex-shrink: 0;
          border: 2px solid var(--border);
          border-top-color: var(--brand);
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Empty ── */
        .empty-state {
          display: flex; flex-direction: column; align-items: center; gap: 10px;
          padding: 40px 20px; text-align: center;
        }
        .empty-emoji { font-size: 2.5rem; }
        .empty-title { font-weight: 600; }
        .empty-desc  { font-size: 0.875rem; color: var(--text-muted); }

        /* ══════════════════════════════════════
           MODAL AJOUT (bottom sheet)
           ══════════════════════════════════════ */
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.45);
          z-index: 100;
          display: flex; align-items: flex-end; justify-content: center;
        }
        .add-modal {
          background: var(--bg-card);
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          width: 100%; max-width: 520px; max-height: 80vh;
          display: flex; flex-direction: column;
          animation: slideUp 0.25s ease;
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .modal-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 16px 20px; border-bottom: 1px solid var(--border);
        }
        .modal-header h3 {
          display: flex; align-items: center; gap: 8px;
          font-size: 1rem; font-weight: 700;
        }
        .modal-close-x {
          width: 30px; height: 30px; border: none;
          background: var(--cream-dark); border-radius: 50%;
          cursor: pointer; font-size: 0.9rem; color: var(--text-secondary);
          display: flex; align-items: center; justify-content: center;
        }
        .modal-search { margin: 12px 16px 4px; }
        .modal-list   { overflow-y: auto; padding: 0 16px 24px; flex: 1; }
        .modal-empty  { text-align: center; color: var(--text-muted); padding: 24px; font-size: 0.875rem; }
        .modal-item {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 0; border-bottom: 1px solid var(--border);
          width: 100%; background: none;
          border-left: none; border-right: none; border-top: none;
          cursor: pointer; color: var(--text-primary);
        }
        .modal-item:active { opacity: 0.65; }
        .modal-item:disabled { opacity: 0.4; }
        .modal-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: var(--brand-light); color: var(--brand-700);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.8125rem; font-weight: 700; flex-shrink: 0;
        }
        .modal-item-info { flex: 1; text-align: left; }
        .modal-item-name { font-weight: 600; font-size: 0.875rem; display: block; }
        .modal-item-abo  { font-size: 0.75rem; color: var(--text-muted); }
        .modal-plus      { color: var(--text-muted); }

        /* ══════════════════════════════════════
           MODAL PAIEMENT (centré)
           ══════════════════════════════════════ */
        .pm-modal {
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          width: calc(100% - 32px); max-width: 400px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          animation: pmIn 0.25s ease;
          overflow: hidden;
          /* centré dans l'overlay */
          margin: auto;
          align-self: center;
        }
        /* override modal-overlay alignment pour le paiement */
        .modal-overlay:has(.pm-modal) { align-items: center; }
        @keyframes pmIn {
          from { transform: scale(0.9) translateY(10px); opacity: 0; }
          to   { transform: scale(1)   translateY(0);    opacity: 1; }
        }
        .pm-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 16px 20px; border-bottom: 1px solid var(--border);
        }
        .pm-header h3 {
          display: flex; align-items: center; gap: 8px;
          font-size: 1rem; font-weight: 700;
        }
        .pm-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; }
        .pm-client-name { font-size: 1.0625rem; font-weight: 700; }
        .pm-abo-warning {
          font-size: 0.8125rem;
          padding: 7px 12px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: var(--radius-sm);
          color: #92400e;
        }
        .pm-amount-input {
          font-size: 1.25rem !important;
          font-weight: 700 !important;
          text-align: center;
        }
        .pm-modes { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
        .pm-mode-btn {
          flex: 1;
          display: flex; align-items: center; justify-content: center; gap: 5px;
          padding: 9px 8px;
          border-radius: var(--radius-sm);
          border: 1.5px solid var(--border);
          background: var(--bg-card);
          color: var(--text-secondary);
          font-size: 0.8125rem; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
          white-space: nowrap;
        }
        .pm-mode-btn.selected {
          border-color: var(--brand);
          background: var(--brand-light);
          color: var(--brand-700);
        }
        .pm-footer {
          display: flex; justify-content: flex-end; gap: 8px;
          padding: 12px 20px 18px;
          border-top: 1px solid var(--border);
        }
        .pm-save-btn {
          background: #16a34a !important;
          color: white !important;
          border: none !important;
          display: flex; align-items: center; gap: 6px;
          padding: 9px 18px;
          border-radius: var(--radius-sm);
          font-weight: 700; font-size: 0.875rem;
          cursor: pointer; transition: background 0.15s;
        }
        .pm-save-btn:hover:not(:disabled)  { background: #15803d !important; }
        .pm-save-btn:disabled              { background: var(--border) !important; color: var(--text-muted) !important; cursor: not-allowed !important; }
        .pm-ptard-btn {
          font-size: 0.8rem !important;
          color: #92400e !important;
        }
        /* Bouton "payer plus tard" accordé automatiquement par une règle */
        .pm-ptard-auto {
          background: #fff7ed !important;
          border: 1.5px solid #fb923c !important;
          color: #92400e !important;
          font-weight: 700 !important;
          display: flex; align-items: center; gap: 6px;
        }
        .pm-auto-badge {
          background: #fb923c; color: white;
          font-size: 0.6rem; font-weight: 800; letter-spacing: 0.04em;
          padding: 1px 5px; border-radius: var(--radius-full); text-transform: uppercase;
        }

        /* Zone confirmation "payer plus tard" */
        .pm-confirm-zone {
          display: flex; flex-direction: column; align-items: center; gap: 10px;
          padding: 24px 20px 20px; text-align: center;
        }
        .pm-confirm-icon { font-size: 2rem; line-height: 1; }
        .pm-confirm-text { font-size: 0.9375rem; font-weight: 500; margin: 0; }
        .pm-confirm-hint { font-size: 0.8125rem; color: var(--text-muted); margin: 0; }
        .pm-confirm-btns {
          display: flex; gap: 8px; justify-content: center;
          margin-top: 6px; width: 100%;
        }
        .pm-ptard-confirm-btn {
          background: #fb923c; color: white;
          border: none; padding: 9px 18px;
          border-radius: var(--radius-sm);
          font-size: 0.875rem; font-weight: 700;
          cursor: pointer; transition: background 0.15s;
        }
        .pm-ptard-confirm-btn:hover { background: #ea580c; }

        /* Bandeau payer plus tard */
        .ptard-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px;
          background: #fff7ed;
          border: 1.5px solid #fed7aa;
          border-radius: var(--radius-sm);
          font-size: 0.8125rem;
          color: #7c2d12;
        }
        .ptard-icon {
          font-size: 1.1rem; flex-shrink: 0;
        }

        /* ── Type présence badge (sur la carte, quand actif) ── */
        .pres-type-badge {
          font-size: 0.625rem; font-weight: 700;
          padding: 1px 7px; border-radius: var(--radius-full);
          border: 1px solid; white-space: nowrap;
        }
        .pres-type-badge.tp-badge-essai  { background: #fffbeb; border-color: #fde68a; color: #92400e; }
        .pres-type-badge.tp-badge-offert { background: #f5f3ff; border-color: #ddd6fe; color: #5b21b6; }

        /* ── Badge payer plus tard ── */
        .ptard-btn {
          flex-shrink: 0;
          width: 22px; height: 22px; border-radius: 50%;
          background: #fb923c; color: white;
          font-size: 0.75rem; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.12s, transform 0.1s;
        }
        .ptard-btn:hover  { background: #ea580c; }
        .ptard-btn:active { transform: scale(0.88); }
        .pres-row.pres-ptard { border-left: 4px solid #fb923c; }

        /* ── Badge alerte multi-dettes ── */
        .dette-alert {
          font-size: 0.6rem; font-weight: 700;
          padding: 1px 5px; border-radius: var(--radius-full);
          background: #fee2e2; color: #dc2626;
          border: 1px solid #fca5a5; white-space: nowrap;
        }

        /* ── Menu ··· type de séance ── */
        .tp-more-wrap {
          position: relative; flex-shrink: 0;
        }
        .tp-more-btn {
          width: 26px; height: 26px; border-radius: 50%;
          border: 1.5px solid var(--border);
          background: none; color: var(--text-muted);
          font-size: 0.9rem; font-weight: 800; letter-spacing: -1px; line-height: 1;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.12s;
        }
        .tp-more-btn:hover  { background: var(--cream-dark); color: var(--text-primary); }
        .tp-more-btn.tp-more-active {
          border-color: var(--brand); color: var(--brand);
          background: var(--brand-light);
        }
        .tp-menu {
          position: absolute;
          right: 0;
          top: calc(100% + 4px);
          z-index: 50;
          background: var(--bg-card);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-md);
          box-shadow: 0 8px 28px rgba(0,0,0,0.16);
          min-width: 172px; overflow: hidden;
        }
        .tp-menu-item {
          display: flex; align-items: center; gap: 6px;
          width: 100%; padding: 10px 14px;
          background: none; border: none;
          font-size: 0.8125rem; color: var(--text-secondary);
          cursor: pointer; text-align: left;
          transition: background 0.1s;
        }
        .tp-menu-item:hover   { background: var(--cream-dark); }
        .tp-menu-item.selected { color: var(--brand); font-weight: 600; }
        .tpm-label { flex: 1; }
        .tpm-hint  { font-size: 0.7rem; color: var(--text-muted); }
        .tpm-check { color: var(--brand); font-size: 0.75rem; font-weight: 800; }

        /* ── Onglets add modal ── */
        .add-tabs {
          display: flex; gap: 0; border-bottom: 1px solid var(--border);
        }
        .add-tab {
          flex: 1; padding: 10px 12px;
          font-size: 0.8125rem; font-weight: 600;
          background: none; border: none;
          color: var(--text-muted); cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 5px;
          border-bottom: 2px solid transparent;
          transition: color 0.15s, border-color 0.15s;
        }
        .add-tab.active {
          color: var(--brand);
          border-bottom-color: var(--brand);
        }

        /* ── Sélecteur type présence dans add modal ── */
        .add-type-row {
          display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
          padding: 10px 16px 0;
          font-size: 0.8rem;
        }
        .add-type-label {
          font-size: 0.75rem; color: var(--text-muted); font-weight: 600;
          margin-right: 2px;
        }
        .add-type-btn {
          padding: 4px 10px; border-radius: var(--radius-full);
          border: 1.5px solid var(--border);
          background: none; color: var(--text-secondary);
          font-size: 0.75rem; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .add-type-btn.selected.atp-normal { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
        .add-type-btn.selected.atp-essai  { border-color: #fbbf24; background: #fffbeb; color: #92400e; }
        .add-type-btn.selected.atp-offert { border-color: #a78bfa; background: #f5f3ff; color: #5b21b6; }
        .add-type-hint {
          font-size: 0.7rem; color: var(--text-muted);
          margin-left: 2px;
        }

        /* ── Formulaire nouveau client ── */
        .new-client-form {
          padding: 14px 16px 0; display: flex; flex-direction: column; gap: 10px;
        }
        .nc-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .nc-footer {
          padding: 14px 0 20px;
          display: flex; justify-content: flex-end;
        }

        /* Responsive */
        @media (min-width: 640px) {
          .pres-zone { width: 100px; }
          .zone-circle { width: 50px; height: 50px; }
          .pres-name { font-size: 0.9375rem; }
        }
      `}</style>
    </div>
  );
}
