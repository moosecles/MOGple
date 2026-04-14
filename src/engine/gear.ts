import type { Item, CharacterState, DerivedStats } from '../types'
import { calcDamage, getStatConfig } from './damage'

export interface ScrollScenario {
  label: string
  expectedATK: number
  expectedDamageAvg: number
}

export interface GearCandidate {
  item: Item
  baseATK: number
  scrollScenarios: ScrollScenario[]
  eds: { floor: number; ceiling: number; expected: number }
  meetsRequirements: boolean
  levelToEquip: number
  deltaFromCurrent: number  // expected damage avg diff vs current
}

function expectedSuccesses(slots: number, rate: number): number {
  return slots * rate
}

export function computeWeaponCandidates(
  items: Item[],
  char: CharacterState,
  derived: DerivedStats
): GearCandidate[] {
  const config = getStatConfig(char.className)
  const isMage = config.isMagic

  // Filter to weapons usable by this class
  const { className } = char
  const classDef = (() => {
    // Import-free: inline job bits
    const jobBits: Record<string, number> = {
      Warrior: 1, Fighter: 1, Page: 1, Spearman: 1,
      Magician: 2, 'F/P Wizard': 2, 'I/L Wizard': 2, Cleric: 2,
      Archer: 4, Hunter: 4, Crossbowman: 4,
      Rogue: 8, Assassin: 8, Bandit: 8,
      Beginner: 0,
    }
    return jobBits[className] ?? 0
  })()

  const weapons = items.filter(item => {
    if (item.sub_category !== 'Weapon') return false
    if (item.stats.reqJob !== 0 && (item.stats.reqJob & classDef) === 0) return false
    return true
  })

  const candidates: GearCandidate[] = []

  for (const item of weapons) {
    const baseATK = isMage ? (item.stats.incMAD ?? 0) : (item.stats.incPAD ?? 0)
    const slots = item.stats.tuc ?? 0
    const weaponType = item.weapon_type ?? ''

    function damageWith(atkVal: number): number {
      return calcDamage({
        className: char.className,
        stats: derived.totalStats,
        weaponType,
        weaponATK: isMage ? derived.weaponATK : atkVal,
        weaponMAD: isMage ? atkVal : derived.weaponMAD,
        flatAttackPower: derived.flatAttackPower,
        mastery: derived.mastery,
        skillPercent: 1.0,
      }).avg
    }

    const cleanATK = baseATK
    const lesserATK = baseATK + slots * 1
    const intermediateATK = baseATK + Math.round(expectedSuccesses(slots, 0.60)) * 2
    const greaterMixedATK = baseATK + Math.min(2, slots) * Math.round(0.10 * 3) + Math.max(0, slots - 2) * Math.round(0.60 * 2)

    const scenarios: ScrollScenario[] = [
      { label: 'Clean (no scrolls)',              expectedATK: cleanATK,        expectedDamageAvg: damageWith(cleanATK) },
      { label: 'All Lesser (safe)',               expectedATK: lesserATK,       expectedDamageAvg: damageWith(lesserATK) },
      { label: 'All Intermediate (avg)',          expectedATK: intermediateATK, expectedDamageAvg: damageWith(intermediateATK) },
      { label: '2 Greater + rest Intermediate',  expectedATK: greaterMixedATK, expectedDamageAvg: damageWith(greaterMixedATK) },
    ]

    const meetsRequirements =
      item.stats.reqLevel <= char.level &&
      item.stats.reqSTR <= derived.totalStats.STR &&
      item.stats.reqDEX <= derived.totalStats.DEX &&
      item.stats.reqINT <= derived.totalStats.INT &&
      item.stats.reqLUK <= derived.totalStats.LUK

    const currentDamageAvg = derived.damageRange.avg
    const expectedDmg = scenarios[2].expectedDamageAvg

    candidates.push({
      item,
      baseATK,
      scrollScenarios: scenarios,
      eds: {
        floor: scenarios[0].expectedDamageAvg,
        expected: scenarios[2].expectedDamageAvg,
        ceiling: scenarios[3].expectedDamageAvg,
      },
      meetsRequirements,
      levelToEquip: item.stats.reqLevel,
      deltaFromCurrent: expectedDmg - currentDamageAvg,
    })
  }

  return candidates.sort((a, b) => b.eds.expected - a.eds.expected)
}

export function computeArmorCandidates(
  items: Item[],
  char: CharacterState,
  derived: DerivedStats,
  slot: string
): GearCandidate[] {
  const config = getStatConfig(char.className)
  const isMage = config.isMagic

  const classDef = (() => {
    const jobBits: Record<string, number> = {
      Warrior: 1, Fighter: 1, Page: 1, Spearman: 1,
      Magician: 2, 'F/P Wizard': 2, 'I/L Wizard': 2, Cleric: 2,
      Archer: 4, Hunter: 4, Crossbowman: 4,
      Rogue: 8, Assassin: 8, Bandit: 8,
      Beginner: 0,
    }
    return jobBits[char.className] ?? 0
  })()

  const slotItems = items.filter(item => {
    if (item.sub_category !== slot) return false
    if (item.stats.reqJob !== 0 && (item.stats.reqJob & classDef) === 0) return false
    return true
  })

  const wATK = derived.weaponATK
  const mult = config.weaponMult(derived.weaponType)

  function statDamageValue(item: Item): number {
    const s = item.stats
    let val = 0
    // Primary stat contribution
    const primaryIsSTR = ['Warrior','Fighter','Page','Spearman','Beginner'].includes(char.className)
    const primaryIsDEX = ['Archer','Hunter','Crossbowman'].includes(char.className)
    const primaryIsINT = ['Magician','F/P Wizard','I/L Wizard','Cleric'].includes(char.className)
    const primaryIsLUK = ['Rogue','Assassin','Bandit'].includes(char.className)

    if (s.incSTR) val += s.incSTR * (primaryIsSTR ? mult : 1) * wATK / 100
    if (s.incDEX) val += s.incDEX * (primaryIsDEX ? mult : 1) * wATK / 100
    if (s.incINT) val += s.incINT * (primaryIsINT ? (isMage ? 1 : 0) : 0) * wATK / 100
    if (s.incLUK) val += s.incLUK * (primaryIsLUK ? mult : 1) * wATK / 100
    if (s.incPAD && !isMage) val += s.incPAD * wATK / 100
    if (s.incMAD && isMage)  val += s.incMAD * wATK / 100
    return val
  }

  const candidates: GearCandidate[] = slotItems.map(item => {
    const dmgVal = statDamageValue(item)
    const meetsRequirements =
      item.stats.reqLevel <= char.level &&
      item.stats.reqSTR <= derived.totalStats.STR &&
      item.stats.reqDEX <= derived.totalStats.DEX &&
      item.stats.reqINT <= derived.totalStats.INT &&
      item.stats.reqLUK <= derived.totalStats.LUK

    const scenarios: ScrollScenario[] = [
      { label: 'Clean', expectedATK: 0, expectedDamageAvg: dmgVal },
    ]

    return {
      item,
      baseATK: item.stats.incPAD ?? 0,
      scrollScenarios: scenarios,
      eds: { floor: dmgVal, expected: dmgVal, ceiling: dmgVal },
      meetsRequirements,
      levelToEquip: item.stats.reqLevel,
      deltaFromCurrent: 0,
    }
  })

  return candidates.sort((a, b) => b.eds.expected - a.eds.expected)
}
