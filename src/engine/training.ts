import type { CharacterState, DerivedStats, Monster } from '../types'
import type { AppData } from '../types'
import {
  accuracyRequired, hitRate, elementMultiplier, ATTACK_SPEED_SECONDS, SKILL_ELEMENTS,
} from './damage'
import type { SkillDamageInfo } from './skills'

const MAGIC_CLASSES = new Set(['Magician','F/P Wizard','I/L Wizard','Cleric'])

export interface MapMobEntry extends Monster {
  count: number
  mob_time: number
}

export interface Tag {
  label: string
  variant: 'success' | 'warning' | 'danger' | 'info' | 'purple'
  tooltip: string
}

export interface ScoreBreakdown {
  hitsToKillTop: number       // hits to kill the highest-level scored mob
  avgTimeToKill: number
  totalMobCount: number
  flyingMobCount: number
  avgRespawnTime: number
  cycleExpPerHour: number
  survivalRating: number
  accuracyRating: number
  elementalBonus: number
  levelPenalty: number
}

export interface MapScore {
  mapId: number
  mapName: string
  region: string
  minimap?: string
  mobs: MapMobEntry[]
  score: number
  expPerHour: number
  tags: Tag[]
  breakdown: ScoreBreakdown
  isDangerous: boolean
}

// Get best elemental multiplier for this character against a mob
function getBestElementalMult(char: CharacterState, mob: Monster): number {
  let best = 1.0
  for (const skillId of Object.keys(char.skills)) {
    if ((char.skills[skillId] ?? 0) === 0) continue
    const el = SKILL_ELEMENTS[skillId] ?? null
    const mult = elementMultiplier(el, mob.elements, mob.undead)
    if (mult > best) best = mult
  }
  // Holy Arrow / undead detection for Cleric
  if (char.className === 'Cleric' && mob.undead === 1) {
    const m = elementMultiplier('Holy', mob.elements, mob.undead)
    if (m > best) best = m
  }
  return best
}

function levelPenaltyMultiplier(playerLevel: number, mobLevel: number): number {
  const gap = playerLevel - mobLevel  // positive when player is above mob
  const negGap = mobLevel - playerLevel  // positive when mob is above player
  if (negGap > 5) return 0    // mob more than 5 levels above player — don't consider it
  if (gap > 10) return 0      // mob greyed out — no one hunts these (>10 below)
  if (gap > 5)  return 0.7   // mob 5–10 levels below — reduced XP
  return 1.0                  // sweet spot: within ±5 levels
}

/** Level-difference damage penalty when fighting a mob above your level.
 *  Source: meowdb.com/msclassic/guides/explaining-the-damage-formula */
function levelDamagePenalty(playerLevel: number, mobLevel: number): number {
  const diff = mobLevel - playerLevel
  if (diff <= 0) return 1.0
  if (diff < 10) return 1 / (diff * diff * 0.005 + 1)
  return 1 / (diff * 0.05 + 1)
}

/**
 * Flying mob efficiency penalty.
 * Two independent factors multiplied together:
 *  1. Vertical reach — flying mobs oscillate up/down; melee barely catches them, spells/arrows cover more vertical space
 *  2. Map size — large maps mean flying mobs are spread far apart; takes ages to walk between them
 */
function flyingEfficiencyPenalty(char: CharacterState, derived: DerivedStats, totalMapSpawns: number): number {
  // Vertical reach factor
  const isMage = MAGIC_CLASSES.has(char.className)
  const wt = derived.weaponType.toLowerCase()
  const isRanged = wt.includes('bow') || wt.includes('crossbow')
  const isClaw = wt.includes('claw')  // throwing stars arc upward — decent vertical

  let reachFactor: number
  if (isMage) reachFactor = 0.85      // spells cover a tall/wide area, catch mobs as they pass through
  else if (isRanged) reachFactor = 0.80  // arrows can aim upward but still mostly horizontal
  else if (isClaw) reachFactor = 0.72    // stars arc and reach above but not reliable for high oscillations
  else reachFactor = 0.50             // melee swing — flat hitbox, flying mobs spend most time out of range

  // Map size factor — more total spawns = larger map = more walking between flying targets
  const mapSizeFactor = totalMapSpawns >= 40 ? 0.80 : totalMapSpawns >= 20 ? 0.90 : 1.0

  return reachFactor * mapSizeFactor
}

export function scoreMap(
  mapId: number,
  mobs: MapMobEntry[],
  mapName: string,
  region: string,
  char: CharacterState,
  derived: DerivedStats
): MapScore | null {
  if (mobs.length === 0) return null

  const atkSpeedSec = ATTACK_SPEED_SECONDS[
    (() => {
      const eq = char.equipment.weapon
      if (!eq) return 'Normal'
      return 'Normal' // simplified — will be computed outside
    })()
  ] ?? 0.6

  let totalExpPerHour = 0
  let totalMobCount = 0
  let totalRespawn = 0
  let totalTimeToKill = 0
  let hitsToKillTop = 0
  let worstSurvival = 1.0
  let bestAccuracy = 1.0
  let bestElemental = 1.0
  let mobProcessed = 0

  // Only score the top 3 mob types by level within the viable range (≤5 above, ≤10 below).
  // Players focus on the best targets — low-level stragglers or excess mob types don't factor in.
  const scoringMobs = [...mobs]
    .filter(m => levelPenaltyMultiplier(char.level, m.level) > 0)
    .sort((a, b) => b.level - a.level)
    .slice(0, 3)

  const viableCount = scoringMobs.reduce((acc, m) => acc + m.count, 0)
  const levelPenalty = viableCount > 0
    ? scoringMobs.reduce((acc, m) => acc + levelPenaltyMultiplier(char.level, m.level) * m.count, 0) / viableCount
    : 0

  for (const mob of scoringMobs) {
    const mobLevelPenalty = levelPenaltyMultiplier(char.level, mob.level)

    const elMult = getBestElementalMult(char, mob)
    const effAvgDmg = derived.damageRange.avg * elMult
    if (effAvgDmg <= 0) continue

    const attacksToKill = Math.ceil(mob.hp / Math.max(1, effAvgDmg))
    const timeToKill = attacksToKill * (atkSpeedSec || 0.6)
    const respawnCycle = mob.mob_time > 0 ? mob.mob_time : 30

    const killsPerHour = 3600 / Math.max(timeToKill, respawnCycle / Math.max(1, mob.count))

    const accReq = accuracyRequired(char.level, mob.level, mob.eva)
    // Magic attacks always hit (spells don't use the accuracy stat)
    const hr = MAGIC_CLASSES.has(char.className) ? 1.0 : hitRate(derived.accuracy, accReq)

    const expPerHourMob = killsPerHour * mob.exp * mobLevelPenalty * hr

    totalExpPerHour += expPerHourMob
    totalMobCount += mob.count
    totalRespawn += respawnCycle * mob.count
    totalTimeToKill += timeToKill * mob.count
    if (mobProcessed === 0) hitsToKillTop = attacksToKill
    if (hr < bestAccuracy) bestAccuracy = hr
    if (elMult > bestElemental) bestElemental = elMult

    // Survival check: mob PADamage vs player HP
    const mobDmgPerHit = Math.max(0, mob.PADamage - derived.totalPDD)
    const survivalFraction = mobDmgPerHit > 0 ? Math.min(1.0, derived.totalStats.HP / 3 / mobDmgPerHit) : 1.0
    if (survivalFraction < worstSurvival) worstSurvival = survivalFraction

    mobProcessed++
  }

  if (mobProcessed === 0) return null

  const avgTimeToKill = totalTimeToKill / totalMobCount
  const avgRespawnTime = totalRespawn / totalMobCount

  const accuracyRating = bestAccuracy
  const survivalRating = worstSurvival
  const isDangerous = survivalRating < 0.1 || mobs.some(m => (m.PADamage - derived.totalPDD) >= derived.totalStats.HP)

  const finalScore = totalExpPerHour * accuracyRating * Math.min(1.0, survivalRating + 0.3)

  const tags = computeTags({
    mobs, char, accuracyRating, survivalRating, bestElemental, isDangerous, totalMobCount, flyingMobCount: 0
  })

  return {
    mapId,
    mapName,
    region,
    mobs,
    score: finalScore,
    expPerHour: totalExpPerHour,
    tags,
    isDangerous,
    breakdown: {
      hitsToKillTop,
      avgTimeToKill,
      totalMobCount,
      flyingMobCount: 0,
      avgRespawnTime,
      cycleExpPerHour: totalExpPerHour,
      survivalRating,
      accuracyRating,
      elementalBonus: bestElemental,
      levelPenalty,
    },
  }
}

function computeTags({
  mobs, char, accuracyRating, survivalRating, bestElemental, isDangerous, totalMobCount, flyingMobCount
}: {
  mobs: MapMobEntry[]
  char: CharacterState
  accuracyRating: number
  survivalRating: number
  bestElemental: number
  isDangerous: boolean
  totalMobCount: number
  flyingMobCount: number
}): Tag[] {
  const tags: Tag[] = []

  if (bestElemental >= 2.0) {
    tags.push({ label: 'ELEM WEAK', variant: 'success', tooltip: 'Your skills deal 2× damage to mobs here' })
  }

  if (char.className === 'Cleric' && mobs.some(m => m.undead === 1)) {
    tags.push({ label: 'UNDEAD', variant: 'purple', tooltip: 'Holy Arrow deals bonus damage to undead mobs' })
  }

  const totalExpHP = mobs.reduce((sum, m) => sum + (m.exp / m.hp) * m.count, 0)
  const totalCount = mobs.reduce((sum, m) => sum + m.count, 0)
  const avgExpPerHp = totalExpHP / totalCount
  if (avgExpPerHp > 0.05) {
    tags.push({ label: 'HIGH EXP/HP', variant: 'success', tooltip: 'These mobs give a lot of EXP per HP — very efficient' })
  }

  if (totalMobCount >= 20) {
    tags.push({ label: 'DENSE SPAWN', variant: 'info', tooltip: `${totalMobCount} total spawns — great for AoE classes` })
  }
  if (totalMobCount < 8) {
    tags.push({ label: 'FEW MOBS', variant: 'warning', tooltip: 'Low mob count limits EXP/hr potential' })
  }

  if (flyingMobCount > 0) {
    const flyPct = Math.round((flyingMobCount / totalMobCount) * 100)
    tags.push({
      label: 'FLYING MOBS',
      variant: 'warning',
      tooltip: `${flyingMobCount} of ${totalMobCount} spawns are flying (${flyPct}%) — they oscillate vertically (hard to reach without tall/ranged attacks) and are spread across the map. EXP/hr adjusted for your attack reach + map size.`,
    })
  }

  if (accuracyRating < 0.85) {
    tags.push({ label: 'ACC ISSUE', variant: 'warning', tooltip: `~${Math.round(accuracyRating * 100)}% hit rate — you'll miss frequently` })
  }

  if (isDangerous) {
    tags.push({ label: 'LETHAL', variant: 'danger', tooltip: 'These mobs can one-shot or two-shot you' })
  } else if (survivalRating < 0.5) {
    tags.push({ label: 'RISKY', variant: 'warning', tooltip: 'Mobs deal significant damage — bring potions' })
  }

  // Check for over-leveled
  if (mobs.every(m => char.level - m.level > 5)) {
    tags.push({ label: 'LOW EXP', variant: 'warning', tooltip: 'You are much higher level than these mobs — reduced EXP' })
  }

  return tags
}

export interface TieredMaps {
  mostOptimal: MapScore[]
  avgOptimal: MapScore[]
  lessOptimal: MapScore[]
  dangerous: MapScore[]
  ignored: MapScore[]
}

export function rankMaps(
  data: AppData,
  char: CharacterState,
  derived: DerivedStats,
  attackSpeedLabel: string,
  bestSkill?: SkillDamageInfo
): TieredMaps {
  const atkSec = ATTACK_SPEED_SECONDS[attackSpeedLabel] ?? 0.6
  // Effective damage multiplier from the best skill (hits × skillPercent).
  // Training assumes the player uses this skill as their primary attack.
  const skillDmgMult = bestSkill ? bestSkill.hits * bestSkill.skillPercent : 1.0
  // AoE factor: for skills that hit multiple targets, one cast clears more mobs.
  const skillTargets = bestSkill ? bestSkill.targets : 1

  const allMapIds = Array.from(data.mobsByMap.keys())
  const scores: MapScore[] = []

  for (const mapId of allMapIds) {
    const mobs = data.mobsByMap.get(mapId)
    if (!mobs || mobs.length === 0) continue

    // Find map info
    const mapEntry = data.maps.find(m => m.id === mapId)
    if (mapEntry?.is_town) continue

    const mapName = mapEntry?.name ?? `Map ${mapId}`
    const region = mapEntry?.region ?? 'Unknown'

    // Re-score with correct attack speed
    const mobsArr = mobs as MapMobEntry[]

    // Skip maps where ANY mob is more than 8 levels above the player.
    // Even if only some mobs are farmable, the high-level mobs roaming the same map will kill you.
    const maxMobLevel = Math.max(...mobsArr.map(m => m.level))
    if (maxMobLevel > char.level + 8) continue

    // Score only the top 3 mob types by level within the viable range (≤5 above, ≤10 below).
    // Players focus on the best targets — low-level stragglers don't factor into the decision.
    const scoringMobsArr = [...mobsArr]
      .filter(m => levelPenaltyMultiplier(char.level, m.level) > 0)
      .sort((a, b) => b.level - a.level)
      .slice(0, 3)

    const totalMapSpawns = mobsArr.reduce((sum, m) => sum + m.count, 0)
    // Flying penalty = vertical reach × map size (both independently reduce efficiency)
    const flyingPenaltyForMap = flyingEfficiencyPenalty(char, derived, totalMapSpawns)

    let totalExpPerHour = 0
    let totalMobCount = 0
    let flyingMobCount = 0
    let totalRespawn = 0
    let totalTimeToKill = 0
    let hitsToKillTop = 0   // hits to kill the highest-level scored mob (first in sorted arr)
    let worstSurvival = 1.0
    let bestAccuracy = 1.0
    let bestElemental = 1.0
    let mobProcessed = 0
    let isDangerous = false

    for (const mob of scoringMobsArr) {
      const mobLevelPenalty = levelPenaltyMultiplier(char.level, mob.level)
      const isFlying = !!(mob as MapMobEntry & { gifs?: { fly?: string } }).gifs?.fly

      const elMult = getBestElementalMult(char, mob)
      // Effective damage: base × elemental × skill multiplier × level-difference penalty (when mob is above player)
      const dmgLevelPenalty = levelDamagePenalty(char.level, mob.level)
      const rawAvgDmg = derived.damageRange.avg * elMult * skillDmgMult * dmgLevelPenalty
      // Subtract monster's physical or magic defense from effective damage
      const mobDef = MAGIC_CLASSES.has(char.className) ? (mob.MDDamage ?? 0) : (mob.PDDamage ?? 0)
      const effAvgDmg = Math.max(1, rawAvgDmg - mobDef)
      if (rawAvgDmg <= 0) continue

      const attacksToKill = Math.ceil(mob.hp / effAvgDmg)
      const timeToKill = attacksToKill * atkSec
      const respawnCycle = mob.mob_time > 0 ? mob.mob_time : 30
      const accReq = accuracyRequired(char.level, mob.level, mob.eva)
      const hr = MAGIC_CLASSES.has(char.className) ? 1.0 : hitRate(derived.accuracy, accReq)
      // Base kill rate; AoE skills clear multiple mobs per cast (capped by respawn ceiling)
      const baseKills = 3600 / Math.max(timeToKill, respawnCycle / Math.max(1, mob.count))
      const maxKillsFromRespawn = (mob.count / respawnCycle) * 3600
      const killsPerHour = skillTargets > 1
        ? Math.min(baseKills * Math.min(skillTargets, mob.count), maxKillsFromRespawn)
        : baseKills
      // Flying mobs: penalty depends on class attack reach + map size
      const flyingPenalty = isFlying ? flyingPenaltyForMap : 1.0
      const expPerHourMob = killsPerHour * mob.exp * mobLevelPenalty * hr * flyingPenalty

      totalExpPerHour += expPerHourMob
      totalMobCount += mob.count
      if (isFlying) flyingMobCount += mob.count
      totalRespawn += respawnCycle * mob.count
      totalTimeToKill += timeToKill * mob.count
      if (mobProcessed === 0) hitsToKillTop = attacksToKill  // first = highest level (sorted desc)
      if (hr < bestAccuracy) bestAccuracy = hr
      if (elMult > bestElemental) bestElemental = elMult

      // Survival: HP / 3 simulates potion healing between hits
      const mobDmgPerHit = Math.max(0, mob.PADamage - derived.totalPDD)
      const survFrac = mobDmgPerHit > 0 ? Math.min(1.0, derived.totalStats.HP / 3 / mobDmgPerHit) : 1.0
      if (survFrac < worstSurvival) worstSurvival = survFrac
      // isDangerous only from survival rating — one-shot check removed since low HP is a builder issue
      if (survFrac < 0.1) isDangerous = true

      mobProcessed++
    }

    if (mobProcessed === 0) continue

    const avgTimeToKill = totalTimeToKill / totalMobCount
    const avgRespawnTime = totalRespawn / totalMobCount
    const accuracyRating = bestAccuracy
    const survivalRating = worstSurvival
    const scoringCount = scoringMobsArr.reduce((acc, m) => acc + m.count, 0)
    const levelPenalty = scoringCount > 0
      ? scoringMobsArr.reduce((acc, m) => acc + levelPenaltyMultiplier(char.level, m.level) * m.count, 0) / scoringCount
      : 0

    const finalScore = totalExpPerHour * accuracyRating * Math.min(1.0, survivalRating + 0.3)

    const tags = computeTags({
      mobs: scoringMobsArr, char, accuracyRating, survivalRating, bestElemental, isDangerous, totalMobCount, flyingMobCount
    })

    scores.push({
      mapId,
      mapName,
      region,
      minimap: mapEntry?.minimap ?? undefined,
      mobs: mobsArr,
      score: finalScore,
      expPerHour: totalExpPerHour,
      tags,
      isDangerous,
      breakdown: {
        hitsToKillTop,
        avgTimeToKill,
        totalMobCount,
        flyingMobCount,
        avgRespawnTime,
        cycleExpPerHour: totalExpPerHour,
        survivalRating,
        accuracyRating,
        elementalBonus: bestElemental,
        levelPenalty,
      },
    })
  }

  // Filter out maps with effectively zero score (over-leveled / under-leveled)
  const MIN_USEFUL_EXP = 100  // at least 100 EXP/hr to be worth showing
  const useful = scores.filter(s => s.expPerHour >= MIN_USEFUL_EXP)
  const useless = scores.filter(s => s.expPerHour < MIN_USEFUL_EXP && !s.isDangerous)

  // Split dangerous maps out
  const dangerous = useful.filter(s => s.isDangerous)
  const safe = useful.filter(s => !s.isDangerous).sort((a, b) => b.score - a.score)

  // Exclude LOW EXP maps from recommended unless there's nothing else to show
  const isLowExp = (s: MapScore) => s.tags.some(t => t.label === 'LOW EXP')
  const safeNonLow = safe.filter(s => !isLowExp(s))
  const mostOptimalSource = safeNonLow.length > 0 ? safeNonLow : safe

  const third = Math.max(1, Math.ceil(safe.length / 3))
  return {
    mostOptimal:  mostOptimalSource.slice(0, 3),
    avgOptimal:   safe.slice(third, Math.min(third + 5, third * 2)),
    lessOptimal:  safe.slice(third * 2, Math.min(third * 2 + 3, safe.length)),
    dangerous:    dangerous.sort((a, b) => b.expPerHour - a.expPerHour).slice(0, 5),
    // Low-value maps shown at bottom for reference
    ignored:      useless.sort((a, b) => b.expPerHour - a.expPerHour).slice(0, 3),
  }
}
