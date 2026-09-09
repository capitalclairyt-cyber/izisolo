'use client';

// ════════════════════════════════════════════════════════════════════════════
// CarteReglage — une carte de réglages qui se REPLIE (lot 2 « Paramètres qui
// respirent », 2026-09-09).
//
// Fermée : une ligne (icône, titre, résumé d'état, chevron). Ouverte : ses
// champs et SON bouton Enregistrer. La première carte d'une rubrique s'ouvre
// d'elle-même ; les suivantes attendent le clic. Une carte « à compléter »
// (rien de renseigné) peut demander à s'ouvrir dès l'arrivée : un écran qui
// cache ce qu'il faut remplir n'aide personne.
//
// Le repli ne cache pas l'état : le résumé DIT ce qui est réglé. Et il ne
// perd rien : les champs sont des contrôles pilotés par le profil partagé du
// shell, fermer puis rouvrir rend exactement ce qui a été saisi.
//
// EnSavoirPlus — le complément d'aide replié sous un champ : une ligne
// visible, le reste derrière « En savoir plus ».
// ════════════════════════════════════════════════════════════════════════════

import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CarteReglage({ id, titre, icone: Icone, resume, ouverte = false, enTete = null, children }) {
  const [open, setOpen] = useState(ouverte);
  const corpsId = useId();
  return (
    <div className={`section izi-card carte-reglage ${open ? 'ouverte' : 'fermee'}`} data-carte-reglage={id}>
      <button
        type="button"
        className="carte-reglage-entete"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={corpsId}
      >
        {Icone && <span className="section-icon"><Icone size={20} /></span>}
        <span className="carte-reglage-texte">
          <span className="carte-reglage-titre">{titre}</span>
          {!open && resume && <span className="carte-reglage-resume">{resume}</span>}
        </span>
        {enTete}
        <ChevronDown size={18} className="carte-reglage-chevron" />
      </button>
      {open && (
        <div className="carte-reglage-corps" id={corpsId}>
          {children}
        </div>
      )}
    </div>
  );
}

export function EnSavoirPlus({ libelle = 'En savoir plus', children }) {
  return (
    <details className="ensavoir">
      <summary>{libelle}</summary>
      <div className="ensavoir-corps">{children}</div>
    </details>
  );
}
