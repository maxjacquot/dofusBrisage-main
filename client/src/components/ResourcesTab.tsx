import { isStale, formatDate } from '../utils'
import type { ResourceInfo, PricesStore } from '../types'

interface ResourcesTabProps {
  filteredResources: number[]
  uniqueResources: number[]
  resources: Record<number, ResourceInfo>
  resourcePrices: PricesStore
  copiedId: number | null
  onCopyName: (name: string, id: number) => void
  onSetResourcePrice: (id: number, value: string) => void
}

export function ResourcesTab({
  filteredResources,
  uniqueResources,
  resources,
  resourcePrices,
  copiedId,
  onCopyName,
  onSetResourcePrice,
}: ResourcesTabProps) {
  if (filteredResources.length === 0) {
    return <p className="empty">{uniqueResources.length === 0 ? 'Aucune ressource trouvée.' : 'Aucun résultat pour ce filtre.'}</p>
  }

  return (
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
                onClick={() => onCopyName(name, id)}
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
                onChange={e => onSetResourcePrice(id, e.target.value)}
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
}
