'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Check, X, HeartHandshake, Clock, MapPin, Monitor, Send, Loader2 } from 'lucide-react';

/**
 * L'écran de la personne invitée (v100). Volontairement pauvre : une liste de
 * noms et trois boutons. Pas de menu, pas d'argent, pas de coordonnées, pas
 * d'ajout d'élève. Ce qui manque ici est ce qu'on a refusé d'exposer, pas ce
 * qu'on a oublié de faire — et l'écran le DIT, pour que personne ne cherche.
 */

const STATUTS = [
  { cle: 'present', label: 'Présent·e', Icone: Check, couleur: '#059669', fond: '#ecfdf5', bord: '#a7f3d0' },
  { cle: 'absent',  label: 'Absent·e',  Icone: X,     couleur: '#dc2626', fond: '#fef2f2', bord: '#fecaca' },
  { cle: 'excuse',  label: 'Excusé·e',  Icone: Clock, couleur: '#d97706', fond: '#fffbeb', bord: '#fde68a' },
];

function dateLisible(iso, heure) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const jour = new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  return heure ? `${jour} à ${heure}` : jour;
}

export default function InvitePointageClient({ token }) {
  const [etat, setEtat] = useState('chargement'); // chargement | pret | refuse
  const [refus, setRefus] = useState('');
  const [cours, setCours] = useState(null);
  const [presences, setPresences] = useState([]);
  const [invitee, setInvitee] = useState(null);
  const [expireAt, setExpireAt] = useState(null);
  const [enCours, setEnCours] = useState(null);
  const [erreurLigne, setErreurLigne] = useState('');
  const [note, setNote] = useState('');
  const [noteEtat, setNoteEtat] = useState('vierge'); // vierge | envoi | envoye

  const api = `/api/pointage-invite/${encodeURIComponent(token)}`;

  useEffect(() => {
    let vivant = true;
    (async () => {
      try {
        const res = await fetch(api);
        const data = await res.json().catch(() => ({}));
        if (!vivant) return;
        if (!res.ok) {
          setRefus(data.error || "Ce lien n'est plus valable.");
          setEtat('refuse');
          return;
        }
        setCours(data.cours);
        setPresences(data.presences || []);
        setInvitee(data.invitee || null);
        setExpireAt(data.expire_at || null);
        setNote(data.note || '');
        setEtat('pret');
      } catch {
        if (!vivant) return;
        setRefus('Connexion impossible. Vérifie ton réseau et recharge la page.');
        setEtat('refuse');
      }
    })();
    return () => { vivant = false; };
  }, [api]);

  const marquer = useCallback(async (presence, statut) => {
    if (enCours) return;
    setErreurLigne('');
    setEnCours(presence.id);
    // Optimiste : le tap doit répondre tout de suite, même en 4G de salle.
    const avant = presence.statut;
    setPresences(prev => prev.map(p => (p.id === presence.id ? { ...p, statut } : p)));
    try {
      const res = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pointer', presenceId: presence.id, statut }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPresences(prev => prev.map(p => (p.id === presence.id ? { ...p, statut: avant } : p)));
        setErreurLigne(data.error || "Ce pointage n'a pas été enregistré, réessaie.");
      } else if (Array.isArray(data.presences)) {
        setPresences(data.presences); // la base fait foi
      }
    } catch {
      setPresences(prev => prev.map(p => (p.id === presence.id ? { ...p, statut: avant } : p)));
      setErreurLigne("Réseau trop lent : ce pointage n'a pas été enregistré, réessaie.");
    } finally {
      setEnCours(null);
    }
  }, [api, enCours]);

  const envoyerNote = useCallback(async () => {
    setNoteEtat('envoi');
    try {
      await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'note', texte: note }),
      });
      setNoteEtat('envoye');
    } catch {
      setNoteEtat('vierge');
    }
  }, [api, note]);

  const pointables = useMemo(() => presences.filter(p => !p.info), [presences]);
  const faits = pointables.filter(p => p.statut !== 'inscrit').length;
  const total = pointables.length;
  const termine = total > 0 && faits === total;

  // La séance n'a pas commencé : on prévient, on ne bloque pas. La personne
  // est devant le groupe, elle sait mieux que nous ; et sans compte, elle n'a
  // aucun recours si l'écran refuse.
  const pasCommence = useMemo(() => {
    if (!cours?.date) return false;
    const maintenant = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Paris' });
    return cours.heure
      ? `${cours.date} ${cours.heure}` > maintenant.slice(0, 16)
      : cours.date > maintenant.slice(0, 10);
  }, [cours]);

  if (etat === 'chargement') {
    return (
      <main className="inv-wrap">
        <div className="inv-centre"><Loader2 className="inv-spin" size={28} /><p>Chargement de la séance…</p></div>
        <Styles />
      </main>
    );
  }

  if (etat === 'refuse') {
    return (
      <main className="inv-wrap">
        <div className="inv-centre">
          <div className="inv-emoji">🔒</div>
          <h1 className="inv-refus-titre">Lien indisponible</h1>
          <p className="inv-refus-texte">{refus}</p>
          <p className="inv-refus-aide">Le studio peut t&apos;en envoyer un nouveau en quelques secondes.</p>
        </div>
        <Styles />
      </main>
    );
  }

  return (
    <main className="inv-wrap">
      <header className="inv-entete">
        <div className="inv-eyebrow"><HeartHandshake size={14} /> Pointage confié</div>
        <h1 className="inv-titre">{cours.nom}</h1>
        <p className="inv-meta">{dateLisible(cours.date, cours.heure)}</p>
        <div className="inv-tags">
          {cours.studio_nom && <span className="inv-tag">{cours.studio_nom}</span>}
          {cours.en_ligne
            ? <span className="inv-tag"><Monitor size={12} /> En ligne</span>
            : cours.lieu && <span className="inv-tag"><MapPin size={12} /> {cours.lieu}</span>}
          {cours.type_cours && <span className="inv-tag">{cours.type_cours}</span>}
        </div>
      </header>

      {invitee && <p className="inv-bonjour">Bonjour {invitee} 👋</p>}

      <p className="inv-cadre">
        Tu pointes cette séance pour {cours.studio_nom || 'le studio'}. Tu vois les prénoms et les noms,
        et rien d&apos;autre : ni coordonnées, ni carnets, ni paiements.
      </p>

      {pasCommence && (
        <p className="inv-avertissement">
          Cette séance n&apos;a pas encore commencé. Ce que tu coches maintenant compte tout de suite,
          comme si elle avait eu lieu.
        </p>
      )}

      <div className="inv-progression">
        <div className="inv-jauge"><span style={{ width: total ? `${(faits / total) * 100}%` : '0%' }} /></div>
        <span className="inv-compteur">{faits} / {total} {termine ? '🎉' : ''}</span>
      </div>

      {erreurLigne && <p className="inv-erreur">{erreurLigne}</p>}

      <ul className="inv-liste">
        {presences.length === 0 && (
          <li className="inv-vide">Personne n&apos;est inscrit·e sur cette séance pour l&apos;instant.</li>
        )}
        {presences.map(p => (
          <li key={p.id} className={`inv-ligne ${p.info ? 'info' : ''}`}>
            <div className="inv-nom">
              <span className="inv-prenom">{p.prenom} {p.nom}</span>
              {p.essai && <span className="inv-badge-essai">Cours d&apos;essai</span>}
              {p.info && <span className="inv-badge-info">A annulé — rien à cocher</span>}
            </div>
            {!p.info && (
              <div className="inv-boutons">
                {STATUTS.map(({ cle, label, Icone, couleur, fond, bord }) => (
                  <button
                    key={cle}
                    type="button"
                    className={`inv-btn ${p.statut === cle ? 'actif' : ''}`}
                    style={p.statut === cle ? { '--c': couleur, '--f': fond, '--b': bord } : undefined}
                    disabled={enCours === p.id}
                    onClick={() => marquer(p, cle)}
                    aria-label={`${label} — ${p.prenom} ${p.nom}`}
                    aria-pressed={p.statut === cle}
                  >
                    <Icone size={15} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      <section className="inv-note">
        <label htmlFor="inv-note-champ">Un mot pour {cours.studio_nom || 'le studio'} ?</label>
        <p className="inv-note-aide">
          Tu ne peux ni ajouter ni retirer quelqu&apos;un de la liste : ces gestes touchent aux carnets
          et aux places. Écris-le ici, {cours.studio_nom || 'le studio'} le verra.
        </p>
        <textarea
          id="inv-note-champ"
          rows={3}
          value={note}
          onChange={e => { setNote(e.target.value); setNoteEtat('vierge'); }}
          placeholder="Ex : Léa est venue mais n'était pas sur la liste."
          maxLength={500}
        />
        <button type="button" className="inv-note-btn" onClick={envoyerNote} disabled={noteEtat === 'envoi'}>
          {noteEtat === 'envoi' ? <Loader2 className="inv-spin" size={14} /> : <Send size={14} />}
          {noteEtat === 'envoye' ? 'Message transmis ✓' : 'Transmettre'}
        </button>
      </section>

      <footer className="inv-pied">
        {expireAt && (
          <p>Ce lien expire le {new Date(expireAt).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
          })}.</p>
        )}
        <p className="inv-signature">propulsé par IziSolo</p>
      </footer>

      <Styles />
    </main>
  );
}

/* Styles GLOBAUX et non scopés : plusieurs classes sont posées sur des
   éléments rendus dans des branches différentes, et le scopé styled-jsx ne
   s'applique qu'aux éléments natifs de la branche RENDUE (§12, le piège qui a
   mordu 6 fois). Ici tout est natif, mais les trois branches de retour
   (chargement / refus / écran) doivent toutes être habillées. */
function Styles() {
  return (
    <style jsx global>{`
      .inv-wrap {
        max-width: 620px; margin: 0 auto; padding: 24px 18px 48px;
        font-family: var(--font-geist, system-ui, sans-serif);
        color: var(--c-ink, #2b2321);
        background: var(--c-bg, #fdfbf8);
        min-height: 100vh;
      }
      .inv-centre { display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 12px; min-height: 70vh; text-align: center; color: var(--c-ink-soft, #6b5f5a); }
      .inv-emoji { font-size: 40px; }
      .inv-refus-titre { font-family: var(--font-fraunces, Georgia, serif); font-size: 1.6rem; margin: 0; }
      .inv-refus-texte { margin: 0; font-size: 1rem; max-width: 34ch; }
      .inv-refus-aide { margin: 0; font-size: .85rem; opacity: .7; }
      .inv-spin { animation: inv-rot 1s linear infinite; }
      @keyframes inv-rot { to { transform: rotate(360deg); } }

      .inv-entete { margin-bottom: 18px; }
      .inv-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-geist-mono, monospace);
        font-size: .7rem; letter-spacing: .08em; text-transform: uppercase;
        color: var(--c-accent-deep, #8a5a2b); margin-bottom: 8px; }
      .inv-titre { font-family: var(--font-fraunces, Georgia, serif); font-size: 1.9rem; line-height: 1.15; margin: 0 0 4px; }
      .inv-meta { margin: 0 0 10px; color: var(--c-ink-soft, #6b5f5a); font-size: .95rem; }
      .inv-tags { display: flex; flex-wrap: wrap; gap: 6px; }
      .inv-tag { display: inline-flex; align-items: center; gap: 4px; font-size: .75rem;
        padding: 3px 9px; border-radius: 999px; background: #fff; border: 1px solid rgba(0,0,0,.08);
        color: var(--c-ink-soft, #6b5f5a); }

      .inv-bonjour { margin: 0 0 10px; font-size: 1rem; }
      .inv-cadre { margin: 0 0 14px; padding: 11px 13px; border-radius: 12px; font-size: .85rem; line-height: 1.5;
        background: #fff; border: 1px solid rgba(0,0,0,.07); color: var(--c-ink-soft, #6b5f5a); }
      .inv-avertissement { margin: 0 0 14px; padding: 11px 13px; border-radius: 12px; font-size: .85rem; line-height: 1.5;
        background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
      .inv-erreur { margin: 0 0 12px; padding: 10px 13px; border-radius: 12px; font-size: .85rem;
        background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }

      .inv-progression { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
      .inv-jauge { flex: 1; height: 6px; border-radius: 999px; background: rgba(0,0,0,.07); overflow: hidden; }
      .inv-jauge span { display: block; height: 100%; background: var(--c-accent, #b07a44); transition: width .25s ease; }
      .inv-compteur { font-family: var(--font-geist-mono, monospace); font-size: .8rem; color: var(--c-ink-soft, #6b5f5a); }

      .inv-liste { list-style: none; margin: 0 0 26px; padding: 0; display: flex; flex-direction: column; gap: 8px; }
      .inv-vide { padding: 20px; text-align: center; color: var(--c-ink-soft, #6b5f5a); font-size: .9rem; }
      .inv-ligne { background: #fff; border: 1px solid rgba(0,0,0,.07); border-radius: 14px; padding: 12px 13px; }
      .inv-ligne.info { opacity: .62; }
      .inv-nom { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 9px; }
      .inv-prenom { font-weight: 600; font-size: 1rem; }
      .inv-badge-essai { font-size: .68rem; padding: 2px 7px; border-radius: 999px;
        background: #fff7ed; border: 1px solid #fed7aa; color: #c2410c; }
      .inv-badge-info { font-size: .68rem; padding: 2px 7px; border-radius: 999px;
        background: #f5f5f4; border: 1px solid rgba(0,0,0,.08); color: #57534e; }

      .inv-boutons { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
      .inv-btn { display: inline-flex; align-items: center; justify-content: center; gap: 5px;
        padding: 10px 6px; border-radius: 10px; font-size: .82rem; font-weight: 500; cursor: pointer;
        background: #fafaf9; border: 1px solid rgba(0,0,0,.09); color: var(--c-ink-soft, #6b5f5a);
        font-family: inherit; transition: background .15s ease, border-color .15s ease; }
      .inv-btn:disabled { opacity: .5; cursor: wait; }
      .inv-btn.actif { background: var(--f); border-color: var(--b); color: var(--c); font-weight: 600; }
      @media (max-width: 380px) { .inv-btn span { display: none; } }

      .inv-note { background: #fff; border: 1px solid rgba(0,0,0,.07); border-radius: 14px; padding: 14px; }
      .inv-note label { display: block; font-weight: 600; font-size: .95rem; margin-bottom: 4px; }
      .inv-note-aide { margin: 0 0 10px; font-size: .8rem; line-height: 1.5; color: var(--c-ink-soft, #6b5f5a); }
      .inv-note textarea { width: 100%; box-sizing: border-box; padding: 10px; border-radius: 10px; resize: vertical;
        border: 1px solid rgba(0,0,0,.12); font: inherit; font-size: .9rem; background: #fdfcfb; color: inherit; }
      .inv-note-btn { margin-top: 9px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
        padding: 9px 15px; border-radius: 10px; font-family: inherit; font-size: .85rem; font-weight: 500;
        background: var(--c-accent, #b07a44); border: none; color: #fff; }
      .inv-note-btn:disabled { opacity: .6; cursor: wait; }

      .inv-pied { margin-top: 22px; text-align: center; font-size: .75rem; color: var(--c-ink-soft, #6b5f5a); }
      .inv-pied p { margin: 2px 0; }
      .inv-signature { opacity: .6; }
    `}</style>
  );
}
