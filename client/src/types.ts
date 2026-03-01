export interface RecipeEntry {
  item_ankama_id: number
  quantity: number
}

export interface EffectEntry {
  int_minimum: number
  int_maximum: number
  type: { name: string; id: number }
}

export interface EquipmentItem {
  ankama_id: number
  name: string
  level: number
  type: { name: string }
  image_urls: { icon: string }
  recipe?: RecipeEntry[]
  effects?: EffectEntry[]
}

export interface ResourceInfo { name: string }

export interface PriceEntry {
  price: number
  updatedAt: string
}

export type PricesStore = Record<number, PriceEntry>

export interface SearchPreset {
  id: string
  name: string
  lvlmin: number
  lvlmax: number
  metier: string
}

export interface StatBrisage {
  name: string
  min: number
  max: number
  avgVal: number
  hasWeight: boolean
  runesNoFocus: number
  runesFocus: number
}

export type Tab = 'craft' | 'items' | 'brisage'
