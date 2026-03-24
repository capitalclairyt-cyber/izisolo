# Design Brief — Carte à onglets IziSolo / IziArtisan

## Principe général
Toutes les barres d'onglets de l'app doivent suivre ce pattern visuel :
fond coloré dans les tons du thème de l'utilisateur + lumière blanche animée qui passe de gauche à droite en aller-retour, de façon discrète.

Il existe deux niveaux : onglets principaux (`.tabs-bar`) et sous-onglets (`.subtabs-bar`), légèrement plus discrets.

---

## Variables CSS requises
Ces variables doivent exister dans le thème de l'app (via `:root` et `[data-theme="..."]`) :

```css
--brand        /* couleur principale */
--brand-50     /* très clair, quasi blanc teinté */
--brand-100    /* clair */
--brand-200    /* intermédiaire, pour les bordures */
--brand-600    /* moyen-foncé, pour le texte sous-onglets */
--brand-700    /* foncé, pour le texte des onglets actifs */
--brand-light  /* alias de --brand-100 si besoin */
--radius-lg    /* ex: 12px */
--radius-md    /* ex: 8px */
--bg-card      /* blanc ou très léger */
```

---

## CSS global à ajouter (dans globals.css ou équivalent)

```css
/* ============================================
   Onglets — styles globaux (tabs & subtabs)
   ============================================ */

@keyframes shimmer-tabs {
  0%   { transform: translateX(-150%); }
  50%  { transform: translateX(150%); }
  100% { transform: translateX(-150%); }
}

/* --- Onglets principaux --- */
.tabs-bar {
  display: flex;
  gap: 0;
  padding: 0;
  background: linear-gradient(135deg, var(--brand-100) 0%, var(--brand-light) 60%, var(--brand-50) 100%);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  border: 1.5px solid var(--brand-200);
  border-bottom: none;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  position: relative;
}
.tabs-bar::-webkit-scrollbar { display: none; }
.tabs-bar::after {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 55%; height: 100%;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%);
  animation: shimmer-tabs 5s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
}

.tab-btn {
  flex: 1 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 14px;
  border: none;
  border-bottom: 3px solid transparent;
  background: transparent;
  color: var(--brand-700);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  position: relative;
  z-index: 1;
}
.tab-btn:hover {
  color: var(--brand-700);
  background: rgba(255, 255, 255, 0.45);
}
.tab-btn.active {
  color: var(--brand-700);
  border-bottom-color: var(--brand);
  background: rgba(255, 255, 255, 0.65);
}

/* --- Sous-onglets (légèrement plus discrets) --- */
.subtabs-bar {
  display: flex;
  gap: 0;
  padding: 0;
  background: linear-gradient(135deg, var(--brand-50) 0%, rgba(255,255,255,0.7) 100%);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  border: 1px solid var(--brand-100);
  border-bottom: none;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  position: relative;
}
.subtabs-bar::-webkit-scrollbar { display: none; }
.subtabs-bar::after {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 55%; height: 100%;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%);
  animation: shimmer-tabs 6s ease-in-out infinite; /* légèrement plus lent */
  pointer-events: none;
  z-index: 0;
}

.subtab-btn {
  flex: 1 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 10px 12px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--brand-600);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  position: relative;
  z-index: 1;
}
.subtab-btn:hover {
  color: var(--brand-700);
  background: rgba(255, 255, 255, 0.5);
}
.subtab-btn.active {
  color: var(--brand-700);
  border-bottom-color: var(--brand);
  background: var(--bg-card);
}
```

---

## HTML / JSX — Usage

### Onglets principaux
```jsx
<div className="tabs-bar">
  <button className={`tab-btn ${activeTab === 'tab1' ? 'active' : ''}`} onClick={() => setActiveTab('tab1')}>
    <IconeA size={16} /> Libellé A
  </button>
  <button className={`tab-btn ${activeTab === 'tab2' ? 'active' : ''}`} onClick={() => setActiveTab('tab2')}>
    <IconeB size={16} /> Libellé B
  </button>
</div>

{/* Le contenu s'enchaîne directement sous la barre — pas de border-top */}
<div className="tab-content">
  ...
</div>
```

### Sous-onglets
```jsx
<div className="subtabs-bar">
  <button className={`subtab-btn ${subTab === 'a' ? 'active' : ''}`} onClick={() => setSubTab('a')}>
    Sous-section A
  </button>
  <button className={`subtab-btn ${subTab === 'b' ? 'active' : ''}`} onClick={() => setSubTab('b')}>
    Sous-section B
  </button>
</div>
<div className="subtab-content">
  ...
</div>
```

---

## Règles d'usage

- `.tabs-bar` + `.tab-btn` → navigation principale de page (ex: Profil / Réglages / Notifications)
- `.subtabs-bar` + `.subtab-btn` → navigation secondaire à l'intérieur d'une section (ex: Apparences / Général)
- Le contenu qui suit doit avoir `border-top: none` pour s'enchaîner visuellement sans coupure
- Sur mobile : le scroll horizontal est activé, la scrollbar masquée, les boutons ne se compriment pas (`flex: 1 0 auto` + `white-space: nowrap`)
- L'animation shimmer tourne en permanence, 5s pour les principaux, 6s pour les sous-onglets

---

## Couleur du bandeau mobile (status bar)

Mettre à jour dynamiquement `<meta name="theme-color">` avec la couleur `--brand` du thème actif :

```js
// Dans le layout client, au chargement du profil :
const BRAND_HEX = {
  rose:    '#d4a0a0',
  ocean:   '#7aa0c4',
  foret:   '#7ab07a',
  soleil:  '#d4b06a',
  lavande: '#a890c4',
  terre:   '#c4956a',
};

const hex = BRAND_HEX[profile.ui_couleur] || BRAND_HEX.rose;
let metaTheme = document.querySelector('meta[name="theme-color"]');
if (!metaTheme) {
  metaTheme = document.createElement('meta');
  metaTheme.name = 'theme-color';
  document.head.appendChild(metaTheme);
}
metaTheme.content = hex;
```
