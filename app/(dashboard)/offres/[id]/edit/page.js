'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Save, Ticket, CalendarCheck, Zap,
  ToggleLeft, ToggleRight, Loader2, Info,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getAllTypesFromCategories, formatMontant, formatDate } from '@/lib/utils';
import { calcProRata, aujourdhuiISO } from '@/lib/prorata';
import { estPeriodeGlissante, finGlissanteISO } from '@/lib/offres-periode';
import DureeLibre, { uniteNaturelle } from '@/components/offres/DureeLibre';
import {
  MODE_ILLIMITE, MODE_CADENCE, MODE_TOTAL, modeSeances, payloadSeances, apercuSeances,
} from '@/lib/offres-seances';
import { useToast } from '@/components/ui/ToastProvider';
import CoherenceTypesHint from '@/components/offres/CoherenceTypesHint';

const TYPES = [
  { value: 'carnet',       label: 'Carnet de séances', Icon: Ticket,        desc: 'Ex : 10 cours pour 120 €' },
  { value: 'abonnement',   label: 'Abonnement',        Icon: CalendarCheck, desc: 'Ex : mensuel, ou saison sept.–juin' },
  { value: 'cours_unique', label: "Cours à l'unité",   Icon: Zap,           desc: 'Ex : Drop-in 15 €' },
];

export default function EditOffre({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState('carnet');
  const [nom, setNom] = useState('');
  const [prix, setPrix] = useState('');
  const [seances, setSeances] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  // Mode de période (cf. lib/offres-periode) : déduit de l'offre au chargement,
  // pour qu'un abonnement mensuel ne se retransforme pas en saison à la
  // première sauvegarde.
  const [periodeMode, setPeriodeMode] = useState('fixe');
  const [dureeGlissante, setDureeGlissante] = useState('30');
  // Unité de SAISIE (on stocke toujours des jours) — retour terrain
  // 2026-08-25 : « je voulais définir 4 mois ».
  const [uniteAbo, setUniteAbo] = useState('mois');
  const [uniteCarnet, setUniteCarnet] = useState('mois');
  // Le mode remplace le booléen « illimité » : la cadence n'est plus une
  // question à part (cf. lib/offres-seances, retour Colin 2026-08-23).
  const [modeSeancesAbo, setModeSeancesAbo] = useState(MODE_ILLIMITE);
  const [seancesParSemaine, setSeancesParSemaine] = useState(''); // '' = pas de cap
  const [inclutVacances, setInclutVacances] = useState(true);
  const [stripePaymentLink, setStripePaymentLink] = useState('');
  const [carnetDureeJours, setCarnetDureeJours] = useState('');
  const [prixUnitaireRef, setPrixUnitaireRef] = useState('');   // référence remise carnet
  const [proRataActif, setProRataActif] = useState(false);      // pro-rata abonnement
  const [proRataDateLimite, setProRataDateLimite] = useState('');
  const [typesCoursDisponibles, setTypesCoursDisponibles] = useState([]); // types existants du studio
  const [typesCoursAutorises, setTypesCoursAutorises] = useState([]);     // sélection ([] = tous)

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('offres')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        toast.error('Offre introuvable');
        router.push('/offres');
        return;
      }

      setType(data.type);
      setNom(data.nom);
      setPrix(String(data.prix));
      setSeances(data.seances ? String(data.seances) : '');
      setDateDebut(data.date_debut || '');
      setDateFin(data.date_fin || '');
      const glissante = data.type === 'abonnement' && estPeriodeGlissante(data);
      setPeriodeMode(glissante ? 'glissante' : 'fixe');
      setDureeGlissante(glissante ? String(data.duree_jours) : '30');
      setUniteAbo(uniteNaturelle(glissante ? data.duree_jours : 30));
      // Une offre existante se rouvre dans SON mode, cadence comprise : les
  // abonnements « illimités » nés capés à 1×/sem s'affichent désormais pour
  // ce qu'ils sont (« 1 fois par semaine »), au lieu de le cacher.
      setModeSeancesAbo(data.type === 'abonnement' ? modeSeances(data) : MODE_ILLIMITE);
      // '' = pas de cap hebdo. (Avant : défaut '1' → sauvegarder ajoutait
      // silencieusement un cap 1x/sem à un abo qui n'en avait pas, et la
      // réservation portail bloquait les élèves au-delà.)
      setSeancesParSemaine(data.seances_par_semaine ? String(data.seances_par_semaine) : '');
      setInclutVacances(data.inclut_vacances !== false);
      setStripePaymentLink(data.stripe_payment_link || '');
      setCarnetDureeJours(data.type === 'carnet' && data.duree_jours ? String(data.duree_jours) : '');
      setUniteCarnet(uniteNaturelle(data.duree_jours));
      setPrixUnitaireRef(data.prix_unitaire_ref != null ? String(data.prix_unitaire_ref) : '');
      setProRataActif(!!data.pro_rata_actif);
      setProRataDateLimite(data.pro_rata_date_limite || '');
      setTypesCoursAutorises(data.types_cours_autorises || []);
      // Types de cours du studio (pour les chips « Vaut pour quels cours ? »)
      const { data: prof } = await supabase.from('profiles').select('types_cours').eq('id', data.profile_id).single();
      setTypesCoursDisponibles(getAllTypesFromCategories(prof?.types_cours));
      setLoading(false);
    }
    load();
  }, [id, router, toast]);

  function joursDiff(d1, d2) {
    if (!d1 || !d2) return null;
    return Math.round((new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24));
  }

  const joursValidite = joursDiff(dateDebut, dateFin);
  // '' (sans limite) n'est pas « Autre » — cf. formulaire de création.
  const cadenceCustom = !!seancesParSemaine && !['1', '2', '3'].includes(seancesParSemaine);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nom.trim() || !prix) return;

    if (type === 'abonnement') {
      if (periodeMode === 'glissante') {
        if (!dureeGlissante || parseInt(dureeGlissante) < 1) {
          toast.warning('Indique la durée de l\'abonnement, en jours.');
          return;
        }
      } else if (!dateDebut || !dateFin) {
        toast.warning('Les dates sont obligatoires pour un abonnement à dates fixes.');
        return;
      }
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        nom: nom.trim(),
        type,
        prix: parseFloat(prix),
      };

      if (type === 'carnet') {
        payload.seances = seances ? parseInt(seances) : null;
        payload.duree_jours = carnetDureeJours ? parseInt(carnetDureeJours) : null;
        payload.prix_unitaire_ref = prixUnitaireRef ? parseFloat(prixUnitaireRef) : null;
      } else if (type === 'abonnement') {
        const glissante = periodeMode === 'glissante';
        payload.date_debut = glissante ? null : (dateDebut || null);
        payload.date_fin = glissante ? null : (dateFin || null);
        payload.duree_jours = glissante ? parseInt(dureeGlissante) : (joursValidite || null);
        // Même garde qu'à la création : un mode chiffré laissé vide ne repart
        // JAMAIS en illimité silencieux.
        if (modeSeancesAbo === MODE_TOTAL && (!seances || parseInt(seances) < 1)) {
          toast.warning('Indique le nombre total de séances.');
          setSaving(false);
          return;
        }
        if (modeSeancesAbo === MODE_CADENCE && (!seancesParSemaine || parseInt(seancesParSemaine) < 1)) {
          toast.warning('Indique combien de séances par semaine.');
          setSaving(false);
          return;
        }
        Object.assign(payload, payloadSeances({
          mode: modeSeancesAbo, total: seances, cadence: seancesParSemaine,
        }));
        payload.inclut_vacances = inclutVacances;
        // Pas de pro-rata en glissant (cf. lib/offres-periode) : on l'éteint
        // plutôt que de laisser un réglage inerte sur l'offre.
        payload.pro_rata_actif = glissante ? false : proRataActif;
        payload.pro_rata_date_limite = (!glissante && proRataActif && proRataDateLimite) ? proRataDateLimite : null;
      } else if (type === 'cours_unique') {
        payload.seances = 1;
      }

      if (type === 'carnet' || type === 'abonnement') {
        payload.types_cours_autorises = typesCoursAutorises.length > 0 ? typesCoursAutorises : null;
      }

      payload.stripe_payment_link = stripePaymentLink.trim() || null;

      const { error } = await supabase
        .from('offres')
        .update(payload)
        .eq('id', id);

      if (error) throw error;

      toast.success('Offre modifiée !');
      router.push('/offres');
      router.refresh();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = nom.trim() && prix && (
    type !== 'abonnement' || (
      periodeMode === 'glissante'
        ? parseInt(dureeGlissante) >= 1
        : (dateDebut && dateFin && joursValidite > 0)
    )
  );

  if (loading) {
    return (
      <div className="eo-page">
        <div className="eo-loading"><Loader2 size={24} className="spin" /> Chargement...</div>
      </div>
    );
  }

  return (
    <div className="eo-page">
      <div className="eo-header animate-fade-in">
        <Link href="/offres" className="back-btn"><ArrowLeft size={20} /></Link>
        <h1>Modifier l'offre</h1>
      </div>

      <form onSubmit={handleSubmit} className="eo-form animate-slide-up">

        {/* Type */}
        <div className="eo-field">
          <label className="eo-label">Type d'offre</label>
          <div className="eo-type-grid">
            {TYPES.map(({ value, label, Icon, desc }) => (
              <button
                key={value}
                type="button"
                className={`eo-type-card ${type === value ? 'selected' : ''}`}
                onClick={() => setType(value)}
              >
                <Icon size={20} />
                <div>
                  <div className="eo-type-label">{label}</div>
                  <div className="eo-type-desc">{desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Carnet: séances + durée de validité */}
        {type === 'carnet' && (
          <>
            <div className="eo-field">
              <label className="eo-label">Nombre de séances</label>
              <input
                className="izi-input"
                type="number"
                min="1"
                value={seances}
                onChange={e => setSeances(e.target.value)}
                placeholder="Ex : 10"
              />
            </div>
            <div className="eo-field">
              <label className="eo-label">
                Durée de validité <span className="eo-optional">(jours, vide = pas de limite)</span>
              </label>
              <div className="eo-chips">
                <button type="button" className={`eo-chip ${!carnetDureeJours ? 'active' : ''}`} onClick={() => setCarnetDureeJours('')}>Pas de limite</button>
                <button type="button" className={`eo-chip ${carnetDureeJours === '90' ? 'active' : ''}`} onClick={() => setCarnetDureeJours('90')}>3 mois</button>
                <button type="button" className={`eo-chip ${carnetDureeJours === '180' ? 'active' : ''}`} onClick={() => setCarnetDureeJours('180')}>6 mois</button>
                <button type="button" className={`eo-chip ${carnetDureeJours === '365' ? 'active' : ''}`} onClick={() => setCarnetDureeJours('365')}>1 an</button>
              </div>
              <DureeLibre
                jours={carnetDureeJours}
                onChange={setCarnetDureeJours}
                unite={uniteCarnet}
                onUnite={setUniteCarnet}
              />
            </div>
            <div className="eo-field">
              <label className="eo-label">
                Prix d'une séance à l'unité <span className="eo-optional">(référence, optionnel : pour afficher l'économie du carnet)</span>
              </label>
              <input
                className="izi-input"
                type="number" step="0.01" min="0"
                value={prixUnitaireRef}
                onChange={e => setPrixUnitaireRef(e.target.value)}
                placeholder="Ex : 18.00"
                style={{ maxWidth: 220 }}
              />
              {prixUnitaireRef && seances && prix && (parseFloat(prixUnitaireRef) * parseInt(seances) - parseFloat(prix)) > 0 && (
                <span className="eo-optional">
                  💰 Économie affichée : {(parseFloat(prixUnitaireRef) * parseInt(seances) - parseFloat(prix)).toFixed(2).replace('.', ',')} € vs séances à l'unité
                </span>
              )}
            </div>
          </>
        )}

        {/* Abonnement */}
        {type === 'abonnement' && (
          <>
            <div className="eo-field">
              <label className="eo-label">Quelle période couvre cet abonnement ?</label>
              <div className="eo-toggle-row">
                <button type="button" className={`eo-toggle-btn ${periodeMode === 'glissante' ? 'active' : ''}`} onClick={() => setPeriodeMode('glissante')}>À partir de la vente</button>
                <button type="button" className={`eo-toggle-btn ${periodeMode === 'fixe' ? 'active' : ''}`} onClick={() => setPeriodeMode('fixe')}>Dates fixes</button>
              </div>
              <span className="form-hint">
                {periodeMode === 'glissante'
                  ? 'Chaque élève démarre le jour où tu lui vends. Une seule offre à créer, vendable toute l\'année.'
                  : 'Tout le monde a les mêmes dates, comme une saison de septembre à juin.'}
              </span>
            </div>

            {periodeMode === 'glissante' ? (
              <div className="eo-field">
                <label className="eo-label">Durée</label>
                <DureeLibre
                  jours={dureeGlissante}
                  onChange={setDureeGlissante}
                  unite={uniteAbo}
                  onUnite={setUniteAbo}
                />
                {finGlissanteISO(dureeGlissante) && (
                  <div className="eo-info-pill">
                    <Info size={13} />
                    Vendu aujourd'hui, il irait jusqu'au {formatDate(finGlissanteISO(dureeGlissante))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="eo-row">
                  <div className="eo-field">
                    <label className="eo-label">Début *</label>
                    <input className="izi-input" type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} />
                  </div>
                  <div className="eo-field">
                    <label className="eo-label">Fin *</label>
                    <input className="izi-input" type="date" value={dateFin} min={dateDebut || undefined} onChange={e => setDateFin(e.target.value)} />
                  </div>
                </div>
                {joursValidite > 0 && (
                  <div className="eo-info-pill">
                    <Info size={13} />
                    Durée : {Math.round(joursValidite / 7)} semaines · {joursValidite} jours
                  </div>
                )}
              </>
            )}

            {/* Ce que l'abonnement donne droit à faire — même question qu'à la
                création, même traducteur (lib/offres-seances). */}
            <div className="eo-field">
              <label className="eo-label">Que peut faire l'élève avec cet abonnement ?</label>
              <div className="eo-mode-grid">
                {[
                  { value: MODE_ILLIMITE, titre: "Autant qu'elle veut",  desc: 'Aucune limite' },
                  { value: MODE_CADENCE,  titre: 'X fois par semaine',   desc: 'Sans total à calculer' },
                  { value: MODE_TOTAL,    titre: 'Un nombre de séances', desc: 'Ex : 32 sur la saison' },
                ].map(m => (
                  <button
                    key={m.value}
                    type="button"
                    className={`eo-mode-btn ${modeSeancesAbo === m.value ? 'active' : ''}`}
                    onClick={() => {
                      setModeSeancesAbo(m.value);
                      if (m.value === MODE_CADENCE && !seancesParSemaine) setSeancesParSemaine('1');
                    }}
                  >
                    <span className="eo-mode-titre">{m.titre}</span>
                    <span className="eo-mode-desc">{m.desc}</span>
                  </button>
                ))}
              </div>

              {modeSeancesAbo === MODE_TOTAL && (
                <input
                  className="izi-input" type="number" min="1"
                  value={seances}
                  onChange={e => setSeances(e.target.value)}
                  placeholder="Ex : 32 séances sur toute la période"
                />
              )}

              {(modeSeancesAbo === MODE_CADENCE || modeSeancesAbo === MODE_TOTAL) && (
                <>
                  <label className="eo-label">
                    {modeSeancesAbo === MODE_TOTAL
                      ? <>Cadence maximale <span className="eo-optional">(facultatif)</span></>
                      : 'Combien de fois par semaine ?'}
                  </label>
                  <div className="eo-chips">
                    {modeSeancesAbo === MODE_TOTAL && (
                      <button
                        type="button"
                        className={`eo-chip ${!seancesParSemaine ? 'active' : ''}`}
                        onClick={() => setSeancesParSemaine('')}
                      >
                        Sans limite
                      </button>
                    )}
                    {['1', '2', '3'].map(n => (
                      <button
                        key={n}
                        type="button"
                        className={`eo-chip ${seancesParSemaine === n ? 'active' : ''}`}
                        onClick={() => setSeancesParSemaine(n)}
                      >
                        {n}x/sem
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`eo-chip ${cadenceCustom ? 'active' : ''}`}
                      onClick={() => setSeancesParSemaine('4')}
                    >
                      Autre
                    </button>
                  </div>
                  {cadenceCustom && (
                    <input
                      className="izi-input"
                      type="number" min="1"
                      value={seancesParSemaine}
                      onChange={e => setSeancesParSemaine(e.target.value)}
                      style={{ maxWidth: 120, marginTop: 6 }}
                    />
                  )}
                </>
              )}

              <div className="eo-apercu">
                {apercuSeances({ mode: modeSeancesAbo, total: seances, cadence: seancesParSemaine })}
              </div>
            </div>

            <div className="eo-row">
              <div className="eo-field">
                <label className="eo-label">Vacances scolaires</label>
                <button type="button" className="eo-vacances-toggle" onClick={() => setInclutVacances(v => !v)}>
                  {inclutVacances
                    ? <><ToggleRight size={22} style={{ color: 'var(--brand)' }} /> Incluses</>
                    : <><ToggleLeft size={22} style={{ color: 'var(--text-muted)' }} /> Exclues</>
                  }
                </button>
              </div>
            </div>

            {periodeMode === 'fixe' && (
            <div className="eo-field">
              <label className="eo-label">
                Pro-rata en cours de période <span className="eo-optional">(optionnel)</span>
              </label>
              <button type="button" className="eo-vacances-toggle" onClick={() => setProRataActif(v => !v)}>
                {proRataActif
                  ? <><ToggleRight size={22} style={{ color: 'var(--brand)' }} /> Activé : prix ajusté aux semaines restantes</>
                  : <><ToggleLeft size={22} style={{ color: 'var(--text-muted)' }} /> Désactivé : plein tarif toute la période</>
                }
              </button>
              {proRataActif && (
                <>
                  <label className="eo-label" style={{ marginTop: 4 }}>
                    Jusqu'à quelle date ? <span className="eo-optional">(vide = jusqu'à la fin)</span>
                  </label>
                  <input
                    className="izi-input"
                    type="date"
                    value={proRataDateLimite}
                    min={dateDebut || undefined}
                    max={dateFin || undefined}
                    onChange={e => setProRataDateLimite(e.target.value)}
                    style={{ maxWidth: 220 }}
                  />
                  {(() => {
                    const today = aujourdhuiISO();
                    const r = calcProRata({ dateDebut, dateFin, prix, dateRef: today, dateLimite: proRataDateLimite || null });
                    const totalSem = Math.max(1, Math.round((joursValidite || 0) / 7));
                    if (!prix || !dateDebut || !dateFin) return null;
                    return (
                      <div className="eo-info-pill" style={{ display: 'block', marginTop: 8 }}>
                        Prix / semaine : <strong>{formatMontant(parseFloat(prix) / totalSem)}</strong> ({formatMontant(parseFloat(prix))} ÷ {totalSem} semaines).{' '}
                        {r
                          ? <>Aujourd'hui : reste <strong>{r.resteSemaines} semaine{r.resteSemaines > 1 ? 's' : ''}</strong> sur {r.totalSemaines} → pro-rata <strong>{formatMontant(r.montant)}</strong> (arrondi aux 0,50 €).</>
                          : <>Aujourd'hui : {today <= dateDebut ? 'prix plein (période pas commencée)' : 'souscription fermée (date limite passée ou période finie)'}.</>}
                        {' '}La durée totale ne bouge pas : ce sont les semaines restantes qui baissent.
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
            )}
          </>
        )}

        {/* Vaut pour quels cours ? (types_cours_autorises) */}
        {(type === 'carnet' || type === 'abonnement') && typesCoursDisponibles.length > 0 && (
          <div className="eo-field">
            <label className="eo-label">
              Vaut pour quels cours ?
              <span className="eo-optional"> (décide quand ce {type === 'carnet' ? 'carnet' : 'abonnement'} se décompte)</span>
            </label>
            <div className="eo-chips">
              {typesCoursDisponibles.map(t => {
                const selected = typesCoursAutorises.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    className={`eo-chip ${selected ? 'active' : ''}`}
                    onClick={() => setTypesCoursAutorises(prev => selected ? prev.filter(x => x !== t) : [...prev, t])}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            {typesCoursAutorises.length === 0 ? (
              <span className="eo-optional">
                ✓ Tous tes cours : utilisable sur n'importe quel type.<br />
                💡 Sélectionne les types couverts pour <strong>exclure</strong> les cours vendus à la séance (atelier, stage, renfo…), sinon ce {type === 'carnet' ? 'carnet' : 'abonnement'} pourra aussi les payer.
              </span>
            ) : (
              <span className="eo-optional">
                Restreint aux cours de type <strong>{typesCoursAutorises.join(', ')}</strong> : sur un autre type, l'élève paiera à la séance.
              </span>
            )}
            <CoherenceTypesHint typesAutorises={typesCoursAutorises} />
          </div>
        )}

        {/* Nom + Prix */}
        <div className="eo-divider" />

        <div className="eo-field">
          <label className="eo-label">Nom de l'offre *</label>
          <input className="izi-input" type="text" value={nom} onChange={e => setNom(e.target.value)} required />
        </div>

        <div className="eo-field">
          <label className="eo-label">Prix *</label>
          <div className="eo-prix-wrap">
            <input
              className="izi-input eo-prix-input"
              type="number" step="0.01" min="0" inputMode="decimal"
              value={prix} onChange={e => setPrix(e.target.value)} required
            />
            <span className="eo-currency">€</span>
          </div>
        </div>

        {/* Stripe link */}
        <div className="eo-field">
          <label className="eo-label">Lien Stripe Payment Link <span className="eo-optional">(optionnel)</span></label>
          <input
            className="izi-input"
            type="url"
            value={stripePaymentLink}
            onChange={e => setStripePaymentLink(e.target.value)}
            placeholder="https://buy.stripe.com/..."
          />
        </div>

        <button type="submit" className="izi-btn izi-btn-primary eo-submit" disabled={saving || !canSubmit}>
          {saving
            ? <><Loader2 size={16} className="spin" /> Enregistrement...</>
            : <><Save size={18} /> Enregistrer les modifications</>
          }
        </button>
      </form>

      <style jsx global>{`
        .eo-page { display: flex; flex-direction: column; gap: 20px; padding-bottom: 48px; }
        .eo-loading { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 60px; color: var(--text-muted); }
        .eo-header { display: flex; align-items: center; gap: 12px; }
        .eo-header h1 { font-size: 1.25rem; font-weight: 700; }
        .back-btn {
          width: 40px; height: 40px; border-radius: var(--radius-sm);
          border: 1px solid var(--border); background: var(--bg-card);
          display: flex; align-items: center; justify-content: center;
          color: var(--text-secondary); text-decoration: none; flex-shrink: 0;
        }
        .eo-form { display: flex; flex-direction: column; gap: 18px; }
        .eo-field { display: flex; flex-direction: column; gap: 7px; }
        .eo-label { font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); }
        .eo-optional { font-weight: 400; color: var(--text-muted); font-size: 0.75rem; }
        .eo-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .eo-divider { border: none; border-top: 1px solid var(--border); margin: 2px 0; }

        .eo-type-grid { display: flex; flex-direction: column; gap: 6px; }
        .eo-type-card {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; border-radius: var(--radius-md);
          border: 2px solid var(--border); background: var(--bg-card);
          cursor: pointer; text-align: left; transition: all var(--transition-fast);
          color: var(--text-secondary);
        }
        .eo-type-card.selected { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
        .eo-type-label { font-weight: 600; font-size: 0.9rem; }
        .eo-type-desc { font-size: 0.75rem; color: var(--text-muted); margin-top: 1px; }

        .eo-info-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 12px; border-radius: var(--radius-full);
          background: var(--brand-light); color: var(--brand-700);
          font-size: 0.8125rem; font-weight: 600; align-self: flex-start;
        }
        .eo-toggle-row { display: flex; gap: 8px; }
        .eo-toggle-btn {
          flex: 1; padding: 8px 12px; border-radius: var(--radius-full);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .eo-toggle-btn.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }

        .eo-mode-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
        .eo-mode-btn {
          display: flex; flex-direction: column; gap: 2px; text-align: left;
          padding: 10px 12px; border-radius: var(--radius-md);
          border: 1.5px solid var(--border); background: var(--bg-card);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .eo-mode-btn.active { border-color: var(--brand); background: var(--brand-light); }
        .eo-mode-titre { font-size: 0.8125rem; font-weight: 700; color: var(--text-secondary); }
        .eo-mode-btn.active .eo-mode-titre { color: var(--brand-700); }
        .eo-mode-desc { font-size: 0.7rem; font-weight: 500; color: var(--text-muted); }
        .eo-apercu {
          font-size: 0.8125rem; font-weight: 600; color: var(--brand-700);
          background: var(--brand-light); border-radius: var(--radius-full);
          padding: 5px 12px; align-self: flex-start;
        }
        @media (max-width: 640px) {
          .eo-mode-grid { grid-template-columns: 1fr; }
        }
        .eo-chips { display: flex; gap: 6px; flex-wrap: wrap; }
        .eo-chip {
          padding: 6px 12px; border-radius: var(--radius-full);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .eo-chip.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }

        .eo-vacances-toggle {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 8px 12px; border-radius: var(--radius-md);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.875rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; align-self: flex-start;
        }

        .eo-prix-wrap { position: relative; }
        .eo-prix-input { padding-right: 28px !important; }
        .eo-currency {
          position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
          font-weight: 600; color: var(--text-secondary); pointer-events: none;
        }

        .eo-submit { width: 100%; margin-top: 4px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
