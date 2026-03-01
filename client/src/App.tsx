import { useState } from 'react'
import './App.css'

const METIERS: { label: string; value: string; types: string[] }[] = [
  { label: 'Tous les métiers', value: '', types: [] },
  { label: 'Bijoutier', value: 'bijoutier', types: ['amulet', 'ring'] },
  { label: 'Cordonnier', value: 'cordonnier', types: ['boots', 'belt'] },
  { label: 'Forgeron', value: 'forgeron', types: ['hammer', 'sword', 'dagger', 'axe', 'scythe', 'lance'] },
  { label: 'Sculpteur', value: 'sculpteur', types: ['bow', 'wand', 'staff'] },
  { label: 'Tailleur', value: 'tailleur', types: ['cloak', 'hat'] },
]

const LS_PRICES_KEY = 'dofus-brisage-prices'
const LS_PRESETS_KEY = 'dofus-brisage-presets'
const LS_INPROGRESS_KEY = 'dofus-brisage-inprogress'
const STALE_DAYS = 2
const SEUIL_KAMAS = 1000 // profit minimum pour qu'un brisage soit intéressant

// Poids de brisage par stat (utilisé dans : Pdb = 3 * jet * poids * lvl / 200 + 1)
// Attention : pour certaines stats, ce poids diffère du poids de la rune Ba.
// Ex : 1 rune Ba Vita = 5 vita → poids_brisage = 0.2 (= 1/5)
//      1 rune Ba Init = 10 ini → poids_brisage = 0.1 (= 1/10)
//      1 rune Ba Pod = 4 pods → poids_brisage = 0.25 (= 1/4)
const BRISAGE_POIDS: Record<string, number> = {
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
const RUNE_POIDS_OVERRIDE: Record<string, number> = {
  'Vitalité': 1,   // Ba Vita = 5 vita  → poids_rune 1, poids_brisage 0.2
  'Initiative': 1, // Ba Init = 10 init → poids_rune 1, poids_brisage 0.1
  'Pod': 2.5,      // Ba Pod  = 4 pods  → poids_rune 2.5, poids_brisage 0.25
}

// --- Types ---

interface RecipeEntry {
  item_ankama_id: number
  quantity: number
}

interface EffectEntry {
  int_minimum: number
  int_maximum: number
  type: { name: string; id: number }
}

interface EquipmentItem {
  ankama_id: number
  name: string
  level: number
  type: { name: string }
  image_urls: { icon: string }
  recipe?: RecipeEntry[]
  effects?: EffectEntry[]
}

interface ResourceInfo { name: string }

interface PriceEntry {
  price: number
  updatedAt: string
}

type PricesStore = Record<number, PriceEntry>

interface SearchPreset {
  id: string
  name: string
  lvlmin: number
  lvlmax: number
  metier: string
}

type Tab = 'craft' | 'items' | 'brisage'

// --- LocalStorage helpers ---

function ls<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback }
}
function lsSet(key: string, v: unknown) { localStorage.setItem(key, JSON.stringify(v)) }

// Brisage coef : expiry 1 jour, clés brutes (pas JSON)
function loadBrisageCoef(id: number): number | undefined {
  const dateStr = localStorage.getItem(`brisage_coef_${id}_date`)
  if (!dateStr) return undefined
  if (Date.now() - new Date(dateStr).getTime() > 86_400_000) {
    localStorage.removeItem(`brisage_coef_${id}`)
    localStorage.removeItem(`brisage_coef_${id}_date`)
    return undefined
  }
  const val = localStorage.getItem(`brisage_coef_${id}`)
  return val !== null ? Number(val) : undefined
}

function saveBrisageCoef(id: number, coef: number) {
  localStorage.setItem(`brisage_coef_${id}`, String(coef))
  localStorage.setItem(`brisage_coef_${id}_date`, new Date().toISOString())
}

function getBrisageCoefDateStr(id: number): string | null {
  return localStorage.getItem(`brisage_coef_${id}_date`)
}

function isBrisageCoefStale(id: number): boolean {
  const dateStr = getBrisageCoefDateStr(id)
  if (!dateStr) return false
  return Date.now() - new Date(dateStr).getTime() > 86_400_000
}

// --- Rune prices (localStorage, stale = jour calendaire strict) ---

function getRunePriceEntry(statName: string): PriceEntry | null {
  const val = localStorage.getItem(`rune_prix_${statName}`)
  const dateStr = localStorage.getItem(`rune_prix_${statName}_date`)
  if (val === null || dateStr === null) return null
  return { price: Number(val), updatedAt: dateStr }
}

function saveRunePrice(statName: string, price: number) {
  localStorage.setItem(`rune_prix_${statName}`, String(price))
  localStorage.setItem(`rune_prix_${statName}_date`, new Date().toISOString())
}

function isRunePriceStale(updatedAt: string): boolean {
  const updated = new Date(updatedAt)
  const today = new Date()
  updated.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return updated < today
}

// --- Helpers ---

function isStale(updatedAt: string) {
  return Date.now() - new Date(updatedAt).getTime() > STALE_DAYS * 86_400_000
}

function formatDate(updatedAt: string) {
  const days = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000)
  if (days === 0) return "aujourd'hui"
  if (days === 1) return 'il y a 1 jour'
  return `il y a ${days} jours`
}

function formatKamas(n: number) { return Math.floor(n).toLocaleString('fr-FR') + ' k' }


// --- Calcul de brisage ---

interface StatBrisage {
  name: string
  min: number
  max: number
  avgVal: number
  hasWeight: boolean
  runesNoFocus: number
  runesFocus: number
}

// Formule officielle Dofus 3 :
//   Pdb  = 3 * jet * poids_brisage * lvl / 200 + 1
//   Sans focus  → runes Ba = Pdb * taux / poids_rune
//   Avec focus  → Pdb_focus = Pdb_k + (PdbTotal − Pdb_k) / 2
//               → runes Ba  = Pdb_focus * taux / poids_rune_k
function computeStatBrisage(item: EquipmentItem, coef: number): StatBrisage[] {
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

// --- App ---

function App() {
  const [tab, setTab] = useState<Tab>('craft')

  const [lvlmin, setLvlmin] = useState(1)
  const [lvlmax, setLvlmax] = useState(200)
  const [metier, setMetier] = useState('')

  const [items, setItems] = useState<EquipmentItem[]>([])
  const [resources, setResources] = useState<Record<number, ResourceInfo>>({})
  const [resourcePrices, setResourcePrices] = useState<PricesStore>(() => ls(LS_PRICES_KEY, {}))
  const [presets, setPresets] = useState<SearchPreset[]>(() => ls(LS_PRESETS_KEY, []))
  const [brisageCoefs, setBrisageCoefs] = useState<Record<number, number>>({})
  const [runePrices, setRunePrices] = useState<Record<string, PriceEntry>>({})
  const [farmedResources, setFarmedResources] = useState<Set<number>>(new Set())

  const [loading, setLoading] = useState(false)
  const [loadingResources, setLoadingResources] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [presetName, setPresetName] = useState('')

  const [modalItemId, setModalItemId] = useState<number | null>(null)
  const [modalBrisageInput, setModalBrisageInput] = useState('')

  const [sortBy, setSortBy] = useState<'level' | 'cost'>('level')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [nameFilter, setNameFilter] = useState('')
  const [inProgressItems, setInProgressItems] = useState<Set<number>>(
    () => new Set(ls<number[]>(LS_INPROGRESS_KEY, []))
  )

  // --- Recherche ---

  async function handleSearch() {
    setLoading(true)
    setError('')
    setItems([])
    setResources({})
    setSearched(true)
    setNameFilter('')

    try {
      const params = new URLSearchParams()
      params.set('lvlmin', String(lvlmin))
      params.set('lvlmax', String(lvlmax))
      const metierObj = METIERS.find(m => m.value === metier)
      const types = metierObj?.types ?? []
      if (types.length > 0) params.set('itemTypes', types.join(','))

      const res = await fetch(`http://localhost:3001/api/equipment?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')

      const fetchedItems: EquipmentItem[] = data.items ?? []
      setItems(fetchedItems)

      // Charger les coefs de brisage (expiry 1 jour géré dans loadBrisageCoef)
      const coefs: Record<number, number> = {}
      for (const item of fetchedItems) {
        const coef = loadBrisageCoef(item.ankama_id)
        if (coef !== undefined) coefs[item.ankama_id] = coef
      }
      setBrisageCoefs(coefs)

      const allIds = [...new Set(fetchedItems.flatMap(i => (i.recipe ?? []).map(r => r.item_ankama_id)))]
      if (allIds.length > 0) {
        setLoadingResources(true)
        try {
          const r = await fetch(`http://localhost:3001/api/resources/batch?ids=${allIds.join(',')}`)
          setResources(await r.json())
        } finally {
          setLoadingResources(false)
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  // --- Prix ressources (onglet Craft) ---

  function setResourcePrice(id: number, value: string) {
    const updated = { ...resourcePrices, [id]: { price: value === '' ? 0 : Number(value), updatedAt: new Date().toISOString() } }
    setResourcePrices(updated)
    lsSet(LS_PRICES_KEY, updated)
  }

  function craftTotal(item: EquipmentItem) {
    return (item.recipe ?? []).reduce((s, r) => s + (resourcePrices[r.item_ankama_id]?.price ?? 0) * r.quantity, 0)
  }

  // --- Coef brisage ---

  function setBrisageCoef(id: number, value: string) {
    const coef = value === '' ? 0 : Number(value)
    setBrisageCoefs(prev => ({ ...prev, [id]: coef }))
    saveBrisageCoef(id, coef)
  }

  // --- Modal brisage ---

  function openModal(item: EquipmentItem) {
    setModalItemId(item.ankama_id)
    setModalBrisageInput(String(brisageCoefs[item.ankama_id] ?? ''))
    setFarmedResources(new Set())
    // Précharger les prix de runes depuis localStorage pour les stats de cet item
    const prices: Record<string, PriceEntry> = {}
    for (const eff of item.effects ?? []) {
      const entry = getRunePriceEntry(eff.type.name)
      if (entry) prices[eff.type.name] = entry
    }
    setRunePrices(prev => ({ ...prev, ...prices }))
  }

  // --- Clipboard ---

  function copyName(name: string, id: number) {
    navigator.clipboard.writeText(name)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  // --- Brisage en cours ---

  function toggleInProgress(id: number) {
    setInProgressItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      lsSet(LS_INPROGRESS_KEY, [...next])
      return next
    })
  }

  function resetInProgress() {
    setInProgressItems(new Set())
    lsSet(LS_INPROGRESS_KEY, [])
  }

  // --- Presets ---

  function savePreset() {
    if (!presetName.trim()) return
    const updated = [...presets, { id: Date.now().toString(), name: presetName.trim(), lvlmin, lvlmax, metier }]
    setPresets(updated)
    lsSet(LS_PRESETS_KEY, updated)
    setPresetName('')
    setShowSaveInput(false)
  }

  function deletePreset(id: string) {
    const updated = presets.filter(p => p.id !== id)
    setPresets(updated)
    lsSet(LS_PRESETS_KEY, updated)
  }

  function applyPreset(p: SearchPreset) {
    setLvlmin(p.lvlmin)
    setLvlmax(p.lvlmax)
    setMetier(p.metier)
  }

  const itemsWithRecipe = items.filter(i => (i.recipe ?? []).length > 0)

  // Ressources uniques triées par nom
  const uniqueResources = [
    ...new Map(
      itemsWithRecipe
        .flatMap(i => i.recipe ?? [])
        .map(r => [r.item_ankama_id, r.item_ankama_id])
    ).keys()
  ].sort((a, b) => {
    const na = resources[a]?.name ?? ''
    const nb = resources[b]?.name ?? ''
    return na.localeCompare(nb, 'fr')
  })

  function toggleSort(col: 'level' | 'cost') {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const normalizedFilter = nameFilter.trim().toLowerCase()

  const sortedItems = [...itemsWithRecipe]
    .filter(i => !normalizedFilter || i.name.toLowerCase().includes(normalizedFilter))
    .sort((a, b) => {
      const valA = sortBy === 'level' ? a.level : craftTotal(a)
      const valB = sortBy === 'level' ? b.level : craftTotal(b)
      return sortDir === 'asc' ? valA - valB : valB - valA
    })

  const filteredResources = uniqueResources.filter(id =>
    !normalizedFilter || (resources[id]?.name ?? '').toLowerCase().includes(normalizedFilter)
  )

  const inProgressList = itemsWithRecipe.filter(i => inProgressItems.has(i.ankama_id))

  return (
    <div className="app">
      <h1 className="title">Dofus Brisage</h1>
      <p className="subtitle">Calculateur de prix de craft</p>

      {/* Favoris */}
      {presets.length > 0 && (
        <div className="presets-row">
          <span className="presets-label">Favoris :</span>
          {presets.map(p => (
            <div key={p.id} className="preset-chip">
              <button className="preset-load" onClick={() => applyPreset(p)}>{p.name}</button>
              <button className="preset-delete" onClick={() => deletePreset(p.id)}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Filtres */}
      <div className="filters">
        <div className="filter-group">
          <label>Niveau min</label>
          <input type="number" min={1} max={200} value={lvlmin} onChange={e => setLvlmin(Number(e.target.value))} />
        </div>
        <div className="filter-group">
          <label>Niveau max</label>
          <input type="number" min={1} max={200} value={lvlmax} onChange={e => setLvlmax(Number(e.target.value))} />
        </div>
        <div className="filter-group">
          <label>Métier</label>
          <select value={metier} onChange={e => setMetier(e.target.value)}>
            {METIERS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <button className="search-btn" onClick={handleSearch} disabled={loading}>
          {loading ? 'Chargement…' : 'Rechercher'}
        </button>
        {showSaveInput ? (
          <div className="save-input-row">
            <input
              className="save-input"
              type="text"
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') savePreset(); if (e.key === 'Escape') setShowSaveInput(false) }}
              placeholder="Nom du favori…"
              autoFocus
            />
            <button className="save-confirm-btn" onClick={savePreset}>OK</button>
            <button className="save-cancel-btn" onClick={() => setShowSaveInput(false)}>✕</button>
          </div>
        ) : (
          <button className="save-search-btn" onClick={() => setShowSaveInput(true)}>★ Sauvegarder</button>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {loadingResources && <p className="loading-res">Chargement des ressources…</p>}

      {/* Onglets */}
      {searched && !loading && items.length > 0 && (
        <>
          <div className="tabs">
            <button className={`tab${tab === 'craft' ? ' tab--active' : ''}`} onClick={() => setTab('craft')}>
              Calculateur craft
              {itemsWithRecipe.length > 0 && <span className="tab-count">{itemsWithRecipe.length}</span>}
            </button>
            <button className={`tab${tab === 'items' ? ' tab--active' : ''}`} onClick={() => setTab('items')}>
              Prix des ressources
              {uniqueResources.length > 0 && <span className="tab-count">{uniqueResources.length}</span>}
            </button>
            <button className={`tab${tab === 'brisage' ? ' tab--active' : ''}`} onClick={() => setTab('brisage')}>
              Brisage en cours
              {inProgressList.length > 0 && <span className="tab-count tab-count--green">{inProgressList.length}</span>}
            </button>
          </div>

          {/* Filtre par nom */}
          <div className="name-filter-row">
            <input
              className="name-filter-input"
              type="text"
              value={nameFilter}
              onChange={e => setNameFilter(e.target.value)}
              placeholder="Filtrer par nom…"
            />
            {nameFilter && (
              <button className="name-filter-clear" onClick={() => setNameFilter('')}>✕</button>
            )}
          </div>

          {/* --- Onglet Craft --- */}
          {tab === 'craft' && (
            itemsWithRecipe.length === 0
              ? <p className="empty">Aucun équipement avec recette trouvé.</p>
              : (
                <div className="items-list">
                  <div className="list-header">
                    <button className={`sort-btn${sortBy === 'level' ? ' sort-btn--active' : ''}`} onClick={() => toggleSort('level')}>
                      Item {sortBy === 'level' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                    </button>
                    <span>Ressources nécessaires</span>
                    <button className={`sort-btn sort-btn--right${sortBy === 'cost' ? ' sort-btn--active' : ''}`} onClick={() => toggleSort('cost')}>
                      Prix craft {sortBy === 'cost' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                    </button>
                    <span>Coef. brisage</span>
                  </div>
                  {sortedItems.map(item => {
                    const total = craftTotal(item)
                    const copied = copiedId === item.ankama_id
                    const inProg = inProgressItems.has(item.ankama_id)
                    return (
                      <div key={item.ankama_id} className={`item-row${inProg ? ' item-row--inprogress' : ''}`}>
                        <div className="col-name">
                          <button
                            className={`inprogress-btn${inProg ? ' inprogress-btn--active' : ''}`}
                            onClick={() => toggleInProgress(item.ankama_id)}
                            title={inProg ? 'Retirer du brisage en cours' : 'Marquer en brisage en cours'}
                          >✓</button>
                          <img className="item-icon" src={item.image_urls.icon} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          <div className="item-info">
                            <span
                              className={`item-name${copied ? ' item-name--copied' : ''}`}
                              onClick={() => copyName(item.name, item.ankama_id)}
                              title="Cliquer pour copier"
                            >
                              {copied ? '✓ Copié !' : item.name}
                            </span>
                            <span className="item-meta">{item.type.name} · Niv. {item.level}</span>
                          </div>
                        </div>
                        <div className="col-recipe">
                          {(item.recipe ?? []).map(r => {
                            const entry = resourcePrices[r.item_ankama_id]
                            const stale = entry ? isStale(entry.updatedAt) : false
                            return (
                              <div key={r.item_ankama_id} className={`ingredient${stale ? ' ingredient--stale' : ''}`}>
                                <span className="ingredient-label">
                                  <span
                                    className={`copyable${copiedId === r.item_ankama_id ? ' copyable--copied' : ''}`}
                                    onClick={() => copyName(resources[r.item_ankama_id]?.name ?? `#${r.item_ankama_id}`, r.item_ankama_id)}
                                    title="Cliquer pour copier"
                                  >
                                    {copiedId === r.item_ankama_id ? '✓ Copié !' : (resources[r.item_ankama_id]?.name ?? `#${r.item_ankama_id}`)}
                                  </span>
                                  <span className="ingredient-qty"> ×{r.quantity}</span>
                                </span>
                                <input
                                  className="price-input"
                                  type="number"
                                  min={0}
                                  value={entry?.price ?? ''}
                                  onChange={e => setResourcePrice(r.item_ankama_id, e.target.value)}
                                  placeholder="Prix unit."
                                />
                                {entry && (
                                  <span className={`price-date${stale ? ' price-date--stale' : ''}`}>
                                    {stale && '⚠ '}Mis à jour {formatDate(entry.updatedAt)}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        <div className="col-total">
                          <span className={total > 0 ? 'total-value' : 'total-empty'}>
                            {total > 0 ? formatKamas(total) : '—'}
                          </span>
                        </div>
                        <div className="col-brisage">
                          <div className="col-brisage-row">
                            <input
                              className="brisage-input"
                              type="number"
                              min={0}
                              max={100}
                              value={brisageCoefs[item.ankama_id] ?? ''}
                              onChange={e => setBrisageCoef(item.ankama_id, e.target.value)}
                              placeholder="0"
                            />
                            <span className="brisage-unit">%</span>
                          </div>
                          <button className="calc-brisage-btn" onClick={() => openModal(item)}>
                            Calculer le brisage
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
          )}

          {/* --- Onglet Ressources --- */}
          {tab === 'items' && (
            filteredResources.length === 0
              ? <p className="empty">{uniqueResources.length === 0 ? 'Aucune ressource trouvée.' : 'Aucun résultat pour ce filtre.'}</p>
              : (
                <div className="items-list">
                  <div className="list-header list-header--items">
                    <span>Ressource</span>
                    <span>Prix unitaire</span>
                  </div>
                  {filteredResources.map(id => {
                    const name = resources[id]?.name ?? `#${id}`
                    const entry = resourcePrices[id]
                    const stale = entry ? isStale(entry.updatedAt) : false
                    const copied = copiedId === id
                    return (
                      <div key={id} className="item-row item-row--simple">
                        <div className="col-name">
                          <span
                            className={`item-name${copied ? ' item-name--copied' : ''}`}
                            onClick={() => copyName(name, id)}
                            title="Cliquer pour copier"
                          >
                            {copied ? '✓ Copié !' : name}
                          </span>
                        </div>
                        <div className="col-item-price">
                          <input
                            className="price-input"
                            type="number"
                            min={0}
                            value={entry?.price ?? ''}
                            onChange={e => setResourcePrice(id, e.target.value)}
                            placeholder="Prix unit."
                          />
                          {entry && (
                            <span className={`price-date${stale ? ' price-date--stale' : ''}`}>
                              {stale && '⚠ '}Mis à jour {formatDate(entry.updatedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
          )}

          {/* --- Onglet Brisage en cours --- */}
          {tab === 'brisage' && (
            inProgressList.length === 0
              ? <p className="empty">Aucun item en cours de brisage.</p>
              : (
                <div className="items-list">
                  <div className="inprogress-list-header">
                    <div className="list-header">
                      <span>Item</span>
                      <span>Ressources nécessaires</span>
                      <span>Prix craft</span>
                      <span>Coef. brisage</span>
                    </div>
                    <button className="reset-inprogress-btn" onClick={resetInProgress}>Tout retirer</button>
                  </div>
                  {inProgressList.map(item => {
                    const total = craftTotal(item)
                    const copied = copiedId === item.ankama_id
                    return (
                      <div key={item.ankama_id} className="item-row item-row--inprogress">
                        <div className="col-name">
                          <button
                            className="inprogress-btn inprogress-btn--active"
                            onClick={() => toggleInProgress(item.ankama_id)}
                            title="Retirer du brisage en cours"
                          >✓</button>
                          <img className="item-icon" src={item.image_urls.icon} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          <div className="item-info">
                            <span
                              className={`item-name${copied ? ' item-name--copied' : ''}`}
                              onClick={() => copyName(item.name, item.ankama_id)}
                              title="Cliquer pour copier"
                            >
                              {copied ? '✓ Copié !' : item.name}
                            </span>
                            <span className="item-meta">{item.type.name} · Niv. {item.level}</span>
                          </div>
                        </div>
                        <div className="col-recipe">
                          {(item.recipe ?? []).map(r => {
                            const entry = resourcePrices[r.item_ankama_id]
                            const stale = entry ? isStale(entry.updatedAt) : false
                            return (
                              <div key={r.item_ankama_id} className={`ingredient${stale ? ' ingredient--stale' : ''}`}>
                                <span className="ingredient-label">
                                  <span
                                    className={`copyable${copiedId === r.item_ankama_id ? ' copyable--copied' : ''}`}
                                    onClick={() => copyName(resources[r.item_ankama_id]?.name ?? `#${r.item_ankama_id}`, r.item_ankama_id)}
                                    title="Cliquer pour copier"
                                  >
                                    {copiedId === r.item_ankama_id ? '✓ Copié !' : (resources[r.item_ankama_id]?.name ?? `#${r.item_ankama_id}`)}
                                  </span>
                                  <span className="ingredient-qty"> ×{r.quantity}</span>
                                </span>
                                <input
                                  className="price-input"
                                  type="number"
                                  min={0}
                                  value={entry?.price ?? ''}
                                  onChange={e => setResourcePrice(r.item_ankama_id, e.target.value)}
                                  placeholder="Prix unit."
                                />
                                {entry && (
                                  <span className={`price-date${stale ? ' price-date--stale' : ''}`}>
                                    {stale && '⚠ '}Mis à jour {formatDate(entry.updatedAt)}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        <div className="col-total">
                          <span className={total > 0 ? 'total-value' : 'total-empty'}>
                            {total > 0 ? formatKamas(total) : '—'}
                          </span>
                        </div>
                        <div className="col-brisage">
                          <div className="col-brisage-row">
                            <input
                              className="brisage-input"
                              type="number"
                              min={0}
                              max={100}
                              value={brisageCoefs[item.ankama_id] ?? ''}
                              onChange={e => setBrisageCoef(item.ankama_id, e.target.value)}
                              placeholder="0"
                            />
                            <span className="brisage-unit">%</span>
                          </div>
                          <button className="calc-brisage-btn" onClick={() => openModal(item)}>
                            Calculer le brisage
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
          )}
        </>
      )}

      {!loading && searched && items.length === 0 && !error && (
        <p className="empty">Aucun équipement trouvé.</p>
      )}

      {/* --- Modale brisage --- */}
      {modalItemId !== null && (() => {
        const item = items.find(i => i.ankama_id === modalItemId)
        if (!item) return null

        // Total craft en excluant les ressources farmées
        const total = (item.recipe ?? []).reduce((s, r) => {
          if (farmedResources.has(r.item_ankama_id)) return s
          return s + (resourcePrices[r.item_ankama_id]?.price ?? 0) * r.quantity
        }, 0)

        const coefStale = isBrisageCoefStale(modalItemId)
        const coefDateStr = getBrisageCoefDateStr(modalItemId)
        const coef = brisageCoefs[modalItemId] ?? 0
        const stats = computeStatBrisage(item, coef)

        const totalNoFocus = stats.reduce((s, d) => s + d.runesNoFocus * (runePrices[d.name]?.price ?? 0), 0)

        const allOptions: Array<{ label: string; key: string; value: number }> = [
          { label: 'Sans focus', key: '__no_focus', value: totalNoFocus },
          ...stats
            .filter(d => d.hasWeight)
            .map(d => ({
              label: d.name,
              key: d.name,
              value: d.runesFocus * (runePrices[d.name]?.price ?? 0),
            })),
        ].filter(o => o.value > 0)

        const bestOption = allOptions.length > 0
          ? allOptions.reduce((best, curr) => curr.value > best.value ? curr : best)
          : null
        const diff = bestOption !== null ? bestOption.value - total : null


        // Coef min pour couvrir le coût de craft (break-even) : valeur(coef) linéaire → coef_seuil = total * coef / bestValue
        // "Jamais rentable" = même à 100% de coef, le brisage ne couvre pas le craft.
        // On n'utilise pas SEUIL_KAMAS ici (déjà utilisé pour la couleur du résultat).
        let coefSeuil: number | null = null
        let coefSeuilImpossible = false
        if (bestOption !== null && bestOption.value > 0 && coef > 0 && total > 0) {
          const raw = total * coef / bestOption.value
          if (raw <= 100) coefSeuil = raw
          else coefSeuilImpossible = true
        }

        return (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <div className="modal-title-row">
                  <img className="modal-item-icon" src={item.image_urls.icon} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  <span
                    className={`modal-title copyable${copiedId === item.ankama_id ? ' copyable--copied' : ''}`}
                    onClick={() => copyName(item.name, item.ankama_id)}
                    title="Cliquer pour copier"
                  >
                    {copiedId === item.ankama_id ? '✓ Copié !' : item.name}
                  </span>
                </div>
                <button className="modal-close" onClick={() => setModalItemId(null)}>✕</button>
              </div>
              <div className="modal-body">

                {/* Ressources avec toggle farm */}
                {(item.recipe ?? []).length > 0 && (
                  <div className="modal-ingredients">
                    <div className="modal-ing-title">
                    <span>Ressources du craft</span>
                    <span className="modal-ing-col-header">Prix unit.</span>
                    <span className="modal-ing-col-header">Valeur totale</span>
                    <span></span>
                  </div>
                    {(item.recipe ?? []).map(r => {
                      const name = resources[r.item_ankama_id]?.name ?? `#${r.item_ankama_id}`
                      const unitPrice = resourcePrices[r.item_ankama_id]?.price ?? 0
                      const linePrice = unitPrice * r.quantity
                      const isFarmed = farmedResources.has(r.item_ankama_id)
                      return (
                        <div key={r.item_ankama_id} className={`modal-ing-row${isFarmed ? ' modal-ing-row--farmed' : ''}`}>
                          <span className="modal-ing-name">
                            <span
                              className={`copyable${copiedId === r.item_ankama_id ? ' copyable--copied' : ''}`}
                              onClick={() => copyName(name, r.item_ankama_id)}
                              title="Cliquer pour copier"
                            >
                              {copiedId === r.item_ankama_id ? '✓ Copié !' : name}
                            </span>
                            {' '}<span className="ingredient-qty">×{r.quantity}</span>
                          </span>
                          <span className="modal-ing-unit-price">
                            {unitPrice > 0 ? formatKamas(unitPrice) : '—'}
                          </span>
                          <span className="modal-ing-price">
                            {linePrice > 0 ? formatKamas(linePrice) : '—'}
                          </span>
                          <button
                            className={`farm-btn${isFarmed ? ' farm-btn--active' : ''}`}
                            onClick={() => setFarmedResources(prev => {
                              const next = new Set(prev)
                              if (next.has(r.item_ankama_id)) next.delete(r.item_ankama_id)
                              else next.add(r.item_ankama_id)
                              return next
                            })}
                          >
                            {isFarmed ? '✓ Farmée' : 'Je farm'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Prix de craft + coef + résultat */}
                <div className="modal-top-row">
                  <div className="modal-field">
                    <span className="modal-label">Prix de craft</span>
                    <span className="modal-value">{total > 0 ? formatKamas(total) : '—'}</span>
                    {coefSeuil !== null && (
                      <span className="modal-seuil">Coef min rentable : <strong>{Math.ceil(coefSeuil)}%</strong></span>
                    )}
                    {coefSeuilImpossible && (
                      <span className="modal-seuil modal-seuil--impossible">Jamais rentable</span>
                    )}
                  </div>
                  <div className="modal-field">
                    <span className="modal-label">
                      Coefficient de brisage
                      {coefStale && <span className="modal-stale-warn"> ⚠ non mis à jour</span>}
                    </span>
                    <div className="modal-coef-row">
                      <input
                        className="brisage-input"
                        type="number"
                        min={0}
                        max={100}
                        value={modalBrisageInput}
                        onChange={e => {
                          setModalBrisageInput(e.target.value)
                          setBrisageCoef(modalItemId, e.target.value)
                        }}
                        placeholder="0"
                        autoFocus
                      />
                      <span className="brisage-unit">%</span>
                    </div>
                    {coefDateStr && (
                      <span className={`price-date${coefStale ? ' price-date--stale' : ''}`}>
                        {coefStale && '⚠ '}Mis à jour {formatDate(coefDateStr)}
                      </span>
                    )}
                  </div>
                  {bestOption !== null && diff !== null && (
                    <div className="modal-field">
                      <span className="modal-label">Résultat brisage</span>
                      <span className={`modal-result${diff >= SEUIL_KAMAS ? ' synthese-positive' : diff > 0 ? ' synthese-neutral' : ' synthese-negative'}`}>
                        <strong>{diff >= 0 ? '+' : ''}{formatKamas(diff)}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Tableau des stats */}
                {stats.length > 0 && (
                  <div className="modal-stats">
                    <div className="modal-stats-header">
                      <span>Stat</span>
                      <span>Valeur</span>
                      <span>Prix rune (Ba)</span>
                      <span>Runes / Valeur focus</span>
                    </div>
                    {stats.map(d => {
                      const entry = runePrices[d.name]
                      const stale = entry ? isRunePriceStale(entry.updatedAt) : false
                      const valueFocus = entry?.price ? d.runesFocus * entry.price : 0
                      const isBest = bestOption?.key === d.name
                      return (
                        <div key={d.name} className={`modal-stats-row${isBest ? ' modal-stats-row--best' : ''}`}>
                          <span className="modal-stat-name">{d.name}</span>
                          <span className="modal-stat-val">
                            <span>
                              {d.min === d.max
                                ? `+${d.min}`
                                : <>{`+${d.min}–${d.max}`}<span className="modal-stat-avg"> (moy. {Number.isInteger(d.avgVal) ? d.avgVal : d.avgVal.toFixed(1)})</span></>
                              }
                            </span>
                          </span>
                          <input
                            className={`price-input${stale ? ' rune-input-stale' : ''}`}
                            type="number"
                            min={0}
                            value={entry?.price ?? ''}
                            onChange={e => {
                              const price = e.target.value === '' ? 0 : Number(e.target.value)
                              saveRunePrice(d.name, price)
                              setRunePrices(prev => ({ ...prev, [d.name]: { price, updatedAt: new Date().toISOString() } }))
                            }}
                            placeholder="Prix rune"
                          />
                          <span className={`modal-focus-val${isBest ? ' modal-focus-val--best' : (valueFocus > 0 ? ' total-value' : '')}`}>
                            {d.hasWeight && d.runesFocus > 0 ? (
                              valueFocus > 0 ? formatKamas(valueFocus) : <span className="modal-runes-hint">entrer prix rune</span>
                            ) : '—'}
                          </span>
                        </div>
                      )
                    })}
                    {/* Ligne sans focus */}
                    <div className={`modal-stats-footer${bestOption?.key === '__no_focus' ? ' modal-stats-row--best' : ''}`}>
                      <span className="modal-stat-name">Sans focus (total)</span>
                      <span></span>
                      <span></span>
                      <span className={`modal-focus-val${bestOption?.key === '__no_focus' ? ' modal-focus-val--best' : (totalNoFocus > 0 ? ' total-value' : ' total-empty')}`}>
                        {totalNoFocus > 0 ? formatKamas(totalNoFocus) : '—'}
                      </span>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default App
