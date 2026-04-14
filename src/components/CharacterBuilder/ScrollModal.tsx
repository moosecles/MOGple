import { useState } from 'react'
import Modal from '../common/Modal'
import type { EquippedItem, ScrollApplication, ScrollTier } from '../../types'
import type { Scroll } from '../../types'
import { SCROLL_BONUSES, SCROLL_RATES } from '../../engine/damage'

interface ScrollModalProps {
  slotLabel: string
  equipped: EquippedItem
  item: import('../../types').Item
  slotScrolls: Scroll[]
  onSave: (scrolls: ScrollApplication[]) => void
  onClose: () => void
}

const TIERS: ScrollTier[] = ['Lesser', 'Intermediate', 'Greater', 'Chaos']

export default function ScrollModal({ slotLabel, equipped, item, slotScrolls, onSave, onClose }: ScrollModalProps) {
  const tuc = item.stats.tuc
  const [scrolls, setScrolls] = useState<ScrollApplication[]>(() => {
    // Pad to tuc length
    const existing = [...equipped.scrolls]
    while (existing.length < tuc) {
      existing.push({ tier: 'Intermediate', stat: 'Attack', success: false, slotIndex: existing.length })
    }
    return existing.slice(0, tuc)
  })

  // All unique stat types available for this slot
  const availableStats = Array.from(new Set(slotScrolls.map(s => s.stat_type))).sort()
  const defaultStat = availableStats.includes('Attack') ? 'Attack' : availableStats[0] ?? 'Attack'

  function update(idx: number, patch: Partial<ScrollApplication>) {
    setScrolls(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s))
  }

  function toggleSuccess(idx: number) {
    const scroll = scrolls[idx]
    if (scroll.tier === 'Chaos' && !scroll.success) {
      // Warn about item destruction on Chaos fail (we just allow it)
    }
    update(idx, { success: !scroll.success })
  }

  // Preview effective ATK
  const baseATK = item.stats.incPAD ?? 0
  let previewATK = baseATK
  for (const scroll of scrolls) {
    if (scroll.success) {
      previewATK += SCROLL_BONUSES[scroll.tier]?.[scroll.stat] ?? 0
    }
  }

  return (
    <Modal title={`Scrolls: ${slotLabel}`} onClose={onClose} wide>
      <div className="mb-4 p-3 bg-[#1A1E2A] rounded-lg flex items-center justify-between">
        <div className="text-sm text-[#8B8A85]">
          {item.name} — {tuc} scroll slots
        </div>
        {baseATK > 0 && (
          <div className="text-sm">
            <span className="text-[#5C5B57]">Base: </span>
            <span className="text-[#E8913A] font-semibold">{baseATK}</span>
            <span className="text-[#5C5B57]"> → </span>
            <span className="text-[#5AC47E] font-semibold">{previewATK} ATK</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {Array.from({ length: tuc }, (_, i) => {
          const scroll = scrolls[i]
          return (
            <div key={i} className="flex items-center gap-2 p-2 bg-[#1A1E2A] rounded-lg">
              <span className="text-xs text-[#5C5B57] w-5 text-center">{i + 1}</span>

              {/* Tier */}
              <select
                value={scroll.tier}
                onChange={e => update(i, { tier: e.target.value as ScrollTier, success: false })}
                className="flex-1 bg-[#13161F] border border-[rgba(255,255,255,0.08)] rounded px-2 py-1 text-xs text-[#E8E6E1] outline-none"
              >
                {TIERS.map(t => (
                  <option key={t} value={t}>
                    {t} ({Math.round(SCROLL_RATES[t] * 100)}%)
                  </option>
                ))}
              </select>

              {/* Stat */}
              <select
                value={scroll.stat}
                onChange={e => update(i, { stat: e.target.value, success: false })}
                className="flex-1 bg-[#13161F] border border-[rgba(255,255,255,0.08)] rounded px-2 py-1 text-xs text-[#E8E6E1] outline-none"
              >
                {availableStats.length > 0
                  ? availableStats.map(s => (
                      <option key={s} value={s}>{s} +{SCROLL_BONUSES[scroll.tier]?.[s] ?? '?'}</option>
                    ))
                  : <option value={defaultStat}>{defaultStat}</option>
                }
              </select>

              {/* Bonus preview */}
              <span className="text-xs text-[#5C5B57] w-12 text-center">
                +{SCROLL_BONUSES[scroll.tier]?.[scroll.stat] ?? '?'}
              </span>

              {/* Success toggle */}
              <button
                onClick={() => toggleSuccess(i)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  scroll.success
                    ? 'bg-[rgba(90,196,126,0.2)] text-[#5AC47E] border border-[rgba(90,196,126,0.3)]'
                    : 'bg-[rgba(255,255,255,0.05)] text-[#5C5B57] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)]'
                }`}
              >
                {scroll.success ? '✓ Hit' : 'Miss'}
              </button>
            </div>
          )
        })}
      </div>

      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-[#8B8A85] hover:text-[#E8E6E1] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => { onSave(scrolls); onClose() }}
          className="px-4 py-2 text-sm bg-[#E8913A] text-white rounded-lg font-medium hover:bg-[#d4823a] transition-colors"
        >
          Apply Scrolls
        </button>
      </div>
    </Modal>
  )
}
