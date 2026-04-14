import type { CharacterState, DerivedStats, Monster } from '../types'
import type { AppData } from '../types'
import {
  accuracyRequired, hitRate, elementMultiplier, ATTACK_SPEED_SECONDS, SKILL_ELEMENTS,
} from './damage'

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
  avgAttacksToKill: number
  avgTimeToKill: number
  totalMobCount: number
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
  const gap = playerLevel - mobLevel
  const negGap = mobLevel - playerLevel
  if (negGap > 20) return 0
  if (negGap > 5) return 0.7
  if (gap > 20) return 0
  if (gap > 10) return 0.7
  return 1.0
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
  let totalAttacksToKill = 0
  let totalTimeToKill = 0
  let worstSurvival = 1.0
  let bestAccuracy = 1.0
  let bestElemental = 1.0
  let mobProcessed = 0

  const levelPenalty = mobs.reduce((acc, m) => {
    return acc + levelPenaltyMultiplier(char.level, m.level) * m.count
  }, 0) / mobs.reduce((acc, m) => acc + m.count, 0)

  for (const mob of mobs) {
    const elMult = getBestElementalMult(char, mob)
    const effAvgDmg = derived.damageRange.avg * elMult
    if (effAvgDmg <= 0) continue

    const attacksToKill = Math.ceil(mob.hp / Math.max(1, effAvgDmg))
    const timeToKill = attacksToKill * (atkSpeedSec || 0.6)
    const respawnCycle = mob.mob_time > 0 ? mob.mob_time : 30

    const killsPerHour = 3600 / Math.max(timeToKill, respawnCycle / Math.max(1, mob.count))
    const mobLevelPenalty = levelPenaltyMultiplier(char.level, mob.level)

    const accReq = accuracyRequired(char.level, mob.level, mob.eva)
    const hr = hitRate(derived.accuracy, accReq)

    const expPerHourMob = killsPerHour * mob.exp * mobLevelPenalty * hr * mob.count

    totalExpPerHour += expPerHourMob
    totalMobCount += mob.count
    totalRespawn += respawnCycle * mob.count
    totalAttacksToKill += attacksToKill * mob.count
    totalTimeToKill += timeToKill * mob.count
    if (hr < bestAccuracy) bestAccuracy = hr
    if (elMult > bestElemental) bestElemental = elMult

    // Survival check: mob PADamage vs player HP
    const mobDmgPerHit = Math.max(0, mob.PADamage - derived.totalPDD)
    const survivalFraction = mobDmgPerHit > 0 ? Math.min(1.0, derived.totalStats.HP / 3 / mobDmgPerHit) : 1.0
    if (survivalFraction < worstSurvival) worstSurvival = survivalFraction

    mobProcessed++
  }

  if (mobProcessed === 0) return null

  const avgAttacksToKill = totalAttacksToKill / totalMobCount
  const avgTimeToKill = totalTimeToKill / totalMobCount
  const avgRespawnTime = totalRespawn / totalMobCount

  const accuracyRating = bestAccuracy
  const survivalRating = worstSurvival
  const isDangerous = survivalRating < 0.1 || mobs.some(m => (m.PADamage - derived.totalPDD) >= derived.totalStats.HP)

  const finalScore = totalExpPerHour * accuracyRating * Math.min(1.0, survivalRating + 0.3)

  const tags = computeTags({
    mobs, char, accuracyRating, survivalRating, bestElemental, isDangerous, totalMobCount
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
      avgAttacksToKill,
      avgTimeToKill,
      totalMobCount,
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
  mobs, char, accuracyRating, survivalRating, bestElemental, isDangerous, totalMobCount
}: {
  mobs: MapMobEntry[]
  char: CharacterState
  accuracyRating: number
  survivalRating: number
  bestElemental: number
  isDangerous: boolean
  totalMobCount: number
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

  if (accuracyRating < 0.85) {
    tags.push({ label: 'ACC ISSUE', variant: 'warning', tooltip: `~${Math.round(accuracyRating * 100)}% hit rate — you'll miss frequently` })
  }

  if (isDangerous) {
    tags.push({ label: 'LETHAL', variant: 'danger', tooltip: 'These mobs can one-shot or two-shot you' })
  } else if (survivalRating < 0.5) {
    tags.push({ label: 'RISKY', variant: 'warning', tooltip: 'Mobs deal significant damage — bring potions' })
  }

  // Check for over-leveled
  if (mobs.every(m => char.level - m.level > 10)) {
    tags.push({ label: 'LOW EXP', variant: 'warning', tooltip: 'You are much higher level than these mobs — reduced EXP' })
  }

  return tags
}

export interface TieredMaps {
  mostOptimal: MapScore[]
  avgOptimal: MapScore[]
  lessOptimal: MapScore[]
  dangerous: MapScore[]
}

export function rankMaps(
  data: AppData,
  char: CharacterState,
  derived: DerivedStats,
  attackSpeedLabel: string
): TieredMaps {
  const atkSec = ATTACK_SPEED_SECONDS[attackSpeedLabel] ?? 0.6

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
    let totalExpPerHour = 0
    let totalMobCount = 0
    let totalRespawn = 0
    let totalAttacksToKill = 0
    let totalTimeToKill = 0
    let worstSurvival = 1.0
    let bestAccuracy = 1.0
    let bestElemental = 1.0
    let mobProcessed = 0
    let isDangerous = false

    for (const mob of mobsArr) {
      const elMult = getBestElementalMult(char, mob)
      const effAvgDmg = derived.damageRange.avg * elMult
      if (effAvgDmg <= 0) continue

      const attacksToKill = Math.ceil(mob.hp / Math.max(1, effAvgDmg))
      const timeToKill = attacksToKill * atkSec
      const respawnCycle = mob.mob_time > 0 ? mob.mob_time : 30
      const mobLevelPenalty = levelPenaltyMultiplier(char.level, mob.level)
      const accReq = accuracyRequired(char.level, mob.level, mob.eva)
      const hr = hitRate(derived.accuracy, accReq)
      const killsPerHour = 3600 / Math.max(timeToKill, respawnCycle / Math.max(1, mob.count))
      const expPerHourMob = killsPerHour * mob.exp * mobLevelPenalty * hr * mob.count

      totalExpPerHour += expPerHourMob
      totalMobCount += mob.count
      totalRespawn += respawnCycle * mob.count
      totalAttacksToKill += attacksToKill * mob.count
      totalTimeToKill += timeToKill * mob.count
      if (hr < bestAccuracy) bestAccuracy = hr
      if (elMult > bestElemental) bestElemental = elMult

      const mobDmgPerHit = Math.max(0, mob.PADamage - derived.totalPDD)
      const survFrac = mobDmgPerHit > 0 ? Math.min(1.0, derived.totalStats.HP / 3 / mobDmgPerHit) : 1.0
      if (survFrac < worstSurvival) worstSurvival = survFrac
      if (mob.PADamage - derived.totalPDD >= derived.totalStats.HP) isDangerous = true

      mobProcessed++
    }

    if (mobProcessed === 0) continue

    const avgAttacksToKill = totalAttacksToKill / totalMobCount
    const avgTimeToKill = totalTimeToKill / totalMobCount
    const avgRespawnTime = totalRespawn / totalMobCount
    const accuracyRating = bestAccuracy
    const survivalRating = worstSurvival
    const levelPenalty = mobsArr.reduce((acc, m) => acc + levelPenaltyMultiplier(char.level, m.level) * m.count, 0) / mobsArr.reduce((acc, m) => acc + m.count, 0)

    const finalScore = totalExpPerHour * accuracyRating * Math.min(1.0, survivalRating + 0.3)

    const tags = computeTags({
      mobs: mobsArr, char, accuracyRating, survivalRating, bestElemental, isDangerous, totalMobCount
    })

    scores.push({
      mapId,
      mapName,
      region,
      mobs: mobsArr,
      score: finalScore,
      expPerHour: totalExpPerHour,
      tags,
      isDangerous,
      breakdown: {
        avgAttacksToKill,
        avgTimeToKill,
        totalMobCount,
        avgRespawnTime,
        cycleExpPerHour: totalExpPerHour,
        survivalRating,
        accuracyRating,
        elementalBonus: bestElemental,
        levelPenalty,
      },
    })
  }

  // Split dangerous maps out
  const dangerous = scores.filter(s => s.isDangerous)
  const safe = scores.filter(s => !s.isDangerous).sort((a, b) => b.score - a.score)

  const third = Math.ceil(safe.length / 3)
  return {
    mostOptimal: safe.slice(0, Math.min(5, third)),
    avgOptimal: safe.slice(third, Math.min(third + 5, third * 2)),
    lessOptimal: safe.slice(third * 2, Math.min(third * 2 + 3, safe.length)),
    dangerous: dangerous.sort((a, b) => b.expPerHour - a.expPerHour).slice(0, 5),
  }
}
