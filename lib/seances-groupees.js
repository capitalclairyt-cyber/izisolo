// ============================================================================
// IziSolo — Replier les séances identiques d'une même journée (2026-08-25)
// ----------------------------------------------------------------------------
// Déclencheur : Melyflow, prof à Genly. Elle n'enseigne QUE le samedi, et sa
// journée de rentrée compte cinq « Cours découverte » au même endroit, au même
// prix, à cinq heures différentes. Son portail affichait donc cinq cartes
// quasi identiques empilées : il faut scroller pour comprendre qu'il s'agit du
// même cours, et la répétition donne l'impression d'un planning brouillon
// alors qu'elle propose simplement plusieurs horaires.
//
// Ce module ne décide QUE de l'affichage. Il ne masque rien, ne filtre rien,
// ne fusionne aucune donnée : chaque séance garde son id, sa page, sa jauge et
// son bouton. C'est un pli, pas un résumé.
//
// ── Les trois règles qui comptent ───────────────────────────────────────────
// 1. On ne replie QUE des séances vraiment interchangeables : même nom, même
//    type, même lieu, même format, même tarif, même image. Deux cours qui
//    diffèrent d'un seul de ces points restent deux cartes — sinon le pli
//    cacherait une différence que l'élève devait voir.
// 2. Une séance ANNULÉE ne rejoint jamais un groupe. « Annulée » est
//    l'information la plus importante de la carte ; la replier la rendrait
//    invisible derrière un chevron.
// 3. On ne prétend jamais connaître un nombre de places qu'on ne connaît pas :
//    dès qu'une séance du groupe est à capacité libre, le total repasse à null.
// ============================================================================

/** En dessous de ce nombre, replier coûte plus qu'il ne rapporte : un en-tête
 *  plus deux lignes prend autant de place que deux cartes. */
export const SEUIL_GROUPE = 3;

const heureCourte = (h) => String(h || '').slice(0, 5);

/**
 * L'identité d'affichage d'une séance : ce qui doit être IDENTIQUE pour que
 * deux séances soient interchangeables aux yeux d'une visiteuse.
 * L'heure n'en fait évidemment pas partie — c'est la seule chose qui distingue
 * les membres d'un groupe.
 */
export function cleGroupe(c) {
  if (!c) return '';
  return [
    c.date || '',
    (c.nom || '').trim().toLowerCase(),
    (c.type_cours || '').trim().toLowerCase(),
    (c.lieu || '').trim().toLowerCase(),
    c.format || 'presentiel',
    c.tarif_unitaire == null ? '' : String(Number(c.tarif_unitaire)),
    c.carnets_acceptes === true ? 'carnets' : '',
    c.photo_url || '',
    // Un cours à domicile ou rattaché à une structure ne se replie pas avec un
    // cours collectif du même nom : ce n'est pas la même prestation.
    c.domicile ? 'domicile' : '',
    c.client_pro_id || '',
  ].join('|');
}

/** Ce qu'on affiche sans déplier. Aucun chiffre inventé. */
export function resumeGroupe(cours) {
  const heures = cours.map(c => heureCourte(c.heure)).filter(Boolean).sort();
  let places = 0;
  let placesConnues = true;
  for (const c of cours) {
    if (!c.capacite_max) { placesConnues = false; continue; }
    places += Math.max(0, c.capacite_max - (c.nbInscrits || 0));
  }
  return {
    nb: cours.length,
    heures,
    premiere: heures[0] || null,
    derniere: heures[heures.length - 1] || null,
    // null = « on ne sait pas », JAMAIS 0 : un groupe dont une séance est à
    // capacité libre n'est pas un groupe complet.
    placesRestantes: placesConnues ? places : null,
    toutComplet: placesConnues && places === 0,
  };
}

/**
 * Replie une liste de séances D'UNE MÊME JOURNÉE.
 *
 * Rend une liste d'éléments dans l'ordre d'origine :
 *   { type: 'seance', cours }
 *   { type: 'groupe', id, cle, cours: [...], resume }
 *
 * Le groupe prend la place de son PREMIER membre : l'ordre chronologique de la
 * journée est préservé, une visiteuse ne voit pas les horaires sauter.
 */
export function grouperSeances(liste, { seuil = SEUIL_GROUPE } = {}) {
  const seances = Array.isArray(liste) ? liste.filter(Boolean) : [];
  if (seances.length === 0) return [];

  const parCle = new Map();
  for (const c of seances) {
    // Règle 2 : une séance annulée reste seule, toujours.
    if (c.est_annule) continue;
    const cle = cleGroupe(c);
    if (!parCle.has(cle)) parCle.set(cle, []);
    parCle.get(cle).push(c);
  }

  const groupables = new Set();
  for (const [cle, membres] of parCle) {
    if (membres.length >= seuil) groupables.add(cle);
  }

  const rendus = new Set();
  const items = [];
  for (const c of seances) {
    const cle = c.est_annule ? null : cleGroupe(c);
    if (!cle || !groupables.has(cle)) {
      items.push({ type: 'seance', cours: c });
      continue;
    }
    if (rendus.has(cle)) continue;
    rendus.add(cle);
    const membres = [...parCle.get(cle)].sort(
      (a, b) => heureCourte(a.heure).localeCompare(heureCourte(b.heure))
    );
    items.push({
      type: 'groupe',
      // Stable d'un rendu à l'autre : c'est la clé d'ouverture/fermeture.
      id: `grp-${membres[0].id}`,
      cle,
      cours: membres,
      resume: resumeGroupe(membres),
    });
  }
  return items;
}

/**
 * « 5 créneaux, de 9h30 à 16h » — la phrase de l'en-tête replié.
 *
 * Le module garde les heures en HH:MM (comparable, triable) et laisse
 * l'appelant les mettre en forme : sans ça, l'en-tête disait « 09:30 » pendant
 * que les lignes dépliées disaient « 9h30 », dans la même carte.
 */
export function libelleGroupe(resume, formatHeure = (h) => h) {
  if (!resume?.nb) return '';
  const creneaux = `${resume.nb} créneaux`;
  if (!resume.premiere || !resume.derniere || resume.premiere === resume.derniere) {
    return creneaux;
  }
  return `${creneaux}, de ${formatHeure(resume.premiere)} à ${formatHeure(resume.derniere)}`;
}
