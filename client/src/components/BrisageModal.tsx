import { useState, useEffect } from 'react'
import { SEUIL_KAMAS } from '../constants'
import { isBrisageCoefStale, getBrisageCoefDateStr, getRunePriceEntry, saveRunePrice, isRunePriceStale } from '../storage'
import { formatDate, formatKamas, computeStatBrisage } from '../utils'
import type { EquipmentItem, ResourceInfo, PricesStore, PriceEntry, FarmerItem } from '../types'

interface BrisageModalProps {
  item: EquipmentItem
  resources: Record<number, ResourceInfo>
  resourcePrices: PricesStore
  brisageCoef: number
  copiedId: number | null
  farmerResourceIds: Set<number>
  onClose: () => void
  onCopyName: (name: string, id: number) => void
  onSetBrisageCoef: (id: number, value: string) => void
  onToggleFarmerResource: (r: FarmerItem) => void
}

export function BrisageModal({
  item,
  resources,
  resourcePrices,
  brisageCoef,
  copiedId,
  farmerResourceIds,
  onClose,
  onCopyName,
  onSetBrisageCoef,
  onToggleFarmerResource,
}: BrisageModalProps) {
  const [brisageInput, setBrisageInput] = useState(String(brisageCoef ?? ''))
  const [runePrices, setRunePrices] = useState<Record<string, PriceEntry>>({})

  useEffect(() => {
    const prices: Record<string, PriceEntry> = {}
    for (const eff of item.effects ?? []) {
      const entry = getRunePriceEntry(eff.type.name)
      if (entry) prices[eff.type.name] = entry
    }
    setRunePrices(prices)
  }, [item.ankama_id])

  const total = (item.recipe ?? []).reduce((s, r) => {
    if (farmerResourceIds.has(r.item_ankama_id)) return s
    return s + (resourcePrices[r.item_ankama_id]?.price ?? 0) * r.quantity
  }, 0)

  const coef = brisageInput === '' ? 0 : Number(brisageInput)
  const coefStale = isBrisageCoefStale(item.ankama_id)
  const coefDateStr = getBrisageCoefDateStr(item.ankama_id)
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

  let coefSeuil: number | null = null
  if (bestOption !== null && bestOption.value > 0 && coef > 0) {
    coefSeuil = total > 0 ? total * coef / bestOption.value : 0
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title-row">
            <img className="modal-item-icon" src={item.image_urls.icon} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <span
              className={`modal-title copyable${copiedId === item.ankama_id ? ' copyable--copied' : ''}`}
              onClick={() => onCopyName(item.name, item.ankama_id)}
              title="Cliquer pour copier"
            >
              {copiedId === item.ankama_id ? '✓ Copié !' : item.name}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">

          {/* Ressources avec toggle farm */}
          {(item.recipe ?? []).length > 0 && (
            <div className="modal-ingredients">
              <div className="modal-ing-title">
                <span>Ressources du craft</span>
                <span className="modal-ing-col-header">Prix unit.</span>
                <span className="modal-ing-col-header">Valeur totale</span>
                <span className="modal-ing-col-header">À farmer</span>
              </div>
              {(item.recipe ?? []).map(r => {
                const name = resources[r.item_ankama_id]?.name ?? `#${r.item_ankama_id}`
                const unitPrice = resourcePrices[r.item_ankama_id]?.price ?? 0
                const linePrice = unitPrice * r.quantity
                const isFarmed = farmerResourceIds.has(r.item_ankama_id)
                return (
                  <div key={r.item_ankama_id} className={`modal-ing-row${isFarmed ? ' modal-ing-row--farmed' : ''}`}>
                    <span className="modal-ing-name">
                      <span
                        className={`copyable${copiedId === r.item_ankama_id ? ' copyable--copied' : ''}`}
                        onClick={() => onCopyName(name, r.item_ankama_id)}
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
                    <span
                      className={`farmer-switch${isFarmed ? ' farmer-switch--active' : ''}`}
                      onClick={() => onToggleFarmerResource({ ankama_id: r.item_ankama_id, name })}
                      title={isFarmed ? 'Retirer de la liste À farmer' : 'Ajouter à la liste À farmer'}
                    />
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
              <span className="modal-seuil">Coef min rentable : <strong>{coefSeuil !== null ? `${Math.ceil(coefSeuil)}%` : '—'}</strong></span>
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
                  value={brisageInput}
                  onChange={e => {
                    setBrisageInput(e.target.value)
                    onSetBrisageCoef(item.ankama_id, e.target.value)
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
}
