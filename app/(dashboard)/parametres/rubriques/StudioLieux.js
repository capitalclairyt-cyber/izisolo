'use client';

// ════════════════════════════════════════════════════════════════════════════
// Rubrique « Studio & lieux » (fusion Activité + Lieux, décision Colin
// 2026-09-09) : le nom, le métier, la ville, puis la liste des lieux.
// La carte Lieux n'a pas de bouton Enregistrer : chaque lieu est écrit dès
// la validation du modal, et l'écran le dit (retour Léa 2026-08-21).
// Découpe mécanique de page.js : la logique des lieux est inchangée.
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Building2, MapPin, Plus, X, Trash2, Pencil, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';
import { METIERS } from '@/lib/constantes';
import { useParametres, BtnSauver } from '../ParametresContext';

export default function StudioLieux() {
  const { profile, handleChange, lieux, setLieux, studioId } = useParametres();
  const { toast } = useToast();
  // Modal d'édition d'un lieu : null = fermée, { id: null } = création,
  // { id: 'uuid' } = édition.
  const [lieuEdit, setLieuEdit] = useState(null);
  const [lieuSaving, setLieuSaving] = useState(false);

  const openLieuModal = (lieu = null) => {
    setLieuEdit(lieu ? { ...lieu } : { id: null, nom: '', adresse: '', ville: '', notes: '' });
  };
  const closeLieuModal = () => { if (!lieuSaving) setLieuEdit(null); };

  const saveLieu = async () => {
    if (!lieuEdit?.nom?.trim()) { toast.error('Le nom du lieu est obligatoire'); return; }
    setLieuSaving(true);
    const supabase = createClient();
    const payload = {
      nom: lieuEdit.nom.trim(),
      adresse: lieuEdit.adresse?.trim() || null,
      ville: lieuEdit.ville?.trim() || null,
      notes: lieuEdit.notes?.trim() || null,
    };
    if (lieuEdit.id) {
      const { error } = await supabase.from('lieux').update(payload).eq('id', lieuEdit.id);
      if (error) { toast.error('Erreur : ' + error.message); setLieuSaving(false); return; }
      setLieux(prev => prev.map(l => l.id === lieuEdit.id ? { ...l, ...payload } : l));
      toast.success('Lieu modifié');
    } else {
      const { data, error } = await supabase.from('lieux').insert({ ...payload, profile_id: studioId, ordre: lieux.length }).select().single();
      if (error || !data) { toast.error('Erreur : ' + (error?.message || 'lieu non créé')); setLieuSaving(false); return; }
      setLieux(prev => [...prev, data]);
      toast.success('Lieu ajouté');
    }
    setLieuSaving(false);
    setLieuEdit(null);
  };

  const removeLieu = async (id) => {
    const lieu = lieux.find(l => l.id === id);
    const nom = lieu?.nom?.trim() || 'ce lieu';
    if (!confirm(`Supprimer "${nom}" ? Les cours déjà associés à ce lieu garderont leur référence textuelle, mais tu ne pourras plus le sélectionner.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from('lieux').delete().eq('id', id);
    if (error) { toast.error('Erreur : ' + error.message); return; }
    setLieux(prev => prev.filter(l => l.id !== id));
    toast.success('Lieu supprimé');
  };

  return (
    <>
      <div className="section izi-card">
        <div className="section-top"><div className="section-icon"><Building2 size={20} /></div><h2>Mon activité</h2></div>
        <div className="form-group">
          <label className="form-label">Nom du studio</label>
          <input className="izi-input" value={profile.studio_nom || ''} onChange={handleChange('studio_nom')} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Ville</label>
            <input className="izi-input" value={profile.ville || ''} onChange={handleChange('ville')} />
          </div>
          <div className="form-group">
            <label className="form-label">Métier</label>
            <select className="izi-input" value={profile.metier || 'yoga'} onChange={handleChange('metier')}>
              {Object.entries(METIERS).map(([k, v]) => (
                <option key={k} value={k}>{v.emoji} {v.label}</option>
              ))}
            </select>
          </div>
        </div>
        <BtnSauver carte="activite" />
      </div>

      <div className="section izi-card">
        <div className="section-top"><div className="section-icon"><MapPin size={20} /></div><h2>Mes lieux</h2></div>
        <p className="section-desc">
          Les salles et espaces où tu donnes tes cours.
          <br />Chaque lieu est enregistré dès que tu l&apos;ajoutes ou le modifies, il n&apos;y a rien d&apos;autre à valider.
        </p>

        {lieux.length > 0 ? (
          <div className="lieux-list">
            {lieux.map(lieu => (
              <div key={lieu.id} className="lieu-card">
                <div className="lieu-card-icon"><MapPin size={18} /></div>
                <div className="lieu-card-info">
                  <div className="lieu-card-nom">{lieu.nom}</div>
                  {(lieu.adresse || lieu.ville) && (
                    <div className="lieu-card-adresse">{[lieu.adresse, lieu.ville].filter(Boolean).join(', ')}</div>
                  )}
                  {lieu.notes && <div className="lieu-card-notes">{lieu.notes}</div>}
                </div>
                <div className="lieu-card-actions">
                  <button className="lieu-action-btn" onClick={() => openLieuModal(lieu)} title="Modifier" aria-label={`Modifier ${lieu.nom}`}>
                    <Pencil size={16} />
                  </button>
                  <button className="lieu-action-btn lieu-action-danger" onClick={() => removeLieu(lieu.id)} title="Supprimer" aria-label={`Supprimer ${lieu.nom}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="lieux-empty">
            <MapPin size={20} />
            <span>Aucun lieu pour l'instant. Ajoute ta première salle pour pouvoir l'associer à tes cours.</span>
          </div>
        )}

        <button className="izi-btn izi-btn-secondary lieu-add-btn" onClick={() => openLieuModal(null)} type="button">
          <Plus size={18} /> Ajouter un lieu
        </button>
      </div>

      {lieuEdit && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) closeLieuModal(); }}>
          <div className="modal-sheet animate-slide-up" role="dialog" aria-modal="true">
            <div className="modal-header">
              <span className="modal-title">{lieuEdit.id ? 'Modifier le lieu' : 'Nouveau lieu'}</span>
              <button className="modal-close" onClick={closeLieuModal} type="button" aria-label="Fermer"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nom d'affichage *</label>
                <input
                  className="izi-input"
                  value={lieuEdit.nom || ''}
                  onChange={e => setLieuEdit(prev => ({ ...prev, nom: e.target.value }))}
                  placeholder="Ex: Studio Lotus, Salle des fêtes..."
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveLieu(); }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Adresse</label>
                <input className="izi-input" value={lieuEdit.adresse || ''} onChange={e => setLieuEdit(prev => ({ ...prev, adresse: e.target.value }))} placeholder="12 rue des Lilas" />
              </div>
              <div className="form-group">
                <label className="form-label">Ville</label>
                <input className="izi-input" value={lieuEdit.ville || ''} onChange={e => setLieuEdit(prev => ({ ...prev, ville: e.target.value }))} placeholder="Lyon" />
              </div>
              <div className="form-group">
                <label className="form-label">Notes (interne)</label>
                <textarea className="izi-input" rows={3} value={lieuEdit.notes || ''} onChange={e => setLieuEdit(prev => ({ ...prev, notes: e.target.value }))} placeholder="Code d'entrée, infos parking, etc. (visible uniquement par toi)" />
              </div>
              <div className="modal-footer">
                <button className="izi-btn izi-btn-secondary" onClick={closeLieuModal} type="button" disabled={lieuSaving}>Annuler</button>
                <button className="izi-btn izi-btn-primary" onClick={saveLieu} type="button" disabled={lieuSaving || !lieuEdit.nom?.trim()}>
                  {lieuSaving ? <><Loader2 size={16} className="spin" /> Enregistrement…</> : (lieuEdit.id ? 'Enregistrer' : 'Ajouter')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
