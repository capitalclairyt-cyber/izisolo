'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Save, User, Building2, Bell, MapPin,
  Plus, X, Trash2, Crown, Mail, Home,
  Eye, Zap, ToggleLeft, ToggleRight, Cake,
  Loader2, Pencil, FileText, Landmark,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';
import { METIERS, PLANS } from '@/lib/constantes';
import { getTrialStatus, effectivePlan as effectivePlanFromTrial } from '@/lib/trial';
import { can } from '@/lib/plan-guard';
import { genererSlugStudioUnique } from '@/lib/slug-studio';
import { PAYS, CODES_PAYS, paysDe, validerIdentifiant, mentionSuggeree, aDeclarationAutomatisable } from '@/lib/pays';
import { sanitizeDocs } from '@/lib/docs-inscription';
import { sanitizeEssaiPrixParType } from '@/lib/essai-tarif';
import {
  REGIMES, PERIODICITES, configUrssafAffichee, sanitizeConfigUrssaf,
} from '@/lib/urssaf';
import { sanitizeReglementConfig } from '@/lib/reglement';
import { sanitizeTonsParType, sanitizeVignettesParType } from '@/lib/vignette-cours';
import { useStudioId } from '@/components/studio/StudioProvider';
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
// Notifications réorganisées PAR DESTINATAIRE (B2e) : avant, 4 sous-onglets
// (« Mes notifs / Seuils / Anniversaires / Notifs élèves ») répondaient tous à
// la même question « qui est prévenu, quand ? » — 3 portes plausibles pour un
// même réglage. Désormais 2 : ce que JE reçois / ce que MES ÉLÈVES reçoivent,
// les seuils et anniversaires rangés à côté de la notif qu'ils pilotent.
const SUBTABS = {
  profil: [
    { id: 'profil', label: 'Profil' },
    { id: 'activite', label: 'Activité' },
    { id: 'lieux', label: 'Lieux' },
    { id: 'champs', label: 'Champs élèves' },
  ],
  portail: [
    { id: 'page', label: 'Ma page' },
    { id: 'apparence', label: 'Types de cours' },
    { id: 'visibilite', label: 'Visibilité' },
    { id: 'essai', label: "Cours d'essai" },
    { id: 'paiement', label: 'Paiement en ligne' },
  ],
  notifications: [
    { id: 'notifs', label: 'Ce que je reçois' },
    { id: 'eleves', label: 'Ce que tes élèves reçoivent' },
  ],
  regles: [
    { id: 'annulation', label: 'Annulation' },
    { id: 'metier', label: 'Règles métier' },
  ],
};

// Anciens ids de sous-onglets (deep-links / habitudes) → nouvel emplacement.
const SOUS_TAB_ALIAS = { seuils: 'eleves', anniv: 'eleves' };

// ── Sauvegarde par carte (B2e) ──────────────────────────────────────────────
// Chaque carte = la liste EXACTE des colonnes qu'elle possède. Le bouton
// Enregistrer d'une carte n'écrit QUE ces colonnes (UPDATE partiel) : une
// erreur sur un champ ne bloque que sa carte, et le save d'un onglet ne
// réécrit plus jamais les champs des autres (fini le last-write-wins à 45
// colonnes entre deux appareils ouverts).
const CARTES = {
  profil:        ['prenom', 'nom', 'email_contact', 'telephone', 'adresse'],
  activite:      ['studio_nom', 'ville', 'metier'],
  facturation:   ['facturation_raison_sociale', 'facturation_siret', 'facturation_mention_tva', 'pays'],
  reglement:     ['reglement_config'],
  urssaf:        ['urssaf_config'],
  champs:        ['client_fields_config'],
  page:          ['photo_couverture_focal_y', 'bio', 'philosophie', 'formations', 'annees_experience',
                  'horaires_studio', 'horaires_studio_jours', 'afficher_tarifs', 'afficher_horaires',
                  'faq_publique', 'instagram_url', 'facebook_url', 'website_url'],
  docs:          ['docs_inscription'],
  apparence:     ['tons_par_type', 'vignettes_par_type'],
  visibilite:    ['visibilite_default', 'afficher_inscrits'],
  essai:         ['essai_actif', 'essai_mode', 'essai_paiement', 'essai_prix', 'essai_prix_par_type', 'essai_stripe_payment_link', 'essai_message'],
  paiement:      ['stripe_webhook_secret'],
  seuils_prof:   ['alerte_paiement_attente_jours'],
  seuils:        ['alerte_seances_seuil', 'alerte_expiration_jours'],
  anniv:         ['anniversaire_mode', 'anniversaire_message'],
  notifs_eleves: ['notifs_eleves', 'sms_seuil_mois'],
  annulation:    ['regles_annulation'],
};

// Transformations avant écriture — miroir exact de l'ancien handleSave
// monolithique (comportement constant). Champ absent d'ici = valeur brute.
// Colonnes dont la migration peut ne pas encore être appliquée en prod. Une
// entrée ici = « si PostgREST la refuse, rejoue l'enregistrement sans elle
// plutôt que de tout perdre ». À VIDER une fois la migration passée partout.
const COLONNES_EN_ATTENTE_DE_MIGRATION = new Set(['pays']); // v105

const SERIALIZERS = {
  email_contact:             v => v || null,
  facturation_raison_sociale: v => v || null,
  facturation_siret:         v => (v ? String(v).replace(/\s/g, '') : null),
  facturation_mention_tva:   v => v || null,
  pays:                      v => (['FR', 'BE', 'LU'].includes(v) ? v : 'FR'),
  // La config URSSAF n'est JAMAIS écrite brute : sanitize = taux bornés,
  // régime/périodicité de la liste blanche, défauts du régime si difforme.
  urssaf_config:             v => sanitizeConfigUrssaf(v),
  // v98 — même règle : IBAN validé mod-97 (un IBAN faux est JETÉ), modes de
  // la liste blanche. undefined pré-migration → omis du payload (pattern v92).
  reglement_config:          v => (v === undefined ? undefined : sanitizeReglementConfig(v)),
  alerte_seances_seuil:      v => parseInt(v) || 2,
  alerte_expiration_jours:   v => parseInt(v) || 7,
  alerte_paiement_attente_jours: v => parseInt(v) || 14,
  anniversaire_message:      v => v || null,
  stripe_webhook_secret:     v => v || null,
  regles_annulation:         v => v || null,
  docs_inscription:          v => { const s = sanitizeDocs(v); return s.length ? s : null; },
  // v99 — jamais écrites brutes : tons de la liste blanche, vignettes sur NOS
  // hosts uniquement (une URL étrangère ferait jeter next/image au rendu).
  // undefined pré-migration → omis du payload (même patron que v92 / v98).
  tons_par_type:             v => (v === undefined ? undefined : sanitizeTonsParType(v)),
  vignettes_par_type:        v => (v === undefined ? undefined : sanitizeVignettesParType(v)),
  notifs_eleves:             v => v || null,
  sms_seuil_mois:            v => (v || v === 0 ? parseInt(v) || null : null),
  photo_couverture_focal_y:  v => (v != null ? parseInt(v) : 50),
  bio:                       v => v || null,
  philosophie:               v => v || null,
  formations:                v => v || null,
  annees_experience:         v => (v ? parseInt(v) : null),
  horaires_studio:           v => v || null,
  horaires_studio_jours:     v => v || null,
  client_fields_config:      v => v || null,
  afficher_tarifs:           v => v === true,
  afficher_horaires:         v => v === true,
  afficher_inscrits:         v => v !== false,
  faq_publique:              v => v || [],
  instagram_url:             normalizeUrl,
  facebook_url:              normalizeUrl,
  website_url:               normalizeUrl,
  essai_actif:               v => v === true,
  essai_mode:                v => v || 'manuel',
  essai_paiement:            v => v || 'gratuit',
  essai_prix:                v => parseFloat(v) || 0,
  // v92 — undefined (colonne pas encore migrée, jamais touchée) doit RESTER
  // undefined : supabase-js l'omet du payload, la carte se sauve pré-migration.
  essai_prix_par_type:       v => (v === undefined ? undefined : sanitizeEssaiPrixParType(v)),
  essai_stripe_payment_link: v => v || null,
  essai_message:             v => v || null,
  visibilite_default:        v => v || 'public',
};

// Message d'anniversaire par défaut (le même que le prefill de la messagerie).
const ANNIV_MESSAGE_DEFAUT = 'Joyeux anniversaire {prenom} ! 🎂 En ce jour spécial, toute l\'équipe du studio te souhaite une magnifique journée. À très bientôt sur le tapis !';

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
import UnsavedChangesGuard from '@/components/ui/UnsavedChangesGuard';
import PushToggle from '@/components/push/PushToggle';
import NotifPrefsPanel from '@/components/push/NotifPrefsPanel';
import ChampsElevesSection from './sections/ChampsElevesSection';
import NotifsElevesSection from './sections/NotifsElevesSection';
import AideContextuelle from '@/components/AideContextuelle';
import AbonnementCheckout from './sections/AbonnementCheckout';
import ReglesAnnulationSection from './sections/ReglesAnnulationSection';
import PagePubliqueSection from './sections/PagePubliqueSection';
import DocsInscriptionSection from './sections/DocsInscriptionSection';
import ReglementSection from './sections/ReglementSection';
import StripePaiementSection from './sections/StripePaiementSection';
import VisibiliteSection from './sections/VisibiliteSection';
import CoursEssaiSection from './sections/CoursEssaiSection';
import TypesCoursSection from './sections/TypesCoursSection';
// (PhotoUploader / CoverPhotoEditor / HorairesStudioEditor vivent dans
//  PagePubliqueSection depuis B2d ; PALETTES retirée — palette imposée brand.)

const TABS = [
  { id: 'profil',        label: 'Profil & studio', icon: User },
  { id: 'portail',       label: 'Portail public',  icon: Eye },
  { id: 'notifications', label: 'Notifications',   icon: Bell },
  { id: 'regles',        label: 'Règles',          icon: Zap },
  { id: 'abonnement',    label: 'Abonnement IziSolo', icon: Crown },
];

// Les 4 « modes » anniversaire (off/manuel/semi/auto) ont été réduits à un
// toggle en B2e : dans le code, seul off ≠ non-off comptait — « semi » et
// « auto » promettaient un envoi (semi-)automatique qui n'a JAMAIS existé
// (aucun cron, aucun envoi préparé). Le réel : cloche J-1/J-0 → clic → la
// messagerie préremplit le message → la prof envoie. Promesse = produit.







export default function Parametres() {
  // Le studio affiché (v101) : `user.id` ne suffit plus, une prof peut être
  // invitée dans le studio d'une autre. Résolu une seule fois par le layout.
  const studioId = useStudioId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  // ── Détection retour Stripe Checkout (?abo=success ou ?abo=cancel) ────
  // Affiche un toast adapté + bascule sur l'onglet Abonnement + nettoie l'URL
  // pour ne pas re-déclencher si le user refresh la page.
  useEffect(() => {
    const abo = searchParams.get('abo');
    if (abo === 'success') {
      // Pas « Bienvenue dans IziSolo Pro » : « Pro » est une clé DB, bannie des
      // surfaces prof depuis la grille du 2026-07-27, et le message annonçait le
      // mauvais plan une fois sur deux. Le nom exact arrive avec le webhook, qui
      // peut être en retard de quelques secondes : on reste juste plutôt que
      // d'affirmer un plan qu'on ne connaît pas encore.
      toast.success('🎉 Paiement reçu, merci ! Ton abonnement s\'active dans quelques secondes.');
      setActiveTab('abonnement');
      router.replace('/parametres?tab=abonnement', { scroll: false });
    } else if (abo === 'cancel') {
      toast.info('Souscription annulée. Tu peux relancer quand tu veux.');
      setActiveTab('abonnement');
      router.replace('/parametres?tab=abonnement', { scroll: false });
    }
  }, []);

  // ── Sauvegarde PAR CARTE (B2e) : chaque carte de réglages a son propre
  // bouton Enregistrer et son propre UPDATE partiel. Fini le save monolithique
  // de ~45 champs où une seule colonne en erreur tuait TOUTE la page et où
  // le bouton d'un onglet réécrivait les champs de tous les autres.
  const [savingCarte, setSavingCarte] = useState(null);        // id de la carte en cours de save
  const [dirtyCartes, setDirtyCartes] = useState(() => new Set());
  const dirty = dirtyCartes.size > 0;
  const [profile, setProfile] = useState(null);
  const [lieux, setLieux] = useState([]);
  // Modal d'édition d'un lieu :
  //   null            → modal fermée
  //   { id: null, ...} → mode "création"
  //   { id: 'uuid', ...} → mode "édition"
  const [lieuEdit, setLieuEdit] = useState(null);
  const [lieuSaving, setLieuSaving] = useState(false);
  // ── Deep-links ?tab= & ?s= (B2e) : lus au premier rendu. Bug de naissance :
  // 6 surfaces deep-linkaient (?tab=abonnement — upsells, emails du cron,
  // bannière compte gelé, retour Stripe) et la page ne lisait JAMAIS le
  // paramètre — tout le monde atterrissait sur Profil.
  const [activeTab, setActiveTab] = useState(() => {
    const t = searchParams.get('tab');
    return TABS.some(x => x.id === t) ? t : 'profil';
  });
  // Sous-onglets par onglet — le 1er (essentiel) est affiché par défaut.
  const [subTab, setSubTab] = useState(() => {
    const defaults = { profil: 'profil', portail: 'page', notifications: 'notifs', regles: 'annulation' };
    const t = searchParams.get('tab');
    const brut = searchParams.get('s');
    const s = SOUS_TAB_ALIAS[brut] || brut; // anciens ids (seuils, anniv) → eleves
    if (s && (SUBTABS[t] || []).some(x => x.id === s)) defaults[t] = s;
    return defaults;
  });
  const setSub = (tab, id) => setSubTab(s => ({ ...s, [tab]: id }));
  const tabsRef = useRef(null);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [canScrollLeft, setCanScrollLeft]   = useState(false);
  // Les 4 anciens toggles « Notifications générales » (notif_nouveau_client…)
  // ont disparu avec v61 : la cloche se règle dans « Mes notifications »
  // (notif_prefs, canal inapp). Tuyauterie morte purgée en B2b — les colonnes
  // DB restent, vestigiales (0 lecteur, 0 writer).
  // Anniversaires : les états séparés (mode/message/cadeau) ont été repliés
  // dans `profile` en B2e — ils ne marquaient jamais dirty (modifs perdables
  // sans garde-fou) et la zone « cadeau » était 100 % factice (aucun code ne
  // créait le carnet 0 € promis) → UI réduite au réel : toggle + message.

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();

      const [{ data: prof }, { data: lieuxData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', studioId).single(),
        supabase.from('lieux').select('*').eq('profile_id', studioId).order('ordre'),
      ]);

      // Message anniv : le défaut est injecté à l'affichage (pas en DB) pour
      // que la textarea ne montre jamais du vide — comportement historique.
      setProfile(prof ? { ...prof, anniversaire_message: prof.anniversaire_message || ANNIV_MESSAGE_DEFAUT } : prof);
      setLieux(lieuxData || []);

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

  // Marque une carte comme modifiée (le bouton Enregistrer de cette carte
  // s'allume ; la garde « modifs non enregistrées » s'arme).
  const marquer = useCallback((carte) => {
    setDirtyCartes(prev => (prev.has(carte) ? prev : new Set(prev).add(carte)));
  }, []);

  // field → carte propriétaire (déduit de CARTES, calculé une fois).
  const carteDuChamp = useRef(null);
  if (!carteDuChamp.current) {
    carteDuChamp.current = {};
    for (const [carte, fields] of Object.entries(CARTES)) {
      for (const f of fields) carteDuChamp.current[f] = carte;
    }
  }

  const handleChange = (field) => (e) => {
    setProfile(prev => ({ ...prev, [field]: e.target.value }));
    const carte = carteDuChamp.current[field];
    if (carte) marquer(carte);
  };

  // urssaf_config est un JSONB : on édite une CLÉ à la fois sur l'objet
  // affiché (défauts compris) — jamais un champ à plat. Changer de régime
  // recale les taux proposés, sauf si la prof les a déjà personnalisés.
  const setUrssaf = (cle, valeur) => {
    setProfile(prev => {
      const cur = configUrssafAffichee(prev?.urssaf_config);
      const next = { ...cur, [cle]: valeur };
      if (cle === 'regime' && REGIMES[valeur]) {
        const ancien = REGIMES[cur.regime] || {};
        if (cur.taux_cotisations === ancien.taux) next.taux_cotisations = REGIMES[valeur].taux;
        if (cur.taux_cfp === ancien.taux_cfp)     next.taux_cfp = REGIMES[valeur].taux_cfp;
      }
      return { ...prev, urssaf_config: next };
    });
    marquer('urssaf');
  };

  // Garde des modifs non enregistrées : géré par <UnsavedChangesGuard />
  // (popstate retour navigateur + beforeunload tab close + modal pretty).
  // L'ancien handleDiscard (« annuler les modifs ») était mort depuis le
  // retrait de la barre sticky (2026-05-05) — purgé en B2e.

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
        profile_id: studioId,
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

  // --- Sauvegarde d'UNE carte : UPDATE partiel des seules colonnes listées
  // dans CARTES[carte]. Remplace le save monolithique de ~45 champs (B2e).
  const saveCarte = async (carte) => {
    const fields = CARTES[carte];
    if (!fields || !profile) return;
    setSavingCarte(carte);
    const supabase = createClient();

    const payload = {};
    for (const f of fields) {
      const brut = profile[f];
      payload[f] = SERIALIZERS[f] ? SERIALIZERS[f](brut) : brut;
    }

    // === Auto-magie (carte Activité uniquement) : studio_nom renseigné sans
    // slug → on en génère un via lib/slug-studio (source UNIQUE depuis B1d —
    // l'ancienne boucle locale dupliquait la logique) + on active le portail,
    // sinon /p/{slug} renvoie 404 (RLS v25 filtre sur portail_actif = true).
    // Cantonné à cette carte : avant, sauvegarder N'IMPORTE QUEL onglet
    // re-forçait portail_actif = true.
    let slugGenere = null;
    if (carte === 'activite' && profile.studio_nom && !profile.studio_slug) {
      try {
        slugGenere = await genererSlugStudioUnique(supabase, profile.studio_nom, profile.id);
        payload.studio_slug = slugGenere;
        if (profile.portail_actif !== true) payload.portail_actif = true;
      } catch (e) {
        // Génération impossible (réseau/DB) : on sauve le reste de la carte,
        // le slug se (re)tentera au prochain enregistrement.
        console.warn('[parametres] génération slug impossible :', e?.message);
      }
    }

    let { error } = await supabase.from('profiles').update(payload).eq('id', profile.id);

    // ⚠️ Leçon v95, appliquée à v105 : PostgREST refuse TOUTE la requête quand
    // UNE colonne lui est inconnue. Sans ce rejeu, déployer avant d'appliquer
    // la migration ferait perdre la raison sociale et le numéro d'entreprise
    // en même temps que le pays — la prof croit avoir enregistré, rien n'est
    // écrit. On rejoue donc sans la colonne neuve, et on DIT ce qui manque.
    let colonneNeuveRefusee = null;
    if (error && (error.code === '42703' || error.code === 'PGRST204')) {
      const neuves = Object.keys(payload).filter(k => COLONNES_EN_ATTENTE_DE_MIGRATION.has(k));
      if (neuves.length && neuves.length < Object.keys(payload).length) {
        const sansNeuves = { ...payload };
        for (const k of neuves) delete sansNeuves[k];
        const rejeu = await supabase.from('profiles').update(sansNeuves).eq('id', profile.id);
        if (!rejeu.error) {
          error = null;
          colonneNeuveRefusee = neuves;
        }
      }
    }

    if (!error && colonneNeuveRefusee) {
      toast.success('Enregistré — sauf le pays, qui attend une mise à jour de la base.');
      console.warn('[parametres] colonnes en attente de migration :', colonneNeuveRefusee.join(', '));
      setDirtyCartes(prev => {
        const next = new Set(prev);
        next.delete(carte);
        return next;
      });
      router.refresh();
    } else if (!error) {
      if (slugGenere) {
        // Refléter le slug + l'activation dans l'état local sans rechargement.
        setProfile(prev => ({ ...prev, studio_slug: slugGenere, portail_actif: true }));
        toast.success(`Page publique activée : /p/${slugGenere}`);
      } else {
        toast.success('Enregistré !');
      }
      setDirtyCartes(prev => {
        const next = new Set(prev);
        next.delete(carte);
        return next;
      });
      router.refresh();
    } else if (error.code === '42703' || error.code === 'PGRST204') {
      // Colonne absente = migration pas encore appliquée. Message honnête
      // plutôt qu'un « Erreur : column ... does not exist » illisible.
      // PGRST204 = le cache de schéma PostgREST, qui ne renvoie PAS 42703 :
      // sans lui, la carte affichait l'erreur brute (leçon v95, §12).
      toast.error('Ce réglage attend une mise à jour de la base. Préviens-nous, on s\'en occupe.');
      console.warn('[parametres] colonne manquante sur la carte', carte, ':', error.message);
    } else {
      toast.error('Erreur : ' + error.message);
    }
    setSavingCarte(null);
  };

  // Bouton Enregistrer d'une carte — grisé tant que rien n'a changé dedans.
  const BtnSauver = ({ carte }) => (
    <button
      onClick={() => saveCarte(carte)}
      className="izi-btn izi-btn-primary save-btn"
      disabled={savingCarte === carte || !dirtyCartes.has(carte)}
    >
      <Save size={18} /> {savingCarte === carte ? 'Enregistrement...' : 'Enregistrer'}
    </button>
  );

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Chargement...</div>;

  return (
    <div className="parametres">
      {/* Garde-fou : modal qui s'affiche UNIQUEMENT à la tentative de quitter
          (bouton retour, fermeture onglet, refresh) s'il reste une carte
          modifiée non enregistrée. */}
      <UnsavedChangesGuard dirty={dirty} onConfirmLeave={() => setDirtyCartes(new Set())} />

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
              <label className="form-label"><Mail size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />Email de contact</label>
              <input className="izi-input" type="email" value={profile.email_contact || ''} onChange={handleChange('email_contact')} placeholder="ton@email.com" />
              <p className="form-hint">C'est l'email affiché à tes élèves (portail, emails envoyés en ton nom). Il ne change pas ton email de connexion.</p>
            </div>
            <div className="form-group">
              <label className="form-label">Téléphone</label>
              <input className="izi-input" value={profile.telephone || ''} onChange={handleChange('telephone')} />
            </div>
            <div className="form-group">
              <label className="form-label"><Home size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />Adresse</label>
              <input className="izi-input" value={profile.adresse || ''} onChange={handleChange('adresse')} placeholder="Adresse postale" />
            </div>
            <BtnSauver carte="profil" />
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
            {/* « Ma salle principale » (lieu_principal) retirée en B2e : réglage
                100 % factice — sauvé en DB mais lu par AUCUN code (les cours
                portent chacun leur propre lieu). La colonne reste, vestige. */}
            <BtnSauver carte="activite" />
          </div>
          )}

          {/* Facturation (v84) — l'identité légale des factures élèves */}
          {subTab.profil === 'activite' && (() => {
            const pays = paysDe(profile);
            const siretCheck = validerIdentifiant(profile?.pays, profile.facturation_siret || '');
            const active = !!String(profile.facturation_siret || '').trim();
            return (
          <div className="section izi-card">
            <div className="section-top"><div className="section-icon"><FileText size={20} /></div><h2>Facturation</h2></div>
            <p className="section-desc">
              Avec ton {pays.identifiant.label.toLowerCase()} renseigné, tes élèves téléchargent de <strong>vraies factures acquittées</strong> depuis
              leur espace (CSE, mutuelles…) — à la place du simple reçu. Numérotation automatique et séquentielle
              (FAC-{new Date().getFullYear()}-0001), documents figés à l'émission, re-téléchargeables à l'identique.
            </p>
            {/* Le pays d'exercice (v105) : il décide du libellé de ton numéro
                d'entreprise, de la mention sur tes factures, et de la présence
                du bloc de déclaration. Retour Melyflow (Belgique), 2026-08-25. */}
            <div className="form-group">
              <label className="form-label">Pays d&apos;exercice</label>
              <select
                className="izi-input"
                value={profile.pays || 'FR'}
                onChange={handleChange('pays')}
                style={{ maxWidth: 260 }}
              >
                {CODES_PAYS.map(c => (
                  <option key={c} value={c}>{PAYS[c].drapeau} {PAYS[c].nom}</option>
                ))}
              </select>
              <p className="form-hint">
                {aDeclarationAutomatisable(profile?.pays)
                  ? "En France, tu déclares toi-même ton chiffre d'affaires : le bloc URSSAF de Revenus est là pour ça."
                  : `Chez toi, c'est ${pays.declarationSociale.nom} qui appelle tes cotisations : IziSolo ne te demande aucune déclaration, il te donne juste tes recettes au propre.`}
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">Nom / raison sociale sur les factures</label>
              <input
                className="izi-input"
                value={profile.facturation_raison_sociale || ''}
                onChange={handleChange('facturation_raison_sociale')}
                placeholder={profile.studio_nom || 'Ton nom, ou celui de ta structure'}
              />
              <p className="form-hint">Vide = le nom de ton studio.</p>
            </div>
            <div className="form-group">
              <label className="form-label">{pays.identifiant.label}</label>
              <input
                className="izi-input"
                value={profile.facturation_siret || ''}
                onChange={handleChange('facturation_siret')}
                placeholder={pays.identifiant.exemple}
                inputMode={pays.code === 'LU' ? 'text' : 'numeric'}
              />
              {!siretCheck.valide ? (
                <p className="form-hint" style={{ color: '#dc2626' }}>{siretCheck.message}</p>
              ) : (
                <p className="form-hint">
                  {active
                    ? 'Facturation active ✓'
                    : `${pays.identifiant.aide} Sans lui, tes élèves téléchargent un simple reçu de paiement.`}
                </p>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Mention TVA</label>
              <input
                className="izi-input"
                value={profile.facturation_mention_tva || ''}
                onChange={handleChange('facturation_mention_tva')}
                placeholder={mentionSuggeree(profile?.pays)}
              />
              <p className="form-hint">
                {pays.mentionDefaut
                  ? <>Vide = « {pays.mentionDefaut} » (franchise de TVA, le cas micro-entreprise). Adapte si tu factures la TVA.</>
                  : <>⚠️ Aucune mention n&apos;est écrite par défaut hors de France : nous ne devinons pas
                     ce qui doit figurer sur ta facture. Souvent «&nbsp;{mentionSuggeree(profile?.pays)}&nbsp;»,
                     mais <strong>vérifie la formulation exacte auprès de ton comptable</strong> — c&apos;est
                     ta responsabilité qui est engagée, pas la nôtre.</>}
              </p>
            </div>
            <BtnSauver carte="facturation" />
          </div>
            );
          })()}

          {/* Règlement par virement (v98) — RIB + email « comment régler » */}
          {subTab.profil === 'activite' && (
            <ReglementSection
              profile={profile}
              setProfile={setProfile}
              setDirty={() => marquer('reglement')}
              boutonSauver={<BtnSauver carte="reglement" />}
            />
          )}

          {/* ⚠️ FRANCE SEULEMENT (v105). Ailleurs, ce sont des caisses qui
              APPELLENT les cotisations sur une base qu'elles connaissent : il
              n'y a rien à déclarer ici. Afficher ce bloc à une prof belge
              l'inviterait à s'occuper d'un geste qui n'existe pas chez elle. */}
          {/* Ma déclaration URSSAF (v93) — les réglages qui alimentent le bloc
              de la page Revenus, l'estimation et le rappel d'échéance. Tant
              que cette carte n'est pas enregistrée, urssaf_config est NULL :
              aucune estimation affichée, aucun email envoyé. */}
          {subTab.profil === 'activite' && aDeclarationAutomatisable(profile?.pays) && (() => {
            const u = configUrssafAffichee(profile.urssaf_config);
            const configuree = !!sanitizeConfigUrssaf(profile.urssaf_config);
            return (
          <div className="section izi-card">
            <div className="section-top"><div className="section-icon"><Landmark size={20} /></div><h2>Ma déclaration URSSAF</h2></div>
            <p className="section-desc">
              Dis-nous comment tu déclares : IziSolo te prépare le montant à recopier à chaque échéance,
              sur la page <strong>Revenus</strong>. On compte ce que tu as <strong>réellement encaissé</strong>,
              jamais ce qui est encore dû.
            </p>

            <div className="form-group">
              <label className="form-label">Ton régime</label>
              <select className="izi-input" value={u.regime} onChange={e => setUrssaf('regime', e.target.value)}>
                {Object.entries(REGIMES).map(([k, r]) => (
                  <option key={k} value={k}>{r.label}</option>
                ))}
              </select>
              <p className="form-hint">{REGIMES[u.regime]?.hint}</p>
            </div>

            <div className="form-group">
              <label className="form-label">Tu déclares</label>
              <select className="izi-input" value={u.periodicite} onChange={e => setUrssaf('periodicite', e.target.value)}>
                {Object.entries(PERIODICITES).map(([k, p]) => (
                  <option key={k} value={k}>{p.label}</option>
                ))}
              </select>
              <p className="form-hint">
                Le choix que tu as fait à ta création d'entreprise. Il fixe tes échéances.
              </p>
            </div>

            {u.regime !== 'autre' && (
              <>
                <div className="urssaf-taux-row">
                  <div className="form-group">
                    <label className="form-label">Taux de cotisations</label>
                    <div className="urssaf-pct">
                      <input
                        className="izi-input" type="number" step="0.1" min="0" max="100"
                        value={u.taux_cotisations}
                        onChange={e => setUrssaf('taux_cotisations', e.target.value)}
                      />
                      <span>%</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Formation pro (CFP)</label>
                    <div className="urssaf-pct">
                      <input
                        className="izi-input" type="number" step="0.05" min="0" max="100"
                        value={u.taux_cfp}
                        onChange={e => setUrssaf('taux_cfp', e.target.value)}
                      />
                      <span>%</span>
                    </div>
                  </div>
                </div>
                <p className="form-hint" style={{ marginTop: '-4px' }}>
                  Ces taux changent d&apos;une année à l&apos;autre et selon ta caisse de retraite.
                  Recopie ceux de ton compte <a href="https://www.autoentrepreneur.urssaf.fr" target="_blank" rel="noopener noreferrer">autoentrepreneur.urssaf.fr</a>.
                  Ce que t&apos;affiche IziSolo reste une estimation, jamais un montant officiel.
                </p>

                <div className="form-group">
                  <label className="izi-check">
                    <input
                      type="checkbox"
                      checked={!!u.versement_liberatoire}
                      onChange={e => setUrssaf('versement_liberatoire', e.target.checked)}
                    />
                    <span>J&apos;ai opté pour le versement libératoire de l&apos;impôt</span>
                  </label>
                  {u.versement_liberatoire && (
                    <div className="urssaf-pct" style={{ marginTop: 8, maxWidth: 160 }}>
                      <input
                        className="izi-input" type="number" step="0.1" min="0" max="10"
                        value={u.taux_liberatoire}
                        onChange={e => setUrssaf('taux_liberatoire', e.target.value)}
                      />
                      <span>%</span>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="form-group">
              <label className="izi-check">
                <input
                  type="checkbox"
                  checked={u.rappel_email !== false}
                  onChange={e => setUrssaf('rappel_email', e.target.checked)}
                />
                <span>Préviens-moi par email quand c&apos;est l&apos;heure de déclarer</span>
              </label>
              <p className="form-hint">
                Un seul email par période, le lendemain de sa clôture, avec le montant déjà calculé.
              </p>
            </div>

            {!configuree && (
              <p className="form-hint" style={{ color: 'var(--c-accent-deep, #8a5a2b)' }}>
                Enregistre pour activer ton récapitulatif sur la page Revenus.
              </p>
            )}
            <BtnSauver carte="urssaf" />
          </div>
            );
          })()}

          {/* Lieux */}
          {subTab.profil === 'lieux' && (
          <>
          <div className="section izi-card">
            <div className="section-top"><div className="section-icon"><MapPin size={20} /></div><h2>Mes lieux</h2></div>
            {/* Seule carte de l'écran SANS bouton Enregistrer : chaque lieu est
                écrit dès la validation du modal. Sans le dire, ça se lit comme
                « rien n'est sauvé » — retour Léa 2026-08-21, qui est repartie
                chercher un bouton sur un autre sous-onglet. */}
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
            <>
              <ChampsElevesSection
                profile={profile}
                setProfile={setProfile}
                setDirty={() => marquer('champs')}
              />
              <BtnSauver carte="champs" />
            </>
          )}

          {/* Note : la page publique (PagePubliqueSection) a été déplacée vers
              l'onglet "Portail public" (2026-06-01), avec VisibiliteSection,
              CoursEssaiSection et StripePaiementSection. */}
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
            <>
              <PagePubliqueSection profile={profile} setProfile={setProfile} setDirty={() => marquer('page')} />
              <BtnSauver carte="page" />
              {/* v85 — documents d'inscription (sa propre carte : save séparé) */}
              <DocsInscriptionSection profile={profile} setProfile={setProfile} setDirty={() => marquer('docs')} />
              <BtnSauver carte="docs" />
            </>
          )}
          {subTab.portail === 'apparence' && (
            <>
              <TypesCoursSection profile={profile} setProfile={setProfile} setDirty={() => marquer('apparence')} />
              <BtnSauver carte="apparence" />
            </>
          )}
          {subTab.portail === 'visibilite' && (
            <>
              <VisibiliteSection profile={profile} setProfile={setProfile} setDirty={() => marquer('visibilite')} />
              <BtnSauver carte="visibilite" />
            </>
          )}
          {subTab.portail === 'essai' && (
            <>
              <CoursEssaiSection profile={profile} setProfile={setProfile} setDirty={() => marquer('essai')} />
              <BtnSauver carte="essai" />
            </>
          )}
          {subTab.portail === 'paiement' && (
            <>
              <StripePaiementSection profile={profile} setProfile={setProfile} setDirty={() => marquer('paiement')} />
              <BtnSauver carte="paiement" />
            </>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* ONGLET — NOTIFICATIONS & ANNIVERSAIRES      */}
      {/* ============================================ */}
      {activeTab === 'notifications' && (
        <div className="tab-content animate-fade-in">
          <SubTabsBar items={SUBTABS.notifications} active={subTab.notifications} onChange={id => setSub('notifications', id)} />

          {/* Mes notifications — ce que LA PROF veut recevoir (push navigateur +
              choix par type). Distinct de « Ce que tes élèves reçoivent »
              (= ce que l'app envoie AUX élèves). Sauvegarde immédiate au toggle. */}
          {subTab.notifications === 'notifs' && (
          <>
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

          {/* Seuil de l'alerte « paiement en attente » (cloche prof uniquement).
              B2e : ce réglage existait dans l'UI depuis toujours mais n'était
              NI sauvegardé (absent du payload) NI lu (la cloche codait 7 j en
              dur) — désormais branché de bout en bout. */}
          <div className="section izi-card">
            <div className="section-top">
              <div className="section-icon"><Bell size={20} /></div>
              <h2>Alerte paiement en attente</h2>
            </div>
            <p className="section-desc">
              Quand un paiement (chèque, virement, espèces) reste marqué « en attente »
              trop longtemps, tu reçois une notification dans ta cloche pour penser à
              relancer. Rien n'est envoyé à l'élève — c'est à toi de choisir le ton.
            </p>
            <div className="form-group">
              <label className="form-label">Me prévenir après</label>
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
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>jours d'attente</span>
              </div>
            </div>
            <BtnSauver carte="seuils_prof" />
          </div>
          </>
          )}

          {/* Ce que TES ÉLÈVES reçoivent : les emails auto (NotifsElevesSection),
              les seuils qui les déclenchent, et le message d'anniversaire.
              Rangés ensemble PAR DESTINATAIRE (B2e). */}
          {subTab.notifications === 'eleves' && (
          <>
            <NotifsElevesSection
              profile={profile}
              setProfile={setProfile}
              setDirty={() => marquer('notifs_eleves')}
            />
            <BtnSauver carte="notifs_eleves" />

            <div className="section izi-card">
              <div className="section-top">
                <div className="section-icon"><Bell size={20} /></div>
                <h2>Seuils de déclenchement</h2>
              </div>
              <p className="section-desc">
                Ces deux seuils déclenchent les emails automatiques ci-dessus (s'ils
                sont activés) — et les mêmes alertes sur ton tableau de bord.
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
              <BtnSauver carte="seuils" />
            </div>

            {/* Anniversaires — réduit au réel (B2e) : cloche J-1/J-0 → clic →
                messagerie préremplie avec ce message → envoi MANUEL. Les modes
                « semi-auto / automatique » et le « cadeau » (carnet 0 € promis)
                n'ont jamais été branchés : retirés de l'UI, colonnes conservées. */}
            <div className="section izi-card">
              <div className="section-top">
                <div className="section-icon"><Cake size={20} /></div>
                <h2>Anniversaires</h2>
                <button
                  type="button"
                  className="param-toggle-switch"
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex' }}
                  onClick={() => {
                    const actif = (profile.anniversaire_mode || 'semi') !== 'off';
                    setProfile(prev => ({ ...prev, anniversaire_mode: actif ? 'off' : 'manuel' }));
                    marquer('anniv');
                  }}
                  aria-pressed={(profile.anniversaire_mode || 'semi') !== 'off'}
                  aria-label="Activer les alertes anniversaire"
                >
                  {(profile.anniversaire_mode || 'semi') !== 'off'
                    ? <ToggleRight size={30} style={{ color: 'var(--brand)' }} />
                    : <ToggleLeft size={30} style={{ color: 'var(--border)' }} />}
                </button>
              </div>
              <p className="section-desc">
                La veille et le jour J de l'anniversaire d'un·e élève, tu reçois une
                alerte dans ta cloche. Un clic ouvre la messagerie avec ton message
                prérempli — tu n'as plus qu'à l'envoyer (rien ne part tout seul).
              </p>

              {(profile.anniversaire_mode || 'semi') !== 'off' && (
                <div className="form-group">
                  <label className="form-label">Message d'anniversaire</label>
                  <p className="form-hint" style={{ marginTop: 0 }}>
                    Utilise <code>{'{prenom}'}</code> pour personnaliser avec le prénom de l'élève.
                  </p>
                  <textarea
                    className="izi-input anniv-textarea"
                    value={profile.anniversaire_message || ''}
                    onChange={handleChange('anniversaire_message')}
                    rows={4}
                    placeholder="Joyeux anniversaire {prenom} ! 🎂"
                  />
                  <div className="anniv-preview">
                    <span className="anniv-preview-label">Aperçu :</span>
                    {(profile.anniversaire_message || '')
                      .replace(/\{\{\s*prenom\s*\}\}/g, 'Sophie')
                      .replace(/\{\s*prenom\s*\}/g, 'Sophie')
                      .replace(/\{\{\s*nom\s*\}\}/g, 'Martin')
                      .replace(/\{\s*nom\s*\}/g, 'Martin')}
                  </div>
                </div>
              )}
              <BtnSauver carte="anniv" />
            </div>
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
                setDirty={() => marquer('annulation')}
              />
              <BtnSauver carte="annulation" />
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

          {/* Règle immuable du projet : toute section du guide reçoit son « ? »
              sur la page qu'elle décrit. */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
            <AideContextuelle ancre="abonnement" titre="Ouvrir le tuto « Ton abonnement IziSolo »" />
          </div>

          {/* Plan actuel — dynamique selon le plan EFFECTIF (incluant trial) */}
          {(() => {
            const trial = getTrialStatus(profile);
            const currentPlanKey = effectivePlanFromTrial(profile);
            const currentPlan = PLANS[currentPlanKey] || PLANS.solo;
            const isFree = currentPlanKey === 'free';
            const isTrialActive = trial.active;
            // Matrice B3a (§5 plan de bataille) : chaque ligne = une capacité
            // testée par can() — LA source unique, plus de flags par plan.
            const featuresList = [
              { label: 'Élèves illimités · fiches · import/export CSV', included: true },
              { label: 'Cours, agenda, récurrences, lieux illimités', included: true },
              { label: 'Pointage 1-clic + carnets/abos gérés à la main', included: true },
              { label: 'Mini-compta : encaissements, « à percevoir », export comptable', included: true },
              { label: 'Réservation en ligne + annulation élève + règles d\'annulation', included: can(profile, 'reservation_en_ligne') },
              { label: 'Espace élève connecté (compte, historique, rappels J-1)', included: can(profile, 'espace_eleve') },
              { label: 'Cours d\'essai en ligne, liste d\'attente, cours privés', included: can(profile, 'cours_essai') },
              { label: 'Messagerie, mailing groupé, sondages planning', included: can(profile, 'messagerie') },
              { label: 'Paiement en ligne élèves (Stripe Payment Link)', included: can(profile, 'paiement_en_ligne') },
              { label: 'Import fiche par photo (IA)', included: can(profile, 'photo_import') },
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

                {currentPlanKey !== 'pro' && !isFree && (
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

        /* Déclaration URSSAF (v93) */
        .izi-check { display: flex; align-items: flex-start; gap: 8px; cursor: pointer; font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); }
        .izi-check input { margin-top: 2px; accent-color: var(--brand); flex-shrink: 0; }
        .urssaf-taux-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .urssaf-pct { display: flex; align-items: center; gap: 6px; }
        .urssaf-pct .izi-input { flex: 1; min-width: 0; }
        .urssaf-pct span { font-size: 0.875rem; font-weight: 600; color: var(--text-muted); }
        @media (max-width: 560px) { .urssaf-taux-row { grid-template-columns: 1fr; } }

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
