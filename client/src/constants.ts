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

// Poids de la rune Ba (utilisé comme dénominateur : runes = Pdb * taux / poids_rune)
// Uniquement pour les stats où poids_rune ≠ poids_brisage.
// Pour toutes les autres stats, poids_rune = poids_brisage.
export const RUNE_POIDS_OVERRIDE: Record<string, number> = {
  'Vitalité': 1,   // Ba Vita = 5 vita  → poids_rune 1, poids_brisage 0.2
  'Initiative': 1, // Ba Init = 10 init → poids_rune 1, poids_brisage 0.1
  'Pod': 2.5,      // Ba Pod  = 4 pods  → poids_rune 2.5, poids_brisage 0.25
}
