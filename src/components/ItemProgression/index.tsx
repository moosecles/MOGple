import { useState, useMemo } from 'react'
import type { CharacterState, DerivedStats } from '../../types'
import type { AppData } from '../../types'
import { computeWeaponCandidates, computeArmorCandidates, GearCandidate } from '../../engine/gear'

interface ItemProgressionProps {
  data: AppData
  character: CharacterState
  derived: DerivedStats
}

function WeaponCard({ candidate, isCurrent, rank }: { candidate: GearCandidate; isCurrent: boolean; rank: number }) {
  const [expanded, setExpanded] = useState(false)
  const { item, scrollScenarios, eds, meetsRequirements, deltaFromCurrent } = candidate

  return (
    <div className={`bg-[#13161F] border rounded-xl p-4 ${isCurrent ? 'border-[rgba(232,145,58,0.4)]' : 'border-[rgba(255,255,255,0.06)]'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[#5C5B57]">#{rank}</span>
            <h3 className="text-sm font-semibold text-[#E8E6E1]">{item.name}</h3>
            {isCurrent && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(232,145,58,0.15)] text-[#E8913A] border border-[rgba(232,145,58,0.3)]">equipped</span>}
            {rank === 1 && !isCurrent && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(90,196,126,0.15)] text-[#5AC47E] border border-[rgba(90,196,126,0.3)]">RECOMMENDED</span>}
            {!meetsRequirements && <span className="text-[10px] text-[#E85A5A]">req not met</span>}
          </div>
          <div className="text-xs text-[#5C5B57] mt-0.5 flex gap-2">
            <span>Lv.{item.stats.reqLevel}</span>
            <span>{item.weapon_type}</span>
            <span>{item.attack_speed_label}</span>
            <span>{item.stats.tuc} slots</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-semibold text-[#E8913A]">{candidate.baseATK} ATK</div>
          <div className={`text-xs ${deltaFromCurrent > 0 ? 'text-[#5AC47E]' : deltaFromCurrent < 0 ? 'text-[#E85A5A]' : 'text-[#5C5B57]'}`}>
            {deltaFromCurrent > 0 ? '+' : ''}{Math.round(deltaFromCurrent)} dmg
          </div>
        </div>
      </div>

      {/* Scroll scenarios preview */}
      <div className="space-y-1 mb-3">
        {scrollScenarios.slice(0, expanded ? undefined : 2).map(s => (
          <div key={s.label} className="flex items-center justify-between text-xs">
            <span className="text-[#5C5B57]">{s.label}:</span>
            <span className="text-[#E8E6E1]">
              {s.expectedATK > 0 ? `${s.expectedATK} ATK → ` : ''}
              {Math.round(s.expectedDamageAvg).toLocaleString()} avg dmg
            </span>
          </div>
        ))}
      </div>

      {/* EDS range */}
      <div className="flex gap-3 text-xs text-[#5C5B57]">
        <span>Floor: <span className="text-[#E8E6E1]">{Math.round(eds.floor)}</span></span>
        <span>Expected: <span className="text-[#E8913A]">{Math.round(eds.expected)}</span></span>
        <span>Ceiling: <span className="text-[#5AC47E]">{Math.round(eds.ceiling)}</span></span>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-[#5C5B57] hover:text-[#8B8A85] transition-colors mt-2"
      >
        {expanded ? '▲ Less' : '▼ All scenarios'}
      </button>
    </div>
  )
}

function ArmorCard({ candidate }: { candidate: GearCandidate }) {
  const { item, eds, meetsRequirements } = candidate
  return (
    <div className={`bg-[#13161F] border rounded-xl p-3 ${meetsRequirements ? 'border-[rgba(255,255,255,0.06)]' : 'border-[rgba(255,255,255,0.04)] opacity-60'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[#E8E6E1] truncate">{item.name}</div>
          <div className="text-xs text-[#5C5B57] flex flex-wrap gap-2 mt-0.5">
            <span>Lv.{item.stats.reqLevel}</span>
            {item.stats.incSTR ? <span>+{item.stats.incSTR} STR</span> : null}
            {item.stats.incDEX ? <span>+{item.stats.incDEX} DEX</span> : null}
            {item.stats.incINT ? <span>+{item.stats.incINT} INT</span> : null}
            {item.stats.incLUK ? <span>+{item.stats.incLUK} LUK</span> : null}
            {item.stats.incPDD ? <span>+{item.stats.incPDD} DEF</span> : null}
            {item.stats.incACC ? <span>+{item.stats.incACC} ACC</span> : null}
            {item.stats.tuc > 0 ? <span>{item.stats.tuc} slots</span> : null}
          </div>
        </div>
        <div className="text-xs text-right shrink-0">
          <div className="text-[#E8913A]">{Math.round(eds.expected)} dmg val</div>
          {!meetsRequirements && <div className="text-[#E85A5A]">req not met</div>}
        </div>
      </div>
    </div>
  )
}

const ARMOR_SLOTS: { key: string; label: string; subCat: string }[] = [
  { key: 'Hat',      label: 'Hat',      subCat: 'Hat' },
  { key: 'Top',      label: 'Top',      subCat: 'Top' },
  { key: 'Bottom',   label: 'Bottom',   subCat: 'Bottom' },
  { key: 'Gloves',   label: 'Gloves',   subCat: 'Gloves' },
  { key: 'Shoes',    label: 'Shoes',    subCat: 'Shoes' },
  { key: 'Cape',     label: 'Cape',     subCat: 'Cape' },
]

export default function ItemProgression({ data, character, derived }: ItemProgressionProps) {
  const [armorSlot, setArmorSlot] = useState('Hat')

  const weaponCandidates = useMemo(
    () => computeWeaponCandidates(data.items, character, derived).slice(0, 15),
    [data.items, character, derived]
  )

  const armorCandidates = useMemo(
    () => computeArmorCandidates(data.items, character, derived, armorSlot).slice(0, 20),
    [data.items, character, derived, armorSlot]
  )

  const currentWeaponId = character.equipment.weapon?.itemId
  const currentWeaponItem = currentWeaponId ? data.equipById.get(currentWeaponId) : undefined

  // Scroll advice for current weapon
  const scrollAdvice = useMemo(() => {
    if (!currentWeaponItem) return null
    const slots = currentWeaponItem.stats.tuc
    if (slots === 0) return null
    const scrolledCount = character.equipment.weapon?.scrolls.filter(s => s.success).length ?? 0
    const currentBonusATK = scrolledCount * 2 // approximate: intermediate avg
    const slotsLeft = slots - (character.equipment.weapon?.scrolls.length ?? 0)

    // Find best upgrade and breakeven
    const upgrade = weaponCandidates.find(c => !c.meetsRequirements === false && c.item.id !== currentWeaponId)
    if (!upgrade) return null

    const cleanUpgradeATK = upgrade.baseATK
    const currentEffATK = (currentWeaponItem.stats.incPAD ?? 0) + currentBonusATK
    const neededATK = cleanUpgradeATK - currentEffATK
    const neededSuccesses = neededATK > 0 ? Math.ceil(neededATK / 2) : 0

    return { upgrade, neededSuccesses, slotsLeft, currentEffATK, cleanUpgradeATK, scrolledCount, slots }
  }, [currentWeaponItem, weaponCandidates, currentWeaponId, character.equipment.weapon])

  return (
    <div className="space-y-6">
      {/* Context */}
      <div className="bg-[#13161F] border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
        <h2 className="text-xs uppercase tracking-widest text-[#5C5B57] mb-1">Item Progression</h2>
        <p className="text-sm text-[#8B8A85]">
          Ranked by expected damage output for your {character.className} at level {character.level}.
        </p>
      </div>

      {/* Weapon Upgrades */}
      <section>
        <h2 className="text-xs uppercase tracking-widest text-[#E8913A] mb-3">Weapon Upgrades</h2>

        {currentWeaponItem && (
          <div className="bg-[#1A1E2A] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 mb-4 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[#8B8A85]">Current weapon:</span>
              <span className="text-[#E8E6E1] font-medium">{currentWeaponItem.name}</span>
              <span className="text-[#5C5B57]">({currentWeaponItem.stats.incPAD ?? 0} ATK base)</span>
            </div>
            {scrollAdvice && (
              <div className="space-y-1 text-xs text-[#8B8A85]">
                <div>
                  Scrolled {scrollAdvice.scrolledCount}/{scrollAdvice.slots} → {scrollAdvice.currentEffATK} ATK effective
                </div>
                {scrollAdvice.neededSuccesses > 0 ? (
                  <div>
                    To beat <span className="text-[#E8E6E1]">{scrollAdvice.upgrade.item.name}</span> (clean {scrollAdvice.cleanUpgradeATK} ATK):
                    need ~{scrollAdvice.neededSuccesses} more Intermediate successes from {scrollAdvice.slotsLeft} slots left
                  </div>
                ) : (
                  <div className="text-[#5AC47E]">Your current weapon already beats the next upgrade clean!</div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          {weaponCandidates.length === 0 && (
            <p className="text-sm text-[#5C5B57] py-8 text-center">No weapons found for this class</p>
          )}
          {weaponCandidates.map((c, i) => (
            <WeaponCard
              key={c.item.id}
              candidate={c}
              isCurrent={c.item.id === currentWeaponId}
              rank={i + 1}
            />
          ))}
        </div>
      </section>

      {/* Armor Upgrades */}
      <section>
        <h2 className="text-xs uppercase tracking-widest text-[#5A9DE8] mb-3">Armor Upgrades</h2>

        <div className="flex flex-wrap gap-1 mb-4">
          {ARMOR_SLOTS.map(s => (
            <button
              key={s.key}
              onClick={() => setArmorSlot(s.subCat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                armorSlot === s.subCat
                  ? 'bg-[rgba(90,157,232,0.2)] text-[#5A9DE8] border border-[rgba(90,157,232,0.3)]'
                  : 'bg-[#1A1E2A] text-[#5C5B57] border border-[rgba(255,255,255,0.06)] hover:text-[#8B8A85]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {armorCandidates.length === 0 && (
            <p className="text-sm text-[#5C5B57] py-4 text-center">No items found for this slot</p>
          )}
          {armorCandidates.map(c => (
            <ArmorCard key={c.item.id} candidate={c} />
          ))}
        </div>
      </section>
    </div>
  )
}
