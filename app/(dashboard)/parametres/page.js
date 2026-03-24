'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Save, Palette, User, Building2, Bell, MapPin,
  Plus, X, Trash2, Flower2, Sliders, Crown, Mail, Home,
  Eye, Settings, Zap, Gift, ToggleLeft, ToggleRight, Cake
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';
import { METIERS } from '@/lib/constantes';
import BackgroundDecor, { ILLUSTRATION_OPTIONS } from '@/components/background/BackgroundDecor';
import ReglesTab from './ReglesTab';

const PALETTES = [
  { id: 'rose', label: 'Rose', color: '#d4a0a0' },
  { id: 'ocean', label: 'Océan', color: '#7aa0c4' },
  { id: 'foret', label: 'Forêt', color: '#7ab07a' },
  { id: 'soleil', label: 'Soleil', color: '#d4b06a' },
  { id: 'lavande', label: 'Lavande', color: '#a890c4' },
  { id: 'terre', label: 'Terre', color: '#c4956a' },
];

const TABS = [
  { id: 'profil',        label: 'Profil',        icon: User },
  { id: 'reglages',      label: 'Réglages',      icon: Sliders },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'regles',        label: 'Règles',        icon: Zap },
  { id: 'abonnement',    label: 'Abonnement',    icon: Crown },
];

const ANNIV_MODES = [
  { id: 'off',    label: 'Désactivé',  desc: 'Aucune alerte anniversaire' },
  { id: 'manuel', label: 'Manuel',     desc: 'Notification uniquement, tu envoies toi-même' },
  { id: 'semi',   label: 'Semi-auto',  desc: 'Notification + confirmation avant envoi' },
  { id: 'auto',   label: 'Automatique',desc: 'Envoi automatique sans confirmation' },
];

const REGLAGES_SUBTABS = [
  { id: 'apparences', label: 'Apparences', icon: Eye },
  { id: 'general', label: 'Général', icon: Settings },
];

export default function Parametres() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [lieux, setLieux] = useState([]);
  const [newLieu, setNewLieu] = useState('');
  const [activeTab, setActiveTab] = useState('profil');
  const [reglagesSubTab, setReglagesSubTab] = useState('apparences');
  // Sous-onglet notifications
  const [notifSubTab, setNotifSubTab] = useState('general');
  // Notifications générales
  const [notifNouveauClient, setNotifNouveauClient]       = useState(true);
  const [notifPaiementRetard, setNotifPaiementRetard]     = useState(true);
  const [notifCarnetEpuise, setNotifCarnetEpuise]         = useState(true);
  const [notifAbonnementExpire, setNotifAbonnementExpire] = useState(true);
  // Anniversaires
  const [annivMode, setAnnivMode] = useState('semi');
  const [annivMessage, setAnnivMessage] = useState('');
  const [annivCadeauActif, setAnnivCadeauActif] = useState(false);
  const [annivCadeauOffreId, setAnnivCadeauOffreId] = useState('');
  const [annivCadeauType, setAnnivCadeauType] = useState('gratuit');
  const [annivCadeauRemisePct, setAnnivCadeauRemisePct] = useState(20);
  const [offresDisponibles, setOffresDisponibles] = useState([]);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const [{ data: prof }, { data: lieuxData }, { data: offresData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('lieux').select('*').eq('profile_id', user.id).order('ordre'),
        supabase.from('offres').select('id, nom, prix, type').eq('profile_id', user.id).eq('actif', true).order('nom'),
      ]);

      setProfile(prof);
      setLieux(lieuxData || []);
      setOffresDisponibles(offresData || []);

      // Notifs générales
      setNotifNouveauClient(prof?.notif_nouveau_client !== false);
      setNotifPaiementRetard(prof?.notif_paiement_retard !== false);
      setNotifCarnetEpuise(prof?.notif_carnet_epuise !== false);
      setNotifAbonnementExpire(prof?.notif_abonnement_expire !== false);
      // Anniversaires
      setAnnivMode(prof?.anniversaire_mode || 'semi');
      setAnnivMessage(prof?.anniversaire_message || 'Joyeux anniversaire {{prenom}} ! 🎂 En ce jour spécial, toute l\'équipe du studio vous souhaite une magnifique journée. À très bientôt sur le tapis !');
      setAnnivCadeauActif(prof?.anniversaire_cadeau_actif || false);
      setAnnivCadeauOffreId(prof?.anniversaire_cadeau_offre_id || '');
      setAnnivCadeauType(prof?.anniversaire_cadeau_type || 'gratuit');
      setAnnivCadeauRemisePct(prof?.anniversaire_cadeau_remise_pct || 20);

      setLoading(false);
    };
    load();
  }, []);

  const handleChange = (field) => (e) => {
    setProfile(prev => ({ ...prev, [field]: e.target.value }));
  };

  // --- Lieux ---
  const addLieu = async () => {
    if (!newLieu.trim()) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('lieux').insert({
      profile_id: user.id,
      nom: newLieu.trim(),
      ordre: lieux.length,
    }).select().single();

    if (!error && data) {
      setLieux(prev => [...prev, data]);
      setNewLieu('');
    }
  };

  const removeLieu = async (id) => {
    const supabase = createClient();
    await supabase.from('lieux').delete().eq('id', id);
    setLieux(prev => prev.filter(l => l.id !== id));
  };

  const updateLieu = async (id, field, value) => {
    const supabase = createClient();
    await supabase.from('lieux').update({ [field]: value }).eq('id', id);
    setLieux(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  // --- Save profile ---
  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from('profiles').update({
      prenom: profile.prenom,
      nom: profile.nom,
      email: profile.email,
      studio_nom: profile.studio_nom,
      adresse: profile.adresse,
      ville: profile.ville,
      telephone: profile.telephone,
      metier: profile.metier,
      lieu_principal: profile.lieu_principal || null,
      ui_couleur: profile.ui_couleur,
      ui_illustration: profile.ui_illustration || 'lotus',
      ui_grille_active: profile.ui_grille_active !== false,
      ui_animation_active: profile.ui_animation_active !== false,
      alerte_seances_seuil: parseInt(profile.alerte_seances_seuil) || 2,
      alerte_expiration_jours: parseInt(profile.alerte_expiration_jours) || 7,
      anniversaire_mode:            annivMode,
      anniversaire_message:         annivMessage,
      anniversaire_cadeau_actif:    annivCadeauActif,
      anniversaire_cadeau_offre_id: annivCadeauOffreId || null,
      anniversaire_cadeau_type:     annivCadeauType,
      anniversaire_cadeau_remise_pct: parseInt(annivCadeauRemisePct) || 20,
      notif_nouveau_client:    notifNouveauClient,
      notif_paiement_retard:   notifPaiementRetard,
      notif_carnet_epuise:     notifCarnetEpuise,
      notif_abonnement_expire: notifAbonnementExpire,
    }).eq('id', profile.id);

    if (!error) {
      router.refresh();
      toast.success('Paramètres enregistrés !');
    } else {
      toast.error('Erreur : ' + error.message);
    }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Chargement...</div>;

  return (
    <div className="parametres">
      <BackgroundDecor
        illustration={profile.ui_illustration || 'lotus'}
        grilleActive={profile.ui_grille_active !== false}
        animationActive={profile.ui_animation_active !== false}
      />

      <div className="page-header animate-fade-in">
        <h1>Paramètres</h1>
      </div>

      {/* === ONGLETS PRINCIPAUX === */}
      <div className="tabs-bar animate-fade-in">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================ */}
      {/* ONGLET 1 — PROFIL                           */}
      {/* ============================================ */}
      {activeTab === 'profil' && (
        <div className="tab-content animate-fade-in">

          {/* Profil */}
          <div className="section izi-card">
            <div className="section-top"><div className="section-icon"><User size={20} /></div><h2>Mon profil</h2></div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Prénom</label>
                <input className="izi-input" value={profile.prenom || ''} onChange={handleChange('prenom')} />
              </div>
              <div className="form-group">
                <label className="form-label">Nom</label>
                <input className="izi-input" value={profile.nom || ''} onChange={handleChange('nom')} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label"><Mail size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />Adresse e-mail</label>
              <input className="izi-input" type="email" value={profile.email || ''} onChange={handleChange('email')} placeholder="ton@email.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Téléphone</label>
              <input className="izi-input" value={profile.telephone || ''} onChange={handleChange('telephone')} />
            </div>
            <div className="form-group">
              <label className="form-label"><Home size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />Adresse</label>
              <input className="izi-input" value={profile.adresse || ''} onChange={handleChange('adresse')} placeholder="Adresse postale" />
            </div>
          </div>

          {/* Studio */}
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
            {lieux.length > 0 && (
              <div className="form-group">
                <label className="form-label"><MapPin size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />Ma salle principale</label>
                <select
                  className="izi-input"
                  value={profile.lieu_principal || ''}
                  onChange={handleChange('lieu_principal')}
                >
                  <option value="">Aucune sélection</option>
                  {lieux.map(l => (
                    <option key={l.id} value={l.id}>{l.nom}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Lieux */}
          <div className="section izi-card">
            <div className="section-top"><div className="section-icon"><MapPin size={20} /></div><h2>Mes lieux</h2></div>
            <p className="section-desc">Les salles et espaces où tu donnes tes cours.</p>

            {lieux.length > 0 && (
              <div className="lieux-list">
                {lieux.map(lieu => (
                  <div key={lieu.id} className="lieu-item">
                    <div className="lieu-info">
                      <input
                        className="lieu-nom-input"
                        value={lieu.nom}
                        onChange={e => updateLieu(lieu.id, 'nom', e.target.value)}
                        onBlur={e => { if (!e.target.value.trim()) removeLieu(lieu.id); }}
                      />
                      <input
                        className="lieu-adresse-input"
                        value={lieu.adresse || ''}
                        onChange={e => updateLieu(lieu.id, 'adresse', e.target.value)}
                        placeholder="Adresse (optionnel)"
                      />
                    </div>
                    <button className="lieu-delete" onClick={() => removeLieu(lieu.id)} title="Supprimer">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="add-row">
              <input
                className="izi-input"
                value={newLieu}
                onChange={e => setNewLieu(e.target.value)}
                placeholder="Nouveau lieu..."
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLieu())}
              />
              <button className="izi-btn izi-btn-secondary add-btn" onClick={addLieu} disabled={!newLieu.trim()}>
                <Plus size={18} />
              </button>
            </div>
          </div>

          <button onClick={handleSave} className="izi-btn izi-btn-primary save-btn" disabled={saving}>
            <Save size={18} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      )}

      {/* ============================================ */}
      {/* ONGLET 2 — RÉGLAGES                         */}
      {/* ============================================ */}
      {activeTab === 'reglages' && (
        <div className="tab-content animate-fade-in">

          {/* Sous-onglets Réglages */}
          <div className="subtabs-bar">
            {REGLAGES_SUBTABS.map(sub => {
              const Icon = sub.icon;
              return (
                <button
                  key={sub.id}
                  className={`subtab-btn ${reglagesSubTab === sub.id ? 'active' : ''}`}
                  onClick={() => setReglagesSubTab(sub.id)}
                >
                  <Icon size={14} />
                  <span>{sub.label}</span>
                </button>
              );
            })}
          </div>

          {/* === SOUS-ONGLET : APPARENCES === */}
          {reglagesSubTab === 'apparences' && (
            <div className="subtab-content animate-fade-in">

              {/* Thème couleur */}
              <div className="section izi-card">
                <div className="section-top"><div className="section-icon"><Palette size={20} /></div><h2>Thème couleur</h2></div>
                <div className="palette-grid">
                  {PALETTES.map(p => (
                    <button
                      key={p.id}
                      className={`palette-btn ${profile.ui_couleur === p.id ? 'selected' : ''}`}
                      onClick={() => setProfile(prev => ({ ...prev, ui_couleur: p.id }))}
                    >
                      <div className="palette-swatch" style={{ background: p.color }} />
                      <span className="palette-label">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Décor visuel */}
              <div className="section izi-card">
                <div className="section-top"><div className="section-icon"><Flower2 size={20} /></div><h2>Décor visuel</h2></div>
                <p className="section-desc">Personnalise l'ambiance visuelle de ton espace.</p>

                <div className="form-group">
                  <label className="form-label">Illustration</label>
                  <div className="decor-options">
                    {ILLUSTRATION_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`decor-option ${(profile.ui_illustration || 'lotus') === opt.value ? 'selected' : ''}`}
                        onClick={() => setProfile(prev => ({ ...prev, ui_illustration: opt.value }))}
                      >
                        <span className="decor-emoji">{opt.emoji}</span> {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="toggle-row">
                  <label className="toggle-label">Grille décorative d'arrière-plan</label>
                  <button
                    type="button"
                    className={`toggle-switch ${(profile.ui_grille_active !== false) ? 'active' : ''}`}
                    onClick={() => setProfile(prev => ({ ...prev, ui_grille_active: !(prev.ui_grille_active !== false) }))}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>

                <div className="toggle-row">
                  <label className="toggle-label">Animation de l'arrière-plan</label>
                  <button
                    type="button"
                    className={`toggle-switch ${(profile.ui_animation_active !== false) ? 'active' : ''}`}
                    onClick={() => setProfile(prev => ({ ...prev, ui_animation_active: !(prev.ui_animation_active !== false) }))}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>

                {(profile.ui_illustration || 'lotus') !== 'aucun' && (
                  <div className="illustration-preview">
                    <img
                      src={`/illustrations/${profile.ui_illustration || 'lotus'}.jpg`}
                      alt={ILLUSTRATION_OPTIONS.find(o => o.value === (profile.ui_illustration || 'lotus'))?.label || ''}
                    />
                  </div>
                )}
              </div>

              <button onClick={handleSave} className="izi-btn izi-btn-primary save-btn" disabled={saving}>
                <Save size={18} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          )}

          {/* === SOUS-ONGLET : GÉNÉRAL === */}
          {reglagesSubTab === 'general' && (
            <div className="subtab-content animate-fade-in">

              {/* Alertes & Notifications */}
              <div className="section izi-card">
                <div className="section-top"><div className="section-icon"><Bell size={20} /></div><h2>Alertes</h2></div>
                <p className="section-desc">Configure les seuils de notification pour tes élèves.</p>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Seuil séances basses</label>
                    <input className="izi-input" type="number" value={profile.alerte_seances_seuil || 2} onChange={handleChange('alerte_seances_seuil')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Jours avant expiration</label>
                    <input className="izi-input" type="number" value={profile.alerte_expiration_jours || 7} onChange={handleChange('alerte_expiration_jours')} />
                  </div>
                </div>
              </div>

              <button onClick={handleSave} className="izi-btn izi-btn-primary save-btn" disabled={saving}>
                <Save size={18} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* ONGLET — NOTIFICATIONS & ANNIVERSAIRES      */}
      {/* ============================================ */}
      {activeTab === 'notifications' && (
        <div className="tab-content animate-fade-in">

          {/* ── Sous-onglets ── */}
          <div className="notif-subtabs">
            <button
              className={`notif-subtab ${notifSubTab === 'general' ? 'active' : ''}`}
              onClick={() => setNotifSubTab('general')}
            >
              <Bell size={14} /> Général
            </button>
            <button
              className={`notif-subtab ${notifSubTab === 'anniversaire' ? 'active' : ''}`}
              onClick={() => setNotifSubTab('anniversaire')}
            >
              <Cake size={14} /> Anniversaires
            </button>
          </div>

          {/* ══════════ SOUS-ONGLET GÉNÉRAL ══════════ */}
          {notifSubTab === 'general' && (
            <div className="notif-general animate-fade-in">
              <p className="param-section-desc" style={{ marginBottom: 4 }}>
                Choisissez les événements pour lesquels vous souhaitez recevoir une notification dans l'application.
              </p>

              {[
                {
                  key:     'nouveau_client',
                  state:   notifNouveauClient,
                  setter:  setNotifNouveauClient,
                  label:   'Nouvel élève ajouté',
                  desc:    'Quand un élève est ajouté (manuellement ou via inscription)',
                  emoji:   '👤',
                },
                {
                  key:     'paiement_retard',
                  state:   notifPaiementRetard,
                  setter:  setNotifPaiementRetard,
                  label:   'Paiement en attente',
                  desc:    'Paiement non réglé depuis plus de 7 jours',
                  emoji:   '💶',
                },
                {
                  key:     'carnet_epuise',
                  state:   notifCarnetEpuise,
                  setter:  setNotifCarnetEpuise,
                  label:   'Carnet de séances épuisé',
                  desc:    'Quand il reste moins de 2 séances dans un carnet actif',
                  emoji:   '📋',
                },
                {
                  key:     'abonnement_expire',
                  state:   notifAbonnementExpire,
                  setter:  setNotifAbonnementExpire,
                  label:   'Abonnement qui expire bientôt',
                  desc:    'Abonnement arrivant à échéance dans moins de 14 jours',
                  emoji:   '⏰',
                },
              ].map(({ key, state, setter, label, desc, emoji, soon }) => (
                <div key={key} className="notif-row param-section">
                  <div className="notif-row-left">
                    <span className="notif-row-emoji">{emoji}</span>
                    <div>
                      <div className="notif-row-label">
                        {label}
                        {soon && <span className="notif-soon-badge">Bientôt</span>}
                      </div>
                      <div className="notif-row-desc">{desc}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`param-toggle-switch ${soon ? 'disabled' : ''}`}
                    onClick={() => !soon && setter(v => !v)}
                    disabled={soon}
                  >
                    {state && !soon
                      ? <ToggleRight size={26} style={{ color: 'var(--brand)' }} />
                      : <ToggleLeft  size={26} style={{ color: soon ? 'var(--border)' : 'var(--border)' }} />
                    }
                  </button>
                </div>
              ))}

              <button className="izi-btn izi-btn-primary" onClick={handleSave} disabled={saving}>
                <Save size={16} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          )}

          {/* ══════════ SOUS-ONGLET ANNIVERSAIRES ══════════ */}
          {notifSubTab === 'anniversaire' && (
            <div className="notif-anniv animate-fade-in">

              {/* Mode */}
              <div className="param-section">
                <div className="param-section-title">
                  <Cake size={16} /> Mode d'envoi
                </div>
                <p className="param-section-desc">
                  IziSolo détecte automatiquement les anniversaires et peut envoyer un message personnalisé.
                </p>
                <div className="anniv-modes">
                  {ANNIV_MODES.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      className={`anniv-mode-btn ${annivMode === m.id ? 'active' : ''}`}
                      onClick={() => setAnnivMode(m.id)}
                    >
                      <div className="anniv-mode-label">{m.label}</div>
                      <div className="anniv-mode-desc">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message type */}
              {annivMode !== 'off' && (
                <div className="param-section">
                  <div className="param-section-title">
                    <Mail size={16} /> Message d'anniversaire
                  </div>
                  <p className="param-section-desc">
                    Utilise <code>{'{{prenom}}'}</code> pour personnaliser avec le prénom de l'élève.
                  </p>
                  <textarea
                    className="izi-input anniv-textarea"
                    value={annivMessage}
                    onChange={e => setAnnivMessage(e.target.value)}
                    rows={4}
                    placeholder="Joyeux anniversaire {{prenom}} ! 🎂"
                  />
                  <div className="anniv-preview">
                    <span className="anniv-preview-label">Aperçu :</span>
                    {annivMessage.replace(/\{\{prenom\}\}/g, 'Sophie')}
                  </div>
                </div>
              )}

              {/* Cadeau */}
              {annivMode !== 'off' && (
                <div className="param-section">
                  <div className="param-section-title-row">
                    <div className="param-section-title">
                      <Gift size={16} /> Offrir quelque chose
                    </div>
                    <button
                      type="button"
                      className="param-toggle-switch"
                      onClick={() => setAnnivCadeauActif(v => !v)}
                    >
                      {annivCadeauActif
                        ? <ToggleRight size={26} style={{ color: 'var(--brand)' }} />
                        : <ToggleLeft  size={26} style={{ color: 'var(--border)' }} />
                      }
                    </button>
                  </div>
                  <p className="param-section-desc">
                    Joindre un cadeau au message : offre à 0€ ou remise sur une prestation.
                  </p>

                  {annivCadeauActif && (
                    <div className="anniv-cadeau-zone animate-slide-up">
                      <div className="form-group">
                        <label className="form-label">Type de cadeau</label>
                        <div className="anniv-cadeau-type-row">
                          {[
                            { id: 'gratuit', label: '🎁 Offre offerte (0€)' },
                            { id: 'remise',  label: '% Remise sur une offre' },
                          ].map(ct => (
                            <button
                              key={ct.id}
                              type="button"
                              className={`anniv-cadeau-type-btn ${annivCadeauType === ct.id ? 'active' : ''}`}
                              onClick={() => setAnnivCadeauType(ct.id)}
                            >
                              {ct.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          {annivCadeauType === 'gratuit' ? 'Offre à offrir' : 'Offre sur laquelle appliquer la remise'}
                        </label>
                        <select
                          className="izi-input"
                          value={annivCadeauOffreId}
                          onChange={e => setAnnivCadeauOffreId(e.target.value)}
                        >
                          <option value="">— Choisir une offre —</option>
                          {offresDisponibles.map(o => (
                            <option key={o.id} value={o.id}>
                              {o.nom} {o.prix > 0 ? `— ${o.prix}€` : '(offert)'}
                            </option>
                          ))}
                        </select>
                      </div>

                      {annivCadeauType === 'remise' && (
                        <div className="form-group">
                          <label className="form-label">Pourcentage de remise</label>
                          <div className="anniv-remise-row">
                            {[10, 20, 30, 50].map(p => (
                              <button
                                key={p}
                                type="button"
                                className={`anniv-pct-btn ${annivCadeauRemisePct === p ? 'active' : ''}`}
                                onClick={() => setAnnivCadeauRemisePct(p)}
                              >
                                {p}%
                              </button>
                            ))}
                            <input
                              className="izi-input anniv-pct-input"
                              type="number" min="1" max="100"
                              value={annivCadeauRemisePct}
                              onChange={e => setAnnivCadeauRemisePct(Number(e.target.value))}
                              placeholder="Autre %"
                            />
                          </div>
                        </div>
                      )}

                      <div className="anniv-cadeau-hint">
                        💡 Le cadeau sera joint au message et créera automatiquement un abonnement/carnet à 0€ (ou avec remise) pour l'élève une fois le message envoyé.
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button className="izi-btn izi-btn-primary" onClick={handleSave} disabled={saving}>
                <Save size={16} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          )}

        </div>
      )}

      {/* ============================================ */}
      {/* ONGLET 3 — RÈGLES                           */}
      {/* ============================================ */}
      {activeTab === 'regles' && (
        <div className="tab-content animate-fade-in">
          <ReglesTab profileId={profile.id} />
        </div>
      )}

      {/* ============================================ */}
      {/* ONGLET 4 — ABONNEMENT                       */}
      {/* ============================================ */}
      {activeTab === 'abonnement' && (
        <div className="tab-content animate-fade-in">

          {/* Plan actuel */}
          <div className="section izi-card">
            <div className="section-top"><div className="section-icon abo-icon"><Crown size={20} /></div><h2>Mon abonnement</h2></div>

            <div className="abo-current">
              <div className="abo-badge">Gratuit</div>
              <p className="abo-status">Tu utilises actuellement le plan <strong>Découverte</strong>.</p>
            </div>

            <div className="abo-features">
              <div className="abo-feature included">
                <span className="abo-check">✓</span>
                <span>Gestion de 15 élèves</span>
              </div>
              <div className="abo-feature included">
                <span className="abo-check">✓</span>
                <span>Planning des cours</span>
              </div>
              <div className="abo-feature included">
                <span className="abo-check">✓</span>
                <span>Suivi des présences</span>
              </div>
              <div className="abo-feature locked">
                <span className="abo-lock">🔒</span>
                <span>Élèves illimités</span>
              </div>
              <div className="abo-feature locked">
                <span className="abo-lock">🔒</span>
                <span>Facturation & paiements</span>
              </div>
              <div className="abo-feature locked">
                <span className="abo-lock">🔒</span>
                <span>Statistiques avancées</span>
              </div>
              <div className="abo-feature locked">
                <span className="abo-lock">🔒</span>
                <span>Page de réservation publique</span>
              </div>
            </div>
          </div>

          {/* Plans */}
          <div className="section izi-card">
            <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: 4 }}>Passer à la vitesse supérieure</h2>
            <p className="section-desc">Débloquez toutes les fonctionnalités pour développer votre activité.</p>

            <div className="plans-grid">
              <div className="plan-card">
                <div className="plan-name">Solo</div>
                <div className="plan-price"><span className="plan-amount">9€</span><span className="plan-period">/mois</span></div>
                <p className="plan-desc">Pour les indépendants qui démarrent.</p>
                <button className="izi-btn izi-btn-secondary plan-cta">Bientôt disponible</button>
              </div>
              <div className="plan-card recommended">
                <div className="plan-badge">Recommandé</div>
                <div className="plan-name">Pro</div>
                <div className="plan-price"><span className="plan-amount">19€</span><span className="plan-period">/mois</span></div>
                <p className="plan-desc">Tout ce qu'il faut pour gérer son activité sereinement.</p>
                <button className="izi-btn izi-btn-primary plan-cta">Bientôt disponible</button>
              </div>
            </div>
          </div>

        </div>
      )}

      <style jsx global>{`
        .parametres { display: flex; flex-direction: column; gap: 0; padding-bottom: 40px; }
        .page-header { margin-bottom: 12px; }
        .page-header h1 { font-size: 1.375rem; font-weight: 700; }

        /* === ONGLETS PRINCIPAUX === */
        @keyframes shimmer-tabs {
          0%   { transform: translateX(-150%); }
          50%  { transform: translateX(150%); }
          100% { transform: translateX(-150%); }
        }
        .tabs-bar {
          display: flex; gap: 0; padding: 0;
          background: linear-gradient(135deg, var(--brand-100, var(--brand-light)) 0%, var(--brand-light) 60%, var(--brand-50, #fff) 100%);
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          border: 1.5px solid var(--brand-200, var(--border)); border-bottom: none;
          overflow-x: auto; overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
          position: relative;
        }
        .tabs-bar::-webkit-scrollbar { display: none; }
        .tabs-bar::after {
          content: '';
          position: absolute; top: 0; left: 0;
          width: 55%; height: 100%;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%);
          animation: shimmer-tabs 5s ease-in-out infinite;
          pointer-events: none; z-index: 0;
        }
        .tab-btn {
          flex: 1 0 auto; display: flex; align-items: center; justify-content: center; gap: 7px;
          padding: 14px 14px; border: none; border-bottom: 3px solid transparent;
          background: transparent; color: var(--brand-700);
          font-size: 0.875rem; font-weight: 600; cursor: pointer; white-space: nowrap;
          transition: all 0.2s ease; position: relative; z-index: 1;
        }
        .tab-btn:hover {
          color: var(--brand-700);
          background: rgba(255,255,255,0.45);
        }
        .tab-btn.active {
          color: var(--brand-700);
          border-bottom-color: var(--brand);
          background: rgba(255,255,255,0.65);
        }

        /* === CONTENU — collé aux onglets === */
        .tab-content {
          display: flex; flex-direction: column; gap: 0;
          background: var(--bg-card);
          border: 1.5px solid var(--border); border-top: none;
          border-radius: 0 0 var(--radius-lg) var(--radius-lg);
          padding: 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
        }
        .tab-content > .section {
          border-radius: var(--radius-md);
          margin-bottom: 12px;
        }
        .tab-content > .save-btn {
          margin-top: 4px;
        }
        .subtab-content > .section {
          border-radius: var(--radius-md);
          margin-bottom: 12px;
        }
        .subtab-content > .section:last-of-type { margin-bottom: 4px; }
        .subtab-content > .save-btn {
          margin-top: 4px;
        }

        /* === SOUS-ONGLETS RÉGLAGES — collés au contenu === */
        .subtabs-bar {
          display: flex; gap: 0; padding: 0;
          background: var(--cream); border-radius: var(--radius-md) var(--radius-md) 0 0;
          border: 1px solid var(--border); border-bottom: none;
          overflow: hidden;
        }
        .subtab-btn {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
          padding: 10px 10px; border: none; border-bottom: 2px solid transparent;
          background: transparent; color: var(--text-muted);
          font-size: 0.8125rem; font-weight: 600; cursor: pointer;
          transition: all 0.2s ease;
        }
        .subtab-btn:hover { color: var(--text-primary); background: rgba(255,255,255,0.5); }
        .subtab-btn.active {
          color: var(--brand-700); border-bottom-color: var(--brand);
          background: var(--bg-card);
        }

        .subtab-content {
          display: flex; flex-direction: column; gap: 0;
          background: var(--bg-card);
          border: 1px solid var(--border); border-top: none;
          border-radius: 0 0 var(--radius-md) var(--radius-md);
          padding: 12px;
        }

        /* === SECTIONS === */
        .section { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
        .section-top { display: flex; align-items: center; gap: 10px; }
        .section-top h2 { font-size: 1.0625rem; font-weight: 700; margin: 0; }
        .section-icon { width: 36px; height: 36px; border-radius: var(--radius-sm); background: var(--brand-light); color: var(--brand-700); display: flex; align-items: center; justify-content: center; }
        .section-desc { font-size: 0.8125rem; color: var(--text-muted); margin: -4px 0 4px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-label { font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); }

        /* Types de cours */
        .chips-list { display: flex; flex-wrap: wrap; gap: 6px; }
        .chip-editable { display: flex; align-items: center; gap: 4px; padding: 6px 10px; background: var(--brand-light); color: var(--brand-700); border-radius: var(--radius-full); font-size: 0.8125rem; font-weight: 500; }
        .chip-remove { background: none; border: none; cursor: pointer; color: var(--brand-600); padding: 0; display: flex; align-items: center; opacity: 0.6; }
        .chip-remove:hover { opacity: 1; }

        /* Lieux */
        .lieux-list { display: flex; flex-direction: column; gap: 8px; }
        .lieu-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--cream); border-radius: var(--radius-sm); border: 1px solid var(--border); }
        .lieu-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .lieu-nom-input { border: none; background: none; font-weight: 600; font-size: 0.9375rem; color: var(--text-primary); outline: none; padding: 0; }
        .lieu-adresse-input { border: none; background: none; font-size: 0.75rem; color: var(--text-muted); outline: none; padding: 0; }
        .lieu-delete { background: none; border: none; color: var(--danger); cursor: pointer; padding: 4px; border-radius: var(--radius-sm); opacity: 0.5; }
        .lieu-delete:hover { opacity: 1; background: #fef2f2; }

        /* Add row */
        .add-row { display: flex; gap: 8px; }
        .add-row .izi-input { flex: 1; }
        .add-btn { min-width: 48px; padding: 0; display: flex; align-items: center; justify-content: center; }

        /* Palette */
        .palette-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .palette-btn { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px; border-radius: var(--radius-md); border: 2px solid var(--border); background: var(--bg-card); cursor: pointer; transition: all var(--transition-fast); }
        .palette-btn.selected { border-color: var(--brand); box-shadow: 0 0 0 2px var(--brand-light); }
        .palette-swatch { width: 32px; height: 32px; border-radius: 50%; }
        .palette-label { font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); }
        .save-btn { width: 100%; }

        /* Décor options */
        .decor-options { display: flex; flex-wrap: wrap; gap: 6px; }
        .decor-option {
          padding: 8px 14px; border-radius: var(--radius-full);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.8125rem; font-weight: 500; color: var(--text-secondary);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .decor-option.selected {
          border-color: var(--brand); background: var(--brand-light); color: var(--brand-700);
        }
        .decor-emoji { font-size: 0.9rem; }

        /* Illustration preview */
        .illustration-preview {
          display: flex; align-items: center; justify-content: center;
          padding: 16px; border-radius: var(--radius-md);
          border: 1px solid var(--border); background: var(--bg-card);
        }
        .illustration-preview img {
          width: 180px; height: 180px; object-fit: contain; opacity: 0.7;
        }

        /* Toggle switch */
        .toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .toggle-label { font-size: 0.875rem; font-weight: 500; color: var(--text-primary); }
        .toggle-switch { width: 48px; height: 28px; border-radius: 14px; border: none; background: var(--cream-dark); cursor: pointer; position: relative; transition: background var(--transition-fast); padding: 0; }
        .toggle-switch.active { background: var(--brand); }
        .toggle-knob { position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.15); transition: transform var(--transition-fast); display: block; }
        .toggle-switch.active .toggle-knob { transform: translateX(20px); }

        /* === ABONNEMENT === */
        .abo-icon { background: linear-gradient(135deg, #fef3c7, #fde68a); color: #b45309; }
        .abo-current { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .abo-badge {
          padding: 4px 12px; border-radius: var(--radius-full);
          background: var(--cream); border: 1px solid var(--border);
          font-size: 0.75rem; font-weight: 700; color: var(--text-secondary);
          text-transform: uppercase; letter-spacing: 0.5px;
        }
        .abo-status { font-size: 0.875rem; color: var(--text-secondary); margin: 0; }
        .abo-features { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
        .abo-feature {
          display: flex; align-items: center; gap: 10px;
          font-size: 0.875rem; color: var(--text-secondary);
          padding: 8px 12px; border-radius: var(--radius-sm);
        }
        .abo-feature.included { color: var(--text-primary); }
        .abo-feature.locked { opacity: 0.55; }
        .abo-check { color: var(--brand); font-weight: 700; font-size: 1rem; }
        .abo-lock { font-size: 0.8rem; }

        /* Plans */
        .plans-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 4px; }
        .plan-card {
          display: flex; flex-direction: column; gap: 8px;
          padding: 20px; border-radius: var(--radius-md);
          border: 2px solid var(--border); background: var(--bg-card);
          position: relative;
        }
        .plan-card.recommended {
          border-color: var(--brand);
          background: var(--brand-light);
        }
        .plan-badge {
          position: absolute; top: -10px; right: 12px;
          padding: 2px 10px; border-radius: var(--radius-full);
          background: var(--brand); color: white;
          font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .plan-name { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); }
        .plan-price { display: flex; align-items: baseline; gap: 2px; }
        .plan-amount { font-size: 1.75rem; font-weight: 800; color: var(--text-primary); }
        .plan-period { font-size: 0.8125rem; color: var(--text-muted); }
        .plan-desc { font-size: 0.8125rem; color: var(--text-muted); margin: 0; flex: 1; }
        .plan-cta { margin-top: 8px; }

        @media (max-width: 480px) {
          .plans-grid { grid-template-columns: 1fr; }
          .form-row { grid-template-columns: 1fr; }
        }

        /* Animation */
        .animate-fade-in {
          animation: fadeIn 0.25s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slideUp 0.2s ease; }

        /* ── Sous-onglets notifications ── */
        .notif-subtabs {
          display: flex; gap: 4px;
          background: var(--border); border-radius: 10px;
          padding: 3px; width: fit-content; margin-bottom: 14px;
        }
        .notif-subtab {
          display: flex; align-items: center; gap: 5px;
          padding: 6px 16px; border-radius: 8px; border: none;
          background: none; font-size: 0.8125rem; font-weight: 600;
          color: var(--text-muted); cursor: pointer; transition: all 0.15s;
        }
        .notif-subtab.active {
          background: var(--bg-card); color: var(--text-primary);
          box-shadow: 0 1px 4px rgba(0,0,0,0.07);
        }

        /* Général notif rows */
        .notif-general, .notif-anniv { display: flex; flex-direction: column; gap: 10px; }
        .notif-row {
          display: flex; align-items: center;
          justify-content: space-between; gap: 12px; flex-direction: row !important;
        }
        .notif-row-left { display: flex; align-items: center; gap: 12px; flex: 1; }
        .notif-row-emoji { font-size: 1.25rem; flex-shrink: 0; width: 28px; text-align: center; }
        .notif-row-label {
          font-size: 0.875rem; font-weight: 600; color: var(--text-primary);
          display: flex; align-items: center; gap: 7px;
        }
        .notif-row-desc  { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
        .notif-soon-badge {
          font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.05em; padding: 2px 6px; border-radius: 5px;
          background: #fef9c3; color: #a16207; border: 1px solid #fde047;
        }
        .param-toggle-switch.disabled { opacity: 0.4; cursor: not-allowed; }

        /* ── Notifications / Anniversaires ── */
        .param-section {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--radius-md); padding: 16px;
          display: flex; flex-direction: column; gap: 12px;
        }
        .param-section + .param-section { margin-top: 12px; }
        .param-section-title {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.875rem; font-weight: 700; color: var(--text-primary);
        }
        .param-section-title-row {
          display: flex; align-items: center; justify-content: space-between;
        }
        .param-section-desc {
          font-size: 0.8125rem; color: var(--text-muted); margin: 0; line-height: 1.5;
        }
        .param-section-desc code {
          background: var(--border); padding: 1px 5px; border-radius: 4px;
          font-size: 0.75rem; font-family: monospace;
        }
        .param-toggle-switch { background: none; border: none; cursor: pointer; padding: 0; display: flex; }

        /* Modes anniversaire */
        .anniv-modes { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .anniv-mode-btn {
          padding: 10px 12px; border-radius: var(--radius-md);
          border: 1.5px solid var(--border); background: var(--bg-card);
          text-align: left; cursor: pointer; transition: all 0.15s;
        }
        .anniv-mode-btn.active { border-color: var(--brand); background: var(--brand-light); }
        .anniv-mode-label { font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); }
        .anniv-mode-desc  { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
        .anniv-mode-btn.active .anniv-mode-label { color: var(--brand-700); }

        /* Textarea message */
        .anniv-textarea { resize: vertical; min-height: 80px; }
        .anniv-preview {
          font-size: 0.8125rem; color: var(--text-muted);
          padding: 8px 10px; background: var(--cream, #faf8f5);
          border-radius: var(--radius-sm); border: 1px dashed var(--border);
          line-height: 1.5;
        }
        .anniv-preview-label {
          font-weight: 700; font-size: 0.6875rem; text-transform: uppercase;
          letter-spacing: 0.06em; display: block; margin-bottom: 4px; color: var(--text-muted);
        }

        /* Cadeau */
        .anniv-cadeau-zone { display: flex; flex-direction: column; gap: 10px; }
        .anniv-cadeau-type-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .anniv-cadeau-type-btn {
          flex: 1; padding: 8px 12px; border-radius: var(--radius-full);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }
        .anniv-cadeau-type-btn.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
        .anniv-remise-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
        .anniv-pct-btn {
          padding: 7px 14px; border-radius: var(--radius-full);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; transition: all 0.15s;
        }
        .anniv-pct-btn.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
        .anniv-pct-input { width: 80px !important; }
        .anniv-cadeau-hint {
          font-size: 0.75rem; color: var(--text-muted);
          padding: 8px 10px; background: var(--cream, #faf8f5);
          border-radius: var(--radius-sm); line-height: 1.5;
        }

        @media (max-width: 480px) {
          .anniv-modes { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
