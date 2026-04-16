/**
 * Damage skill registry.
 * skillPercent: coefficient per hit at max level (e.g. 2.6 = 260%)
 * For magic skills "Basic Attack X" → skillPercent = X / 100
 * hits: number of hits per cast
 * targets: max mobs hit per cast (1 = single target)
 * weaponTypes: if set, skill only usable with these weapon types
 */

export interface SecondaryHit {
  /** Damage coefficient per hit for the secondary phase (e.g. Poison Breath explosion) */
  skillPercent: number
  hits: number
  /** Max mobs hit by the secondary phase */
  targets: number
}

export interface SkillDamageInfo {
  id: string
  name: string
  thumbnail: string
  skillPercent: number   // damage coefficient per hit at max level
  hits: number           // hits per cast
  targets: number        // max mobs hit per cast
  animation: 'swing' | 'stab' | 'ranged' | 'magic'
  isLucky7: boolean      // uses Lucky Seven special formula (no DEX/mastery/AP)
  element?: string       // elemental type for magic
  classNames: string[]   // which classes can use this
  weaponTypes?: string[] // if set, skill requires one of these weapon types to use
  /** Optional secondary damage phase (e.g. explosion after initial impact) */
  secondaryHit?: SecondaryHit
}

export const DAMAGE_SKILLS: SkillDamageInfo[] = [
  // ── Basic attacks (all classes) ───────────────────────────────────────────
  // Every class can auto-attack. Two entries cover all weapon types:
  //   - Rogue/Bandit use stab animation (Dagger swing mult is 1.0 but stab is 2.0 — big difference)
  //   - Everyone else uses swing (includes Mages; physical formula applies when no MATK present)
  // No weapon-type restriction so these work with any weapon equipped.
  {
    id: 'basic_swing', name: 'Basic Attack',
    thumbnail: 'images/skills/basic_attack.png',
    skillPercent: 1.0, hits: 1, targets: 1, animation: 'swing', isLucky7: false,
    classNames: [
      'Beginner',
      'Warrior', 'Fighter', 'Page', 'Spearman',
      'Magician', 'F/P Wizard', 'I/L Wizard', 'Cleric',
      'Archer', 'Hunter', 'Crossbowman',
      'Assassin',  // Claw: swing=2.5, stab=2.5 — same either way
    ],
  },
  {
    id: 'basic_stab', name: 'Basic Attack',
    thumbnail: 'images/skills/basic_attack.png',
    // Rogues/Bandits attack with a stabbing motion; Dagger stab mult (2.0) ≠ swing (1.0)
    skillPercent: 1.0, hits: 1, targets: 1, animation: 'stab', isLucky7: false,
    classNames: ['Rogue', 'Bandit'],
  },
  // ── Warrior 1st job ───────────────────────────────────────────────────────
  {
    id: '1001001', name: 'Power Strike',
    thumbnail: 'images/skills/1001001.png',
    skillPercent: 2.6, hits: 1, targets: 1, animation: 'swing', isLucky7: false,
    classNames: ['Warrior', 'Fighter', 'Page', 'Spearman'],
  },
  {
    id: '1001002', name: 'Slash Blast',
    thumbnail: 'images/skills/1001002.png',
    skillPercent: 1.3, hits: 1, targets: 4, animation: 'swing', isLucky7: false,
    classNames: ['Warrior', 'Fighter', 'Page', 'Spearman'],
  },
  // ── Archer 1st job ────────────────────────────────────────────────────────
  {
    id: '3001001', name: 'Arrow Blow',
    thumbnail: 'images/skills/3001001.png',
    skillPercent: 2.4, hits: 1, targets: 1, animation: 'ranged', isLucky7: false,
    classNames: ['Archer', 'Hunter', 'Crossbowman'],
  },
  {
    id: '3001002', name: 'Double Shot',
    thumbnail: 'images/skills/3001002.png',
    skillPercent: 1.2, hits: 2, targets: 1, animation: 'ranged', isLucky7: false,
    classNames: ['Archer', 'Hunter', 'Crossbowman'],
  },
  // ── Hunter 2nd job — Bow only ─────────────────────────────────────────────
  {
    id: '3101002', name: 'Power Knockback',
    thumbnail: 'images/skills/3101002.png',
    skillPercent: 2.0, hits: 1, targets: 4, animation: 'ranged', isLucky7: false,
    classNames: ['Hunter'],
    weaponTypes: ['Bow'],
  },
  // ── Crossbowman 2nd job — Crossbow only ──────────────────────────────────
  {
    id: '3201004', name: 'Iron Arrow',
    thumbnail: 'images/skills/3201004.png',
    skillPercent: 1.9, hits: 1, targets: 4, animation: 'ranged', isLucky7: false,
    classNames: ['Crossbowman'],
    weaponTypes: ['Crossbow'],
  },
  // ── Rogue / Bandit — Dagger only ─────────────────────────────────────────
  {
    id: '4001002', name: 'Double Stab',
    thumbnail: 'images/skills/4001002.png',
    skillPercent: 1.6, hits: 2, targets: 1, animation: 'stab', isLucky7: false,
    classNames: ['Rogue', 'Bandit'],
    weaponTypes: ['Dagger'],
  },
  // ── Assassin / Rogue — Claw only ─────────────────────────────────────────
  {
    id: '4001003', name: 'Lucky Seven',
    thumbnail: 'images/skills/4001003.png',
    skillPercent: 1.2, hits: 2, targets: 1, animation: 'ranged', isLucky7: true,
    classNames: ['Rogue', 'Assassin'],
    weaponTypes: ['Claw'],
  },
  // ── Magician 1st job ─────────────────────────────────────────────────────
  {
    id: '2001002', name: 'Energy Bolt',
    thumbnail: 'images/skills/2001002.png',
    skillPercent: 0.65, hits: 1, targets: 1, animation: 'magic', isLucky7: false,
    classNames: ['Magician', 'F/P Wizard', 'I/L Wizard', 'Cleric'],
  },
  {
    id: '2001003', name: 'Magic Claw',
    thumbnail: 'images/skills/2001003.png',
    skillPercent: 0.30, hits: 2, targets: 1, animation: 'magic', isLucky7: false,
    classNames: ['Magician', 'F/P Wizard', 'I/L Wizard', 'Cleric'],
  },
  // ── F/P Wizard 2nd job ────────────────────────────────────────────────────
  {
    id: '2101003', name: 'Fire Arrow',
    thumbnail: 'images/skills/2101003.png',
    skillPercent: 1.30, hits: 1, targets: 1, animation: 'magic', isLucky7: false,
    element: 'Fire',
    classNames: ['F/P Wizard'],
  },
  {
    id: '2101004', name: 'Poison Breath',
    thumbnail: 'images/skills/2101004.png',
    // Primary: 0.40 on 1 target; explosion secondary: 0.35 on up to 4 targets
    skillPercent: 0.40, hits: 1, targets: 1, animation: 'magic', isLucky7: false,
    element: 'Poison',
    classNames: ['F/P Wizard'],
    secondaryHit: { skillPercent: 0.35, hits: 1, targets: 4 },
  },
  // ── I/L Wizard 2nd job ────────────────────────────────────────────────────
  {
    id: '2201003', name: 'Cold Beam',
    thumbnail: 'images/skills/2201003.png',
    skillPercent: 1.20, hits: 1, targets: 1, animation: 'magic', isLucky7: false,
    element: 'Ice',
    classNames: ['I/L Wizard'],
  },
  {
    id: '2201004', name: 'Thunder Bolt',
    thumbnail: 'images/skills/2201004.png',
    skillPercent: 0.45, hits: 1, targets: 6, animation: 'magic', isLucky7: false,
    element: 'Lightning',
    classNames: ['I/L Wizard'],
  },
  // ── Cleric 2nd job ────────────────────────────────────────────────────────
  {
    id: '2301004', name: 'Holy Arrow',
    thumbnail: 'images/skills/2301004.png',
    skillPercent: 0.40, hits: 1, targets: 3, animation: 'magic', isLucky7: false,
    element: 'Holy',
    classNames: ['Cleric'],
  },
]

/** Single-target DPS coefficient for bossing: primary + secondary both land on one target */
export function singleTargetCoeff(skill: SkillDamageInfo): number {
  const primary = skill.skillPercent * skill.hits
  const secondary = skill.secondaryHit ? skill.secondaryHit.skillPercent * skill.secondaryHit.hits : 0
  return primary + secondary
}

/** Training efficiency coefficient: weights AoE by raw target count for mass-clear speed */
export function trainingCoeff(skill: SkillDamageInfo): number {
  const primary = skill.skillPercent * skill.hits * skill.targets
  const secondary = skill.secondaryHit ? skill.secondaryHit.skillPercent * skill.secondaryHit.hits * skill.secondaryHit.targets : 0
  return primary + secondary
}

/** All damage skills available to a given class name. */
export function getClassSkills(className: string): SkillDamageInfo[] {
  return DAMAGE_SKILLS.filter(s => s.classNames.includes(className))
}

/** Skills usable by a class with the given equipped weapon type. */
export function getCompatibleSkills(className: string, weaponType: string): SkillDamageInfo[] {
  return getClassSkills(className).filter(s =>
    !s.weaponTypes || s.weaponTypes.includes(weaponType)
  )
}

/**
 * Best skill for training maps: prefers AoE over single-target.
 * Filters out skills incompatible with the equipped weapon type.
 */
export function getBestTrainingSkill(className: string, weaponType?: string): SkillDamageInfo | undefined {
  const skills = weaponType
    ? getCompatibleSkills(className, weaponType)
    : getClassSkills(className)
  return [...skills].sort((a, b) => trainingCoeff(b) - trainingCoeff(a))[0]
}

/**
 * Best single-target DPS skill for bossing.
 * Filters out skills incompatible with the equipped weapon type.
 */
export function getBestSTSkill(className: string, weaponType?: string): SkillDamageInfo | undefined {
  const skills = weaponType
    ? getCompatibleSkills(className, weaponType)
    : getClassSkills(className)
  return [...skills].sort((a, b) => singleTargetCoeff(b) - singleTargetCoeff(a))[0]
}

/**
 * Returns the top N damage skills for a class, ranked by single-target coefficient.
 * Used in the Character Builder skill comparison panel.
 */
export function getRankedSkills(className: string, topN = 3): SkillDamageInfo[] {
  return getClassSkills(className)
    .slice()
    .sort((a, b) => singleTargetCoeff(b) - singleTargetCoeff(a))
    .slice(0, topN)
}
