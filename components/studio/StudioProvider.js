'use client';

import { createContext, useContext } from 'react';

/**
 * Le studio actif, côté navigateur (v101, lot 2 du chantier multi-prof).
 *
 * Résolu UNE fois par le layout dashboard (serveur, lib/studio-actif.js) et
 * descendu ici. Aucun composant ne le recalcule : deux résolutions finiraient
 * par diverger, et diverger sur « de quel studio parle-t-on » n'est pas un bug
 * d'affichage, c'est une fuite entre clientes.
 *
 * ⚠️ `useStudioId()` remplace `user.id` dans TOUT filtre ou insert sur
 * `profile_id`. Pour une prof seule les deux sont égaux ; pour une prof
 * invitée dans une association, non. Le ratchet CI `studio-scope.spec.js`
 * refuse le retour de la forme `profile_id = user.id`.
 */
const StudioContext = createContext({ studioId: null, membre: null, membres: [] });

export function StudioProvider({ studioId, membre, membres, children }) {
  return (
    <StudioContext.Provider value={{ studioId, membre, membres: membres || [] }}>
      {children}
    </StudioContext.Provider>
  );
}

/** L'identifiant du studio affiché. `null` seulement hors du dashboard. */
export function useStudioId() {
  return useContext(StudioContext).studioId;
}

/** L'appartenance de la personne connectée AU studio affiché (rôle, droits). */
export function useMembre() {
  return useContext(StudioContext).membre;
}

/** Toutes ses appartenances actives — le sélecteur de studio arrive au lot 3. */
export function useStudios() {
  return useContext(StudioContext).membres;
}
