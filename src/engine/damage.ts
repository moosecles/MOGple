import type { CharStats } from '../types'

// ─── Weapon multipliers ────────────────────────────────────────────────────────

interface WeaponMult { swing: number; stab?: number }

const WEAPON_MULT: Record<string, WeaponMult> = {
  '1H Sword':        { swing: 4.0 },
  '1H Axe':          { swing: 4.4, stab: 3.2 },
  '1H Blunt Weapon': { swing: 4.4, stab: 3.2 },
  '2H Sword':        { swing: 4.6 },
  '2H Axe':          { swing: 4.8, stab: 3.4 },
  '2H Blunt Weapon': { swing: 4.8, stab: 3.4 },
  'Spear':           { swing: 3.0, stab: 5.0 },
  'Polearm':         { swing: 5.0, stab: 3.0 },
  'Claw':            { swing: 3.6 },
  'Dagger':          { swing: 3.6 },
  'Bow':             { swing: 3.4 },
  'Crossbow':        { swing: 3.6 },
  'Wand':            { swing: 4.4, stab: 3.2 },
  'Staff':           { swing: 4.4, stab: 3.2 },
}

// ─── Stat config by class ──────────────────────────────────────────────────────

interface StatConfig {
  primary: (s: CharStats) => number
  secondary: (s: CharStats) => number
  weaponMult: (weaponType: string) => number
  isMagic: boolean
}

const CLASS_STAT_CONFIG: Record<string, StatConfig> = {
  // Warriors
  Warrior:  { primary: s => s.STR, secondary: s => s.DEX, weaponMult: wt => WEAPON_MULT[wt]?.swing ?? 4.0, isMagic: false },
  Fighter:  { primary: s => s.STR, secondary: s => s.DEX, weaponMult: wt => WEAPON_MULT[wt]?.swing ?? 4.0, isMagic: false },
  Page:     { primary: s => s.STR, secondary: s => s.DEX, weaponMult: wt => WEAPON_MULT[wt]?.swing ?? 4.0, isMagic: false },
  Spearman: { primary: s => s.STR, secondary: s => s.DEX, weaponMult: wt => WEAPON_MULT[wt]?.swing ?? 5.0, isMagic: false },
  // Mages
  Magician:    { primary: s => s.INT, secondary: s => s.LUK, weaponMult: _ => 4.4, isMagic: true },
  'F/P Wizard':{ primary: s => s.INT, secondary: s => s.LUK, weaponMult: _ => 4.4, isMagic: true },
  'I/L Wizard':{ primary: s => s.INT, secondary: s => s.LUK, weaponMult: _ => 4.4, isMagic: true },
  Cleric:      { primary: s => s.INT, secondary: s => s.LUK, weaponMult: _ => 4.4, isMagic: true },
  // Bowmen
  Archer:      { primary: s => s.DEX, secondary: s => s.STR, weaponMult: wt => WEAPON_MULT[wt]?.swing ?? 3.4, isMagic: false },
  Hunter:      { primary: s => s.DEX, secondary: s => s.STR, weaponMult: wt => WEAPON_MULT[wt]?.swing ?? 3.4, isMagic: false },
  Crossbowman: { primary: s => s.DEX, secondary: s => s.STR, weaponMult: wt => WEAPON_MULT[wt]?.swing ?? 3.6, isMagic: false },
  // Thieves
  Rogue:    { primary: s => s.LUK, secondary: s => s.STR + s.DEX, weaponMult: _ => 3.6, isMagic: false },
  Assassin: { primary: s => s.LUK, secondary: s => s.STR + s.DEX, weaponMult: _ => 3.6, isMagic: false },
  Bandit:   { primary: s => s.LUK, secondary: s => s.STR + s.DEX, weaponMult: _ => 3.6, isMagic: false },
  // Beginner
  Beginner: { primary: s => s.STR, secondary: s => s.DEX, weaponMult: _ => 4.0, isMagic: false },
}

export function getStatConfig(className: string): StatConfig {
  return CLASS_STAT_CONFIG[className] ?? CLASS_STAT_CONFIG.Beginner
}

// ─── Core damage formula ───────────────────────────────────────────────────────

export interface DamageInput {
  className: string
  stats: CharStats
  weaponType: string
  weaponATK: number
  weaponMAD: number
  flatAttackPower: number
  mastery: number
  skillPercent: number
}

export interface DamageResult {
  max: number
  min: number
  avg: number
}

export function calcDamage(input: DamageInput): DamageResult {
  const config = CLASS_STAT_CONFIG[input.className] ?? CLASS_STAT_CONFIG.Beginner

  if (config.isMagic) {
    // Classic MapleStory magic formula: (M.ATK² / 1000 + M.ATK + INT / 200) × skill%
    const matk = input.weaponMAD + input.flatAttackPower
    const matkMod = matk * matk / 1000 + matk + input.stats.INT / 200
    const max = Math.floor(matkMod * input.skillPercent)
    const min = Math.floor(matkMod * input.mastery * input.skillPercent)
    return { max, min, avg: (max + min) / 2 }
  }

  const mult = config.weaponMult(input.weaponType)
  const primary = config.primary(input.stats)
  const secondary = config.secondary(input.stats)

  const innerMax = primary * mult + secondary + input.flatAttackPower
  const innerMin = primary * mult * 0.9 * input.mastery + secondary + input.flatAttackPower

  const max = Math.floor((innerMax * input.weaponATK / 100) * input.skillPercent)
  const min = Math.floor((innerMin * input.weaponATK / 100) * input.skillPercent)
  const avg = (max + min) / 2

  return { max, min, avg }
}

// ─── Mastery ───────────────────────────────────────────────────────────────────

const MELEE_CLASSES = ['Warrior','Fighter','Page','Spearman','Rogue','Bandit']
const RANGED_CLASSES = ['Assassin','Hunter','Crossbowman','Archer']

export function computeMastery(className: string, masterySkillLevel: number): number {
  const base = MELEE_CLASSES.includes(className) ? 0.20
    : RANGED_CLASSES.includes(className) ? 0.15
    : 0.25
  const bonus = (masterySkillLevel / 20) * 0.50
  return Math.min(base + bonus, 1.0)
}

// ─── Accuracy ─────────────────────────────────────────────────────────────────

const WARRIOR_MAGE_CLASSES = ['Warrior','Fighter','Page','Spearman','Magician','F/P Wizard','I/L Wizard','Cleric','Beginner']

export function computeAccuracy(stats: CharStats, accFromGear: number, className: string): number {
  const base = WARRIOR_MAGE_CLASSES.includes(className)
    ? stats.DEX * 0.8 + stats.LUK * 0.5
    : stats.DEX * 0.6 + stats.LUK * 0.3
  return Math.floor(base + accFromGear)
}

export function accuracyRequired(playerLevel: number, mobLevel: number, mobEva: number): number {
  const levelGap = mobLevel - playerLevel
  return Math.ceil((55 + 2 * Math.max(0, levelGap)) * mobEva / 15)
}

export function hitRate(playerAcc: number, required: number): number {
  if (required === 0) return 1.0
  return Math.min(1.0, playerAcc / required)
}

// ─── Element multiplier ────────────────────────────────────────────────────────

export type ElementType = 'Fire' | 'Ice' | 'Lightning' | 'Holy' | 'Poison' | 'Dark' | 'Physical'

export const SKILL_ELEMENTS: Record<string, ElementType> = {
  '2101003': 'Fire',
  '2101004': 'Poison',
  '2201003': 'Ice',
  '2201004': 'Lightning',
  '2301004': 'Holy',
}

export function elementMultiplier(
  skillElement: ElementType | null,
  mobElements: Record<string, 'Weak' | 'Strong' | 'Immune'> | null,
  mobUndead: number
): number {
  if (!skillElement) return 1.0
  if (skillElement === 'Holy' && mobUndead === 1) return 2.0
  if (!mobElements) return 1.0
  const status = mobElements[skillElement]
  if (status === 'Weak') return 2.0
  if (status === 'Strong') return 0.5
  if (status === 'Immune') return 0.0
  return 1.0
}

// ─── Scroll bonuses ────────────────────────────────────────────────────────────

export const SCROLL_BONUSES: Record<string, Record<string, number>> = {
  Lesser:       { Attack: 1, STR: 1, DEX: 1, INT: 1, LUK: 1, HP: 5,  MP: 5,  Accuracy: 1, Avoidability: 1, Defense: 2  },
  Intermediate: { Attack: 2, STR: 2, DEX: 2, INT: 2, LUK: 2, HP: 10, MP: 10, Accuracy: 2, Avoidability: 2, Defense: 3  },
  Greater:      { Attack: 3, STR: 3, DEX: 3, INT: 3, LUK: 3, HP: 15, MP: 15, Accuracy: 3, Avoidability: 3, Defense: 5  },
  Chaos:        { Attack: 5, STR: 5, DEX: 5, INT: 5, LUK: 5, HP: 30, MP: 30, Accuracy: 5, Avoidability: 5, Defense: 7  },
}

export const SCROLL_RATES: Record<string, number> = {
  Lesser: 1.00, Intermediate: 0.60, Greater: 0.10, Chaos: 0.10,
}

export const ATTACK_SPEED_SECONDS: Record<string, number> = {
  Fastest: 0.48, Faster: 0.54, Fast: 0.60, Normal: 0.72, Slow: 0.90, Slower: 1.08,
}
