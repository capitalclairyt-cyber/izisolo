'use client';

import { useState, useCallback } from 'react';
import { KeyRound, Copy, Check, Share2, Trash2, Loader2, MessageSquareQuote } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

/**
 * « Confier le pointage » (v100) — la prof fabrique un lien qui ouvre le
 * pointage de CETTE séance à quelqu'un qui n'a pas de compte : remplaçante,
 * collègue qui dépanne, prof occasionnelle d'une asso.
 *
 * Replié par défaut, et ne demande RIEN au serveur tant qu'on ne l'ouvre pas :
 * la fiche d'un cours se charge déjà assez.
 *
 * Le jeton n'est visible qu'UNE fois, à la création. Ensuite la base n'a que
 * son empreinte : si le lien est perdu, on en refait un. L'écran le dit
 * clairement plutôt que de laisser la prof chercher un bouton « revoir ».
 */

const DUREES = [
  { cle: 'fin_journee', label: 'Fin de journée' },
  { cle: 'j1',          label: 'Demain soir' },
  { cle: 'j7',          label: '7 jours' },
];

export default function ConfierPointage({ cours }) {
  const { toast } = useToast();
  const [ouvert, setOuvert] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [liens, setLiens] = useState([]);
  const [indisponible, setIndisponible] = useState(false);
  const [sansPlan, setSansPlan] = useState(false);
  const [nom, setNom] = useState('');
  const [duree, setDuree] = useState('fin_journee');
  const [creation, setCreation] = useState(false);
  const [urlFraiche, setUrlFraiche] = useState('');
  const [copie, setCopie] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await fetch(`/api/liens-pointage?coursId=${cours.id}`);
      const data = await res.json().catch(() => ({}));
      if (res.status === 403) { setSansPlan(true); return; }
      setIndisponible(!!data.indisponible);
      setLiens(data.liens || []);
    } catch {
      toast.error('Liens indisponibles pour le moment.');
    } finally {
      setChargement(false);
    }
  }, [cours.id, toast]);

  const basculer = () => {
    const suivant = !ouvert;
    setOuvert(suivant);
    if (suivant && liens.length === 0 && !sansPlan) charger();
  };

  const creer = async () => {
    setCreation(true);
    setUrlFraiche('');
    try {
      const res = await fetch('/api/liens-pointage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coursId: cours.id, nom: nom.trim() || undefined, duree }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403) setSansPlan(true);
        toast.error(data.error || "Le lien n'a pas pu être créé.");
        return;
      }
      setUrlFraiche(data.url);
      setLiens(prev => [data.lien, ...prev]);
      setNom('');
      setCopie(false);
    } catch {
      toast.error("Le lien n'a pas pu être créé, réessaie.");
    } finally {
      setCreation(false);
    }
  };

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(urlFraiche);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      toast.error('Copie impossible : sélectionne le lien à la main.');
    }
  };

  const partager = async () => {
    const texte = `Peux-tu pointer « ${cours.nom} » pour moi ? ${urlFraiche}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Pointage à confier', text: texte });
      else await copier();
    } catch { /* partage annulé par la personne : rien à dire */ }
  };

  const revoquer = async (lien) => {
    if (!confirm(`Désactiver ce lien ?\n\nLa personne ne pourra plus pointer cette séance. Ce qui a déjà été coché reste enregistré.`)) return;
    try {
      const res = await fetch(`/api/liens-pointage/${lien.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setLiens(prev => prev.map(l => (l.id === lien.id ? { ...l, etat: 'revoque', revoque_at: new Date().toISOString() } : l)));
      if (urlFraiche) setUrlFraiche('');
      toast.success('Lien désactivé.');
    } catch {
      toast.error("Le lien n'a pas pu être désactivé.");
    }
  };

  if (cours.est_annule) return null;

  const actifs = liens.filter(l => l.etat === 'actif');
  const notes = liens.filter(l => l.note_invitee);

  return (
    <div className="section cp-carte">
      <button type="button" className="cp-entete" onClick={basculer} aria-expanded={ouvert}>
        <span className="cp-titre"><KeyRound size={17} /> Confier le pointage</span>
        <span className="cp-etat">
          {actifs.length > 0 ? `${actifs.length} lien${actifs.length > 1 ? 's' : ''} actif${actifs.length > 1 ? 's' : ''}` : 'Aucun lien'}
          <span className={`cp-chevron ${ouvert ? 'ouvert' : ''}`}>›</span>
        </span>
      </button>

      {ouvert && (
        <div className="cp-corps">
          <p className="cp-intro">
            Tu te fais remplacer ? Envoie un lien qui ouvre le pointage de cette séance, et rien d&apos;autre.
            La personne n&apos;a pas besoin de compte, et ne voit que les prénoms et les noms :
            ni coordonnées, ni carnets, ni montants.
          </p>

          {sansPlan && (
            <p className="cp-alerte">
              Confier le pointage fait partie du plan Complet.{' '}
              <a href="/parametres?tab=abonnement">Voir les plans</a>
            </p>
          )}

          {indisponible && (
            <p className="cp-alerte">
              Les liens de pointage arrivent très bientôt : cette mise à jour n&apos;est pas encore appliquée sur ton studio.
            </p>
          )}

          {!sansPlan && !indisponible && (
            <>
              <div className="cp-form">
                <label className="cp-champ">
                  <span>Pour qui ? (facultatif)</span>
                  <input
                    type="text" value={nom} maxLength={60}
                    onChange={e => setNom(e.target.value)}
                    placeholder="Claire"
                  />
                </label>
                <label className="cp-champ">
                  <span>Valable jusqu&apos;à</span>
                  <select value={duree} onChange={e => setDuree(e.target.value)}>
                    {DUREES.map(d => <option key={d.cle} value={d.cle}>{d.label}</option>)}
                  </select>
                </label>
                <button type="button" className="izi-btn btn-sm izi-btn-primary cp-creer"
                        onClick={creer} disabled={creation}>
                  {creation ? <Loader2 size={15} className="cp-spin" /> : <KeyRound size={15} />}
                  Créer le lien
                </button>
              </div>

              {urlFraiche && (
                <div className="cp-fraiche">
                  <p className="cp-fraiche-titre">Voilà le lien. Copie-le maintenant : il ne sera plus affiché.</p>
                  <code className="cp-url">{urlFraiche}</code>
                  <div className="cp-actions">
                    <button type="button" className="izi-btn btn-sm izi-btn-secondary" onClick={copier}>
                      {copie ? <Check size={15} /> : <Copy size={15} />} {copie ? 'Copié' : 'Copier'}
                    </button>
                    <button type="button" className="izi-btn btn-sm izi-btn-secondary" onClick={partager}>
                      <Share2 size={15} /> Envoyer
                    </button>
                  </div>
                </div>
              )}

              {chargement && <p className="cp-vide"><Loader2 size={14} className="cp-spin" /> Chargement…</p>}

              {!chargement && liens.length > 0 && (
                <ul className="cp-liste">
                  {liens.map(l => (
                    <li key={l.id} className={`cp-ligne ${l.etat}`}>
                      <div>
                        <strong>{l.nom_invitee || 'Sans nom'}</strong>
                        <span className={`cp-badge ${l.etat}`}>
                          {l.etat === 'actif' ? 'Actif' : l.etat === 'revoque' ? 'Désactivé' : 'Expiré'}
                        </span>
                        <span className="cp-detail">
                          {l.nb_pointages > 0
                            ? `${l.nb_pointages} pointage${l.nb_pointages > 1 ? 's' : ''}`
                            : 'jamais utilisé'}
                          {l.etat === 'actif' && l.expire_at
                            ? ` · expire le ${new Date(l.expire_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
                            : ''}
                        </span>
                      </div>
                      {l.etat === 'actif' && (
                        <button type="button" className="cp-revoquer" onClick={() => revoquer(l)}
                                aria-label="Désactiver ce lien">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {notes.length > 0 && (
                <div className="cp-notes">
                  {notes.map(l => (
                    <p key={l.id} className="cp-note">
                      <MessageSquareQuote size={14} />
                      <span><strong>{l.nom_invitee || 'La personne invitée'}</strong> : {l.note_invitee}</span>
                    </p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Global : plusieurs de ces classes habillent des éléments rendus dans
          des branches conditionnelles, et une règle scopée ne s'applique qu'à
          la branche rendue (§12). */}
      <style jsx global>{`
        .cp-carte { padding: 0 !important; overflow: hidden; }
        .cp-entete { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px;
          padding: 14px 16px; background: none; border: none; cursor: pointer; font-family: inherit;
          color: inherit; text-align: left; }
        .cp-titre { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; font-size: 1rem; }
        .cp-etat { display: inline-flex; align-items: center; gap: 8px; font-size: .82rem; color: var(--text-soft, #7a6f6a); }
        .cp-chevron { display: inline-block; transition: transform .2s ease; font-size: 1.1rem; }
        .cp-chevron.ouvert { transform: rotate(90deg); }
        .cp-corps { padding: 0 16px 16px; }
        .cp-intro { margin: 0 0 12px; font-size: .86rem; line-height: 1.55; color: var(--text-soft, #7a6f6a); }
        .cp-alerte { margin: 0 0 12px; padding: 10px 12px; border-radius: 10px; font-size: .85rem;
          background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
        .cp-alerte a { color: inherit; font-weight: 600; }

        .cp-form { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; margin-bottom: 12px; }
        .cp-champ { display: flex; flex-direction: column; gap: 4px; flex: 1 1 150px; }
        .cp-champ span { font-size: .78rem; color: var(--text-soft, #7a6f6a); }
        .cp-champ input, .cp-champ select { padding: 8px 10px; border-radius: 9px; font: inherit; font-size: .88rem;
          border: 1px solid rgba(0,0,0,.13); background: #fff; color: inherit; }
        .cp-creer { flex: 0 0 auto; }
        .cp-spin { animation: cp-rot 1s linear infinite; }
        @keyframes cp-rot { to { transform: rotate(360deg); } }

        .cp-fraiche { padding: 12px; border-radius: 12px; margin-bottom: 14px;
          background: #f0fdf4; border: 1px solid #bbf7d0; }
        .cp-fraiche-titre { margin: 0 0 8px; font-size: .84rem; font-weight: 600; color: #166534; }
        .cp-url { display: block; padding: 9px 10px; border-radius: 8px; background: #fff; border: 1px solid #bbf7d0;
          font-size: .76rem; word-break: break-all; color: #14532d; margin-bottom: 9px; }
        .cp-actions { display: flex; gap: 8px; flex-wrap: wrap; }

        .cp-liste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
        .cp-ligne { display: flex; align-items: center; justify-content: space-between; gap: 10px;
          padding: 9px 11px; border-radius: 10px; background: #fafaf9; border: 1px solid rgba(0,0,0,.06); }
        .cp-ligne.revoque, .cp-ligne.expire { opacity: .6; }
        .cp-ligne strong { font-size: .88rem; margin-right: 7px; }
        .cp-badge { font-size: .68rem; padding: 2px 7px; border-radius: 999px; margin-right: 7px;
          background: #f5f5f4; border: 1px solid rgba(0,0,0,.08); color: #57534e; }
        .cp-badge.actif { background: #ecfdf5; border-color: #a7f3d0; color: #047857; }
        .cp-detail { font-size: .76rem; color: var(--text-soft, #7a6f6a); }
        .cp-revoquer { background: none; border: none; cursor: pointer; color: #b91c1c; padding: 5px; border-radius: 7px; }
        .cp-vide { font-size: .84rem; color: var(--text-soft, #7a6f6a); display: flex; align-items: center; gap: 6px; }

        .cp-notes { margin-top: 12px; display: flex; flex-direction: column; gap: 7px; }
        .cp-note { display: flex; gap: 7px; align-items: flex-start; margin: 0; padding: 10px 12px; border-radius: 10px;
          background: #f0f9ff; border: 1px solid #bae6fd; font-size: .84rem; line-height: 1.5; color: #075985; }
      `}</style>
    </div>
  );
}
