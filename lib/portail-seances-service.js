/**
 * lib/portail-seances-service.js — LES séances de la page publique, pour une
 * plage de dates : une seule écriture pour le premier rendu (60 jours) et pour
 * ce que la route `/api/portail/[slug]/seances` sert quand une élève regarde
 * plus loin (2026-09-23). Avant, cette chaîne vivait dans page.js et personne
 * d'autre ne pouvait la rejouer ; la route l'aurait recopiée, et les deux
 * auraient divergé (le piège des deux cartes de séance, v99).
 *
 * Ce qui sort d'ici a exactement la forme que PortailHome affiche : filtre de
 * visibilité selon la visiteuse, séances déjà commencées écartées, places
 * occupées (RPC v89), prénom de l'intervenante (v111), photo de la séance
 * (v99). Rien de secret : tout part au navigateur.
 */
import { filterCoursVisibles } from '@/lib/visibilite';
import { coursDejaCommence } from '@/lib/dates';
import { compterPlacesOccupeesParCours } from '@/lib/presences';
import { chargerPhotosCours, greffePhotos } from '@/lib/vignette-cours';
import { lireIntervenantes, chargerIntervenantes, prenomIntervenante } from '@/lib/intervenante';
import { reportError } from '@/lib/report';

export const SELECT_SEANCE_PORTAIL = 'id, nom, date, heure, duree_minutes, type_cours, lieu, capacite_max, est_annule, recurrence_parent_id, visibilite, tarif_unitaire, carnets_acceptes, format';

/** Une page PostgREST : au-delà, on relit la suivante (plafond 1000 silencieux sinon). */
const PAGE = 1000;

/**
 * Le prénom de chaque membre de la structure, par id de membre. La
 * propriétaire donne ses cours sous SON prénom (profil), jamais un email.
 */
export function prenomsIntervenantes(profile, membres) {
  const out = Object.fromEntries(
    (membres || []).map(m => [m.id, prenomIntervenante(m)]).filter(([, p]) => !!p)
  );
  for (const m of membres || []) {
    if (m.role === 'proprietaire' && profile?.prenom) out[m.id] = profile.prenom;
  }
  return out;
}

/**
 * Les séances BRUTES d'un studio entre deux dates (incluses), non annulées,
 * paginées : aucune limite ne coupe jamais une fenêtre en silence (le
 * `.limit(240)` d'avant coupait Yoga Bien-être à 288 séances sur un an).
 */
export async function lireSeancesBrutes(supabase, profileId, de, a) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('cours')
      .select(SELECT_SEANCE_PORTAIL)
      .eq('profile_id', profileId)
      .eq('est_annule', false)
      .gte('date', de)
      .lte('date', a)
      .order('date', { ascending: true })
      .order('heure', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...(data || []));
    if ((data || []).length < PAGE) break;
  }
  return out;
}

/**
 * Enrichit des séances brutes comme la page les affiche : places, prénom de
 * l'intervenante, photo. `membres` peut être fourni par l'appelant (la page
 * les charge déjà pour l'onglet « L'équipe »), sinon on les lit ici.
 */
export async function enrichirSeances(supabase, profile, coursListe, { membres, route = '/p/' } = {}) {
  const ids = coursListe.map(c => c.id);
  let presencesCounts = {};
  if (ids.length > 0) {
    try {
      presencesCounts = await compterPlacesOccupeesParCours(supabase, ids);
    } catch (presErr) {
      // Jauges à 0 plutôt que page morte : la RPC reserver_place re-vérifie la
      // capacité sous verrou à la réservation de toute façon.
      reportError('[portail] comptage places err:', presErr, { route });
    }
  }
  const [photos, intervenantsParCours, membresBruts] = await Promise.all([
    chargerPhotosCours(supabase, ids),
    lireIntervenantes(supabase, ids),
    membres !== undefined ? Promise.resolve(membres) : chargerIntervenantes(supabase, profile.id),
  ]);
  const prenoms = prenomsIntervenantes(profile, membresBruts);
  return greffePhotos(coursListe.map(c => ({
    ...c,
    nbInscrits: presencesCounts[c.id] || 0,
    intervenante: intervenantsParCours[c.id] ? (prenoms[intervenantsParCours[c.id]] || null) : null,
    intervenante_id: intervenantsParCours[c.id] || null,
  })), photos);
}

/**
 * Les séances d'une plage telles que CETTE visiteuse peut les voir.
 * @param {object} profile     { id, prenom } au minimum
 * @param {object} opts.clientInfo  résultat de resolveClientInfo (null = anonyme)
 * @param {Array}  [opts.membres]   membres déjà chargés (facultatif)
 * @param {Array}  [opts.brutes]    séances brutes déjà lues (facultatif : la
 *                                  route les tient d'un cache, la page les lit)
 */
export async function chargerSeancesPortail(supabase, profile, { de, a, clientInfo = null, membres, brutes, route } = {}) {
  const coursRaw = brutes || await lireSeancesBrutes(supabase, profile.id, de, a);
  const visibles = filterCoursVisibles(coursRaw, clientInfo);
  // Horloge unique Paris (lib/dates) : un cours de 9 h disparaît à 9 h, pas à minuit.
  const futures = visibles.filter(c => !coursDejaCommence(c));
  return enrichirSeances(supabase, profile, futures, { membres, route });
}
