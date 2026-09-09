'use client';

// ════════════════════════════════════════════════════════════════════════════
// Le shell des Paramètres (lot 1 « Paramètres qui respirent », 2026-09-09).
//
// Monté par app/(dashboard)/parametres/layout.js, donc PERSISTANT entre
// /parametres (la liste) et /parametres/<rubrique> : le profil et les lieux
// sont chargés une fois, l'état « modifié, pas encore enregistré » survit à
// la navigation entre rubriques, et la garde UnsavedChangesGuard vit ici.
//
// Mise en page :
//   - /parametres            → la liste pleine largeur (desktop ET mobile).
//   - /parametres/<rubrique> → desktop : colonne gauche = liste compacte,
//                              droite = la rubrique ; mobile : la rubrique
//                              seule, avec un lien « Paramètres » pour
//                              revenir à la liste.
//
// Ce qui ne change PAS par rapport à l'ancien page.js : le chargement du
// profil du STUDIO (v101, `studioId` et jamais user.id), le save par carte
// avec rejeu sans colonne neuve (leçon v95/v105), les lieux écrits à la
// validation du modal.
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';
import { genererSlugStudioUnique } from '@/lib/slug-studio';
import { REGIMES, configUrssafAffichee } from '@/lib/urssaf';
import { CARTES, COLONNES_EN_ATTENTE_DE_MIGRATION, ANNIV_MESSAGE_DEFAUT, carteDuChamp, payloadCarte } from '@/lib/parametres-cartes';
import { rubriqueParId } from '@/lib/parametres-rubriques';
import { useStudioId } from '@/components/studio/StudioProvider';
import UnsavedChangesGuard from '@/components/ui/UnsavedChangesGuard';
import AideContextuelle from '@/components/AideContextuelle';
import { ParametresContext } from './ParametresContext';
import RubriquesListe from './RubriquesListe';
import ParametresStyles from './ParametresStyles';

export default function ParametresShell({ children }) {
  const studioId = useStudioId();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [lieux, setLieux] = useState([]);
  const [savingCarte, setSavingCarte] = useState(null);
  const [dirtyCartes, setDirtyCartes] = useState(() => new Set());
  const dirty = dirtyCartes.size > 0;

  // La rubrique courante, depuis l'URL (null sur la liste).
  const rubriqueId = pathname?.startsWith('/parametres/') ? pathname.slice('/parametres/'.length).split('/')[0] : null;
  const rubrique = rubriqueId ? rubriqueParId(rubriqueId) : null;

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
  }, [studioId]);

  // Marque une carte comme modifiée (le bouton Enregistrer de cette carte
  // s'allume ; la garde « modifs non enregistrées » s'arme).
  const marquer = useCallback((carte) => {
    setDirtyCartes(prev => (prev.has(carte) ? prev : new Set(prev).add(carte)));
  }, []);

  const indexCartes = useRef(null);
  if (!indexCartes.current) indexCartes.current = carteDuChamp();

  const handleChange = useCallback((field) => (e) => {
    setProfile(prev => ({ ...prev, [field]: e.target.value }));
    const carte = indexCartes.current[field];
    if (carte) marquer(carte);
  }, [marquer]);

  // urssaf_config est un JSONB : on édite une CLÉ à la fois sur l'objet
  // affiché (défauts compris) — jamais un champ à plat. Changer de régime
  // recale les taux proposés, sauf si la prof les a déjà personnalisés.
  const setUrssaf = useCallback((cle, valeur) => {
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
  }, [marquer]);

  // --- Sauvegarde d'UNE carte : UPDATE partiel des seules colonnes listées
  // dans CARTES[carte]. Remplace le save monolithique de ~45 champs (B2e).
  const saveCarte = useCallback(async (carte) => {
    if (!CARTES[carte] || !profile) return;
    setSavingCarte(carte);
    const supabase = createClient();
    const payload = payloadCarte(carte, profile);

    // === Auto-magie (carte Activité uniquement) : studio_nom renseigné sans
    // slug → on en génère un via lib/slug-studio (source UNIQUE depuis B1d)
    // + on active le portail, sinon /p/{slug} renvoie 404 (RLS v25 filtre sur
    // portail_actif = true). Cantonné à cette carte.
    let slugGenere = null;
    if (carte === 'activite' && profile.studio_nom && !profile.studio_slug) {
      try {
        slugGenere = await genererSlugStudioUnique(supabase, profile.studio_nom, profile.id);
        payload.studio_slug = slugGenere;
        if (profile.portail_actif !== true) payload.portail_actif = true;
      } catch (e) {
        console.warn('[parametres] génération slug impossible :', e?.message);
      }
    }

    let { error } = await supabase.from('profiles').update(payload).eq('id', profile.id);

    // ⚠️ Leçon v95, appliquée à v105 : PostgREST refuse TOUTE la requête quand
    // UNE colonne lui est inconnue. On rejoue sans la colonne neuve, et on DIT
    // ce qui manque.
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

    const nettoyer = () => setDirtyCartes(prev => { const next = new Set(prev); next.delete(carte); return next; });

    if (!error && colonneNeuveRefusee) {
      toast.success('Enregistré, sauf le pays, qui attend une mise à jour de la base.');
      console.warn('[parametres] colonnes en attente de migration :', colonneNeuveRefusee.join(', '));
      nettoyer();
      router.refresh();
    } else if (!error) {
      if (slugGenere) {
        setProfile(prev => ({ ...prev, studio_slug: slugGenere, portail_actif: true }));
        toast.success(`Page publique activée : /p/${slugGenere}`);
      } else {
        toast.success('Enregistré !');
      }
      nettoyer();
      router.refresh();
    } else if (error.code === '42703' || error.code === 'PGRST204') {
      toast.error('Ce réglage attend une mise à jour de la base. Préviens-nous, on s\'en occupe.');
      console.warn('[parametres] colonne manquante sur la carte', carte, ':', error.message);
    } else {
      toast.error('Erreur : ' + error.message);
    }
    setSavingCarte(null);
  }, [profile, router, toast]);

  const ctx = useMemo(() => ({
    studioId, profile, setProfile, lieux, setLieux,
    marquer, handleChange, setUrssaf, saveCarte, savingCarte, dirtyCartes,
  }), [studioId, profile, lieux, marquer, handleChange, setUrssaf, saveCarte, savingCarte, dirtyCartes]);

  if (loading || !profile) {
    return (
      <div className="parametres">
        <div className="page-header"><h1>Paramètres</h1></div>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Chargement...</div>
        <ParametresStyles />
      </div>
    );
  }

  return (
    <ParametresContext.Provider value={ctx}>
      <div className={`parametres ${rubrique ? 'parametres-rubrique' : 'parametres-liste'}`}>
        <UnsavedChangesGuard dirty={dirty} onConfirmLeave={() => setDirtyCartes(new Set())} />

        {!rubrique ? (
          <>
            <div className="page-header animate-fade-in">
              <h1>Paramètres</h1>
            </div>
            {children}
          </>
        ) : (
          <div className="parametres-colonnes">
            <aside className="parametres-aside">
              <Link href="/parametres" className="parametres-retour parametres-retour-desktop">
                <ChevronLeft size={16} /> Paramètres
              </Link>
              <RubriquesListe compact />
            </aside>
            <div className="parametres-main animate-fade-in">
              <div className="parametres-rubrique-head">
                <Link href="/parametres" className="parametres-retour parametres-retour-mobile" aria-label="Retour aux paramètres">
                  <ChevronLeft size={18} /> Paramètres
                </Link>
                <h1 className="parametres-rubrique-titre">{rubrique.label}</h1>
                {/* Règle immuable : toute section du guide a son « ? » sur la
                    page qu'elle décrit. */}
                {rubrique.aide && (
                  <AideContextuelle ancre={rubrique.aide} titre={`Ouvrir le tuto « ${rubrique.label} »`} />
                )}
              </div>
              {children}
            </div>
          </div>
        )}
        <ParametresStyles />
      </div>
    </ParametresContext.Provider>
  );
}
