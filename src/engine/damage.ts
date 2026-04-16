import type { CharStats } from '../types'

// ─── Weapon multipliers ────────────────────────────────────────────────────────
// Source: meowdb.com/msclassic/guides/explaining-the-damage-formula
// Swing is the multiplier for swing-animation skills; stab for stab-animation skills.

interface WeaponMult { swing: number; stab: number }

const WEAPON_MULT: Record<string, WeaponMult> = {
  '1H Sword':        { swing: 1.5, stab: 1.5 },
  '1H Axe':          { swing: 2.0, stab: 1.0 },
  '1H Blunt Weapon': { swing: 2.0, stab: 1.0 },
  '2H Sword':        { swing: 2.5, stab: 2.5 },
  '2H Axe':          { swing: 3.0, stab: 2.0 },
  '2H Blunt Weapon': { swing: 3.0, stab: 2.0 },
  'Spear':           { swing: 1.5, stab: 3.5 },
  'Polearm':         { swing: 3.5, stab: 1.5 },
  'Claw':            { swing: 2.5, stab: 2.5 },
  'Dagger':          { swing: 1.0, stab: 2.0 },
  'Bow':             { swing: 2.5, stab: 2.5 },
  'Crossbow':        { swing: 2.5, stab: 2.5 },
  'Wand':            { swing: 1.4, stab: 1.4 }, // magic weapons — mult rarely used directly
  'Staff':           { swing: 1.4, stab: 1.4 },
}

// ─── Stat config by class ──────────────────────────────────────────────────────

interface StatConfig {
  primary: (s: CharStats) => number
  secondary: (s: CharStats) => number
  /** Returns swing multiplier by default (most skills are swing-tagged) */
  weaponMult: (weaponType: string, animation?: 'swing' | 'stab') => number
  isMagic: boolean
}

const CLASS_STAT_CONFIG: Record<string, StatConfig> = {
  // Warriors — swing mult for Power Strike / Slash Blast (the standard 1st-job skills)
  Warrior:  { primary: s => s.STR, secondary: s => s.DEX, weaponMult: (wt, a='swing') => WEAPON_MULT[wt]?.[a] ?? 2.5, isMagic: false },
  Fighter:  { primary: s => s.STR, secondary: s => s.DEX, weaponMult: (wt, a='swing') => WEAPON_MULT[wt]?.[a] ?? 2.5, isMagic: false },
  Page:     { primary: s => s.STR, secondary: s => s.DEX, weaponMult: (wt, a='swing') => WEAPON_MULT[wt]?.[a] ?? 2.5, isMagic: false },
  Spearman: { primary: s => s.STR, secondary: s => s.DEX, weaponMult: (wt, a='swing') => WEAPON_MULT[wt]?.[a] ?? 3.5, isMagic: false },
  // Mages — use magic formula, mult not used
  Magician:    { primary: s => s.INT, secondary: s => s.LUK, weaponMult: _ => 1.0, isMagic: true },
  'F/P Wizard':{ primary: s => s.INT, secondary: s => s.LUK, weaponMult: _ => 1.0, isMagic: true },
  'I/L Wizard':{ primary: s => s.INT, secondary: s => s.LUK, weaponMult: _ => 1.0, isMagic: true },
  Cleric:      { primary: s => s.INT, secondary: s => s.LUK, weaponMult: _ => 1.0, isMagic: true },
  // Bowmen — bows/crossbows use swing mult (same for both columns)
  Archer:      { primary: s => s.DEX, secondary: s => s.STR, weaponMult: (wt, a='swing') => WEAPON_MULT[wt]?.[a] ?? 2.5, isMagic: false },
  Hunter:      { primary: s => s.DEX, secondary: s => s.STR, weaponMult: (wt, a='swing') => WEAPON_MULT[wt]?.[a] ?? 2.5, isMagic: false },
  Crossbowman: { primary: s => s.DEX, secondary: s => s.STR, weaponMult: (wt, a='swing') => WEAPON_MULT[wt]?.[a] ?? 2.5, isMagic: false },
  // Thieves — Bandit uses dagger stab; Assassin/Rogue handled by Lucky Seven formula separately
  Rogue:    { primary: s => s.LUK, secondary: s => s.STR + s.DEX, weaponMult: (wt, a='stab') => WEAPON_MULT[wt]?.[a] ?? 2.0, isMagic: false },
  Assassin: { primary: s => s.LUK, secondary: s => s.STR + s.DEX, weaponMult: (wt, a='swing') => WEAPON_MULT[wt]?.[a] ?? 2.5, isMagic: false },
  Bandit:   { primary: s => s.LUK, secondary: s => s.STR + s.DEX, weaponMult: (wt, a='stab') => WEAPON_MULT[wt]?.[a] ?? 2.0, isMagic: false },
  // Beginner
  Beginner: { primary: s => s.STR, secondary: s => s.DEX, weaponMult: (wt, a='swing') => WEAPON_MULT[wt]?.[a] ?? 1.5, isMagic: false },
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
  /** Raw weapon mastery skill level (0–20, capped at 10 in the formula).
   *  Mages use 10 (max spell mastery is built into the skill, not a separate passive). */
  masteryLevel: number
  skillPercent: number
  /** If true, use the Lucky Seven formula (Assassin L7: only LUK + W.ATK, no DEX/mastery/AP). */
  isLucky7?: boolean
  /** Skill animation — determines which weapon mult column to read ('swing' | 'stab'). */
  animation?: 'swing' | 'stab' | 'ranged' | 'magic'
}

export interface DamageResult {
  max: number
  min: number
  avg: number
}

/**
 * Physical damage formula (source: meowdb.com/msclassic/guides/explaining-the-damage-formula):
 *   MAX = round((1.0 + (Primary × Mult + Secondary + AP) / 100) × W.ATK × SkillPercent)
 *   MIN = round((0.8 + (Primary × Mult × ((0.1 + min(MasteryLvl,10)/10) × 0.8) + Secondary + AP) / 100) × W.ATK × SkillPercent)
 *
 * Lucky Seven formula (provisional, no DEX/mastery/AP):
 *   MAX = round((1.0 + LUK × 3.0 / 100) × W.ATK × SkillPercent)
 *   MIN = round((1.0 + LUK × 1.5 / 100) × W.ATK × SkillPercent)
 *
 * Magic formula (verified against live CBT data):
 *   matkMod = MATK × INT / 10
 *   MAX = round(matkMod × SkillPercent)
 *   MIN = round(matkMod × masteryFactor × SkillPercent)
 *   where masteryFactor = (0.1 + min(masteryLevel,10)/10) × 0.8
 *   (Mages always use masteryLevel=10 so masteryFactor=0.88)
 */
export function calcDamage(input: DamageInput): DamageResult {
  const config = CLASS_STAT_CONFIG[input.className] ?? CLASS_STAT_CONFIG.Beginner
  const { skillPercent, weaponATK, masteryLevel } = input
  const cappedMastery = Math.min(masteryLevel, 10)
  const masteryFactor = (0.1 + cappedMastery / 10) * 0.8

  // ── Determine formula ─────────────────────────────────────────────────────
  // Explicit animation overrides class config:
  //   'magic'              → always use magic formula (even non-mage with a magic element)
  //   'swing'|'stab'|'ranged' → always use physical (e.g. mage doing a basic attack with a Mace)
  //   undefined            → fall back to class config (current behavior)
  const forceMagic    = input.animation === 'magic'
  const forcePhysical = input.animation === 'swing' || input.animation === 'stab' || input.animation === 'ranged'
  const useMagicFormula = forceMagic || (!forcePhysical && config.isMagic)

  // ── Magic formula ──────────────────────────────────────────────────────────
  if (useMagicFormula) {
    const matk = input.weaponMAD  // Meditation bonus is already folded into weaponMAD by computeDerived
    if (matk <= 0) return { max: 0, min: 0, avg: 0 }
    const matkMod = matk * input.stats.INT / 10
    const max = Math.round(matkMod * skillPercent)
    const min = Math.round(matkMod * masteryFactor * skillPercent)
    return { max, min: Math.min(min, max), avg: (max + Math.min(min, max)) / 2 }
  }

  // ── Lucky Seven formula ────────────────────────────────────────────────────
  if (input.isLucky7) {
    const luk = config.primary(input.stats)  // primary stat for Assassin/Rogue is LUK
    const max = Math.round((1.0 + luk * 3.0 / 100) * weaponATK * skillPercent)
    const min = Math.round((1.0 + luk * 1.5 / 100) * weaponATK * skillPercent)
    return { max, min, avg: (max + min) / 2 }
  }

  // ── Physical formula ───────────────────────────────────────────────────────
  // When a magic-class uses a physical weapon (e.g. Mage + Mace basic attack),
  // fall back to STR-based config because INT doesn't contribute to melee hits.
  const physConfig = config.isMagic ? CLASS_STAT_CONFIG.Beginner : config
  const anim = input.animation === 'stab' ? 'stab' : 'swing'
  const mult = physConfig.weaponMult(input.weaponType, anim)
  const primary = physConfig.primary(input.stats)
  const secondary = physConfig.secondary(input.stats)
  const ap = input.flatAttackPower

  if (weaponATK <= 0) return { max: 0, min: 0, avg: 0 }

  const max = Math.round((1.0 + (primary * mult + secondary + ap) / 100) * weaponATK * skillPercent)
  const min = Math.round((0.8 + (primary * mult * masteryFactor + secondary + ap) / 100) * weaponATK * skillPercent)

  return { max, min: Math.min(min, max), avg: (max + Math.min(min, max)) / 2 }
}

// ─── Mastery ───────────────────────────────────────────────────────────────────

/** Returns a display-friendly 0–1 mastery ratio for the StatPanel.
 *  At MasteryLvl 10 (max): masteryFactor = (0.1 + 1.0) × 0.8 = 0.88 → MIN is 88% of MAX.
 *  Mages get mastery 10 automatically since it's baked into their spells. */
export function computeMastery(className: string, masterySkillLevel: number): number {
  const isMage = ['Magician','F/P Wizard','I/L Wizard','Cleric'].includes(className)
  const lvl = isMage ? 10 : Math.min(masterySkillLevel, 10)
  return (0.1 + lvl / 10) * 0.8   // 0.08 at lvl 0 → 0.88 at lvl 10
}

// ─── Accuracy ─────────────────────────────────────────────────────────────────

// ─── Accuracy formulas by class ────────────────────────────────────────────────
// Reverse-engineered from CBT data: Beginner with DEX=31, LUK=4, gear ACC=1 → in-game 16
//   floor(31 × 0.5) + 1 = 15 + 1 = 16 ✓ (old formula floor(31×0.8 + 4×0.5) + 1 = 27 ✗)
//
// Warriors/Mages/Beginner: ACC = floor(DEX × 0.5) + gearACC  (LUK does NOT contribute)
// Bowmen/Thieves:          formulas not yet verified — left as-is pending CBT data

const WARRIOR_MAGE_CLASSES = ['Warrior','Fighter','Page','Spearman','Magician','F/P Wizard','I/L Wizard','Cleric','Beginner']
const THIEF_CLASSES = ['Rogue','Assassin','Bandit']

export function computeAccuracy(stats: CharStats, accFromGear: number, className: string): number {
  let base: number
  if (WARRIOR_MAGE_CLASSES.includes(className)) {
    // Verified against CBT: DEX/2, LUK gives no accuracy for Warriors/Mages
    base = Math.floor(stats.DEX * 0.5)
  } else if (THIEF_CLASSES.includes(className)) {
    // Thieves are LUK-primary — formula pending CBT verification
    base = Math.floor(stats.DEX * 0.25 + stats.LUK * 0.5)
  } else {
    // Archers/Crossbowmen — formula pending CBT verification
    base = Math.floor(stats.DEX * 0.6 + stats.LUK * 0.15)
  }
  return base + accFromGear
}

/**
 * Compute physical hit rate (0–1).
 *
 * Empirically verified against live CBT data (50-swing trials, Lv20 player).
 * DB EVA values confirmed by checking actual monsters.json:
 *   vs Ribbon Pig     (DB EVA=4):  0% at ACC≤8,  100% at ACC=13
 *   vs Octopus        (DB EVA=7):  0% at ACC≤14, 100% at ACC=22
 *   vs Green Mushroom (DB EVA=9):  0% at ACC≤18, 100% at ACC=29
 *
 * Formula (no level-gap adjustment — data shows negligible effect up to ±11 levels):
 *   floor   = 2.0 × mobEva   (0%   when ACC ≤ floor)
 *   ceiling = 3.2 × mobEva   (100% when ACC ≥ ceiling)
 *   linear ramp between the two thresholds
 *
 * Shoutout to Littlefoot for the empirical accuracy testing data.
 */
export function computeHitRate(
  playerAcc: number,
  _playerLevel: number,
  _mobLevel: number,
  mobEva: number,
): number {
  const floor   = 2.0 * mobEva
  const ceiling = 3.2 * mobEva
  if (playerAcc >= ceiling) return 1.0
  if (playerAcc <= floor)   return 0.0
  return (playerAcc - floor) / (ceiling - floor)
}

/**
 * Hit rate from player ACC and the precomputed guaranteed-hit threshold.
 * Used by training.ts: accReq = accuracyRequired(...); hr = hitRate(derived.accuracy, accReq)
 * Floor is 2/3.2 = 0.625 of the ceiling.
 */
export function hitRate(playerAcc: number, accRequired: number): number {
  if (accRequired <= 0) return 1.0
  const floor = (2.0 / 3.2) * accRequired   // = 0.625 × ceiling
  if (playerAcc >= accRequired) return 1.0
  if (playerAcc <= floor)       return 0.0
  return (playerAcc - floor) / (accRequired - floor)
}

/** Minimum ACC needed for any chance to hit (first integer above 2 × mobEva). */
export function accForAnyHit(_playerLevel: number, _mobLevel: number, mobEva: number): number {
  return Math.floor(2.0 * mobEva) + 1
}

/** ACC needed for guaranteed hits (ceiling = 3.2 × mobEva, rounded up). */
export function accForGuaranteedHit(_playerLevel: number, _mobLevel: number, mobEva: number): number {
  return Math.ceil(3.2 * mobEva)
}

/**
 * Minimum ACC for guaranteed hits — alias used by training.ts.
 */
export function accuracyRequired(playerLevel: number, mobLevel: number, mobEva: number): number {
  return accForGuaranteedHit(playerLevel, mobLevel, mobEva)
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
  // Holy vs undead: +25% damage (same tier as Weak)
  if (skillElement === 'Holy' && mobUndead === 1) return 1.25
  if (!mobElements) return 1.0
  const status = mobElements[skillElement]
  // Source: meowdb.com — Weak=1.25x, Resist (Strong)=0.75x, Immune=0x
  if (status === 'Weak')   return 1.25
  if (status === 'Strong') return 0.75
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
