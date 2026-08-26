'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Save, Calendar, Clock, MapPin, Users, Repeat, UserPlus,
  Trash2, AlertTriangle, CheckCircle2, Edit3, X, Copy,
  ChevronDown, ChevronUp, Mail, Send, ShieldAlert, Smartphone, CheckCheck, Lock,
  Home, Navigation, Euro, MessageSquare, CalendarPlus, ArrowRight,
} from 'lucide-react';
import AideContextuelle from '@/components/AideContextuelle';
import { formatHeure, getAllTypesFromCategories } from '@/lib/utils';
import { parseDate } from '@/lib/dates';
import { compterPlacesOccupees, presenceOccupePlace, presenceEstReservationActive } from '@/lib/presences';
import { seanceDeltaChangementType } from '@/lib/pointage-delta';
import { getRegle } from '@/lib/regles-metier';
import { sanitizeLienPaiement } from '@/lib/paiement-seance';
import {
  JOURS_SEMAINE, JOUR_LONG, serieDeplacable, planDeplacement, apercuDeplacement, decalerJours,
} from '@/lib/serie-jour';
import TypeCoursHint from '@/components/cours/TypeCoursHint';
import CouvertureCours from '@/components/cours/CouvertureCours';
import ConfierPointage from '@/components/cours/ConfierPointage';
import IntervenanteCours from '@/components/cours/IntervenanteCours';
import RepereDate from '@/components/cours/RepereDate';
import AttachmentPicker from '@/components/messagerie/AttachmentPicker';
import { resoudreCarnetApplicable } from '@/lib/carnet-resolution';
import { sanitizeLienVisio } from '@/lib/visio';
import { can } from '@/lib/plan-guard';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';
import HeureSelect from '@/components/ui/HeureSelect';
import { SMS_ENABLED } from '@/lib/constantes';

export default function CoursDetailClient({ intervenantes = [], intervenantInit = '', intervenanteIndispo = false, cours, presences, lieux, profile, nbOccurrences, autoEdit, listeAttente = [], abosParClient = {}, paiementsSeance = [], offresCatalogue = [], nbSeancesType = 0 }) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState(autoEdit || false);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal]     = useState(false);
  const [deleteScope, setDeleteScope]             = useState('single');
  const [promotingId, setPromotingId]             = useState(null);

  // Places disponibles pour proposer la promotion depuis la liste d'attente.
  // Formule v74 : compter TOUTES les presences gonflait l'effectif → après
  // une annulation tardive sur un cours plein, « Promouvoir » restait caché
  // alors que la place était vendable (B1b).
  const nbOccupees = compterPlacesOccupees(presences);
  const placesDispos = cours.capacite_max != null
    ? Math.max(0, cours.capacite_max - nbOccupees)
    : null;

  // ── Régime tarifaire & prévisionnel (retour Maude 2026-07-25) ─────────────
  // Miroir EXACT du récap financier du pointage : carnet LIÉ prioritaire
  // (p.abonnements), sinon résolution d'affichage (lib/carnet-resolution) ;
  // cours à tarif_unitaire = payée/à régler via paiements v65. Les lignes qui
  // n'occupent pas de place (annulées, tardives, déclinées) n'ont pas de badge.
  const argent = useMemo(() => {
    const paidByPresence = {};
    for (const pay of paiementsSeance) {
      if (pay.presence_id && pay.statut === 'paid') paidByPresence[pay.presence_id] = pay;
    }
    const tarif = Number(cours.tarif_unitaire) > 0 ? Number(cours.tarif_unitaire) : null;
    const parPresence = {};
    let surCarnet = 0, sansCarnet = 0, payes = 0, aRegler = 0, encaisse = 0, gratuits = 0;
    for (const p of presences) {
      if (!presenceOccupePlace(p)) continue;
      const tp = p.type_presence || 'normal';
      if (tp === 'essai')  { gratuits++; parPresence[p.id] = { kind: 'essai' };  continue; }
      if (tp === 'offert') { gratuits++; parPresence[p.id] = { kind: 'offert' }; continue; }
      // Excusée = rien à régler (cas Sarah 2026-07-30 : excusée par Maude mais
      // la fiche cours affichait encore « à régler 20 € » — cette surface était
      // la SEULE à avoir raté le filtre B1f, pointage/Revenus/espace l'ont).
      // Un absent « souple » non payé ne doit rien non plus (miroir pointage).
      const st = p.statut_pointage || 'inscrit';
      if (st === 'excuse') { parPresence[p.id] = { kind: 'excuse' }; continue; }
      if (st === 'absent' && !paidByPresence[p.id]) { continue; }
      // Carnet D'ABORD : lié (override compris — avant, un atelier affichait
      // « à régler » même pour une présence décomptée d'un carnet lié) ou
      // résoluble. Sur un cours MIXTE (carnets_acceptes, v82) la résolution
      // marche ; sur un atelier pur elle renvoie null (v70) → filet tarif.
      const carnet = p.abonnements
        || resoudreCarnetApplicable(abosParClient[p.client_id] || [], { type_cours: cours.type_cours, date: cours.date, tarif_unitaire: cours.tarif_unitaire, carnets_acceptes: cours.carnets_acceptes });
      if (carnet) {
        surCarnet++; parPresence[p.id] = { kind: 'carnet', nom: carnet.offre_nom || 'Carnet' };
      } else if (tarif) {
        const pay = paidByPresence[p.id];
        if (pay) { payes++; encaisse += Number(pay.montant) || 0; parPresence[p.id] = { kind: 'paye' }; }
        else { aRegler++; parPresence[p.id] = { kind: 'du', montant: tarif }; }
      } else {
        sansCarnet++; parPresence[p.id] = { kind: 'sans' };
      }
    }
    return { tarif, parPresence, surCarnet, sansCarnet, payes, aRegler, encaisse, gratuits, attendu: tarif ? aRegler * tarif : 0 };
  }, [presences, abosParClient, paiementsSeance, cours]);

  // ---- Cours privé : prévenir les invité·es par email (dédupé serveur) ----
  const [notifying, setNotifying] = useState(false);
  const prevenirInvites = async () => {
    setNotifying(true);
    try {
      const res = await fetch('/api/cours/inviter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coursId: cours.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      const bouts = [];
      if (json.envoyes > 0) bouts.push(`${json.envoyes} email${json.envoyes > 1 ? 's' : ''} envoyé${json.envoyes > 1 ? 's' : ''} ✓`);
      if (json.dejaPrevenus > 0) bouts.push(`${json.dejaPrevenus} déjà prévenu·e${json.dejaPrevenus > 1 ? 's' : ''}`);
      if (json.sansEmail > 0) bouts.push(`${json.sansEmail} sans email`);
      toast.success(bouts.length ? bouts.join(' · ') : 'Personne à prévenir pour l\'instant');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setNotifying(false);
    }
  };

  const promouvoirEntree = async (entryId) => {
    setPromotingId(entryId);
    try {
      const res = await fetch(`/api/liste-attente/${entryId}/promouvoir`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      toast.success('Personne promue, email envoyé');
      router.refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setPromotingId(null);
    }
  };

  const retirerEntree = async (entryId, nom) => {
    if (!confirm(`Retirer ${nom || 'cette personne'} de la liste d'attente ?`)) return;
    setPromotingId(entryId);
    try {
      const res = await fetch(`/api/liste-attente/${entryId}/promouvoir`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      toast.success('Personne retirée');
      router.refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setPromotingId(null);
    }
  };

  // ---- Modification de la récurrence ----
  const [showRecurrenceEdit, setShowRecurrenceEdit] = useState(false);
  // Cours en ligne (v86) — édition du lien de visio, écriture DÉFENSIVE :
  // migration pas appliquée → toast explicite, rien ne casse.
  const [visioLien, setVisioLien] = useState(cours.lien_visio || '');
  const [visioVerrou, setVisioVerrou] = useState(cours.lien_visio_verrouille !== false);
  const [visioBusy, setVisioBusy] = useState(false);
  const sauverVisio = async () => {
    const clean = visioLien.trim() ? sanitizeLienVisio(visioLien) : '';
    if (visioLien.trim() && !clean) { toast.error('Lien invalide : il faut une URL https (Zoom, Meet…).'); return; }
    setVisioBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from('cours')
      .update({ lien_visio: clean || null, lien_visio_verrouille: visioVerrou })
      .eq('id', cours.id);
    setVisioBusy(false);
    if (error) toast.error('Enregistrement impossible (migration v86 requise ?) : ' + error.message);
    else { setVisioLien(clean); toast.success(clean ? 'Lien de visio enregistré' : 'Lien retiré'); }
  };

  const [recurrenceConfirmed, setRecurrenceConfirmed] = useState(false);
  const [savingRecurrence, setSavingRecurrence]     = useState(false);
  const [recurrenceForm, setRecurrenceForm]         = useState({
    nom:           cours.nom || '',
    heure:         cours.heure?.substring(0, 5) || '',
    duree_minutes: cours.duree_minutes?.toString() || '60',
    lieu_id:       cours.lieu_id || '',
    type_cours:    cours.type_cours || '',
    tarif_unitaire: cours.tarif_unitaire != null ? String(cours.tarif_unitaire) : '',
    carnets_acceptes: cours.carnets_acceptes === true,
    stripe_payment_link_unit: cours.stripe_payment_link_unit || '',
  });

  // ── Changer le JOUR de la série (retour Colin 2026-08-23 : « on devrait
  // avoir la modif du jour sur cet écran pour les cours récurrents »).
  // Le 22/08, le jour est devenu un choix à la CRÉATION ; ici c'est le
  // rattrapage d'une série déjà créée. Les séances ne sont pas régénérées,
  // elles se DÉCALENT : elles portent des inscrites et de l'historique.
  // Les occurrences ne se chargent qu'à l'ouverture du panneau — la fiche
  // d'un cours n'a pas à payer cette requête à chaque visite.
  const [occurrencesSerie, setOccurrencesSerie] = useState(null); // null = pas encore chargées
  const [jourVise, setJourVise] = useState(null);
  const recurrenceCfg = cours.recurrence || null;

  useEffect(() => {
    if (!showRecurrenceEdit || !cours.recurrence_parent_id || occurrencesSerie) return;
    let annule = false;
    (async () => {
      const supabase = createClient();
      const n = new Date();
      const today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
      const { data, error } = await supabase
        .from('cours')
        .select('id, date, presences(id, statut_pointage, annulation_tardive)')
        .eq('recurrence_parent_id', cours.recurrence_parent_id)
        .gte('date', today)
        .order('date');
      if (annule) return;
      if (error) { setOccurrencesSerie([]); return; } // pas de jour proposé plutôt qu'un plan faux
      setOccurrencesSerie((data || []).map(o => ({
        id: o.id,
        date: o.date,
        // Formule v74 (lib/presences) : une annulation tardive n'occupe pas
        // de place, mais on parle ici d'élèves à prévenir — même filtre, on
        // ne compte pas celles qui ne viendront pas.
        inscrites: compterPlacesOccupees(o.presences),
      })));
    })();
    return () => { annule = true; };
  }, [showRecurrenceEdit, cours.recurrence_parent_id, occurrencesSerie]);

  const deplacable = useMemo(() => serieDeplacable({
    frequence: recurrenceCfg?.frequence,
    joursSemaine: recurrenceCfg?.jours_semaine,
    occurrences: occurrencesSerie || [],
  }), [recurrenceCfg, occurrencesSerie]);

  const planJour = useMemo(() => (
    deplacable.ok && jourVise && jourVise !== deplacable.jourActuel
      ? planDeplacement({ occurrences: occurrencesSerie || [], jourVise })
      : null
  ), [deplacable, jourVise, occurrencesSerie]);

  // ---- Message aux participants ----
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [msgAttachments, setMsgAttachments] = useState([]); // PJ de l'annonce [{url, kind, name}]
  // Modale réservation (demande Colin 2026-07-28) : clic sur un·e inscrit·e →
  // ouvrir la fiche / changer le type (essai, offerte) / supprimer la résa.
  const [resaModal, setResaModal] = useState(null); // la présence cliquée
  const [resaBusy, setResaBusy] = useState(false);
  const [resaConfirmDel, setResaConfirmDel] = useState(false);
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
    visibilite: cours.visibilite || 'public',
    tarif_unitaire: cours.tarif_unitaire != null ? String(cours.tarif_unitaire) : '',
    carnets_acceptes: cours.carnets_acceptes === true,
    stripe_payment_link_unit: cours.stripe_payment_link_unit || '',
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
          visibilite: form.visibilite || 'public',
          tarif_unitaire: form.tarif_unitaire ? parseFloat(form.tarif_unitaire) : null,
          carnets_acceptes: form.tarif_unitaire ? form.carnets_acceptes === true : false,
          stripe_payment_link_unit: form.tarif_unitaire ? (sanitizeLienPaiement(form.stripe_payment_link_unit) || null) : null,
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

  // Annuler une séance — confirmation + feedback (audit 2026-07-25 : le clic
  // partait direct, sans confirm ni vérification du résultat — un mis-clic
  // emailait tous les inscrits, irréversible).
  const [cancelling, setCancelling] = useState(false);
  const handleCancel = async () => {
    const n = presences.length;
    if (!confirm(
      `Annuler cette séance ?${n > 0 ? `\n\nLes ${n} inscrit·e${n > 1 ? 's' : ''} seront prévenu·es par email, et les crédits restitués selon ta règle « Cours annulé ».` : ''}\n\nElle restera visible (barrée) sur ton agenda : c'est ce qui informe tes élèves. Tu pourras ensuite la supprimer (corbeille) pour la faire disparaître.\n\nCette action est définitive (pas de ré-activation).`
    )) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/cours/${cours.id}/annuler`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Erreur ${res.status}`);
      const bouts = [`Séance annulée`];
      if (json.notifications?.envoyees > 0) bouts.push(`${json.notifications.envoyees} email${json.notifications.envoyees > 1 ? 's' : ''} envoyé${json.notifications.envoyees > 1 ? 's' : ''}`);
      if (json.credits_restitues > 0) bouts.push(`${json.credits_restitues} crédit${json.credits_restitues > 1 ? 's' : ''} restitué${json.credits_restitues > 1 ? 's' : ''}`);
      toast.success(bouts.join(' · ') + ' ✓');
      if (json.paiements_seance_payes > 0) {
        toast.warning(`⚠️ ${json.paiements_seance_payes} paiement${json.paiements_seance_payes > 1 ? 's' : ''} déjà encaissé${json.paiements_seance_payes > 1 ? 's' : ''} sur cette séance : pense au remboursement (Revenus).`);
      }
      router.refresh();
    } catch (e) {
      toast.error('Annulation impossible : ' + e.message);
    } finally {
      setCancelling(false);
    }
  };

  // Supprimer cours
  // ⚠️ Garde-fou (incident Maude 2026-07-23) : supprimer un cours emporte ses
  // présences EN CASCADE — y compris des séances déjà pointées/payées (les
  // paiements liés deviennent orphelins). Une suppression « et les suivantes »
  // depuis une vieille occurrence avait effacé un cours pointé + 6 paiements
  // sans un mot. On compte désormais l'historique concerné et on prévient.
  const handleDelete = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Périmètre exact de la suppression → cours concernés
      let coursIdsQuery = supabase.from('cours').select('id');
      if (deleteScope === 'single') {
        coursIdsQuery = coursIdsQuery.eq('id', cours.id);
      } else if (deleteScope === 'future' && cours.recurrence_parent_id) {
        coursIdsQuery = coursIdsQuery.eq('recurrence_parent_id', cours.recurrence_parent_id).gte('date', cours.date);
      } else if (deleteScope === 'all' && cours.recurrence_parent_id) {
        coursIdsQuery = coursIdsQuery.eq('recurrence_parent_id', cours.recurrence_parent_id);
      }
      const { data: coursConcernes, error: qErr } = await coursIdsQuery;
      if (qErr) throw qErr;
      const ids = (coursConcernes || []).map(c => c.id);

      // Présences du périmètre en LIGNES : historique pointé ET réservations
      // actives (B1b : le count-only ignorait son erreur → garde-fou muet, et
      // les réservations non pointées partaient en cascade sans un mot).
      let nbPointees = 0;
      let nbResas = 0;
      let lectureIncertaine = false;
      if (ids.length > 0) {
        const { data: presRows, error: presReadErr } = await supabase
          .from('presences')
          .select('statut_pointage, annulation_tardive')
          .in('cours_id', ids);
        if (presReadErr) {
          lectureIncertaine = true; // fail-closed : confirmation forte
        } else {
          // absent_compte (cas résolu) et annulations tardives décomptées font
          // partie de l'historique réel — les rater = effacer des preuves de
          // décompte sans recrédit (audit 2026-07-25).
          nbPointees = (presRows || []).filter(p =>
            ['present', 'absent', 'excuse', 'absent_compte'].includes(p.statut_pointage) || p.annulation_tardive
          ).length;
          nbResas = (presRows || []).filter(presenceEstReservationActive).length;
        }
      }

      if (lectureIncertaine) {
        const ok = confirm(
          '⚠️ Impossible de vérifier les présences liées : la suppression peut effacer de l\'historique pointé ou des réservations actives.\n\nSupprimer quand même ?'
        );
        if (!ok) { setLoading(false); return; }
      } else if (nbPointees > 0) {
        const ok = confirm(
          `⚠️ Attention : ${deleteScope === 'single' ? 'ce cours contient' : `ces ${ids.length} cours contiennent`} ` +
          `${nbPointees} présence${nbPointees > 1 ? 's' : ''} déjà pointée${nbPointees > 1 ? 's' : ''}.\n\n` +
          `Supprimer efface DÉFINITIVEMENT cet historique (présences, statistiques des élèves), ` +
          `et les paiements encaissés sur ces séances perdront leur rattachement.\n\n` +
          `Si le cours n'a pas eu lieu, préfère « Annuler le cours » (qui prévient les inscrits et recrédite les carnets).\n\n` +
          `Supprimer quand même ?`
        );
        if (!ok) { setLoading(false); return; }
      }
      if (!lectureIncertaine && nbResas > 0) {
        const ok = confirm(
          `⚠️ ${nbResas} réservation${nbResas > 1 ? 's' : ''} active${nbResas > 1 ? 's' : ''} sur ${deleteScope === 'single' ? 'cette séance' : 'ces séances'} : ` +
          `supprimer les efface SANS prévenir les élèves (les listes d'attente disparaissent aussi).\n\n` +
          `Préfère « Annuler le cours » : les inscrit·es reçoivent un email et les carnets sont recrédités.\n\n` +
          `Supprimer quand même ?`
        );
        if (!ok) { setLoading(false); return; }
      }

      // Deletes VÉRIFIÉS (B1b : un delete en échec redirigeait quand même —
      // la prof croyait la série supprimée, elle réapparaissait).
      if (deleteScope === 'single') {
        const { error: delErr } = await supabase.from('cours').delete().eq('id', cours.id);
        if (delErr) throw delErr;
      } else if (deleteScope === 'future' && cours.recurrence_parent_id) {
        const { error: delErr } = await supabase
          .from('cours')
          .delete()
          .eq('recurrence_parent_id', cours.recurrence_parent_id)
          .gte('date', cours.date);
        if (delErr) throw delErr;
      } else if (deleteScope === 'all' && cours.recurrence_parent_id) {
        const { error: delErr } = await supabase
          .from('cours')
          .delete()
          .eq('recurrence_parent_id', cours.recurrence_parent_id);
        if (delErr) throw delErr;
        const { error: delRecErr } = await supabase
          .from('recurrences')
          .delete()
          .eq('id', cours.recurrence_parent_id);
        if (delRecErr) throw new Error('Séances supprimées, mais la série reste listée : ' + delRecErr.message);
      }

      router.push(cours.date ? `/agenda?date=${cours.date}` : '/agenda');
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
        nom:           recurrenceForm.nom?.trim() || cours.nom, // nom NOT NULL — jamais vide
        heure:         recurrenceForm.heure || null,
        duree_minutes: recurrenceForm.duree_minutes ? parseInt(recurrenceForm.duree_minutes) : 60,
        lieu_id:       recurrenceForm.lieu_id || null,
        lieu:          lieuNom,
        type_cours:    recurrenceForm.type_cours || null,
        // Payable à la séance — propagé aux occurrences futures uniquement
        // (la table recurrences n'a pas la colonne, cf. cours/nouveau).
        tarif_unitaire: recurrenceForm.tarif_unitaire ? parseFloat(recurrenceForm.tarif_unitaire) : null,
        carnets_acceptes: recurrenceForm.tarif_unitaire ? recurrenceForm.carnets_acceptes === true : false,
        stripe_payment_link_unit: recurrenceForm.tarif_unitaire ? (sanitizeLienPaiement(recurrenceForm.stripe_payment_link_unit) || null) : null,
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
          nom:           payload.nom,
          heure:         payload.heure,
          duree_minutes: payload.duree_minutes,
          lieu_id:       payload.lieu_id,
          type_cours:    payload.type_cours,
        })
        .eq('id', cours.recurrence_parent_id);
      if (e2) throw e2;

      // 3. Changement de JOUR — en DERNIER : les deux updates ci-dessus
      //    filtrent sur les dates actuelles. On décale chaque séance à venir
      //    du même nombre de jours ; aucune n'est supprimée ni recréée, donc
      //    les inscrites, les paiements et l'historique suivent tout seuls.
      if (planJour?.delta) {
        const LOT = 8;
        for (let i = 0; i < planJour.mouvements.length; i += LOT) {
          const lot = planJour.mouvements.slice(i, i + LOT);
          const res = await Promise.all(lot.map(m =>
            supabase.from('cours').update({ date: m.vers }).eq('id', m.id)
          ));
          const err = res.find(r => r.error)?.error;
          if (err) throw err;
        }
        // La config suit le mouvement, sinon la prochaine génération
        // (« Ajuster la série ») retomberait sur l'ancien jour — et en
        // bimensuel sur l'autre semaine, puisque la parité s'ancre sur
        // date_debut.
        const majRec = { jours_semaine: [jourVise] };
        if (recurrenceCfg?.date_debut) majRec.date_debut = decalerJours(recurrenceCfg.date_debut, planJour.delta);
        if (recurrenceCfg?.date_fin) majRec.date_fin = decalerJours(recurrenceCfg.date_fin, planJour.delta);
        const { error: e3 } = await supabase
          .from('recurrences').update(majRec).eq('id', cours.recurrence_parent_id);
        if (e3) throw e3;

        if (planJour.nbInscrites > 0) {
          toast.warning(`Série déplacée au ${JOUR_LONG[jourVise]}. ${planJour.nbInscrites} inscription${planJour.nbInscrites > 1 ? 's' : ''} ont suivi : pense à prévenir ces élèves.`);
        } else {
          toast.success(`Série déplacée au ${JOUR_LONG[jourVise]}.`);
        }
      }

      setShowRecurrenceEdit(false);
      setRecurrenceConfirmed(false);
      setJourVise(null);
      setOccurrencesSerie(null); // rechargées au prochain ouvrir : les dates ont bougé
      router.refresh();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSavingRecurrence(false);
    }
  };

  // ---- Envoyer un message aux participants ----
  // Passe par la messagerie interne IziSolo (table conversations + emails
  // sortants via Resend) au lieu d'un mailto: qui ouvrait le client mail
  // externe et perdait toute traçabilité côté app.
  // Cf. POST /api/messagerie/announce avec scope='cours', mode='individuel'
  // → crée ou réutilise une conv 1-to-1 par participant et y envoie le
  // message. Visible ensuite dans /messagerie pour la prof et les élèves.
  const [sendingMessage, setSendingMessage] = useState(false);
  // ── Modale réservation : changer le type (même mécanique que le pointage —
  // le delta carnet passe par la formule verrouillée + le RPC, rollback si ko).
  const handleChangerType = async (presence, newType) => {
    const oldType = presence.type_presence || 'normal';
    if (newType === oldType || resaBusy) return;
    setResaBusy(true);
    try {
      const supabase = createClient();
      const statut = presence.statut_pointage || (presence.pointee ? 'present' : 'inscrit');
      const regleNoShow = getRegle({ regles_metier: profile?.regles_metier }, 'no_show');
      const absenceCompte = regleNoShow.mode === 'auto' && regleNoShow.choix === 'decompter_auto';
      const delta = seanceDeltaChangementType(statut, oldType, newType, absenceCompte);
      const { error } = await supabase.from('presences').update({ type_presence: newType }).eq('id', presence.id);
      if (error) throw error;
      if (delta !== 0) {
        const { data: result, error: rpcErr } = await supabase.rpc('pointer_presence', {
          p_presence_id: presence.id,
          p_statut: statut,
          p_pointee: presence.pointee,
          p_heure: presence.heure_pointage || null,
          p_delta: delta,
        });
        if (rpcErr || !result?.ok) {
          // Rollback : gratuité et carnet ne doivent jamais se désynchroniser.
          await supabase.from('presences').update({ type_presence: oldType }).eq('id', presence.id);
          throw new Error('ajustement du carnet impossible');
        }
      }
      toast.success(newType === 'normal' ? 'Séance repassée en normale ✓'
        : newType === 'essai' ? 'Séance marquée « essai » ✓' : 'Séance offerte ✓');
      setResaModal(m => (m && m.id === presence.id ? { ...m, type_presence: newType } : m));
      router.refresh();
    } catch (e) {
      toast.error('Changement non enregistré : ' + (e?.message || 'réessaie'));
    } finally {
      setResaBusy(false);
    }
  };

  // ── Modale réservation : supprimer la résa (désinscription par la prof).
  const handleSupprimerResa = async (presence) => {
    if (resaBusy) return;
    setResaBusy(true);
    try {
      const res = await fetch(`/api/presences/${presence.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Suppression impossible');
        return;
      }
      toast.success(`Réservation supprimée ✓${data.recredite ? ' · séance re-créditée sur le carnet' : ''}${data.promu ? ' · 1 personne promue depuis la liste d\'attente' : ''}`);
      setResaModal(null);
      setResaConfirmDel(false);
      router.refresh();
    } catch {
      toast.error('Suppression impossible : problème réseau ?');
    } finally {
      setResaBusy(false);
    }
  };

  const handleSendMessage = async () => {
    const message = (messageForm.message || '').trim();
    // Photos seules autorisées (demande Maude 2026-07-30 : envoyer les photos
    // de la veille aux participantes) — miroir du « Message vide » de l'API.
    if (!message && msgAttachments.length === 0) { toast.warning('Saisis un message ou joins une photo avant d\'envoyer.'); return; }
    if (presences.length === 0) { toast.warning('Aucun participant inscrit à ce cours.'); return; }

    // On préfixe le message par le sujet (s'il y en a un) — la messagerie
    // interne n'a pas de notion de "sujet" séparé, c'est juste du contenu.
    const sujet = (messageForm.sujet || '').trim();
    const content = sujet ? `**${sujet}**\n\n${message}` : message;

    setSendingMessage(true);
    try {
      const res = await fetch('/api/messagerie/announce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          media_urls: msgAttachments.map(a => a.url),
          scope: 'cours',
          cours_id: cours.id,
          mode: 'individuel',  // 1 conv 1-to-1 par participant (plus respectueux que groupe)
          shared_ref_type: 'cours',
          shared_ref_id: cours.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur envoi');

      toast.success(`Message envoyé à ${json.count || presences.length} participant${(json.count || presences.length) > 1 ? 's' : ''} ✓`);
      setShowMessageModal(false);
      setMessageForm({ sujet: '', message: '' });
      setMsgAttachments([]);
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSendingMessage(false);
    }
  };

  // ---- SMS : accès plan + participants joignables ----
  // Kill-switch global SMS_ENABLED dans lib/constantes.js (false pour le
  // moment, en attendant validation OctoPush en prod). `free` inclus pour
  // comptes internes/exemptés (Colin, Maude).
  const canUseSms = SMS_ENABLED && can(profile, 'sms');
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
        <Link href={cours.date ? `/agenda?date=${cours.date}` : '/agenda'} className="back-btn"><ArrowLeft size={20} /></Link>
        <div className="page-header-info">
          <h1>{cours.nom} <AideContextuelle ancre="pointage" titre="Tuto : le pointage au quotidien" /></h1>
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
              title="Dupliquer cette séance"
              type="button"
              aria-label="Dupliquer cette séance"
            >
              <Copy size={18} />
            </button>
            <button className="edit-btn" onClick={() => setEditing(true)} title="Modifier" type="button" aria-label="Modifier">
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

      {/* Annulé — expliquer POURQUOI la séance reste visible (retour Maude
          08/2026 : « je l'ai enlevée mais je la vois quand même ») et donner
          le geste pour la faire disparaître (la corbeille existe plus bas). */}
      {cours.est_annule && (
        <div className="annule-banner">
          <X size={18} />
          <span>
            Cette séance est annulée. Elle reste affichée <strong>barrée</strong> sur ton agenda pour
            que tes élèves voient l'annulation. Si tu veux la faire disparaître complètement,
            supprime-la avec la corbeille <Trash2 size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> ci-dessous.
          </span>
        </div>
      )}

      {/* Bandeau domicile */}
      {cours.domicile && (
        <div className="domicile-detail-banner">
          <Home size={18} className="domicile-detail-icon" />
          <div className="domicile-detail-info">
            <strong>Cours à domicile</strong>
            {cours.lieu && <span className="domicile-detail-addr"><MapPin size={11} /> {cours.lieu}</span>}
            {cours.frais_deplacement > 0 && <span className="domicile-detail-frais">+{cours.frais_deplacement} € frais de déplacement</span>}
          </div>
          {cours.lieu && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cours.lieu)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="domicile-detail-maps"
            >
              <Navigation size={13} /> Maps
            </a>
          )}
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
                  <div className="detail-value">{cours.lieu}{cours.domicile && ' (domicile)'}</div>
                </div>
              </div>
            )}

            {/* Cours en ligne (v86) : le lien de visio, éditable ici — la prof
                crée souvent son Zoom APRÈS le cours. Écriture défensive
                (migration pas appliquée → message clair, rien ne casse). */}
            {(cours.format === 'visio' || cours.format === 'hybride') && (
              <div className="detail-row">
                <span style={{ fontSize: 16 }}>🖥</span>
                <div style={{ flex: 1 }}>
                  <div className="detail-label">En ligne : lien de la séance</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <input
                      className="izi-input"
                      style={{ flex: 1, minWidth: 220, fontSize: '0.8125rem' }}
                      value={visioLien}
                      onChange={e => setVisioLien(e.target.value)}
                      placeholder="https://zoom.us/j/… (visible selon le verrou)"
                    />
                    <button
                      type="button"
                      className="izi-btn izi-btn-secondary"
                      onClick={sauverVisio}
                      disabled={visioBusy}
                      style={{ fontSize: '0.8125rem' }}
                    >
                      {visioBusy ? '…' : 'Enregistrer'}
                    </button>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={visioVerrou} onChange={e => setVisioVerrou(e.target.checked)} style={{ accentColor: 'var(--brand)' }} />
                    Réservé aux séances réglées ou couvertes
                  </label>
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
                  <div className="detail-value">{nbOccupees} / {cours.capacite_max} places</div>
                </div>
              </div>
            )}

            <div className="detail-row">
              <Euro size={16} />
              <div>
                <div className="detail-label">Tarif</div>
                <div className="detail-value">
                  {argent.tarif
                    ? (cours.carnets_acceptes === true
                        ? `${argent.tarif} € à la séance : les carnets compatibles décomptent (mixte)`
                        : `${argent.tarif} € à la séance : ne décompte aucun carnet`)
                    : 'Couvert par les carnets / abonnements'}
                </div>
              </div>
            </div>

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
                <TypeCoursHint typeCours={form.type_cours} />
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label"><Calendar size={14} /> Date</label>
                <input className="izi-input" type="date" value={form.date} onChange={handleChange('date')} />
                <RepereDate iso={form.date} />
              </div>
              <div className="form-group">
                <label className="form-label"><Clock size={14} /> Heure</label>
                <HeureSelect value={form.heure} onChange={v => setForm(prev => ({ ...prev, heure: v }))} />
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
                  <option key={l.id} value={l.id}>{l.nom}{l.adresse ? `, ${l.adresse}` : ''}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="izi-input" value={form.notes} onChange={handleChange('notes')} rows={2} style={{ resize: 'vertical' }} />
            </div>

            <div className="form-group">
              <label className="form-label">Visibilité sur le portail public</label>
              <select className="izi-input" value={form.visibilite} onChange={handleChange('visibilite')}>
                <option value="public">Tout le monde (public)</option>
                <option value="inscrits">Élèves inscrits seulement</option>
                <option value="abonnes">Détenteurs d'abonnement actif</option>
                <option value="fideles">Élèves fidèles</option>
                <option value="prive">🔒 Privé (sur invitation)</option>
              </select>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                {form.visibilite === 'prive'
                  ? 'Invisible sur ton portail. Seul·es les élèves ajoutés à ce cours le voient, dans leur espace.'
                  : 'Détermine qui peut voir ce cours dans la liste publique du studio.'}
              </span>
            </div>

            <div className="form-group" style={{ background: 'var(--bg-soft, #F8F4ED)', padding: 14, borderRadius: 12, border: '1px solid var(--border)' }}>
              <label className="form-label">💰 Cours payable à la séance (optionnel)</label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: 1.5 }}>
                Mets un prix seulement si ce cours ne s'achète pas avec un carnet (atelier,
                stage, ou cours hors carnet/abo). Il ne décomptera aucun carnet : l'élève réglera
                directement avec toi à la séance. Laisse vide pour un cours couvert par tes carnets/abos.
              </p>
              <input
                className="izi-input"
                type="number"
                step="0.01"
                min="0"
                value={form.tarif_unitaire}
                onChange={handleChange('tarif_unitaire')}
                placeholder="Prix à la séance (€), ex : 15.00"
                style={{ maxWidth: 260 }}
              />
              {form.tarif_unitaire && (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: '0.8125rem', marginTop: 8 }}>
                  <input
                    type="checkbox"
                    checked={form.carnets_acceptes === true}
                    onChange={e => setForm(prev => ({ ...prev, carnets_acceptes: e.target.checked }))}
                    style={{ marginTop: 2, accentColor: 'var(--brand)' }}
                  />
                  <span>
                    <strong>Accepter aussi les carnets/abos compatibles</strong>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {form.carnets_acceptes
                        ? 'Cours mixte : carnet compatible = séance décomptée, sinon paiement à la séance.'
                        : 'Décochée : personne ne décompte, tout le monde règle à la séance.'}
                    </span>
                  </span>
                </label>
              )}
              {form.tarif_unitaire && (
                <div style={{ marginTop: 10 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>💳 Lien de paiement Stripe (optionnel)</label>
                  <input
                    className="izi-input"
                    type="url"
                    value={form.stripe_payment_link_unit}
                    onChange={handleChange('stripe_payment_link_unit')}
                    placeholder="https://buy.stripe.com/…"
                    style={{ maxWidth: 380 }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                    Payment Link de ce cours (même prix) : tes élèves règlent par CB dès la
                    réservation, le paiement se rattache tout seul. Plan Complet.
                  </span>
                </div>
              )}
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

      {/* Payable avec — qui couvre cette séance (feedback Camille 2026-08-20).
          Masqué en édition : le type peut y changer, le bloc se recalcule à la
          sortie. L'édition d'une couverture écrit dans L'OFFRE (édition A). */}
      {!editing && (
        <CouvertureCours
          cours={cours}
          offres={offresCatalogue}
          typesCours={typesCours}
          nbSeancesType={nbSeancesType}
          onChoisirType={() => setEditing(true)}
        />
      )}

      {/* Confier le pointage à quelqu'un sans compte (v100) — replié, et muet
          tant qu'on ne l'ouvre pas. Masqué en édition, comme la couverture. */}
      {!editing && (
        <IntervenanteCours
          cours={cours}
          intervenantes={intervenantes}
          intervenantInit={intervenantInit}
          indisponible={intervenanteIndispo}
        />
      )}
      {!editing && <ConfierPointage cours={cours} />}

      </div>{/* /cours-left */}
      <div className="cours-right">

      {/* Inscrits */}
      <div className="section">
        <div className="section-header">
          <h2><Users size={18} /> Inscrits ({presences.length})</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* Inscrire des élèves à tout moment (avant / pendant / après le
                cours) — le pointage accepte l'ajout hors de la fenêtre horaire.
                SAUF séance annulée (B1b, rouge) : pointer/ajouter sur une
                séance annulée re-décomptait des carnets. */}
            {!cours.est_annule && (
            <Link href={`/pointage/${cours.id}`} className="izi-btn btn-sm izi-btn-secondary">
              <UserPlus size={16} /> Ajouter des élèves
            </Link>
            )}
            {cours.visibilite === 'prive' && presences.length > 0 && (
              <button
                type="button"
                onClick={prevenirInvites}
                disabled={notifying}
                className="izi-btn btn-sm izi-btn-secondary"
                title="Envoie à chaque inscrit·e un email avec la date, l'heure et un lien direct vers son espace (jamais deux fois le même email)."
              >
                ✉️ {notifying ? 'Envoi…' : 'Prévenir par email'}
              </button>
            )}
            {!cours.est_annule && (
            <Link
              href={`/pointage/${cours.id}`}
              className={`izi-btn btn-sm ${nbPointes > 0 ? 'izi-btn-ghost btn-modifier-pointage' : 'izi-btn-secondary'}`}
            >
              <CheckCircle2 size={16} />
              {nbPointes > 0 ? 'Modifier le pointage' : 'Pointer'}
            </Link>
            )}
          </div>
        </div>

        {cours.est_annule && (
          <div className="pointage-banner" style={{ background: 'var(--bg-soft, #F8F4ED)' }}>
            <Lock size={16} />
            <span>Séance annulée : pointage et ajouts verrouillés (crédits restitués selon ta règle « Cours annulé »).</span>
          </div>
        )}

        {/* Bannière pointage effectué */}
        {nbPointes > 0 && (
          <div className="pointage-banner">
            <CheckCheck size={18} />
            <span>
              Pointage effectué : <strong>{nbPointes}/{presences.length}</strong> présent{nbPointes > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {cours.visibilite === 'prive' && (
          <div style={{ background: 'var(--bg-soft, #F8F4ED)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', margin: '0 0 12px', fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
            🔒 <strong>Cours privé</strong> : invisible sur ton portail.
            {presences.length === 0
              ? ' Ajoute ton élève (inscrit·e ou non : tu peux créer sa fiche à la volée), puis préviens-le/la par email.'
              : ' Les personnes ci-dessous le voient dans leur espace ; personne d\'autre.'}
          </div>
        )}
        {/* Prévisionnel de la séance (retour Maude) — mêmes chiffres que le
            récap du pointage, visibles AVANT la séance. */}
        {!cours.est_annule && presences.length > 0 && (
          <div className="argent-previsionnel">
            {argent.tarif ? (
              <>
                💶 <strong>Prévisionnel : {(argent.encaisse + argent.attendu).toFixed(2).replace('.', ',').replace(',00', '')} €</strong>
                {' · '}{argent.payes} payée{argent.payes > 1 ? 's' : ''} ({argent.encaisse.toFixed(2).replace('.', ',').replace(',00', '')} € encaissés) · {argent.aRegler} à régler ({argent.attendu.toFixed(2).replace('.', ',').replace(',00', '')} €)
                {argent.gratuits > 0 && <> · {argent.gratuits} essai/offert</>}
              </>
            ) : (
              <>
                🎟️ <strong>{argent.surCarnet} sur carnet/abo</strong>
                {argent.sansCarnet > 0 && <> · <strong className="argent-sans">{argent.sansCarnet} sans carnet applicable</strong> (à régler ou à traiter selon ta règle)</>}
                {argent.gratuits > 0 && <> · {argent.gratuits} essai/offert</>}
              </>
            )}
          </div>
        )}
        {presences.length === 0 ? (
          <div className="empty-inscrits">
            <p className="empty-text">{cours.visibilite === 'prive' ? 'Aucun·e invité·e pour le moment' : 'Aucun inscrit pour le moment'}</p>
            {!cours.est_annule && (
            <Link href={`/pointage/${cours.id}`} className="izi-btn btn-sm izi-btn-primary">
              <UserPlus size={16} /> Ajouter des élèves
            </Link>
            )}
          </div>
        ) : (
          <div className="inscrits-list">
            {presences.map(p => (
              <div
                key={p.id}
                className={`inscrit-row cliquable ${p.pointee ? 'pointe' : ''}`}
                role="button"
                tabIndex={0}
                title="Ouvrir la fiche ou modifier la réservation"
                onClick={() => { setResaConfirmDel(false); setResaModal(p); }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setResaConfirmDel(false); setResaModal(p); } }}
              >
                <div className="inscrit-info">
                  <span className="inscrit-nom">{p.clients?.prenom} {p.clients?.nom}</span>
                  <span className="inscrit-statut">{p.clients?.statut}</span>
                  {argent.parPresence[p.id]?.kind === 'carnet' && (
                    <span className="argent-chip chip-carnet" title="Cette séance sera décomptée de ce carnet/abo au pointage">🎟️ {argent.parPresence[p.id].nom}</span>
                  )}
                  {argent.parPresence[p.id]?.kind === 'sans' && (
                    <span className="argent-chip chip-sans" title="Aucun carnet/abo actif ne couvre ce cours : à régler ou à traiter selon ta règle « élève sans carnet »">Sans carnet</span>
                  )}
                  {argent.parPresence[p.id]?.kind === 'paye' && (
                    <span className="argent-chip chip-paye">✓ Payée</span>
                  )}
                  {argent.parPresence[p.id]?.kind === 'du' && (
                    <span className="argent-chip chip-du">À régler · {argent.parPresence[p.id].montant} €</span>
                  )}
                  {argent.parPresence[p.id]?.kind === 'essai' && (
                    <span className="argent-chip chip-gratuit">Essai</span>
                  )}
                  {argent.parPresence[p.id]?.kind === 'offert' && (
                    <span className="argent-chip chip-gratuit">Offert</span>
                  )}
                  {argent.parPresence[p.id]?.kind === 'excuse' && (
                    <span className="argent-chip chip-gratuit">Excusée, rien à régler</span>
                  )}
                </div>
                <span className="inscrit-droite">
                  {p.pointee && (
                    <span className="pointe-badge"><CheckCircle2 size={14} /> Pointé</span>
                  )}
                  <ChevronDown size={15} className="inscrit-chevron" aria-hidden="true" />
                </span>
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
          LISTE D'ATTENTE
          Visible si le cours a au moins une personne en attente.
          La promotion auto du 1er est gérée côté serveur (route /annuler)
          quand un inscrit annule (cf. v16 + route portail).
          Styles inline pour éviter conflit styled-jsx imbriqué.
          ================================================ */}
      {listeAttente.length > 0 && (
        <div className="izi-card" style={{ padding: '16px 18px', marginTop: 12 }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: '1rem' }}>
            <Clock size={18} /> Liste d'attente ({listeAttente.length})
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '6px 0 12px' }}>
            Notifiées automatiquement (par email), dans l'ordre, quand une place se libère par une annulation d'élève ou une résolution de cas. Tu peux aussi promouvoir à la main dès qu'une place est libre.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {listeAttente.map((entry, idx) => (
              <div key={entry.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px',
                background: 'var(--bg-soft, #F8F4ED)',
                borderRadius: 'var(--radius-sm)',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'var(--brand-light)', color: 'var(--brand-700)',
                  fontSize: '0.75rem', fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>{idx + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                    {entry.nom || '(sans nom)'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <a href={`mailto:${entry.email}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>{entry.email}</a>
                    {entry.telephone && <> · <a href={`tel:${entry.telephone}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>{entry.telephone}</a></>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {entry.notified_at ? (
                    <span style={{
                      padding: '3px 9px', borderRadius: 99,
                      fontSize: '0.6875rem', fontWeight: 600,
                      background: 'var(--success-light)', color: 'var(--success)',
                    }}>Notifié·e</span>
                  ) : placesDispos > 0 ? (
                    <button
                      type="button"
                      onClick={() => promouvoirEntree(entry.id)}
                      disabled={promotingId === entry.id}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '5px 10px', borderRadius: 8,
                        background: 'var(--brand)', color: 'white',
                        border: '1.5px solid var(--brand)',
                        fontSize: '0.6875rem', fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      title="Donner la place + envoyer email"
                    >
                      {promotingId === entry.id ? '...' : <><Send size={11} /> Promouvoir</>}
                    </button>
                  ) : (
                    <span style={{
                      padding: '3px 9px', borderRadius: 99,
                      fontSize: '0.6875rem', fontWeight: 600,
                      background: 'var(--cream-dark)', color: 'var(--text-secondary)',
                    }}>En attente</span>
                  )}
                  {!entry.notified_at && (
                    <button
                      type="button"
                      onClick={() => retirerEntree(entry.id, entry.nom)}
                      disabled={promotingId === entry.id}
                      style={{
                        padding: 5,
                        background: 'transparent',
                        border: '1.5px solid var(--border)',
                        borderRadius: 8,
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                      }}
                      title="Retirer de la liste d'attente"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {placesDispos > 0 && listeAttente.some(e => !e.notified_at) && (
            <p style={{ fontSize: '0.75rem', color: '#7c4a03', margin: '10px 0 0', background: '#fef3c7', padding: '6px 10px', borderRadius: 6 }}>
              💡 {placesDispos} place{placesDispos > 1 ? 's' : ''} libre{placesDispos > 1 ? 's' : ''} : pense à promouvoir les personnes en attente.
            </p>
          )}
        </div>
      )}

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
              {/* Ce panneau change ce que SONT les séances (nom, heure, lieu,
                  tarif), jamais COMBIEN il y en a. La date de fin vit sur
                  l'écran des séries. Retour Léa 2026-08-21 : « toujours pas
                  possible de modifier le nombre de cours d'une série » — elle
                  cherchait ici, et rien n'y menait. */}
              <Link
                href={`/cours/recurrences?rec=${cours.recurrence_parent_id}&ajuster=1`}
                className="recurrence-ajuster-lien"
              >
                <CalendarPlus size={15} />
                <span>
                  <strong>Changer le nombre de séances</strong>
                  Rallonger la série, la raccourcir, ou combler les vacances : ça se règle sur l&apos;écran de tes séries.
                </span>
                <ArrowRight size={15} />
              </Link>

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
                {/* Le jour d'abord : c'est le réglage le plus structurant, et
                    celui qui manquait (retour Colin 2026-08-23). */}
                <div className="form-group">
                  <label className="form-label"><Calendar size={14} /> Jour de la semaine</label>
                  {occurrencesSerie === null ? (
                    <span className="jour-serie-hint">Lecture des séances à venir…</span>
                  ) : !deplacable.ok ? (
                    <span className="jour-serie-hint">{deplacable.raison}</span>
                  ) : (
                    <>
                      <div className="type-chips">
                        {JOURS_SEMAINE.map(j => (
                          <button
                            key={j.value}
                            type="button"
                            className={`chip ${(jourVise || deplacable.jourActuel) === j.value ? 'selected' : ''}`}
                            onClick={() => setJourVise(j.value)}
                          >
                            {j.label}
                          </button>
                        ))}
                      </div>
                      {planJour ? (
                        <div className="jour-serie-apercu">{apercuDeplacement(planJour)}</div>
                      ) : (
                        <span className="jour-serie-hint">
                          Tes séances à venir tombent le {JOUR_LONG[deplacable.jourActuel]}. Choisis un autre jour pour les décaler toutes.
                        </span>
                      )}
                    </>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Nom du cours</label>
                  <input className="izi-input" type="text"
                    value={recurrenceForm.nom}
                    onChange={e => setRecurrenceForm(p => ({ ...p, nom: e.target.value }))}
                    placeholder="Ex : Yoga Vinyasa" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label"><Clock size={14} /> Heure</label>
                    <HeureSelect value={recurrenceForm.heure} onChange={v => setRecurrenceForm(p => ({ ...p, heure: v }))} />
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
                      <option key={l.id} value={l.id}>{l.nom}{l.adresse ? `, ${l.adresse}` : ''}</option>
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

                <div className="form-group">
                  <label className="form-label">💰 Payable à la séance (optionnel)</label>
                  <input
                    className="izi-input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={recurrenceForm.tarif_unitaire}
                    onChange={e => setRecurrenceForm(p => ({ ...p, tarif_unitaire: e.target.value }))}
                    placeholder="Prix à la séance (€), vide = couvert par les carnets"
                    style={{ maxWidth: 280 }}
                  />
                  {recurrenceForm.tarif_unitaire ? (
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: '0.78rem', marginTop: 6 }}>
                      <input
                        type="checkbox"
                        checked={recurrenceForm.carnets_acceptes === true}
                        onChange={e => setRecurrenceForm(p => ({ ...p, carnets_acceptes: e.target.checked }))}
                        style={{ marginTop: 2, accentColor: 'var(--brand)' }}
                      />
                      <span>
                        Accepter aussi les carnets/abos compatibles
                        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {recurrenceForm.carnets_acceptes
                            ? 'Mixte : carnet compatible = décompté, sinon paiement à la séance.'
                            : 'Décochée : personne ne décompte, tout le monde règle à la séance.'}
                        </span>
                      </span>
                    </label>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                      Vide = ces séances sont couvertes par les carnets/abos.
                    </span>
                  )}
                  {recurrenceForm.tarif_unitaire ? (
                    <div style={{ marginTop: 8 }}>
                      <input
                        className="izi-input"
                        type="url"
                        value={recurrenceForm.stripe_payment_link_unit}
                        onChange={e => setRecurrenceForm(p => ({ ...p, stripe_payment_link_unit: e.target.value }))}
                        placeholder="💳 Lien de paiement Stripe (optionnel) : https://buy.stripe.com/…"
                        style={{ maxWidth: 380 }}
                      />
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                        CB à la réservation pour ces séances (plan Complet).
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Confirmation obligatoire */}
              <label className="recurrence-confirm-label">
                <input type="checkbox"
                  checked={recurrenceConfirmed}
                  onChange={e => setRecurrenceConfirmed(e.target.checked)} />
                <span>
                  Je confirme vouloir modifier les <strong>{nbOccurrences} prochaines séances</strong> de cette série
                  {planJour ? <> et les <strong>déplacer au {JOUR_LONG[jourVise]}</strong></> : null}
                </span>
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
          <div className="modal msg-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="msg-modal-header">
              <h3><Mail size={18} /> Message aux participants</h3>
              <button className="modal-close-btn" onClick={() => setShowMessageModal(false)} type="button" aria-label="Fermer">
                <X size={18} />
              </button>
            </div>

            <div className="msg-to">
              <span className="msg-to-label">À</span>
              <div className="msg-to-list">
                {/* Le serveur announce filtre déjà les annulés — les afficher
                    ici promettait des envois qui ne partaient pas (B1b). */}
                {presences.filter(presenceOccupePlace).map(p => (
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

            <div style={{ padding: '0 20px' }}>
              <AttachmentPicker attachments={msgAttachments} onChange={setMsgAttachments} disabled={sendingMessage} />
            </div>

            <div className="modal-actions" style={{ padding: '0 20px 20px' }}>
              <button className="izi-btn izi-btn-ghost"
                onClick={() => setShowMessageModal(false)}
                disabled={sendingMessage}>
                Annuler
              </button>
              <button className="izi-btn izi-btn-primary"
                onClick={handleSendMessage}
                disabled={(!messageForm.message.trim() && msgAttachments.length === 0) || sendingMessage}>
                <Send size={16} />
                {sendingMessage ? 'Envoi…' : `Envoyer via la messagerie IziSolo`}
              </button>
            </div>
            <p style={{ padding: '0 20px 20px', fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              ✉️ Le message est envoyé via la <strong>messagerie interne IziSolo</strong> :
              chaque participant le retrouve dans son espace élève et reçoit
              <strong> un email tout de suite</strong> (selon ses réglages de notifications).
              Les réponses arrivent dans <a href="/messagerie" style={{ color: 'var(--brand-700)' }}>ta messagerie</a>.
            </p>
          </div>
        </div>
      )}

      {/* ================================================
          MODALE RÉSERVATION (clic sur un·e inscrit·e)
          ================================================ */}
      {resaModal && (
        <div className="modal-overlay" onClick={() => !resaBusy && setResaModal(null)}>
          <div className="resa-modal" onClick={e => e.stopPropagation()}>
            <div className="resa-modal-head">
              <h3>Réservation : {resaModal.clients?.prenom} {resaModal.clients?.nom}</h3>
              <button className="modal-close-x" onClick={() => setResaModal(null)} aria-label="Fermer" type="button">✕</button>
            </div>

            <Link href={`/clients/${resaModal.client_id || resaModal.clients?.id}`} className="resa-modal-fiche">
              <Users size={15} /> Ouvrir la fiche élève →
            </Link>
            <Link href={`/messagerie?with=${resaModal.client_id || resaModal.clients?.id}`} className="resa-modal-fiche">
              <MessageSquare size={15} /> Envoyer un message →
            </Link>

            {(resaModal.annulation_tardive || ['annule', 'declinee'].includes(resaModal.statut_pointage)) ? (
              <p className="resa-modal-note">
                Cette réservation est {resaModal.annulation_tardive ? 'une annulation tardive' : 'annulée'} : 
                tu peux seulement la supprimer.
              </p>
            ) : (
              <div className="resa-modal-types">
                <span className="resa-modal-label">Type de séance</span>
                <div className="resa-type-btns">
                  {[['normal', 'Normale'], ['essai', 'Essai'], ['offert', 'Offerte']].map(([val, lab]) => (
                    <button
                      key={val}
                      type="button"
                      disabled={resaBusy}
                      className={`resa-type-btn ${(resaModal.type_presence || 'normal') === val ? 'selected' : ''}`}
                      onClick={() => handleChangerType(resaModal, val)}
                    >
                      {lab}
                    </button>
                  ))}
                </div>
                <p className="resa-modal-hint">
                  Une séance « essai » ou « offerte » ne décompte pas de carnet : si elle avait
                  déjà été décomptée, elle est re-créditée automatiquement.
                </p>
              </div>
            )}

            <div className="resa-modal-danger">
              {!resaConfirmDel ? (
                <button type="button" className="izi-btn izi-btn-ghost resa-del-btn" disabled={resaBusy} onClick={() => setResaConfirmDel(true)}>
                  <Trash2 size={15} /> Supprimer la réservation
                </button>
              ) : (
                <div className="resa-del-confirm">
                  <span>
                    Supprimer la réservation de {resaModal.clients?.prenom} ?
                    {resaModal.abonnement_id ? ' La séance sera re-créditée sur son carnet si elle avait été décomptée.' : ''}
                    {' '}S&apos;il y a une liste d&apos;attente, la première personne est promue.
                  </span>
                  <div className="resa-del-actions">
                    <button type="button" className="izi-btn izi-btn-ghost" disabled={resaBusy} onClick={() => setResaConfirmDel(false)}>Garder</button>
                    <button type="button" className="izi-btn izi-btn-danger" disabled={resaBusy} onClick={() => handleSupprimerResa(resaModal)}>
                      {resaBusy ? 'Suppression…' : 'Oui, supprimer'}
                    </button>
                  </div>
                </div>
              )}
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
          <div className="modal sms-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="sms-modal-header">
              <h3><Smartphone size={18} /> SMS aux participants</h3>
              <button className="modal-close-btn" onClick={() => setShowSmsModal(false)} type="button" aria-label="Fermer"><X size={18} /></button>
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
                {/* Un SMS partirait VRAIMENT aux annulés (payload brut) —
                    dormant tant que SMS_ENABLED=false, filtré quand même (B1b). */}
                {presences.filter(presenceOccupePlace).map(p => (
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
              <X size={16} /> Annuler cette séance
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
          <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3><AlertTriangle size={20} /> Supprimer cette séance</h3>

            {isRecurrent ? (
              <div className="delete-options">
                <p>Cette séance fait partie d'une série récurrente. Que souhaitez-vous supprimer ?</p>

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

        /* Domicile banner */
        .domicile-detail-banner {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 16px; border-radius: 12px;
          background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%);
          border: 1.5px solid #a5d6a7;
        }
        .domicile-detail-icon { color: #2e7d32; flex-shrink: 0; }
        .domicile-detail-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .domicile-detail-info strong { font-size: 0.875rem; color: #1b5e20; }
        .domicile-detail-addr {
          display: flex; align-items: center; gap: 4px;
          font-size: 0.75rem; color: #558b2f;
        }
        .domicile-detail-frais { font-size: 0.75rem; color: #558b2f; font-weight: 600; }
        .domicile-detail-maps {
          display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0;
          padding: 6px 12px; border-radius: 99px;
          background: #4caf50; color: white;
          font-size: 0.75rem; font-weight: 600;
          text-decoration: none; transition: background 0.15s;
        }
        .domicile-detail-maps:hover { background: #388e3c; }

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
        /* Petit mobile : une colonne — deux champs côte à côte écrasaient
           date et heure jusqu'à l'illisible (retours Maude, 08/2026). */
        @media (max-width: 480px) {
          .form-row { grid-template-columns: 1fr; }
        }
        .jour-serie-hint { font-size: 0.75rem; color: var(--text-muted); }
        .jour-serie-apercu {
          font-size: 0.78rem; font-weight: 600; color: #854d0e;
          background: var(--warning-light, #F5EBD2);
          border-radius: 8px; padding: 8px 10px; margin-top: 6px;
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
        .empty-inscrits {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 12px 0 4px;
          text-align: center;
        }
        .empty-inscrits .empty-text { padding: 0; }
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
        .inscrit-row.cliquable { cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; }
        .inscrit-row.cliquable:hover { border-color: var(--brand-300, #d0a8a8); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); }
        .inscrit-droite { display: flex; align-items: center; gap: 8px; }
        .inscrit-chevron { color: var(--text-muted); flex-shrink: 0; }
        /* ── Modale réservation ── */
        .resa-modal {
          background: var(--bg-card, #fff); border-radius: 16px; width: min(440px, 92vw);
          padding: 0 0 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
        }
        .resa-modal-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px 10px;
        }
        .resa-modal-head h3 { margin: 0; font-size: 1rem; }
        .resa-modal-fiche {
          display: flex; align-items: center; gap: 8px; margin: 0 20px 12px;
          padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px;
          text-decoration: none; color: var(--text-primary); font-weight: 600; font-size: 0.875rem;
        }
        .resa-modal-fiche:hover { border-color: var(--brand-300, #d0a8a8); }
        .resa-modal-note { margin: 0 20px 12px; font-size: 0.8125rem; color: var(--text-secondary); }
        .resa-modal-types { padding: 0 20px 4px; }
        .resa-modal-label { display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px; }
        .resa-type-btns { display: flex; gap: 6px; }
        .resa-type-btn {
          flex: 1; padding: 8px 10px; border-radius: 10px; font-size: 0.8125rem; font-weight: 600;
          border: 1px solid var(--border); background: var(--bg-card, #fff); color: var(--text-primary); cursor: pointer;
        }
        .resa-type-btn.selected { background: var(--brand-50); border-color: var(--brand-300, #d0a8a8); color: var(--brand-700); }
        .resa-type-btn:disabled { opacity: 0.5; cursor: wait; }
        .resa-modal-hint { font-size: 0.75rem; color: var(--text-muted); margin: 8px 0 0; line-height: 1.45; }
        .resa-modal-danger { margin: 14px 20px 0; padding-top: 12px; border-top: 1px solid var(--border); }
        .resa-del-btn { color: #b03030; width: 100%; justify-content: center; }
        .resa-del-confirm { font-size: 0.8125rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 10px; }
        .resa-del-actions { display: flex; gap: 8px; justify-content: flex-end; }
        .inscrit-info {
          display: flex;
          flex-direction: column;
        }
        .inscrit-nom {
          font-weight: 600;
          font-size: 0.875rem;
        }
        .argent-previsionnel {
          padding: 10px 14px;
          margin: 0 0 12px;
          background: var(--bg-soft, #F8F4ED);
          border: 1px dashed var(--border);
          border-radius: 10px;
          font-size: 0.8125rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        .argent-previsionnel strong { color: var(--text-primary); }
        .argent-previsionnel .argent-sans { color: var(--hot, #E8722A); }
        .argent-chip {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .chip-carnet  { background: var(--sage-light, #E5EBE5); color: var(--sage-deep, #2C3935); }
        .chip-sans    { background: var(--hot-light, #FCE8DA);  color: var(--hot, #E8722A); }
        .chip-paye    { background: var(--success-light, #E2EDDE); color: var(--success, #6B9A6B); }
        .chip-du      { background: var(--warning-light, #F5EBD2); color: #854d0e; }
        .chip-gratuit { background: var(--info-light, #DEE8EE);  color: var(--info, #5A8AA8); }
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
        /* Lien vers l'écran des séries. Bloc déjà GLOBAL, donc le <Link> est
           bien atteint (piège styled-jsx × composants, bible §12). */
        .recurrence-ajuster-lien {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 14px; margin-bottom: 14px;
          border: 1px solid var(--border); border-radius: var(--radius-md);
          background: var(--bg-card); text-decoration: none;
          color: var(--text-primary);
        }
        .recurrence-ajuster-lien:hover { border-color: var(--brand); }
        .recurrence-ajuster-lien > svg:first-child { color: var(--brand); flex-shrink: 0; }
        .recurrence-ajuster-lien > svg:last-child { color: var(--text-muted); flex-shrink: 0; }
        .recurrence-ajuster-lien span { flex: 1; min-width: 0; font-size: 0.8125rem; color: var(--text-muted); line-height: 1.4; }
        .recurrence-ajuster-lien strong { display: block; font-size: 0.875rem; color: var(--text-primary); }

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
