'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Calendar, MapPin, Monitor, ArrowLeft, Check, X, Clock, Users, Sparkles } from 'lucide-react';

/**
 * L'écran d'une intervenante sans compte (v111).
 *
 * Deux vues : sa liste de séances (les siennes, puis celles que personne n'a
 * prises), et une séance ouverte (la liste d'appel, présent / absent /
 * excusé). Le tap répond tout de suite (optimiste) et la base fait foi.
 * Comme en v100 : prénoms et noms, rien d'autre.
 */

const STATUTS = [
  { cle: 'present', label: 'Présent·e', Icone: Check, couleur: '#1f6b3a', fond: '#e7f3ea', bord: '#9dd1ab' },
  { cle: 'absent', label: 'Absent·e', Icone: X, couleur: '#b42318', fond: '#fdecea', bord: '#f2a29a' },
  { cle: 'excuse', label: 'Excusé·e', Icone: Clock, couleur: '#8a5a44', fond: '#fdf3e2', bord: '#e9c79a' },
];

function labelMoisCourt(mois) {
  const [a, m] = String(mois).split('-');
  return new Date(Number(a), Number(m) - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function dateLisible(iso, heure) {
  if (!iso) return '';
  const d = new Date(`${iso}T${heure || '12:00'}:00`);
  const s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return heure ? `${s} · ${heure}` : s;
}

export default function IntervenanteClient({ token }) {
  const [etat, setEtat] = useState('chargement'); // chargement | pret | refuse
  const [refus, setRefus] = useState('');
  const [moi, setMoi] = useState(null);
  const [miennes, setMiennes] = useState([]);
  const [orphelines, setOrphelines] = useState([]);
  const [sansIntervenantes, setSansIntervenantes] = useState(false);
  const [expireAt, setExpireAt] = useState(null);
  const [ouverte, setOuverte] = useState(null); // { cours, presences }
  const [chargeSeance, setChargeSeance] = useState(false);
  const [enCours, setEnCours] = useState(null);
  const [erreurLigne, setErreurLigne] = useState('');

  const api = `/api/intervenante/${encodeURIComponent(token)}`;

  useEffect(() => {
    let vivant = true;
    (async () => {
      try {
        const res = await fetch(api);
        const data = await res.json().catch(() => ({}));
        if (!vivant) return;
        if (!res.ok) { setRefus(data.error || "Ce lien n'est plus valable."); setEtat('refuse'); return; }
        setMoi(data.moi);
        setMiennes(data.miennes || []);
        setOrphelines(data.orphelines || []);
        setSansIntervenantes(!!data.sans_intervenantes);
        setExpireAt(data.expire_at || null);
        setEtat('pret');
      } catch {
        if (!vivant) return;
        setRefus('Connexion impossible. Vérifie ton réseau et recharge la page.');
        setEtat('refuse');
      }
    })();
    return () => { vivant = false; };
  }, [api]);

  const ouvrir = useCallback(async (seance) => {
    setChargeSeance(true);
    setErreurLigne('');
    try {
      const res = await fetch(`${api}/seances/${seance.id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErreurLigne(data.error || "Cette séance n'a pas pu être ouverte."); return; }
      setOuverte({ cours: data.cours, presences: data.presences || [] });
    } catch {
      setErreurLigne("Cette séance n'a pas pu être ouverte, réessaie.");
    } finally {
      setChargeSeance(false);
    }
  }, [api]);

  const marquer = useCallback(async (presence, statut) => {
    if (enCours || !ouverte) return;
    setErreurLigne('');
    setEnCours(presence.id);
    const avant = presence.statut;
    setOuverte(o => ({ ...o, presences: o.presences.map(p => (p.id === presence.id ? { ...p, statut } : p)) }));
    try {
      const res = await fetch(`${api}/seances/${ouverte.cours.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pointer', presenceId: presence.id, statut }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setOuverte(o => ({ ...o, presences: o.presences.map(p => (p.id === presence.id ? { ...p, statut: avant } : p)) }));
        setErreurLigne(data.error || "Ce pointage n'a pas été enregistré, réessaie.");
      } else if (Array.isArray(data.presences)) {
        setOuverte(o => ({ ...o, presences: data.presences })); // la base fait foi
      }
    } catch {
      setOuverte(o => ({ ...o, presences: o.presences.map(p => (p.id === presence.id ? { ...p, statut: avant } : p)) }));
      setErreurLigne("Réseau trop lent : ce pointage n'a pas été enregistré, réessaie.");
    } finally {
      setEnCours(null);
    }
  }, [api, enCours, ouverte]);

  const pointables = useMemo(() => (ouverte?.presences || []).filter(p => !p.info), [ouverte]);
  // Les trois derniers mois (le courant compris), pour le relevé (v112).
  const moisReleve = useMemo(() => {
    const out = [];
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
    for (let i = 0; i < 3; i++) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`); }
    return out;
  }, []);
  const faits = pointables.filter(p => p.statut !== 'inscrit').length;

  if (etat === 'chargement') {
    return (
      <main className="itv-wrap"><div className="itv-centre"><Loader2 className="itv-spin" size={28} /><p>Chargement de tes séances…</p></div><Styles /></main>
    );
  }
  if (etat === 'refuse') {
    return (
      <main className="itv-wrap">
        <div className="itv-centre">
          <div className="itv-emoji">🔒</div>
          <h1 className="itv-refus-titre">Lien indisponible</h1>
          <p className="itv-refus-texte">{refus}</p>
          <p className="itv-refus-aide">Le studio peut t&apos;en envoyer un nouveau en quelques secondes.</p>
        </div>
        <Styles />
      </main>
    );
  }

  // ── Une séance ouverte : la liste d'appel ──────────────────────────────
  if (ouverte) {
    const c = ouverte.cours;
    return (
      <main className="itv-wrap" data-testid="intervenante-seance">
        <button type="button" className="itv-retour" onClick={() => setOuverte(null)}><ArrowLeft size={15} /> Mes séances</button>
        <header className="itv-entete">
          <h1 className="itv-titre">{c.nom}</h1>
          <p className="itv-meta">{dateLisible(c.date, c.heure)}</p>
          <div className="itv-tags">
            {c.studio_nom && <span className="itv-tag">{c.studio_nom}</span>}
            {c.en_ligne ? <span className="itv-tag"><Monitor size={12} /> En ligne</span> : c.lieu && <span className="itv-tag"><MapPin size={12} /> {c.lieu}</span>}
            {c.type_cours && <span className="itv-tag">{c.type_cours}</span>}
          </div>
        </header>
        <div className="itv-progression">
          <div className="itv-jauge"><span style={{ width: pointables.length ? `${(faits / pointables.length) * 100}%` : '0%' }} /></div>
          <span className="itv-compteur">{faits} / {pointables.length}</span>
        </div>
        {erreurLigne && <p className="itv-erreur">{erreurLigne}</p>}
        <ul className="itv-liste">
          {ouverte.presences.length === 0 && <li className="itv-vide">Personne n&apos;est inscrit·e sur cette séance pour l&apos;instant.</li>}
          {ouverte.presences.map(p => (
            <li key={p.id} className={`itv-ligne ${p.info ? 'info' : ''}`}>
              <div className="itv-nom">
                <span className="itv-prenom">{p.prenom} {p.nom}</span>
                {p.essai && <span className="itv-badge">Cours d&apos;essai</span>}
                {p.info && <span className="itv-badge">A annulé, rien à cocher</span>}
              </div>
              {!p.info && (
                <div className="itv-boutons">
                  {STATUTS.map(({ cle, label, Icone, couleur, fond, bord }) => (
                    <button key={cle} type="button" className={`itv-btn ${p.statut === cle ? 'actif' : ''}`}
                            style={p.statut === cle ? { '--c': couleur, '--f': fond, '--b': bord } : undefined}
                            disabled={enCours === p.id} onClick={() => marquer(p, cle)}
                            aria-label={`${label} : ${p.prenom} ${p.nom}`} aria-pressed={p.statut === cle}>
                      <Icone size={15} /><span>{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
        <p className="itv-cadre">Tu vois les prénoms et les noms, et rien d&apos;autre : ni coordonnées, ni carnets, ni paiements. Pour ajouter ou retirer quelqu&apos;un, écris à {c.studio_nom || 'la structure'}.</p>
        <Styles />
      </main>
    );
  }

  // ── La liste des séances ───────────────────────────────────────────────
  const Seance = ({ s }) => (
    <li className={`itv-seance ${s.mienne ? 'mienne' : ''}`}>
      <button type="button" className="itv-seance-btn" onClick={() => ouvrir(s)} disabled={chargeSeance} data-testid="intervenante-ouvrir">
        <span className="itv-seance-date"><Calendar size={13} /> {dateLisible(s.date, s.heure)}</span>
        <span className="itv-seance-nom">{s.nom}</span>
        <span className="itv-seance-meta">
          {s.en_ligne ? <><Monitor size={12} /> En ligne</> : s.lieu && <><MapPin size={12} /> {s.lieu}</>}
          {s.nb_inscrites != null && <span><Users size={12} /> {s.nb_inscrites}</span>}
        </span>
      </button>
    </li>
  );

  return (
    <main className="itv-wrap" data-testid="intervenante-liste">
      <header className="itv-entete">
        <div className="itv-eyebrow"><Sparkles size={14} /> {moi?.studio_nom || 'Ta structure'}</div>
        <h1 className="itv-titre">{moi?.prenom ? `Bonjour ${moi.prenom} 👋` : 'Tes séances'}</h1>
        <p className="itv-meta">Tes séances des prochaines semaines, et leur pointage. Ce lien est à toi : ne le partage pas.</p>
      </header>
      {erreurLigne && <p className="itv-erreur">{erreurLigne}</p>}

      <section>
        <h2 className="itv-h2">Mes séances</h2>
        {miennes.length === 0 ? (
          <p className="itv-vide">{sansIntervenantes
            ? "Le studio n'a pas encore désigné qui donne quoi : toutes ses séances sont ci-dessous."
            : "Aucune séance ne t'est attribuée pour l'instant. Celles que personne n'a prises sont ci-dessous."}</p>
        ) : <ul className="itv-seances">{miennes.map(s => <Seance key={s.id} s={s} />)}</ul>}
      </section>

      {orphelines.length > 0 && (
        <section>
          <h2 className="itv-h2">Sans intervenante désignée</h2>
          <p className="itv-vide">Tu peux les pointer aussi, si c&apos;est toi qui les donnes.</p>
          <ul className="itv-seances">{orphelines.map(s => <Seance key={s.id} s={s} />)}</ul>
        </section>
      )}

      <section className="itv-releve" data-testid="intervenante-releve">
        <h2 className="itv-h2">Mon relevé de séances</h2>
        <p className="itv-vide">Le détail de tes séances données, présentes et montant convenu, mois par mois. Le PDF s&apos;ouvre dans un nouvel onglet.</p>
        <div className="itv-releve-mois">
          {moisReleve.map(m => (
            <a key={m} href={`${api}/releve?mois=${m}&format=pdf`} target="_blank" rel="noreferrer" className="itv-releve-lien">{labelMoisCourt(m)}</a>
          ))}
        </div>
      </section>

      {!moi?.a_un_compte && (
        <section className="itv-compte">
          <strong>Tu donnes aussi des cours à ton compte ?</strong>
          <p>Ton propre IziSolo est gratuit, pour toujours : tes élèves, ton agenda, tes encaissements, et cette structure à côté, avec la même adresse{moi?.email ? ` (${moi.email})` : ''}.</p>
          <a href={`/register?structure=solo${moi?.email ? `&email=${encodeURIComponent(moi.email)}` : ''}`} className="itv-compte-btn">Ouvrir mon IziSolo gratuit</a>
        </section>
      )}

      <footer className="itv-pied">
        {expireAt && <p>Ce lien vaut jusqu&apos;au {new Date(expireAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>}
        <p className="itv-signature">propulsé par IziSolo</p>
      </footer>
      <Styles />
    </main>
  );
}

/* Styles GLOBAUX (§12) : trois branches de retour, toutes habillées. */
function Styles() {
  return (
    <style jsx global>{`
      .itv-wrap { max-width: 560px; margin: 0 auto; padding: 20px 16px 48px; font-family: var(--font-geist, system-ui, sans-serif); color: var(--c-ink, #2b2321); }
      .itv-centre { text-align: center; padding: 60px 12px; color: #6b5f5a; }
      .itv-spin { animation: itv-rot 1s linear infinite; }
      @keyframes itv-rot { to { transform: rotate(360deg); } }
      .itv-emoji { font-size: 40px; }
      .itv-refus-titre { font-family: var(--font-fraunces, Georgia, serif); font-size: 1.5rem; margin: 8px 0; }
      .itv-refus-texte { margin: 0 0 8px; }
      .itv-refus-aide { font-size: .88rem; color: #6b5f5a; }
      .itv-retour { background: none; border: none; color: #6b5f5a; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font: inherit; padding: 0 0 12px; }
      .itv-entete { margin-bottom: 16px; }
      .itv-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: .78rem; color: #8a5a44; font-weight: 600; }
      .itv-titre { font-family: var(--font-fraunces, Georgia, serif); font-size: 1.6rem; margin: 6px 0 4px; }
      .itv-meta { margin: 0; color: #6b5f5a; font-size: .92rem; line-height: 1.5; }
      .itv-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
      .itv-tag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 99px; background: #f1efe9; font-size: .78rem; }
      .itv-h2 { font-size: 1rem; margin: 18px 0 8px; }
      .itv-seances { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
      .itv-seance-btn { width: 100%; text-align: left; background: #fff; border: 1px solid rgba(0,0,0,.09); border-radius: 12px; padding: 12px 14px; cursor: pointer; font: inherit; display: grid; gap: 4px; }
      .itv-seance.mienne .itv-seance-btn { border-color: #d8c7b8; background: #fffaf5; }
      .itv-seance-date { display: inline-flex; align-items: center; gap: 6px; font-size: .8rem; color: #8a5a44; font-weight: 600; text-transform: capitalize; }
      .itv-seance-nom { font-weight: 600; }
      .itv-seance-meta { display: flex; gap: 12px; font-size: .8rem; color: #6b5f5a; align-items: center; }
      .itv-seance-meta span { display: inline-flex; align-items: center; gap: 4px; }
      .itv-vide { color: #6b5f5a; font-size: .88rem; margin: 0 0 8px; line-height: 1.5; }
      .itv-progression { display: flex; align-items: center; gap: 10px; margin: 12px 0; }
      .itv-jauge { flex: 1; height: 8px; border-radius: 99px; background: #eee9e2; overflow: hidden; }
      .itv-jauge span { display: block; height: 100%; background: #b87333; transition: width .2s; }
      .itv-compteur { font-size: .85rem; font-weight: 600; }
      .itv-erreur { background: #fdecea; color: #b42318; padding: 10px 12px; border-radius: 10px; font-size: .88rem; }
      .itv-liste { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
      .itv-ligne { background: #fff; border: 1px solid rgba(0,0,0,.08); border-radius: 12px; padding: 12px 14px; display: grid; gap: 8px; }
      .itv-ligne.info { opacity: .7; }
      .itv-nom { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
      .itv-prenom { font-weight: 600; }
      .itv-badge { font-size: .74rem; padding: 2px 8px; border-radius: 99px; background: #f1efe9; }
      .itv-boutons { display: flex; gap: 6px; }
      .itv-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 9px 6px; border-radius: 10px; border: 1px solid rgba(0,0,0,.12); background: #fff; font: inherit; font-size: .82rem; cursor: pointer; color: #4a3f3a; }
      .itv-btn.actif { color: var(--c); background: var(--f); border-color: var(--b); font-weight: 600; }
      .itv-btn:disabled { opacity: .6; }
      .itv-cadre { margin: 16px 0 0; font-size: .82rem; color: #6b5f5a; line-height: 1.5; }
      .itv-releve { margin-top: 18px; }
        .itv-releve-mois { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
        .itv-releve-lien { display: inline-flex; padding: 8px 12px; border-radius: 999px; border: 1px solid rgba(0,0,0,.14); background: #fff; color: inherit; text-decoration: none; font-size: .86rem; text-transform: capitalize; }
        .itv-compte { margin-top: 22px; padding: 14px; border-radius: 12px; background: #faf2eb; border: 1px solid #e8c8a8; font-size: .9rem; }
      .itv-compte p { margin: 6px 0 10px; line-height: 1.5; color: #4a3f3a; }
      .itv-compte-btn { display: inline-block; padding: 9px 16px; border-radius: 10px; background: #1a1612; color: #fff; text-decoration: none; font-weight: 600; font-size: .88rem; }
      .itv-pied { margin-top: 28px; text-align: center; font-size: .8rem; color: #8b8078; }
      .itv-pied p { margin: 4px 0; }
      .itv-signature { font-weight: 600; }
    `}</style>
  );
}
