import type { FarmerItem } from '../types'

interface FarmerTabProps {
  farmerItems: FarmerItem[]
  onRemove: (id: number) => void
  onRemoveAll: () => void
}

export function FarmerTab({ farmerItems, onRemove, onRemoveAll }: FarmerTabProps) {
  if (farmerItems.length === 0) {
    return <p className="empty">Aucune ressource à farmer. Ouvre la modale d'un item et active le switch "À farmer" sur les ingrédients.</p>
  }

  return (
    <div className="farmer-tab">
      <div className="farmer-tab-header">
        <span className="farmer-tab-count">{farmerItems.length} item{farmerItems.length > 1 ? 's' : ''} à farmer</span>
        <button className="reset-inprogress-btn" onClick={onRemoveAll}>Vider la liste à farmer</button>
      </div>
      <div className="items-list">
        {farmerItems.map(item => (
          <div key={item.ankama_id} className="farmer-item-row">
            <span className="farmer-item-name">{item.name}</span>
            <button className="farmer-remove-btn" onClick={() => onRemove(item.ankama_id)}>✕ Retirer</button>
          </div>
        ))}
      </div>
    </div>
  )
}
