# Changelog — Dofus 3 Toolkit

Toutes les modifications notables sont documentées ici.
Format : `✨ Nouveauté` · `🐛 Correction` · `🔧 Amélioration`

---

## [1.2.0] — 2026-03-01

### Onglet Brisage
- ✨ Classement basé sur la valeur des runes générées : **Runes Ba × prix rune Ba** saisi
- ✨ Champ "Prix Rune Ba (kamas)" pour calculer les revenus de brisage estimés
- ✨ Filtre par type d'item (Bijoux, Armes, Coiffe…) utilisant les données DofusDude réelles
- ✨ Fusion Amulettes + Anneaux → option **Bijoux** dans le filtre de type
- 🔧 Colonnes renommées : **Runes Ba** (quantité estimée) et **Revenus runes** (valeur kamas)

### Corrections calcul brisage
- 🐛 Noms de stats corrigés dans STAT_PA / POIDS pour correspondre à l'API DofusDude :
  - `Dommage` (et non `Dommages`), `Soin` (et non `Soins`), `Invocation`, `% Critique`…
- 🐛 Lecture de `is_meta` corrigée : `ef.type?.is_meta` (et non `ef.is_meta`)

### Export brisage
- 🔧 Sauvegarde `{pa, type, level}` par item (au lieu du seul `pa`) pour filtrage précis
- 🔧 Requêtes séquentielles avec délai 90 ms + retry (backoff ×4) anti-429

### Général
- 🔧 Unités clarifiées partout : `kamas` (au lieu de `ka` / `Mk`)
- 🔧 `Coeff. PA` renommé en **Coefficient de brisage**
- 🔧 Système de versioning (`VERSION` constant) et changelog (modal in-app + ce fichier)

---

## [1.1.0] — 2026-02-15

- ✨ Onglet Brisage : classement des items par coefficient de brisage
- ✨ Script export brisage avec pagination DofusDude (41 pages × 100 items)
- ✨ Données enrichies : type et niveau stockés avec le coefficient dans localStorage
- 🔧 Poids de rune dans STAT_PA calés sur les vraies valeurs du jeu

---

## [1.0.0] — 2026-02-01

- 🚀 Version initiale : Craft, FM/Brisage, Stocks, Stuff, Stats Méta
- ✨ Classement craft → vente avec budget et tri ROI / marge / coût
- ✨ Intégration DofusDude API et prix Imagiro (HDV)
- ✨ Calcul coefficient de brisage et estimation des runes Ba
- ✨ Simulateur FM (Forgemagie) avec probabilités par statistique
