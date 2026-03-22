// ============================================
// IziSolo — Vocabulaire adaptatif par métier
// ============================================

const VOCABULAIRES = {
  yoga: {
    client: 'élève',
    clients: 'élèves',
    Client: 'Élève',
    Clients: 'Élèves',
    seance: 'séance',
    seances: 'séances',
    Seance: 'Séance',
    Seances: 'Séances',
    cours: 'cours',
    Cours: 'Cours',
    lecon: 'cours',
    rdv: 'cours',
  },
  pilates: {
    client: 'élève',
    clients: 'élèves',
    Client: 'Élève',
    Clients: 'Élèves',
    seance: 'séance',
    seances: 'séances',
    Seance: 'Séance',
    Seances: 'Séances',
    cours: 'cours',
    Cours: 'Cours',
    lecon: 'cours',
    rdv: 'cours',
  },
  danse: {
    client: 'danseur',
    clients: 'danseurs',
    Client: 'Danseur',
    Clients: 'Danseurs',
    seance: 'séance',
    seances: 'séances',
    Seance: 'Séance',
    Seances: 'Séances',
    cours: 'cours',
    Cours: 'Cours',
    lecon: 'cours',
    rdv: 'cours',
  },
  musique: {
    client: 'élève',
    clients: 'élèves',
    Client: 'Élève',
    Clients: 'Élèves',
    seance: 'leçon',
    seances: 'leçons',
    Seance: 'Leçon',
    Seances: 'Leçons',
    cours: 'cours',
    Cours: 'Cours',
    lecon: 'leçon',
    rdv: 'cours',
  },
  coaching: {
    client: 'coaché',
    clients: 'coachés',
    Client: 'Coaché',
    Clients: 'Coachés',
    seance: 'session',
    seances: 'sessions',
    Seance: 'Session',
    Seances: 'Sessions',
    cours: 'rendez-vous',
    Cours: 'Rendez-vous',
    lecon: 'session',
    rdv: 'rendez-vous',
  },
  arts: {
    client: 'participant',
    clients: 'participants',
    Client: 'Participant',
    Clients: 'Participants',
    seance: 'atelier',
    seances: 'ateliers',
    Seance: 'Atelier',
    Seances: 'Ateliers',
    cours: 'atelier',
    Cours: 'Atelier',
    lecon: 'atelier',
    rdv: 'atelier',
  },
  autre: {
    client: 'client',
    clients: 'clients',
    Client: 'Client',
    Clients: 'Clients',
    seance: 'séance',
    seances: 'séances',
    Seance: 'Séance',
    Seances: 'Séances',
    cours: 'cours',
    Cours: 'Cours',
    lecon: 'cours',
    rdv: 'cours',
  },
};

/**
 * Retourne le vocabulaire pour un métier donné.
 * Peut être surchargé par un vocabulaire custom (stocké en JSONB dans profiles).
 */
export function getVocabulaire(metier, customOverrides = null) {
  const base = VOCABULAIRES[metier] || VOCABULAIRES.autre;
  if (customOverrides) {
    return { ...base, ...customOverrides };
  }
  return base;
}

/**
 * Helper pour traduire un mot-clé selon le métier
 * Usage: v('clients', 'yoga') → "élèves"
 */
export function v(key, metier, customOverrides = null) {
  const vocab = getVocabulaire(metier, customOverrides);
  return vocab[key] || key;
}

export default VOCABULAIRES;
