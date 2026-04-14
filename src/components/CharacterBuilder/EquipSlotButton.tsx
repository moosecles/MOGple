import { useState } from 'react'
import type { EquipSlot, EquippedItem, ScrollBundle, ScrollTier, CharacterState, CharStats } from '../../types'
import type { AppData } from '../../types'
import { SLOT_LABELS, getScrollSlotKey } from '../../engine/character'
import { SCROLL_BONUSES } from '../../engine/damage'
import ItemIcon from '../common/ItemIcon'
import Modal from '../common/Modal'

interface EquipSlotButtonProps {
  slot: EquipSlot
  equipped?: EquippedItem
  character: CharacterState
  totalStats: CharStats
  data: AppData
  onEquipClick: () => void
  onUnequip: () => void
  onScrollChange: (updated: EquippedItem) => void
}

const STAT_SHORT: Record<string, string> = {
  Attack: 'ATK', STR: 'STR', DEX: 'DEX', INT: 'INT', LUK: 'LUK',
  HP: 'HP', MP: 'MP', Accuracy: 'ACC', Avoidability: 'EVA', Defense: 'DEF',
}

const SCROLL_RATE_LABEL: Record<string, string> = {
  Lesser: '100%', Intermediate: '60%', Greater: '10%', Chaos: 'Chaos',
}

/** Border color based on scroll fill percentage */
function scrollBorderClass(used: number, tuc: number): string {
  if (tuc === 0 || used === 0) return 'border-[rgba(255,255,255,0.08)]'
  const fill = used / tuc
  if (fill >= 1.0) return 'border-[rgba(90,196,126,0.7)] shadow-[0_0_8px_rgba(90,196,126,0.15)]'
  if (fill >= 0.5) return 'border-[rgba(232,145,58,0.7)]'
  return 'border-[rgba(255,215,0,0.5)]'
}

export default function EquipSlotButton({
  slot, equipped, character: _char, totalStats: _ts, data,
  onEquipClick, onUnequip, onScrollChange
}: EquipSlotButtonProps) {
  const [showScrollModal, setShowScrollModal] = useState(false)

  const item = equipped ? data.equipById.get(equipped.itemId) : undefined
  const label = SLOT_LABELS[slot]
  const tuc = item?.stats.tuc ?? 0

  // Scroll availability — use actual scroll items from data
  const scrollSlotKey = item ? getScrollSlotKey(item) : null
  const availableScrolls = scrollSlotKey ? (data.scrollsBySlot.get(scrollSlotKey) ?? []) : []
  const canScroll = tuc > 0 && availableScrolls.length > 0

  // Current single bundle
  const bundle = equipped?.scrolls?.[0]
  const activeStat = bundle?.stat ?? availableScrolls[0]?.stat_type ?? 'Attack'
  const activeTier = (bundle?.tier ?? availableScrolls[0]?.tier ?? 'Intermediate') as ScrollTier
  const activeHits = bundle?.hits ?? 0
  const activeAttempts = bundle?.attempts ?? 0

  // Is the equipped item a Wand or Staff? Attack scrolls add M.ATK for these.
  const isWandOrStaff = slot === 'weapon' && (item?.weapon_type === 'Wand' || item?.weapon_type === 'Staff')

  function scrollStatLabel(statType: string): string {
    if (isWandOrStaff && statType === 'Attack') return 'M.ATK'
    return STAT_SHORT[statType] ?? statType
  }

  // Derived display values
  const slotsUsed = equipped ? (equipped.scrolls ?? []).reduce((s, b) => s + b.attempts, 0) : 0
  const atkBonus = equipped
    ? (equipped.scrolls ?? []).filter(b => b.stat === 'Attack')
        .reduce((s, b) => s + b.hits * (SCROLL_BONUSES[b.tier]?.['Attack'] ?? 0), 0)
    : 0
  const otherBonusParts = equipped
    ? (equipped.scrolls ?? [])
        .filter(b => b.stat !== 'Attack' && b.hits > 0)
        .map(b => `+${b.hits * (SCROLL_BONUSES[b.tier]?.[b.stat] ?? 0)} ${STAT_SHORT[b.stat] ?? b.stat}`)
    : []

  const bonusPerHit = SCROLL_BONUSES[activeTier]?.[activeStat] ?? 0
  const totalBonus = activeHits * bonusPerHit

  function updateBundle(patch: Partial<ScrollBundle>) {
    if (!equipped) return
    const current: ScrollBundle = bundle ?? {
      stat: availableScrolls[0]?.stat_type ?? 'Attack',
      tier: (availableScrolls[0]?.tier ?? 'Intermediate') as ScrollTier,
      hits: 0,
      attempts: 0,
    }
    const updated: ScrollBundle = { ...current, ...patch }
    updated.attempts = Math.max(0, Math.min(tuc, updated.attempts))
    updated.hits = Math.max(0, Math.min(updated.attempts, updated.hits))
    const newScrolls: ScrollBundle[] = [updated]
    onScrollChange({ ...equipped, scrolls: newScrolls })
  }

  return (
    <div className={`
      rounded-xl border transition-all
      ${item
        ? scrollBorderClass(slotsUsed, tuc)
        : 'border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.14)]'
      }
      bg-[#13161F]
    `}>
      {/* Main row */}
      <div className="flex items-stretch">
        <button
          onClick={onEquipClick}
          className={`flex-1 text-left px-3 py-2 flex items-center gap-2.5 min-w-0
            ${item ? 'hover:bg-[rgba(255,255,255,0.02)] rounded-tl-xl' : 'hover:bg-[#191D28] rounded-xl'}`}
        >
          {item ? (
            <>
              <ItemIcon thumbnail={item.thumbnail} name={item.name} size="md" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-[#E8E6E1] truncate leading-tight">{item.name}</div>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {item.stats.reqLevel > 0 && (
                    <span className="px-1 rounded bg-[rgba(90,157,232,0.1)] text-[#5A9DE8] text-[9px] border border-[rgba(90,157,232,0.2)]">Lv.{item.stats.reqLevel}</span>
                  )}
                  {(item.stats.incPAD ?? 0) > 0 && (
                    <span className="px-1 rounded bg-[rgba(232,145,58,0.12)] text-[#E8913A] text-[9px] border border-[rgba(232,145,58,0.25)]">
                      {(item.stats.incPAD ?? 0) + atkBonus} ATK{atkBonus > 0 && <span className="text-[#5AC47E]"> (+{atkBonus})</span>}
                    </span>
                  )}
                  {item.stats.incMAD ? <span className="px-1 rounded bg-[rgba(156,122,232,0.1)] text-[#9C7AE8] text-[9px] border border-[rgba(156,122,232,0.2)]">{item.stats.incMAD} M.ATK</span> : null}
                  {item.stats.incSTR ? <span className="px-1 rounded bg-[rgba(232,90,90,0.08)] text-[#E87A7A] text-[9px] border border-[rgba(232,90,90,0.15)]">+{item.stats.incSTR} STR</span> : null}
                  {item.stats.incDEX ? <span className="px-1 rounded bg-[rgba(90,196,126,0.08)] text-[#5AC47E] text-[9px] border border-[rgba(90,196,126,0.15)]">+{item.stats.incDEX} DEX</span> : null}
                  {item.stats.incINT ? <span className="px-1 rounded bg-[rgba(156,122,232,0.08)] text-[#9C7AE8] text-[9px] border border-[rgba(156,122,232,0.15)]">+{item.stats.incINT} INT</span> : null}
                  {item.stats.incLUK ? <span className="px-1 rounded bg-[rgba(232,215,90,0.08)] text-[#E8D75A] text-[9px] border border-[rgba(232,215,90,0.15)]">+{item.stats.incLUK} LUK</span> : null}
                  {item.stats.incACC ? <span className="px-1 rounded bg-[rgba(255,255,255,0.05)] text-[#8B8A85] text-[9px] border border-[rgba(255,255,255,0.1)]">+{item.stats.incACC} ACC</span> : null}
                  {item.stats.incPDD ? <span className="px-1 rounded bg-[rgba(255,255,255,0.05)] text-[#8B8A85] text-[9px] border border-[rgba(255,255,255,0.1)]">+{item.stats.incPDD} DEF</span> : null}
                  {otherBonusParts.map(s => (
                    <span key={s} className="px-1 rounded bg-[rgba(90,196,126,0.08)] text-[#5AC47E] text-[9px] border border-[rgba(90,196,126,0.15)]">{s}</span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <span className="text-xs text-[#5C5B57] py-1">+ {label}</span>
          )}
        </button>

        {/* Unequip X button */}
        {item && (
          <button
            onClick={e => { e.stopPropagation(); onUnequip() }}
            title="Remove"
            className="px-2 text-[#3C3C3A] hover:text-[#E85A5A] transition-colors text-sm rounded-tr-xl hover:bg-[rgba(232,90,90,0.06)] shrink-0"
          >
            ×
          </button>
        )}
      </div>

      {/* Scroll indicator bar — click to open modal */}
      {item && canScroll && equipped && (
        <div className="border-t border-[rgba(255,255,255,0.04)]">
          <button
            onClick={() => setShowScrollModal(true)}
            className="w-full px-3 py-1.5 flex items-center gap-1.5 text-[10px] hover:bg-[rgba(255,255,255,0.02)] transition-colors rounded-b-xl"
          >
            {slotsUsed > 0 ? (
              <>
                <span className="text-[#5C5B57]">{slotsUsed}/{tuc}</span>
                <div className="flex gap-0.5 flex-1">
                  {Array.from({ length: tuc }, (_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i < activeHits ? 'bg-[#5AC47E]' :
                      i < activeAttempts ? 'bg-[#E85A5A]' :
                      'bg-[rgba(255,255,255,0.08)]'
                    }`} />
                  ))}
                </div>
                {totalBonus > 0 && (
                  <span className="text-[#5AC47E]">+{totalBonus} {scrollStatLabel(activeStat)}</span>
                )}
              </>
            ) : (
              <>
                <span className="text-[#3C3C3A]">◆</span>
                <span className="text-[#4A4A48] hover:text-[#E8913A] transition-colors">
                  Scroll ({tuc} slots)
                </span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Scroll configuration modal */}
      {showScrollModal && item && equipped && (
        <Modal title={`Scroll: ${item.name}`} onClose={() => setShowScrollModal(false)}>
          <div className="space-y-4">
            {/* Wand/Staff note */}
            {isWandOrStaff && (
              <div className="text-[10px] text-[#9C7AE8] bg-[rgba(156,122,232,0.08)] border border-[rgba(156,122,232,0.15)] rounded-lg px-3 py-2">
                Attack scrolls on Wands/Staves add M.ATK, which scales quadratically in the magic formula.
              </div>
            )}

            {/* Scroll list */}
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#5C5B57] mb-2">Choose scroll type</div>
              <div className="space-y-0.5">
                {availableScrolls.map(scroll => {
                  const isSelected = bundle?.scrollId === scroll.id
                  const bph = SCROLL_BONUSES[scroll.tier]?.[scroll.stat_type] ?? 0
                  const rate = SCROLL_RATE_LABEL[scroll.tier] ?? scroll.tier
                  return (
                    <button
                      key={scroll.id}
                      onClick={() => updateBundle({ stat: scroll.stat_type, tier: scroll.tier as ScrollTier, scrollId: scroll.id })}
                      className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-[rgba(232,145,58,0.15)] border border-[rgba(232,145,58,0.25)]'
                          : 'hover:bg-[#1A1E2A] border border-transparent'
                      }`}
                    >
                      <span className={`flex-1 text-xs leading-tight truncate ${isSelected ? 'text-[#E8913A]' : 'text-[#8B8A85]'}`}>
                        {scroll.name}
                      </span>
                      <span className="text-[10px] text-[#5C5B57] shrink-0 w-10">{rate}</span>
                      <span className="text-[10px] text-[#5AC47E] shrink-0 w-14 text-right">+{bph} {scrollStatLabel(scroll.stat_type)}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Slot controls */}
            <div className="bg-[#0F1119] rounded-xl p-4 space-y-3">
              <div className="text-[10px] uppercase tracking-widest text-[#5C5B57] mb-1">Results for {item.name}</div>

              {/* Hits row */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#5C5B57] w-24 shrink-0">Successes</span>
                <button onClick={() => updateBundle({ hits: activeHits - 1 })} disabled={activeHits === 0}
                  className="w-7 h-7 rounded bg-[#1A1E2A] text-[#8B8A85] hover:text-[#E85A5A] disabled:opacity-30 text-sm leading-none">−</button>
                <span className="w-8 text-center text-sm text-[#E8E6E1] font-medium">{activeHits}</span>
                <button onClick={() => updateBundle({ hits: activeHits + 1, attempts: Math.max(activeAttempts, activeHits + 1) })}
                  disabled={activeHits >= tuc}
                  className="w-7 h-7 rounded bg-[#1A1E2A] text-[#8B8A85] hover:text-[#5AC47E] disabled:opacity-30 text-sm leading-none">+</button>
                <span className="text-xs text-[#3C3C3A] ml-1">hits</span>
              </div>

              {/* Attempts row */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#5C5B57] w-24 shrink-0">Slots used</span>
                <button onClick={() => updateBundle({ attempts: Math.max(activeHits, activeAttempts - 1) })}
                  disabled={activeAttempts === 0}
                  className="w-7 h-7 rounded bg-[#1A1E2A] text-[#8B8A85] hover:text-[#E85A5A] disabled:opacity-30 text-sm leading-none">−</button>
                <span className="w-8 text-center text-sm text-[#E8E6E1] font-medium">{activeAttempts}</span>
                <button onClick={() => updateBundle({ attempts: activeAttempts + 1 })} disabled={activeAttempts >= tuc}
                  className="w-7 h-7 rounded bg-[#1A1E2A] text-[#8B8A85] hover:text-[#E8913A] disabled:opacity-30 text-sm leading-none">+</button>
                <span className="text-xs text-[#3C3C3A] ml-1">/ {tuc} total</span>
              </div>

              {/* Slot dots */}
              {tuc > 0 && (
                <div className="flex gap-1 flex-wrap pt-1">
                  {Array.from({ length: tuc }, (_, i) => (
                    <div key={i} title={i < activeHits ? 'Hit' : i < activeAttempts ? 'Fail' : 'Empty'}
                      className={`w-3 h-3 rounded-full ${
                        i < activeHits ? 'bg-[#5AC47E]' :
                        i < activeAttempts ? 'bg-[#E85A5A]' :
                        'bg-[rgba(255,255,255,0.08)]'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Summary */}
              {totalBonus > 0 && (
                <div className="text-sm text-[#5AC47E] font-medium pt-1">
                  +{totalBonus} {scrollStatLabel(activeStat)}
                  <span className="text-xs text-[#3C3C3A] ml-2 font-normal">({activeHits} hits × {bonusPerHit})</span>
                </div>
              )}
              {activeAttempts > 0 && activeHits === 0 && (
                <div className="text-sm text-[#E85A5A]">{activeAttempts} slots used — all failed</div>
              )}
              {activeAttempts === 0 && !bundle?.scrollId && (
                <div className="text-xs text-[#5C5B57]">Select a scroll type above, then set successes and slots used.</div>
              )}
              {activeAttempts === 0 && bundle?.scrollId && (
                <div className="text-xs text-[#5C5B57]">Scroll selected. Set successes and slots used above.</div>
              )}
            </div>

            {/* Clear button */}
            {(bundle?.scrollId || activeAttempts > 0) && (
              <button
                onClick={() => onScrollChange({ ...equipped, scrolls: [] })}
                className="w-full text-xs text-[#5C5B57] hover:text-[#E85A5A] transition-colors py-1 border border-transparent hover:border-[rgba(232,90,90,0.2)] rounded-lg"
              >
                Clear scrolls
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
