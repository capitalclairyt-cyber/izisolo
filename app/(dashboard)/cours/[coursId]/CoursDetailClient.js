'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Save, Calendar, Clock, MapPin, Users, Repeat,
  Trash2, AlertTriangle, CheckCircle2, Edit3, X, Copy,
  ChevronDown, ChevronUp, Mail, Send, ShieldAlert, Smartphone, CheckCheck, Lock
} from 'lucide-react';
import { formatHeure, getAllTypesFromCategories } from '@/lib/utils';
import { parseDate } from '@/lib/dates';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';

export default function CoursDetailClient({ cours, presences, lieux, profile, nbOccurrences, autoEdit }) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState(autoEdit || false);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal]     = useState(false);
  const [deleteScope, setDeleteScope]             = useState('single');

  // ---- Modification de la récurrence ----
  const [showRecurrenceEdit, setShowRecurrenceEdit] = useState(false);
  const [recurrenceConfirmed, setRecurrenceConfirmed] = useState(false);
  const [savingRecurrence, setSavingRecurrence]     = useState(false);
  const [recurrenceForm, setRecurrenceForm]         = useState({
    heure:         cours.heure?.substring(0, 5) || '',
    duree_minutes: cours.duree_minutes?.toString() || '60',
    lieu_id:       cours.lieu_id || '',
    type_cours:    cours.type_cours || '',
  });

  // ---- Message aux participants ----
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageForm, setMessageForm]           = useState({
    sujet:   `À propos de "${cours.nom}"`,
    message: '',
  });

  // ---- SMS aux participants ----
  const [showSmsModal, setShowSmsModal]   = useState(false);
  const [smsMessage, setSmsMessage]       = useState('');
  const [sendingSms, setSendingSms]       = useState(false);
  const [smsResult, setSmsResult]         = useState(null); // { sent, failed, errors }

  const isRecurrent = !!cours.recurrence_parent_id;
  const nbPointes = presences.filter(p => p.pointee).length;
  const recurrenceSectionRef = useRef(null);

  // Scroll automatique vers le panneau série quand il s'ouvre
  useEffect(() => {
    if (showRecurrenceEdit && recurrenceSectionRef.current) {
      setTimeout(() => {
        recurrenceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }, [showRecurrenceEdit]);

  const typesCours = getAllTypesFromCategories(profile?.types_cours);

  const [form, setForm] = useState({
    nom: cours.nom || '',
    type_cours: cours.type_cours || '',
    date: cours.date || '',
    heure: cours.heure?.substring(0, 5) || '',
    duree_minutes: cours.duree_minutes?.toString() || '60',
    lieu_id: cours.lieu_id || '',
    capacite_max: cours.capacite_max?.toString() || '',
    notes: cours.notes || '',
  });

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  // Sauvegarder les modifications
  const handleSave = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const lieuNom = lieux.find(l => l.id === form.lieu_id)?.nom || null;

      const { error } = await supabase
        .from('cours')
        .update({
          nom: form.nom.trim(),
          type_cours: form.type_cours || null,
          date: form.date,
          heure: form.heure || null,
          duree_minutes: form.duree_minutes ? parseInt(form.duree_minutes) : 60,
          lieu_id: form.lieu_id || null,
          lieu: lieuNom,
          capacite_max: form.capacite_max ? parseInt(form.capacite_max) : null,
          notes: form.notes || null,
        })
        .eq('id', cours.id);

      if (error) throw error;
      setEditing(false);
      router.refresh();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Annuler un cours
  const handleCancel = async () => {
    const supabase = createClient();
    // Passe par l'API pour déclencher les notifications email/SMS aux inscrits
    await fetch(`/api/cours/${cours.id}/annuler`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    router.refresh();
  };

  // Supprimer cours
  const handleDelete = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      if (deleteScope === 'single') {
        await supabase.from('cours').delete().eq('id', cours.id);
      } else if (deleteScope === 'future' && cours.recurrence_parent_id) {
        await supabase
          .from('cours')
          .delete()
          .eq('recurrence_parent_id', cours.recurrence_parent_id)
          .gte('date', cours.date);
      } else if (deleteScope === 'all' && cours.recurrence_parent_id) {
        await supabase
          .from('cours')
          .delete()
          .eq('recurrence_parent_id', cours.recurrence_parent_id);
        await supabase
          .from('recurrences')
          .delete()
          .eq('id', cours.recurrence_parent_id);
      }

      router.push('/agenda');
      router.refresh();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---- Modifier toute la série ----
  const handleSaveRecurrence = async () => {
    if (!recurrenceConfirmed) return;
    setSavingRecurrence(true);
    try {
      const supabase  = createClient();
      const lieuNom   = lieux.find(l => l.id === recurrenceForm.lieu_id)?.nom || null;
      const today     = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })();
      const payload   = {
        heure:         recurrenceForm.heure || null,
        duree_minutes: recurrenceForm.duree_minutes ? parseInt(recurrenceForm.duree_minutes) : 60,
        lieu_id:       recurrenceForm.lieu_id || null,
        lieu:          lieuNom,
        type_cours:    recurrenceForm.type_cours || null,
      };

      // 1. Mettre à jour toutes les occurrences futures
      const { error: e1 } = await supabase
        .from('cours')
        .update(payload)
        .eq('recurrence_parent_id', cours.recurrence_parent_id)
        .gte('date', today);
      if (e1) throw e1;

      // 2. Mettre à jour la récurrence elle-même
      const { error: e2 } = await supabase
        .from('recurrences')
        .update({
          heure:         payload.heure,
          duree_minutes: payload.duree_minutes,
          lieu_id:       payload.lieu_id,
          type_cours:    payload.type_cours,
        })
        .eq('id', cours.recurrence_parent_id);
      if (e2) throw e2;

      setShowRecurrenceEdit(false);
      setRecurrenceConfirmed(false);
      router.refresh();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSavingRecurrence(false);
    }
  };

  // ---- Envoyer un message aux participants ----
  const handleSendMessage = () => {
    const emails = presences
      .map(p => p.clients?.email)
      .filter(Boolean);
    if (emails.length === 0) { toast.warning('Aucun participant avec adresse e-mail'); return; }
    const mailto = `mailto:${emails[0]}?bcc=${emails.slice(1).join(',')}&subject=${encodeURIComponent(messageForm.sujet)}&body=${encodeURIComponent(messageForm.message)}`;
    window.open(mailto, '_blank');
    setShowMessageModal(false);
  };

  // ---- SMS : accès plan + participants joignables ----
  const SMS_PLANS = ['pro', 'studio', 'premium'];
  const canUseSms = SMS_PLANS.includes(profile?.plan);
  const participantsWithPhone = presences.filter(p => p.clients?.telephone);

  const handleSendSms = async () => {
    if (!participantsWithPhone.length || !smsMessage.trim()) return;
    setSendingSms(true);
    setSmsResult(null);
    try {
      const phones = participantsWithPhone.map(p => ({
        telephone: p.clients.telephone,
        nom:       `${p.clients.prenom} ${p.clients.nom}`,
      }));
      const res  = await fetch('/api/sms/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phones, message: smsMessage }),
      });
      const data = await res.json();
      setSmsResult(data);
    } catch (err) {
      setSmsResult({ sent: 0, failed: participantsWithPhone.length, errors: [err.message] });
    } finally {
      setSendingSms(false);
    }
  };

  // ---- Pré-remplissage SMS annulation ----
  const prefillSmsAnnulation = () => {
    setSmsMessage(`Bonjour, votre séance "${cours.nom}" du ${dateLisible} est annulée. Désolé pour la gêne occasionnée.`);
    setShowSmsModal(true);
  };

  // parseDate() évite le bug UTC (new Date('2025-04-07') → minuit UTC → décalage en FR)
  const dateLisible = cours.date
    ? parseDate(cours.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="cours-detail">
      {/* Header */}
      <div className="page-header">
        <Link href="/agenda" className="back-btn"><ArrowLeft size={20} /></Link>
        <div className="page-header-info">
          <h1>{cours.nom}</h1>
          {isRecurrent && (
            <span className="recurrence-tag">
              <Repeat size={14} /> Récurrent · {nbOccurrences} séance{nbOccurrences > 1 ? 's' : ''} à venir
            </span>
          )}
        </div>
        {!editing && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="edit-btn"
              onClick={() => router.push(`/cours/nouveau?from=${cours.id}`)}
              title="Dupliquer ce cours"
            >
              <Copy size={18} />
            </button>
            <button className="edit-btn" onClick={() => setEditing(true)} title="Modifier">
              <Edit3 size={18} />
            </button>
          </div>
        )}
      </div>

      {/* ── Layout 2 colonnes sur desktop ── */}
      <div className="cours-layout">
      <div className="cours-left">

      {/* Avertissement récurrence */}
      {isRecurrent && editing && (
        <div className="warning-banner warning-banner-recurrent">
          <AlertTriangle size={18} className="warning-banner-icon" />
          <div className="warning-banner-body">
            <strong>Cours récurrent</strong>
            <p>Les modifications s'appliqueront uniquement à cette séance du {dateLisible}.</p>
          </div>
          <button
            className="warning-banner-serie-btn"
            onClick={() => {
              setEditing(false);
              setShowRecurrenceEdit(true);
              setRecurrenceConfirmed(false);
            }}
          >
            <Repeat size={14} />
            Modifier toute la série
          </button>
        </div>
      )}

      {/* Annulé */}
      {cours.est_annule && (
        <div className="annule-banner">
          <X size={18} />
          <span>Ce cours a été annulé</span>
        </div>
      )}

      {/* Détail ou formulaire de modification */}
      <div className="cours-content izi-card">
        {!editing ? (
          /* === MODE LECTURE === */
          <div className="detail-grid">
            <div className="detail-row">
              <Calendar size={16} />
              <div>
                <div className="detail-label">Date</div>
                <div className="detail-value">{dateLisible}</div>
              </div>
            </div>

            {cours.heure && (
              <div className="detail-row">
                <Clock size={16} />
                <div>
                  <div className="detail-label">Horaire</div>
                  <div className="detail-value">{formatHeure(cours.heure)} · {cours.duree_minutes || 60} min</div>
                </div>
              </div>
            )}

            {cours.lieu && (
              <div className="detail-row">
                <MapPin size={16} />
                <div>
                  <div className="detail-label">Lieu</div>
                  <div className="detail-value">{cours.lieu}</div>
                </div>
              </div>
            )}

            {cours.type_cours && (
              <div className="detail-row">
                <span className="izi-badge izi-badge-brand">{cours.type_cours}</span>
              </div>
            )}

            {cours.capacite_max && (
              <div className="detail-row">
                <Users size={16} />
                <div>
                  <div className="detail-label">Capacité</div>
                  <div className="detail-value">{presences.length} / {cours.capacite_max} places</div>
                </div>
              </div>
            )}

            {cours.notes && (
              <div className="detail-row notes-row">
                <div className="detail-label">Notes</div>
                <div className="detail-value">{cours.notes}</div>
              </div>
            )}
          </div>
        ) : (
          /* === MODE ÉDITION === */
          <div className="edit-form">
            <div className="form-group">
              <label className="form-label">Nom du cours</label>
              <input className="izi-input" value={form.nom} onChange={handleChange('nom')} />
            </div>

            {typesCours.length > 0 && (
              <div className="form-group">
                <label className="form-label">Type</label>
                <div className="type-chips">
                  {typesCours.map(type => (
                    <button
                      key={type}
                      type="button"
                      className={`chip ${form.type_cours === type ? 'selected' : ''}`}
                      onClick={() => setForm(prev => ({ ...prev, type_cours: prev.type_cours === type ? '' : type }))}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label"><Calendar size={14} /> Date</label>
                <input className="izi-input" type="date" value={form.date} onChange={handleChange('date')} />
              </div>
              <div className="form-group">
                <label className="form-label"><Clock size={14} /> Heure</label>
                <input className="izi-input" type="time" value={form.heure} onChange={handleChange('heure')} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Durée (min)</label>
                <input className="izi-input" type="number" value={form.duree_minutes} onChange={handleChange('duree_minutes')} />
              </div>
              <div className="form-group">
                <label className="form-label"><Users size={14} /> Capacité</label>
                <input className="izi-input" type="number" value={form.capacite_max} onChange={handleChange('capacite_max')} placeholder="Illimité" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label"><MapPin size={14} /> Lieu</label>
              <select className="izi-input" value={form.lieu_id} onChange={handleChange('lieu_id')}>
                <option value="">-- Aucun --</option>
                {lieux.map(l => (
                  <option key={l.id} value={l.id}>{l.nom}{l.adresse ? ` — ${l.adresse}` : ''}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="izi-input" value={form.notes} onChange={handleChange('notes')} rows={2} style={{ resize: 'vertical' }} />
            </div>

            <div className="edit-actions">
              <button className="izi-btn izi-btn-primary" onClick={handleSave} disabled={loading || !form.nom.trim()}>
                <Save size={16} /> {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button className="izi-btn izi-btn-ghost" onClick={() => setEditing(false)}>
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      </div>{/* /cours-left */}
      <div className="cours-right">

      {/* Inscrits */}
      <div className="section">
        <div className="section-header">
          <h2><Users size={18} /> Inscrits ({presences.length})</h2>
          <Link
            href={`/pointage/${cours.id}`}
            className={`izi-btn btn-sm ${nbPointes > 0 ? 'izi-btn-ghost btn-modifier-pointage' : 'izi-btn-secondary'}`}
          >
            <CheckCircle2 size={16} />
            {nbPointes > 0 ? 'Modifier le pointage' : 'Pointer'}
          </Link>
        </div>

        {/* Bannière pointage effectué */}
        {nbPointes > 0 && (
          <div className="pointage-banner">
            <CheckCheck size={18} />
            <span>
              Pointage effectué — <strong>{nbPointes}/{presences.length}</strong> présent{nbPointes > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {presences.length === 0 ? (
          <p className="empty-text">Aucun inscrit pour le moment</p>
        ) : (
          <div className="inscrits-list">
            {presences.map(p => (
              <div key={p.id} className={`inscrit-row ${p.pointee ? 'pointe' : ''}`}>
                <div className="inscrit-info">
                  <span className="inscrit-nom">{p.clients?.prenom} {p.clients?.nom}</span>
                  <span className="inscrit-statut">{p.clients?.statut}</span>
                </div>
                {p.pointee && (
                  <span className="pointe-badge"><CheckCircle2 size={14} /> Pointé</span>
                )}
              </div>
            ))}
          </div>
        )}

        {nbPointes > 0 && (
          <div className="stats-bar">
            {nbPointes}/{presences.length} pointé{nbPointes > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* ================================================
          MODIFIER LA SÉRIE (récurrence uniquement)
          ================================================ */}
      {isRecurrent && !editing && (
        <div className="recurrence-section" ref={recurrenceSectionRef}>
          <button
            className={`recurrence-toggle ${showRecurrenceEdit ? 'open' : ''}`}
            onClick={() => { setShowRecurrenceEdit(s => !s); setRecurrenceConfirmed(false); }}
          >
            <span className="recurrence-toggle-label">
              <Repeat size={16} />
              Modifier la série récurrente
            </span>
            {showRecurrenceEdit ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showRecurrenceEdit && (
            <div className="recurrence-edit-panel">
              {/* Avertissement fort */}
              <div className="recurrence-warning">
                <ShieldAlert size={28} className="recurrence-warning-icon" />
                <div>
                  <div className="recurrence-warning-title">
                    ⚠️ Modification de toute la série
                  </div>
                  <div className="recurrence-warning-body">
                    Cette action modifiera les <strong>{nbOccurrences} prochaine{nbOccurrences > 1 ? 's' : ''} séance{nbOccurrences > 1 ? 's' : ''}</strong> de cette série.
                    Les séances passées ne seront pas affectées.
                    Cette action ne peut pas être annulée facilement.
                  </div>
                </div>
              </div>

              {/* Formulaire série */}
              <div className="recurrence-form">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label"><Clock size={14} /> Heure</label>
                    <input className="izi-input" type="time"
                      value={recurrenceForm.heure}
                      onChange={e => setRecurrenceForm(p => ({ ...p, heure: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Durée (min)</label>
                    <input className="izi-input" type="number"
                      value={recurrenceForm.duree_minutes}
                      onChange={e => setRecurrenceForm(p => ({ ...p, duree_minutes: e.target.value }))} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label"><MapPin size={14} /> Lieu</label>
                  <select className="izi-input"
                    value={recurrenceForm.lieu_id}
                    onChange={e => setRecurrenceForm(p => ({ ...p, lieu_id: e.target.value }))}>
                    <option value="">-- Aucun --</option>
                    {lieux.map(l => (
                      <option key={l.id} value={l.id}>{l.nom}{l.adresse ? ` — ${l.adresse}` : ''}</option>
                    ))}
                  </select>
                </div>

                {typesCours.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <div className="type-chips">
                      {typesCours.map(type => (
                        <button key={type} type="button"
                          className={`chip ${recurrenceForm.type_cours === type ? 'selected' : ''}`}
                          onClick={() => setRecurrenceForm(p => ({ ...p, type_cours: p.type_cours === type ? '' : type }))}>
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmation obligatoire */}
              <label className="recurrence-confirm-label">
                <input type="checkbox"
                  checked={recurrenceConfirmed}
                  onChange={e => setRecurrenceConfirmed(e.target.checked)} />
                <span>Je confirme vouloir modifier les <strong>{nbOccurrences} prochaines séances</strong> de cette série</span>
              </label>

              <div className="recurrence-actions">
                <button className="izi-btn izi-btn-ghost"
                  onClick={() => { setShowRecurrenceEdit(false); setRecurrenceConfirmed(false); }}>
                  Annuler
                </button>
                <button
                  className={`izi-btn recurrence-save-btn ${recurrenceConfirmed ? '' : 'disabled-btn'}`}
                  onClick={handleSaveRecurrence}
                  disabled={!recurrenceConfirmed || savingRecurrence}>
                  <Repeat size={16} />
                  {savingRecurrence ? 'Modification…' : `Modifier les ${nbOccurrences} séances`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================
          MESSAGE AUX PARTICIPANTS
          ================================================ */}
      {presences.length > 0 && !editing && (
        <button className="msg-trigger-btn" onClick={() => setShowMessageModal(true)}>
          <Mail size={16} />
          Envoyer un message aux {presences.length} participant{presences.length > 1 ? 's' : ''}
        </button>
      )}

      {showMessageModal && (
        <div className="modal-overlay" onClick={() => setShowMessageModal(false)}>
          <div className="modal msg-modal" onClick={e => e.stopPropagation()}>
            <div className="msg-modal-header">
              <h3><Mail size={18} /> Message aux participants</h3>
              <button className="modal-close-btn" onClick={() => setShowMessageModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="msg-to">
              <span className="msg-to-label">À</span>
              <div className="msg-to-list">
                {presences.map(p => (
                  <span key={p.id} className={`msg-to-chip ${p.clients?.email ? '' : 'no-email'}`}>
                    {p.clients?.prenom} {p.clients?.nom}
                    {!p.clients?.email && <span className="no-email-hint"> (pas d'email)</span>}
                  </span>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ padding: '0 20px' }}>
              <label className="form-label">Objet</label>
              <input className="izi-input"
                value={messageForm.sujet}
                onChange={e => setMessageForm(p => ({ ...p, sujet: e.target.value }))} />
            </div>

            <div className="form-group" style={{ padding: '0 20px' }}>
              <label className="form-label">Message</label>
              <textarea className="izi-input" rows={5} style={{ resize: 'vertical' }}
                value={messageForm.message}
                placeholder={`Bonjour,\n\nJ'ai une information concernant notre séance du ${dateLisible}.\n\n...`}
                onChange={e => setMessageForm(p => ({ ...p, message: e.target.value }))} />
            </div>

            <div className="modal-actions" style={{ padding: '0 20px 20px' }}>
              <button className="izi-btn izi-btn-ghost" onClick={() => setShowMessageModal(false)}>
                Annuler
              </button>
              <button className="izi-btn izi-btn-primary"
                onClick={handleSendMessage}
                disabled={!messageForm.sujet.trim() || !messageForm.message.trim()}>
                <Send size={16} />
                Ouvrir dans mon client e-mail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================
          SMS AUX PARTICIPANTS
          ================================================ */}
      {!editing && presences.length > 0 && (
        <div className="sms-trigger-zone">
          {canUseSms ? (
            <button className="sms-trigger-btn" onClick={() => { setSmsResult(null); setShowSmsModal(true); }}>
              <Smartphone size={16} />
              SMS aux {participantsWithPhone.length > 0
                ? `${participantsWithPhone.length} participant${participantsWithPhone.length > 1 ? 's' : ''} joignable${participantsWithPhone.length > 1 ? 's' : ''}`
                : `${presences.length} inscrits`}
              {participantsWithPhone.length === 0 && (
                <span className="sms-no-phone-hint">· aucun numéro enregistré</span>
              )}
            </button>
          ) : (
            <div className="sms-upsell">
              <Lock size={14} />
              <span>L'envoi SMS est disponible à partir du plan <strong>Pro</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Modal SMS */}
      {showSmsModal && (
        <div className="modal-overlay" onClick={() => setShowSmsModal(false)}>
          <div className="modal sms-modal" onClick={e => e.stopPropagation()}>
            <div className="sms-modal-header">
              <h3><Smartphone size={18} /> SMS aux participants</h3>
              <button className="modal-close-btn" onClick={() => setShowSmsModal(false)}><X size={18} /></button>
            </div>

            {/* Bouton annulation rapide */}
            {!cours.est_annule && (
              <div className="sms-quick-actions">
                <button className="sms-quick-btn" onClick={prefillSmsAnnulation}>
                  ⚡ Pré-remplir : annulation de cours
                </button>
              </div>
            )}

            {/* Destinataires */}
            <div className="sms-to">
              <span className="sms-to-label">À</span>
              <div className="sms-to-list">
                {presences.map(p => (
                  <span key={p.id} className={`sms-to-chip ${p.clients?.telephone ? 'has-phone' : 'no-phone'}`}>
                    {p.clients?.prenom} {p.clients?.nom}
                    {p.clients?.telephone
                      ? <span className="phone-num">{p.clients.telephone}</span>
                      : <span className="no-phone-hint"> (pas de n°)</span>}
                  </span>
                ))}
              </div>
            </div>

            {/* Éditeur message */}
            <div className="sms-compose">
              <div className="sms-compose-header">
                <label className="form-label">Message</label>
                <span className={`sms-char-count ${smsMessage.length > 160 ? 'over' : ''}`}>
                  {smsMessage.length} car. · {Math.ceil(smsMessage.length / 160) || 1} SMS
                </span>
              </div>
              <textarea
                className="izi-input sms-textarea"
                rows={4}
                placeholder={`Bonjour, votre séance "${cours.nom}" du ${dateLisible}…`}
                value={smsMessage}
                onChange={e => { setSmsMessage(e.target.value); setSmsResult(null); }}
              />
            </div>

            {/* Résultat envoi */}
            {smsResult && (
              <div className={`sms-result ${smsResult.failed === 0 ? 'success' : 'partial'}`}>
                <CheckCheck size={16} />
                <div>
                  <strong>
                    {smsResult.sent} envoyé{smsResult.sent > 1 ? 's' : ''}
                    {smsResult.failed > 0 ? ` · ${smsResult.failed} échec${smsResult.failed > 1 ? 's' : ''}` : ''}
                  </strong>
                  {smsResult.errors?.length > 0 && (
                    <div className="sms-errors">{smsResult.errors.join(' · ')}</div>
                  )}
                </div>
              </div>
            )}

            <div className="modal-actions" style={{ padding: '0 20px 20px' }}>
              <button className="izi-btn izi-btn-ghost" onClick={() => setShowSmsModal(false)}>
                Fermer
              </button>
              <button
                className="izi-btn sms-send-btn"
                onClick={handleSendSms}
                disabled={sendingSms || !smsMessage.trim() || participantsWithPhone.length === 0 || !!smsResult?.sent}>
                <Smartphone size={16} />
                {sendingSms
                  ? 'Envoi en cours…'
                  : smsResult?.sent
                    ? 'Envoyé ✓'
                    : `Envoyer à ${participantsWithPhone.length} destinataire${participantsWithPhone.length > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions dangereuses */}
      {!editing && (
        <div className="danger-zone">
          {!cours.est_annule && (
            <button className="izi-btn izi-btn-ghost danger-btn" onClick={handleCancel}>
              <X size={16} /> Annuler ce cours
            </button>
          )}
          <button className="izi-btn izi-btn-ghost danger-btn" onClick={() => setShowDeleteModal(true)}>
            <Trash2 size={16} /> Supprimer
          </button>
        </div>
      )}

      </div>{/* /cours-right */}
      </div>{/* /cours-layout */}

      {/* Modal de suppression */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3><AlertTriangle size={20} /> Supprimer ce cours</h3>

            {isRecurrent ? (
              <div className="delete-options">
                <p>Ce cours fait partie d'une série récurrente. Que souhaitez-vous supprimer ?</p>

                <label className="delete-option">
                  <input type="radio" name="scope" value="single" checked={deleteScope === 'single'} onChange={() => setDeleteScope('single')} />
                  <div>
                    <strong>Uniquement cette séance</strong>
                    <span>Le {dateLisible}</span>
                  </div>
                </label>

                <label className="delete-option">
                  <input type="radio" name="scope" value="future" checked={deleteScope === 'future'} onChange={() => setDeleteScope('future')} />
                  <div>
                    <strong>Cette séance et les suivantes</strong>
                    <span>À partir du {dateLisible}</span>
                  </div>
                </label>

                <label className="delete-option">
                  <input type="radio" name="scope" value="all" checked={deleteScope === 'all'} onChange={() => setDeleteScope('all')} />
                  <div>
                    <strong>Toute la série</strong>
                    <span>Supprime toutes les occurrences et la récurrence</span>
                  </div>
                </label>
              </div>
            ) : (
              <p>Cette action est irréversible. Les présences associées seront également supprimées.</p>
            )}

            <div className="modal-actions">
              <button className="izi-btn izi-btn-ghost" onClick={() => setShowDeleteModal(false)}>Annuler</button>
              <button className="izi-btn danger-confirm" onClick={handleDelete} disabled={loading}>
                <Trash2 size={16} /> {loading ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .cours-detail {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-bottom: 40px;
        }

        /* ── Layout 2 colonnes (desktop) ── */
        .cours-layout {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .cours-left, .cours-right {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        @media (min-width: 768px) {
          .cours-layout {
            flex-direction: row;
            align-items: flex-start;
            gap: 22px;
          }
          .cours-left {
            flex: 1;
            min-width: 0;
          }
          .cours-right {
            width: 340px;
            flex-shrink: 0;
          }
        }

        /* Header */
        .page-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .page-header h1 {
          font-size: 1.25rem;
          font-weight: 700;
        }
        .page-header-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .back-btn {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          background: var(--bg-card);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          text-decoration: none;
          flex-shrink: 0;
        }
        .edit-btn {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          background: var(--bg-card);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          cursor: pointer;
          flex-shrink: 0;
        }
        .edit-btn:hover {
          background: var(--brand-light);
          color: var(--brand-700);
        }
        .recurrence-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        /* Banners */
        .warning-banner {
          display: flex;
          gap: 12px;
          padding: 12px 16px;
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: var(--radius-sm);
          color: #92400e;
          font-size: 0.8125rem;
        }
        .warning-banner strong { display: block; font-weight: 600; }
        .warning-banner p { margin: 2px 0 0; opacity: 0.85; }

        /* Bandeau récurrence avec bouton "Modifier toute la série" */
        .warning-banner-recurrent {
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 10px;
        }
        .warning-banner-icon { flex-shrink: 0; margin-top: 2px; }
        .warning-banner-body { flex: 1; min-width: 0; }
        .warning-banner-serie-btn {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #f59e0b;
          color: #fff;
          border: none;
          border-radius: var(--radius-sm);
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s;
          align-self: center;
        }
        .warning-banner-serie-btn:hover { background: #d97706; }

        .annule-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(196, 80, 80, 0.08);
          border: 1px solid rgba(196, 80, 80, 0.3);
          border-radius: var(--radius-sm);
          color: #c45050;
          font-size: 0.875rem;
          font-weight: 600;
        }

        /* Detail grid */
        .cours-content { padding: 20px; }
        .detail-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .detail-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          color: var(--text-secondary);
        }
        .detail-row svg { margin-top: 2px; flex-shrink: 0; }
        .detail-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 500;
        }
        .detail-value {
          font-size: 0.9375rem;
          color: var(--text-primary);
          font-weight: 500;
        }
        .notes-row {
          flex-direction: column;
          gap: 4px;
        }

        /* Edit form */
        .edit-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-label {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .type-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .chip {
          padding: 6px 12px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border);
          background: var(--bg-card);
          color: var(--text-secondary);
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all 0.15s;
        }
        .chip.selected {
          background: var(--brand);
          color: white;
          border-color: var(--brand);
        }
        .edit-actions {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }

        /* Section inscrits */
        .section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .section-header h2 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1rem;
          font-weight: 700;
        }
        .btn-sm {
          font-size: 0.8125rem;
          padding: 6px 14px;
        }
        .empty-text {
          color: var(--text-muted);
          font-size: 0.875rem;
          padding: 12px 0;
        }
        .inscrits-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .inscrit-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
        }
        .inscrit-row.pointe {
          background: var(--brand-50);
          border-color: var(--brand-200);
        }
        .inscrit-info {
          display: flex;
          flex-direction: column;
        }
        .inscrit-nom {
          font-weight: 600;
          font-size: 0.875rem;
        }
        .inscrit-statut {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: capitalize;
        }
        .pointe-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          color: var(--success);
          font-weight: 600;
        }
        .stats-bar {
          font-size: 0.8125rem;
          color: var(--text-muted);
          text-align: center;
          padding: 8px;
          background: var(--cream-dark);
          border-radius: var(--radius-sm);
        }

        /* Bannière pointage effectué */
        .pointage-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: #dcfce7;
          color: #166534;
          border-radius: var(--radius-sm);
          font-size: 0.875rem;
          margin-bottom: 4px;
        }
        .btn-modifier-pointage {
          border-color: #16a34a !important;
          color: #16a34a !important;
        }
        .btn-modifier-pointage:hover {
          background: #dcfce7 !important;
        }

        /* Danger zone */
        .danger-zone {
          display: flex;
          gap: 8px;
          padding-top: 8px;
          border-top: 1px solid var(--border);
        }
        .danger-btn {
          color: #c45050 !important;
        }
        .danger-btn:hover {
          background: rgba(196, 80, 80, 0.08) !important;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.3);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .modal {
          background: white;
          border-radius: var(--radius-md);
          padding: 24px;
          max-width: 440px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        }
        .modal h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1.0625rem;
          font-weight: 700;
          color: #c45050;
          margin-bottom: 12px;
        }
        .modal p {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        .delete-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .delete-options > p {
          margin-bottom: 4px;
        }
        .delete-option {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: background 0.15s;
        }
        .delete-option:hover {
          background: var(--cream-dark);
        }
        .delete-option input[type="radio"] {
          margin-top: 3px;
          accent-color: #c45050;
        }
        .delete-option strong {
          display: block;
          font-size: 0.875rem;
        }
        .delete-option span {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 16px;
        }
        .danger-confirm {
          background: #c45050 !important;
          color: white !important;
          border: none;
          cursor: pointer;
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          font-weight: 600;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .danger-confirm:hover {
          background: #a43d3d !important;
        }

        /* ================================================
           SECTION RÉCURRENCE
           ================================================ */
        .recurrence-section {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        .recurrence-toggle {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          transition: background 0.15s;
          text-align: left;
        }
        .recurrence-toggle:hover {
          background: var(--cream-dark);
          color: var(--text-primary);
        }
        .recurrence-toggle.open {
          background: var(--brand-light);
          color: var(--brand-700);
          border-bottom: 1px solid var(--border);
        }
        .recurrence-toggle-label {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .recurrence-edit-panel {
          padding: 20px 18px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: var(--cream);
        }

        /* Warning banner — fort, rouge/orange */
        .recurrence-warning {
          display: flex;
          gap: 14px;
          padding: 14px 16px;
          background: #fff1f2;
          border: 1.5px solid #fca5a5;
          border-radius: var(--radius-sm);
          color: #991b1b;
        }
        .recurrence-warning-icon {
          flex-shrink: 0;
          color: #ef4444;
          margin-top: 1px;
        }
        .recurrence-warning-title {
          font-weight: 700;
          font-size: 0.9375rem;
          margin-bottom: 4px;
        }
        .recurrence-warning-body {
          font-size: 0.8125rem;
          line-height: 1.5;
          color: #7f1d1d;
        }
        .recurrence-warning-body strong {
          font-weight: 700;
          color: #991b1b;
        }

        .recurrence-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* Checkbox de confirmation obligatoire */
        .recurrence-confirm-label {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          background: #fffbeb;
          border: 1px solid #fbbf24;
          border-radius: var(--radius-sm);
          font-size: 0.8125rem;
          color: #78350f;
          cursor: pointer;
          line-height: 1.5;
        }
        .recurrence-confirm-label input[type="checkbox"] {
          margin-top: 2px;
          width: 16px;
          height: 16px;
          accent-color: #ef4444;
          flex-shrink: 0;
          cursor: pointer;
        }
        .recurrence-confirm-label strong {
          font-weight: 700;
          color: #92400e;
        }

        .recurrence-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }
        .recurrence-save-btn {
          background: #ef4444 !important;
          color: white !important;
          border: none !important;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.15s;
        }
        .recurrence-save-btn:hover:not(:disabled) {
          background: #dc2626 !important;
        }
        .recurrence-save-btn.disabled-btn,
        .recurrence-save-btn:disabled {
          background: var(--border) !important;
          color: var(--text-muted) !important;
          cursor: not-allowed !important;
          opacity: 0.6;
        }

        /* ================================================
           BOUTON MESSAGE AUX PARTICIPANTS
           ================================================ */
        .msg-trigger-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 18px;
          background: var(--bg-card);
          border: 1.5px dashed var(--brand);
          border-radius: var(--radius-md);
          color: var(--brand-700);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .msg-trigger-btn:hover {
          background: var(--brand-light);
          border-style: solid;
        }

        /* ================================================
           MODAL MESSAGE
           ================================================ */
        .msg-modal {
          max-width: 520px !important;
          padding: 0 !important;
          display: flex;
          flex-direction: column;
          gap: 0;
          overflow: hidden;
        }
        .msg-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
        }
        .msg-modal-header h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }
        .modal-close-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          background: none;
          cursor: pointer;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.15s;
        }
        .modal-close-btn:hover {
          background: var(--cream-dark);
          color: var(--text-primary);
        }

        /* Section "À" dans le modal */
        .msg-to {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 20px;
          border-bottom: 1px solid var(--border);
          background: var(--cream);
        }
        .msg-to-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding-top: 3px;
          flex-shrink: 0;
        }
        .msg-to-list {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }
        .msg-to-chip {
          padding: 3px 10px;
          border-radius: var(--radius-full);
          background: var(--brand-light);
          border: 1px solid var(--brand-200, var(--border));
          color: var(--brand-700);
          font-size: 0.75rem;
          font-weight: 500;
        }
        .msg-to-chip.no-email {
          background: var(--cream-dark);
          border-color: var(--border);
          color: var(--text-muted);
          opacity: 0.7;
        }
        .no-email-hint {
          font-style: italic;
          font-size: 0.6875rem;
        }

        /* Form fields inside msg-modal need vertical padding */
        .msg-modal .form-group {
          padding: 12px 20px 0;
        }

        /* ================================================
           ZONE SMS
           ================================================ */
        .sms-trigger-zone {
          /* même niveau que le msg-trigger-btn */
        }
        .sms-trigger-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 18px;
          background: var(--bg-card);
          border: 1.5px dashed #10b981;
          border-radius: var(--radius-md);
          color: #065f46;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .sms-trigger-btn:hover {
          background: #ecfdf5;
          border-style: solid;
        }
        .sms-no-phone-hint {
          font-weight: 400;
          color: var(--text-muted);
          font-size: 0.8125rem;
        }
        .sms-upsell {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 16px;
          background: var(--cream-dark);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          font-size: 0.8125rem;
          color: var(--text-muted);
        }
        .sms-upsell strong {
          color: var(--brand-700);
        }

        /* ================================================
           MODAL SMS
           ================================================ */
        .sms-modal {
          max-width: 520px !important;
          padding: 0 !important;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 0;
          max-height: 90vh;
          overflow-y: auto;
        }
        .sms-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
        }
        .sms-modal-header h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1rem;
          font-weight: 700;
          color: #065f46;
          margin: 0;
        }

        /* Bouton rapide annulation */
        .sms-quick-actions {
          padding: 10px 20px;
          background: #f0fdf4;
          border-bottom: 1px solid #bbf7d0;
        }
        .sms-quick-btn {
          padding: 7px 14px;
          border-radius: var(--radius-sm);
          border: 1.5px solid #34d399;
          background: white;
          color: #065f46;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .sms-quick-btn:hover {
          background: #ecfdf5;
        }

        /* Liste destinataires */
        .sms-to {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 20px;
          border-bottom: 1px solid var(--border);
          background: var(--cream);
        }
        .sms-to-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding-top: 3px;
          flex-shrink: 0;
        }
        .sms-to-list {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }
        .sms-to-chip {
          display: flex;
          flex-direction: column;
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
        }
        .sms-to-chip.has-phone {
          background: #ecfdf5;
          border: 1px solid #6ee7b7;
          color: #065f46;
        }
        .sms-to-chip.no-phone {
          background: var(--cream-dark);
          border: 1px solid var(--border);
          color: var(--text-muted);
          opacity: 0.65;
        }
        .phone-num {
          font-size: 0.6875rem;
          opacity: 0.7;
          margin-top: 1px;
        }
        .no-phone-hint {
          font-style: italic;
          font-size: 0.6875rem;
        }

        /* Zone de composition */
        .sms-compose {
          padding: 14px 20px 4px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .sms-compose-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .sms-char-count {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .sms-char-count.over {
          color: #ef4444;
          font-weight: 600;
        }
        .sms-textarea {
          resize: vertical;
          min-height: 90px;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        /* Résultat envoi */
        .sms-result {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin: 10px 20px 0;
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          font-size: 0.8125rem;
        }
        .sms-result.success {
          background: #ecfdf5;
          border: 1px solid #6ee7b7;
          color: #065f46;
        }
        .sms-result.partial {
          background: #fffbeb;
          border: 1px solid #fbbf24;
          color: #78350f;
        }
        .sms-result strong { display: block; font-weight: 700; }
        .sms-errors {
          margin-top: 4px;
          font-size: 0.75rem;
          opacity: 0.8;
        }

        /* Bouton d'envoi */
        .sms-send-btn {
          background: #10b981 !important;
          color: white !important;
          border: none !important;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 18px;
          border-radius: var(--radius-sm);
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.15s;
        }
        .sms-send-btn:hover:not(:disabled) {
          background: #059669 !important;
        }
        .sms-send-btn:disabled {
          background: var(--border) !important;
          color: var(--text-muted) !important;
          cursor: not-allowed !important;
        }
      `}</style>
    </div>
  );
}
