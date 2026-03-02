import { useEffect, useState, useMemo } from 'react'
import type { CraftDataItem, DumpItem, EquipmentMeta } from '../types'

const PAGE_SIZE = 100

export function DumpsTab() {
  const [items, setItems] = useState<DumpItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [nameFilter, setNameFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'level' | 'type'>('level')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const [craftRes, metaRes] = await Promise.all([
          fetch('/dataBase/imagiro-craft-data.json'),
          fetch('http://localhost:3001/api/equipment/meta'),
        ])

        if (!craftRes.ok) throw new Error('Impossible de charger imagiro-craft-data.json')
        if (!metaRes.ok) throw new Error('Impossible de charger les métadonnées équipement (serveur démarré ?)')

        const craftData: CraftDataItem[] = await craftRes.json()
        const metaData: { items: EquipmentMeta[] } = await metaRes.json()

        const metaMap = new Map<number, EquipmentMeta>()
        for (const m of metaData.items) metaMap.set(m.ankama_id, m)

        const joined: DumpItem[] = craftData.map(c => {
          const meta = metaMap.get(c.itemID)
          return {
            itemID: c.itemID,
            name: c.Name,
            level: meta?.level ?? null,
            type: meta?.type ?? null,
            ingredients: c.Ingredients,
            quantity: c.Quantity,
          }
        })

        if (!cancelled) setItems(joined)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur inconnue')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const allTypes = useMemo(() => {
    const set = new Set<string>()
    for (const item of items) if (item.type) set.add(item.type)
    return [...set].sort((a, b) => a.localeCompare(b, 'fr'))
  }, [items])

  const filtered = useMemo(() => {
    const norm = nameFilter.trim().toLowerCase()
    return items.filter(item =>
      (!norm || item.name.toLowerCase().includes(norm)) &&
      (!typeFilter || item.type === typeFilter)
    )
  }, [items, nameFilter, typeFilter])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name, 'fr')
      else if (sortBy === 'level') cmp = (a.level ?? -1) - (b.level ?? -1)
      else if (sortBy === 'type') cmp = (a.type ?? '').localeCompare(b.type ?? '', 'fr')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortBy, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function toggleSort(col: 'name' | 'level' | 'type') {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
    setPage(1)
  }

  function sortIcon(col: 'name' | 'level' | 'type') {
    if (sortBy !== col) return ' ↕'
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  if (loading) return <p className="loading-res">Chargement des données dumps… (peut prendre quelques secondes)</p>
  if (error) return <p className="error">{error}</p>

  return (
    <div>
      <div className="name-filter-row" style={{ marginBottom: '0.75rem' }}>
        <input
          className="name-filter-input"
          type="text"
          value={nameFilter}
          onChange={e => { setNameFilter(e.target.value); setPage(1) }}
          placeholder="Filtrer par nom…"
        />
        {nameFilter && (
          <button className="name-filter-clear" onClick={() => { setNameFilter(''); setPage(1) }}>✕</button>
        )}
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
          style={{ marginLeft: '0.5rem', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid #444', background: '#1e1e1e', color: '#ddd', fontSize: '0.85rem' }}
        >
          <option value="">Tous les types</option>
          {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{ marginLeft: 'auto', color: '#888', fontSize: '0.85rem' }}>
          {sorted.length} item{sorted.length > 1 ? 's' : ''}
        </span>
      </div>

      <table className="craft-table">
        <thead>
          <tr>
            <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('name')}>
              Nom{sortIcon('name')}
            </th>
            <th style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }} onClick={() => toggleSort('level')}>
              Niveau{sortIcon('level')}
            </th>
            <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('type')}>
              Type{sortIcon('type')}
            </th>
            <th style={{ color: '#888', fontSize: '0.8rem' }}>ID</th>
          </tr>
        </thead>
        <tbody>
          {paginated.map(item => (
            <tr key={item.itemID}>
              <td>{item.name}</td>
              <td style={{ textAlign: 'center' }}>{item.level ?? '—'}</td>
              <td>{item.type ?? '—'}</td>
              <td style={{ color: '#666', fontSize: '0.8rem' }}>{item.itemID}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', justifyContent: 'center' }}>
          <button className="search-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>
            ← Préc.
          </button>
          <span style={{ color: '#aaa', fontSize: '0.85rem' }}>
            Page {safePage} / {totalPages}
          </span>
          <button className="search-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
            Suiv. →
          </button>
        </div>
      )}
    </div>
  )
}
