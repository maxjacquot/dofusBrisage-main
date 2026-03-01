import { isStale, formatDate, formatKamas } from '../utils'
import type { EquipmentItem, ResourceInfo, PricesStore } from '../types'

interface ItemRowProps {
  item: EquipmentItem
  resources: Record<number, ResourceInfo>
  resourcePrices: PricesStore
  brisageCoefs: Record<number, number>
  copiedId: number | null
  inProgressItems: Set<number>
  onCopyName: (name: string, id: number) => void
  onSetResourcePrice: (id: number, value: string) => void
  onSetBrisageCoef: (id: number, value: string) => void
  onToggleInProgress: (id: number) => void
  onOpenModal: (item: EquipmentItem) => void
}

export function ItemRow({
  item,
  resources,
  resourcePrices,
  brisageCoefs,
  copiedId,
  inProgressItems,
  onCopyName,
  onSetResourcePrice,
  onSetBrisageCoef,
  onToggleInProgress,
  onOpenModal,
}: ItemRowProps) {
  const total = (item.recipe ?? []).reduce(
    (s, r) => s + (resourcePrices[r.item_ankama_id]?.price ?? 0) * r.quantity,
    0
  )
  const copied = copiedId === item.ankama_id
  const inProg = inProgressItems.has(item.ankama_id)

  return (
    <div className={`item-row${inProg ? ' item-row--inprogress' : ''}`}>
      <div className="col-name">
        <button
          className={`inprogress-btn${inProg ? ' inprogress-btn--active' : ''}`}
          onClick={() => onToggleInProgress(item.ankama_id)}
          title={inProg ? 'Retirer du brisage en cours' : 'Marquer en brisage en cours'}
        >✓</button>
        <img className="item-icon" src={item.image_urls.icon} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div className="item-info">
          <span
            className={`item-name${copied ? ' item-name--copied' : ''}`}
            onClick={() => onCopyName(item.name, item.ankama_id)}
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
                  onClick={() => onCopyName(resources[r.item_ankama_id]?.name ?? `#${r.item_ankama_id}`, r.item_ankama_id)}
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
                onChange={e => onSetResourcePrice(r.item_ankama_id, e.target.value)}
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
            onChange={e => onSetBrisageCoef(item.ankama_id, e.target.value)}
            placeholder="0"
          />
          <span className="brisage-unit">%</span>
        </div>
        <button className="calc-brisage-btn" onClick={() => onOpenModal(item)}>
          Calculer le brisage
        </button>
      </div>
    </div>
  )
}
