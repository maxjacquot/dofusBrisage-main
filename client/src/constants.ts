export const METIERS: { label: string; value: string; types: string[] }[] = [
  { label: 'Tous les métiers', value: '', types: [] },
  { label: 'Bijoutier', value: 'bijoutier', types: ['amulet', 'ring'] },
  { label: 'Cordonnier', value: 'cordonnier', types: ['boots', 'belt'] },
  { label: 'Forgeron', value: 'forgeron', types: ['hammer', 'sword', 'dagger', 'axe', 'scythe', 'lance'] },
  { label: 'Sculpteur', value: 'sculpteur', types: ['bow', 'wand', 'staff'] },
  { label: 'Tailleur', value: 'tailleur', types: ['cloak', 'hat'] },
]

export const LS_PRICES_KEY = 'dofus-brisage-prices'
export const LS_PRESETS_KEY = 'dofus-brisage-presets'
export const LS_INPROGRESS_KEY = 'dofus-brisage-inprogress'
export const LS_FARMER_KEY = 'dofus-brisage-farmer'
export const STALE_DAYS = 2
export const SEUIL_KAMAS = 1000 // profit minimum pour qu'un brisage soit intéressant

// Poids de brisage par stat (utilisé dans : Pdb = 3 * jet * poids * lvl / 200 + 1)
// Attention : pour certaines stats, ce poids diffère du poids de la rune Ba.
// Ex : 1 rune Ba Vita = 5 vita → poids_brisage = 0.2 (= 1/5)
//      1 rune Ba Init = 10 ini → poids_brisage = 0.1 (= 1/10)
//      1 rune Ba Pod = 4 pods  → poids_brisage = 0.25 (= 1/4)
export const BRISAGE_POIDS: Record<string, number> = {
  // ── Stats de base ──────────────────────────────────────
  'Force': 1,
  'Intelligence': 1,
  'Chance': 1,
  'Agilité': 1,
  'Vitalité': 0.2,
  'Sagesse': 3,
  'Prospection': 3,
  'Puissance': 2,

  // ── Stats spéciales ────────────────────────────────────
  'PA': 100,
  'PM': 90,
  'Portée': 51,
  'Initiative': 0.1,
  'Pod': 0.25,
  'Invocation': 30,

  // ── Combat ─────────────────────────────────────────────
  'Tacle': 4,
  'Fuite': 4,
  'Esquive PA': 7,
  'Esquive PM': 7,
  'Retrait PA': 7,
  'Retrait PM': 7,

  // ── Dommages ───────────────────────────────────────────
  'Dommage': 20,
  'Soin': 10,
  '% Critique': 10,
  'Dommages Renvoyés': 10,
  'Dommage Critiques': 5,
  'Dommage Poussée': 5,

  // ── Dommages élémentaires ──────────────────────────────
  'Dommage Feu': 5,
  'Dommage Eau': 5,
  'Dommage Terre': 5,
  'Dommage Air': 5,
  'Dommage Neutre': 5,
  'dommages Feu': 5,
  'dommages Eau': 5,
  'dommages Terre': 5,
  'dommages Air': 5,
  'dommages Neutre': 5,
  'dommages du meilleur élément': 5,

  // ── Vol élémentaire (lifesteal) ────────────────────────
  'vol Feu': 5,
  'vol Eau': 5,
  'vol Terre': 5,
  'vol Air': 5,
  'vol Neutre': 5,
  'vol du meilleur élément': 5,
  'Vole PM': 7,
  'soins Feu': 10,

  // ── Pièges ─────────────────────────────────────────────
  'Dommage Pièges': 5,
  'Puissance Pièges': 2,

  // ── Résistances fixes ──────────────────────────────────
  'Résistance Neutre': 2,
  'Résistance Feu': 2,
  'Résistance Eau': 2,
  'Résistance Terre': 2,
  'Résistance Air': 2,
  'Résistance Critiques': 2,
  'Résistance Poussée': 2,

  // ── Résistances % élémentaires ─────────────────────────
  '% Résistance Neutre': 6,
  '% Résistance Feu': 6,
  '% Résistance Eau': 6,
  '% Résistance Terre': 6,
  '% Résistance Air': 6,

  // ── Résistances % distance / mêlée ─────────────────────
  '% Résistance distance': 15,
  '% Résistance mêlée': 15,

  // ── % Dommages ─────────────────────────────────────────
  '% Dommages aux sorts': 15,
  "% Dommages d'armes": 15,
  '% Dommages distance': 15,
  '% Dommages mêlée': 15,

  // ── Chasse ─────────────────────────────────────────────
  'Arme de chasse': 5,

  // ── Déplacement de cases ───────────────────────────────
  'Attire de case': 4,
  'Repousse de case': 4,
  'Avance de case': 4,
}

// Nom de la rune Ba correspondant à chaque stat
export const STAT_TO_RUNE_BA: Record<string, string> = {
  'Force': 'Rune Fo',
  'Intelligence': 'Rune Ine',
  'Chance': 'Rune Cha',
  'Agilité': 'Rune Age',
  'Vitalité': 'Rune Vi',
  'Sagesse': 'Rune Sa',
  'Prospection': 'Rune Prospe',
  'Puissance': 'Rune Pui',
  'PA': 'Rune Ga Pa',
  'PM': 'Rune Ga Pme',
  'Portée': 'Rune Po',
  'Initiative': 'Rune Ini',
  'Pod': 'Rune Pod',
  'Invocation': 'Rune Invo',
  'Tacle': 'Rune Tac',
  'Fuite': 'Rune Fui',
  'Esquive PA': 'Rune Ré Pa',
  'Esquive PM': 'Rune Ré Pme',
  'Retrait PA': 'Rune Ret Pa',
  'Retrait PM': 'Rune Ret Pme',
  'Dommage': 'Rune Do',
  'Soin': 'Rune So',
  '% Critique': 'Rune Cri',
  'Dommages Renvoyés': 'Rune Do Ren',
  'Dommage Critiques': 'Rune Do Cri',
  'Dommage Poussée': 'Rune Do Pou',
  'Dommage Feu': 'Rune Do Feu',
  'Dommage Eau': 'Rune Do Eau',
  'Dommage Terre': 'Rune Do Terre',
  'Dommage Air': 'Rune Do Air',
  'Dommage Neutre': 'Rune Do Neutre',
  'dommages Feu': 'Rune Do Feu',
  'dommages Eau': 'Rune Do Eau',
  'dommages Terre': 'Rune Do Terre',
  'dommages Air': 'Rune Do Air',
  'dommages Neutre': 'Rune Do Neutre',
  'Dommage Pièges': 'Rune Do Pi',
  'Puissance Pièges': 'Rune Per Pi',
  'Résistance Neutre': 'Rune Ré Neutre',
  'Résistance Feu': 'Rune Ré Feu',
  'Résistance Eau': 'Rune Ré Eau',
  'Résistance Terre': 'Rune Ré Terre',
  'Résistance Air': 'Rune Ré Air',
  'Résistance Critiques': 'Rune Ré Cri',
  'Résistance Poussée': 'Rune Ré Pou',
  '% Résistance Neutre': 'Rune Ré Per Neutre',
  '% Résistance Feu': 'Rune Ré Per Feu',
  '% Résistance Eau': 'Rune Ré Per Eau',
  '% Résistance Terre': 'Rune Ré Per Terre',
  '% Résistance Air': 'Rune Ré Per Air',
  '% Résistance distance': 'Rune Ré Per Di',
  '% Résistance mêlée': 'Rune Ré Per Mé',
  '% Dommages aux sorts': 'Rune Do Per So',
  "% Dommages d'armes": 'Rune Do Per Ar',
  '% Dommages distance': 'Rune Do Per Di',
  '% Dommages mêlée': 'Rune Do Per Mé',
  'Arme de chasse': 'Rune de chasse',
}

// Poids de la rune Ba (utilisé comme dénominateur : runes = Pdb * taux / poids_rune)
// Uniquement pour les stats où poids_rune ≠ poids_brisage.
// Pour toutes les autres stats, poids_rune = poids_brisage.
export const RUNE_POIDS_OVERRIDE: Record<string, number> = {
  'Vitalité': 1,   // Ba Vita = 5 vita  → poids_rune 1, poids_brisage 0.2
  'Initiative': 1, // Ba Init = 10 init → poids_rune 1, poids_brisage 0.1
  'Pod': 2.5,      // Ba Pod  = 4 pods  → poids_rune 2.5, poids_brisage 0.25
}
