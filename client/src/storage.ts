import type { PriceEntry } from './types'

const DAY_MS = 86_400_000

// --- Helpers génériques ---

export function ls<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback }
}

export function lsSet(key: string, v: unknown) {
  localStorage.setItem(key, JSON.stringify(v))
}

// --- Coef de brisage (expiry 1 jour, clés brutes) ---

export function loadBrisageCoef(id: number): number | undefined {
  const dateStr = localStorage.getItem(`brisage_coef_${id}_date`)
  if (!dateStr) return undefined
  if (Date.now() - new Date(dateStr).getTime() > DAY_MS) {
    localStorage.removeItem(`brisage_coef_${id}`)
    localStorage.removeItem(`brisage_coef_${id}_date`)
    return undefined
  }
  const val = localStorage.getItem(`brisage_coef_${id}`)
  return val !== null ? Number(val) : undefined
}

export function saveBrisageCoef(id: number, coef: number) {
  localStorage.setItem(`brisage_coef_${id}`, String(coef))
  localStorage.setItem(`brisage_coef_${id}_date`, new Date().toISOString())
}

export function getBrisageCoefDateStr(id: number): string | null {
  return localStorage.getItem(`brisage_coef_${id}_date`)
}

export function isBrisageCoefStale(id: number): boolean {
  const dateStr = getBrisageCoefDateStr(id)
  if (!dateStr) return false
  return Date.now() - new Date(dateStr).getTime() > DAY_MS
}

// --- Prix des runes (stale = jour calendaire strict) ---

export function getRunePriceEntry(statName: string): PriceEntry | null {
  const val = localStorage.getItem(`rune_prix_${statName}`)
  const dateStr = localStorage.getItem(`rune_prix_${statName}_date`)
  if (val === null || dateStr === null) return null
  return { price: Number(val), updatedAt: dateStr }
}

export function saveRunePrice(statName: string, price: number) {
  localStorage.setItem(`rune_prix_${statName}`, String(price))
  localStorage.setItem(`rune_prix_${statName}_date`, new Date().toISOString())
}

export function isRunePriceStale(updatedAt: string): boolean {
  const updated = new Date(updatedAt)
  const today = new Date()
  updated.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return updated < today
}
