// ============================================
// IziSolo — APIs France (SIRENE + Geo)
// ============================================

/**
 * Recherche entreprise via API SIRENE (recherche-entreprises.api.gouv.fr)
 * Gratuit, pas de clé API
 * @param {string} query - SIRET, SIREN, ou nom d'entreprise
 * @returns {Promise<Array>} Liste d'établissements
 */
export async function rechercherEntreprise(query) {
  if (!query || query.trim().length < 3) return [];
  const q = query.trim();

  // Si c'est un SIRET (14 chiffres) ou SIREN (9 chiffres)
  const cleaned = q.replace(/\s/g, '');
  const isSiret = /^\d{14}$/.test(cleaned);
  const isSiren = /^\d{9}$/.test(cleaned);

  try {
    let url;
    if (isSiret) {
      url = `https://recherche-entreprises.api.gouv.fr/search?q=${cleaned}&page=1&per_page=5`;
    } else if (isSiren) {
      url = `https://recherche-entreprises.api.gouv.fr/search?q=${cleaned}&page=1&per_page=5`;
    } else {
      url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(q)}&page=1&per_page=8`;
    }

    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    return (data.results || []).map(r => {
      const siege = r.siege || {};
      return {
        siren: r.siren || '',
        siret: siege.siret || '',
        nom: r.nom_complet || r.nom_raison_sociale || '',
        enseigne: siege.nom_commercial || siege.enseigne_1 || '',
        adresse: [siege.numero_voie, siege.type_voie, siege.libelle_voie].filter(Boolean).join(' '),
        codePostal: siege.code_postal || '',
        ville: siege.libelle_commune || '',
        activite: r.activite_principale ? `${r.activite_principale} - ${r.section_activite_principale || ''}` : '',
        natureJuridique: r.nature_juridique || '',
        trancheEffectifs: r.tranche_effectif_salarie || '',
        dateCreation: r.date_creation || '',
      };
    });
  } catch (err) {
    console.warn('Erreur API SIRENE:', err);
    return [];
  }
}

/**
 * Recherche communes par code postal ou nom
 * Via geo.api.gouv.fr (gratuit, pas de clé)
 * @param {string} query - Code postal ou début de nom de commune
 * @returns {Promise<Array>} Liste de communes
 */
export async function rechercherCommune(query) {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim();

  try {
    const isCP = /^\d{2,5}$/.test(q);
    let url;

    if (isCP) {
      url = `https://geo.api.gouv.fr/communes?codePostal=${q}&fields=nom,codesPostaux,departement,population&limit=15`;
      // Si code postal partiel (2-4 chiffres), chercher par nom aussi
      if (q.length < 5) {
        url = `https://geo.api.gouv.fr/communes?codePostal=${q}&fields=nom,codesPostaux,departement,population&limit=15`;
        // L'API ne supporte pas les CP partiels, on fait une recherche par boost
        url = `https://geo.api.gouv.fr/communes?nom=${q}&fields=nom,codesPostaux,departement,population&boost=population&limit=15`;
      }
    } else {
      url = `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(q)}&fields=nom,codesPostaux,departement,population&boost=population&limit=15`;
    }

    const res = await fetch(url);
    if (!res.ok) return [];
    const communes = await res.json();

    // Flatten: une commune peut avoir plusieurs codes postaux
    const results = [];
    for (const c of communes) {
      for (const cp of (c.codesPostaux || [])) {
        // Si on cherche par CP, filtrer pour ne garder que ceux qui matchent
        if (isCP && q.length >= 2 && !cp.startsWith(q)) continue;
        results.push({
          nom: c.nom,
          codePostal: cp,
          departement: c.departement?.nom || '',
          codeDepartement: c.departement?.code || '',
          population: c.population || 0,
        });
      }
    }

    // Trier par population décroissante
    results.sort((a, b) => b.population - a.population);
    return results.slice(0, 15);
  } catch (err) {
    console.warn('Erreur API Geo:', err);
    return [];
  }
}

/**
 * Recherche adresse via BAN (Base Adresse Nationale)
 * @param {string} query - Début d'adresse
 * @returns {Promise<Array>} Liste de suggestions d'adresses
 */
export async function rechercherAdresse(query) {
  if (!query || query.trim().length < 5) return [];

  try {
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query.trim())}&limit=6`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    return (data.features || []).map(f => ({
      label: f.properties.label || '',
      adresse: f.properties.name || '',
      codePostal: f.properties.postcode || '',
      ville: f.properties.city || '',
    }));
  } catch (err) {
    console.warn('Erreur API Adresse:', err);
    return [];
  }
}
