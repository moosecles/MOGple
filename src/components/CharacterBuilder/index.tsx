import { useState, useMemo } from 'react'
import type { CharacterState, EquipSlot, ScrollApplication, CharStats } from '../../types'
import type { AppData } from '../../types'
import {
  CLASS_GROUPS, CLASS_DEFS, SLOT_LABELS,
  computeDerived, subCategoryToSlot, saveCharacter,
} from '../../engine/character'
import StatPanel from './StatPanel'
import EquipSlotButton from './EquipSlotButton'
import ItemPickerModal from './ItemPickerModal'
import ScrollModal from './ScrollModal'
import SkillBuilder from './SkillBuilder'

interface CharacterBuilderProps {
  data: AppData
  char: CharacterState
  setChar: (c: CharacterState) => void
}

// Paper-doll layout: left column, center, right column
const LAYOUT_LEFT: EquipSlot[]   = ['earrings', 'cape', 'ring']
const LAYOUT_CENTER: EquipSlot[] = ['helmet', 'top', 'bottom', 'shoes']
const LAYOUT_RIGHT: EquipSlot[]  = ['weapon', 'gloves']

export default function CharacterBuilder({ data, char, setChar }: CharacterBuilderProps) {
  const [pickerSlot, setPickerSlot] = useState<EquipSlot | null>(null)
  const [scrollSlot, setScrollSlot] = useState<EquipSlot | null>(null)
  const [activeTab, setActiveTab] = useState<'equip' | 'skills'>('equip')

  const derived = useMemo(() => computeDerived(char, data), [char, data])

  function update(patch: Partial<CharacterState>) {
    const next = { ...char, ...patch }
    setChar(next)
    saveCharacter(next)
  }

  function setClass(className: string) {
    const def = CLASS_DEFS.find(c => c.name === className)!
    // Reset equipment that isn't usable by new class
    const newEquip: CharacterState['equipment'] = {}
    for (const [slot, eq] of Object.entries(char.equipment) as [EquipSlot, CharacterState['equipment'][EquipSlot]][]) {
      if (!eq) continue
      const item = data.equipById.get(eq.itemId)
      if (!item) continue
      if (item.stats.reqJob === 0 || (item.stats.reqJob & def.jobBit) !== 0) {
        newEquip[slot] = eq
      }
    }
    const base = def.baseStats
    update({
      className,
      equipment: newEquip,
      skills: {},
      activeBuffs: { rage: false, concentration: false, meditation: false },
      baseStats: {
        STR: base.STR ?? 4,
        DEX: base.DEX ?? 4,
        INT: base.INT ?? 4,
        LUK: base.LUK ?? 4,
        HP: char.baseStats.HP,
        MP: char.baseStats.MP,
      },
    })
  }

  function equipItem(slot: EquipSlot, itemId: number) {
    update({
      equipment: {
        ...char.equipment,
        [slot]: { itemId, scrolls: [] },
      }
    })
  }

  function clearSlot(slot: EquipSlot) {
    const next = { ...char.equipment }
    delete next[slot]
    update({ equipment: next })
  }

  function applyScrolls(slot: EquipSlot, scrolls: ScrollApplication[]) {
    const eq = char.equipment[slot]
    if (!eq) return
    update({
      equipment: {
        ...char.equipment,
        [slot]: { ...eq, scrolls },
      }
    })
  }

  function setStat(stat: keyof CharStats, value: number) {
    update({ baseStats: { ...char.baseStats, [stat]: Math.max(1, value) } })
  }

  function exportBuild() {
    const blob = new Blob([JSON.stringify(char, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${char.name || 'character'}-build.json`
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
  const scrollItem = scrollSlot ? char.equipment[scrollSlot] : undefined
  const scrollItemDef = scrollItem ? data.equipById.get(scrollItem.itemId) : undefined

  // Buffs available for this class
  const showRage   = ['Warrior','Fighter','Page','Spearman'].includes(char.className)
  const showConc   = ['Archer','Hunter','Crossbowman'].includes(char.className)
  const showMedit  = ['Magician','F/P Wizard','I/L Wizard','Cleric'].includes(char.className)

  return (
    <div className="space-y-4">
      {/* Top: Name, Class, Level */}
      <div className="bg-[#13161F] border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Name */}
          <div>
            <label className="text-xs uppercase tracking-widest text-[#5C5B57] block mb-1">Name</label>
            <input
              type="text"
              value={char.name}
              onChange={e => update({ name: e.target.value })}
              className="w-full bg-[#1A1E2A] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#E8E6E1] outline-none focus:border-[rgba(232,145,58,0.4)]"
              placeholder="Character name"
            />
          </div>
          {/* Level */}
          <div>
            <label className="text-xs uppercase tracking-widest text-[#5C5B57] block mb-1">Level</label>
            <input
              type="number"
              min={1} max={200}
              value={char.level}
              onChange={e => update({ level: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-full bg-[#1A1E2A] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#E8E6E1] outline-none focus:border-[rgba(232,145,58,0.4)]"
            />
          </div>
          {/* Export/Import */}
          <div className="flex flex-col justify-end gap-2">
            <button
              onClick={exportBuild}
              className="px-3 py-2 bg-[#1A1E2A] border border-[rgba(255,255,255,0.08)] rounded-lg text-xs text-[#8B8A85] hover:text-[#E8E6E1] hover:border-[rgba(255,255,255,0.2)] transition-colors"
            >
              Export Build
            </button>
            <label className="px-3 py-2 bg-[#1A1E2A] border border-[rgba(255,255,255,0.08)] rounded-lg text-xs text-[#8B8A85] hover:text-[#E8E6E1] hover:border-[rgba(255,255,255,0.2)] transition-colors cursor-pointer text-center">
              Import Build
              <input type="file" accept=".json" onChange={importBuild} className="hidden" />
            </label>
          </div>
        </div>

        {/* Class selector */}
        <div className="mt-4">
          <label className="text-xs uppercase tracking-widest text-[#5C5B57] block mb-2">Class</label>
          <div className="flex flex-wrap gap-2">
            {CLASS_GROUPS.map(group => (
              <div key={group.label} className="flex flex-wrap gap-1">
                {group.classes.map(cn => (
                  <button
                    key={cn}
                    onClick={() => setClass(cn)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
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

      {/* Main area: equip/skills tabs + stat panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Equipment/Skills */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tab toggle */}
          <div className="flex gap-1 bg-[#13161F] border border-[rgba(255,255,255,0.06)] rounded-xl p-1">
            {(['equip', 'skills'] as const).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === t
                    ? 'bg-[#1A1E2A] text-[#E8E6E1]'
                    : 'text-[#5C5B57] hover:text-[#8B8A85]'
                }`}
              >
                {t === 'equip' ? 'Equipment' : 'Skills'}
              </button>
            ))}
          </div>

          {activeTab === 'equip' && (
            <div className="bg-[#13161F] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 space-y-4">
              {/* Paper doll layout */}
              <div className="grid grid-cols-3 gap-3">
                {/* Left column */}
                <div className="space-y-3">
                  {LAYOUT_LEFT.map(slot => (
                    <EquipSlotButton
                      key={slot}
                      slot={slot}
                      equipped={char.equipment[slot]}
                      character={char}
                      totalStats={derived.totalStats}
                      data={data}
                      onClick={() => setPickerSlot(slot)}
                      onScrollClick={() => setScrollSlot(slot)}
                    />
                  ))}
                </div>

                {/* Center column */}
                <div className="space-y-3">
                  {LAYOUT_CENTER.map(slot => (
                    <EquipSlotButton
                      key={slot}
                      slot={slot}
                      equipped={char.equipment[slot]}
                      character={char}
                      totalStats={derived.totalStats}
                      data={data}
                      onClick={() => setPickerSlot(slot)}
                      onScrollClick={() => setScrollSlot(slot)}
                    />
                  ))}
                </div>

                {/* Right column */}
                <div className="space-y-3">
                  {LAYOUT_RIGHT.map(slot => (
                    <EquipSlotButton
                      key={slot}
                      slot={slot}
                      equipped={char.equipment[slot]}
                      character={char}
                      totalStats={derived.totalStats}
                      data={data}
                      onClick={() => setPickerSlot(slot)}
                      onScrollClick={() => setScrollSlot(slot)}
                    />
                  ))}
                </div>
              </div>

              {/* Buff toggles */}
              {(showRage || showConc || showMedit) && (
                <div className="border-t border-[rgba(255,255,255,0.06)] pt-4">
                  <div className="text-xs uppercase tracking-widest text-[#5C5B57] mb-2">Active Buffs</div>
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
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="bg-[#13161F] border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
              <SkillBuilder
                character={char}
                data={data}
                onChange={skills => update({ skills })}
              />
            </div>
          )}

          {/* Base stats editor */}
          <div className="bg-[#13161F] border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
            <h3 className="text-xs uppercase tracking-widest text-[#5C5B57] mb-3">Base Stats (AP Allocation)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(['STR','DEX','INT','LUK','HP','MP'] as (keyof CharStats)[]).map(stat => (
                <div key={stat}>
                  <label className="text-xs text-[#8B8A85] block mb-1">{stat}</label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setStat(stat, char.baseStats[stat] - 1)}
                      className="w-7 h-7 rounded bg-[#1A1E2A] text-[#8B8A85] hover:text-[#E8E6E1] text-sm leading-none"
                    >−</button>
                    <input
                      type="number"
                      value={char.baseStats[stat]}
                      onChange={e => setStat(stat, parseInt(e.target.value) || 1)}
                      className="flex-1 bg-[#1A1E2A] border border-[rgba(255,255,255,0.08)] rounded px-2 py-1 text-sm text-[#E8E6E1] text-center outline-none"
                    />
                    <button
                      onClick={() => setStat(stat, char.baseStats[stat] + 1)}
                      className="w-7 h-7 rounded bg-[#1A1E2A] text-[#8B8A85] hover:text-[#E8913A] text-sm leading-none"
                    >+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Stat Panel */}
        <div>
          <StatPanel character={char} derived={derived} />
        </div>
      </div>

      {/* Modals */}
      {pickerSlot && (
        <ItemPickerModal
          slot={pickerSlot}
          slotLabel={SLOT_LABELS[pickerSlot]}
          items={data.items}
          character={char}
          totalStats={derived.totalStats}
          onSelect={itemId => {
            // Detect slot from item's sub_category
            const item = data.equipById.get(itemId)
            const targetSlot = item ? (subCategoryToSlot(item.sub_category) ?? pickerSlot) : pickerSlot
            equipItem(targetSlot, itemId)
            setPickerSlot(null)
          }}
          onClear={() => { clearSlot(pickerSlot); setPickerSlot(null) }}
          onClose={() => setPickerSlot(null)}
          currentItemId={pickerItem?.itemId}
        />
      )}

      {scrollSlot && scrollItem && scrollItemDef && (
        <ScrollModal
          slotLabel={SLOT_LABELS[scrollSlot]}
          equipped={scrollItem}
          item={scrollItemDef}
          slotScrolls={data.scrollsBySlot.get(scrollItemDef.sub_category) ?? data.scrollsBySlot.get('Weapon') ?? []}
          onSave={scrolls => applyScrolls(scrollSlot, scrolls)}
          onClose={() => setScrollSlot(null)}
        />
      )}
    </div>
  )
}
