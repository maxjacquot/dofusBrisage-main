import { useState } from 'react'
import './App.css'

const ITEM_TYPES = [
  { label: 'Tous les types', value: '' },
  { label: 'Amulette', value: 'amulet' },
  { label: 'Anneau', value: 'ring' },
  { label: 'Arc', value: 'bow' },
  { label: 'Arme magique', value: 'magic-weapon' },
  { label: 'Baguette', value: 'wand' },
  { label: 'Bâton', value: 'staff' },
  { label: 'Bottes', value: 'boots' },
  { label: 'Bouclier', value: 'shield' },
  { label: 'Cape', value: 'cloak' },
  { label: 'Ceinture', value: 'belt' },
  { label: 'Chapeau', value: 'hat' },
  { label: 'Dague', value: 'dagger' },
  { label: 'Dofus', value: 'dofus' },
  { label: 'Épée', value: 'sword' },
  { label: 'Hache', value: 'axe' },
  { label: 'Marteau', value: 'hammer' },
  { label: 'Outil', value: 'tool' },
  { label: 'Pelle', value: 'shovel' },
  { label: 'Pioche', value: 'pickaxe' },
]

const LS_PRICES_KEY = 'dofus-brisage-prices'
const LS_PRESETS_KEY = 'dofus-brisage-presets'
const STALE_DAYS = 2
const SEUIL_KAMAS = 1000 // profit minimum pour qu'un brisage soit intéressant

// Poids unitaires par stat pour le calcul de brisage
// Correspondances : Vi=Vitalité, Sa=Sagesse, Fo=Force, Ine=Intelligence,
// Age=Agilité, Cha=Chance, Pui=Puissance, Cri=Coups Critiques,
// Ga Pa=Points d'Action, Ga Pme=Points de Mouvement, etc.
const STAT_WEIGHTS: Record<string, number> = {
  // ── Stats de base ──────────────────────────────────────
  'Force': 1,
  'Intelligence': 1,
  'Chance': 1,
  'Agilité': 1,
  'Vitalité': 2,
  'Sagesse': 3,
  'Prospection': 3,
  'Puissance': 2,

  // ── Stats spéciales ────────────────────────────────────
  'PA': 100,
  'PM': 90,
  'Portée': 51,
  'Initiative': 1,
  'Pod': 2.5,
  'Invocation': 30,

  // ── Combat ─────────────────────────────────────────────
  'Tacle': 4,
  'Fuite': 4,
  'Esquive PA': 4,
  'Esquive PM': 4,
  'Retrait PA': 7,
  'Retrait PM': 7,

  // ── Dommages ───────────────────────────────────────────
  'Dommage': 20,
  'Soin': 10,
  '% Critique': 10,
  'Dommages Renvoyés': 5,
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
  '% Dommages aux sorts': 5,
  "% Dommages d'armes": 5,
  '% Dommages distance': 5,
  '% Dommages mêlée': 5,

  // ── Chasse ─────────────────────────────────────────────
  'Arme de chasse': 5,

  // ── Déplacement de cases ───────────────────────────────
  'Attire de case': 4,
  'Repousse de case': 4,
  'Avance de case': 4,
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
  itemType: string
}

type Tab = 'craft' | 'items'

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
  poidsLigne: number
  hasWeight: boolean
  runesNoFocus: number
  runesFocus: number
}

function computeStatBrisage(item: EquipmentItem, coef: number): StatBrisage[] {
  const niveau = item.level
  const effects = (item.effects ?? []).filter(e => (e.int_minimum + e.int_maximum) / 2 > 0)

  const rows = effects.map(eff => {
    const min = Math.min(eff.int_minimum, eff.int_maximum)
    const max = Math.max(eff.int_minimum, eff.int_maximum)
    const avgVal = (min + max) / 2
    const unitWeight = STAT_WEIGHTS[eff.type.name]
    const hasWeight = unitWeight !== undefined
    const poidsLigne = hasWeight ? avgVal * unitWeight : 0
    return { name: eff.type.name, min, max, avgVal, poidsLigne, hasWeight }
  })

  const poidsTotal = rows.reduce((s, r) => s + r.poidsLigne, 0)

  return rows.map(r => {
    const runesNoFocus = r.hasWeight ? r.poidsLigne * (niveau / 40) * (coef / 100) : 0
    const poidsEffectif = r.poidsLigne + (poidsTotal - r.poidsLigne) / 2
    const runesFocus = r.hasWeight ? poidsEffectif * (niveau / 40) * (coef / 100) : 0
    return { ...r, runesNoFocus, runesFocus }
  })
}

// --- App ---

function App() {
  const [tab, setTab] = useState<Tab>('craft')

  const [lvlmin, setLvlmin] = useState(1)
  const [lvlmax, setLvlmax] = useState(200)
  const [itemType, setItemType] = useState('')

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

  // --- Recherche ---

  async function handleSearch() {
    setLoading(true)
    setError('')
    setItems([])
    setResources({})
    setSearched(true)

    try {
      const params = new URLSearchParams()
      params.set('lvlmin', String(lvlmin))
      params.set('lvlmax', String(lvlmax))
      if (itemType) params.set('itemType', itemType)

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

  // --- Presets ---

  function savePreset() {
    if (!presetName.trim()) return
    const updated = [...presets, { id: Date.now().toString(), name: presetName.trim(), lvlmin, lvlmax, itemType }]
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
    setItemType(p.itemType)
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
          <label>Type d'objet</label>
          <select value={itemType} onChange={e => setItemType(e.target.value)}>
            {ITEM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
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
          </div>

          {/* --- Onglet Craft --- */}
          {tab === 'craft' && (
            itemsWithRecipe.length === 0
              ? <p className="empty">Aucun équipement avec recette trouvé.</p>
              : (
                <div className="items-list">
                  <div className="list-header">
                    <span>Item</span>
                    <span>Ressources nécessaires</span>
                    <span className="col-total-header">Prix craft</span>
                    <span>Coef. brisage</span>
                  </div>
                  {itemsWithRecipe.map(item => {
                    const total = craftTotal(item)
                    const copied = copiedId === item.ankama_id
                    return (
                      <div key={item.ankama_id} className="item-row">
                        <div className="col-name">
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
                                  {resources[r.item_ankama_id]?.name ?? `#${r.item_ankama_id}`}
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
            uniqueResources.length === 0
              ? <p className="empty">Aucune ressource trouvée.</p>
              : (
                <div className="items-list">
                  <div className="list-header list-header--items">
                    <span>Ressource</span>
                    <span>Prix unitaire</span>
                  </div>
                  {uniqueResources.map(id => {
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


        // Coef min pour être rentable : valeur(coef) linéaire → coef_seuil = (total + SEUIL) * coef / bestValue
        let coefSeuil: number | null = null
        let coefSeuilImpossible = false
        if (bestOption !== null && bestOption.value > 0 && coef > 0) {
          const raw = (total + SEUIL_KAMAS) * coef / bestOption.value
          if (raw <= 100) coefSeuil = raw
          else coefSeuilImpossible = true
        }

        return (
          <div className="modal-overlay" onClick={() => setModalItemId(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title-row">
                  <img className="modal-item-icon" src={item.image_urls.icon} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  <span className="modal-title">{item.name}</span>
                </div>
                <button className="modal-close" onClick={() => setModalItemId(null)}>✕</button>
              </div>
              <div className="modal-body">

                {/* Ressources avec toggle farm */}
                {(item.recipe ?? []).length > 0 && (
                  <div className="modal-ingredients">
                    <div className="modal-ing-title">
                    <span>Ressources du craft</span>
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
                            {name} <span className="ingredient-qty">×{r.quantity}</span>
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
                      <span>Valeur focus</span>
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
                            {d.min === d.max
                              ? `+${d.min}`
                              : <>{`+${d.min}–${d.max}`}<span className="modal-stat-avg"> (moy. {Number.isInteger(d.avgVal) ? d.avgVal : d.avgVal.toFixed(1)})</span></>
                            }
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
                            {d.hasWeight && d.runesFocus > 0
                              ? (valueFocus > 0 ? formatKamas(valueFocus) : <span className="modal-runes-hint">entrer prix rune</span>)
                              : (valueFocus > 0 ? formatKamas(valueFocus) : '—')}
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
