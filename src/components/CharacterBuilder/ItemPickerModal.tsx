import { useMemo } from 'react'
import { useState } from 'react'
import Modal from '../common/Modal'
import ItemIcon from '../common/ItemIcon'
import type { Item, EquipSlot, CharacterState, CharStats } from '../../types'
import { canEquipItem, SLOT_SUB_CATEGORIES, getClassDef } from '../../engine/character'

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
  preferredWeaponTypes?: string[]
}

type SortKey = 'level-asc' | 'level-desc' | 'atk-desc' | 'name-asc' | 'name-desc'

// ─── Stat chip helpers ────────────────────────────────────────────────────────

function Chip({ children, color = 'default' }: { children: React.ReactNode; color?: 'blue' | 'orange' | 'green' | 'purple' | 'red' | 'yellow' | 'default' }) {
  const styles = {
    blue:    'bg-[rgba(90,157,232,0.1)] text-[#5A9DE8] border-[rgba(90,157,232,0.2)]',
    orange:  'bg-[rgba(232,145,58,0.1)] text-[#E8913A] border-[rgba(232,145,58,0.25)]',
    green:   'bg-[rgba(90,196,126,0.08)] text-[#5AC47E] border-[rgba(90,196,126,0.15)]',
    purple:  'bg-[rgba(156,122,232,0.08)] text-[#9C7AE8] border-[rgba(156,122,232,0.15)]',
    red:     'bg-[rgba(232,90,90,0.08)] text-[#E87A7A] border-[rgba(232,90,90,0.15)]',
    yellow:  'bg-[rgba(232,215,90,0.08)] text-[#E8D75A] border-[rgba(232,215,90,0.15)]',
    default: 'bg-[rgba(255,255,255,0.04)] text-[#8B8A85] border-[rgba(255,255,255,0.08)]',
  }
  return (
    <span className={`inline-flex px-1.5 py-0 rounded border text-[9px] leading-4 whitespace-nowrap ${styles[color]}`}>
      {children}
    </span>
  )
}

function ItemChips({ item }: { item: Item }) {
  return (
    <div className="flex flex-wrap gap-1 mt-0.5">
      {item.stats.reqLevel > 0 && <Chip color="blue">Lv.{item.stats.reqLevel}</Chip>}
      {item.req_job_label && item.req_job_label !== 'All' && <Chip>{item.req_job_label}</Chip>}
      {item.weapon_type && <Chip color="orange">{item.weapon_type}</Chip>}
      {item.attack_speed_label && <Chip color="default">{item.attack_speed_label}</Chip>}
      {(item.stats.incPAD ?? 0) > 0 && <Chip color="orange">+{item.stats.incPAD} ATK</Chip>}
      {(item.stats.incMAD ?? 0) > 0 && <Chip color="purple">+{item.stats.incMAD} M.ATK</Chip>}
      {item.stats.incSTR ? <Chip color="red">+{item.stats.incSTR} STR</Chip> : null}
      {item.stats.incDEX ? <Chip color="green">+{item.stats.incDEX} DEX</Chip> : null}
      {item.stats.incINT ? <Chip color="purple">+{item.stats.incINT} INT</Chip> : null}
      {item.stats.incLUK ? <Chip color="yellow">+{item.stats.incLUK} LUK</Chip> : null}
      {item.stats.incACC ? <Chip>+{item.stats.incACC} ACC</Chip> : null}
      {item.stats.incPDD ? <Chip>+{item.stats.incPDD} DEF</Chip> : null}
      {item.stats.incMHP ? <Chip color="red">+{item.stats.incMHP} HP</Chip> : null}
      {item.stats.tuc > 0 && <Chip>{item.stats.tuc} slots</Chip>}
    </div>
  )
}

function getMissingText(item: Item, totalStats: CharStats): string {
  const parts: string[] = []
  const d = item.stats.reqSTR - totalStats.STR; if (d > 0) parts.push(`+${d} STR`)
  const e = item.stats.reqDEX - totalStats.DEX; if (e > 0) parts.push(`+${e} DEX`)
  const f = item.stats.reqINT - totalStats.INT; if (f > 0) parts.push(`+${f} INT`)
  const g = item.stats.reqLUK - totalStats.LUK; if (g > 0) parts.push(`+${g} LUK`)
  return parts.join(', ')
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ItemPickerModal({
  slot, slotLabel, items, character, totalStats,
  onSelect, onClear, onClose, currentItemId, preferredWeaponTypes
}: ItemPickerModalProps) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('level-asc')
  const [showAll, setShowAll] = useState(false)
  // Default weapon filter: if class has exactly one preferred type, pre-select it; otherwise null (all)
  const [weaponTypeFilter, setWeaponTypeFilter] = useState<string | null>(
    slot === 'weapon' && preferredWeaponTypes?.length === 1 ? (preferredWeaponTypes[0] ?? null) : null
  )
  // Track whether we're hiding non-preferred weapon types
  const [hideNonPreferred, setHideNonPreferred] = useState(
    slot === 'weapon' && (preferredWeaponTypes?.length ?? 0) > 0
  )

  const validSubCats = SLOT_SUB_CATEGORIES[slot] ?? []
  const { jobBit } = getClassDef(character.className)

  // Weapon type filter options — only relevant for weapon slot
  const availableWeaponTypes = useMemo(() => {
    if (slot !== 'weapon') return []
    const baseList = items.filter(item => validSubCats.includes(item.sub_category))
    const jobFiltered = baseList.filter(item =>
      item.stats.reqJob === 0 || (item.stats.reqJob & jobBit) !== 0
    )
    const types = [...new Set(jobFiltered.map(item => item.weapon_type).filter((t): t is string => !!t))]
    return types.sort()
  }, [items, validSubCats, slot, jobBit])

  const filtered = useMemo(() => {
    let list = items.filter(item => validSubCats.includes(item.sub_category))

    if (!showAll) {
      list = list.filter(item => canEquipItem(item, character.className, character.level, totalStats))
    }

    // Hide non-preferred weapon types by default (e.g. hide swords for Spearman)
    if (slot === 'weapon' && hideNonPreferred && (preferredWeaponTypes?.length ?? 0) > 0) {
      const prefSet = new Set(preferredWeaponTypes)
      list = list.filter(item => !item.weapon_type || prefSet.has(item.weapon_type))
    }

    if (slot === 'weapon' && weaponTypeFilter) {
      list = list.filter(item => item.weapon_type === weaponTypeFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.weapon_type?.toLowerCase().includes(q) ||
        item.req_job_label?.toLowerCase().includes(q)
      )
    }

    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'level-asc':  return (a.stats.reqLevel - b.stats.reqLevel) || a.name.localeCompare(b.name)
        case 'level-desc': return (b.stats.reqLevel - a.stats.reqLevel) || a.name.localeCompare(b.name)
        case 'atk-desc':   return ((b.stats.incPAD ?? 0) - (a.stats.incPAD ?? 0)) || (b.stats.incMAD ?? 0) - (a.stats.incMAD ?? 0)
        case 'name-asc':   return a.name.localeCompare(b.name)
        case 'name-desc':  return b.name.localeCompare(a.name)
      }
    })

    return list
  }, [items, validSubCats, showAll, search, sort, weaponTypeFilter, slot, character.className, character.level, totalStats])

  // Near-miss: items you almost can equip (within 20 stat points, correct job, correct level)
  const nearMiss = useMemo(() => {
    if (showAll) return []
    return items
      .filter(item => {
        if (!validSubCats.includes(item.sub_category)) return false
        if (canEquipItem(item, character.className, character.level, totalStats)) return false
        if (item.stats.reqJob !== 0 && (item.stats.reqJob & jobBit) === 0) return false
        if (item.stats.reqLevel > character.level) return false
        const miss =
          Math.max(0, item.stats.reqSTR - totalStats.STR) +
          Math.max(0, item.stats.reqDEX - totalStats.DEX) +
          Math.max(0, item.stats.reqINT - totalStats.INT) +
          Math.max(0, item.stats.reqLUK - totalStats.LUK)
        return miss > 0 && miss <= 20
      })
      .sort((a, b) => {
        const missA = Math.max(0, a.stats.reqSTR - totalStats.STR) + Math.max(0, a.stats.reqDEX - totalStats.DEX) + Math.max(0, a.stats.reqINT - totalStats.INT) + Math.max(0, a.stats.reqLUK - totalStats.LUK)
        const missB = Math.max(0, b.stats.reqSTR - totalStats.STR) + Math.max(0, b.stats.reqDEX - totalStats.DEX) + Math.max(0, b.stats.reqINT - totalStats.INT) + Math.max(0, b.stats.reqLUK - totalStats.LUK)
        return missA - missB
      })
      .slice(0, 5)
  }, [items, validSubCats, showAll, character, totalStats, jobBit])

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'level-asc',  label: 'Lv ↑' },
    { key: 'level-desc', label: 'Lv ↓' },
    { key: 'atk-desc',   label: 'ATK ↓' },
    { key: 'name-asc',   label: 'A–Z' },
    { key: 'name-desc',  label: 'Z–A' },
  ]

  return (
    <Modal title={`Select ${slotLabel}`} onClose={onClose} wide>
      {/* Controls */}
      <div className="flex flex-col gap-2 mb-4">
        <input
          autoFocus
          type="text"
          placeholder="Search by name, weapon type, job…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#1A1E2A] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#E8E6E1] placeholder-[#5C5B57] outline-none focus:border-[rgba(232,145,58,0.5)]"
        />
        <div className="flex items-center flex-wrap gap-1.5">
          <span className="text-[10px] text-[#5C5B57] uppercase tracking-widest">Sort:</span>
          {SORT_OPTIONS.map(s => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                sort === s.key
                  ? 'bg-[rgba(232,145,58,0.2)] text-[#E8913A]'
                  : 'text-[#8B8A85] hover:text-[#E8E6E1] bg-[#1A1E2A]'
              }`}
            >
              {s.label}
            </button>
          ))}
          <label className="flex items-center gap-1.5 ml-auto text-xs text-[#8B8A85] cursor-pointer">
            <input
              type="checkbox"
              checked={showAll}
              onChange={e => setShowAll(e.target.checked)}
              className="accent-[#E8913A]"
            />
            Show unequippable
          </label>
        </div>
        {/* Preferred-only toggle — shown when class has specific skill weapon requirements */}
        {slot === 'weapon' && (preferredWeaponTypes?.length ?? 0) > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-1.5 text-[#8B8A85] cursor-pointer">
              <input
                type="checkbox"
                checked={hideNonPreferred}
                onChange={e => setHideNonPreferred(e.target.checked)}
                className="accent-[#E8913A]"
              />
              Skills-only ({preferredWeaponTypes!.join(', ')})
            </label>
            {hideNonPreferred && (
              <span className="text-[10px] text-[#5C5B57]">Other weapons won't activate your skills</span>
            )}
          </div>
        )}

        {/* Weapon type filter chips */}
        {availableWeaponTypes.length > 1 && (
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-[10px] text-[#5C5B57] uppercase tracking-widest">Type:</span>
            <button
              onClick={() => setWeaponTypeFilter(null)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                weaponTypeFilter === null
                  ? 'bg-[rgba(232,145,58,0.2)] text-[#E8913A]'
                  : 'text-[#8B8A85] hover:text-[#E8E6E1] bg-[#1A1E2A]'
              }`}
            >
              All
            </button>
            {availableWeaponTypes.map(wt => (
              <button
                key={wt}
                onClick={() => setWeaponTypeFilter(weaponTypeFilter === wt ? null : wt)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  weaponTypeFilter === wt
                    ? 'bg-[rgba(232,145,58,0.2)] text-[#E8913A]'
                    : 'text-[#8B8A85] hover:text-[#E8E6E1] bg-[#1A1E2A]'
                }`}
              >
                {wt}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div className="space-y-1 max-h-[52vh] overflow-y-auto pr-1">
        {currentItemId && (
          <button
            onClick={onClear}
            className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#E85A5A] hover:bg-[rgba(232,90,90,0.1)] transition-colors"
          >
            ✕ Remove equipped item
          </button>
        )}
        {filtered.length === 0 && nearMiss.length === 0 && (
          <p className="text-center text-sm text-[#5C5B57] py-8">
            No items found.{!showAll && ' Try enabling "Show unequippable".'}
          </p>
        )}

        {filtered.map(item => {
          const eligible = canEquipItem(item, character.className, character.level, totalStats)
          const tooHighLevel = item.stats.reqLevel > character.level
          const isCurrent = item.id === currentItemId
          return (
            <button
              key={item.id}
              onClick={() => { if (!tooHighLevel) onSelect(item.id) }}
              disabled={tooHighLevel}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                isCurrent
                  ? 'bg-[rgba(232,145,58,0.12)] border border-[rgba(232,145,58,0.3)]'
                  : tooHighLevel
                    ? 'cursor-not-allowed'
                    : 'hover:bg-[#191D28]'
              } ${!eligible ? 'opacity-40' : ''}`}
            >
              <ItemIcon thumbnail={item.thumbnail} name={item.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-medium truncate ${isCurrent ? 'text-[#E8913A]' : 'text-[#E8E6E1]'}`}>
                    {item.name}
                  </span>
                  {isCurrent && <span className="text-[9px] text-[#E8913A] shrink-0">equipped</span>}
                  {tooHighLevel && <span className="text-[9px] text-[#5C5B57] shrink-0">too high level</span>}
                  {!tooHighLevel && !eligible && <span className="text-[9px] text-[#E85A5A] shrink-0">stat req not met</span>}
                </div>
                <ItemChips item={item} />
              </div>
            </button>
          )
        })}

        {/* Near-miss items */}
        {!showAll && nearMiss.length > 0 && (
          <>
            <div className="px-1 pt-3 pb-1">
              <span className="text-[10px] uppercase tracking-widest text-[#5C5B57]">Almost equippable</span>
              <span className="text-[10px] text-[#3C3C3A] ml-2">within 20 stat points</span>
            </div>
            {nearMiss.map(item => {
              const missing = getMissingText(item, totalStats)
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 hover:bg-[#191D28] transition-colors opacity-60"
                >
                  <ItemIcon thumbnail={item.thumbnail} name={item.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate text-[#8B8A85]">{item.name}</span>
                      <span className="text-[9px] text-[#E8913A] shrink-0">need {missing}</span>
                    </div>
                    <ItemChips item={item} />
                  </div>
                </button>
              )
            })}
          </>
        )}
      </div>
      <p className="text-[10px] text-[#5C5B57] mt-3 text-right">{filtered.length} items</p>
    </Modal>
  )
}
