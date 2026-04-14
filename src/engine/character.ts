import type { CharacterState, CharStats, DerivedStats, EquippedItem, EquipSlot } from '../types'
import type { AppData } from '../types'
import {
  calcDamage, computeMastery, computeAccuracy, SCROLL_BONUSES,
} from './damage'

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
  jobBit: number
  baseStats: Partial<CharStats>
  startHP: number
  startMP: number
  hpPerLevel: number
  mpPerLevel: number
}

export const CLASS_DEFS: ClassDef[] = [
  { name: 'Beginner',    label: 'Beginner',     jobBit: 0,  baseStats: { STR: 4,  DEX: 4,  INT: 4,  LUK: 4  }, startHP: 50,  startMP: 5,   hpPerLevel: 10, mpPerLevel: 5  },
  { name: 'Warrior',     label: 'Warrior',      jobBit: 1,  baseStats: { STR: 35, DEX: 4,  INT: 4,  LUK: 4  }, startHP: 300, startMP: 50,  hpPerLevel: 24, mpPerLevel: 4  },
  { name: 'Fighter',     label: 'Fighter',      jobBit: 1,  baseStats: { STR: 35, DEX: 4,  INT: 4,  LUK: 4  }, startHP: 300, startMP: 50,  hpPerLevel: 24, mpPerLevel: 4  },
  { name: 'Page',        label: 'Page',         jobBit: 1,  baseStats: { STR: 35, DEX: 4,  INT: 4,  LUK: 4  }, startHP: 300, startMP: 50,  hpPerLevel: 24, mpPerLevel: 4  },
  { name: 'Spearman',    label: 'Spearman',     jobBit: 1,  baseStats: { STR: 35, DEX: 4,  INT: 4,  LUK: 4  }, startHP: 300, startMP: 50,  hpPerLevel: 24, mpPerLevel: 4  },
  { name: 'Magician',    label: 'Magician',     jobBit: 2,  baseStats: { STR: 4,  DEX: 4,  INT: 20, LUK: 4  }, startHP: 200, startMP: 150, hpPerLevel: 8,  mpPerLevel: 16 },
  { name: 'F/P Wizard',  label: 'F/P Wizard',   jobBit: 2,  baseStats: { STR: 4,  DEX: 4,  INT: 20, LUK: 4  }, startHP: 200, startMP: 150, hpPerLevel: 8,  mpPerLevel: 16 },
  { name: 'I/L Wizard',  label: 'I/L Wizard',   jobBit: 2,  baseStats: { STR: 4,  DEX: 4,  INT: 20, LUK: 4  }, startHP: 200, startMP: 150, hpPerLevel: 8,  mpPerLevel: 16 },
  { name: 'Cleric',      label: 'Cleric',       jobBit: 2,  baseStats: { STR: 4,  DEX: 4,  INT: 20, LUK: 4  }, startHP: 200, startMP: 150, hpPerLevel: 8,  mpPerLevel: 16 },
  { name: 'Archer',      label: 'Archer',       jobBit: 4,  baseStats: { STR: 4,  DEX: 25, INT: 4,  LUK: 4  }, startHP: 200, startMP: 80,  hpPerLevel: 16, mpPerLevel: 8  },
  { name: 'Hunter',      label: 'Hunter',       jobBit: 4,  baseStats: { STR: 4,  DEX: 25, INT: 4,  LUK: 4  }, startHP: 200, startMP: 80,  hpPerLevel: 16, mpPerLevel: 8  },
  { name: 'Crossbowman', label: 'Crossbowman',  jobBit: 4,  baseStats: { STR: 4,  DEX: 25, INT: 4,  LUK: 4  }, startHP: 200, startMP: 80,  hpPerLevel: 16, mpPerLevel: 8  },
  { name: 'Rogue',       label: 'Rogue',        jobBit: 8,  baseStats: { STR: 4,  DEX: 4,  INT: 4,  LUK: 25 }, startHP: 200, startMP: 50,  hpPerLevel: 16, mpPerLevel: 6  },
  { name: 'Assassin',    label: 'Assassin',     jobBit: 8,  baseStats: { STR: 4,  DEX: 4,  INT: 4,  LUK: 25 }, startHP: 200, startMP: 50,  hpPerLevel: 16, mpPerLevel: 6  },
  { name: 'Bandit',      label: 'Bandit',       jobBit: 8,  baseStats: { STR: 4,  DEX: 4,  INT: 4,  LUK: 25 }, startHP: 200, startMP: 50,  hpPerLevel: 16, mpPerLevel: 6  },
]

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

// ─── Skill-based flat ATK lookup ───────────────────────────────────────────────

// Skills that grant incPAD flat ATK based on level
export function getSkillFlatATK(skillId: string, level: number): number {
  // Claw Mastery / BW Mastery provide flat ATK per level
  if (skillId === '4100000') return level        // Claw Mastery: +1 per level
  if (skillId === '1200001') return level        // BW Mastery: +1 per level
  return 0
}

// Skill IDs for mastery skills per class
export const MASTERY_SKILL_IDS: Partial<Record<string, string>> = {
  Fighter:     '1100000', // Sword Mastery / Axe Mastery
  Page:        '1200000', // Sword Mastery
  Spearman:    '1300000', // Spear Mastery
  'F/P Wizard':'2100000',
  'I/L Wizard':'2200000',
  Cleric:      '2300000',
  Hunter:      '3100000',
  Crossbowman: '3200000',
  Assassin:    '4100000', // Claw Mastery
  Bandit:      '4200000', // Dagger Mastery
}

// Skills that grant crit rate
export const CRIT_SKILLS: Record<string, (level: number) => number> = {
  '4100001': level => level * 0.02, // Critical Throw: +2% per level
}

// ─── Derived stat computation ──────────────────────────────────────────────────

export function computeScrolledATK(equipped: EquippedItem | undefined, baseATK: number): number {
  if (!equipped) return baseATK
  let bonus = 0
  for (const scroll of equipped.scrolls) {
    if (scroll.success) {
      bonus += SCROLL_BONUSES[scroll.tier]?.[scroll.stat] ?? 0
    }
  }
  return baseATK + bonus
}

export function computeGearStats(
  equipment: Partial<Record<EquipSlot, EquippedItem>>,
  equipById: Map<number, import('../types').Item>
): { stats: Partial<CharStats>; accBonus: number; evaBonus: number; pddBonus: number; mddBonus: number } {
  const stats: Partial<CharStats> = {}
  let accBonus = 0
  let evaBonus = 0
  let pddBonus = 0
  let mddBonus = 0

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
    if (s.incMDD) mddBonus += s.incMDD

    // Apply scroll bonuses to stats
    for (const scroll of eq.scrolls) {
      if (!scroll.success) continue
      const bonus = SCROLL_BONUSES[scroll.tier]?.[scroll.stat] ?? 0
      if (bonus === 0) continue
      const statMap: Record<string, keyof CharStats | 'acc' | 'eva'> = {
        STR: 'STR', DEX: 'DEX', INT: 'INT', LUK: 'LUK',
        HP: 'HP', MP: 'MP',
      }
      if (scroll.stat in statMap && ['STR','DEX','INT','LUK','HP','MP'].includes(scroll.stat)) {
        const key = scroll.stat as keyof CharStats
        stats[key] = (stats[key] ?? 0) + bonus
      }
      if (scroll.stat === 'Accuracy') accBonus += bonus
      if (scroll.stat === 'Avoidability') evaBonus += bonus
    }
  }

  return { stats, accBonus, evaBonus, pddBonus, mddBonus }
}

export function computeDerived(
  char: CharacterState,
  data: AppData
): DerivedStats {
  const { equipment, skills, activeBuffs, baseStats, className } = char

  // ── Gear bonuses ────────────────────────────────────────────────────────────
  const { stats: gearStats, accBonus, evaBonus, pddBonus } = computeGearStats(equipment, data.equipById)

  // ── Total stats ─────────────────────────────────────────────────────────────
  const totalStats: CharStats = {
    STR: baseStats.STR + (gearStats.STR ?? 0),
    DEX: baseStats.DEX + (gearStats.DEX ?? 0),
    INT: baseStats.INT + (gearStats.INT ?? 0),
    LUK: baseStats.LUK + (gearStats.LUK ?? 0),
    HP:  baseStats.HP  + (gearStats.HP  ?? 0),
    MP:  baseStats.MP  + (gearStats.MP  ?? 0),
  }

  // ── Weapon ATK ──────────────────────────────────────────────────────────────
  const weaponEquip = equipment.weapon
  const weaponItem = weaponEquip ? data.equipById.get(weaponEquip.itemId) : undefined
  const baseWeaponATK = weaponItem?.stats.incPAD ?? 0
  const weaponATK = computeScrolledATK(weaponEquip, baseWeaponATK)
  const weaponMAD = weaponItem?.stats.incMAD ?? 0
  const weaponType = weaponItem?.weapon_type ?? ''

  // ── Flat ATK from skills ─────────────────────────────────────────────────────
  let flatAttackPower = 0
  for (const [skillId, level] of Object.entries(skills)) {
    flatAttackPower += getSkillFlatATK(skillId, level)
  }
  // Buffs
  if (activeBuffs.rage) flatAttackPower += 35
  if (activeBuffs.concentration) flatAttackPower += 20

  let flatMADPower = 0
  if (activeBuffs.meditation) flatMADPower += 20

  // ── Mastery ─────────────────────────────────────────────────────────────────
  const masterySkillId = MASTERY_SKILL_IDS[className]
  const masteryLevel = masterySkillId ? (skills[masterySkillId] ?? 0) : 0
  const mastery = computeMastery(className, masteryLevel)

  // ── Crit rate ───────────────────────────────────────────────────────────────
  let critRate = 0
  for (const [skillId, level] of Object.entries(skills)) {
    if (CRIT_SKILLS[skillId]) critRate += CRIT_SKILLS[skillId](level)
  }

  // ── Accuracy & Avoid ────────────────────────────────────────────────────────
  const accuracy = computeAccuracy(totalStats, accBonus, className)
  const avoid = Math.floor(totalStats.LUK * 0.25 + evaBonus)

  // ── Damage range ─────────────────────────────────────────────────────────────
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

// ─── AP budget ─────────────────────────────────────────────────────────────────

export function apBudget(level: number): number {
  // Starting AP from class selection (approx 25-35 for non-beginners) + 5 per level
  // Simplified: 5 per level from level 1
  return level * 5
}

export function spBudget1st(level: number): number {
  // 1 SP per level from 10-30 = max 20 (CBT was 3 SP/level, but cap at 1st job max)
  return Math.max(0, Math.min(level - 10, 20)) * 3
}

export function spBudget2nd(level: number): number {
  return Math.max(0, level - 30) * 3
}

// ─── Equipment slot helpers ───────────────────────────────────────────────────

export const SLOT_LABELS: Record<EquipSlot, string> = {
  weapon:   'Weapon',
  helmet:   'Hat',
  top:      'Top',
  bottom:   'Bottom',
  shoes:    'Shoes',
  gloves:   'Gloves',
  cape:     'Cape',
  earrings: 'Earrings',
  ring:     'Ring',
}

// Map item sub_category to equipment slot
export function subCategoryToSlot(subCat: string): EquipSlot | null {
  const map: Record<string, EquipSlot> = {
    Weapon:    'weapon',
    Hat:       'helmet',
    Top:       'top',
    Bottom:    'bottom',
    Shoes:     'shoes',
    Gloves:    'gloves',
    Cape:      'cape',
    Earring:   'earrings',
    Earrings:  'earrings',
    'Ring':    'ring',
    'Face Accessory': 'ring', // treat as ring slot for simplicity
  }
  return map[subCat] ?? null
}

// Check if item can be equipped by class
export function canEquipItem(
  item: import('../types').Item,
  className: string,
  level: number,
  totalStats: CharStats
): boolean {
  const classDef = getClassDef(className)
  const jobBit = classDef.jobBit

  // reqJob 0 = all
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
    return JSON.parse(raw) as CharacterState
  } catch (_) {
    return null
  }
}
