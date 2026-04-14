import type { EquipSlot, EquippedItem, CharacterState, CharStats } from '../../types'
import type { AppData } from '../../types'
import { SLOT_LABELS, computeScrolledATK } from '../../engine/character'

interface EquipSlotButtonProps {
  slot: EquipSlot
  equipped?: EquippedItem
  character: CharacterState
  totalStats: CharStats
  data: AppData
  onClick: () => void
  onScrollClick?: () => void
}

export default function EquipSlotButton({
  slot, equipped, character: _character, totalStats: _totalStats, data,
  onClick, onScrollClick
}: EquipSlotButtonProps) {
  const item = equipped ? data.equipById.get(equipped.itemId) : undefined
  const label = SLOT_LABELS[slot]

  const effectiveATK = item ? computeScrolledATK(equipped, item.stats.incPAD ?? 0) : 0
  const scrollCount = equipped?.scrolls.filter(s => s.success).length ?? 0

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={onClick}
        className={`
          w-full h-16 rounded-xl border transition-all text-left px-3 py-2
          ${item
            ? 'bg-[#191D28] border-[rgba(232,145,58,0.3)] hover:border-[rgba(232,145,58,0.5)]'
            : 'bg-[#13161F] border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)] hover:bg-[#191D28]'
          }
        `}
      >
        {item ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-[#E8E6E1] truncate">{item.name}</span>
            <div className="flex gap-2 text-[10px] text-[#8B8A85]">
              {effectiveATK > 0 && <span className="text-[#E8913A]">{effectiveATK} ATK</span>}
              {item.stats.incMAD ? <span className="text-[#9C7AE8]">{item.stats.incMAD} M.ATK</span> : null}
              {item.stats.reqLevel > 0 && <span>Lv.{item.stats.reqLevel}</span>}
            </div>
          </div>
        ) : (
          <span className="text-xs text-[#5C5B57]">{label}</span>
        )}
      </button>

      {/* Scroll button — only show if item has upgrade slots */}
      {item && item.stats.tuc > 0 && onScrollClick && (
        <button
          onClick={onScrollClick}
          className="text-[10px] text-[#8B8A85] hover:text-[#E8913A] transition-colors text-left px-1"
        >
          Scrolls: {scrollCount}/{item.stats.tuc}
        </button>
      )}
    </div>
  )
}
