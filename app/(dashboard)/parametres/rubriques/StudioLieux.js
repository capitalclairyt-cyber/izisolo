'use client';

// ════════════════════════════════════════════════════════════════════════════
// Rubrique « Studio & lieux » (fusion Activité + Lieux, décision Colin
// 2026-09-09) : le nom, le métier, la ville (carte ouverte), puis la liste des
// lieux (carte repliée, son résumé nomme les lieux). La carte Lieux n'a pas de
// bouton Enregistrer : chaque lieu est écrit dès la validation du modal, et
// l'écran le dit (retour Léa 2026-08-21).
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Building2, MapPin, Plus, X, Trash2, Pencil, Loader2, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';
import { METIERS } from '@/lib/constantes';
import { TYPES_STRUCTURE, CODES_STRUCTURE, typeStructure, erreurRna, normaliserRna } from '@/lib/structure';
import { resumeCarte } from '@/lib/parametres-rubriques';
import { useParametres, BtnSauver } from '../ParametresContext';
import CarteReglage from '../CarteReglage';

export default function StudioLieux() {
  const { profile, setProfile, handleChange, lieux, setLieux, studioId } = useParametres();
  const { toast } = useToast();
  const [lieuEdit, setLieuEdit] = useState(null);
  const [lieuSaving, setLieuSaving] = useState(false);

  // ── La structure (lot 0 Associations & Studios, 2026-09-13) ──────────────
  // État LOCAL et route DÉDIÉE (patron v104) : les colonnes sont neuves (v110)
  // et ne doivent jamais entrer dans le payload d'une autre carte.
  const [typeStr, setTypeStr] = useState(typeStructure(profile));
  const [rna, setRna] = useState(profile?.rna || '');
  const [structSaving, setStructSaving] = useState(false);
  const structDirty = typeStr !== typeStructure(profile) || (typeStr === 'association' && normaliserRna(rna) !== normaliserRna(profile?.rna || ''));
  const erreurStruct = erreurRna(typeStr, rna);

  const saveStructure = async () => {
    if (erreurStruct) { toast.error(erreurStruct); return; }
    setStructSaving(true);
    try {
      const res = await fetch('/api/profile/structure', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type_structure: typeStr, rna: typeStr === 'association' ? rna : null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json.error || 'Le réglage n\'a pas pu être enregistré.'); return; }
      setProfile(prev => ({ ...prev, type_structure: json.type_structure, rna: json.rna }));
      toast.success(typeStr === 'association' ? 'Association enregistrée' : typeStr === 'studio' ? 'Studio enregistré' : 'Enregistré');
    } finally {
      setStructSaving(false);
    }
  };

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
      <CarteReglage id="activite" titre="Mon activité" icone={Building2} resume={resumeCarte('activite', profile)} ouverte>
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
      </CarteReglage>

      <CarteReglage id="structure" titre="Ma structure" icone={Users} resume={resumeCarte('structure', profile)}>
        <p className="section-desc">
          Prof à ton compte, association ou studio : ce choix décide des plans qui te sont proposés
          (Association pour une asso déclarée, Studio pour un lieu avec des intervenantes) et des
          écrans propres à chaque famille.
        </p>
        <div className="structure-choix" role="radiogroup" aria-label="Type de structure">
          {CODES_STRUCTURE.map(code => (
            <label key={code} className={`structure-option ${typeStr === code ? 'on' : ''}`}>
              <input type="radio" name="type_structure" value={code} checked={typeStr === code} onChange={() => setTypeStr(code)} />
              <span className="structure-option-emoji">{TYPES_STRUCTURE[code].emoji}</span>
              <span>
                <strong>{TYPES_STRUCTURE[code].label}</strong>
                <small>{TYPES_STRUCTURE[code].description}</small>
              </span>
            </label>
          ))}
        </div>
        {typeStr === 'association' && (
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label" htmlFor="param-rna">Numéro RNA de l'association</label>
            <input
              id="param-rna"
              className="izi-input"
              value={rna}
              onChange={e => setRna(e.target.value)}
              placeholder="W751234567"
              autoCapitalize="characters"
              aria-invalid={!!erreurStruct && rna.length > 0}
            />
            <p className="form-hint" style={{ margin: '6px 0 0', color: erreurStruct && rna.length > 0 ? 'var(--danger, #b42318)' : undefined }}>
              {erreurStruct && rna.length > 0 ? erreurStruct : 'Sur ton récépissé de préfecture : la lettre W suivie de neuf chiffres. C\'est ce qui ouvre le plan Association.'}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={saveStructure}
          className="izi-btn izi-btn-primary save-btn"
          data-carte="structure"
          disabled={structSaving || !structDirty || !!erreurStruct}
        >
          {structSaving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <style jsx>{`
          .structure-choix { display: grid; gap: 8px; }
          .structure-option {
            display: flex; align-items: flex-start; gap: 10px;
            padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px;
            cursor: pointer; background: var(--bg-card, white);
          }
          .structure-option.on { border-color: var(--brand, #b87333); background: var(--brand-light, #faf2eb); }
          .structure-option input { margin-top: 4px; }
          .structure-option-emoji { font-size: 1.2rem; line-height: 1.2; }
          .structure-option small { display: block; color: var(--text-muted); font-size: 0.78rem; line-height: 1.35; margin-top: 2px; }
        `}</style>
      </CarteReglage>

      <CarteReglage id="lieux" titre="Mes lieux" icone={MapPin} resume={resumeCarte('lieux', profile, { lieux })} ouverte={lieux.length === 0}>
        <p className="section-desc">Les salles où tu donnes tes cours. Chaque lieu est enregistré dès que tu le valides.</p>

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
            <span>Aucun lieu pour l'instant. Ajoute ta première salle pour l'associer à tes cours.</span>
          </div>
        )}

        <button className="izi-btn izi-btn-secondary lieu-add-btn" onClick={() => openLieuModal(null)} type="button">
          <Plus size={18} /> Ajouter un lieu
        </button>
      </CarteReglage>

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
