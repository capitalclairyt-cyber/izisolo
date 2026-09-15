// Les familles de guides admin, dans l'ordre où /admin/guides les affiche.
// Un guide sans groupe (ou avec un groupe inconnu) tombe dans le dernier :
// on préfère le voir mal rangé que ne pas le voir. Le verrou CI
// admin-guides.spec.js refuse un groupe inconnu au dépôt.
export const GROUPES_GUIDES = ['Légendes à coller', 'Tournage', 'Démo & installation', 'Backoffice', 'Autres'];

export const EMOJI_GROUPE = {
  'Légendes à coller': '📣',
  'Tournage': '🎥',
  'Démo & installation': '🎬',
  'Backoffice': '🛠️',
  'Autres': '📄',
};

// La date « maj » d'un guide : gray-matter rend une Date pour `maj: 2026-08-21`
// (sans guillemets) et une chaîne pour `maj: "2026-08-21"`. Sans ça, la page
// affichait « Mis à jour le Fri Aug 21 » pour la moitié des guides.
export function dateMaj(v) {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  const s = String(v).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

// Range une liste de guides { slug, titre, description, maj, groupe, ordre }
// en sections ordonnées : [{ groupe, guides: [...] }], sections vides omises.
export function grouperGuides(guides) {
  const parGroupe = new Map(GROUPES_GUIDES.map((g) => [g, []]));
  for (const g of guides) {
    const cle = GROUPES_GUIDES.includes(g.groupe) ? g.groupe : 'Autres';
    parGroupe.get(cle).push(g);
  }
  return GROUPES_GUIDES
    .map((groupe) => ({
      groupe,
      guides: parGroupe.get(groupe).sort((a, b) => (a.ordre ?? 999) - (b.ordre ?? 999) || String(a.titre).localeCompare(String(b.titre), 'fr')),
    }))
    .filter((s) => s.guides.length > 0);
}
