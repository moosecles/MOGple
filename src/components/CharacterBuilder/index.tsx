import { useState, useMemo, useEffect } from 'react'
import type { CharacterState, EquipSlot, CharStats, EquippedItem } from '../../types'
import type { AppData } from '../../types'
import {
  CLASS_GROUPS, CLASS_DEFS, SLOT_LABELS,
  computeDerived, subCategoryToSlot, saveCharacter,
  apBudget, apSpent, MAX_LEVEL,
} from '../../engine/character'
import { SKILL_WEAPON_TYPES } from '../../engine/gear'
import StatPanel from './StatPanel'
import EquipSlotButton from './EquipSlotButton'
import ItemPickerModal from './ItemPickerModal'
import SkillBuilder from './SkillBuilder'
import BestSkillPanel from './BestSkillPanel'

// ─── Free-type number input that commits on blur/Enter ──────────────────────
function StatInput({ value, min, max, onCommit }: {
  value: number; min: number; max: number; onCommit: (v: number) => void
}) {
  const [str, setStr] = useState(String(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setStr(String(value))
  }, [value, focused])

  function commit() {
    const n = parseInt(str, 10)
    if (!isNaN(n)) onCommit(Math.max(min, Math.min(max, n)))
    else setStr(String(value))
    setFocused(false)
  }

  return (
    <input
      type="number"
      min={min}
      max={max}
      value={focused ? str : String(value)}
      onChange={e => setStr(e.target.value)}
      onFocus={() => { setFocused(true); setStr(String(value)) }}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit() }}
      className="flex-1 bg-[#1A1E2A] border border-[rgba(255,255,255,0.08)] rounded px-1 py-1.5 text-sm text-[#E8E6E1] text-center outline-none min-w-0 focus:border-[rgba(232,145,58,0.4)]"
    />
  )
}

interface CharacterBuilderProps {
  data: AppData
  char: CharacterState
  setChar: (c: CharacterState) => void
}

// Paper-doll layout columns
const LAYOUT_LEFT: EquipSlot[]   = ['earrings', 'cape', 'shield']
const LAYOUT_CENTER: EquipSlot[] = ['helmet', 'top', 'bottom', 'shoes']
const LAYOUT_RIGHT: EquipSlot[]  = ['weapon', 'gloves']

export default function CharacterBuilder({ data, char, setChar }: CharacterBuilderProps) {
  const [pickerSlot, setPickerSlot] = useState<EquipSlot | null>(null)
  const [activeTab, setActiveTab] = useState<'equip' | 'skills' | 'stats'>('equip')

  const derived = useMemo(() => computeDerived(char, data), [char, data])

  function update(patch: Partial<CharacterState>) {
    const next = { ...char, ...patch }
    setChar(next)
    saveCharacter(next)
  }

  const CLASS_FAMILY: Record<string, number> = {
    Beginner: 0,
    Warrior: 1, Fighter: 1, Page: 1, Spearman: 1,
    Magician: 2, 'F/P Wizard': 2, 'I/L Wizard': 2, Cleric: 2,
    Archer: 3, Hunter: 3, Crossbowman: 3,
    Rogue: 4, Assassin: 4, Bandit: 4,
  }

  function setClass(className: string) {
    const curFamily = CLASS_FAMILY[char.className] ?? 0
    const newFamily = CLASS_FAMILY[className] ?? 0
    const def = CLASS_DEFS.find(c => c.name === className)!
    const newBaseStats = {
      STR: def.baseStats.STR ?? 4,
      DEX: def.baseStats.DEX ?? 4,
      INT: def.baseStats.INT ?? 4,
      LUK: def.baseStats.LUK ?? 4,
      HP: char.baseStats.HP,
      MP: char.baseStats.MP,
    }

    if (curFamily !== 0 && curFamily !== newFamily) {
      // Different class family — clear everything
      if (!window.confirm(
        `Switch from ${char.className} to ${className}?\n\nThis resets all equipment, skills, and base stats.`
      )) return
      update({
        className,
        equipment: {},
        skills: {},
        activeBuffs: { rage: false, concentration: false, meditation: false },
        baseStats: newBaseStats,
      })
      return
    }

    // Same family — keep job-compatible equipment, reset skills
    const newEquip: CharacterState['equipment'] = {}
    for (const [slot, eq] of Object.entries(char.equipment) as [EquipSlot, EquippedItem | undefined][]) {
      if (!eq) continue
      const item = data.equipById.get(eq.itemId)
      if (!item) continue
      if (item.stats.reqJob === 0 || (item.stats.reqJob & def.jobBit) !== 0) {
        newEquip[slot] = eq
      }
    }
    update({
      className,
      equipment: newEquip,
      skills: {},
      activeBuffs: { rage: false, concentration: false, meditation: false },
      baseStats: newBaseStats,
    })
  }

  function equipItem(slot: EquipSlot, itemId: number) {
    const next: CharacterState['equipment'] = {
      ...char.equipment,
      [slot]: { itemId, scrolls: [] },
    }
    // Equipping a Longcoat (Overall) covers both top and bottom — clear the bottom slot
    if (slot === 'top') {
      const item = data.equipById.get(itemId)
      if (item?.sub_category === 'Longcoat') {
        delete next.bottom
      }
    }
    update({ equipment: next })
  }

  function clearSlot(slot: EquipSlot) {
    const next = { ...char.equipment }
    delete next[slot]
    update({ equipment: next })
  }

  function updateScrolls(slot: EquipSlot, updated: EquippedItem) {
    update({ equipment: { ...char.equipment, [slot]: updated } })
  }

  function getStatMin(stat: keyof CharStats): number {
    if (stat === 'HP') return 1
    if (stat === 'MP') return 1
    const def = CLASS_DEFS.find(c => c.name === char.className)!
    return (def.baseStats[stat] as number | undefined) ?? 4
  }

  function setStat(stat: keyof CharStats, value: number) {
    const min = getStatMin(stat)
    const clamped = Math.max(min, value)
    // Enforce AP budget for primary stats — can't allocate more AP than available
    if (['STR','DEX','INT','LUK'].includes(stat)) {
      const delta = clamped - char.baseStats[stat]
      if (delta > 0 && delta > apRemaining) {
        // Only allow increasing by however much AP is left
        const allowed = char.baseStats[stat] + Math.max(0, apRemaining)
        update({ baseStats: { ...char.baseStats, [stat]: allowed } })
        return
      }
    }
    update({ baseStats: { ...char.baseStats, [stat]: clamped } })
  }

  function exportBuild() {
    const defaultName = char.name || 'character'
    const filename = window.prompt('Save build as:', defaultName)
    if (filename === null) return  // cancelled
    const blob = new Blob([JSON.stringify(char, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename.trim() || defaultName}-build.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importBuild(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as CharacterState
        if (parsed.className && parsed.level) {
          setChar(parsed)
          saveCharacter(parsed)
        }
      } catch { /* ignore */ }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const pickerItem = pickerSlot ? char.equipment[pickerSlot] : undefined

  const showRage   = ['Warrior','Fighter','Page','Spearman'].includes(char.className)
  const showConc   = ['Archer','Hunter','Crossbowman'].includes(char.className)
  const showMedit  = ['Magician','F/P Wizard','I/L Wizard','Cleric'].includes(char.className)

  const totalAPSpent = apSpent(char)
  const totalAPBudget = apBudget(char)
  const apRemaining = totalAPBudget - totalAPSpent

  return (
    <div className="space-y-4">
      {/* Identity row */}
      <div className="bg-[#13161F] border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#5C5B57] block mb-1">Name</label>
            <input
              type="text"
              value={char.name}
              onChange={e => update({ name: e.target.value })}
              className="w-full bg-[#1A1E2A] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-1.5 text-sm text-[#E8E6E1] outline-none focus:border-[rgba(232,145,58,0.4)]"
              placeholder="Name"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#5C5B57] block mb-1">
              Level <span className="text-[#3C3C3A]">(max {MAX_LEVEL})</span>
            </label>
            <input
              type="number"
              min={1} max={MAX_LEVEL}
              value={char.level}
              onChange={e => update({ level: Math.max(1, Math.min(MAX_LEVEL, parseInt(e.target.value) || 1)) })}
              className="w-full bg-[#1A1E2A] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-1.5 text-sm text-[#E8E6E1] outline-none focus:border-[rgba(232,145,58,0.4)]"
            />
          </div>
          <div className="flex flex-col gap-1.5 justify-end">
            <button
              onClick={exportBuild}
              className="px-3 py-1.5 bg-[#1A1E2A] border border-[rgba(255,255,255,0.08)] rounded-lg text-xs text-[#8B8A85] hover:text-[#E8E6E1] hover:border-[rgba(255,255,255,0.2)] transition-colors"
            >
              Export Build
            </button>
          </div>
          <div className="flex flex-col gap-1.5 justify-end">
            <label className="px-3 py-1.5 bg-[#1A1E2A] border border-[rgba(255,255,255,0.08)] rounded-lg text-xs text-[#8B8A85] hover:text-[#E8E6E1] hover:border-[rgba(255,255,255,0.2)] transition-colors cursor-pointer text-center">
              Import Build
              <input type="file" accept=".json" onChange={importBuild} className="hidden" />
            </label>
          </div>
        </div>

        {/* Class selector */}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-[#5C5B57] block mb-2">Class</label>
          <div className="flex flex-wrap gap-1.5">
            {CLASS_GROUPS.map(group => (
              <div key={group.label} className="flex flex-wrap gap-1">
                {group.classes.map(cn => (
                  <button
                    key={cn}
                    onClick={() => setClass(cn)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      char.className === cn
                        ? 'bg-[rgba(232,145,58,0.2)] text-[#E8913A] border border-[rgba(232,145,58,0.4)]'
                        : 'bg-[#1A1E2A] text-[#8B8A85] border border-[rgba(255,255,255,0.06)] hover:text-[#E8E6E1] hover:border-[rgba(255,255,255,0.15)]'
                    }`}
                  >
                    {cn}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2/3: tabs */}
        <div className="lg:col-span-2 space-y-3">
          {/* Tab bar */}
          <div className="flex gap-1 bg-[#13161F] border border-[rgba(255,255,255,0.06)] rounded-xl p-1">
            {(['equip', 'skills', 'stats'] as const).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === t ? 'bg-[#1A1E2A] text-[#E8E6E1]' : 'text-[#5C5B57] hover:text-[#8B8A85]'
                }`}
              >
                {t === 'equip' ? 'Equipment' : t === 'skills' ? 'Skills' : 'Base Stats'}
              </button>
            ))}
          </div>

          {/* Equipment tab */}
          {activeTab === 'equip' && (
            <div className="bg-[#13161F] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  {LAYOUT_LEFT.map(slot => (
                    <EquipSlotButton
                      key={slot}
                      slot={slot}
                      equipped={char.equipment[slot]}
                      character={char}
                      totalStats={derived.totalStats}
                      data={data}
                      onEquipClick={() => setPickerSlot(slot)}
                      onUnequip={() => clearSlot(slot)}
                      onScrollChange={updated => updateScrolls(slot, updated)}
                    />
                  ))}
                </div>
                <div className="space-y-2">
                  {LAYOUT_CENTER.map(slot => {
                    // When a Longcoat (Overall) is equipped in the top slot, show a placeholder for bottom
                    if (slot === 'bottom') {
                      const topEquip = char.equipment.top
                      const topItem = topEquip ? data.equipById.get(topEquip.itemId) : undefined
                      if (topItem?.sub_category === 'Longcoat') {
                        return (
                          <div key="bottom" className="px-3 py-2.5 rounded-xl border border-[rgba(255,255,255,0.04)] bg-[#0C0E14] text-center">
                            <span className="text-[9px] text-[#3C3C3A]">Covered by Overall</span>
                          </div>
                        )
                      }
                    }
                    return (
                      <EquipSlotButton
                        key={slot}
                        slot={slot}
                        equipped={char.equipment[slot]}
                        character={char}
                        totalStats={derived.totalStats}
                        data={data}
                        onEquipClick={() => setPickerSlot(slot)}
                        onUnequip={() => clearSlot(slot)}
                        onScrollChange={updated => updateScrolls(slot, updated)}
                      />
                    )
                  })}
                </div>
                <div className="space-y-2">
                  {LAYOUT_RIGHT.map(slot => (
                    <EquipSlotButton
                      key={slot}
                      slot={slot}
                      equipped={char.equipment[slot]}
                      character={char}
                      totalStats={derived.totalStats}
                      data={data}
                      onEquipClick={() => setPickerSlot(slot)}
                      onUnequip={() => clearSlot(slot)}
                      onScrollChange={updated => updateScrolls(slot, updated)}
                    />
                  ))}
                </div>
              </div>

              {/* Buff toggles */}
              {(showRage || showConc || showMedit) && (
                <div className="border-t border-[rgba(255,255,255,0.06)] pt-3">
                  <div className="text-[10px] uppercase tracking-widest text-[#5C5B57] mb-2">Active Buffs</div>
                  <div className="flex flex-wrap gap-2">
                    {showRage && (
                      <button
                        onClick={() => update({ activeBuffs: { ...char.activeBuffs, rage: !char.activeBuffs.rage }})}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          char.activeBuffs.rage
                            ? 'bg-[rgba(232,90,90,0.2)] text-[#E85A5A] border border-[rgba(232,90,90,0.3)]'
                            : 'bg-[#1A1E2A] text-[#5C5B57] border border-[rgba(255,255,255,0.06)] hover:text-[#8B8A85]'
                        }`}
                      >
                        Rage +35 ATK
                      </button>
                    )}
                    {showConc && (
                      <button
                        onClick={() => update({ activeBuffs: { ...char.activeBuffs, concentration: !char.activeBuffs.concentration }})}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          char.activeBuffs.concentration
                            ? 'bg-[rgba(90,157,232,0.2)] text-[#5A9DE8] border border-[rgba(90,157,232,0.3)]'
                            : 'bg-[#1A1E2A] text-[#5C5B57] border border-[rgba(255,255,255,0.06)] hover:text-[#8B8A85]'
                        }`}
                      >
                        Concentration +20 ATK
                      </button>
                    )}
                    {showMedit && (
                      <button
                        onClick={() => update({ activeBuffs: { ...char.activeBuffs, meditation: !char.activeBuffs.meditation }})}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          char.activeBuffs.meditation
                            ? 'bg-[rgba(156,122,232,0.2)] text-[#9C7AE8] border border-[rgba(156,122,232,0.3)]'
                            : 'bg-[#1A1E2A] text-[#5C5B57] border border-[rgba(255,255,255,0.06)] hover:text-[#8B8A85]'
                        }`}
                      >
                        Meditation +20 M.ATK
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Best skill panel */}
              <BestSkillPanel character={char} derived={derived} />
            </div>
          )}

          {/* Skills tab */}
          {activeTab === 'skills' && (
            <div className="bg-[#13161F] border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
              <SkillBuilder character={char} data={data} onChange={skills => update({ skills })} />
            </div>
          )}

          {/* Base stats tab */}
          {activeTab === 'stats' && (
            <div className="bg-[#13161F] border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] uppercase tracking-widest text-[#5C5B57]">Base Stats (AP)</h3>
                <div className="text-xs flex gap-1 items-center">
                  <span className={`font-medium ${apRemaining < 0 ? 'text-[#E85A5A]' : 'text-[#5AC47E]'}`}>
                    {apRemaining}
                  </span>
                  <span className="text-[#5C5B57]">/ {totalAPBudget} AP remaining</span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(['STR','DEX','INT','LUK','HP','MP'] as (keyof CharStats)[]).map(stat => {
                  const minVal = getStatMin(stat)
                  const isPrimary = ['STR','DEX','INT','LUK'].includes(stat)
                  const atMax = isPrimary && apRemaining <= 0
                  const atMin = char.baseStats[stat] <= minVal
                  return (
                    <div key={stat}>
                      <label className="text-xs text-[#8B8A85] block mb-1">{stat}
                        {isPrimary && <span className="text-[#3C3C3A] ml-1">(min {minVal})</span>}
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setStat(stat, char.baseStats[stat] - 1)}
                          disabled={atMin}
                          className="w-7 h-7 rounded bg-[#1A1E2A] text-[#8B8A85] hover:text-[#E85A5A] disabled:opacity-30 text-sm leading-none"
                        >−</button>
                        <StatInput
                          value={char.baseStats[stat]}
                          min={minVal}
                          max={isPrimary ? char.baseStats[stat] + Math.max(0, apRemaining) : 9999}
                          onCommit={v => setStat(stat, v)}
                        />
                        <button
                          onClick={() => setStat(stat, char.baseStats[stat] + 1)}
                          disabled={atMax}
                          className="w-7 h-7 rounded bg-[#1A1E2A] text-[#8B8A85] hover:text-[#E8913A] disabled:opacity-30 text-sm leading-none"
                        >+</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Stat panel */}
        <div>
          <StatPanel character={char} derived={derived} />
        </div>
      </div>

      {/* Item picker modal */}
      {pickerSlot && (
        <ItemPickerModal
          slot={pickerSlot}
          slotLabel={SLOT_LABELS[pickerSlot]}
          items={data.items}
          character={char}
          totalStats={derived.totalStats}
          onSelect={itemId => {
            const item = data.equipById.get(itemId)
            const targetSlot = item ? (subCategoryToSlot(item.sub_category) ?? pickerSlot) : pickerSlot
            equipItem(targetSlot, itemId)
            setPickerSlot(null)
          }}
          onClear={() => { clearSlot(pickerSlot); setPickerSlot(null) }}
          onClose={() => setPickerSlot(null)}
          currentItemId={pickerItem?.itemId}
          preferredWeaponTypes={pickerSlot === 'weapon' ? (SKILL_WEAPON_TYPES[char.className] ?? []) : undefined}
        />
      )}
    </div>
  )
}
