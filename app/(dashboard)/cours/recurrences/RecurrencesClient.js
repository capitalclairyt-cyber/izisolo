'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Repeat, Calendar, ChevronLeft, ChevronRight, Plus, Trash2,
  Sun, AlertTriangle, ToggleRight, ToggleLeft, X, Pencil, Save, CalendarPlus,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { getAllTypesFromCategories } from '@/lib/utils';
import { semainesEntre } from '@/lib/dates';
import { presenceEstReservationActive } from '@/lib/presences';
import { useToast } from '@/components/ui/ToastProvider';
import {
  estPendantVacances, estJourFerie, getPeriodeVacances, ZONES_VACANCES,
  VACANCES_COUVERTURE_MAX, FERIES_COUVERTURE_MAX,
} from '@/lib/vacances-scolaires';

const JOURS_LABEL = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${j}`;
}

function freqLabel(rec) {
  if (rec.frequence === 'hebdomadaire') return 'Chaque semaine';
  if (rec.frequence === 'bimensuel') return 'Toutes les 2 semaines';
  if (rec.frequence === 'mensuel') return 'Une fois par mois';
  if (rec.frequence === 'quotidien') return 'Tous les jours';
  if (rec.frequence === 'personnalise') {
    const jours = (rec.jours_semaine || []).map(j => JOURS_LABEL[j - 1]).join(', ');
    return jours || 'Personnalisé';
  }
  return rec.frequence;
}

export default function RecurrencesClient({ recurrences: initialRecurrences, cours: initialCours, profile, initialRecId = null, autoEdit = false, autoAjuster = false }) {
  const router = useRouter();
  const { toast } = useToast();
  const [recurrences, setRecurrences] = useState(initialRecurrences);
  const [cours, setCours] = useState(initialCours);
  // Pré-sélection depuis le crayon d'une série (?rec=<id>) sinon la 1re.
  const [selectedRecId, setSelectedRecId] = useState(
    (initialRecId && initialRecurrences.some(r => r.id === initialRecId) ? initialRecId : initialRecurrences[0]?.id) || null
  );
  const [monthOffset, setMonthOffset] = useState(0); // 0 = mois courant
  const [actionPending, setActionPending] = useState(null); // ISO date en cours

  // Édition nom + type de la série (le crayon des cours récurrents atterrit ici
  // quand la série n'a pas d'occurrence future → il faut pouvoir éditer d'ici).
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ nom: '', type_cours: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const typesCours = getAllTypesFromCategories(profile?.types_cours);

  // ── Ajuster la série (né « Prolonger », retour Maude 2026-07-23 ; étendu le
  // 2026-08-21, retour Colin : réduire une série obligeait à la supprimer et
  // la recréer — perte des inscrits et de l'historique). Le même panneau gère
  // désormais les DEUX sens : nouvelle date de fin plus loin = création des
  // occurrences manquantes, plus proche = suppression des séances au-delà
  // (JAMAIS une séance avec inscrits ou historique), et le comblement des
  // trous de la fenêtre existante (case vacances) grâce à la dédup complète.
  const [prolonger, setProlonger] = useState(false);
  const [prolongerFin, setProlongerFin] = useState('');
  const [prolongeant, setProlongeant] = useState(false);
  // Dates RÉELLES de la série (fetch à l'ouverture du panneau) : la fenêtre
  // serveur (+365 j, cap PostgREST 1000) pouvait manquer des occurrences →
  // la dédup laissait passer des doublons à la prolongation (B1b).
  const [prolongerExistantes, setProlongerExistantes] = useState(null);
  // Occurrences FUTURES {id, date} (candidates à la réduction) + séances
  // protégées (historique pointé ou réservation active) : jamais supprimées
  // par l'ajustement. Erreur de lecture = tout protégé (fail-closed).
  const [prolongerFutures, setProlongerFutures] = useState([]);
  const [prolongerProteges, setProlongerProteges] = useState(new Set());
  // Une série « hors vacances » prolongée sur l'été donnerait 0 séance (été =
  // 04/07→31/08 dans le référentiel). Or c'est exactement le cas d'usage de
  // Maude : des cours d'été. Cette case permet d'outrepasser l'exclusion POUR
  // CETTE prolongation, sans toucher la config de la série.
  const [prolongerInclureVacances, setProlongerInclureVacances] = useState(false);
  useEffect(() => { setProlonger(false); }, [selectedRecId]);

  const selected = recurrences.find(r => r.id === selectedRecId);

  const ouvrirEdition = () => {
    if (!selected) return;
    setEditForm({ nom: selected.nom || '', type_cours: selected.type_cours || '' });
    setEditing(true);
  };

  const enregistrerEdition = async () => {
    if (!selected) return;
    const nom = editForm.nom.trim();
    if (!nom) { toast.error('Le nom ne peut pas être vide'); return; }
    setSavingEdit(true);
    const supabase = createClient();
    const today = toISO(new Date());
    const type_cours = editForm.type_cours || null;
    try {
      // 1) La récurrence elle-même
      const { error: e1 } = await supabase
        .from('recurrences')
        .update({ nom, type_cours })
        .eq('id', selected.id);
      if (e1) throw e1;
      // 2) Les occurrences futures (les passées restent inchangées)
      const { error: e2 } = await supabase
        .from('cours')
        .update({ nom, type_cours })
        .eq('recurrence_parent_id', selected.id)
        .gte('date', today);
      if (e2) throw e2;

      setRecurrences(prev => prev.map(r => r.id === selected.id ? { ...r, nom, type_cours } : r));
      setCours(prev => prev.map(c => c.recurrence_parent_id === selected.id && c.date >= today ? { ...c, nom } : c));
      setEditing(false);
      toast.success('Série mise à jour ✓');
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Ouvre l'édition directement si on arrive depuis le crayon d'une série (?edit=1).
  useEffect(() => {
    if (autoEdit && selected) {
      setEditForm({ nom: selected.nom || '', type_cours: selected.type_cours || '' });
      setEditing(true);
    }
    // ?ajuster=1 : on arrive depuis la fiche d'un cours, où la prof cherchait
    // le nombre de séances de sa série (retour Léa 2026-08-21). On ouvre le
    // panneau directement plutôt que de la laisser le chercher ici aussi.
    if (autoAjuster && selected) setProlonger(true);
    // au montage uniquement
  }, []);

  // Cours futurs liés à la récurrence sélectionnée
  const coursDeRec = useMemo(() => {
    if (!selectedRecId) return [];
    return cours.filter(c => c.recurrence_parent_id === selectedRecId);
  }, [cours, selectedRecId]);

  // Date du mois affiché
  const monthDate = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const monthLabel = monthDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  // Construit la grille du mois (cellules par jour, lundi en premier)
  const grid = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const firstWeekday = first.getDay() === 0 ? 7 : first.getDay(); // 1=lundi…7=dim
    const cells = [];

    // Padding en début de mois pour aligner sur lundi
    for (let i = 1; i < firstWeekday; i++) cells.push(null);

    for (let d = 1; d <= last.getDate(); d++) {
      const date = new Date(year, month, d);
      const iso = toISO(date);
      const coursDuJour = coursDeRec.find(c => c.date === iso);
      const dansVacances = selected?.zone_vacances ? estPendantVacances(iso, selected.zone_vacances) : false;
      const ferie = estJourFerie(iso);
      cells.push({
        date, iso,
        cours: coursDuJour,
        dansVacances,
        ferie,
        periodeVacances: dansVacances && selected ? getPeriodeVacances(iso, selected.zone_vacances) : null,
      });
    }
    return cells;
  }, [monthDate, coursDeRec, selected]);

  const totalCoursFuturs = coursDeRec.length;

  // ─── Actions ─────────────────────────────────────────────────────────────
  const supprimerCours = async (coursId, iso) => {
    const supabase = createClient();
    // Garde-fou (audits 2026-07-25) : historique pointé ET réservations
    // actives (statut NULL) comptés — avant, 8 réservations partaient en
    // cascade sans qu'aucun élève ne soit prévenu. Erreur de lecture →
    // confirmation forte par défaut (fail-closed).
    const { data: presRows, error: presReadErr } = await supabase
      .from('presences')
      .select('statut_pointage, annulation_tardive')
      .eq('cours_id', coursId);
    const rows = presRows || [];
    const nbHisto = presReadErr ? 1 : rows.filter(p =>
      ['present', 'absent', 'excuse', 'absent_compte'].includes(p.statut_pointage) || p.annulation_tardive
    ).length;
    // Réservation active = statut 'inscrit' (DEFAULT v5 — jamais NULL en prod).
    const nbResas = presReadErr ? 0 : rows.filter(presenceEstReservationActive).length;
    const ok = confirm(nbHisto > 0
      ? `⚠️ Cette séance a ${nbHisto} présence${nbHisto > 1 ? 's' : ''} pointée${nbHisto > 1 ? 's' : ''} ou sanctionnée${nbHisto > 1 ? 's' : ''} — la supprimer efface définitivement cet historique (sans recréditer les carnets).\n\nSi la séance n'a pas lieu, préfère « Annuler » (prévient les élèves et recrédite).\n\nSupprimer quand même ?`
      : nbResas > 0
        ? `⚠️ ${nbResas} élève${nbResas > 1 ? 's ont' : ' a'} RÉSERVÉ cette séance — la supprimer efface ${nbResas > 1 ? 'leurs réservations' : 'sa réservation'} SANS prévenir personne.\n\nPréfère « Annuler la séance » (depuis le détail du cours) : les élèves reçoivent un email et les carnets sont recrédités.\n\nSupprimer quand même ?`
        : `Supprimer la séance du ${iso.split('-').reverse().join('/')} ?`);
    if (!ok) return;
    setActionPending(iso);
    const { error } = await supabase.from('cours').delete().eq('id', coursId);
    if (error) {
      toast.error('Erreur : ' + error.message);
    } else {
      setCours(prev => prev.filter(c => c.id !== coursId));
      toast.success('Séance supprimée');
    }
    setActionPending(null);
  };

  const ajouterCours = async (iso) => {
    if (!selected) return;
    setActionPending(iso);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    // La table recurrences ne porte pas tarif_unitaire (payable à la séance) :
    // on le recopie depuis le cours le plus récent de la série pour que
    // l'occurrence ajoutée garde le même modèle de paiement.
    let tarifUnitaire = null;
    let carnetsAcceptes = false;
    let lienPaiement = null;
    let visibilite = null;
    let lieuTexte = null;
    try {
      const { data: frere } = await supabase
        .from('cours')
        .select('tarif_unitaire, carnets_acceptes, stripe_payment_link_unit, visibilite, lieu')
        .eq('recurrence_parent_id', selected.id)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();
      tarifUnitaire = frere?.tarif_unitaire ?? null;
      carnetsAcceptes = frere?.carnets_acceptes === true;
      lienPaiement = frere?.stripe_payment_link_unit ?? null;
      visibilite = frere?.visibilite ?? null;
      lieuTexte = frere?.lieu ?? null;
    } catch { /* pas de frère : défauts */ }
    // Audit 2026-07-25 : l'occurrence ajoutée perdait la capacité (null codé en
    // dur) ET la visibilité (défaut DB 'public') → une occurrence d'une série
    // « réservé abonnés, 8 places » devenait publique et sans jauge. On recopie
    // tout, y compris les champs domicile (v44) portés par la récurrence.
    const { data, error } = await supabase.from('cours').insert({
      profile_id: user.id,
      nom: selected.nom,
      type_cours: selected.type_cours,
      date: iso,
      heure: selected.heure,
      duree_minutes: selected.duree_minutes,
      lieu_id: selected.lieu_id,
      // `lieu` (texte) est ce qu'affichent portail + espace élève : sans lui,
      // l'occurrence ajoutée apparaissait SANS lieu chez les élèves (B1b).
      lieu: lieuTexte,
      capacite_max: selected.capacite_max ?? null,
      visibilite: visibilite || 'public',
      recurrence_parent_id: selected.id,
      tarif_unitaire: tarifUnitaire,
      carnets_acceptes: carnetsAcceptes,
      stripe_payment_link_unit: lienPaiement,
      client_pro_id: selected.client_pro_id || null,
      ...(selected.domicile ? {
        domicile: true,
        client_id: selected.client_id || null,
        frais_deplacement: selected.frais_deplacement ?? null,
      } : {}),
    }).select().single();
    if (error) {
      toast.error('Erreur : ' + error.message);
    } else {
      // Cours à domicile : l'élève du cours est inscrite d'office (comme à la
      // création de série) — erreur LUE (les inserts muets ont assez sévi).
      if (selected.domicile && selected.client_id && data) {
        const { error: presErr } = await supabase.from('presences').insert({
          profile_id: user.id,
          cours_id: data.id,
          client_id: selected.client_id,
        });
        if (presErr) toast.warning('Séance créée, mais l\'inscription de l\'élève a échoué : ' + presErr.message);
      }
      setCours(prev => [...prev, data]);
      toast.success('Séance ajoutée');
    }
    setActionPending(null);
  };

  const toggleActif = async (rec) => {
    const supabase = createClient();
    const { error } = await supabase.from('recurrences').update({ actif: !rec.actif }).eq('id', rec.id);
    if (error) {
      toast.error('Erreur : ' + error.message);
      return;
    }
    setRecurrences(prev => prev.map(r => r.id === rec.id ? { ...r, actif: !r.actif } : r));
    // Honnêteté (B1b) : `actif` n'est lu par AUCUN générateur — rien ne crée
    // de séances en continu. La pause est un repère visuel, on le dit.
    toast.success(rec.actif
      ? 'Série mise en pause (repère visuel — les séances déjà créées restent en place)'
      : 'Série réactivée');
  };

  const supprimerRecurrence = async (rec) => {
    if (!confirm(`Supprimer la récurrence "${rec.nom}" ET tous ses ${coursDeRec.length} cours futurs ?`)) return;
    const supabase = createClient();
    // Garde-fou : des présences déjà pointées dans le périmètre (ex. cours du
    // jour déjà pointé) seraient effacées en cascade avec leur historique.
    const { data: coursCibles } = await supabase
      .from('cours').select('id')
      .eq('recurrence_parent_id', rec.id).gte('date', toISO(new Date()));
    const ids = (coursCibles || []).map(c => c.id);
    if (ids.length > 0) {
      // Historique pointé ET réservations actives — erreur de lecture =
      // confirmation forte (fail-closed), plus jamais de fail-open muet.
      const { data: presRows, error: presReadErr } = await supabase
        .from('presences')
        .select('statut_pointage, annulation_tardive')
        .in('cours_id', ids);
      const rows = presRows || [];
      const nbHisto = presReadErr ? 1 : rows.filter(p =>
        ['present', 'absent', 'excuse', 'absent_compte'].includes(p.statut_pointage) || p.annulation_tardive
      ).length;
      const nbResas = presReadErr ? 0 : rows.filter(presenceEstReservationActive).length;
      if (nbHisto > 0 && !confirm(
        `⚠️ ${nbHisto} présence${nbHisto > 1 ? 's' : ''} déjà pointée${nbHisto > 1 ? 's' : ''} sur ces cours ` +
        `— la suppression efface définitivement cet historique et détache les paiements liés.\n\nSupprimer quand même ?`
      )) return;
      if (nbResas > 0 && !confirm(
        `⚠️ ${nbResas} réservation${nbResas > 1 ? 's' : ''} active${nbResas > 1 ? 's' : ''} sur les séances à venir — ` +
        `la suppression les efface SANS prévenir les élèves.\n\nPréfère « Annuler » chaque séance concernée (les élèves reçoivent un email et les carnets sont recrédités).\n\nSupprimer quand même ?`
      )) return;
    }
    // Supprime d'abord les cours futurs liés — et s'arrête si ça échoue
    // (avant : la récurrence était supprimée quand même → cours orphelins
    // toujours à l'agenda avec un toast « Récurrence supprimée »).
    const { error: delCoursErr } = await supabase
      .from('cours').delete()
      .eq('recurrence_parent_id', rec.id).gte('date', toISO(new Date()));
    if (delCoursErr) {
      toast.error('Suppression des séances échouée : ' + delCoursErr.message);
      return;
    }
    // Puis la récurrence
    const { error } = await supabase.from('recurrences').delete().eq('id', rec.id);
    if (error) {
      toast.error('Séances supprimées, mais la série reste listée : ' + error.message);
    } else {
      const restantes = recurrences.filter(r => r.id !== rec.id);
      setRecurrences(prev => prev.filter(r => r.id !== rec.id));
      setCours(prev => prev.filter(c => c.recurrence_parent_id !== rec.id));
      setSelectedRecId(restantes[0]?.id || null);
      toast.success('Récurrence supprimée');
    }
  };

  // ── Ajuster la série (générateur commun) ─────────────────────────────────
  // Génère les occurrences manquantes jusqu'à la nouvelle date de fin, avec
  // EXACTEMENT les règles de la création (cours/nouveau calculerDates) :
  // jour ancré sur date_debut, parité bimensuelle ancrée sur date_debut,
  // jours fériés / vacances scolaires exclus selon la config de la série.
  const genererDatesProlongation = (rec, depuisISO, finISO, dejaPris, inclureVacances = false) => {
    const incluses = [], exclues = [];
    if (!rec?.date_debut) return { incluses, exclues };
    const anchor = new Date(rec.date_debut + 'T12:00:00');
    const startDay = anchor.getDay() === 0 ? 7 : anchor.getDay();
    const cursor = new Date(depuisISO + 'T12:00:00');
    const limite = new Date(finISO + 'T12:00:00');
    let safety = 0;
    while (cursor <= limite && safety < 800) {
      safety++;
      const day = cursor.getDay() === 0 ? 7 : cursor.getDay();
      let include = false;
      if (rec.frequence === 'quotidien') include = true;
      else if (rec.frequence === 'hebdomadaire') include = day === startDay;
      else if (rec.frequence === 'bimensuel') {
        // Jours civils via Date.UTC : le calcul en millisecondes locales
        // perdait 1 h à l'heure d'été → parité décalée d'une semaine sur
        // toute prolongation estivale d'une série ancrée en hiver (B1b).
        include = day === startDay && semainesEntre(anchor, cursor) % 2 === 0;
      } else if (rec.frequence === 'mensuel') include = cursor.getDate() === anchor.getDate();
      else if (rec.frequence === 'personnalise') include = (rec.jours_semaine || []).includes(day);

      if (include) {
        const iso = toISO(cursor);
        if (dejaPris?.has(iso)) {
          // occurrence déjà existante → on ne double pas
        } else if (rec.exclure_feries && estJourFerie(iso)) {
          exclues.push({ iso, raison: 'férié' });
        } else if (!inclureVacances && rec.exclure_vacances && rec.zone_vacances && getPeriodeVacances(iso, rec.zone_vacances)) {
          exclues.push({ iso, raison: 'vacances' });
        } else {
          incluses.push(iso);
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return { incluses, exclues };
  };

  const previewProlongation = useMemo(() => {
    if (!prolonger || !selected || !prolongerFin) return null;
    const today = toISO(new Date());
    // Source des dates existantes : le fetch complet de la série si dispo
    // (sinon la fenêtre serveur, en attendant qu'il arrive).
    const datesExistantes = prolongerExistantes
      ? [...prolongerExistantes]
      : coursDeRec.map(c => c.date);
    // Génération depuis AUJOURD'HUI (et plus depuis la dernière occurrence) :
    // la dédup complète skippe l'existant, et c'est ce qui permet de COMBLER
    // les trous de la fenêtre déjà créée (ex. cocher « pendant les vacances »
    // sur une série qui les excluait : les dates d'été manquantes ressortent).
    const depuis = today;
    const dejaPris = new Set(datesExistantes);
    const generation = prolongerFin >= depuis
      ? genererDatesProlongation(selected, depuis, prolongerFin, dejaPris, prolongerInclureVacances)
      : { incluses: [], exclues: [] };
    // Réduction : les occurrences futures APRÈS la nouvelle fin. Celles avec
    // inscrits ou historique sont conservées (à annuler individuellement,
    // pour que les élèves soient prévenues) — les vides sont supprimables.
    const auDela = prolongerFutures.filter(c => c.date > prolongerFin);
    const supprimables = auDela.filter(c => !prolongerProteges.has(c.id));
    const conservees = auDela.filter(c => prolongerProteges.has(c.id));
    return { ...generation, depuis, supprimables, conservees };
  }, [prolonger, selected, prolongerFin, coursDeRec, prolongerInclureVacances, prolongerExistantes, prolongerFutures, prolongerProteges]);

  const ouvrirProlonger = async () => {
    if (!selected) return;
    // Par défaut : la fin ACTUELLE de la série (les deux sens sont possibles),
    // sinon la dernière occurrence connue, sinon +8 semaines.
    const dernieresConnues = coursDeRec.map(c => c.date).sort();
    let finDefaut = selected.date_fin || dernieresConnues[dernieresConnues.length - 1];
    if (!finDefaut || finDefaut < toISO(new Date())) {
      const d = new Date();
      d.setDate(d.getDate() + 7 * 8);
      finDefaut = toISO(d);
    }
    setProlongerFin(finDefaut);
    setProlongerInclureVacances(false);
    setProlongerExistantes(null);
    setProlongerFutures([]);
    setProlongerProteges(new Set());
    setProlonger(true);
    // Dédup sur les dates RÉELLES de la série, sans fenêtre ni cap — et ids
    // des occurrences futures pour la réduction.
    const supabase = createClient();
    const { data, error } = await supabase
      .from('cours')
      .select('id, date')
      .eq('recurrence_parent_id', selected.id);
    if (error || !data) {
      if (error) toast.error('Lecture des séances existantes impossible : ' + error.message);
      return;
    }
    setProlongerExistantes(new Set(data.map(c => c.date)));
    const today = toISO(new Date());
    const futures = data.filter(c => c.date >= today);
    setProlongerFutures(futures);
    // Séances protégées : historique pointé/sanctionné OU réservation active.
    // Erreur de lecture → TOUT protégé (fail-closed, aucune suppression).
    if (futures.length > 0) {
      const { data: presRows, error: presErr } = await supabase
        .from('presences')
        .select('cours_id, statut_pointage, annulation_tardive')
        .in('cours_id', futures.map(c => c.id));
      if (presErr) {
        setProlongerProteges(new Set(futures.map(c => c.id)));
        toast.error('Lecture des inscriptions impossible — la réduction est désactivée par prudence : ' + presErr.message);
      } else {
        const proteges = new Set();
        for (const p of (presRows || [])) {
          const histo = ['present', 'absent', 'excuse', 'absent_compte'].includes(p.statut_pointage) || p.annulation_tardive;
          if (histo || presenceEstReservationActive(p)) proteges.add(p.cours_id);
        }
        setProlongerProteges(proteges);
      }
    }
  };

  const prolongerSerie = async () => {
    if (!selected || !previewProlongation) return;
    const { incluses, supprimables, conservees } = previewProlongation;
    const rienAFaire = incluses.length === 0 && supprimables.length === 0
      && (selected.date_fin || null) === prolongerFin;
    if (rienAFaire) return;
    // Pas d'écriture tant que la dédup complète n'est pas chargée (le fetch
    // de l'ouverture du panneau prend < 1 s ; en cas d'échec, un toast l'a dit).
    if (!prolongerExistantes) { toast.error('Un instant — vérification des séances existantes…'); return; }
    // Réduction : confirmation honnête (les vides seulement, les protégées
    // restent et sont annoncées).
    if (supprimables.length > 0) {
      const ok = confirm(
        `${supprimables.length} séance${supprimables.length > 1 ? 's' : ''} SANS inscrite ni historique après le ${prolongerFin.split('-').reverse().join('/')} ser${supprimables.length > 1 ? 'ont' : 'a'} supprimée${supprimables.length > 1 ? 's' : ''}.`
        + (conservees.length > 0
          ? `\n\n${conservees.length} séance${conservees.length > 1 ? 's' : ''} avec inscrites ou historique ${conservees.length > 1 ? 'sont' : 'est'} CONSERVÉE${conservees.length > 1 ? 'S' : ''} : annule-les depuis le détail du cours pour prévenir les élèves.`
          : '')
        + '\n\nContinuer ?'
      );
      if (!ok) return;
    }
    setProlongeant(true);
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // ── Réduction : suppression des occurrences vides au-delà de la fin ──
      let nbSupprimees = 0;
      if (supprimables.length > 0) {
        const ids = supprimables.map(c => c.id);
        const { error: delErr } = await supabase.from('cours').delete().in('id', ids);
        if (delErr) throw new Error('Suppression échouée : ' + delErr.message);
        nbSupprimees = ids.length;
        const idsSet = new Set(ids);
        const datesSupprimees = new Set(supprimables.map(c => c.date));
        setCours(prev => prev.filter(c => !idsSet.has(c.id)));
        setProlongerFutures(prev => prev.filter(c => !idsSet.has(c.id)));
        setProlongerExistantes(prev => {
          const s = new Set(prev || []);
          for (const d of datesSupprimees) s.delete(d);
          return s;
        });
      }
      // ── Extension / comblement : création des occurrences manquantes ──
      let crees = [];
      if (incluses.length > 0) {
      // Champs portés par les COURS (pas par la récurrence) : recopiés du
      // cours le plus récent de la série (lieu texte, visibilité, tarif à la
      // séance) — même logique que l'ajout d'occurrence manuel.
      const { data: frere } = await supabase
        .from('cours')
        .select('lieu, visibilite, tarif_unitaire, carnets_acceptes, stripe_payment_link_unit')
        .eq('recurrence_parent_id', selected.id)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const rows = incluses.map(iso => ({
        profile_id: user.id,
        nom: selected.nom,
        type_cours: selected.type_cours || null,
        date: iso,
        heure: selected.heure || null,
        duree_minutes: selected.duree_minutes || 60,
        lieu_id: selected.lieu_id || null,
        lieu: frere?.lieu ?? null,
        capacite_max: selected.capacite_max ?? null,
        recurrence_parent_id: selected.id,
        visibilite: frere?.visibilite || 'public',
        tarif_unitaire: frere?.tarif_unitaire ?? null,
        carnets_acceptes: frere?.carnets_acceptes === true,
        stripe_payment_link_unit: frere?.stripe_payment_link_unit ?? null,
        client_pro_id: selected.client_pro_id || null,
        // Série à domicile (v44) : recopiée depuis la récurrence (audit
        // 2026-07-25 : prolonger oubliait le domicile → occurrences sans
        // l'élève, invisibles dans son espace).
        ...(selected.domicile ? {
          domicile: true,
          client_id: selected.client_id || null,
          frais_deplacement: selected.frais_deplacement ?? null,
        } : {}),
      }));

      const { data: inseres, error } = await supabase
        .from('cours')
        .insert(rows)
        .select('id, nom, date, heure, recurrence_parent_id, est_annule');
      if (error) throw error;
      crees = inseres || [];

      // Domicile : inscrire l'élève d'office sur chaque nouvelle occurrence
      // (comme à la création de la série) — erreur LUE.
      if (selected.domicile && selected.client_id && crees.length > 0) {
        const { error: presErr } = await supabase.from('presences').insert(
          crees.map(c => ({ profile_id: user.id, cours_id: c.id, client_id: selected.client_id }))
        );
        if (presErr) toast.warning('Séances créées, mais inscription de l\'élève échouée : ' + presErr.message);
      }

      // L'état local est mis à jour DÈS l'insert réussi : si l'update de
      // date_fin échoue ensuite, un re-clic ne peut plus dupliquer (la dédup
      // voit les nouvelles dates) — avant : « Erreur » + re-clic = doublons.
      setCours(prev => [...prev, ...crees].sort((a, b) => a.date.localeCompare(b.date)));
      setProlongerExistantes(prev => {
        const s = new Set(prev || []);
        for (const c of crees) s.add(c.date);
        return s;
      });
      setProlongerFutures(prev => [...prev, ...crees.map(c => ({ id: c.id, date: c.date }))]);
      } // fin incluses > 0

      const { error: recErr } = await supabase
        .from('recurrences')
        .update({ date_fin: prolongerFin })
        .eq('id', selected.id);
      if (recErr) {
        toast.warning(`Séances ajustées, mais la date de fin de la série n'a pas pu être enregistrée (${recErr.message}).`);
      } else {
        setRecurrences(prev => prev.map(r => r.id === selected.id ? { ...r, date_fin: prolongerFin } : r));
      }
      setProlonger(false);
      const morceaux = [];
      if (crees.length > 0) morceaux.push(`${crees.length} séance${crees.length > 1 ? 's' : ''} créée${crees.length > 1 ? 's' : ''}`);
      if (nbSupprimees > 0) morceaux.push(`${nbSupprimees} supprimée${nbSupprimees > 1 ? 's' : ''}`);
      if (conservees.length > 0) morceaux.push(`${conservees.length} conservée${conservees.length > 1 ? 's' : ''} (inscrites/historique)`);
      const finLabel = new Date(prolongerFin + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
      toast.success(`Série ajustée jusqu'au ${finLabel} : ${morceaux.length ? morceaux.join(' · ') : 'date de fin mise à jour'} ✓`);
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setProlongeant(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  if (recurrences.length === 0) {
    return (
      <div className="rec-page">
        <header className="rec-header">
          <Link href="/cours" className="back-btn"><ArrowLeft size={18} /></Link>
          <div>
            <h1>Mes cours récurrents</h1>
            <p className="rec-subtitle">Gère tes séries de cours en un coup d'œil</p>
          </div>
        </header>
        <div className="rec-empty izi-card">
          <div className="rec-empty-icon"><Repeat size={28} /></div>
          <p className="rec-empty-title">Tu n'as aucune série de cours récurrents pour l'instant.</p>
          <p className="rec-empty-desc">Crée ton premier cours récurrent en choisissant "Chaque semaine" dans le formulaire.</p>
          <Link href="/cours/nouveau" className="izi-btn izi-btn-primary">
            <Plus size={16} /> Nouveau cours
          </Link>
        </div>
        {styleBlock}
      </div>
    );
  }

  return (
    <div className="rec-page">
      <header className="rec-header">
        <Link href="/cours" className="back-btn"><ArrowLeft size={18} /></Link>
        <div style={{ flex: 1 }}>
          <h1>Mes cours récurrents</h1>
          <p className="rec-subtitle">{recurrences.length} série{recurrences.length > 1 ? 's' : ''} active{recurrences.length > 1 ? 's' : ''}</p>
        </div>
        <Link href="/cours/nouveau" className="izi-btn izi-btn-secondary">
          <Plus size={16} /> Nouvelle série
        </Link>
      </header>

      {/* Liste des récurrences (chips horizontales scrollables) */}
      <div className="rec-list">
        {recurrences.map(rec => {
          const nbCours = cours.filter(c => c.recurrence_parent_id === rec.id).length;
          return (
            <button
              key={rec.id}
              type="button"
              onClick={() => setSelectedRecId(rec.id)}
              className={`rec-chip ${rec.id === selectedRecId ? 'selected' : ''} ${!rec.actif ? 'inactive' : ''}`}
            >
              <span className="rec-chip-nom">{rec.nom}</span>
              <span className="rec-chip-meta">{freqLabel(rec)} · {nbCours} à venir</span>
            </button>
          );
        })}
      </div>

      {selected && (
        <>
          {/* Header de la récurrence sélectionnée */}
          <div className="rec-detail izi-card">
            {!editing ? (
              <div className="rec-detail-top">
                <div>
                  <div className="rec-detail-nom">{selected.nom}</div>
                  <div className="rec-detail-meta">
                    {freqLabel(selected)}
                    {selected.heure && ` · ${selected.heure.slice(0, 5)}`}
                    {selected.duree_minutes && ` · ${selected.duree_minutes}min`}
                    {selected.type_cours && ` · ${selected.type_cours}`}
                  </div>
                </div>
                <div className="rec-detail-actions">
                  <button type="button" onClick={ouvrirProlonger} className="rec-icon-btn rec-prolonger-btn" title="Ajuster la série (prolonger, réduire, vacances)">
                    <CalendarPlus size={16} />
                  </button>
                  <button type="button" onClick={ouvrirEdition} className="rec-icon-btn" title="Modifier le nom et le type">
                    <Pencil size={16} />
                  </button>
                  <button type="button" onClick={() => toggleActif(selected)} className="rec-icon-btn" title={selected.actif ? 'Mettre en pause (repère visuel — ne supprime ni ne crée aucune séance)' : 'Réactiver'}>
                    {selected.actif
                      ? <ToggleRight size={22} style={{ color: '#16a34a' }} />
                      : <ToggleLeft size={22} style={{ color: 'var(--text-muted)' }} />}
                  </button>
                  <button type="button" onClick={() => supprimerRecurrence(selected)} className="rec-icon-btn danger" title="Supprimer la série">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="rec-edit-form">
                <label className="rec-edit-label">Nom du cours</label>
                <input
                  className="izi-input"
                  value={editForm.nom}
                  onChange={e => setEditForm(f => ({ ...f, nom: e.target.value }))}
                  placeholder="Ex : Yoga Vinyasa"
                  autoFocus
                />
                {typesCours.length > 0 && (
                  <>
                    <label className="rec-edit-label">Type</label>
                    <div className="rec-edit-chips">
                      {typesCours.map(type => (
                        <button
                          key={type}
                          type="button"
                          className={`rec-chip-type ${editForm.type_cours === type ? 'selected' : ''}`}
                          onClick={() => setEditForm(f => ({ ...f, type_cours: f.type_cours === type ? '' : type }))}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <p className="rec-edit-hint">
                  S'applique à la série et à ses <strong>{totalCoursFuturs}</strong> cours à venir (les séances passées ne changent pas).
                </p>
                <div className="rec-edit-actions">
                  <button type="button" className="izi-btn izi-btn-ghost" onClick={() => setEditing(false)} disabled={savingEdit}>
                    Annuler
                  </button>
                  <button type="button" className="izi-btn izi-btn-primary" onClick={enregistrerEdition} disabled={savingEdit || !editForm.nom.trim()}>
                    <Save size={16} /> {savingEdit ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Ajuster la série (prolonger, réduire, combler) ── */}
            {prolonger && !editing && (
              <div className="rec-prolonger-panel">
                <div className="rec-edit-label" style={{ marginBottom: 6 }}>
                  <CalendarPlus size={14} style={{ verticalAlign: '-2px' }} /> Ajuster la série : fin au…
                </div>
                {selected.date_fin && (
                  <p className="rec-prolonger-info">
                    Fin actuelle : <strong>{new Date(selected.date_fin + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                    <em> — plus loin = séances créées, plus proche = séances vides supprimées.</em>
                  </p>
                )}
                <input
                  type="date"
                  className="izi-input"
                  value={prolongerFin}
                  min={previewProlongation?.depuis || undefined}
                  onChange={e => setProlongerFin(e.target.value)}
                  style={{ maxWidth: 220 }}
                />
                {selected.exclure_vacances && selected.zone_vacances && (
                  <label className="rec-prolonger-vacances">
                    <input
                      type="checkbox"
                      checked={prolongerInclureVacances}
                      onChange={e => setProlongerInclureVacances(e.target.checked)}
                    />
                    <span>
                      Créer aussi pendant les vacances scolaires (zone {selected.zone_vacances})
                      <em> — la série les exclut d'habitude ; utile pour des cours d'été, sans changer sa config.</em>
                    </span>
                  </label>
                )}
                {previewProlongation && (
                  <p className="rec-prolonger-preview">
                    {previewProlongation.incluses.length > 0 && (
                      <>
                        <strong>{previewProlongation.incluses.length} séance{previewProlongation.incluses.length > 1 ? 's' : ''}</strong> ser{previewProlongation.incluses.length > 1 ? 'ont' : 'a'} créée{previewProlongation.incluses.length > 1 ? 's' : ''}
                        {' '}({freqLabel(selected)}{selected.heure ? ` à ${selected.heure.slice(0, 5)}` : ''})
                        {previewProlongation.exclues.length > 0 && (
                          <> — {previewProlongation.exclues.length} exclue{previewProlongation.exclues.length > 1 ? 's' : ''} ({[...new Set(previewProlongation.exclues.map(e => e.raison))].join(' + ')})</>
                        )}
                        .{' '}
                      </>
                    )}
                    {previewProlongation.supprimables.length > 0 && (
                      <>
                        <strong>{previewProlongation.supprimables.length} séance{previewProlongation.supprimables.length > 1 ? 's' : ''} vide{previewProlongation.supprimables.length > 1 ? 's' : ''}</strong> après cette date ser{previewProlongation.supprimables.length > 1 ? 'ont' : 'a'} supprimée{previewProlongation.supprimables.length > 1 ? 's' : ''}.{' '}
                      </>
                    )}
                    {previewProlongation.conservees.length > 0 && (
                      <>
                        <strong>{previewProlongation.conservees.length} séance{previewProlongation.conservees.length > 1 ? 's' : ''}</strong> avec inscrites ou historique ser{previewProlongation.conservees.length > 1 ? 'ont' : 'a'} conservée{previewProlongation.conservees.length > 1 ? 's' : ''} : annule-les depuis le détail du cours pour prévenir les élèves.{' '}
                      </>
                    )}
                    {previewProlongation.incluses.length === 0 && previewProlongation.supprimables.length === 0 && previewProlongation.conservees.length === 0 && (
                      <>Rien à créer ni à supprimer sur cette période{previewProlongation.exclues.length > 0 ? ` (${previewProlongation.exclues.length} date${previewProlongation.exclues.length > 1 ? 's' : ''} exclue${previewProlongation.exclues.length > 1 ? 's' : ''} : vacances/fériés)` : ''}.</>
                    )}
                  </p>
                )}
                <div className="rec-edit-actions">
                  <button type="button" className="izi-btn izi-btn-ghost" onClick={() => setProlonger(false)} disabled={prolongeant}>
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="izi-btn izi-btn-primary"
                    onClick={prolongerSerie}
                    disabled={prolongeant || !previewProlongation
                      || (previewProlongation.incluses.length === 0
                        && previewProlongation.supprimables.length === 0
                        && (selected.date_fin || null) === prolongerFin)}
                  >
                    <CalendarPlus size={16} /> {prolongeant ? 'Ajustement…'
                      : previewProlongation && (previewProlongation.incluses.length > 0 || previewProlongation.supprimables.length > 0)
                        ? [
                            previewProlongation.incluses.length > 0 ? `+${previewProlongation.incluses.length}` : null,
                            previewProlongation.supprimables.length > 0 ? `−${previewProlongation.supprimables.length}` : null,
                          ].filter(Boolean).join(' · ') + ' — Ajuster'
                        : 'Ajuster la série'}
                  </button>
                </div>
              </div>
            )}

            {(selected.exclure_vacances || selected.exclure_feries) && (
              <div className="rec-detail-tags">
                {selected.exclure_vacances && selected.zone_vacances && (
                  <span className="rec-tag">
                    <Sun size={11} /> Hors vacances Zone {selected.zone_vacances === 'Corse' ? 'Corse' : selected.zone_vacances}
                  </span>
                )}
                {selected.exclure_feries && (
                  <span className="rec-tag">
                    <Sun size={11} /> Hors jours fériés
                  </span>
                )}
              </div>
            )}

            {/* Compteur visible */}
            <div className="rec-counter">
              <Calendar size={14} />
              <strong>{totalCoursFuturs}</strong> cours à venir sur les 12 prochains mois
            </div>
          </div>

          {/* Calendrier mensuel */}
          <div className="rec-calendar izi-card">
            <div className="rec-cal-header">
              <button type="button" onClick={() => setMonthOffset(o => o - 1)} className="rec-icon-btn">
                <ChevronLeft size={18} />
              </button>
              <div className="rec-cal-month">{monthLabel}</div>
              <button type="button" onClick={() => setMonthOffset(o => o + 1)} className="rec-icon-btn">
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="rec-cal-weekdays">
              {JOURS_LABEL.map(j => <div key={j}>{j}</div>)}
            </div>

            <div className="rec-cal-grid">
              {grid.map((cell, i) => {
                if (!cell) return <div key={i} className="rec-cal-cell empty" />;
                const isToday = cell.iso === toISO(new Date());
                const isPast = cell.iso < toISO(new Date());
                return (
                  <div
                    key={i}
                    className={`rec-cal-cell ${cell.cours ? 'has-cours' : ''} ${cell.dansVacances ? 'vacances' : ''} ${cell.ferie ? 'ferie' : ''} ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}`}
                    title={
                      cell.cours
                        ? `Cours : ${cell.cours.nom}${cell.cours.heure ? ' à ' + cell.cours.heure.slice(0,5) : ''}`
                        : cell.ferie ? 'Jour férié'
                        : cell.dansVacances ? `Vacances : ${cell.periodeVacances?.label || ''}`
                        : ''
                    }
                  >
                    <span className="rec-cal-day">{cell.date.getDate()}</span>
                    {cell.cours && !isPast && (
                      <button
                        type="button"
                        className="rec-cal-action remove"
                        onClick={() => supprimerCours(cell.cours.id, cell.iso)}
                        disabled={actionPending === cell.iso}
                        aria-label="Supprimer ce cours"
                      >
                        <X size={10} />
                      </button>
                    )}
                    {!cell.cours && !isPast && (
                      <button
                        type="button"
                        className="rec-cal-action add"
                        onClick={() => ajouterCours(cell.iso)}
                        disabled={actionPending === cell.iso}
                        aria-label="Ajouter un cours ce jour"
                      >
                        <Plus size={10} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="rec-cal-legend">
              <span><span className="dot dot-cours" /> Cours prévu</span>
              <span><span className="dot dot-vacances" /> Vacances scolaires</span>
              <span><span className="dot dot-ferie" /> Jour férié</span>
            </div>
          </div>
        </>
      )}

      {styleBlock}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styleBlock = (
  <style jsx global>{`
    .rec-page { display: flex; flex-direction: column; gap: 16px; padding-bottom: 60px; }
    .rec-header { display: flex; align-items: center; gap: 12px; }
    .rec-header h1 { font-size: 1.25rem; font-weight: 700; }
    .rec-subtitle { font-size: 0.8125rem; color: var(--text-muted); margin-top: 2px; }
    .back-btn {
      width: 40px; height: 40px; border-radius: var(--radius-sm);
      border: 1px solid var(--border); background: var(--bg-card);
      display: flex; align-items: center; justify-content: center;
      color: var(--text-secondary); text-decoration: none;
    }

    .rec-empty {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 40px 24px; text-align: center;
    }
    .rec-empty-icon {
      width: 56px; height: 56px; border-radius: 50%;
      background: var(--brand-light); color: var(--brand);
      display: flex; align-items: center; justify-content: center;
    }
    .rec-empty-title { font-weight: 600; font-size: 0.9375rem; color: var(--text-primary); }
    .rec-empty-desc { font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 12px; }

    .rec-list {
      display: flex; gap: 8px; overflow-x: auto;
      padding: 4px 0 8px; scrollbar-width: thin;
    }
    .rec-chip {
      flex-shrink: 0; min-width: 180px; max-width: 240px;
      padding: 10px 14px; border-radius: 14px;
      border: 1.5px solid var(--border); background: var(--bg-card);
      cursor: pointer; text-align: left;
      display: flex; flex-direction: column; gap: 2px;
      transition: all var(--transition-fast);
    }
    .rec-chip:hover { border-color: var(--brand-200, #f0d0d0); }
    .rec-chip.selected { border-color: var(--brand); background: var(--brand-light); }
    .rec-chip.inactive { opacity: 0.55; }
    .rec-chip-nom { font-weight: 600; font-size: 0.875rem; color: var(--text-primary); }
    .rec-chip-meta { font-size: 0.7rem; color: var(--text-muted); }

    .rec-detail { display: flex; flex-direction: column; gap: 12px; padding: 16px; }
    .rec-detail-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .rec-detail-nom { font-size: 1.0625rem; font-weight: 700; color: var(--text-primary); }
    .rec-detail-meta { font-size: 0.8125rem; color: var(--text-secondary); margin-top: 2px; }
    .rec-detail-actions { display: flex; gap: 4px; }

    /* Édition nom + type de la série */
    .rec-edit-form { display: flex; flex-direction: column; gap: 8px; }
    .rec-prolonger-btn { color: var(--brand, #b45309); }
    .rec-prolonger-panel {
      margin-top: 12px; padding: 14px;
      background: var(--brand-light, #fdf6ee); border: 1.5px solid var(--border);
      border-radius: var(--radius-md, 12px);
      display: flex; flex-direction: column; gap: 8px;
    }
    .rec-prolonger-info { font-size: 0.78rem; color: var(--text-muted); margin: 0; }
    .rec-prolonger-preview { font-size: 0.8125rem; color: var(--text-secondary); margin: 4px 0 0; line-height: 1.5; }
    .rec-prolonger-vacances {
      display: flex; align-items: flex-start; gap: 8px;
      font-size: 0.8125rem; color: var(--text-secondary); cursor: pointer;
    }
    .rec-prolonger-vacances input { margin-top: 3px; }
    .rec-prolonger-vacances em { display: block; font-style: normal; font-size: 0.72rem; color: var(--text-muted); }
    .rec-edit-label { font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); }
    .rec-edit-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .rec-chip-type {
      padding: 8px 14px; border-radius: var(--radius-full);
      border: 1px solid var(--border); background: var(--bg-card);
      color: var(--text-secondary); font-size: 0.8125rem; font-weight: 500; cursor: pointer;
      transition: all var(--transition-fast);
    }
    .rec-chip-type.selected { background: var(--brand); color: white; border-color: var(--brand); }
    .rec-edit-hint { font-size: 0.75rem; color: var(--text-muted); margin: 2px 0 0; line-height: 1.4; }
    .rec-edit-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
    .rec-icon-btn {
      background: none; border: none; cursor: pointer;
      width: 36px; height: 36px; border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center;
      color: var(--text-secondary);
    }
    .rec-icon-btn:hover { background: var(--bg-soft, #faf8f5); }
    .rec-icon-btn.danger { color: #dc2626; }
    .rec-icon-btn.danger:hover { background: #fef2f2; }

    .rec-detail-tags { display: flex; flex-wrap: wrap; gap: 6px; }
    .rec-tag {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 0.6875rem; font-weight: 600;
      background: #fef3c7; color: #92400e;
      padding: 3px 10px; border-radius: 99px;
    }

    .rec-counter {
      display: flex; align-items: center; gap: 6px;
      padding: 10px 12px; border-radius: 10px;
      background: var(--brand-light); color: var(--brand-700, var(--brand));
      font-size: 0.8125rem;
    }
    .rec-counter strong { font-size: 0.9375rem; font-weight: 800; }

    /* Calendrier */
    .rec-calendar { padding: 14px; }
    .rec-cal-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 10px;
    }
    .rec-cal-month {
      font-weight: 700; font-size: 0.9375rem;
      text-transform: capitalize;
    }
    .rec-cal-weekdays {
      display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;
      margin-bottom: 4px;
    }
    .rec-cal-weekdays div {
      text-align: center; font-size: 0.6875rem;
      color: var(--text-muted); font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.04em;
    }
    .rec-cal-grid {
      display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;
    }
    .rec-cal-cell {
      position: relative; aspect-ratio: 1;
      border-radius: 8px; background: var(--bg-soft, #faf8f5);
      display: flex; align-items: flex-start; justify-content: flex-start;
      padding: 4px 6px;
      transition: all 0.15s;
    }
    .rec-cal-cell.empty { background: transparent; }
    .rec-cal-cell.has-cours { background: var(--brand); color: white; }
    .rec-cal-cell.has-cours .rec-cal-day { color: white; font-weight: 700; }
    .rec-cal-cell.vacances:not(.has-cours) {
      background: #fef9c3; border: 1px dashed #fde047;
    }
    .rec-cal-cell.ferie:not(.has-cours) {
      background: #fee2e2;
    }
    .rec-cal-cell.today {
      box-shadow: 0 0 0 2px var(--brand);
    }
    .rec-cal-cell.past { opacity: 0.4; }
    .rec-cal-day { font-size: 0.75rem; font-weight: 600; }
    .rec-cal-action {
      position: absolute; bottom: 2px; right: 2px;
      width: 18px; height: 18px; border-radius: 50%;
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.15s;
    }
    .rec-cal-cell:hover .rec-cal-action { opacity: 1; }
    .rec-cal-action.add {
      background: rgba(255,255,255,0.9); color: var(--brand);
      border: 1px solid var(--brand);
    }
    .rec-cal-action.remove {
      background: rgba(255,255,255,0.95); color: #dc2626;
      border: 1px solid #dc2626;
    }
    .rec-cal-action:disabled { opacity: 0.5; cursor: wait; }

    .rec-cal-legend {
      display: flex; flex-wrap: wrap; gap: 14px;
      margin-top: 14px; padding-top: 12px;
      border-top: 1px solid var(--border);
      font-size: 0.7rem; color: var(--text-muted);
    }
    .rec-cal-legend span { display: inline-flex; align-items: center; gap: 5px; }
    .dot { display: inline-block; width: 10px; height: 10px; border-radius: 3px; }
    .dot-cours { background: var(--brand); }
    .dot-vacances { background: #fef9c3; border: 1px dashed #fde047; }
    .dot-ferie { background: #fee2e2; }
  `}</style>
);
