import { BRISAGE_POIDS, RUNE_POIDS_OVERRIDE, STALE_DAYS } from './constants'
import type { EquipmentItem, StatBrisage } from './types'

export function isStale(updatedAt: string): boolean {
  return Date.now() - new Date(updatedAt).getTime() > STALE_DAYS * 86_400_000
}

export function formatDate(updatedAt: string): string {
  const days = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000)
  if (days === 0) return "aujourd'hui"
  if (days === 1) return 'il y a 1 jour'
  return `il y a ${days} jours`
}

export function formatKamas(n: number): string {
  return Math.floor(n).toLocaleString('fr-FR') + ' k'
}

// Formule officielle Dofus 3 :
//   Pdb  = 3 * jet * poids_brisage * lvl / 200 + 1
//   Sans focus  → runes Ba = Pdb * taux / poids_rune
//   Avec focus  → Pdb_focus = Pdb_k + (PdbTotal − Pdb_k) / 2
//               → runes Ba  = Pdb_focus * taux / poids_rune_k
export function computeStatBrisage(item: EquipmentItem, coef: number): StatBrisage[] {
  const niveau = item.level
  const taux = coef / 100
  const effects = (item.effects ?? []).filter(e => (e.int_minimum + e.int_maximum) / 2 > 0)

  const rows = effects.map(eff => {
    const min = Math.min(eff.int_minimum, eff.int_maximum)
    const max = Math.max(eff.int_minimum, eff.int_maximum)
    const avgVal = (min + max) / 2
    const brisagePoids = BRISAGE_POIDS[eff.type.name]
    const hasWeight = brisagePoids !== undefined
    const runePoids = RUNE_POIDS_OVERRIDE[eff.type.name] ?? brisagePoids ?? 1
    const pdb = hasWeight ? 3 * avgVal * brisagePoids * niveau / 200 + 1 : 0
    return { name: eff.type.name, min, max, avgVal, hasWeight, pdb, runePoids }
  })

  const pdbTotal = rows.reduce((s, r) => s + r.pdb, 0)

  return rows.map(r => {
    const runesNoFocus = r.hasWeight ? r.pdb * taux / r.runePoids : 0
    const pdbFocus = r.pdb + (pdbTotal - r.pdb) / 2
    const runesFocus = r.hasWeight ? pdbFocus * taux / r.runePoids : 0
    return { name: r.name, min: r.min, max: r.max, avgVal: r.avgVal, hasWeight: r.hasWeight, runesNoFocus, runesFocus }
  })
}
