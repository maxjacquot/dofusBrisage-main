import { useState } from 'react'
import './App.css'
import { METIERS, LS_PRICES_KEY, LS_PRESETS_KEY, LS_INPROGRESS_KEY } from './constants'
import { ls, lsSet, loadBrisageCoef, saveBrisageCoef } from './storage'
import type { EquipmentItem, ResourceInfo, PricesStore, SearchPreset, Tab } from './types'
import { BrisageModal } from './components/BrisageModal'
import { CraftTab } from './components/CraftTab'
import { BrisageEnCoursTab } from './components/BrisageEnCoursTab'
import { ResourcesTab } from './components/ResourcesTab'

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

  const [loading, setLoading] = useState(false)
  const [loadingResources, setLoadingResources] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [presetName, setPresetName] = useState('')

  const [modalItemId, setModalItemId] = useState<number | null>(null)

  const [sortBy, setSortBy] = useState<'level' | 'cost' | 'brisage'>('level')
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

  // --- Prix ressources ---

  function setResourcePrice(id: number, value: string) {
    const updated = { ...resourcePrices, [id]: { price: value === '' ? 0 : Number(value), updatedAt: new Date().toISOString() } }
    setResourcePrices(updated)
    lsSet(LS_PRICES_KEY, updated)
  }

  // --- Coef brisage ---

  function setBrisageCoef(id: number, value: string) {
    const coef = value === '' ? 0 : Number(value)
    setBrisageCoefs(prev => ({ ...prev, [id]: coef }))
    saveBrisageCoef(id, coef)
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

  // --- Tri & filtre ---

  function craftTotal(item: EquipmentItem) {
    return (item.recipe ?? []).reduce((s, r) => s + (resourcePrices[r.item_ankama_id]?.price ?? 0) * r.quantity, 0)
  }

  function toggleSort(col: 'level' | 'cost' | 'brisage') {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  function sortVal(item: EquipmentItem) {
    if (sortBy === 'level') return item.level
    if (sortBy === 'cost') return craftTotal(item)
    return brisageCoefs[item.ankama_id] ?? 0
  }

  const itemsWithRecipe = items.filter(i => (i.recipe ?? []).length > 0)

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

  const normalizedFilter = nameFilter.trim().toLowerCase()

  const sortedItems = [...itemsWithRecipe]
    .filter(i => !normalizedFilter || i.name.toLowerCase().includes(normalizedFilter))
    .sort((a, b) => sortDir === 'asc' ? sortVal(a) - sortVal(b) : sortVal(b) - sortVal(a))

  const filteredResources = uniqueResources.filter(id =>
    !normalizedFilter || (resources[id]?.name ?? '').toLowerCase().includes(normalizedFilter)
  )

  const inProgressList = [...itemsWithRecipe]
    .filter(i => inProgressItems.has(i.ankama_id))
    .sort((a, b) => sortDir === 'asc' ? sortVal(a) - sortVal(b) : sortVal(b) - sortVal(a))

  const modalItem = modalItemId !== null ? items.find(i => i.ankama_id === modalItemId) : null

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
            {inProgressItems.size > 0 && (
              <button className="reset-inprogress-btn" onClick={resetInProgress}>Tout retirer</button>
            )}
          </div>

          {tab === 'craft' && (
            <CraftTab
              sortedItems={sortedItems}
              resources={resources}
              resourcePrices={resourcePrices}
              brisageCoefs={brisageCoefs}
              copiedId={copiedId}
              inProgressItems={inProgressItems}
              sortBy={sortBy}
              sortDir={sortDir}
              onToggleSort={toggleSort}
              onCopyName={copyName}
              onSetResourcePrice={setResourcePrice}
              onSetBrisageCoef={setBrisageCoef}
              onToggleInProgress={toggleInProgress}
              onOpenModal={item => setModalItemId(item.ankama_id)}
            />
          )}

          {tab === 'items' && (
            <ResourcesTab
              filteredResources={filteredResources}
              uniqueResources={uniqueResources}
              resources={resources}
              resourcePrices={resourcePrices}
              copiedId={copiedId}
              onCopyName={copyName}
              onSetResourcePrice={setResourcePrice}
            />
          )}

          {tab === 'brisage' && (
            <BrisageEnCoursTab
              inProgressList={inProgressList}
              resources={resources}
              resourcePrices={resourcePrices}
              brisageCoefs={brisageCoefs}
              copiedId={copiedId}
              inProgressItems={inProgressItems}
              sortBy={sortBy}
              sortDir={sortDir}
              onToggleSort={toggleSort}
              onCopyName={copyName}
              onSetResourcePrice={setResourcePrice}
              onSetBrisageCoef={setBrisageCoef}
              onToggleInProgress={toggleInProgress}
              onOpenModal={item => setModalItemId(item.ankama_id)}
            />
          )}
        </>
      )}

      {!loading && searched && items.length === 0 && !error && (
        <p className="empty">Aucun équipement trouvé.</p>
      )}

      {/* Modale brisage */}
      {modalItem && (
        <BrisageModal
          item={modalItem}
          resources={resources}
          resourcePrices={resourcePrices}
          brisageCoef={brisageCoefs[modalItem.ankama_id] ?? 0}
          copiedId={copiedId}
          onClose={() => setModalItemId(null)}
          onCopyName={copyName}
          onSetBrisageCoef={setBrisageCoef}
        />
      )}
    </div>
  )
}

export default App
