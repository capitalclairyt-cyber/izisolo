'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Save, Ticket, CalendarCheck,
  Percent, Info, Calculator, ToggleLeft, ToggleRight,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';
import CoherenceTypesHint from '@/components/offres/CoherenceTypesHint';
import { formatMontant, getAllTypesFromCategories } from '@/lib/utils';
import { PLANS } from '@/lib/constantes';
import { effectivePlan } from '@/lib/trial';
import { calcProRata, joursEntreISO, semainesEntreISO, aujourdhuiISO } from '@/lib/prorata';
import { finGlissanteISO } from '@/lib/offres-periode';
import DureeLibre, { uniteNaturelle } from '@/components/offres/DureeLibre';
import {
  MODE_ILLIMITE, MODE_CADENCE, MODE_TOTAL, payloadSeances, apercuSeances,
} from '@/lib/offres-seances';
import { useStudioId } from '@/components/studio/StudioProvider';

// ─── Types ───────────────────────────────────────────────────────────────────
// « Cours à l'unité » retiré de la création (audit cohérence 2026-07-22, spec
// MODELE-PAIEMENTS §4.1) : ce type créait un carnet 0/1 qui passait « épuisé »
// dès la 1re séance. La séance à l'unité se gère désormais SANS carnet :
//   - prix sur le cours lui-même (« Cours payable à la séance ») → encaissement
//     au pointage ;
//   - ou « Encaisser une séance / autre » sur la fiche élève.
// Les offres cours_unique existantes restent lisibles/attribuables (legacy).
const TYPES = [
  { value: 'carnet',      label: 'Carnet de séances', Icon: Ticket,      desc: 'Ex : 10 cours pour 120€' },
  { value: 'abonnement',  label: 'Abonnement',         Icon: CalendarCheck, desc: 'Ex : mensuel, ou saison sept.–juin' },
];

// Presets séances carnet
const PRESETS_SEANCES = [5, 10, 15];

// Presets de durée pour un abonnement à durée glissante (en jours). On annonce
// « 1 mois = 30 jours » plutôt qu'un « même jour du mois suivant » : c'est ce
// que la vente calcule réellement, et un abonnement qui ment sur sa date de fin
// se paie en litige avec l'élève.
const PRESETS_DUREE_ABO = [
  { jours: 30,  label: '1 mois' },
  { jours: 90,  label: '3 mois' },
  { jours: 365, label: '1 an' },
];

// Presets durée de validité carnet (en jours)
const PRESETS_DUREE_CARNET = [
  { value: 90,  label: '3 mois' },
  { value: 180, label: '6 mois' },
  { value: 365, label: '1 an' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
// Pro-rata : calcul unique dans lib/prorata (2026-08-21 — était dupliqué et
// divergent entre création, vente et fiche élève).
const joursDiff = joursEntreISO;
const semainesDiff = semainesEntreISO;

function formatDate(s) {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

// ─── Composant ───────────────────────────────────────────────────────────────
export default function NouvelleOffre() {
  // Le studio affiché (v101) : `user.id` ne suffit plus, une prof peut être
  // invitée dans le studio d'une autre. Résolu une seule fois par le layout.
  const studioId = useStudioId();
  const router      = useRouter();
  const { toast }   = useToast();
  const [loading, setLoading]     = useState(false);
  const [offresUnitaires, setOffresUnitaires] = useState([]); // pour ref prix carnet
  const [planLimitReached, setPlanLimitReached] = useState(false);

  // État principal
  const [type, setType]           = useState('carnet');
  const [nom, setNom]             = useState('');
  const [nomModifie, setNomModifie] = useState(false); // true si user a changé le nom manuellement
  const [prix, setPrix]           = useState('');

  // Carnet
  const [seances, setSeances]           = useState('');
  const [seancesCustom, setSeancesCustom] = useState(false); // true si "Autre"
  const [prixUnitaireRef, setPrixUnitaireRef] = useState('');
  const [carnetDureeJours, setCarnetDureeJours] = useState(''); // '' = pas de limite
  const [carnetDureeCustom, setCarnetDureeCustom] = useState(false);

  // Restriction par type de cours (commun carnet/abonnement)
  const [typesCoursDisponibles, setTypesCoursDisponibles] = useState([]); // liste des types existants
  const [typesCoursAutorises, setTypesCoursAutorises] = useState([]);     // sélection ([] = tous)

  // Abonnement — deux façons de borner la période (2026-08-22, retour Colin :
  // « si on met comme date que le mois de septembre on ne va pas refaire ça
  // douze fois »). 'fixe' = une saison, dates communes à toutes ; 'glissante'
  // = N jours à partir de la vente, l'abonnement mensuel qu'on crée UNE fois.
  // Défaut 'fixe' : c'est le comportement historique, on ne déplace personne.
  const [periodeMode, setPeriodeMode] = useState('fixe');
  const [dureeGlissante, setDureeGlissante] = useState('30');
  // L'unité de SAISIE du champ libre (on stocke toujours des jours) — retour
  // d'une prof le jour de son inscription : « je voulais définir 4 mois ».
  const [uniteAbo, setUniteAbo] = useState('mois');
  const [uniteCarnet, setUniteCarnet] = useState('mois');
  const [dateDebut, setDateDebut]     = useState('');
  const [dateFin, setDateFin]         = useState('');
  // Ce que l'abonnement donne droit à faire : UNE question à trois branches
  // (2026-08-23, retour Colin — « illimité c'est sans limite mais on demande
  // ensuite combien de séances par semaine »). Deux champs indépendants
  // vivaient là, dont une cadence à 1×/semaine PAR DÉFAUT que plus aucun écran
  // n'affichait ensuite : 7 des 13 abonnements de la prod sont nés
  // « illimités » et bloqués à une séance par semaine, en silence.
  // Défaut désormais : illimité pour de vrai, aucune des deux colonnes posée.
  const [modeSeancesAbo, setModeSeancesAbo] = useState(MODE_ILLIMITE);
  const [seancesAbo, setSeancesAbo]   = useState('');              // total sur la période
  const [seancesParSemaine, setSeancesParSemaine] = useState('');  // cadence max ('' = sans limite)
  const [inclutVacances, setInclutVacances]       = useState(true);
  const [proRataActif, setProRataActif]           = useState(false);
  const [proRataDateLimite, setProRataDateLimite] = useState('');

  // Paiement en ligne (Stripe Payment Link)
  const [stripePaymentLink, setStripePaymentLink] = useState('');
  const [showStripeHelp, setShowStripeHelp]       = useState(false);

  // Validation du lien Stripe : doit être une URL stripe.com / buy.stripe.com
  const stripeLinkValid = !stripePaymentLink.trim() ||
    /^https?:\/\/(buy\.)?stripe\.com\//i.test(stripePaymentLink.trim());

  // Charger les offres cours_unique pour la référence prix + vérifier limite plan
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();

      const [{ data: unitaires }, { data: profile }, { count }] = await Promise.all([
        supabase.from('offres').select('id, nom, prix').eq('type', 'cours_unique').eq('actif', true).order('prix'),
        supabase.from('profiles').select('plan, trial_started_at, stripe_subscription_status, types_cours').eq('id', studioId).single(),
        supabase.from('offres').select('*', { count: 'exact', head: true }).eq('profile_id', studioId),
      ]);

      setOffresUnitaires(unitaires || []);
      setTypesCoursDisponibles(getAllTypesFromCategories(profile?.types_cours));

      // Vérifier la limite du plan
      const planKey = effectivePlan(profile);
      const limite = PLANS[planKey]?.limiteOffres;
      if (limite != null && (count || 0) >= limite) {
        setPlanLimitReached(true);
      }
    };
    load();
  }, []);

  // Auto-génération du nom
  useEffect(() => {
    if (nomModifie) return;
    if (type === 'carnet' && seances) {
      setNom(`Carnet ${seances} séances`);
    }
    // Pour abonnement : ne pas auto-remplir (trop variable)
  }, [type, seances, nomModifie]);

  // Quand on change de type, reset certains champs
  const handleTypeChange = (t) => {
    setType(t);
    setNom('');
    setNomModifie(false);
    setPrix('');
    setSeances('');
    setSeancesCustom(false);
    setPrixUnitaireRef('');
    setCarnetDureeJours('');
    setCarnetDureeCustom(false);
    setPeriodeMode('fixe');
    setDureeGlissante('30');
  };

  // Séances preset (carnet)
  const selectPreset = (n) => {
    setSeances(String(n));
    setSeancesCustom(false);
    if (!nomModifie) setNom(`Carnet ${n} séances`);
  };

  const handleNomChange = (v) => {
    setNom(v);
    setNomModifie(v !== '' && !(type === 'carnet' && v === `Carnet ${seances} séances`));
  };

  // Calculs dérivés
  // '' (sans limite) n'est PAS « Autre » : sinon la puce Autre s'allumerait sur
  // un total sans cadence, et son champ libre s'ouvrirait pour rien.
  const cadenceCustom = !!seancesParSemaine && !['1','2','3'].includes(seancesParSemaine);
  const totalSemaines  = semainesDiff(dateDebut, dateFin);
  const joursValidite  = joursDiff(dateDebut, dateFin);
  const today          = aujourdhuiISO();

  // Remise carnet
  const remisePct = (() => {
    if (type !== 'carnet' || !seances || !prix || !prixUnitaireRef) return null;
    const valeurTotale = parseFloat(prixUnitaireRef) * parseInt(seances);
    if (!valeurTotale) return null;
    const remise = ((valeurTotale - parseFloat(prix)) / valeurTotale) * 100;
    return remise > 0 ? remise : null;
  })();

  const prixProRata = proRataActif
    ? calcProRata({ dateDebut, dateFin, prix, dateRef: today, dateLimite: proRataDateLimite || null })
    : null;

  const prixProRataLimite = proRataActif && proRataDateLimite
    ? calcProRata({ dateDebut, dateFin, prix, dateRef: proRataDateLimite, dateLimite: proRataDateLimite })
    : null;

  // Soumission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nom.trim() || !prix) return;

    if (planLimitReached) {
      toast.warning('Tu as atteint la limite d\'offres de ton plan. Passe en Complet pour en créer davantage.');
      return;
    }

    if (type === 'abonnement') {
      if (periodeMode === 'glissante') {
        if (!dureeGlissante || parseInt(dureeGlissante) < 1) {
          toast.warning('Indique la durée de l\'abonnement, en jours.');
          return;
        }
      } else {
        if (!dateDebut || !dateFin) {
          toast.warning('Les dates de début et de fin sont obligatoires pour un abonnement à dates fixes.');
          return;
        }
        if (joursValidite <= 0) {
          toast.warning('La date de fin doit être après la date de début.');
          return;
        }
        if (proRataActif && !proRataDateLimite) {
          toast.warning('Indique la date limite de souscription au pro-rata.');
          return;
        }
      }
      // Piège silencieux fermé (retour Colin 2026-08-21) : un mode chiffré
      // avec un champ vide partait en base comme ILLIMITÉ, sans un mot, et
      // l'édition réaffichait « Illimitées » en toute logique.
      if (modeSeancesAbo === MODE_TOTAL && (!seancesAbo || parseInt(seancesAbo) < 1)) {
        toast.warning('Indique le nombre total de séances, ou choisis « Autant qu\'elle veut ».');
        return;
      }
      if (modeSeancesAbo === MODE_CADENCE && (!seancesParSemaine || parseInt(seancesParSemaine) < 1)) {
        toast.warning('Indique combien de séances par semaine, ou choisis « Autant qu\'elle veut ».');
        return;
      }
    }

    setLoading(true);
    try {
      const supabase = createClient();

      const payload = {
        profile_id: studioId,
        nom:    nom.trim(),
        type,
        prix:   parseFloat(prix),
        actif:  true,
      };

      if (type === 'carnet') {
        payload.seances          = seances ? parseInt(seances) : null;
        payload.prix_unitaire_ref = prixUnitaireRef ? parseFloat(prixUnitaireRef) : null;
        payload.duree_jours      = carnetDureeJours ? parseInt(carnetDureeJours) : null;
      }

      // Types de cours autorisés (commun carnet/abonnement)
      if ((type === 'carnet' || type === 'abonnement') && typesCoursAutorises.length > 0) {
        payload.types_cours_autorises = typesCoursAutorises;
      }

      if (type === 'abonnement') {
        // Glissante : AUCUNE date sur l'offre, c'est la vente qui les pose.
        // C'est exactement ce que lit estPeriodeGlissante() et ce que le
        // portail et la fiche élève savaient déjà afficher.
        const glissante = periodeMode === 'glissante';
        payload.date_debut          = glissante ? null : (dateDebut || null);
        payload.date_fin            = glissante ? null : (dateFin   || null);
        payload.duree_jours         = glissante ? parseInt(dureeGlissante) : (joursValidite || null);
        // Les deux colonnes s'écrivent ENSEMBLE, par le traducteur que
        // l'édition relit (lib/offres-seances) : un abonnement « illimité » ne
        // peut plus repartir avec une cadence restée à l'écran.
        Object.assign(payload, payloadSeances({
          mode: modeSeancesAbo, total: seancesAbo, cadence: seancesParSemaine,
        }));
        payload.inclut_vacances     = inclutVacances;
        // Le pro-rata fait payer les semaines RESTANTES d'une période commune :
        // il n'a aucun sens en glissant, où chacune démarre à sa date de vente.
        // On l'écrit false plutôt que de laisser passer un réglage inerte.
        payload.pro_rata_actif      = glissante ? false : proRataActif;
        payload.pro_rata_date_limite = (!glissante && proRataActif && proRataDateLimite) ? proRataDateLimite : null;
      }

      if (stripePaymentLink.trim()) {
        if (!stripeLinkValid) {
          toast.warning('Lien Stripe invalide. Doit commencer par https://buy.stripe.com/');
          setLoading(false);
          return;
        }
        payload.stripe_payment_link = stripePaymentLink.trim();
      }

      const { data: creee, error } = await supabase.from('offres').insert(payload).select('id').single();
      if (error) throw error;

      toast.success('Offre créée !');
      // ?creee=<id> → bannière « Vendre cette offre » sur la page Offres
      // (la promesse du hint ci-dessous : « on te le proposera juste après »)
      router.push(creee?.id ? `/offres?creee=${creee.id}` : '/offres');
      router.refresh();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = nom.trim() && prix && !planLimitReached && (
    type !== 'abonnement' || (
      periodeMode === 'glissante'
        ? parseInt(dureeGlissante) >= 1
        : (dateDebut && dateFin && joursValidite > 0)
    )
  );

  return (
    <div className="no-page">
      <div className="no-header animate-fade-in">
        <Link href="/offres" className="back-btn"><ArrowLeft size={20} /></Link>
        <h1>Nouvelle offre</h1>
      </div>

      {planLimitReached && (
        <div className="no-plan-limit-banner animate-slide-up">
          <div className="no-plan-limit-icon">&#x1F451;</div>
          <div className="no-plan-limit-text">
            <strong>Limite atteinte</strong> — Tu as atteint la limite d'offres du plan Essentiel.
            Passe en Complet pour cr{'é'}er des offres illimit{'é'}es.
          </div>
          <Link href="/parametres?tab=abonnement" className="izi-btn izi-btn-primary" style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem', padding: '8px 14px' }}>
            D{'é'}couvrir Complet
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="no-form animate-slide-up">

        {/* ── Type ── */}
        <div className="no-field">
          <label className="no-label">Type d'offre</label>
          <div className="no-type-grid">
            {TYPES.map(({ value, label, Icon, desc }) => (
              <button
                key={value}
                type="button"
                className={`no-type-card ${type === value ? 'selected' : ''}`}
                onClick={() => handleTypeChange(value)}
              >
                <Icon size={20} />
                <div>
                  <div className="no-type-label">{label}</div>
                  <div className="no-type-desc">{desc}</div>
                </div>
              </button>
            ))}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '8px 2px 0', lineHeight: 1.5 }}>
            💡 Pour une <strong>séance à l'unité</strong> (drop-in, atelier, stage), pas besoin d'offre :
            mets un prix directement sur le cours (« Cours payable à la séance ») — tu encaisseras
            au pointage. Ou utilise « Encaisser une séance » depuis la fiche de l'élève.
          </p>
        </div>

        {/* ══════════════════ CARNET ══════════════════ */}
        {type === 'carnet' && (
          <>
            <div className="no-field">
              <label className="no-label">Nombre de séances</label>
              <div className="no-presets">
                {PRESETS_SEANCES.map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`no-preset-btn ${seances === String(n) && !seancesCustom ? 'active' : ''}`}
                    onClick={() => selectPreset(n)}
                  >
                    {n} séances
                  </button>
                ))}
                <button
                  type="button"
                  className={`no-preset-btn ${seancesCustom ? 'active' : ''}`}
                  onClick={() => { setSeancesCustom(true); setSeances(''); }}
                >
                  Autre…
                </button>
              </div>
              {seancesCustom && (
                <input
                  className="izi-input no-custom-input"
                  type="number"
                  min="1"
                  placeholder="Nombre de séances"
                  value={seances}
                  onChange={e => {
                    setSeances(e.target.value);
                    if (!nomModifie && e.target.value) setNom(`Carnet ${e.target.value} séances`);
                  }}
                  autoFocus
                />
              )}
            </div>

            {/* Durée de validité du carnet */}
            <div className="no-field">
              <label className="no-label">
                Durée de validité
                <span className="no-label-hint"> — à partir de l'achat (optionnel)</span>
              </label>
              <div className="no-presets">
                <button
                  type="button"
                  className={`no-preset-btn ${!carnetDureeJours && !carnetDureeCustom ? 'active' : ''}`}
                  onClick={() => { setCarnetDureeJours(''); setCarnetDureeCustom(false); }}
                >
                  Pas de limite
                </button>
                {PRESETS_DUREE_CARNET.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className={`no-preset-btn ${carnetDureeJours === String(value) && !carnetDureeCustom ? 'active' : ''}`}
                    onClick={() => { setCarnetDureeJours(String(value)); setCarnetDureeCustom(false); }}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  className={`no-preset-btn ${carnetDureeCustom ? 'active' : ''}`}
                  onClick={() => { setUniteCarnet(uniteNaturelle(carnetDureeJours)); setCarnetDureeCustom(true); setCarnetDureeJours(''); }}
                >
                  Autre…
                </button>
              </div>
              {carnetDureeCustom && (
                <DureeLibre
                  jours={carnetDureeJours}
                  onChange={setCarnetDureeJours}
                  unite={uniteCarnet}
                  onUnite={setUniteCarnet}
                  autoFocus
                />
              )}
              {carnetDureeJours && (
                <span className="form-hint">
                  Le carnet expirera <strong>{carnetDureeJours} jours</strong> après l'achat
                  {parseInt(carnetDureeJours) >= 30 ? ` (~${Math.round(parseInt(carnetDureeJours) / 30)} mois)` : ''}.
                </span>
              )}
            </div>

            {/* Référence prix unitaire */}
            <div className="no-field">
              <label className="no-label">
                Prix du cours à l'unité
                <span className="no-label-hint"> — pour calculer la remise (optionnel)</span>
              </label>
              {offresUnitaires.length > 0 ? (
                <div className="no-ref-row">
                  <select
                    className="izi-input no-ref-select"
                    aria-label="Cours de référence pour le prix unitaire"
                    value={prixUnitaireRef}
                    onChange={e => setPrixUnitaireRef(e.target.value)}
                  >
                    <option value="">Choisir une offre existante…</option>
                    {offresUnitaires.map(o => (
                      <option key={o.id} value={o.prix}>{o.nom} — {formatMontant(o.prix)}</option>
                    ))}
                  </select>
                  <span className="no-ref-or">ou</span>
                  <input
                    className="izi-input no-ref-input"
                    aria-label="Prix par séance"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Prix/séance €"
                    value={prixUnitaireRef}
                    onChange={e => setPrixUnitaireRef(e.target.value)}
                  />
                </div>
              ) : (
                <input
                  className="izi-input"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex : 15.00 €"
                  value={prixUnitaireRef}
                  onChange={e => setPrixUnitaireRef(e.target.value)}
                />
              )}
            </div>
          </>
        )}

        {/* ══════════════════ ABONNEMENT ══════════════════ */}
        {type === 'abonnement' && (
          <>
            {/* Comment la période se compte */}
            <div className="no-field">
              <label className="no-label">Quelle période couvre cet abonnement ?</label>
              <div className="no-illimite-row">
                <button
                  type="button"
                  className={`no-toggle-btn ${periodeMode === 'glissante' ? 'active' : ''}`}
                  onClick={() => setPeriodeMode('glissante')}
                >
                  À partir de la vente
                </button>
                <button
                  type="button"
                  className={`no-toggle-btn ${periodeMode === 'fixe' ? 'active' : ''}`}
                  onClick={() => setPeriodeMode('fixe')}
                >
                  Dates fixes
                </button>
              </div>
              <span className="form-hint">
                {periodeMode === 'glissante'
                  ? 'Chaque élève démarre le jour où tu lui vends. Tu crées ton abonnement mensuel une seule fois, il reste vendable toute l\'année.'
                  : 'Tout le monde a les mêmes dates, comme une saison de septembre à juin.'}
              </span>
            </div>

            {periodeMode === 'glissante' ? (
              <div className="no-field">
                <label className="no-label">Durée</label>
                <div className="no-semaine-chips">
                  {PRESETS_DUREE_ABO.map(p => (
                    <button
                      key={p.jours}
                      type="button"
                      className={`no-chip ${dureeGlissante === String(p.jours) ? 'active' : ''}`}
                      onClick={() => setDureeGlissante(String(p.jours))}
                    >
                      {p.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`no-chip ${!PRESETS_DUREE_ABO.some(p => String(p.jours) === dureeGlissante) ? 'active' : ''}`}
                    onClick={() => { setUniteAbo(uniteNaturelle(dureeGlissante)); setDureeGlissante(''); }}
                  >
                    Autre
                  </button>
                </div>
                {!PRESETS_DUREE_ABO.some(p => String(p.jours) === dureeGlissante) && (
                  <DureeLibre
                    jours={dureeGlissante}
                    onChange={setDureeGlissante}
                    unite={uniteAbo}
                    onUnite={setUniteAbo}
                  />
                )}
                {finGlissanteISO(dureeGlissante) && (
                  <div className="no-info-pill">
                    <Info size={13} />
                    Vendu aujourd'hui, il irait jusqu'au {formatDate(finGlissanteISO(dureeGlissante))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="no-row">
                  <div className="no-field">
                    <label className="no-label">Début *</label>
                    <input
                      className="izi-input"
                      type="date"
                      value={dateDebut}
                      onChange={e => setDateDebut(e.target.value)}
                    />
                  </div>
                  <div className="no-field">
                    <label className="no-label">Fin *</label>
                    <input
                      className="izi-input"
                      type="date"
                      value={dateFin}
                      min={dateDebut || undefined}
                      onChange={e => setDateFin(e.target.value)}
                    />
                  </div>
                </div>
                {totalSemaines !== null && totalSemaines > 0 && (
                  <div className="no-info-pill">
                    <Info size={13} />
                    Durée : {totalSemaines} semaines · {joursValidite} jours
                  </div>
                )}
              </>
            )}

            {/* ── Ce que l'abonnement donne droit à faire ──────────────────────
                UNE question, trois branches (2026-08-23, retour Colin). Avant :
                « Séances incluses » et « Séances / semaine » posées côte à côte,
                donc « Illimitées » qui réclamait quand même une cadence, et un
                abonnement « 1 fois par semaine » qui obligeait à calculer son
                total. Les deux colonnes n'ont pas changé, la question si. */}
            <div className="no-field">
              <label className="no-label">Que peut faire l'élève avec cet abonnement ?</label>
              <div className="no-mode-grid">
                {[
                  { value: MODE_ILLIMITE, titre: "Autant qu'elle veut",  desc: 'Aucune limite' },
                  { value: MODE_CADENCE,  titre: 'X fois par semaine',   desc: 'Sans total à calculer' },
                  { value: MODE_TOTAL,    titre: 'Un nombre de séances', desc: 'Ex : 32 sur la saison' },
                ].map(m => (
                  <button
                    key={m.value}
                    type="button"
                    className={`no-mode-btn ${modeSeancesAbo === m.value ? 'active' : ''}`}
                    onClick={() => {
                      setModeSeancesAbo(m.value);
                      // Revenir d'un total « sans limite » vers la cadence ne doit
                      // pas laisser le champ vide : elle EST la règle dans ce mode.
                      if (m.value === MODE_CADENCE && !seancesParSemaine) setSeancesParSemaine('1');
                    }}
                  >
                    <span className="no-mode-titre">{m.titre}</span>
                    <span className="no-mode-desc">{m.desc}</span>
                  </button>
                ))}
              </div>

              {modeSeancesAbo === MODE_TOTAL && (
                <input
                  className="izi-input"
                  type="number"
                  min="1"
                  placeholder="Ex : 32 séances sur toute la période"
                  value={seancesAbo}
                  onChange={e => setSeancesAbo(e.target.value)}
                />
              )}

              {(modeSeancesAbo === MODE_CADENCE || modeSeancesAbo === MODE_TOTAL) && (
                <>
                  <label className="no-label no-label-sub">
                    {modeSeancesAbo === MODE_TOTAL
                      ? <>Cadence maximale <span className="no-label-hint">(facultatif)</span></>
                      : 'Combien de fois par semaine ?'}
                  </label>
                  <div className="no-semaine-chips">
                    {modeSeancesAbo === MODE_TOTAL && (
                      <button
                        type="button"
                        className={`no-chip ${!seancesParSemaine ? 'active' : ''}`}
                        onClick={() => setSeancesParSemaine('')}
                      >
                        Sans limite
                      </button>
                    )}
                    {['1','2','3'].map(n => (
                      <button
                        key={n}
                        type="button"
                        className={`no-chip ${seancesParSemaine === n ? 'active' : ''}`}
                        onClick={() => setSeancesParSemaine(n)}
                      >
                        {n}×/sem
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`no-chip ${cadenceCustom ? 'active' : ''}`}
                      onClick={() => setSeancesParSemaine('4')}
                    >
                      Autre
                    </button>
                  </div>
                  {cadenceCustom && (
                    <input
                      className="izi-input no-custom-input"
                      type="number" min="1"
                      placeholder="Nb séances/semaine"
                      value={seancesParSemaine}
                      onChange={e => setSeancesParSemaine(e.target.value)}
                      style={{ maxWidth: 160 }}
                    />
                  )}
                </>
              )}

              {/* Ce que la vente promettra vraiment, en toutes lettres. */}
              <div className="no-info-pill">
                <Info size={13} />
                {apercuSeances({ mode: modeSeancesAbo, total: seancesAbo, cadence: seancesParSemaine })}
              </div>
            </div>

            {/* Vacances */}
            <div className="no-field">
              <label className="no-label">Vacances scolaires</label>
              <button
                type="button"
                className="no-vacances-toggle"
                onClick={() => setInclutVacances(v => !v)}
              >
                {inclutVacances
                  ? <><ToggleRight size={22} style={{ color: 'var(--brand)' }} /> Incluses</>
                  : <><ToggleLeft  size={22} style={{ color: 'var(--text-muted)' }} /> Exclues</>
                }
              </button>
            </div>

            {/* Pro-rata — période fixe UNIQUEMENT (cf. payload) */}
            {periodeMode === 'fixe' && (
            <div className="no-field">
              <div className="no-prorata-header">
                <div>
                  <div className="no-label">Pro-rata à la souscription</div>
                  <div className="no-label-hint" style={{ fontSize: '0.75rem', marginTop: 2 }}>
                    Permet aux élèves de rejoindre en cours d'année à prix réduit
                  </div>
                </div>
                <button
                  type="button"
                  className="no-toggle-switch"
                  onClick={() => setProRataActif(v => !v)}
                  aria-label="Activer le pro-rata"
                >
                  {proRataActif
                    ? <ToggleRight size={28} style={{ color: 'var(--brand)' }} />
                    : <ToggleLeft  size={28} style={{ color: 'var(--border)' }} />
                  }
                </button>
              </div>

              {proRataActif && (
                <div className="no-prorata-zone animate-slide-up">
                  <div className="no-field">
                    <label className="no-label">Date limite de souscription au pro-rata</label>
                    <input
                      className="izi-input"
                      type="date"
                      min={dateDebut || undefined}
                      max={dateFin   || undefined}
                      value={proRataDateLimite}
                      onChange={e => setProRataDateLimite(e.target.value)}
                      placeholder="Ex : 31/10/2025"
                    />
                    <span className="form-hint">
                      Au-delà de cette date, la souscription au pro-rata n'est plus possible.
                    </span>
                  </div>

                  {/* Aperçu calcul pro-rata */}
                  {prix && dateDebut && dateFin && totalSemaines > 0 && (
                    <div className="no-prorata-preview">
                      <div className="no-prorata-preview-title">
                        <Calculator size={14} /> Aperçu du calcul
                      </div>
                      <div className="no-prorata-line">
                        <span>Prix / semaine ({formatMontant(parseFloat(prix))} ÷ {totalSemaines} semaines)</span>
                        <strong>{formatMontant(parseFloat(prix) / totalSemaines)}</strong>
                      </div>
                      {prixProRata !== null && (
                        <div className="no-prorata-line highlight">
                          <span>Aujourd'hui ({formatDate(today)}) : reste {prixProRata.resteSemaines} semaine{prixProRata.resteSemaines > 1 ? 's' : ''} sur {prixProRata.totalSemaines}</span>
                          <strong>{formatMontant(prixProRata.montant)}</strong>
                        </div>
                      )}
                      {prixProRata === null && (
                        <div className="no-prorata-line">
                          <span>Aujourd'hui ({formatDate(today)})</span>
                          <strong>{today <= dateDebut ? 'prix plein (période pas commencée)' : 'souscription fermée'}</strong>
                        </div>
                      )}
                      {prixProRataLimite !== null && proRataDateLimite && (
                        <div className="no-prorata-line">
                          <span>À la date limite ({formatDate(proRataDateLimite)}) : reste {prixProRataLimite.resteSemaines} semaine{prixProRataLimite.resteSemaines > 1 ? 's' : ''}</span>
                          <strong>{formatMontant(prixProRataLimite.montant)}</strong>
                        </div>
                      )}
                      <p className="form-hint" style={{ margin: '6px 0 0' }}>
                        Le pro-rata = prix ÷ semaines totales × semaines restantes au jour de la vente, arrondi aux 0,50 €. La durée totale ne bouge pas : ce sont les semaines restantes qui baissent chaque semaine.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            )}
          </>
        )}

        {/* ══════════════════ TYPES DE COURS AUTORISÉS ══════════════════ */}
        {(type === 'carnet' || type === 'abonnement') && typesCoursDisponibles.length > 0 && (
          <div className="no-field">
            <label className="no-label">
              Vaut pour quels cours ?
              <span className="no-label-hint"> — décide quand ce {type === 'carnet' ? 'carnet' : 'abonnement'} se décompte</span>
            </label>
            <div className="no-presets">
              {typesCoursDisponibles.map(t => {
                const selected = typesCoursAutorises.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    className={`no-preset-btn ${selected ? 'active' : ''}`}
                    onClick={() => {
                      setTypesCoursAutorises(prev =>
                        selected ? prev.filter(x => x !== t) : [...prev, t]
                      );
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            {typesCoursAutorises.length === 0 ? (
              <span className="form-hint">
                ✓ <strong>Tous tes cours</strong> — utilisable sur n'importe quel type.<br />
                💡 Sélectionne les types couverts ci-dessus pour <strong>exclure</strong> les
                cours que tu vends à la séance (atelier, stage, renfo…) — sinon ce {type === 'carnet' ? 'carnet' : 'abonnement'} pourra aussi les payer.
              </span>
            ) : (
              <span className="form-hint">
                Restreint aux cours de type <strong>{typesCoursAutorises.join(', ')}</strong> —
                sur un autre type de cours, l'élève paiera à la séance.
              </span>
            )}
            <CoherenceTypesHint typesAutorises={typesCoursAutorises} />
          </div>
        )}

        {/* ══════════════════ NOM + PRIX (communs) ══════════════════ */}
        <div className="no-divider" />

        <div className="no-field">
          <label className="no-label">
            Nom de l'offre *
            {type === 'carnet' && seances && !nomModifie && (
              <span className="no-label-hint"> — généré automatiquement</span>
            )}
          </label>
          <input
            className="izi-input"
            type="text"
            value={nom}
            onChange={e => handleNomChange(e.target.value)}
            placeholder={
              type === 'carnet'     ? 'Ex : Carnet 10 séances' :
              type === 'abonnement' ? 'Ex : Abonnement annuel 2025-2026' :
                                     'Ex : Cours drop-in'
            }
            required
          />
          {type === 'carnet' && seances && nomModifie && (
            <button
              type="button"
              className="no-reset-link"
              onClick={() => { setNom(`Carnet ${seances} séances`); setNomModifie(false); }}
            >
              ↺ Remettre "Carnet {seances} séances"
            </button>
          )}
        </div>

        <div className="no-field">
          <label className="no-label">Prix *</label>
          <div className="no-prix-wrap">
            <input
              className="izi-input no-prix-input"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={prix}
              onChange={e => setPrix(e.target.value)}
              placeholder="0.00"
              required
            />
            <span className="no-currency">€</span>
          </div>

          {/* Remise carnet */}
          {remisePct !== null && (
            <div className="no-remise-badge">
              <Percent size={13} />
              {Math.round(remisePct)}% de remise par rapport au cours à l'unité
              <span className="no-remise-detail">
                ({parseInt(seances)} × {formatMontant(parseFloat(prixUnitaireRef))} = {formatMontant(parseFloat(prixUnitaireRef) * parseInt(seances))})
              </span>
            </div>
          )}
          {type === 'carnet' && seances && prixUnitaireRef && prix && parseFloat(prix) >= parseFloat(prixUnitaireRef) * parseInt(seances) && (
            <div className="no-remise-warn">
              ⚠️ Le prix du carnet est supérieur ou égal au prix unitaire — aucune remise.
            </div>
          )}
        </div>

        {/* Paiement en ligne (Stripe Payment Link) — optionnel */}
        <div className="no-section no-section-stripe">
          <div className="no-section-label">
            💳 Paiement en ligne <span className="no-optional">(optionnel)</span>
          </div>
          <p className="no-stripe-desc">
            Permet à tes élèves de payer cette offre par CB depuis ton portail.
            Tu reçois directement les fonds sur ton compte Stripe.
          </p>
          <div className="no-field">
            <label className="no-label" htmlFor="stripe-link">Lien Stripe Payment Link</label>
            <input
              id="stripe-link"
              type="url"
              className="izi-input"
              placeholder="https://buy.stripe.com/abc123…"
              value={stripePaymentLink}
              onChange={e => setStripePaymentLink(e.target.value)}
            />
            {stripePaymentLink && !stripeLinkValid && (
              <p className="no-stripe-error">
                ⚠ Ce lien ne ressemble pas à un lien Stripe (doit commencer par https://buy.stripe.com/)
              </p>
            )}
          </div>
          <button
            type="button"
            className="no-stripe-help-toggle"
            onClick={() => setShowStripeHelp(s => !s)}
          >
            {showStripeHelp ? '▾ Masquer' : '▸ Comment générer un Payment Link Stripe ?'}
          </button>
          {showStripeHelp && (
            <div className="no-stripe-help">
              <ol>
                <li>Crée un compte gratuit sur <a href="https://dashboard.stripe.com/register" target="_blank" rel="noopener noreferrer">stripe.com</a> (commission ~1.5% + 0.25€ par CB).</li>
                <li>Renseigne tes informations bancaires (RIB) — Stripe verse automatiquement chaque semaine.</li>
                <li>Va dans <strong>Produits &rarr; Payment Links &rarr; Nouveau lien</strong>.</li>
                <li>Crée un produit avec le <strong>même nom et prix que cette offre</strong>.</li>
                <li>Copie le lien (commence par <code>https://buy.stripe.com/</code>) et colle-le ci-dessus.</li>
                <li>Quand un élève paye, Stripe t'envoie un email. Reviens dans IziSolo et clique <strong>"Encaissé"</strong> sur le paiement en attente (sera créé automatiquement au prochain sprint via webhook).</li>
              </ol>
            </div>
          )}
        </div>

        {/* Raconter le modèle (appel Patricia 2026-08-18) : le règlement — dont
            le plusieurs fois — se choisit à la VENTE, pas ici. Sans cette
            phrase, tout le monde le cherche dans ce formulaire. */}
        <p className="no-vente-hint">
          💡 Ici tu définis <strong>ce que tu vends</strong>. Le règlement — payé, à régler plus tard,
          ou <strong>en plusieurs fois</strong> — se choisit au moment de <strong>vendre</strong> l'offre
          à un·e élève. On te le proposera juste après.
        </p>

        <button
          type="submit"
          className="izi-btn izi-btn-primary no-submit"
          disabled={loading || !canSubmit}
        >
          {loading
            ? <><Loader2 size={16} className="spin" /> Création…</>
            : <><Save size={18} /> Créer l'offre</>
          }
        </button>

      </form>

      <style jsx global>{`
        .no-page  { display: flex; flex-direction: column; gap: 20px; padding-bottom: 48px; }

        /* Section Stripe */
        .no-section-stripe {
          background: linear-gradient(135deg, #f6f9fc 0%, #ffffff 100%);
          border: 1.5px dashed #635bff;
        }
        .no-section-stripe .no-section-label { color: #635bff; }
        .no-optional {
          font-weight: 500; color: var(--text-muted); font-size: 0.75rem; text-transform: none; letter-spacing: 0;
        }
        .no-stripe-desc {
          font-size: 0.875rem; color: var(--text-secondary);
          margin: 0 0 12px; line-height: 1.5;
        }
        .no-stripe-error {
          font-size: 0.75rem; color: #dc2626; margin: 6px 0 0;
        }
        .no-stripe-help-toggle {
          background: none; border: none; cursor: pointer; padding: 6px 0;
          font-size: 0.8125rem; font-weight: 600; color: #635bff;
          text-align: left;
        }
        .no-stripe-help {
          background: white; border: 1px solid var(--border);
          border-radius: 10px; padding: 14px 16px; margin-top: 6px;
        }
        .no-stripe-help ol {
          margin: 0; padding-left: 20px; font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.6;
        }
        .no-stripe-help li { margin-bottom: 6px; }
        .no-stripe-help a { color: #635bff; font-weight: 600; }
        .no-stripe-help code {
          background: #f3f4f6; padding: 1px 5px; border-radius: 4px; font-size: 0.75rem;
          color: var(--text-primary);
        }
        .no-header { display: flex; align-items: center; gap: 12px; }
        .no-header h1 { font-size: 1.25rem; font-weight: 700; }
        .back-btn {
          width: 40px; height: 40px; border-radius: var(--radius-sm);
          border: 1px solid var(--border); background: var(--bg-card);
          display: flex; align-items: center; justify-content: center;
          color: var(--text-secondary); text-decoration: none; flex-shrink: 0;
        }

        .no-form  { display: flex; flex-direction: column; gap: 18px; }
        .no-row   { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .no-field { display: flex; flex-direction: column; gap: 7px; }
        .no-label { font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); }
        .no-label-hint { font-weight: 400; color: var(--text-muted); font-size: 0.75rem; }
        .no-divider { border: none; border-top: 1px solid var(--border); margin: 2px 0; }

        /* Type grid */
        .no-type-grid { display: flex; flex-direction: column; gap: 6px; }
        .no-type-card {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; border-radius: var(--radius-md);
          border: 2px solid var(--border); background: var(--bg-card);
          cursor: pointer; text-align: left; transition: all var(--transition-fast);
          color: var(--text-secondary);
        }
        .no-type-card.selected { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
        .no-type-label { font-weight: 600; font-size: 0.9rem; }
        .no-type-desc  { font-size: 0.75rem; color: var(--text-muted); margin-top: 1px; }

        /* Presets séances */
        .no-presets { display: flex; flex-wrap: wrap; gap: 7px; }
        .no-preset-btn {
          padding: 8px 16px; border-radius: var(--radius-full);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.875rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .no-preset-btn.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
        .no-custom-input { margin-top: 2px; }

        /* Réf prix */
        .no-ref-row { display: flex; align-items: center; gap: 8px; }
        .no-ref-select { flex: 2; min-width: 0; }
        .no-ref-or { font-size: 0.75rem; color: var(--text-muted); flex-shrink: 0; }
        .no-ref-input { flex: 1; min-width: 0; }

        /* Remise badge */
        .no-remise-badge {
          display: flex; align-items: center; flex-wrap: wrap; gap: 5px;
          padding: 8px 12px; border-radius: var(--radius-md);
          background: #ecfdf5; border: 1px solid #6ee7b7; color: #065f46;
          font-size: 0.8125rem; font-weight: 600;
        }
        .no-remise-detail { font-weight: 400; color: #059669; font-size: 0.75rem; }
        .no-remise-warn { font-size: 0.75rem; color: #92400e; }

        /* Toggle actif/inactif */
        .no-toggle-btn {
          flex: 1; padding: 8px 12px; border-radius: var(--radius-full);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .no-toggle-btn.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
        .no-illimite-row { display: flex; gap: 8px; }

        /* Choix « que peut faire l'élève » */
        .no-mode-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
        .no-mode-btn {
          display: flex; flex-direction: column; gap: 2px; text-align: left;
          padding: 10px 12px; border-radius: var(--radius-md);
          border: 1.5px solid var(--border); background: var(--bg-card);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .no-mode-btn.active { border-color: var(--brand); background: var(--brand-light); }
        .no-mode-titre { font-size: 0.8125rem; font-weight: 700; color: var(--text-secondary); }
        .no-mode-btn.active .no-mode-titre { color: var(--brand-700); }
        .no-mode-desc { font-size: 0.7rem; font-weight: 500; color: var(--text-muted); }
        .no-label-sub { margin-top: 2px; }
        @media (max-width: 640px) {
          .no-mode-grid { grid-template-columns: 1fr; }
        }

        /* Chips semaines */
        .no-semaine-chips { display: flex; gap: 6px; flex-wrap: wrap; }
        .no-chip {
          padding: 6px 12px; border-radius: var(--radius-full);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .no-chip.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }

        /* Vacances toggle */
        .no-vacances-toggle {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 8px 12px; border-radius: var(--radius-md);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.875rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; transition: all var(--transition-fast);
          align-self: flex-start;
        }

        /* Info pill */
        .no-info-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 12px; border-radius: var(--radius-full);
          background: var(--brand-light); color: var(--brand-700);
          font-size: 0.8125rem; font-weight: 600; align-self: flex-start;
        }

        /* Pro-rata */
        .no-prorata-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .no-toggle-switch { background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; flex-shrink: 0; }
        .no-prorata-zone { display: flex; flex-direction: column; gap: 12px; padding: 12px; background: var(--cream, #faf8f5); border-radius: var(--radius-md); border: 1px solid var(--border); }
        .no-prorata-preview {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--radius-md); padding: 12px;
          display: flex; flex-direction: column; gap: 8px;
        }
        .no-prorata-preview-title {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.8125rem; font-weight: 700; color: var(--text-secondary);
          margin-bottom: 2px;
        }
        .no-prorata-line {
          display: flex; justify-content: space-between; align-items: center;
          font-size: 0.8125rem; color: var(--text-secondary);
        }
        .no-prorata-line.highlight { color: var(--brand-700); font-weight: 600; }
        .no-prorata-line strong { font-weight: 700; }

        /* Prix */
        .no-prix-wrap { position: relative; }
        .no-prix-input { padding-right: 28px !important; }
        .no-currency {
          position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
          font-weight: 600; color: var(--text-secondary); pointer-events: none;
        }
        .no-reset-link {
          background: none; border: none; padding: 0; cursor: pointer;
          font-size: 0.75rem; color: var(--brand-700); text-align: left; text-decoration: underline;
        }

        .no-submit { width: 100%; margin-top: 4px; }
        .no-vente-hint {
          margin: 0; padding: 11px 14px; border-radius: var(--radius-md);
          background: var(--brand-light, #f7efe6); border: 1px solid var(--brand-200, #e8d3bd);
          font-size: 0.8125rem; line-height: 1.5; color: var(--text-secondary);
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
        .form-hint { font-size: 0.75rem; color: var(--text-muted); }

        /* ── Plan limit banner ── */
        .no-plan-limit-banner {
          display: flex; align-items: center; gap: 12px; padding: 14px 16px;
          background: linear-gradient(135deg, #fef3c7, #fde68a); border: 1.5px solid #f59e0b;
          border-radius: var(--radius-md); flex-wrap: wrap;
        }
        .no-plan-limit-icon { font-size: 1.5rem; flex-shrink: 0; }
        .no-plan-limit-text { flex: 1; min-width: 200px; font-size: 0.875rem; color: #92400e; line-height: 1.45; }
        .no-plan-limit-text strong { font-weight: 700; }
      `}</style>
    </div>
  );
}
