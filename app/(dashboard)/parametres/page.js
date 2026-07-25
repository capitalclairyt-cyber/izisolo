'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Save, Palette, User, Building2, Bell, MapPin,
  Plus, X, Trash2, Flower2, Crown, Mail, Home,
  Eye, Zap, Gift, ToggleLeft, ToggleRight, Cake,
  CreditCard, Copy, Check, ExternalLink, AlertCircle, Loader2,
  Pencil, Image as ImageIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';
import { METIERS, PLANS, SMS_ENABLED, SMS_PRIX_UNITAIRE } from '@/lib/constantes';
import { getTrialStatus, effectivePlan as effectivePlanFromTrial } from '@/lib/trial';
import { slugify } from '@/lib/utils';
import { getReglesAnnulation } from '@/lib/regles-metier';
// import BackgroundDecor — retiré, plus utilisé (apparences supprimées)

// Normalise une URL utilisateur :
//   - vide / null / espaces → null (pour respecter la CHECK constraint NULL OK)
//   - sans protocole "https://" ou "http://" → on préfixe avec "https://"
// Évite l'erreur DB : profiles_website_url_format / instagram / facebook
function normalizeUrl(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return 'https://' + trimmed;
}
// Sous-onglets par onglet principal (le 1er = section essentielle, par défaut).
const SUBTABS = {
  profil: [
    { id: 'profil', label: 'Profil' },
    { id: 'activite', label: 'Activité' },
    { id: 'lieux', label: 'Lieux' },
    { id: 'champs', label: 'Champs élèves' },
  ],
  portail: [
    { id: 'page', label: 'Ma page' },
    { id: 'visibilite', label: 'Visibilité' },
    { id: 'essai', label: "Cours d'essai" },
    { id: 'paiement', label: 'Paiement' },
  ],
  notifications: [
    { id: 'notifs', label: 'Mes notifs' },
    { id: 'seuils', label: 'Seuils' },
    { id: 'anniv', label: 'Anniversaires' },
    { id: 'eleves', label: 'Notifs élèves' },
  ],
  regles: [
    { id: 'annulation', label: 'Annulation' },
    { id: 'metier', label: 'Règles métier' },
  ],
};

function SubTabsBar({ items, active, onChange }) {
  return (
    <div className="subtabs-bar param-subtabs">
      {items.map(it => (
        <button
          key={it.id}
          type="button"
          className={`subtab-btn ${active === it.id ? 'active' : ''}`}
          onClick={() => onChange(it.id)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

// ReglesTab (constructeur SI/ALORS avancé) retiré de l'UI le 2026-05-05.
// Le composant reste sur disque (./ReglesTab) pour réintégration future.
import ReglesMetierTab from './ReglesMetierTab';
import PhotoUploader from '@/components/ui/PhotoUploader';
import CoverPhotoEditor from '@/components/ui/CoverPhotoEditor';
import UnsavedChangesGuard from '@/components/ui/UnsavedChangesGuard';
import PushToggle from '@/components/push/PushToggle';
import NotifPrefsPanel from '@/components/push/NotifPrefsPanel';
import ChampsElevesSection from './sections/ChampsElevesSection';
import HorairesStudioEditor from './sections/HorairesStudioEditor';
import NotifsElevesSection from './sections/NotifsElevesSection';
import AbonnementCheckout from './sections/AbonnementCheckout';
import ReglesAnnulationSection from './sections/ReglesAnnulationSection';
import PagePubliqueSection from './sections/PagePubliqueSection';
import StripePaiementSection from './sections/StripePaiementSection';
import VisibiliteSection from './sections/VisibiliteSection';
import CoursEssaiSection from './sections/CoursEssaiSection';

const PALETTES = [
  { id: 'rose', label: 'Rose', color: '#d4a0a0' },
  { id: 'ocean', label: 'Océan', color: '#7aa0c4' },
  { id: 'foret', label: 'Forêt', color: '#7ab07a' },
  { id: 'soleil', label: 'Soleil', color: '#d4b06a' },
  { id: 'lavande', label: 'Lavande', color: '#a890c4' },
  { id: 'terre', label: 'Terre', color: '#c4956a' },
];

const TABS = [
  { id: 'profil',        label: 'Profil & studio', icon: User },
  { id: 'portail',       label: 'Portail public',  icon: Eye },
  { id: 'notifications', label: 'Notifications',   icon: Bell },
  { id: 'regles',        label: 'Règles',          icon: Zap },
  { id: 'abonnement',    label: 'Abonnement IziSolo', icon: Crown },
];

const ANNIV_MODES = [
  { id: 'off',    label: 'Désactivé',  desc: 'Aucune alerte anniversaire' },
  { id: 'manuel', label: 'Manuel',     desc: 'Notification uniquement, tu envoies toi-même' },
  { id: 'semi',   label: 'Semi-auto',  desc: 'Notification + confirmation avant envoi' },
  { id: 'auto',   label: 'Automatique',desc: 'Envoi automatique sans confirmation' },
];







export default function Parametres() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  // ── Détection retour Stripe Checkout (?abo=success ou ?abo=cancel) ────
  // Affiche un toast adapté + nettoie l'URL pour ne pas re-déclencher
  // si le user refresh la page.
  useEffect(() => {
    const abo = searchParams.get('abo');
    if (abo === 'success') {
      toast.success('🎉 Abonnement activé ! Bienvenue dans IziSolo Pro.');
      router.replace('/parametres?tab=abonnement', { scroll: false });
    } else if (abo === 'cancel') {
      toast.info('Souscription annulée. Tu peux relancer quand tu veux.');
      router.replace('/parametres?tab=abonnement', { scroll: false });
    }
  }, []);

  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [profile, setProfile] = useState(null);
  const [lieux, setLieux] = useState([]);
  // Modal d'édition d'un lieu :
  //   null            → modal fermée
  //   { id: null, ...} → mode "création"
  //   { id: 'uuid', ...} → mode "édition"
  const [lieuEdit, setLieuEdit] = useState(null);
  const [lieuSaving, setLieuSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profil');
  // Sous-onglets par onglet — le 1er (essentiel) est affiché par défaut.
  const [subTab, setSubTab] = useState({ profil: 'profil', portail: 'page', notifications: 'notifs', regles: 'annulation' });
  const setSub = (tab, id) => setSubTab(s => ({ ...s, [tab]: id }));
  const tabsRef = useRef(null);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [canScrollLeft, setCanScrollLeft]   = useState(false);
  // Les 4 anciens toggles « Notifications générales » (notif_nouveau_client…)
  // ont disparu avec v61 : la cloche se règle dans « Mes notifications »
  // (notif_prefs, canal inapp). Tuyauterie morte purgée en B2b — les colonnes
  // DB restent, vestigiales (0 lecteur, 0 writer).
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

      // Anniversaires
      setAnnivMode(prof?.anniversaire_mode || 'semi');
      setAnnivMessage(prof?.anniversaire_message || 'Joyeux anniversaire {prenom} ! 🎂 En ce jour spécial, toute l\'équipe du studio te souhaite une magnifique journée. À très bientôt sur le tapis !');
      setAnnivCadeauActif(prof?.anniversaire_cadeau_actif || false);
      setAnnivCadeauOffreId(prof?.anniversaire_cadeau_offre_id || '');
      setAnnivCadeauType(prof?.anniversaire_cadeau_type || 'gratuit');
      setAnnivCadeauRemisePct(prof?.anniversaire_cadeau_remise_pct || 20);

      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const check = () => {
      setCanScrollRight(el.scrollWidth - el.scrollLeft - el.clientWidth > 2);
      setCanScrollLeft(el.scrollLeft > 2);
    };
    check();
    el.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => { el.removeEventListener('scroll', check); window.removeEventListener('resize', check); };
  }, [loading]);

  // Auto-scroll vers l'onglet actif (mount + clic) — sur mobile c'est crucial
  // sinon on ne voit pas qu'on est sur un onglet hors viewport.
  useEffect(() => {
    const el = tabsRef.current;
    if (!el || loading) return;
    const activeBtn = el.querySelector('.tab-btn.active');
    if (!activeBtn) return;
    // Center the active tab in the scrollable container
    const btnRect = activeBtn.getBoundingClientRect();
    const elRect  = el.getBoundingClientRect();
    const offset  = btnRect.left - elRect.left - (elRect.width / 2) + (btnRect.width / 2);
    el.scrollBy({ left: offset, behavior: 'smooth' });
  }, [activeTab, loading]);

  const scrollTabs = (dir) => {
    const el = tabsRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(180, el.clientWidth * 0.6), behavior: 'smooth' });
  };

  const handleChange = (field) => (e) => {
    setProfile(prev => ({ ...prev, [field]: e.target.value }));
    setDirty(true);
  };

  // Garde des modifs non enregistrées : géré désormais par <UnsavedChangesGuard />
  // (popstate retour navigateur + beforeunload tab close + modal pretty)

  // Re-charger les données serveur (= annuler les modifs locales)
  const handleDiscard = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (prof) {
      setProfile(prof);
      // Reset les états anniv qui ne sont pas dans `profile`
      setAnnivMode(prof.anniversaire_mode || 'semi');
      setAnnivMessage(prof.anniversaire_message || '');
      setAnnivCadeauActif(prof.anniversaire_cadeau_actif || false);
      setAnnivCadeauOffreId(prof.anniversaire_cadeau_offre_id || '');
      setAnnivCadeauType(prof.anniversaire_cadeau_type || 'gratuit');
      setAnnivCadeauRemisePct(prof.anniversaire_cadeau_remise_pct || 20);
    }
    setDirty(false);
    toast.success('Modifications annulées');
  };

  // --- Lieux ---
  // Ouvre la modal en mode "création" (ou "édition" si on passe un lieu existant)
  const openLieuModal = (lieu = null) => {
    setLieuEdit(lieu ? { ...lieu } : { id: null, nom: '', adresse: '', ville: '', notes: '' });
  };

  // Ferme la modal sans sauvegarder
  const closeLieuModal = () => {
    if (lieuSaving) return;
    setLieuEdit(null);
  };

  // Sauvegarde le lieu (insert si id null, update sinon)
  const saveLieu = async () => {
    if (!lieuEdit?.nom?.trim()) {
      toast.error('Le nom du lieu est obligatoire');
      return;
    }
    setLieuSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      nom: lieuEdit.nom.trim(),
      adresse: lieuEdit.adresse?.trim() || null,
      ville: lieuEdit.ville?.trim() || null,
      notes: lieuEdit.notes?.trim() || null,
    };

    if (lieuEdit.id) {
      // Update existant
      const { error } = await supabase.from('lieux').update(payload).eq('id', lieuEdit.id);
      if (error) {
        toast.error('Erreur : ' + error.message);
        setLieuSaving(false);
        return;
      }
      setLieux(prev => prev.map(l => l.id === lieuEdit.id ? { ...l, ...payload } : l));
      toast.success('Lieu modifié');
    } else {
      // Création
      const { data, error } = await supabase.from('lieux').insert({
        ...payload,
        profile_id: user.id,
        ordre: lieux.length,
      }).select().single();
      if (error || !data) {
        toast.error('Erreur : ' + (error?.message || 'lieu non créé'));
        setLieuSaving(false);
        return;
      }
      setLieux(prev => [...prev, data]);
      toast.success('Lieu ajouté');
    }
    setLieuSaving(false);
    setLieuEdit(null);
  };

  const removeLieu = async (id) => {
    const lieu = lieux.find(l => l.id === id);
    const nom = lieu?.nom?.trim() || 'ce lieu';
    if (!confirm(`Supprimer "${nom}" ? Les cours déjà associés à ce lieu garderont leur référence textuelle, mais tu ne pourras plus le sélectionner.`)) {
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from('lieux').delete().eq('id', id);
    if (error) {
      toast.error('Erreur : ' + error.message);
      return;
    }
    setLieux(prev => prev.filter(l => l.id !== id));
    toast.success('Lieu supprimé');
  };

  // --- Save profile ---
  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();

    // === Auto-magie : si la prof a renseigné un studio_nom mais qu'aucun slug
    // n'existe encore, on en génère un automatiquement + on active le portail public.
    // Objectif : que l'inscription / configuration soit "zéro friction" pour des
    // utilisatrices non-tek (profs de yoga, pilates, etc.). Pas besoin qu'elles
    // comprennent ce qu'est un slug ni d'aller cocher "activer ma page publique".
    let computedSlug = profile.studio_slug || null;
    let computedPortailActif = profile.portail_actif === true;

    if (profile.studio_nom && !computedSlug) {
      const baseSlug = slugify(profile.studio_nom) || 'studio';
      // Vérifier l'unicité — si déjà pris par un autre studio, on suffixe -2, -3, ...
      let candidate = baseSlug;
      let suffix = 1;
      // Limite de sécurité (ne devrait jamais arriver en pratique)
      while (suffix < 50) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('studio_slug', candidate)
          .neq('id', profile.id)
          .maybeSingle();
        if (!existing) break;
        suffix += 1;
        candidate = `${baseSlug}-${suffix}`;
      }
      computedSlug = candidate;
    }

    // Si on a un slug (qu'on vient de générer OU qui existait déjà), on s'assure
    // que le portail public est actif — sinon la page /p/{slug} renvoie 404 à cause
    // de la RLS publique (v25) qui filtre sur portail_actif = true.
    if (computedSlug && !computedPortailActif) {
      computedPortailActif = true;
    }

    const { error } = await supabase.from('profiles').update({
      prenom: profile.prenom,
      nom: profile.nom,
      // email_contact = email de contact public (différent de auth.users.email
      // qui est l'email de connexion, géré par Supabase Auth). Rempli auto au
      // signup par le trigger handle_new_user, modifiable ici.
      email_contact: profile.email_contact || null,
      studio_nom: profile.studio_nom,
      studio_slug: computedSlug,
      portail_actif: computedPortailActif,
      adresse: profile.adresse,
      ville: profile.ville,
      telephone: profile.telephone,
      metier: profile.metier,
      lieu_principal: profile.lieu_principal || null,
      // ui_couleur / ui_illustration / ui_grille_active / ui_animation_active
      // ne sont plus modifiables via l'app (palette imposée brand IziSolo).
      alerte_seances_seuil: parseInt(profile.alerte_seances_seuil) || 2,
      alerte_expiration_jours: parseInt(profile.alerte_expiration_jours) || 7,
      anniversaire_mode:            annivMode,
      anniversaire_message:         annivMessage,
      anniversaire_cadeau_actif:    annivCadeauActif,
      anniversaire_cadeau_offre_id: annivCadeauOffreId || null,
      anniversaire_cadeau_type:     annivCadeauType,
      anniversaire_cadeau_remise_pct: parseInt(annivCadeauRemisePct) || 20,
      stripe_webhook_secret:   profile.stripe_webhook_secret || null,
      // Règles d'annulation (v5 + v15)
      regles_annulation:       profile.regles_annulation || null,
      // Notifications élèves (v19+v21) — OctoPush Mélutek, toggles + kill-switch + seuil
      notifs_eleves:           profile.notifs_eleves || null,
      sms_seuil_mois:          profile.sms_seuil_mois ? parseInt(profile.sms_seuil_mois) : null,
      // Page publique enrichie (v14)
      photo_url:               profile.photo_url || null,
      photo_couverture:        profile.photo_couverture || null,
      photo_couverture_focal_y: profile.photo_couverture_focal_y != null ? parseInt(profile.photo_couverture_focal_y) : 50,
      bio:                     profile.bio || null,
      philosophie:             profile.philosophie || null,
      formations:              profile.formations || null,
      annees_experience:       profile.annees_experience ? parseInt(profile.annees_experience) : null,
      horaires_studio:         profile.horaires_studio || null,
      horaires_studio_jours:   profile.horaires_studio_jours || null,  // structuré v40
      client_fields_config:    profile.client_fields_config || null,    // v40 — champs élèves configurables
      afficher_tarifs:         profile.afficher_tarifs === true,
      afficher_horaires:       profile.afficher_horaires === true,      // v69 — toggle horaires page publique
      afficher_inscrits:       profile.afficher_inscrits !== false,
      faq_publique:            profile.faq_publique || [],
      // URLs : normaliser pour respecter la contrainte CHECK (must start with http(s)://)
      // Si vide → null, sinon préfixer https:// si absent
      instagram_url:           normalizeUrl(profile.instagram_url),
      facebook_url:            normalizeUrl(profile.facebook_url),
      website_url:             normalizeUrl(profile.website_url),
      // Cours d'essai (v29)
      essai_actif:                profile.essai_actif === true,
      essai_mode:                 profile.essai_mode || 'manuel',
      essai_paiement:             profile.essai_paiement || 'gratuit',
      essai_prix:                 parseFloat(profile.essai_prix) || 0,
      essai_stripe_payment_link:  profile.essai_stripe_payment_link || null,
      essai_message:              profile.essai_message || null,
      // Visibilité par défaut des cours (v30)
      visibilite_default:         profile.visibilite_default || 'public',
    }).eq('id', profile.id);

    if (!error) {
      // Refléter immédiatement le slug + activation auto dans l'état local,
      // pour que l'UI affiche tout de suite l'URL publique sans rechargement manuel.
      setProfile(prev => ({
        ...prev,
        studio_slug: computedSlug,
        portail_actif: computedPortailActif,
      }));
      router.refresh();
      if (computedSlug && computedSlug !== profile.studio_slug) {
        toast.success(`Page publique activée : /p/${computedSlug}`);
      } else {
        toast.success('Paramètres enregistrés !');
      }
      setDirty(false);
    } else {
      toast.error('Erreur : ' + error.message);
    }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Chargement...</div>;

  return (
    <div className="parametres">
      {/* Garde-fou : modal qui s'affiche UNIQUEMENT à la tentative de quitter
          (bouton retour, fermeture onglet, refresh) si dirty=true. La barre
          sticky permanente a été retirée le 2026-05-05 — trop intrusive,
          et chaque section a déjà son propre bouton Enregistrer inline. */}
      <UnsavedChangesGuard dirty={dirty} onConfirmLeave={() => setDirty(false)} />

      <div className="page-header animate-fade-in">
        <h1>Paramètres</h1>
      </div>

      {/* === ONGLETS PRINCIPAUX === */}
      <div className={`tabs-bar-wrap animate-fade-in ${canScrollRight ? 'has-more-right' : ''} ${canScrollLeft ? 'has-more-left' : ''}`}>
        {canScrollLeft && (
          <button
            type="button"
            className="tabs-arrow tabs-arrow-left"
            onClick={() => scrollTabs(-1)}
            aria-label="Onglets précédents"
          >
            ‹
          </button>
        )}
        <div className="tabs-bar" ref={tabsRef}>
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
        {canScrollRight && (
          <button
            type="button"
            className="tabs-arrow tabs-arrow-right"
            onClick={() => scrollTabs(1)}
            aria-label="Onglets suivants"
          >
            ›
          </button>
        )}
      </div>

      {/* ============================================ */}
      {/* ONGLET 1 — PROFIL                           */}
      {/* ============================================ */}
      {activeTab === 'profil' && (
        <div className="tab-content animate-fade-in">
          <SubTabsBar items={SUBTABS.profil} active={subTab.profil} onChange={id => setSub('profil', id)} />

          {/* Profil */}
          {subTab.profil === 'profil' && (
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
              <input className="izi-input" type="email" value={profile.email_contact || ''} onChange={handleChange('email_contact')} placeholder="ton@email.com" />
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
          )}

          {/* Studio */}
          {subTab.profil === 'activite' && (
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
          )}

          {/* Lieux */}
          {subTab.profil === 'lieux' && (
          <>
          <div className="section izi-card">
            <div className="section-top"><div className="section-icon"><MapPin size={20} /></div><h2>Mes lieux</h2></div>
            <p className="section-desc">Les salles et espaces où tu donnes tes cours.</p>

            {lieux.length > 0 ? (
              <div className="lieux-list">
                {lieux.map(lieu => (
                  <div key={lieu.id} className="lieu-card">
                    <div className="lieu-card-icon"><MapPin size={18} /></div>
                    <div className="lieu-card-info">
                      <div className="lieu-card-nom">{lieu.nom}</div>
                      {(lieu.adresse || lieu.ville) && (
                        <div className="lieu-card-adresse">
                          {[lieu.adresse, lieu.ville].filter(Boolean).join(' — ')}
                        </div>
                      )}
                      {lieu.notes && <div className="lieu-card-notes">{lieu.notes}</div>}
                    </div>
                    <div className="lieu-card-actions">
                      <button
                        className="lieu-action-btn"
                        onClick={() => openLieuModal(lieu)}
                        title="Modifier"
                        aria-label={`Modifier ${lieu.nom}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="lieu-action-btn lieu-action-danger"
                        onClick={() => removeLieu(lieu.id)}
                        title="Supprimer"
                        aria-label={`Supprimer ${lieu.nom}`}
                      >
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

            <button
              className="izi-btn izi-btn-secondary lieu-add-btn"
              onClick={() => openLieuModal(null)}
              type="button"
            >
              <Plus size={18} /> Ajouter un lieu
            </button>
          </div>

          {/* === Modal édition lieu === */}
          {lieuEdit && (
            <div
              className="modal-backdrop"
              onClick={e => { if (e.target === e.currentTarget) closeLieuModal(); }}
            >
              <div className="modal-sheet animate-slide-up" role="dialog" aria-modal="true">
                <div className="modal-header">
                  <span className="modal-title">
                    {lieuEdit.id ? 'Modifier le lieu' : 'Nouveau lieu'}
                  </span>
                  <button className="modal-close" onClick={closeLieuModal} type="button" aria-label="Fermer">
                    <X size={20} />
                  </button>
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
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveLieu();
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Adresse</label>
                    <input
                      className="izi-input"
                      value={lieuEdit.adresse || ''}
                      onChange={e => setLieuEdit(prev => ({ ...prev, adresse: e.target.value }))}
                      placeholder="12 rue des Lilas"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ville</label>
                    <input
                      className="izi-input"
                      value={lieuEdit.ville || ''}
                      onChange={e => setLieuEdit(prev => ({ ...prev, ville: e.target.value }))}
                      placeholder="Lyon"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notes (interne)</label>
                    <textarea
                      className="izi-input"
                      rows={3}
                      value={lieuEdit.notes || ''}
                      onChange={e => setLieuEdit(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Code d'entrée, infos parking, etc. (visible uniquement par toi)"
                    />
                  </div>

                  <div className="modal-footer">
                    <button
                      className="izi-btn izi-btn-secondary"
                      onClick={closeLieuModal}
                      type="button"
                      disabled={lieuSaving}
                    >
                      Annuler
                    </button>
                    <button
                      className="izi-btn izi-btn-primary"
                      onClick={saveLieu}
                      type="button"
                      disabled={lieuSaving || !lieuEdit.nom?.trim()}
                    >
                      {lieuSaving ? <><Loader2 size={16} className="spin" /> Enregistrement…</> : (lieuEdit.id ? 'Enregistrer' : 'Ajouter')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          </>
          )}

          {/* Champs collectés sur les fiches élèves — rattaché à Profil & studio
              (2026-06-01) : c'est la config des données qu'on collecte sur ses
              élèves, naturellement liée à l'identité du studio. */}
          {subTab.profil === 'champs' && (
            <ChampsElevesSection
              profile={profile}
              setProfile={setProfile}
              setDirty={setDirty}
            />
          )}

          {/* Note : la page publique (PagePubliqueSection) a été déplacée vers
              l'onglet "Portail public" (2026-06-01), avec VisibiliteSection,
              CoursEssaiSection et StripePaiementSection. */}

          <button onClick={handleSave} className="izi-btn izi-btn-primary save-btn" disabled={saving}>
            <Save size={18} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      )}

      {/* ============================================ */}
      {/* ONGLET 2 — PORTAIL PUBLIC                   */}
      {/* Regroupe tout ce qui concerne la vitrine     */}
      {/* publique /p/[slug] (2026-06-01).             */}
      {/* ============================================ */}
      {activeTab === 'portail' && (
        <div className="tab-content animate-fade-in">

          <SubTabsBar items={SUBTABS.portail} active={subTab.portail} onChange={id => setSub('portail', id)} />

          {subTab.portail === 'page' && (
            <PagePubliqueSection profile={profile} setProfile={setProfile} setDirty={setDirty} />
          )}
          {subTab.portail === 'visibilite' && (
            <VisibiliteSection profile={profile} setProfile={setProfile} setDirty={setDirty} />
          )}
          {subTab.portail === 'essai' && (
            <CoursEssaiSection profile={profile} setProfile={setProfile} setDirty={setDirty} />
          )}
          {subTab.portail === 'paiement' && (
            <StripePaiementSection profile={profile} setProfile={setProfile} setDirty={setDirty} />
          )}

          <button onClick={handleSave} className="izi-btn izi-btn-primary save-btn" disabled={saving}>
            <Save size={18} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      )}

      {/* ============================================ */}
      {/* ONGLET — NOTIFICATIONS & ANNIVERSAIRES      */}
      {/* ============================================ */}
      {activeTab === 'notifications' && (
        <div className="tab-content animate-fade-in">
          <SubTabsBar items={SUBTABS.notifications} active={subTab.notifications} onChange={id => setSub('notifications', id)} />

          {/* Mes notifications — ce que LA PROF veut recevoir (push navigateur +
              choix par type). Distinct des "Notifications élèves auto" plus bas
              (= ce que l'app envoie AUX élèves). Sauvegarde immédiate au toggle. */}
          {subTab.notifications === 'notifs' && (
          <div className="section izi-card">
            <div className="section-top">
              <div className="section-icon"><Bell size={20} /></div>
              <h2>Mes notifications</h2>
            </div>
            <p className="section-desc">
              Reçois une notification (et un email) quand il se passe quelque chose
              dans ton studio. Active-les d'abord sur cet appareil, puis choisis ce
              que tu veux recevoir.
            </p>
            <div style={{ marginBottom: 14 }}>
              <PushToggle />
            </div>
            <NotifPrefsPanel
              audience="prof"
              initialPrefs={profile?.notif_prefs || {}}
              onSave={async (next) => {
                const res = await fetch('/api/profile', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ notif_prefs: next }),
                });
                if (!res.ok) throw new Error('save failed');
                setProfile(prev => ({ ...prev, notif_prefs: next }));
              }}
            />
          </div>
          )}

          {/* Seuils d'alerte — pilotent à la fois (1) les alertes affichées
              sur le dashboard prof et (2) les notifications auto envoyées
              aux élèves (cf. section "Notifications élèves auto" ci-dessous
              pour activer les canaux email/SMS).
              Déplacé ici depuis l'onglet Réglages (2026-06-01). */}
          {subTab.notifications === 'seuils' && (
          <>
          <div className="section izi-card">
            <div className="section-top">
              <div className="section-icon"><Bell size={20} /></div>
              <h2>Seuils d'alerte</h2>
            </div>
            <p className="section-desc">
              Ces seuils déterminent quand l'app considère qu'une situation mérite ton
              attention. Ils servent à <strong>(1)</strong> afficher des alertes sur
              ton tableau de bord, et <strong>(2)</strong> déclencher les
              notifications automatiques envoyées à tes élèves (si activées
              ci-dessous dans <em>Notifications élèves auto</em>).
            </p>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Carnet bientôt épuisé</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    className="izi-input"
                    type="number"
                    min="1"
                    max="20"
                    style={{ maxWidth: 100 }}
                    value={profile.alerte_seances_seuil || 2}
                    onChange={handleChange('alerte_seances_seuil')}
                  />
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>séances ou moins</span>
                </div>
                <p className="form-hint">
                  Ex. <strong>2</strong> → quand un élève n'a plus que 2 séances dans son
                  carnet, tu vois une alerte « Caroline a 2 séances restantes » + (si activé)
                  l'élève reçoit un email type « Plus que 2 séances dans ton carnet ».
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Abonnement bientôt expiré</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    className="izi-input"
                    type="number"
                    min="1"
                    max="60"
                    style={{ maxWidth: 100 }}
                    value={profile.alerte_expiration_jours || 7}
                    onChange={handleChange('alerte_expiration_jours')}
                  />
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>jours avant la date de fin</span>
                </div>
                <p className="form-hint">
                  Ex. <strong>7</strong> → 7 jours avant l'expiration d'un abonnement, tu vois
                  une alerte sur le dashboard + (si activé) l'élève reçoit un rappel pour
                  penser à renouveler.
                </p>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Paiement en attente</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  className="izi-input"
                  type="number"
                  min="1"
                  max="90"
                  style={{ maxWidth: 100 }}
                  value={profile.alerte_paiement_attente_jours || 14}
                  onChange={handleChange('alerte_paiement_attente_jours')}
                />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>jours après émission</span>
              </div>
              <p className="form-hint">
                Ex. <strong>14</strong> → quand un paiement (chèque, virement, espèces) reste
                marqué « en attente » depuis 14 jours, alerte sur ton dashboard pour relancer
                l'élève. Pas de notif auto envoyée à l'élève sur ce point — c'est à toi de
                décider du ton (gentil rappel ou plus ferme).
              </p>
            </div>
          </div>
          <button onClick={handleSave} className="izi-btn izi-btn-primary save-btn" disabled={saving}>
            <Save size={18} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          </>
          )}

          {subTab.notifications === 'eleves' && (
          <>
            <NotifsElevesSection
              profile={profile}
              setProfile={setProfile}
              setDirty={setDirty}
            />
            <button onClick={handleSave} className="izi-btn izi-btn-primary save-btn" disabled={saving}>
              <Save size={18} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </>
          )}

          {/* Anniversaires : messages auto ENVOYÉS aux élèves — feature à part
              (≠ « Mes notifications » ci-dessus = ce que la prof reçoit). */}
          {subTab.notifications === 'anniv' && (
          <>


          {/* ══════════ ANNIVERSAIRES (toujours visible) ══════════ */}
          {true && (
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
                    Utilise <code>{'{prenom}'}</code> pour personnaliser avec le prénom de l'élève.
                  </p>
                  <textarea
                    className="izi-input anniv-textarea"
                    value={annivMessage}
                    onChange={e => setAnnivMessage(e.target.value)}
                    rows={4}
                    placeholder="Joyeux anniversaire {prenom} ! 🎂"
                  />
                  <div className="anniv-preview">
                    <span className="anniv-preview-label">Aperçu :</span>
                    {annivMessage
                      .replace(/\{\{\s*prenom\s*\}\}/g, 'Sophie')
                      .replace(/\{\s*prenom\s*\}/g, 'Sophie')
                      .replace(/\{\{\s*nom\s*\}\}/g, 'Martin')
                      .replace(/\{\s*nom\s*\}/g, 'Martin')}
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
          </>
          )}

        </div>
      )}

      {/* ============================================ */}
      {/* ONGLET 3 — RÈGLES (Cas particuliers)         */}
      {/* L'ancien ReglesTab (constructeur SI/ALORS)   */}
      {/* a été retiré le 2026-05-05 (pas encore mûr   */}
      {/* — on le réintègrera plus tard).              */}
      {/* ============================================ */}
      {activeTab === 'regles' && (
        <div className="tab-content animate-fade-in">
          <SubTabsBar items={SUBTABS.regles} active={subTab.regles} onChange={id => setSub('regles', id)} />

          {subTab.regles === 'annulation' && (
            <>
              <ReglesAnnulationSection
                profile={profile}
                setProfile={setProfile}
                setDirty={setDirty}
              />
              <button onClick={handleSave} className="izi-btn izi-btn-primary save-btn" disabled={saving}>
                <Save size={18} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </>
          )}

          {subTab.regles === 'metier' && (
            <ReglesMetierTab profileId={profile.id} />
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* ONGLET 4 — ABONNEMENT                       */}
      {/* ============================================ */}
      {activeTab === 'abonnement' && (
        <div className="tab-content animate-fade-in">

          {/* Plan actuel — dynamique selon le plan EFFECTIF (incluant trial) */}
          {(() => {
            const trial = getTrialStatus(profile);
            const realPlanKey = profile?.plan || 'solo';
            const currentPlanKey = effectivePlanFromTrial(profile);
            const currentPlan = PLANS[currentPlanKey] || PLANS.solo;
            const isFree = currentPlanKey === 'free';
            const isPremium = currentPlanKey === 'premium';
            const isTrialActive = trial.active;
            // Liste des features à afficher avec leur statut selon le plan
            // (label visible + clé dans l'objet PLANS pour vérif inclusion)
            const featuresList = [
              {
                label: currentPlan.limiteClients == null
                  ? 'Élèves illimités'
                  : `Jusqu'à ${currentPlan.limiteClients} élèves`,
                included: true,
              },
              {
                label: currentPlan.limiteLieux == null
                  ? 'Lieux illimités'
                  : currentPlan.limiteLieux === 1 ? '1 lieu' : `Jusqu'à ${currentPlan.limiteLieux} lieux`,
                included: true,
              },
              { label: 'Cours, agenda, pointage présences', included: true },
              { label: 'Carnets / abonnements / paiements manuels', included: true },
              { label: 'Stripe Payment Link (encaissement en ligne)', included: currentPlan.stripePaymentLink },
              { label: 'Mailing campagnes par email', included: currentPlan.mailing },
              { label: 'Notifications auto élèves (rappels, expirations)', included: currentPlan.notifsElevesAuto },
              { label: 'Sondages planning + cours d\'essai', included: currentPlan.sondages },
              { label: 'Page publique enrichie (bio, FAQ, philosophie)', included: currentPlan.portailEnrichi },
              { label: 'Annulation par l\'élève + dette tardive', included: currentPlan.annulationParEleve },
              { label: 'Export comptabilité', included: currentPlan.exportCompta },
              { label: 'Vidéos de cours vendables à l\'unité ou en abonnement (Studio)', included: currentPlan.videos === true },
              { label: 'Logo studio dans emails / white-label (Studio)', included: currentPlan.brandingEmail },
            ];
            return (
              <div className="section izi-card">
                <div className="section-top">
                  <div className="section-icon abo-icon"><Crown size={20} /></div>
                  <h2>Mon abonnement IziSolo</h2>
                </div>

                <div className="abo-current">
                  <div className="abo-badge">{currentPlan.nom}</div>
                  <p className="abo-status">
                    {isTrialActive ? (
                      <>
                        Tu profites d'un essai <strong>Pro</strong> — il te reste{' '}
                        <strong>{trial.daysLeft} {trial.daysLeft > 1 ? 'jours' : 'jour'}</strong>.
                        Choisis ton abonnement ci-dessous quand tu es prêt·e.
                      </>
                    ) : isFree ? (
                      <>Tu utilises actuellement le plan <strong>{currentPlan.nom}</strong> (compte interne — full access).</>
                    ) : trial.expired ? (
                      <>
                        Ton essai est terminé. Choisis ton plan ci-dessous pour continuer
                        à utiliser IziSolo.
                      </>
                    ) : (
                      <>
                        Tu utilises actuellement le plan <strong>{currentPlan.nom}</strong>
                        {currentPlan.prix > 0 && ` à ${currentPlan.prix} €/mois TTC`}.
                      </>
                    )}
                  </p>
                </div>

                <div className="abo-features">
                  {featuresList.map((f, i) => (
                    <div key={i} className={`abo-feature ${f.included ? 'included' : 'locked'}`}>
                      <span className={f.included ? 'abo-check' : 'abo-lock'}>
                        {f.included ? '✓' : '🔒'}
                      </span>
                      <span>{f.label}</span>
                    </div>
                  ))}
                </div>

                {!isPremium && !isFree && (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 12 }}>
                    Tu peux upgrader ton plan ci-dessous pour débloquer plus de fonctionnalités.
                  </p>
                )}
              </div>
            );
          })()}

          {/* Plans */}
          <AbonnementCheckout currentPlan={profile?.plan || 'solo'} profile={profile} />

          <div className="section izi-card" style={{ background: 'var(--bg-soft, #faf8f5)', border: '1px dashed var(--border)' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              <strong>Frais de fonctionnement IziSolo</strong> : 1 % du volume payé en ligne via Stripe — ajoutés à ta facture mensuelle, jamais prélevés sur tes paiements. Tu encaisses sur ton propre compte Stripe, IziSolo ne touche jamais l'argent de tes élèves.
            </p>
          </div>

        </div>
      )}

      <style jsx global>{`
        .parametres { display: flex; flex-direction: column; gap: 0; padding-bottom: 40px; }
        .page-header { margin-bottom: 12px; }
        .page-header h1 { font-size: 1.375rem; font-weight: 700; }

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

        /* subtabs-bar / subtab-btn → globals.css */

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

        /* Barre de sous-onglets */
        .param-subtabs { margin-bottom: 12px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-label { font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); }

        /* Types de cours */
        .chips-list { display: flex; flex-wrap: wrap; gap: 6px; }
        .chip-editable { display: flex; align-items: center; gap: 4px; padding: 6px 10px; background: var(--brand-light); color: var(--brand-700); border-radius: var(--radius-full); font-size: 0.8125rem; font-weight: 500; }
        .chip-remove { background: none; border: none; cursor: pointer; color: var(--brand-600); padding: 0; display: flex; align-items: center; opacity: 0.6; }
        .chip-remove:hover { opacity: 1; }

        /* Lieux */
        .lieux-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 4px; }
        .lieu-card {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 12px 14px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
        }
        .lieu-card:hover {
          border-color: var(--brand-300, #d4b8a0);
          box-shadow: 0 1px 4px rgba(70, 35, 25, 0.06);
        }
        .lieu-card-icon {
          flex-shrink: 0;
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          background: var(--brand-light);
          color: var(--brand-700);
          border-radius: var(--radius-sm);
        }
        .lieu-card-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .lieu-card-nom { font-weight: 600; font-size: 0.9375rem; color: var(--text-primary); line-height: 1.3; }
        .lieu-card-adresse { font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.4; }
        .lieu-card-notes {
          font-size: 0.75rem; color: var(--text-muted);
          font-style: italic; margin-top: 2px;
          overflow: hidden; text-overflow: ellipsis;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        }
        .lieu-card-actions { display: flex; gap: 4px; flex-shrink: 0; }
        .lieu-action-btn {
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          background: transparent;
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .lieu-action-btn:hover {
          background: var(--cream);
          color: var(--text-primary);
          border-color: var(--border);
        }
        .lieu-action-danger:hover {
          background: #fef2f2;
          color: var(--danger);
          border-color: #fecaca;
        }
        .lieu-add-btn {
          width: 100%;
          justify-content: center;
          gap: 8px;
        }
        .lieux-empty {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 14px;
          background: var(--cream);
          border: 1px dashed var(--border);
          border-radius: var(--radius-md);
          color: var(--text-muted);
          font-size: 0.8125rem;
          line-height: 1.4;
          margin-bottom: 8px;
        }
        .lieux-empty svg { flex-shrink: 0; margin-top: 2px; opacity: 0.7; }

        /* Modal lieu — réutilise le pattern .modal-* du reste de l'app */
        .modal-backdrop {
          position: fixed; inset: 0;
          background: rgba(0, 0, 0, 0.45);
          z-index: 200;
          display: flex; align-items: flex-end; justify-content: center;
        }
        @media (min-width: 600px) {
          .modal-backdrop { align-items: center; }
        }
        .modal-sheet {
          background: var(--bg-card);
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          width: 100%; max-width: 480px; max-height: 90vh;
          display: flex; flex-direction: column; overflow: hidden;
        }
        @media (min-width: 600px) {
          .modal-sheet { border-radius: var(--radius-lg); }
        }
        .modal-header {
          display: flex; align-items: center; gap: 8px;
          padding: 16px 16px 12px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .modal-title { flex: 1; font-weight: 700; font-size: 1rem; color: var(--text-primary); }
        .modal-close {
          background: none; border: none;
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: var(--radius-sm);
        }
        .modal-close:hover { background: var(--cream-dark); }
        .modal-body {
          padding: 16px;
          overflow-y: auto;
          display: flex; flex-direction: column; gap: 14px;
        }
        .modal-footer {
          display: flex; gap: 8px; justify-content: flex-end;
          padding-top: 8px;
          margin-top: 4px;
          border-top: 1px solid var(--border);
        }
        .modal-footer .izi-btn { min-width: 110px; justify-content: center; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

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
        .plans-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
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
        /* Studio "bientôt" : carte grisée, bouton désactivé */
        .plan-card.plan-card-disabled {
          opacity: 0.6;
          background: var(--bg-soft, #F8F4ED);
          border-color: var(--border);
        }
        .plan-card.plan-card-disabled .plan-cta {
          background: var(--text-muted) !important;
          color: white;
          cursor: not-allowed;
          opacity: 0.7;
        }
        .plan-badge {
          position: absolute; top: -10px; right: 12px;
          padding: 2px 10px; border-radius: var(--radius-full);
          background: var(--brand); color: white;
          font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .plan-badge.plan-badge-soon {
          background: var(--text-muted);
          color: white;
        }
        .plan-tagline {
          font-size: 0.75rem; color: var(--brand-700);
          text-transform: uppercase; letter-spacing: 0.04em;
          font-weight: 600;
        }
        .plan-card.plan-card-disabled .plan-tagline { color: var(--text-muted); }
        .plan-name { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); }
        .plan-price { display: flex; align-items: baseline; gap: 2px; }
        .plan-amount {
          font-family: var(--font-fraunces), Georgia, serif;
          font-variation-settings: 'opsz' 144;
          font-size: 2rem; font-weight: 600; color: var(--text-primary);
        }
        .plan-period { font-size: 0.8125rem; color: var(--text-muted); }
        .plan-desc { font-size: 0.8125rem; color: var(--text-muted); margin: 0; }
        .plan-features { list-style: none; padding: 0; margin: 8px 0; display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .plan-features li { display: flex; gap: 6px; align-items: flex-start; font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.4; }
        .plan-limits {
          font-size: 0.75rem; color: var(--text-muted);
          font-style: italic; margin: 4px 0 0;
        }
        .plan-bonus {
          font-size: 0.75rem; color: var(--brand-700);
          background: var(--brand-50); padding: 8px 10px;
          border-radius: var(--radius-sm); margin: 4px 0 0;
          line-height: 1.4;
        }
        .plan-cta { margin-top: 8px; width: 100%; justify-content: center; }

        @media (max-width: 768px) {
          .plans-grid-3 { grid-template-columns: 1fr; }
        }
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

        /* Anniversaires */
        .notif-anniv { display: flex; flex-direction: column; gap: 10px; }
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
