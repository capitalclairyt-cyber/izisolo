# IziSolo — Proposition de charte 2026

> **Brief** : casser l'effet "tout rose" qui colle à IziSolo depuis le début,
> sans repartir de zéro. Base inspirée des bibles MéluTek
> (color-bible / typo-bible / uxui-bible 2026), adaptée à la cible
> multi-vertical IziSolo (yoga, pilates, danse, musique, coaching, arts).
>
> **Principe directeur 2026** : *calme + contraste*. Une base earthy/neutre
> qui apaise + un accent saturé qui réveille. L'inverse exact du
> "tout-saturé" ou du "tout-pâle".

---

## 🩹 Diagnostic du problème actuel

L'app IziSolo souffre du *millennial pink everywhere* identifié comme
**mort en 2026** par la color-bible MéluTek :

| Variable actuelle | Valeur | Problème |
|---|---|---|
| `--brand` | `#d4a0a0` rose poudré | Trop saccharine, codé féminin → exclut profs masculins (musique, coaching), profs B2B/corpo |
| `--brand-light` | `#f5e6e6` rose ultra pâle | Hovers / badges / cards hover → tout l'UI baigne dans le rose |
| `--brand-700` | `#8c5858` rose foncé | Texte d'accent → encore rose |
| Tons annexes (sage, sand, lavender, ink) | Existent ✅ | Mais sous-utilisés, le rose écrase tout |

**Conséquence concrète** : à l'ouverture de l'app, l'œil voit *roses partout*,
même si chaque détail est subtil. C'est la fatigue chromatique cumulative.

**Ce qui marche déjà et qu'on garde** (rien à toucher) :
- Base cream chaude `#faf8f5` (hors tendance "blanc stark mort")
- Texte primaire brun `#3d3028` (pas de noir froid — bon réflexe)
- Ombres `rgba(92, 74, 58, ...)` chaudes
- Rayons doux `8/12/16/24px`
- Typo Fraunces (variable opsz + SOFT) ← **workhorse 2026 validé** par typo-bible

---

## 🎨 Proposition : palette **« Sauge & Cuivre »**

### Le couple structurant

- **Base earthy** : sauge poudré (`#9CAFA0`) + cream conservé
- **Accent saturé** : cuivre métallique (`#B87333`) + persimmon (`#E8722A`) en hot

→ **Casse le rose** sans tomber dans le sapin "eco" ni le fintech bleu plat.
→ **Gender-neutral** (cuivre = artisanat + wellness sans connotation genrée).
→ **Multi-vertical** (parle aussi bien à yoga, pilates, danse, musique).

### Variables CSS finales

```css
:root {
  /* === BRAND : Sauge & Cuivre === */
  --brand:        #B87333;  /* Cuivre métallique — accent principal (boutons, focus, liens) */
  --brand-light:  #FBF1E6;  /* Cuivre très pâle — hovers, brand-light backgrounds */
  --brand-dark:   #8B5722;  /* Cuivre foncé — états pressed, accents intenses */
  --brand-50:     #FDF8F1;
  --brand-100:    #FBF1E6;
  --brand-200:    #F0DCC1;
  --brand-300:    #DEB987;
  --brand-500:    #B87333;
  --brand-600:    #9F6228;
  --brand-700:    #7A4A1E;

  /* === ACCENT SECONDAIRE : Sauge calme === */
  --sage:         #9CAFA0;  /* Sauge poudré — badges calmes, hovers neutres */
  --sage-light:   #E5EBE5;  /* Sauge ultra pâle — fonds tinte */
  --sage-dark:    #5A6B62;  /* Sauge profond — texte secondaire wellness */
  --sage-deep:    #2C3935;  /* Forêt profond — texte primaire alternative */

  /* === ACCENT HOT (réservé CTAs success / actions chaudes) === */
  --hot:          #E8722A;  /* Persimmon — only success/CTA "envoyer le SMS" etc. */
  --hot-light:    #FCE8DA;

  /* === Neutres (inchangés — base solide à conserver) === */
  --cream:        #FAF7F2;  /* léger ajustement : un poil moins saturé */
  --cream-dark:   #EFE9DD;  /* papier kraft warm */
  --taupe:        #8C7B6B;
  --taupe-light:  #B8A99A;
  --brown:        #5C4A3A;
  --brown-dark:   #3D3028;

  /* === Sémantiques (ajustement vers couleurs MéluTek 2026) === */
  --success:      #6B9A6B;  /* Vert sauge profond (≠ vert Photoshop éco-cliché) */
  --warning:      #D4B06A;  /* Or doux (inchangé) */
  --danger:       #C4574E;  /* Brique-rouge (≠ rouge plat froid) */
  --info:         #5A8AA8;  /* Bleu fumé chaud */

  /* === Texte (inchangé — déjà bon) === */
  --text-primary:    #3D3028;
  --text-secondary:  #6B5A4A;  /* léger ajustement, plus contrasté que #8c7b6b */
  --text-muted:      #A89888;
  --text-inverse:    #FAF7F2;

  /* === Surfaces (quasi inchangées) === */
  --bg-page:        #FAF7F2;
  --bg-card:        #FFFFFF;
  --bg-card-hover:  #F5F0E8;  /* léger warm ajustement */
  --bg-input:       #FFFFFF;
  --bg-nav:         #FFFFFF;
  --bg-soft:        #F8F4ED;  /* nouveau : fond tinte papier pour sections */

  /* === Bordures (inchangées) === */
  --border:         #E5DED2;
  --border-focus:   var(--brand);

  /* === Ombres (chaudes, inchangées) === */
  --shadow-sm: 0 1px 2px rgba(92, 74, 58, 0.05);
  --shadow-md: 0 4px 12px rgba(92, 74, 58, 0.08);
  --shadow-lg: 0 8px 24px rgba(92, 74, 58, 0.12);
}
```

### Comparaison visuelle (mots-clés)

| Élément | Avant | Après |
|---|---|---|
| **Bouton primaire** | Rose poudré crémeux | Cuivre métallique chaud — plus pro, gender-neutral |
| **Hover de carte** | Rose pâle qui dilue tout | Cream légèrement chaud — neutre, pas de "bain rose" |
| **Badge actif** | Rose vif | Cuivre + sauge en alternance selon contexte |
| **Notification success** | Vert plat éco-cliché | Vert sauge profond — wellness moderne |
| **CTA "envoyer SMS"** | Rose primaire | Persimmon orange — *signal hot, action* |

---

## 🅰️ Typo : on garde, on muscle légèrement

**État actuel d'IziSolo** :
- ✅ `Fraunces` (variable opsz + SOFT) — display warm
- ✅ `Geist` — body neutre lisible
- ✅ `Geist_Mono` — mono
- `Instrument_Serif` — landing only

**Diag bible-typo** : Fraunces est listée comme **workhorse 2026 confirmé**
(combo `editorial`). Geist est un Inter-like correct mais sans grand caractère.

### Ajustements proposés

1. **Garder Fraunces partout** — c'est notre signature display, elle marche.
   Augmenter son usage sur les `h1/h2` du dashboard (actuellement Geist),
   pour casser la neutralité Geist trop UI-générique.

2. **Body : remplacer Geist par Inter** — Inter c'est *le* workhorse 2026
   identifié, gratuit, variable, optimisé écran. Geist (par Vercel) reste
   un Inter-like sans plus-value. Migration triviale : changement d'1 ligne
   dans `app/layout.js` + variable CSS.

3. **Caveat en accent manuscrit** — pour les éléments wellness perso (signature
   prof, message anniversaire, citation portail). Cf. typo-bible §05 wellness.
   Réservé : 2-3 endroits max, jamais en body.

```js
// app/layout.js (proposé)
import { Fraunces, Inter, JetBrains_Mono, Caveat } from 'next/font/google';

const fraunces = Fraunces({ axes: ['opsz', 'SOFT'], variable: '--font-display' });
const inter = Inter({ variable: '--font-body' });
const jetMono = JetBrains_Mono({ variable: '--font-mono' });
const caveat = Caveat({ weight: ['600', '700'], variable: '--font-script' });
```

---

## 🧩 Patterns UX/UI à activer

D'après uxui-bible §"Décision rapide" — IziSolo est un **app/dashboard SaaS**
(pas un site vitrine). Patterns naturels recommandés :

| Pattern | Action sur IziSolo | Statut actuel |
|---|---|---|
| **Bento Grid** sur dashboard accueil | Remplacer la liste verticale actuelle par 4-6 tuiles : revenu mois, prochain cours, élèves actifs, alertes | ⏳ À faire (impact moyen) |
| **AI Copilot dans les marges** | Le bouton "Assistant IA" actuel pour rédaction SMS/email anniv → déplacer en sidebar contextuelle, pas en hero | 🟡 À déplacer |
| **Navigation contextuelle** | ✅ Sidebar collapsible desktop + bottom-nav mobile déjà en place | ✅ OK |
| **Motion fonctionnelle** | ✅ subtle lift sur cards déjà en place | ✅ OK |
| **Liquid Glass** | ❌ ÉVITER — fond cream non-gradient, ferait gadget | ❌ Skip |
| **Texture/Dopamine (squishy buttons)** | À doser : 1-2 endroits hero (bouton "+ ajouter élève" en FAB ?) | ⏳ Optionnel |
| **Generative UI** | ❌ ÉVITER en B2B sérieux — la prévisibilité prime pour un outil métier | ❌ Skip |

---

## 📋 Plan d'application — 3 phases low-risk

### Phase 1 — Repaint couleurs (1-2h, **0 risque fonctionnel**)
> *Le user voit le changement de personnalité de l'app immédiatement.*

- [ ] Remplacer le bloc `:root { --brand: ... }` dans `app/globals.css` (lignes 8-105) par le nouveau bloc Sauge & Cuivre
- [ ] Lancer l'app local + smoke test visuel : dashboard, agenda, clients, paramètres, portail public
- [ ] Ajuster les contrastes WCAG si nécessaire (vérifier `--text-secondary` sur `--bg-card-hover` notamment)
- [ ] Commit `style: nouvelle palette Sauge & Cuivre — sortie du tout-rose`

### Phase 2 — Typo refresh (30 min)
- [ ] Remplacer Geist par Inter dans `app/layout.js` (changement d'import + variable CSS)
- [ ] Ajouter Caveat en accent (variable `--font-script`)
- [ ] Vérifier que tous les `font-family` du codebase passent par les variables CSS (pas de `font-family: 'Geist'` hardcodé)
- [ ] Augmenter usage Fraunces sur `h1/h2` dashboard si actuellement Geist
- [ ] Commit `style(typo): Inter en body + Caveat en accent manuscrit`

### Phase 3 — Bento dashboard (3-4h, optionnel)
- [ ] Refonte de `app/(dashboard)/dashboard/DashboardClient.js` en grille bento : 1 grosse cellule (revenu mois) + 4-6 secondaires (prochain cours, élèves actifs, alertes paiement, etc.)
- [ ] Couleurs des tuiles = catégories métier (revenus = vert sauge, alertes = persimmon, agenda = cuivre, etc.)
- [ ] Border-radius 16px+ généreux, padding interne 24px+, gap 12px
- [ ] Déplacer le bouton Assistant IA en sidebar contextuelle (≠ CTA central)

---

## ✅ Critères de validation

Avant de pousser en prod, vérifier :

1. **Test des 6 vocabulaires métier** (yoga, pilates, danse, musique, coaching, arts) — la nouvelle palette doit fonctionner pour TOUS, pas juste les wellness "féminins"
2. **Test contrastes WCAG AA** sur les combos critiques (texte secondary sur bg-alt, badges sur cards hover)
3. **Test sur portail public** `/p/{slug}` — Maude doit pouvoir personnaliser ses photos sans clash avec le brand IziSolo cuivre
4. **Test mobile** — le cuivre doit rester chaud sur écrans OLED Android (pas devenir orange criard)
5. **Smoke test 5 flows clés** : signup, dashboard, créer cours, créer client, message support — aucun élément ne doit "disparaître" parce qu'il était trop dépendant du rose

---

## 🚦 Décision attendue de Colin

Trois options :

**A. GO — Phase 1 d'abord** *(reco : oui)*
Je remplace les couleurs maintenant, on smoke teste, on voit l'effet.
Si tu hais → revert d'1 commit. Si tu aimes → on enchaîne phase 2.

**B. GO complet** — phases 1 + 2 + 3 d'un coup, je livre une PR auto-déployée
en preview Vercel (URL `*-git-...vercel.app`), tu juges sur l'URL.

**C. Discuter d'abord**
Tu trouves le cuivre trop chaud / pas assez froid / autre direction (jewel
tone vert profond ? old-money bordeaux ? mints cliniques ?). Dis-moi.

---

## 🔗 Sources

- [color-bible.md](C:/Users/Colin/Documents/Claude/MeluTek/briefs/guides/color-bible.md) §05 Wellness, §06 Heritage
- [typo-bible.md](C:/Users/Colin/Documents/Claude/MeluTek/briefs/guides/typo-bible.md) §05 Wellness, §workhorses
- [uxui-bible.md](C:/Users/Colin/Documents/Claude/MeluTek/briefs/guides/uxui-bible.md) §02 Bento, §03 AI Copilot, §07 Nav contextuelle
