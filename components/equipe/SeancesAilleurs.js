'use client';

import { useState } from 'react';
import { Building2, MapPin, Monitor, Users, Loader2, ArrowRight } from 'lucide-react';

/**
 * « Tes séances ailleurs » (pont 2, lot 1 Associations & Studios) : les
 * séances qu'une prof donne dans une autre structure, vues depuis SON IziSolo.
 * Un clic bascule sur la structure (cookie de studio actif, rechargement
 * complet assumé : changer de studio change tout ce que le serveur a rendu)
 * et ouvre la séance au pointage.
 */
function dateLisible(iso, heure) {
  if (!iso) return '';
  const d = new Date(`${iso}T${heure || '12:00'}:00`);
  const s = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  return heure ? `${s} · ${heure}` : s;
}

export default function SeancesAilleurs({ seances = [], titre = 'Tes séances ailleurs' }) {
  const [enCours, setEnCours] = useState(null);
  if (!seances.length) return null;

  const ouvrir = async (s) => {
    setEnCours(s.id);
    try {
      const res = await fetch('/api/studio-actif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studioId: s.studio_id }),
      });
      if (!res.ok) { setEnCours(null); return; }
      // Rechargement complet : le serveur re-rend TOUT pour l'autre studio.
      window.location.href = `/pointage/${s.id}`;
    } catch {
      setEnCours(null);
    }
  };

  return (
    <section className="sa-bloc" data-testid="seances-ailleurs">
      <div className="sa-entete">
        <Building2 size={16} />
        <h2>{titre}</h2>
        <span className="sa-aide">Les cours que tu donnes dans d&apos;autres structures. Un clic ouvre la séance chez elles.</span>
      </div>
      <ul className="sa-liste">
        {seances.map(s => (
          <li key={s.id} className="sa-carte">
            <div className="sa-carte-info">
              <span className="sa-studio">{s.studio_nom}</span>
              <span className="sa-nom">{s.nom}</span>
              <span className="sa-meta">
                <span>{dateLisible(s.date, s.heure)}</span>
                {s.en_ligne ? <span><Monitor size={12} /> En ligne</span> : s.lieu && <span><MapPin size={12} /> {s.lieu}</span>}
                <span><Users size={12} /> {s.nb_inscrites}</span>
              </span>
            </div>
            <button type="button" className="izi-btn btn-sm izi-btn-secondary" onClick={() => ouvrir(s)} disabled={enCours === s.id}>
              {enCours === s.id ? <Loader2 size={14} className="sa-spin" /> : <ArrowRight size={14} />} Ouvrir
            </button>
          </li>
        ))}
      </ul>
      <style jsx global>{`
        .sa-bloc { margin: 0 0 18px; padding: 14px 16px; border-radius: 14px; background: var(--brand-light, #faf2eb); border: 1px solid var(--brand-200, #e8c8a8); }
        .sa-entete { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
        .sa-entete h2 { font-size: 1rem; margin: 0; }
        .sa-aide { font-size: .8rem; color: var(--text-soft, #7a6f6a); flex-basis: 100%; }
        .sa-liste { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
        .sa-carte { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border-radius: 10px; background: #fff; border: 1px solid rgba(0,0,0,.07); }
        .sa-carte-info { display: grid; gap: 2px; min-width: 0; }
        .sa-studio { font-size: .74rem; font-weight: 700; color: var(--brand-700, #8c5826); text-transform: uppercase; letter-spacing: .03em; }
        .sa-nom { font-weight: 600; }
        .sa-meta { display: flex; gap: 10px; flex-wrap: wrap; font-size: .8rem; color: var(--text-soft, #7a6f6a); }
        .sa-meta span { display: inline-flex; align-items: center; gap: 4px; }
        .sa-spin { animation: sa-rot 1s linear infinite; }
        @keyframes sa-rot { to { transform: rotate(360deg); } }
      `}</style>
    </section>
  );
}
