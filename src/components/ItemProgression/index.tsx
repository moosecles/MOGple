import { useState, useMemo } from 'react'
import type { CharacterState, DerivedStats, CharStats } from '../../types'
import type { AppData } from '../../types'
import { computeWeaponCandidates, computeArmorCandidates, type GearCandidate } from '../../engine/gear'
import { subCategoryToSlot } from '../../engine/character'
import { SCROLL_BONUSES } from '../../engine/damage'
import ItemIcon from '../common/ItemIcon'

interface ItemProgressionProps {
  data: AppData
  character: CharacterState
  derived: DerivedStats
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function computeMissingText(
  item: import('../../types').Item,
  totalStats: CharStats,
  charLevel: number
): string {
  const parts: string[] = []
  if (item.stats.reqLevel > charLevel) parts.push(`Lv.${item.stats.reqLevel} required`)
  const s = item.stats.reqSTR - totalStats.STR; if (s > 0) parts.push(`+${s} STR`)
  const d = item.stats.reqDEX - totalStats.DEX; if (d > 0) parts.push(`+${d} DEX`)
  const i = item.stats.reqINT - totalStats.INT; if (i > 0) parts.push(`+${i} INT`)
  const l = item.stats.reqLUK - totalStats.LUK; if (l > 0) parts.push(`+${l} LUK`)
  return parts.join(' · ')
}

// Shared chip component for stat badges
function StatChip({ children, color = 'default' }: { children: React.ReactNode; color?: 'blue' | 'orange' | 'green' | 'purple' | 'red' | 'yellow' | 'teal' | 'default' }) {
  const styles: Record<string, string> = {
    blue:    'bg-[rgba(90,157,232,0.1)] text-[#5A9DE8] border-[rgba(90,157,232,0.2)]',
    orange:  'bg-[rgba(232,145,58,0.1)] text-[#E8913A] border-[rgba(232,145,58,0.25)]',
    green:   'bg-[rgba(90,196,126,0.08)] text-[#5AC47E] border-[rgba(90,196,126,0.15)]',
    purple:  'bg-[rgba(156,122,232,0.08)] text-[#9C7AE8] border-[rgba(156,122,232,0.15)]',
    red:     'bg-[rgba(232,90,90,0.08)] text-[#E87A7A] border-[rgba(232,90,90,0.15)]',
    yellow:  'bg-[rgba(232,215,90,0.08)] text-[#E8D75A] border-[rgba(232,215,90,0.15)]',
    teal:    'bg-[rgba(90,157,196,0.08)] text-[#5A9DC4] border-[rgba(90,157,196,0.15)]',
    default: 'bg-[rgba(255,255,255,0.04)] text-[#8B8A85] border-[rgba(255,255,255,0.08)]',
  }
  return (
    <span className={`inline-flex items-center px-1.5 py-0 rounded border text-[9px] leading-4 whitespace-nowrap ${styles[color]}`}>
      {children}
    </span>
  )
}

function ItemStatChips({ item }: { item: import('../../types').Item }) {
  return (
    <div className="flex flex-wrap gap-1 mt-0.5">
      {item.stats.reqLevel > 0 && <StatChip color="blue">Lv.{item.stats.reqLevel}</StatChip>}
      {item.weapon_type && <StatChip color="orange">{item.weapon_type}</StatChip>}
      {item.attack_speed_label && <StatChip color="default">{item.attack_speed_label}</StatChip>}
      {(item.stats.incPAD ?? 0) > 0 && <StatChip color="orange">+{item.stats.incPAD} ATK</StatChip>}
      {(item.stats.incMAD ?? 0) > 0 && <StatChip color="purple">+{item.stats.incMAD} M.ATK</StatChip>}
      {item.stats.incSTR ? <StatChip color="red">+{item.stats.incSTR} STR</StatChip> : null}
      {item.stats.incDEX ? <StatChip color="green">+{item.stats.incDEX} DEX</StatChip> : null}
      {item.stats.incINT ? <StatChip color="purple">+{item.stats.incINT} INT</StatChip> : null}
      {item.stats.incLUK ? <StatChip color="yellow">+{item.stats.incLUK} LUK</StatChip> : null}
      {item.stats.incACC ? <StatChip color="teal">+{item.stats.incACC} ACC</StatChip> : null}
      {item.stats.incPDD ? <StatChip color="default">+{item.stats.incPDD} DEF</StatChip> : null}
      {item.stats.incMHP ? <StatChip color="red">+{item.stats.incMHP} HP</StatChip> : null}
      {item.stats.tuc > 0 && <StatChip color="default">{item.stats.tuc} slots</StatChip>}
    </div>
  )
}

// ─── Weapon card ──────────────────────────────────────────────────────────────

function WeaponCard({
  candidate, isCurrent, rank, totalStats, charLevel
}: {
  candidate: GearCandidate
  isCurrent: boolean
  rank: number
  totalStats: CharStats
  charLevel: number
}) {
  const [expanded, setExpanded] = useState(false)
  const { item, scrollScenarios, eds, meetsRequirements, deltaFromCurrent, baseATK } = candidate
  const missingText = !meetsRequirements ? computeMissingText(item, totalStats, charLevel) : ''

  return (
    <div className={`bg-[#13161F] border rounded-xl p-3 transition-all ${
      isCurrent ? 'border-[rgba(232,145,58,0.4)]' :
      rank === 1 && !isCurrent ? 'border-[rgba(90,196,126,0.3)]' :
      'border-[rgba(255,255,255,0.06)]'
    }`}>
      <div className="flex items-start gap-3">
        <ItemIcon thumbnail={item.thumbnail} name={item.name} size="md" className="mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-1.5 mb-1">
            <span className="text-xs text-[#5C5B57]">#{rank}</span>
            <span className={`text-sm font-semibold ${isCurrent ? 'text-[#E8913A]' : 'text-[#E8E6E1]'}`}>
              {item.name}
            </span>
            {isCurrent && <StatChip color="orange">equipped</StatChip>}
            {rank === 1 && !isCurrent && meetsRequirements && <StatChip color="green">UPGRADE</StatChip>}
          </div>

          <ItemStatChips item={item} />
          {/* Base ATK callout (not already in chips for the base value context) */}
          <div className="text-[10px] text-[#5C5B57] mt-0.5">
            {baseATK} ATK base
          </div>

          {/* Missing requirements — specific */}
          {!meetsRequirements && missingText && (
            <div className="mt-1 flex items-center gap-1">
              <span className="text-[9px] text-[#E85A5A]">Need:</span>
              {missingText.split(' · ').map(r => (
                <StatChip key={r} color="red">{r}</StatChip>
              ))}
            </div>
          )}

          {/* Damage delta */}
          <div className={`text-xs font-medium mt-1 ${deltaFromCurrent > 0 ? 'text-[#5AC47E]' : deltaFromCurrent < 0 ? 'text-[#E85A5A]' : 'text-[#5C5B57]'}`}>
            {deltaFromCurrent > 0 ? '+' : ''}{Math.round(deltaFromCurrent)} avg dmg vs current
          </div>
        </div>
        {/* EDS */}
        <div className="text-right shrink-0">
          <div className="text-sm font-semibold text-[#E8913A]">{Math.round(eds.expected)}</div>
          <div className="text-[9px] text-[#5C5B57]">avg dmg</div>
        </div>
      </div>

      {/* Scroll scenarios */}
      <div className="mt-2 space-y-0.5">
        {scrollScenarios.slice(0, expanded ? undefined : 2).map(s => (
          <div key={s.label} className="flex justify-between text-[10px]">
            <span className="text-[#5C5B57]">{s.label}</span>
            <span className="text-[#E8E6E1]">
              {s.expectedATK > 0 ? <span className="text-[#E8913A]">{s.expectedATK} ATK </span> : null}
              {Math.round(s.expectedDamageAvg).toLocaleString()} dmg
            </span>
          </div>
        ))}
      </div>
      {scrollScenarios.length > 2 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] text-[#5C5B57] hover:text-[#8B8A85] mt-1 transition-colors"
        >
          {expanded ? '▲ less' : `▼ +${scrollScenarios.length - 2} more scenarios`}
        </button>
      )}
    </div>
  )
}

// ─── Armor card ───────────────────────────────────────────────────────────────

function ArmorCard({
  candidate, totalStats, charLevel, currentStatContrib
}: {
  candidate: GearCandidate
  totalStats: CharStats
  charLevel: number
  currentStatContrib: { max: number; min: number; avg: number }
}) {
  const { item, meetsRequirements } = candidate
  const missingText = !meetsRequirements ? computeMissingText(item, totalStats, charLevel) : ''

  const deltaMax = candidate.statContrib.max - currentStatContrib.max
  const deltaMin = candidate.statContrib.min - currentStatContrib.min
  const hasWeapon = currentStatContrib.max > 0 || candidate.statContrib.max > 0

  return (
    <div className={`bg-[#13161F] border rounded-xl p-3 flex items-start gap-3 ${
      meetsRequirements ? 'border-[rgba(255,255,255,0.06)]' : 'border-[rgba(255,255,255,0.04)] opacity-70'
    }`}>
      <ItemIcon thumbnail={item.thumbnail} name={item.name} size="sm" className="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-[#E8E6E1] truncate">{item.name}</span>
          {!meetsRequirements && (
            <StatChip color="blue">Lv.{item.stats.reqLevel} req</StatChip>
          )}
        </div>
        <ItemStatChips item={item} />
        {!meetsRequirements && missingText && (
          <div className="flex items-center gap-1 flex-wrap mt-1">
            <span className="text-[9px] text-[#E85A5A]">Need:</span>
            {missingText.split(' · ').map(r => (
              <StatChip key={r} color="red">{r}</StatChip>
            ))}
          </div>
        )}
        {/* Damage delta */}
        {hasWeapon && (
          <div className={`text-[10px] mt-1 font-medium ${deltaMax > 0 ? 'text-[#5AC47E]' : deltaMax < 0 ? 'text-[#E85A5A]' : 'text-[#5C5B57]'}`}>
            {deltaMax > 0 ? '+' : ''}{deltaMax.toFixed(1)} max dmg
            {' / '}
            {deltaMin > 0 ? '+' : ''}{deltaMin.toFixed(1)} min dmg
            <span className="text-[#3C3C3A] font-normal ml-1">(vs current)</span>
          </div>
        )}
        {!hasWeapon && (
          <div className="text-[10px] text-[#3C3C3A] mt-1">Equip a weapon to see damage impact</div>
        )}
      </div>
    </div>
  )
}

// ─── Collapsible slot section ─────────────────────────────────────────────────

function SlotSection({
  title, accent, children
}: { title: string; accent?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <section>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 mb-3 group"
      >
        <span className={`text-xs uppercase tracking-widest font-semibold ${accent ?? 'text-[#8B8A85]'}`}>
          {title}
        </span>
        <span className="text-[#5C5B57] text-xs group-hover:text-[#8B8A85] transition-colors">
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && children}
    </section>
  )
}

// ─── Armor slot panel ─────────────────────────────────────────────────────────

const ARMOR_SLOT_DEFS: { label: string; subCat: string }[] = [
  { label: 'Hat',      subCat: 'Cap'       },
  { label: 'Top',      subCat: 'Coat'      },
  { label: 'Overall',  subCat: 'Longcoat'  },
  { label: 'Bottom',   subCat: 'Pants'     },
  { label: 'Gloves',   subCat: 'Glove'     },
  { label: 'Shoes',    subCat: 'Shoes'     },
  { label: 'Cape',     subCat: 'Cape'      },
  { label: 'Earrings', subCat: 'Accessory' },
  { label: 'Shield',   subCat: 'Shield'    },
]

function ArmorSlotPanel({
  label, subCat, items, character, derived
}: {
  label: string
  subCat: string
  items: import('../../types').Item[]
  character: CharacterState
  derived: DerivedStats
}) {
  const [open, setOpen] = useState(true)

  // Find currently equipped item for this slot
  const equipSlot = subCategoryToSlot(subCat)
  const currentArmorId = equipSlot ? character.equipment[equipSlot]?.itemId : undefined

  const allCandidates = useMemo(
    () => computeArmorCandidates(items, character, derived, subCat),
    [items, character, derived, subCat]
  )

  // Get current item's stats for comparison
  const currentCandidate = allCandidates.find(c => c.item.id === currentArmorId)
  const currentItemEds = currentCandidate?.eds.expected ?? 0
  const currentItemReqLevel = currentCandidate?.item.stats.reqLevel ?? 0
  const currentStatContrib = currentCandidate?.statContrib ?? { max: 0, min: 0, avg: 0 }

  const candidates = useMemo(
    () => {
      const filtered = allCandidates.filter(c =>
        c.item.id !== currentArmorId &&
        c.item.stats.reqLevel >= currentItemReqLevel &&
        (c.item.stats.reqLevel > currentItemReqLevel || c.eds.expected > currentItemEds)
      )

      // Equippable upgrades at current level tier (best 1)
      const equippable = filtered
        .filter(c => c.meetsRequirements)
        .sort((a, b) => b.eds.expected - a.eds.expected)
        .slice(0, 1)

      // Future tier items — best item per level bracket (nearest 3 brackets)
      const futureByLevel = new Map<number, GearCandidate>()
      for (const c of filtered.filter(c => !c.meetsRequirements)) {
        const existing = futureByLevel.get(c.item.stats.reqLevel)
        if (!existing || c.eds.expected > existing.eds.expected) {
          futureByLevel.set(c.item.stats.reqLevel, c)
        }
      }
      const future = Array.from(futureByLevel.values())
        .sort((a, b) => a.item.stats.reqLevel - b.item.stats.reqLevel)
        .slice(0, 3)

      return [...equippable, ...future]
    },
    [allCandidates, currentArmorId, currentItemEds, currentItemReqLevel]
  )
  if (candidates.length === 0) return null

  return (
    <div className="border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-[#191D28] transition-colors"
      >
        <span className="font-medium text-[#E8E6E1]">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#5C5B57]">{candidates.length} suggestions</span>
          {candidates[0] && (
            <span className="text-xs text-[#8B8A85] truncate max-w-[120px]">{candidates[0].item.name}</span>
          )}
          <span className="text-[#5C5B57] text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2 bg-[#0C0E14]">
          {candidates.map(c => (
            <ArmorCard
              key={c.item.id}
              candidate={c}
              totalStats={derived.totalStats}
              charLevel={character.level}
              currentStatContrib={currentStatContrib}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ItemProgression({ data, character, derived }: ItemProgressionProps) {
  // GM items are filtered at load time in loaders.ts — data.items is already clean
  const currentWeaponId = character.equipment.weapon?.itemId

  // computeWeaponCandidates uses SKILL_WEAPON_TYPES internally for class-appropriate filtering
  const weaponCandidates = useMemo(
    () => computeWeaponCandidates(data.items, character, derived)
      .filter(c => c.item.id !== currentWeaponId)
      .slice(0, 3),
    [data.items, character, derived, currentWeaponId]
  )

  const hasOverall = !!(character.equipment.top && data.equipById.get(character.equipment.top.itemId)?.sub_category === 'Longcoat')
  const currentWeaponItem = currentWeaponId ? data.equipById.get(currentWeaponId) : undefined
  const currentScrolledATK = (character.equipment.weapon?.scrolls ?? [])
    .filter(b => b.stat === 'Attack')
    .reduce((sum, b) => sum + b.hits * (SCROLL_BONUSES[b.tier]?.['Attack'] ?? 0), 0)
  const effectiveATK = (currentWeaponItem?.stats.incPAD ?? 0) + currentScrolledATK

  const isMage = ['Magician','F/P Wizard','I/L Wizard','Cleric'].includes(character.className)

  const topUpgrade = weaponCandidates.find(c => c.item.id !== currentWeaponId && c.meetsRequirements)
  const scrollAdvice = useMemo(() => {
    if (!currentWeaponItem || !topUpgrade) return null
    const scrollsUsed = (character.equipment.weapon?.scrolls ?? []).reduce((s, b) => s + b.attempts, 0)
    const slotsLeft = (currentWeaponItem.stats.tuc ?? 0) - scrollsUsed
    const cleanUpgradeATK = topUpgrade.baseATK
    const neededATK = cleanUpgradeATK - effectiveATK
    const neededSuccesses = neededATK > 0 ? Math.ceil(neededATK / 2) : 0
    return { topUpgrade, neededSuccesses, slotsLeft, effectiveATK, cleanUpgradeATK }
  }, [currentWeaponItem, topUpgrade, effectiveATK, character.equipment.weapon])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#13161F] border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
        <div className="text-[10px] uppercase tracking-widest text-[#5C5B57] mb-1">Item Progression</div>
        <p className="text-sm text-[#8B8A85]">
          Ranked by expected damage for your <span className="text-[#E8E6E1]">{character.className}</span> at level {character.level}.
          {isMage && <span className="text-[#9C7AE8]"> Magic damage formula is unconfirmed — guesstimated from CBT data.</span>}
        </p>
      </div>

      {/* Weapon section */}
      <SlotSection title="Weapon Upgrades" accent="text-[#E8913A]">
        {/* Current weapon summary */}
        {currentWeaponItem && (
          <div className="bg-[#1A1E2A] border border-[rgba(255,255,255,0.06)] rounded-xl p-3 mb-3">
            <div className="flex items-center gap-3">
              <ItemIcon thumbnail={currentWeaponItem.thumbnail} name={currentWeaponItem.name} size="md" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#E8E6E1]">{currentWeaponItem.name}</div>
                <div className="text-xs text-[#8B8A85] mt-0.5">
                  {currentWeaponItem.stats.incPAD ?? 0} ATK base
                  {currentScrolledATK > 0 && <span className="text-[#5AC47E]"> +{currentScrolledATK} scrolled</span>}
                  {' → '}
                  <span className="text-[#E8913A] font-semibold">{effectiveATK} ATK effective</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-[#E8E6E1]">{Math.floor(derived.damageRange.avg).toLocaleString()}</div>
                <div className="text-[10px] text-[#5C5B57]">avg dmg</div>
              </div>
            </div>
            {scrollAdvice && scrollAdvice.neededSuccesses > 0 && (
              <div className="mt-2 pt-2 border-t border-[rgba(255,255,255,0.06)] text-xs text-[#8B8A85]">
                To beat <span className="text-[#E8E6E1]">{scrollAdvice.topUpgrade.item.name}</span>{' '}
                (clean {scrollAdvice.cleanUpgradeATK} ATK): need ~{scrollAdvice.neededSuccesses} more{' '}
                Intermediate scroll hits from {scrollAdvice.slotsLeft} slots remaining.
              </div>
            )}
            {scrollAdvice && scrollAdvice.neededSuccesses <= 0 && (
              <div className="mt-2 pt-2 border-t border-[rgba(255,255,255,0.06)] text-xs text-[#5AC47E]">
                Your current weapon already beats or matches the next upgrade clean!
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          {weaponCandidates.length === 0 ? (
            <p className="text-sm text-[#5C5B57] py-6 text-center">No weapons available for {character.className}</p>
          ) : (
            weaponCandidates.map((c, i) => (
              <WeaponCard
                key={c.item.id}
                candidate={c}
                isCurrent={false}
                rank={i + 1}
                totalStats={derived.totalStats}
                charLevel={character.level}
              />
            ))
          )}
        </div>
      </SlotSection>

      {/* Armor section — per-slot collapsible panels */}
      <SlotSection title="Armor Upgrades" accent="text-[#5A9DE8]">
        <div className="space-y-2">
          {ARMOR_SLOT_DEFS
            .filter(s => {
              // When an Overall (Longcoat) is equipped, hide Top and Bottom slot suggestions
              if (hasOverall && (s.subCat === 'Coat' || s.subCat === 'Pants')) return false
              return true
            })
            .map(s => (
              <ArmorSlotPanel
                key={s.subCat}
                label={s.label}
                subCat={s.subCat}
                items={data.items}
                character={character}
                derived={derived}
              />
            ))}
        </div>
      </SlotSection>
    </div>
  )
}
