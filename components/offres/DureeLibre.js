'use client';

/**
 * Saisir une durée dans SON unité (2026-08-25, retour d'une prof le jour de
 * son inscription : « je voulais définir 4 mois mais on ne peut mettre que des
 * jours quand on sélectionne autre »).
 *
 * Les préréglages parlent en mois (1 mois, 3 mois, 1 an) et le champ libre
 * réclamait des JOURS : dès qu'une prof sort des trois cases, on lui demande
 * une conversion mentale. Personne ne pense un abonnement en 122 jours.
 *
 * On stocke toujours des jours (`duree_jours`) : c'est ce que la vente calcule
 * et ce que toute l'app lit. Seule la SAISIE change d'unité.
 *
 * ⚠️ Un mois vaut 30 jours ici, comme partout ailleurs dans le formulaire
 * (PRESETS_DUREE_ABO). C'est un choix assumé et ANCIEN : la vente compte des
 * jours, et un abonnement qui annoncerait « même jour du mois suivant » sans
 * savoir le calculer mentirait sur sa date de fin. L'appelant affiche la date
 * réelle juste en dessous — c'est elle qui fait foi, pas l'étiquette.
 */

const JOURS_PAR = { jours: 1, semaines: 7, mois: 30 };

/** Devine l'unité la plus lisible pour un nombre de jours déjà enregistré. */
export function uniteNaturelle(jours) {
  const n = parseInt(jours, 10);
  if (!Number.isFinite(n) || n < 1) return 'mois';
  if (n % 30 === 0) return 'mois';
  if (n % 7 === 0) return 'semaines';
  return 'jours';
}

/** Nombre à afficher dans l'unité choisie (arrondi vers le bas, min 1). */
export function valeurDansUnite(jours, unite) {
  const n = parseInt(jours, 10);
  if (!Number.isFinite(n) || n < 1) return '';
  return String(Math.max(1, Math.round(n / (JOURS_PAR[unite] || 1))));
}

/** La conversion vers ce qu'on stocke. */
export function enJours(valeur, unite) {
  const n = parseInt(valeur, 10);
  if (!Number.isFinite(n) || n < 1) return '';
  return String(n * (JOURS_PAR[unite] || 1));
}

export default function DureeLibre({ jours, onChange, unite, onUnite, autoFocus = false }) {
  const u = unite || 'mois';
  return (
    <div className="dl-ligne">
      <input
        className="izi-input dl-nombre"
        type="number"
        min="1"
        placeholder="Combien ?"
        value={valeurDansUnite(jours, u)}
        onChange={e => onChange(enJours(e.target.value, u))}
        autoFocus={autoFocus}
        aria-label="Durée"
      />
      <select
        className="izi-input dl-unite"
        value={u}
        onChange={e => {
          // On garde le NOMBRE affiché et on change d'unité : passer de
          // « 4 mois » à « 4 semaines » est ce que le geste veut dire.
          const affiche = valeurDansUnite(jours, u);
          onUnite(e.target.value);
          onChange(enJours(affiche, e.target.value));
        }}
        aria-label="Unité de durée"
      >
        <option value="jours">jours</option>
        <option value="semaines">semaines</option>
        <option value="mois">mois</option>
      </select>

      <style jsx global>{`
        .dl-ligne { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
        .dl-nombre { max-width: 130px; }
        .dl-unite { max-width: 130px; }
      `}</style>
    </div>
  );
}
