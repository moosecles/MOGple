import type { CharacterState, CharStats, DerivedStats, EquippedItem, EquipSlot, Item, ScrollTier } from '../types'
import type { AppData } from '../types'
import { calcDamage, computeMastery, computeAccuracy, SCROLL_BONUSES } from './damage'

// ─── Config ────────────────────────────────────────────────────────────────────

/** Change this to adjust the max character level. */
export const MAX_LEVEL = 50

// ─── Default character ─────────────────────────────────────────────────────────

export const DEFAULT_CHARACTER: CharacterState = {
  name: 'MyChar',
  className: 'Beginner',
  level: 1,
  baseStats: { STR: 4, DEX: 4, INT: 4, LUK: 4, HP: 50, MP: 5 },
  equipment: {},
  skills: {},
  activeBuffs: { rage: false, concentration: false, meditation: false },
}

// ─── Class definitions ─────────────────────────────────────────────────────────

export interface ClassDef {
  name: string
  label: string
  jobBit: number            // bitmask: 1=Warrior, 2=Mage, 4=Bowman, 8=Thief, 0=All
  startLevel: number        // level you get this job
  baseStats: Partial<CharStats>
}

export const CLASS_DEFS: ClassDef[] = [
  // Beginner
  { name: 'Beginner',    label: 'Beginner',     jobBit: 0,  startLevel: 1,  baseStats: { STR: 4,  DEX: 4,  INT: 4,  LUK: 4  } },
  // Warriors
  { name: 'Warrior',     label: 'Warrior',      jobBit: 1,  startLevel: 10, baseStats: { STR: 35, DEX: 4,  INT: 4,  LUK: 4  } },
  { name: 'Fighter',     label: 'Fighter',      jobBit: 1,  startLevel: 30, baseStats: { STR: 35, DEX: 4,  INT: 4,  LUK: 4  } },
  { name: 'Page',        label: 'Page',         jobBit: 1,  startLevel: 30, baseStats: { STR: 35, DEX: 4,  INT: 4,  LUK: 4  } },
  { name: 'Spearman',    label: 'Spearman',     jobBit: 1,  startLevel: 30, baseStats: { STR: 35, DEX: 4,  INT: 4,  LUK: 4  } },
  // Magicians
  { name: 'Magician',    label: 'Magician',     jobBit: 2,  startLevel: 8,  baseStats: { STR: 4,  DEX: 4,  INT: 20, LUK: 4  } },
  { name: 'F/P Wizard',  label: 'F/P Wizard',   jobBit: 2,  startLevel: 30, baseStats: { STR: 4,  DEX: 4,  INT: 20, LUK: 4  } },
  { name: 'I/L Wizard',  label: 'I/L Wizard',   jobBit: 2,  startLevel: 30, baseStats: { STR: 4,  DEX: 4,  INT: 20, LUK: 4  } },
  { name: 'Cleric',      label: 'Cleric',       jobBit: 2,  startLevel: 30, baseStats: { STR: 4,  DEX: 4,  INT: 20, LUK: 4  } },
  // Bowmen
  { name: 'Archer',      label: 'Archer',       jobBit: 4,  startLevel: 10, baseStats: { STR: 4,  DEX: 25, INT: 4,  LUK: 4  } },
  { name: 'Hunter',      label: 'Hunter',       jobBit: 4,  startLevel: 30, baseStats: { STR: 4,  DEX: 25, INT: 4,  LUK: 4  } },
  { name: 'Crossbowman', label: 'Crossbowman',  jobBit: 4,  startLevel: 30, baseStats: { STR: 4,  DEX: 25, INT: 4,  LUK: 4  } },
  // Thieves
  { name: 'Rogue',       label: 'Rogue',        jobBit: 8,  startLevel: 10, baseStats: { STR: 4,  DEX: 4,  INT: 4,  LUK: 25 } },
  { name: 'Assassin',    label: 'Assassin',     jobBit: 8,  startLevel: 30, baseStats: { STR: 4,  DEX: 4,  INT: 4,  LUK: 25 } },
  { name: 'Bandit',      label: 'Bandit',       jobBit: 8,  startLevel: 30, baseStats: { STR: 4,  DEX: 4,  INT: 4,  LUK: 25 } },
]

/** Second-job classes — 2nd job skills are visible immediately */
export const SECOND_JOB_CLASSES = new Set([
  'Fighter','Page','Spearman',
  'F/P Wizard','I/L Wizard','Cleric',
  'Hunter','Crossbowman',
  'Assassin','Bandit',
])

export const CLASS_GROUPS = [
  { label: 'Beginner', classes: ['Beginner'] },
  { label: 'Warrior',  classes: ['Warrior', 'Fighter', 'Page', 'Spearman'] },
  { label: 'Magician', classes: ['Magician', 'F/P Wizard', 'I/L Wizard', 'Cleric'] },
  { label: 'Archer',   classes: ['Archer', 'Hunter', 'Crossbowman'] },
  { label: 'Thief',    classes: ['Rogue', 'Assassin', 'Bandit'] },
]

export function getClassDef(className: string): ClassDef {
  return CLASS_DEFS.find(c => c.name === className) ?? CLASS_DEFS[0]
}

// ─── SP/AP budgets ─────────────────────────────────────────────────────────────

/** 3 SP per level from the class's start level to 30 (1st job), capped at 60 */
export function spBudget1st(className: string, level: number): number {
  const def = getClassDef(className)
  // 1st job goes from startLevel to 30, 3 SP per level
  const gainFrom = def.startLevel
  const gainTo = 30
  const levelsWithSP = Math.max(0, Math.min(level, gainTo) - gainFrom)
  return levelsWithSP * 3
}

/** 3 SP per level from level 30 onward (2nd job) */
export function spBudget2nd(level: number): number {
  return Math.max(0, level - 30) * 3
}

/** Total base stats (excluding HP/MP) allocated above starting values */
export function apSpent(char: CharacterState): number {
  const def = getClassDef(char.className)
  const startSTR = def.baseStats.STR ?? 4
  const startDEX = def.baseStats.DEX ?? 4
  const startINT = def.baseStats.INT ?? 4
  const startLUK = def.baseStats.LUK ?? 4
  return (
    (char.baseStats.STR - startSTR) +
    (char.baseStats.DEX - startDEX) +
    (char.baseStats.INT - startINT) +
    (char.baseStats.LUK - startLUK)
  )
}

/** AP available to allocate (5 per level, minus starting allocation) */
export function apBudget(char: CharacterState): number {
  return (char.level - 1) * 5
}

// ─── Skill-based flat ATK lookup ───────────────────────────────────────────────

export function getSkillFlatATK(skillId: string, level: number): number {
  if (skillId === '4100000') return level   // Claw Mastery: +1 per level
  if (skillId === '1200001') return level   // BW Mastery: +1 per level
  return 0
}

export const MASTERY_SKILL_IDS: Partial<Record<string, string>> = {
  Fighter:      '1100000',
  Page:         '1200000',
  Spearman:     '1300000',
  'F/P Wizard': '2100000',
  'I/L Wizard': '2200000',
  Cleric:       '2300000',
  Hunter:       '3100000',
  Crossbowman:  '3200000',
  Assassin:     '4100000',
  Bandit:       '4200000',
}

export const CRIT_SKILLS: Record<string, (level: number) => number> = {
  '4100001': level => level * 0.02,
}

// ─── Derived stat computation ──────────────────────────────────────────────────

export function computeGearStats(
  equipment: Partial<Record<EquipSlot, EquippedItem>>,
  equipById: Map<number, Item>
): { stats: Partial<CharStats>; accBonus: number; evaBonus: number; pddBonus: number } {
  const stats: Partial<CharStats> = {}
  let accBonus = 0
  let evaBonus = 0
  let pddBonus = 0

  for (const slot of Object.keys(equipment) as EquipSlot[]) {
    const eq = equipment[slot]
    if (!eq) continue
    const item = equipById.get(eq.itemId)
    if (!item) continue
    const s = item.stats

    if (s.incSTR) stats.STR = (stats.STR ?? 0) + s.incSTR
    if (s.incDEX) stats.DEX = (stats.DEX ?? 0) + s.incDEX
    if (s.incINT) stats.INT = (stats.INT ?? 0) + s.incINT
    if (s.incLUK) stats.LUK = (stats.LUK ?? 0) + s.incLUK
    if (s.incMHP) stats.HP = (stats.HP ?? 0) + s.incMHP
    if (s.incMMP) stats.MP = (stats.MP ?? 0) + s.incMMP
    if (s.incACC) accBonus += s.incACC
    if (s.incEVA) evaBonus += s.incEVA
    if (s.incPDD) pddBonus += s.incPDD
    // Apply scroll stat bonuses (non-ATK stats; ATK handled separately in computeDerived)
    for (const bundle of (eq.scrolls ?? [])) {
      if (bundle.hits === 0) continue
      const perHit = SCROLL_BONUSES[bundle.tier]?.[bundle.stat] ?? 0
      const total = bundle.hits * perHit
      if (bundle.stat === 'STR')         stats.STR = (stats.STR ?? 0) + total
      else if (bundle.stat === 'DEX')    stats.DEX = (stats.DEX ?? 0) + total
      else if (bundle.stat === 'INT')    stats.INT = (stats.INT ?? 0) + total
      else if (bundle.stat === 'LUK')    stats.LUK = (stats.LUK ?? 0) + total
      else if (bundle.stat === 'HP')     stats.HP  = (stats.HP  ?? 0) + total
      else if (bundle.stat === 'MP')     stats.MP  = (stats.MP  ?? 0) + total
      else if (bundle.stat === 'Accuracy')     accBonus += total
      else if (bundle.stat === 'Avoidability') evaBonus += total
      else if (bundle.stat === 'Defense')      pddBonus += total
      // 'Other' stat_type (Crit Rate, Jump, etc.) — not tracked in damage model
    }
  }
  return { stats, accBonus, evaBonus, pddBonus }
}

export function computeDerived(char: CharacterState, data: AppData): DerivedStats {
  const { equipment, skills, activeBuffs, baseStats, className } = char

  const { stats: gearStats, accBonus, evaBonus, pddBonus } = computeGearStats(equipment, data.equipById)

  const totalStats: CharStats = {
    STR: baseStats.STR + (gearStats.STR ?? 0),
    DEX: baseStats.DEX + (gearStats.DEX ?? 0),
    INT: baseStats.INT + (gearStats.INT ?? 0),
    LUK: baseStats.LUK + (gearStats.LUK ?? 0),
    HP:  baseStats.HP  + (gearStats.HP  ?? 0),
    MP:  baseStats.MP  + (gearStats.MP  ?? 0),
  }

  // Weapon ATK = base incPAD + Attack scroll hits bonus
  const weaponEquip = equipment.weapon
  const weaponItem = weaponEquip ? data.equipById.get(weaponEquip.itemId) : undefined
  const baseWeaponATK = weaponItem?.stats.incPAD ?? 0
  const weaponScrollATK = weaponEquip
    ? (weaponEquip.scrolls ?? [])
        .filter(b => b.stat === 'Attack')
        .reduce((sum, b) => sum + b.hits * (SCROLL_BONUSES[b.tier]?.['Attack'] ?? 0), 0)
    : 0
  const weaponATK = baseWeaponATK + weaponScrollATK
  const weaponMAD = weaponItem?.stats.incMAD ?? 0
  const weaponType = weaponItem?.weapon_type ?? ''

  let flatAttackPower = 0
  for (const [skillId, level] of Object.entries(skills)) {
    flatAttackPower += getSkillFlatATK(skillId, level)
  }
  if (activeBuffs.rage) flatAttackPower += 35
  if (activeBuffs.concentration) flatAttackPower += 20

  let flatMADPower = 0
  if (activeBuffs.meditation) flatMADPower += 20

  const masterySkillId = MASTERY_SKILL_IDS[className]
  const masteryLevel = masterySkillId ? (skills[masterySkillId] ?? 0) : 0
  const mastery = computeMastery(className, masteryLevel)

  let critRate = 0
  for (const [skillId, level] of Object.entries(skills)) {
    if (CRIT_SKILLS[skillId]) critRate += CRIT_SKILLS[skillId](level)
  }

  const accuracy = computeAccuracy(totalStats, accBonus, className)
  const avoid = Math.floor(totalStats.LUK * 0.25 + evaBonus)

  const damageRange = calcDamage({
    className,
    stats: totalStats,
    weaponType,
    weaponATK,
    weaponMAD: weaponMAD + flatMADPower,
    flatAttackPower,
    mastery,
    skillPercent: 1.0,
  })

  return {
    totalStats,
    weaponATK,
    weaponMAD: weaponMAD + flatMADPower,
    weaponType,
    flatAttackPower,
    mastery,
    accuracy,
    avoid,
    damageRange,
    critRate,
    totalPDD: pddBonus,
  }
}

// ─── Equipment slot helpers ────────────────────────────────────────────────────

export const SLOT_LABELS: Record<EquipSlot, string> = {
  weapon:   'Weapon',
  helmet:   'Hat',
  top:      'Top',
  bottom:   'Bottom',
  shoes:    'Shoes',
  gloves:   'Gloves',
  cape:     'Cape',
  earrings: 'Earrings',
  shield:   'Shield',
}

/**
 * Maps item sub_category (from JSON) to the equipment slot.
 * Data sub_categories: Weapon, Cap, Cape, Coat, Glove, Longcoat, Pants, Shield, Shoes, Accessory
 */
export function subCategoryToSlot(subCat: string): EquipSlot | null {
  const map: Record<string, EquipSlot> = {
    Weapon:    'weapon',
    Cap:       'helmet',
    Cape:      'cape',
    Coat:      'top',
    Longcoat:  'top',    // Longcoat = top+bottom combined
    Glove:     'gloves',
    Pants:     'bottom',
    Shield:    'shield',
    Shoes:     'shoes',
    Accessory: 'earrings',
  }
  return map[subCat] ?? null
}

/**
 * Maps an equipped item to the scroll equip_slot key used in scrollsBySlot.
 * Returns null when no scrolls exist for this item type in the CBT data.
 */
export function getScrollSlotKey(item: Item): string | null {
  if (item.sub_category === 'Weapon') {
    const wt = item.weapon_type ?? ''
    if (wt === '1H Blunt Weapon') return '1H Blunt'
    if (wt === '2H Blunt Weapon') return '2H Blunt'
    return wt || null
  }
  const m: Record<string, string> = {
    Glove:     'Glove',
    Cape:      'Cape',
    Shoes:     'Shoes',
    Shield:    'Shield',
    Accessory: 'Earring',
    Longcoat:  'Overall',
    Cap:       'Cap',    // Hat scrolls (Accuracy, HP, MP)
    Coat:      'Coat',   // Topwear scrolls (DEF, HP, MP)
    Pants:     'Pants',  // Bottomwear scrolls (DEF, HP, MP)
  }
  return m[item.sub_category] ?? null
}

/** Maps EquipSlot to item sub_categories that belong in that slot */
export const SLOT_SUB_CATEGORIES: Record<EquipSlot, string[]> = {
  weapon:   ['Weapon'],
  helmet:   ['Cap'],
  top:      ['Coat', 'Longcoat'],
  bottom:   ['Pants'],
  shoes:    ['Shoes'],
  gloves:   ['Glove'],
  cape:     ['Cape'],
  earrings: ['Accessory'],
  shield:   ['Shield'],
}

export function canEquipItem(item: Item, className: string, level: number, totalStats: CharStats): boolean {
  const def = getClassDef(className)
  const jobBit = def.jobBit

  if (item.stats.reqJob !== 0) {
    if ((item.stats.reqJob & jobBit) === 0) return false
  }

  if (item.stats.reqLevel > level) return false
  if (item.stats.reqSTR > totalStats.STR) return false
  if (item.stats.reqDEX > totalStats.DEX) return false
  if (item.stats.reqINT > totalStats.INT) return false
  if (item.stats.reqLUK > totalStats.LUK) return false

  return true
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'maple-advisor-v1'

export function saveCharacter(char: CharacterState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(char))
  } catch (_) { /* ignore */ }
}

export function loadCharacter(): CharacterState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CharacterState
    // Migrate old ScrollApplication[] format if needed
    if (parsed.equipment) {
      for (const slot of Object.keys(parsed.equipment) as EquipSlot[]) {
        const eq = parsed.equipment[slot] as Record<string, unknown> | undefined
        if (!eq) continue
        if (!Array.isArray(eq['scrolls'])) {
          // Migrate old format (had scrolledATK / scrollCount / scrollTier)
          const scrolledATK = (eq['scrolledATK'] as number) ?? 0
          const scrollCount = (eq['scrollCount'] as number) ?? 0
          const scrollTier = ((eq['scrollTier'] as string) ?? 'Intermediate') as ScrollTier
          const perHit = SCROLL_BONUSES[scrollTier]?.['Attack'] ?? 2
          const hits = perHit > 0 ? Math.round(scrolledATK / perHit) : 0
          parsed.equipment[slot] = {
            itemId: eq['itemId'] as number,
            scrolls: scrollCount > 0 ? [{ stat: 'Attack', tier: scrollTier, hits, attempts: scrollCount }] : [],
          }
        }
      }
    }
    return parsed
  } catch (_) {
    return null
  }
}
