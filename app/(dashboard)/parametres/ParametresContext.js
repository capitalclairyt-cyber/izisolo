'use client';

// ════════════════════════════════════════════════════════════════════════════
// L'état partagé des Paramètres (lot 1 « Paramètres qui respirent »).
//
// Le profil du studio est chargé UNE fois par le shell (layout) et descendu à
// toutes les rubriques : naviguer de /parametres/profil à /parametres/studio
// ne recharge rien et garde les modifications non enregistrées. Le save par
// carte (B2e) vit ici, inchangé dans son contrat : le bouton Enregistrer
// d'une carte n'écrit QUE les colonnes de sa carte.
// ════════════════════════════════════════════════════════════════════════════

import { createContext, useContext } from 'react';
import { Save } from 'lucide-react';

export const ParametresContext = createContext(null);

export function useParametres() {
  const ctx = useContext(ParametresContext);
  if (!ctx) throw new Error('useParametres() doit être appelé sous ParametresShell');
  return ctx;
}

/** Bouton Enregistrer d'une carte — grisé tant que rien n'a changé dedans. */
export function BtnSauver({ carte }) {
  const { saveCarte, savingCarte, dirtyCartes } = useParametres();
  return (
    <button
      type="button"
      onClick={() => saveCarte(carte)}
      className="izi-btn izi-btn-primary save-btn"
      data-carte={carte}
      disabled={savingCarte === carte || !dirtyCartes.has(carte)}
    >
      <Save size={18} /> {savingCarte === carte ? 'Enregistrement...' : 'Enregistrer'}
    </button>
  );
}
