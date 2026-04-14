import { useState, useMemo } from 'react'
import Modal from '../common/Modal'
import type { Item, EquipSlot, CharacterState, CharStats } from '../../types'
import { canEquipItem } from '../../engine/character'

interface ItemPickerModalProps {
  slot: EquipSlot
  slotLabel: string
  items: Item[]
  character: CharacterState
  totalStats: CharStats
  onSelect: (itemId: number) => void
  onClear: () => void
  onClose: () => void
  currentItemId?: number
}

type SortKey = 'level' | 'atk' | 'name'

const SLOT_TO_SUBCATEGORY: Record<EquipSlot, string[]> = {
  weapon:   ['Weapon'],
  helmet:   ['Hat'],
  top:      ['Top', 'Overall'],
  bottom:   ['Bottom'],
  shoes:    ['Shoes'],
  gloves:   ['Gloves'],
  cape:     ['Cape'],
  earrings: ['Earring', 'Earrings'],
  ring:     ['Ring', 'Face Accessory'],
}

export default function ItemPickerModal({
  slot, slotLabel, items, character, totalStats,
  onSelect, onClear, onClose, currentItemId
}: ItemPickerModalProps) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('level')
  const [showAll, setShowAll] = useState(false)

  const validSubCats = SLOT_TO_SUBCATEGORY[slot] ?? []

  const filtered = useMemo(() => {
    let list = items.filter(item => validSubCats.includes(item.sub_category))

    if (!showAll) {
      list = list.filter(item => canEquipItem(item, character.className, character.level, totalStats))
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(item => item.name.toLowerCase().includes(q))
    }

    list = [...list].sort((a, b) => {
      if (sort === 'level') return (a.stats.reqLevel - b.stats.reqLevel) || a.name.localeCompare(b.name)
      if (sort === 'atk')   return (b.stats.incPAD ?? 0) - (a.stats.incPAD ?? 0)
      return a.name.localeCompare(b.name)
    })

    return list
  }, [items, validSubCats, showAll, search, sort, character.className, character.level, totalStats])

  return (
    <Modal title={`Select ${slotLabel}`} onClose={onClose} wide>
      {/* Controls */}
      <div className="flex flex-col gap-3 mb-4">
        <input
          autoFocus
          type="text"
          placeholder="Search items…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#1A1E2A] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#E8E6E1] placeholder-[#5C5B57] outline-none focus:border-[rgba(232,145,58,0.5)]"
        />
        <div className="flex items-center gap-3 text-xs">
          <span className="text-[#5C5B57]">Sort:</span>
          {(['level', 'atk', 'name'] as SortKey[]).map(s => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-2 py-1 rounded ${sort === s ? 'bg-[rgba(232,145,58,0.2)] text-[#E8913A]' : 'text-[#8B8A85] hover:text-[#E8E6E1]'}`}
            >
              {s === 'level' ? 'Level' : s === 'atk' ? 'ATK' : 'Name'}
            </button>
          ))}
          <label className="flex items-center gap-1.5 ml-auto text-[#8B8A85] cursor-pointer">
            <input
              type="checkbox"
              checked={showAll}
              onChange={e => setShowAll(e.target.checked)}
              className="accent-[#E8913A]"
            />
            Show all
          </label>
        </div>
      </div>

      {/* List */}
      <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-1">
        {currentItemId && (
          <button
            onClick={onClear}
            className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#E85A5A] hover:bg-[rgba(232,90,90,0.1)] transition-colors"
          >
            ✕ Remove equipped item
          </button>
        )}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-[#5C5B57] py-8">No items found</p>
        )}
        {filtered.map(item => {
          const eligible = canEquipItem(item, character.className, character.level, totalStats)
          const isCurrent = item.id === currentItemId
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                isCurrent
                  ? 'bg-[rgba(232,145,58,0.15)] border border-[rgba(232,145,58,0.3)]'
                  : 'hover:bg-[#191D28]'
              } ${!eligible ? 'opacity-50' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#E8E6E1] truncate">{item.name}</span>
                  {isCurrent && <span className="text-[10px] text-[#E8913A]">equipped</span>}
                  {!eligible && <span className="text-[10px] text-[#E85A5A]">req not met</span>}
                </div>
                <div className="text-xs text-[#5C5B57] flex gap-3 mt-0.5">
                  {item.stats.reqLevel > 0 && <span>Lv.{item.stats.reqLevel}</span>}
                  {item.stats.incPAD ? <span className="text-[#E8913A]">+{item.stats.incPAD} ATK</span> : null}
                  {item.stats.incMAD ? <span className="text-[#9C7AE8]">+{item.stats.incMAD} M.ATK</span> : null}
                  {item.stats.incSTR ? <span>+{item.stats.incSTR} STR</span> : null}
                  {item.stats.incDEX ? <span>+{item.stats.incDEX} DEX</span> : null}
                  {item.stats.incINT ? <span>+{item.stats.incINT} INT</span> : null}
                  {item.stats.incLUK ? <span>+{item.stats.incLUK} LUK</span> : null}
                  {item.stats.tuc > 0 && <span className="text-[#5C5B57]">{item.stats.tuc} slots</span>}
                  {item.weapon_type && <span className="text-[#5C5B57]">{item.weapon_type}</span>}
                </div>
              </div>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-[#5C5B57] mt-3 text-right">{filtered.length} items</p>
    </Modal>
  )
}
