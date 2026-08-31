'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Plus, Package, Ticket, CalendarCheck, Zap, Trash2,
  ToggleLeft, ToggleRight, UserPlus, X, Crown, ArrowRight, Pencil,
} from 'lucide-react';
import AideContextuelle from '@/components/AideContextuelle';
import { formatMontant } from '@/lib/utils';
import { libelleSeances } from '@/lib/offres-seances';
import { resumeDemande, contactDemandeur } from '@/lib/demande-offre';
import { useToast } from '@/components/ui/ToastProvider';
import { toneForOffre } from '@/lib/tones';
import { TYPES_OFFRE } from '@/lib/constantes';
import { createClient } from '@/lib/supabase';
import { diagnostiquerOffres } from '@/lib/coherence-offres';
import EmptyState from '@/components/ui/EmptyState';
import VenteOffreModal from '@/components/paiements/VenteOffreModal';
import { useStudioId } from '@/components/studio/StudioProvider';

const TYPE_ICONS = { carnet: Ticket, abonnement: CalendarCheck, cours_unique: Zap };

// Le tunnel de vente (ex-AssignerClientModal) vit désormais dans
// components/paiements/VenteOffreModal.js — partagé avec Carnets & abos
// (lot simplification 2026-08-18).

// ═══════════════════════════════════════════════════════════════════════════
// Composant principal
// ═══════════════════════════════════════════════════════════════════════════
// ── Diagnostic de cohérence offres ↔ cours (analyse système 2026-07-28, cas
// Manon) : détecte les pièges silencieux — restriction inerte (cours sans
// type couverts malgré la limite), type fantôme, offre « à l'unité » legacy.
function DiagnosticOffres({ offres }) {
  const [coursAVenir, setCoursAVenir] = useState(null);

  useEffect(() => {
    let vivant = true;
    (async () => {
      try {
        const supabase = createClient();
        const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
        const { data, error } = await supabase
          .from('cours')
          .select('type_cours, date')
          .gte('date', today)
          .eq('est_annule', false)
          .limit(500);
        if (!error && vivant) setCoursAVenir(data || []);
      } catch { /* diagnostic silencieux */ }
    })();
    return () => { vivant = false; };
  }, []);

  if (!coursAVenir) return null;
  const issues = diagnostiquerOffres(offres, coursAVenir);
  if (issues.length === 0) return null;
  // Les offres « à l'unité » legacy se groupent en UNE ligne (retour Camille
  // 2026-07-30 : 3 offres du même nom = 3 lignes quasi identiques, illisible).
  const legacy = issues.filter(i => i.kind === 'legacy_unite');
  const autres = issues.filter(i => i.kind !== 'legacy_unite');

  return (
    <div className="izi-card diag-offres animate-fade-in">
      <div className="diag-offres-titre">🔍 À vérifier dans tes offres</div>
      <ul className="diag-offres-liste">
        {autres.map(({ kind, offre, analyse }) => (
          <li key={offre.id || offre.nom}>
            {kind === 'restriction_inerte' && (
              <><strong>{offre.nom}</strong> est limitée à {offre.types_cours_autorises.join(' / ')},
                mais <strong>{analyse.sansType} séance{analyse.sansType > 1 ? 's' : ''} à venir</strong> n&apos;ont
                pas de type : elles sont quand même couvertes (un cours sans type est toujours accepté).
                Renseigne le type sur tes cours pour que la limite s&apos;applique.</>
            )}
            {kind === 'type_fantome' && (
              <><strong>{offre.nom}</strong> est limitée à {offre.types_cours_autorises.join(' / ')},
                mais <strong>aucune séance à venir</strong> ne porte ce type
                {analyse.sansType > 0 ? <> ({analyse.sansType} sans type restent couvertes)</> : null}.
                Vérifie le type de tes cours ou la restriction.</>
            )}
          </li>
        ))}
        {legacy.length > 0 && (
          <li key="legacy-unite">
            {legacy.length === 1
              ? <><strong>{legacy[0].offre.nom}</strong> (offre « à l&apos;unité ») ne s&apos;affiche pas</>
              : <><strong>{legacy.length} offres « à l&apos;unité »</strong> ({legacy.map(i => i.offre.nom).join(', ')}) ne s&apos;affichent pas</>}
            {' '}à la réservation : le paiement à la séance se règle désormais sur chaque cours
            (fiche du cours → <strong>Tarif à la séance</strong>, + « carnets acceptés » si besoin).
          </li>
        )}
      </ul>
      <style jsx>{`
        .diag-offres { padding: 14px 18px; margin-bottom: 14px; border-left: 3px solid #c9a227; }
        .diag-offres-titre { font-weight: 700; font-size: 0.875rem; margin-bottom: 8px; }
        .diag-offres-liste { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 8px; }
        .diag-offres-liste li { font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.5; }
      `}</style>
    </div>
  );
}

// ── Grille tarifaire invisible sur le portail (retour Kim 2026-08-20 : la
// prof a conclu « l'élève n'a pas accès à mes tarifs » alors que le réglage
// existe, à FALSE par défaut depuis v14 et enterré dans Paramètres → Ma page).
// Dès qu'un catalogue existe, on propose le geste en 1 clic — même écriture
// directe de profiles que la sauvegarde par carte des Paramètres (B2e).
function TarifsPortailHint({ profile, offres }) {
  // Le studio affiché (v101) : `user.id` ne suffit plus, une prof peut être
  // invitée dans le studio d'une autre. Ce sous-composant écrit aussi, il lui faut la même réponse.
  const studioId = useStudioId();
  const [visible, setVisible] = useState(false);
  const [fait, setFait] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    const actives = (offres || []).filter(o => o.actif !== false && o.type !== 'cours_unique');
    if (actives.length === 0) return;
    if (profile?.afficher_tarifs === true) return;
    try { if (localStorage.getItem('izi_tarifs_portail_hint_off') === '1') return; } catch { /* privé */ }
    setVisible(true);
  }, [offres, profile]);

  if (!visible) return null;

  const activer = async () => {
    setBusy(true);
    setErreur('');
    try {
      const supabase = createClient();
      const { error } = await supabase.from('profiles').update({ afficher_tarifs: true }).eq('id', studioId);
      if (error) throw error;
      setFait(true);
    } catch (e) {
      setErreur(e.message || 'La modification a échoué');
    } finally {
      setBusy(false);
    }
  };

  const masquer = () => {
    try { localStorage.setItem('izi_tarifs_portail_hint_off', '1'); } catch { /* privé */ }
    setVisible(false);
  };

  return (
    <div className="izi-card tarhint animate-fade-in">
      {fait ? (
        <div className="tarhint-body">
          <span>✓ C&apos;est fait : ta grille tarifaire est visible sur ton portail.</span>
          {profile?.studio_slug && (
            <a className="tarhint-btn" href={`/p/${profile.studio_slug}`} target="_blank" rel="noopener noreferrer">
              Voir ma page <ArrowRight size={14} />
            </a>
          )}
        </div>
      ) : (
        <>
          <div className="tarhint-body">
            <span>
              👀 <strong>Tes élèves ne voient pas encore ta grille tarifaire.</strong> Tes offres
              existent, mais ton portail ne les affiche pas tant que « Afficher mes tarifs »
              est désactivé (Paramètres → Ma page).
            </span>
            <button type="button" className="tarhint-btn" onClick={activer} disabled={busy}>
              {busy ? 'Activation…' : 'Afficher ma grille sur mon portail'}
            </button>
          </div>
          {erreur && <p className="tarhint-err">{erreur}</p>}
          <button type="button" className="tarhint-close" onClick={masquer} aria-label="Ne plus afficher">
            <X size={15} />
          </button>
        </>
      )}
      {/* Global (préfixe tarhint-) : règle 2026-08-19, classes sur composants
          possibles à terme — préfixe unique, zéro collision. */}
      <style jsx global>{`
        .tarhint { position: relative; border-left: 3px solid var(--brand, #B87333); }
        .tarhint-body {
          display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
          font-size: 0.8438rem; color: var(--text-secondary, #6B5D52); line-height: 1.5;
        }
        .tarhint-body > span { flex: 1; min-width: 220px; }
        .tarhint-body strong { color: var(--text-primary, #3D3229); }
        .tarhint-btn {
          display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
          background: var(--brand, #B87333); color: #fff; border: none; border-radius: 10px;
          padding: 8px 14px; font-size: 0.8125rem; font-weight: 600; font-family: inherit;
          cursor: pointer; text-decoration: none;
        }
        .tarhint-btn:hover { background: var(--brand-700, #8c5826); }
        .tarhint-btn[disabled] { opacity: 0.6; cursor: default; }
        .tarhint-err { margin: 8px 0 0; font-size: 0.78rem; color: var(--hot, #E8722A); }
        .tarhint-close {
          position: absolute; top: 8px; right: 8px; background: none; border: none;
          color: var(--text-muted, #9A8C7E); cursor: pointer; padding: 4px; line-height: 0;
        }
      `}</style>
    </div>
  );
}

export default function OffresClient({ offres, profile, planKey, limiteOffres, demandes: demandesInit = [], offresSansWebhook = 0 }) {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [deleting, setDeleting] = useState(null);
  const [assignModalOffre, setAssignModalOffre] = useState(null); // offre sélectionnée pour le modal
  // Demandes d'élèves (v97) : une intention d'achat, pas une vente. La prof
  // valide en passant par le tunnel habituel, où elle choisit le règlement.
  const [demandes, setDemandes] = useState(demandesInit);
  const [demandeEnCours, setDemandeEnCours] = useState(null);   // { demande, client }
  const [traitement, setTraitement] = useState('');

  const marquerDemande = async (id, statut) => {
    setTraitement(id);
    try {
      const res = await fetch(`/api/demandes-offre/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Erreur');
      setDemandes(prev => prev.filter(d => d.id !== id));
    } catch (e) {
      toast.error(String(e.message || e));
    } finally {
      setTraitement('');
    }
  };

  // Attribuer : on ouvre le tunnel de vente sur l'offre demandée, avec l'élève
  // déjà désignée. Une prospecte venue de la page publique n'a PAS de fiche :
  // on la crée d'abord, sinon le tunnel s'ouvrait sur « Choisir un élève » —
  // une liste où elle n'existe pas, et un lien « Ajouter un élève » qui ferme
  // la modale et perd la demande. C'est ce cul-de-sac qui a laissé Maude
  // devant une demande à 480 € sans savoir qui c'était (31/08/2026).
  const attribuerDepuisDemande = async (demande) => {
    const offre = offres.find(o => o.id === demande.offre_id);
    if (!offre) { toast.error('Cette offre n\'existe plus.'); return; }
    let client = demande.clients
      ? { id: demande.clients.id, prenom: demande.clients.prenom, nom: demande.clients.nom, type_client: 'particulier' }
      : null;

    // Dédup par email côté route : si la personne est déjà fichée sous cette
    // adresse, on reprend SA fiche au lieu d'en fabriquer une deuxième.
    if (!client) {
      setTraitement(demande.id);
      try {
        const res = await fetch(`/api/demandes-offre/${demande.id}/fiche`, { method: 'POST' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.client) throw new Error(json.error || 'Fiche non créée.');
        client = { ...json.client, type_client: json.client.type_client || 'particulier' };
        toast.success(json.creee
          ? `Fiche créée pour ${[client.prenom, client.nom].filter(Boolean).join(' ')}.`
          : 'Une fiche existait déjà à cette adresse : on la reprend.');
      } catch (e) {
        toast.error(String(e.message || e));
        setTraitement('');
        return;
      }
      setTraitement('');
    }

    setDemandeEnCours({ demande, client });
    setAssignModalOffre(offre);
  };
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // ?creee=<id> (retour de « Créer une offre ») → bannière « Vendre cette
  // offre » : la promesse du formulaire (« on te le proposera juste après »).
  const [offreCreee, setOffreCreee] = useState(null);
  useEffect(() => {
    const id = searchParams.get('creee');
    if (!id) return;
    const o = offres.find(x => x.id === id && x.actif);
    if (o) setOffreCreee(o);
  }, [searchParams, offres]);

  const limitReached = limiteOffres != null && offres.length >= limiteOffres;

  const toggleActif = async (offre) => {
    const supabase = createClient();
    await supabase.from('offres').update({ actif: !offre.actif }).eq('id', offre.id);
    router.refresh();
  };

  const deleteOffre = async (id) => {
    if (!confirm('Supprimer cette offre ?')) return;
    setDeleting(id);
    const supabase = createClient();
    await supabase.from('offres').delete().eq('id', id);
    router.refresh();
    setDeleting(null);
  };

  const actives = offres.filter(o => o.actif);
  const inactives = offres.filter(o => !o.actif);

  const renderCard = (offre, active) => {
    const TypeIcon = TYPE_ICONS[offre.type] || Package;
    const typeInfo = TYPES_OFFRE[offre.type] || {};
    const tone = toneForOffre(offre.type);
    return (
      <div key={offre.id} className={`offre-card izi-card offre-card--${tone} ${!active ? 'offre-inactive' : ''}`}>
        <div className="offre-icon"><TypeIcon size={20} /></div>
        <div className="offre-info">
          <div className="offre-nom">{offre.nom}</div>
          <div className="offre-details">
            <span className={`izi-badge tone-${tone}-bg`}>{typeInfo.label || offre.type}</span>
            {offre.type === 'abonnement'
              ? <span className="offre-seances">{libelleSeances(offre)}</span>
              : offre.seances && <span className="offre-seances">{offre.seances} séance{offre.seances > 1 ? 's' : ''}</span>}
            {offre.duree_jours && <span className="offre-duree">{offre.duree_jours}j</span>}
          </div>
        </div>
        <div className="offre-prix">{formatMontant(offre.prix)}</div>
        <div className="offre-actions">
          <Link
            href={`/offres/${offre.id}/edit`}
            className="action-btn"
            title="Modifier"
            aria-label="Modifier l'offre"
          >
            <Pencil size={16} />
          </Link>
          {active && (
            <button
              onClick={() => setAssignModalOffre(offre)}
              className="vendre-btn"
              title="Vendre cette offre à un élève"
              type="button"
            >
              <UserPlus size={15} /> Vendre
            </button>
          )}
          <button
            onClick={() => toggleActif(offre)}
            className="action-btn"
            title={active ? 'Désactiver' : 'Réactiver'}
            aria-label={active ? 'Désactiver l\'offre' : 'Réactiver l\'offre'}
            type="button"
          >
            {active
              ? <ToggleRight size={20} style={{ color: 'var(--success)' }} />
              : <ToggleLeft size={20} />
            }
          </button>
          <button
            onClick={() => deleteOffre(offre.id)}
            className="action-btn"
            title="Supprimer"
            aria-label="Supprimer l'offre"
            type="button"
            disabled={deleting === offre.id}
          >
            <Trash2 size={16} style={{ color: 'var(--danger)' }} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="offres-page">
      {/* Paiement en ligne branché à moitié : des Payment Links sont collés,
          mais IziSolo ne saura pas quand une élève paie. Tant que c'est le cas,
          on ne propose PAS le paiement côté élève (elle « demande » l'offre) —
          et on le dit ici, franchement, plutôt que de couper en silence. */}
      {offresSansWebhook > 0 && (
        <div className="webhook-alerte">
          <div className="webhook-alerte-titre">
            ⚠️ Ton paiement en ligne n&apos;est pas terminé
          </div>
          <p className="webhook-alerte-txt">
            {offresSansWebhook === 1
              ? 'Une de tes offres a un lien de paiement Stripe'
              : `${offresSansWebhook} de tes offres ont un lien de paiement Stripe`}, mais
            il manque la dernière étape : dire à Stripe de prévenir IziSolo quand une élève paie.
            Sans elle, un paiement arrive bien sur ton compte Stripe, mais il n&apos;apparaît
            ni dans tes revenus ni sur la fiche de l&apos;élève, et son carnet n&apos;est pas créé.
            En attendant, tes élèves ne voient pas le bouton « payer » : elles voient
            <strong> « Demander »</strong>, leur demande arrive ici, et tu encaisses comme tu veux.
          </p>
          <Link href="/parametres?tab=portail&s=paiement" className="izi-btn btn-sm izi-btn-primary">
            Terminer la configuration
          </Link>
        </div>
      )}

      {/* Demandes d'élèves (v97) — en tête : c'est de l'argent qui attend
          un geste, ça ne se range pas en bas de page. */}
      {demandes.length > 0 && (
        <div className="dem-bloc">
          <div className="dem-titre">
            🛒 {demandes.length} demande{demandes.length > 1 ? 's' : ''} d&apos;élève{demandes.length > 1 ? 's' : ''}
          </div>
          <p className="dem-sous">
            Rien n&apos;est encaissé : tu attribues l&apos;offre et tu choisis le règlement.
          </p>
          {demandes.map(d => {
            const offre = offres.find(o => o.id === d.offre_id);
            const r = resumeDemande(d);
            // Le moyen de RECONTACTER, enfin affiché (31/08/2026) : l'email
            // était en base depuis le premier jour, aucun écran ne le montrait.
            const contact = contactDemandeur(d);
            return (
              <div key={d.id} className="dem-ligne">
                <div className="dem-info">
                  <div className="dem-nom">
                    {r.nom}
                    {r.prospect && <span className="dem-badge">page publique · pas encore de fiche</span>}
                  </div>
                  <div className="dem-offre">
                    {offre ? offre.nom : 'Offre supprimée'} · {r.quand}
                  </div>
                  <div className="dem-contact">
                    {contact.email
                      ? <a href={`mailto:${contact.email}`} className="dem-lien">✉️ {contact.email}</a>
                      : <span className="dem-sans-contact">Aucune adresse : impossible de la recontacter d&apos;ici.</span>}
                    {contact.telephone && (
                      <a href={`tel:${contact.telephone.replace(/\s/g, '')}`} className="dem-lien">📞 {contact.telephone}</a>
                    )}
                  </div>
                  {d.message && <div className="dem-message">« {d.message} »</div>}
                </div>
                <div className="dem-actions">
                  <button
                    className="izi-btn izi-btn-primary dem-btn"
                    onClick={() => attribuerDepuisDemande(d)}
                    disabled={!offre || traitement === d.id}
                  >
                    {traitement === d.id ? 'Un instant…'
                      : r.prospect ? 'Créer la fiche et attribuer'
                      : "Attribuer l'offre"}
                  </button>
                  <button
                    className="dem-btn dem-btn-ghost"
                    onClick={() => marquerDemande(d.id, 'refusee')}
                    disabled={traitement === d.id}
                  >
                    Écarter
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bannière post-création : proposer la vente tout de suite */}
      {offreCreee && (
        <div className="izi-card offre-creee-banner animate-fade-in">
          <span className="offre-creee-txt">
            ✓ <strong>{offreCreee.nom}</strong> est prête. Tu veux la vendre à un·e élève ?
          </span>
          <div className="offre-creee-actions">
            <button
              className="vendre-btn"
              type="button"
              onClick={() => { setAssignModalOffre(offreCreee); setOffreCreee(null); }}
            >
              <UserPlus size={15} /> Vendre cette offre
            </button>
            <button className="offre-creee-later" type="button" onClick={() => setOffreCreee(null)}>
              Plus tard
            </button>
          </div>
        </div>
      )}

      <TarifsPortailHint profile={profile} offres={offres} />
      <DiagnosticOffres offres={offres} />
      <div className="page-header animate-fade-in">
        <div className="page-header-left">
          <h1>Tes offres</h1>
          <AideContextuelle ancre="offres" titre="Tuto : construis ton catalogue d'offres" />
          {offres.length > 0 && (
            <span className="count-badge">
              {offres.length}{limiteOffres != null ? `/${limiteOffres}` : ''}
            </span>
          )}
        </div>
        {limitReached ? (
          <button
            type="button"
            className="izi-btn izi-btn-primary header-cta-btn"
            onClick={() => setShowUpgradePrompt(true)}
          >
            <Plus size={16} /> Nouvelle offre
          </button>
        ) : (
          <Link href="/offres/nouveau" className="izi-btn izi-btn-primary header-cta-btn">
            <Plus size={16} /> Nouvelle offre
          </Link>
        )}
      </div>

      {offres.length === 0 ? (
        <EmptyState
          icon="🎫"
          title="Aucune offre créée"
          description="Crée tes carnets, abonnements ou cours à l'unité"
        >
          <Link href="/offres/nouveau" className="izi-btn izi-btn-primary">
            <Plus size={18} /> Créer une offre
          </Link>
        </EmptyState>
      ) : (
        <>
          {actives.length > 0 && (
            <div className="section animate-slide-up">
              <div className="section-title">Actives</div>
              <div className="offres-list">{actives.map(o => renderCard(o, true))}</div>
            </div>
          )}

          {inactives.length > 0 && (
            <div className="section animate-slide-up">
              <div className="section-title" style={{ color: 'var(--text-muted)' }}>Inactives</div>
              <div className="offres-list">{inactives.map(o => renderCard(o, false))}</div>
            </div>
          )}
        </>
      )}

      {limitReached ? (
        <button
          type="button"
          className="izi-fab"
          aria-label="Nouvelle offre"
          onClick={() => setShowUpgradePrompt(true)}
        >
          <Plus size={24} />
        </button>
      ) : (
        <Link href="/offres/nouveau" className="izi-fab" aria-label="Nouvelle offre">
          <Plus size={24} />
        </Link>
      )}

      {/* Modal upgrade plan */}
      {showUpgradePrompt && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowUpgradePrompt(false); }}>
          <div className="modal-sheet animate-slide-up" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div style={{ width: 36 }} />
              <span className="modal-title">Limite atteinte</span>
              <button className="modal-close" onClick={() => setShowUpgradePrompt(false)} type="button"><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ alignItems: 'center', textAlign: 'center', padding: '28px 24px' }}>
              <div className="upgrade-icon">
                <Crown size={28} />
              </div>
              <p className="upgrade-title">
                Tu as atteint la limite de {limiteOffres} offres sur le plan Essentiel
              </p>
              <p className="upgrade-desc">
                Passe en Complet pour cr{'é'}er des offres illimit{'é'}es et d{'é'}bloquer toutes les fonctionnalit{'é'}s avanc{'é'}es.
              </p>
              <Link
                href="/parametres?tab=abonnement"
                className="izi-btn izi-btn-primary upgrade-cta-btn"
                onClick={() => setShowUpgradePrompt(false)}
              >
                <Crown size={16} /> D{'é'}couvrir le plan Complet <ArrowRight size={16} />
              </Link>
              <button
                type="button"
                className="upgrade-dismiss"
                onClick={() => setShowUpgradePrompt(false)}
              >
                Plus tard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal tunnel de vente (partagé — components/paiements/VenteOffreModal) */}
      {assignModalOffre && (
        <VenteOffreModal
          offre={assignModalOffre}
          clientInitial={demandeEnCours?.client || null}
          onClose={() => { setAssignModalOffre(null); setDemandeEnCours(null); }}
          onSuccess={() => {
            // La vente est faite : la demande sort de la file. Si elle échoue,
            // la demande reste — on ne raye jamais une intention non honorée.
            if (demandeEnCours?.demande?.id) marquerDemande(demandeEnCours.demande.id, 'acceptee');
            setAssignModalOffre(null);
            setDemandeEnCours(null);
            router.refresh();
          }}
        />
      )}

      <style jsx global>{`
        .offres-page { display: flex; flex-direction: column; gap: 16px; padding-bottom: 80px; }
        .page-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .page-header-left { display: flex; align-items: center; gap: 10px; }
        .page-header h1 { font-size: 1.375rem; font-weight: 700; }
        .count-badge { background: var(--brand-light); color: var(--brand-700); padding: 2px 10px; border-radius: var(--radius-full); font-size: 0.8125rem; font-weight: 600; }
        .header-cta-btn { font-size: 0.8125rem; padding: 8px 14px; gap: 5px; }
        .section { display: flex; flex-direction: column; gap: 8px; }
        .section-title { font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); }
        .offres-list { display: flex; flex-direction: column; gap: 8px; }
        /* Bloc global (et non scopé) : il contient un <Link>, qu'une règle
           scopée ne hasherait jamais (piège §12). */
        .webhook-alerte {
          background: #fffbeb; border: 1px solid #fcd34d;
          border-radius: var(--radius-lg, 14px); padding: 14px 16px;
          display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
          margin-bottom: 14px;
        }
        .webhook-alerte-titre { font-size: 0.95rem; font-weight: 700; color: #78350f; }
        .webhook-alerte-txt {
          font-size: 0.8rem; line-height: 1.5; color: #78350f; margin: 0;
        }
        .webhook-alerte-txt strong { font-weight: 700; }
        .dem-bloc {
          background: var(--brand-light, #f7efe6); border: 1px solid var(--brand-200, #e8d3bd);
          border-radius: var(--radius-lg, 14px); padding: 14px 16px;
          display: flex; flex-direction: column; gap: 10px;
        }
        .dem-titre { font-size: 0.95rem; font-weight: 700; color: var(--brand-700, #8c5826); }
        .dem-sous { font-size: 0.78rem; color: var(--text-muted); margin: -6px 0 0; }
        .dem-ligne {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 12px; flex-wrap: wrap;
          background: var(--bg-card, #fff); border-radius: var(--radius-md, 10px); padding: 10px 12px;
        }
        .dem-info { min-width: 0; }
        .dem-nom { font-size: 0.9rem; font-weight: 700; color: var(--text-primary); }
        .dem-badge {
          margin-left: 8px; font-size: 0.68rem; font-weight: 600;
          background: var(--warning-light, #F5EBD2); color: #854d0e;
          border-radius: 999px; padding: 1px 8px;
        }
        .dem-offre { font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px; }
        .dem-contact { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 5px; }
        .dem-lien {
          font-size: 0.8rem; font-weight: 600; color: var(--brand-700, #8c5826);
          text-decoration: none; overflow-wrap: anywhere;
        }
        .dem-lien:hover { text-decoration: underline; }
        .dem-sans-contact { font-size: 0.78rem; color: var(--danger, #b3261e); }
        .dem-message { font-size: 0.78rem; color: var(--text-muted); margin-top: 4px; font-style: italic; }
        .dem-actions { display: flex; gap: 6px; align-items: center; }
        .dem-btn { font-size: 0.8rem; padding: 7px 12px; white-space: nowrap; }
        .dem-btn-ghost {
          background: none; border: 1px solid var(--border); border-radius: 999px;
          color: var(--text-secondary); cursor: pointer;
        }
        .offre-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-left: 6px solid transparent; flex-wrap: wrap; }
        .offre-card--rose     { background: var(--tone-rose-bg);     border-left-color: var(--tone-rose-accent); }
        .offre-card--sage     { background: var(--tone-sage-bg);     border-left-color: var(--tone-sage-accent); }
        .offre-card--sand     { background: var(--tone-sand-bg);     border-left-color: var(--tone-sand-accent); }
        .offre-card--lavender { background: var(--tone-lavender-bg); border-left-color: var(--tone-lavender-accent); }
        .offre-card--rose     .offre-icon { background: var(--tone-rose-bg);     color: var(--tone-rose-ink); }
        .offre-card--sage     .offre-icon { background: var(--tone-sage-bg);     color: var(--tone-sage-ink); }
        .offre-card--sand     .offre-icon { background: var(--tone-sand-bg);     color: var(--tone-sand-ink); }
        .offre-card--lavender .offre-icon { background: var(--tone-lavender-bg); color: var(--tone-lavender-ink); }
        .offre-inactive { opacity: 0.55; }
        .offre-icon { width: 40px; height: 40px; border-radius: var(--radius-sm); background: var(--brand-light); color: var(--brand-700); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .offre-info { flex: 1; min-width: 0; }
        .offre-nom { font-weight: 600; font-size: 0.9375rem; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow-wrap: anywhere; }
        .offre-details { display: flex; gap: 6px; align-items: center; margin-top: 4px; flex-wrap: wrap; }
        .offre-seances, .offre-duree { font-size: 0.75rem; color: var(--text-muted); }
        .offre-prix { font-weight: 700; font-size: 1rem; color: var(--brand-700); white-space: nowrap; }
        .offre-actions { display: flex; gap: 2px; flex-shrink: 0; }
        /* Mobile : les actions passent sur leur propre ligne pour libérer toute
           la largeur au nom + prix (évite le nom tronqué « Cours à l'... »).
           Row 1 = icône + nom/détails + prix ; row 2 = actions à droite. */
        @media (max-width: 560px) {
          .offre-actions { flex-basis: 100%; justify-content: flex-end; margin-top: 2px; }
        }
        .action-btn { width: 36px; height: 36px; border: none; background: none; border-radius: var(--radius-sm); cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-muted); transition: background var(--transition-fast); }
        .vendre-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 7px 13px; border-radius: var(--radius-full);
          border: none; background: var(--brand); color: white;
          font-size: 0.8125rem; font-weight: 700; font-family: inherit;
          cursor: pointer; transition: filter var(--transition-fast);
        }
        .vendre-btn:hover { filter: brightness(1.08); }
        .offre-creee-banner {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          flex-wrap: wrap; padding: 14px 16px; border-left: 4px solid var(--success, #059669);
        }
        .offre-creee-txt { font-size: 0.875rem; color: var(--text-secondary); }
        .offre-creee-txt strong { color: var(--text-primary); }
        .offre-creee-actions { display: flex; align-items: center; gap: 10px; }
        .offre-creee-later { background: none; border: none; color: var(--text-muted); font-size: 0.8125rem; cursor: pointer; text-decoration: underline; font-family: inherit; }
        .action-btn:active, .action-btn:hover { background: var(--cream-dark); }
        .assign-btn { color: var(--brand-700); }

        /* ── Modal partagé ── */
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 200; display: flex; align-items: flex-end; justify-content: center; }
        @media (min-width: 600px) { .modal-backdrop { align-items: center; } }
        .modal-sheet { background: var(--bg-card); border-radius: var(--radius-lg) var(--radius-lg) 0 0; width: 100%; max-width: 520px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; }
        @media (min-width: 600px) { .modal-sheet { border-radius: var(--radius-lg); } }

        .modal-header { display: flex; align-items: center; gap: 8px; padding: 16px 16px 12px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
        .modal-back { background: none; border: none; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); cursor: pointer; border-radius: var(--radius-sm); }
        .modal-back:hover { background: var(--cream-dark); }
        .modal-title { flex: 1; font-weight: 700; font-size: 1rem; text-align: center; }
        .modal-close { background: none; border: none; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); cursor: pointer; border-radius: var(--radius-sm); }
        .modal-close:hover { background: var(--cream-dark); }

        .modal-body { padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
        .modal-loading { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 32px; color: var(--text-muted); }
        .modal-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 32px 16px; color: var(--text-muted); text-align: center; }

        /* Récap offre pill */
        .offre-recap-pill { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: var(--brand-light); border-radius: var(--radius-full); color: var(--brand-700); font-weight: 600; font-size: 0.9rem; }
        .offre-recap-prix { margin-left: auto; font-weight: 700; }

        /* Search */
        .search-wrap { position: relative; }
        .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
        .search-input { padding-left: 36px !important; }

        /* Client list */
        .client-list { display: flex; flex-direction: column; gap: 4px; }
        .client-choice-btn { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--cream, #faf8f5); border: 1.5px solid var(--border); border-radius: var(--radius-md); cursor: pointer; text-align: left; width: 100%; transition: all var(--transition-fast); }
        .client-choice-btn:hover { border-color: var(--brand); background: var(--brand-light); }
        .client-choice-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--brand); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9375rem; flex-shrink: 0; }
        .client-choice-info { flex: 1; display: flex; flex-direction: column; gap: 1px; }
        .client-choice-nom { font-weight: 600; font-size: 0.9375rem; color: var(--text-primary); }
        .client-choice-tel { font-size: 0.75rem; color: var(--text-muted); }

        /* Paiement */
        .paiement-recap { padding: 12px 14px; background: var(--brand-light); border-radius: var(--radius-md); border: 1px solid var(--brand); display: flex; flex-direction: column; gap: 2px; }
        .paiement-recap-nom { font-weight: 700; font-size: 1rem; color: var(--brand-700); }
        .paiement-recap-client { font-size: 0.8125rem; color: var(--brand-700); opacity: 0.8; }
        .paiement-section-label { font-size: 0.8125rem; font-weight: 700; color: var(--text-secondary); }

        .mode-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .mode-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; padding: 12px 8px; border-radius: var(--radius-md); border: 1.5px solid var(--border); background: var(--bg-card); font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all var(--transition-fast); min-height: 64px; position: relative; }
        .mode-btn.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
        .mode-btn:not(.active):not(:disabled):hover { border-color: var(--brand); }
        .mode-btn-soon { opacity: 0.45; cursor: not-allowed; }
        .soon-badge { position: absolute; top: 4px; right: 4px; background: var(--text-muted); color: white; font-size: 0.625rem; font-weight: 700; padding: 1px 5px; border-radius: var(--radius-full); }

        .montant-row { display: flex; align-items: center; gap: 8px; }
        .montant-input { flex: 1; font-size: 1.25rem !important; font-weight: 700 !important; text-align: right; }
        .montant-currency { font-size: 1.25rem; font-weight: 700; color: var(--text-secondary); }
        .montant-hint { font-size: 0.75rem; color: var(--text-muted); text-align: right; margin-top: -8px; }

        .confirm-btn { width: 100%; margin-top: 4px; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .error-msg { color: var(--danger); font-size: 0.8125rem; text-align: center; }

        /* ── Upgrade prompt ── */
        .upgrade-icon { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, var(--brand-light), #fef3c7); color: var(--brand-700); display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }
        .upgrade-title { font-weight: 700; font-size: 1.0625rem; color: var(--text-primary); margin: 0; line-height: 1.35; }
        .upgrade-desc { font-size: 0.875rem; color: var(--text-secondary); margin: 0; line-height: 1.5; }
        .upgrade-cta-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 4px; }
        .upgrade-dismiss { background: none; border: none; cursor: pointer; padding: 8px; font-size: 0.8125rem; color: var(--text-muted); font-weight: 500; }
        .upgrade-dismiss:hover { color: var(--text-secondary); text-decoration: underline; }

        /* ── Multi-versement ── */
        .multi-toggle-row { display: flex; gap: 8px; }
        .multi-toggle-btn {
          flex: 1; padding: 8px 12px; border-radius: var(--radius-full);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .multi-toggle-btn.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
        .multi-zone { display: flex; flex-direction: column; gap: 12px; }
        .multi-nb-row { display: flex; flex-direction: column; gap: 6px; }
        .multi-nb-chips { display: flex; gap: 6px; }
        .multi-nb-chip {
          padding: 5px 12px; border-radius: var(--radius-full);
          border: 1.5px solid var(--border); background: var(--bg-card);
          font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary);
          cursor: pointer; transition: all var(--transition-fast);
        }
        .multi-nb-chip.active { border-color: var(--brand); background: var(--brand-light); color: var(--brand-700); }
        .multi-versements { display: flex; flex-direction: column; gap: 8px; }
        .multi-v-row {
          display: flex; flex-direction: column; gap: 4px;
          padding: 10px 12px; background: var(--cream, #faf8f5);
          border: 1px solid var(--border); border-radius: var(--radius-md);
        }
        .multi-v-label { font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); display: flex; align-items: center; gap: 6px; }
        .multi-v-badge { background: #ecfdf5; color: #065f46; padding: 1px 6px; border-radius: var(--radius-full); font-size: 0.625rem; font-weight: 700; }
        .multi-v-badge-pending { background: #fef3c7; color: #92400e; padding: 1px 6px; border-radius: var(--radius-full); font-size: 0.625rem; font-weight: 700; }
        .multi-v-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .multi-v-input { font-size: 0.875rem !important; }
        .multi-total-warn {
          font-size: 0.75rem; color: #dc2626; font-weight: 600; text-align: center;
          padding: 6px; background: #fef2f2; border-radius: var(--radius-md);
        }
        .multi-total-ok {
          font-size: 0.75rem; color: #065f46; font-weight: 600; text-align: center;
          padding: 6px; background: #ecfdf5; border-radius: var(--radius-md);
        }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
