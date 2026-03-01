import type { EquipmentItem, ResourceInfo, PricesStore } from '../types'
import { ItemRow } from './ItemRow'

interface CraftTabProps {
  sortedItems: EquipmentItem[]
  resources: Record<number, ResourceInfo>
  resourcePrices: PricesStore
  brisageCoefs: Record<number, number>
  copiedId: number | null
  inProgressItems: Set<number>
  sortBy: 'level' | 'cost' | 'brisage'
  sortDir: 'asc' | 'desc'
  onToggleSort: (col: 'level' | 'cost' | 'brisage') => void
  onCopyName: (name: string, id: number) => void
  onSetResourcePrice: (id: number, value: string) => void
  onSetBrisageCoef: (id: number, value: string) => void
  onToggleInProgress: (id: number) => void
  onOpenModal: (item: EquipmentItem) => void
}

export function CraftTab({
  sortedItems,
  resources,
  resourcePrices,
  brisageCoefs,
  copiedId,
  inProgressItems,
  sortBy,
  sortDir,
  onToggleSort,
  onCopyName,
  onSetResourcePrice,
  onSetBrisageCoef,
  onToggleInProgress,
  onOpenModal,
}: CraftTabProps) {
  if (sortedItems.length === 0) return <p className="empty">Aucun équipement avec recette trouvé.</p>

  return (
    <div className="items-list">
      <div className="list-header">
        <button className={`sort-btn${sortBy === 'level' ? ' sort-btn--active' : ''}`} onClick={() => onToggleSort('level')}>
          Item {sortBy === 'level' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
        </button>
        <span>Ressources nécessaires</span>
        <button className={`sort-btn sort-btn--right${sortBy === 'cost' ? ' sort-btn--active' : ''}`} onClick={() => onToggleSort('cost')}>
          Prix craft {sortBy === 'cost' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
        </button>
        <button className={`sort-btn sort-btn--right${sortBy === 'brisage' ? ' sort-btn--active' : ''}`} onClick={() => onToggleSort('brisage')}>
          Coef. brisage {sortBy === 'brisage' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
        </button>
      </div>
      {sortedItems.map(item => (
        <ItemRow
          key={item.ankama_id}
          item={item}
          resources={resources}
          resourcePrices={resourcePrices}
          brisageCoefs={brisageCoefs}
          copiedId={copiedId}
          inProgressItems={inProgressItems}
          onCopyName={onCopyName}
          onSetResourcePrice={onSetResourcePrice}
          onSetBrisageCoef={onSetBrisageCoef}
          onToggleInProgress={onToggleInProgress}
          onOpenModal={onOpenModal}
        />
      ))}
    </div>
  )
}
