// ═══════════════════════════════════════════════════════════════════════════
// Verrou CI — identité visuelle des cours (v99, 2026-08-24). Spec Node pur
// (zéro navigateur, zéro serveur) : fige les règles de lib/vignette-cours.js.
//
// Ce qu'on protège en priorité :
//   - la photo d'une SÉANCE prime sur celle de son TYPE (c'est toute la raison
//     d'être de cours.photo_url : l'atelier ponctuel qui mérite son image) ;
//   - le TON reste au type (code de lecture, pas décoration) ;
//   - une URL hors de nos hosts est REFUSÉE, parce que next/image ne rend pas
//     une image cassée dessus : il jette au rendu ;
//   - le défaut déduit de lib/tones.js est du vocabulaire de yoga, et il donne
//     la MÊME couleur à Pilates et à Danse. C'est ce que la surcharge répare.
// ═══════════════════════════════════════════════════════════════════════════
import { test, expect } from '@playwright/test';
import {
  TONES,
  imageOptimisable,
  sanitizeVignettesParType,
  sanitizeTonsParType,
  toneCours,
  vignetteCours,
  auMoinsUneVignette,
  altVignette,
  greffePhotos,
} from '../../lib/vignette-cours.js';

const BLOB = 'https://str1.public.blob.vercel-storage.com/profiles/u1/vignette-1.jpg';
const BLOB2 = 'https://str1.public.blob.vercel-storage.com/profiles/u1/atelier-lune.jpg';
const SUPA = 'https://xyzref.supabase.co/storage/v1/object/public/photos/a.jpg';

test.describe('imageOptimisable — nos hosts, et rien d\'autre', () => {
  test('accepte Vercel Blob et Supabase Storage en https', () => {
    expect(imageOptimisable(BLOB)).toBe(true);
    expect(imageOptimisable(SUPA)).toBe(true);
  });

  test('refuse tout le reste (un host non déclaré fait JETER next/image)', () => {
    expect(imageOptimisable('http://str1.public.blob.vercel-storage.com/a.jpg')).toBe(false);
    expect(imageOptimisable('https://i.pinimg.com/564x/photo.jpg')).toBe(false);
    expect(imageOptimisable('https://evil.com/x.jpg?u=.supabase.co/')).toBe(false);
    expect(imageOptimisable('/icons/local.png')).toBe(false);
    expect(imageOptimisable(null)).toBe(false);
    expect(imageOptimisable(42)).toBe(false);
  });
});

test.describe('sanitizeVignettesParType — la carte est nettoyée, jamais crue', () => {
  test('entrées valides gardées, clés détourées', () => {
    expect(sanitizeVignettesParType({ '  Yin  ': BLOB, Hatha: SUPA }))
      .toEqual({ Yin: BLOB, Hatha: SUPA });
  });

  test('entrées difformes jetées ; carte vide = null', () => {
    expect(sanitizeVignettesParType({ '': BLOB, Yin: 'https://pinterest.com/a.jpg', Flow: '', Doux: null, X: 12 })).toBeNull();
    expect(sanitizeVignettesParType({})).toBeNull();
    expect(sanitizeVignettesParType(null)).toBeNull();
    expect(sanitizeVignettesParType([BLOB])).toBeNull();
    expect(sanitizeVignettesParType(`{"Yin":"${BLOB}"}`)).toBeNull();
  });

  test('carte plafonnée : une map géante ne passe pas', () => {
    const geante = {};
    for (let i = 0; i < 200; i++) geante[`Type${i}`] = BLOB;
    expect(Object.keys(sanitizeVignettesParType(geante)).length).toBe(40);
  });
});

test.describe('sanitizeTonsParType — liste blanche de tons', () => {
  test('tons connus gardés, casse tolérée', () => {
    expect(sanitizeTonsParType({ Yin: 'lavender', Flow: 'ROSE' }))
      .toEqual({ Yin: 'lavender', Flow: 'rose' });
  });

  test('tons inventés jetés ; carte vide = null', () => {
    expect(sanitizeTonsParType({ Yin: 'turquoise', Flow: '#ff0000', Doux: 1 })).toBeNull();
    expect(sanitizeTonsParType({ '': 'rose' })).toBeNull();
    expect(sanitizeTonsParType(null)).toBeNull();
  });

  test('tous les tons de la palette sont acceptés', () => {
    for (const t of TONES) {
      expect(sanitizeTonsParType({ X: t })).toEqual({ X: t });
    }
  });
});

test.describe('toneCours — le choix de la prof d\'abord, le défaut ensuite', () => {
  test('la surcharge du type gagne', () => {
    expect(toneCours({ type_cours: 'Vinyasa' }, { Vinyasa: 'ink' })).toBe('ink');
  });

  test('sans surcharge, on retombe sur le mapping historique', () => {
    expect(toneCours({ type_cours: 'Vinyasa flow' }, null)).toBe('rose');
    expect(toneCours({ type_cours: 'Hatha doux' }, null)).toBe('sage');
    expect(toneCours({ type_cours: 'Yin restauratif' }, null)).toBe('lavender');
    expect(toneCours({ type_cours: 'Yoga prénatal' }, null)).toBe('sand');
    expect(toneCours({ type_cours: 'Méditation guidée' }, null)).toBe('ink');
    expect(toneCours({ type_cours: null }, null)).toBe('sand');
  });

  test('LA RAISON D\'ÊTRE DE LA SURCHARGE : hors yoga, le défaut confond', () => {
    // Pilates et Danse tombent tous les deux sur le repli « première lettre
    // modulo 4 » et ressortent de la MÊME couleur. Sans v99, la prof n'avait
    // aucun moyen de les distinguer sur son portail.
    expect(toneCours({ type_cours: 'Pilates' }, null))
      .toBe(toneCours({ type_cours: 'Danse' }, null));
    // Avec la surcharge, elle décide.
    expect(toneCours({ type_cours: 'Pilates' }, { Pilates: 'sky' })).not.toBe('sky'); // 'sky' n'est pas un ton de la palette
    expect(toneCours({ type_cours: 'Pilates' }, { Pilates: 'lavender' })).toBe('lavender');
    expect(toneCours({ type_cours: 'Danse' }, { Danse: 'ink' })).toBe('ink');
  });

  test('accepte aussi un type passé directement en chaîne', () => {
    expect(toneCours('Yin', { Yin: 'rose' })).toBe('rose');
  });
});

test.describe('vignetteCours — la séance prime sur son type', () => {
  const CARTE = { Yin: BLOB, Hatha: SUPA };

  test('la photo de la séance gagne sur celle du type', () => {
    expect(vignetteCours({ type_cours: 'Yin', photo_url: BLOB2 }, CARTE)).toBe(BLOB2);
  });

  test('sans photo propre, la séance porte celle de son type', () => {
    expect(vignetteCours({ type_cours: 'Yin' }, CARTE)).toBe(BLOB);
    expect(vignetteCours({ type_cours: 'Hatha', photo_url: null }, CARTE)).toBe(SUPA);
  });

  test('rien à afficher = null, jamais une chaîne vide', () => {
    expect(vignetteCours({ type_cours: 'Flow' }, CARTE)).toBeNull();
    expect(vignetteCours({ type_cours: 'Yin' }, null)).toBeNull();   // pré-v99
    expect(vignetteCours(null, CARTE)).toBeNull();
    expect(vignetteCours({ type_cours: 'Yin', photo_url: '   ' }, null)).toBeNull();
  });

  test('une photo de séance hors de nos hosts est ignorée, pas rendue', () => {
    // Elle retombe sur la vignette du type : dégrader vaut mieux que jeter.
    expect(vignetteCours({ type_cours: 'Yin', photo_url: 'https://i.pinimg.com/a.jpg' }, CARTE)).toBe(BLOB);
    expect(vignetteCours({ type_cours: 'Flow', photo_url: 'javascript:alert(1)' }, CARTE)).toBeNull();
  });
});

test.describe('auMoinsUneVignette — décide d\'une mise en page', () => {
  test('vrai dès qu\'une seule carte du lot a une image', () => {
    const liste = [{ type_cours: 'Flow' }, { type_cours: 'Yin' }];
    expect(auMoinsUneVignette(liste, { Yin: BLOB })).toBe(true);
    expect(auMoinsUneVignette(liste, { Autre: BLOB })).toBe(false);
    expect(auMoinsUneVignette([], { Yin: BLOB })).toBe(false);
    expect(auMoinsUneVignette(null, null)).toBe(false);
  });
});

test.describe('greffePhotos — un seul objet à lire pour l\'affichage', () => {
  test('greffe les urls trouvées, laisse les autres cours intacts', () => {
    const liste = [{ id: 'a', nom: 'A' }, { id: 'b', nom: 'B' }];
    const map = new Map([['a', BLOB]]);
    const out = greffePhotos(liste, map);
    expect(out[0]).toEqual({ id: 'a', nom: 'A', photo_url: BLOB });
    expect(out[1]).toBe(liste[1]); // même référence : aucune copie inutile
  });

  test('map vide = liste rendue telle quelle', () => {
    const liste = [{ id: 'a' }];
    expect(greffePhotos(liste, new Map())).toBe(liste);
    expect(greffePhotos(liste, null)).toBe(liste);
    expect(greffePhotos(null, new Map())).toEqual([]);
  });
});

test.describe('altVignette — un alt qui dit quelque chose', () => {
  test('nomme le cours, se replie proprement', () => {
    expect(altVignette({ nom: 'Yoga Pleine Lune' })).toBe('Illustration de Yoga Pleine Lune');
    expect(altVignette({})).toBe('Illustration du cours');
    expect(altVignette(null)).toBe('Illustration du cours');
  });
});
