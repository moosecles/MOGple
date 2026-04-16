import type { CharacterState, DerivedStats } from '../../types'
import { calcDamage } from '../../engine/damage'
import {
  getCompatibleSkills, singleTargetCoeff, trainingCoeff,
} from '../../engine/skills'
import type { SkillDamageInfo } from '../../engine/skills'

interface Props {
  character: CharacterState
  derived: DerivedStats
}

/** Compute avg damage for one full cast of a skill (primary + secondary hit phases). */
function skillAvgDamage(skill: SkillDamageInfo, character: CharacterState, derived: DerivedStats): number {
  const damageInput = {
    className: character.className,
    stats: derived.totalStats,
    weaponType: derived.weaponType,
    weaponATK: derived.weaponATK,
    weaponMAD: derived.weaponMAD,
    flatAttackPower: derived.flatAttackPower,
    masteryLevel: derived.masteryLevel,
    isLucky7: skill.isLucky7,
    animation: skill.animation,
  }
  const primary = calcDamage({ ...damageInput, skillPercent: skill.skillPercent })
  let total = primary.avg * skill.hits
  if (skill.secondaryHit) {
    const secondary = calcDamage({ ...damageInput, skillPercent: skill.secondaryHit.skillPercent })
    total += secondary.avg * skill.secondaryHit.hits
  }
  return total
}

function TargetBadge({ targets }: { targets: number }) {
  if (targets <= 1) return null
  return (
    <span className="ml-1 text-[10px] bg-[rgba(90,157,232,0.15)] text-[#5A9DE8] border border-[rgba(90,157,232,0.2)] rounded px-1.5 py-0.5">
      {targets} targets
    </span>
  )
}

function SkillRow({
  skill, character, derived, baseAvg, label,
}: {
  skill: SkillDamageInfo
  character: CharacterState
  derived: DerivedStats
  baseAvg: number
  label?: string
}) {
  const avg = skillAvgDamage(skill, character, derived)
  const pct = baseAvg > 0 ? Math.round((avg / baseAvg) * 100) : 0
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#13161F]">
      <img
        src={skill.thumbnail}
        alt={skill.name}
        className="w-7 h-7 rounded border border-[rgba(255,255,255,0.05)] bg-[#0E1018] object-contain shrink-0"
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs text-[#8B8A85]">{skill.name}</span>
          <TargetBadge targets={skill.targets} />
          {label && (
            <span className="text-[9px] text-[#5C5B57] border border-[rgba(255,255,255,0.06)] rounded px-1">{label}</span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        {avg > 0 && (
          <div className="text-xs text-[#5C5B57]">{Math.floor(avg).toLocaleString()}</div>
        )}
        <div className={`text-[10px] font-medium ${pct >= 80 ? 'text-[#E8913A]' : 'text-[#5C5B57]'}`}>
          {pct}%
        </div>
      </div>
    </div>
  )
}

export default function BestSkillPanel({ character, derived }: Props) {
  // Filter skills by equipped weapon type so incompatible skills are excluded
  const weaponType = derived.weaponType || undefined
  const compatible = weaponType
    ? getCompatibleSkills(character.className, weaponType)
    : []  // no weapon → can't determine valid skills

  if (compatible.length === 0) return null

  // Best single-target DPS (for bossing)
  const bestST = [...compatible].sort((a, b) => singleTargetCoeff(b) - singleTargetCoeff(a))[0]
  // Best AoE training skill
  const bestAoE = [...compatible].sort((a, b) => trainingCoeff(b) - trainingCoeff(a))[0]

  const stAvg = skillAvgDamage(bestST, character, derived)
  const aoeAvg = skillAvgDamage(bestAoE, character, derived)

  // Other skills (exclude the top two, de-duped)
  const topIds = new Set([bestST.id, bestAoE.id])
  const others = [...compatible]
    .sort((a, b) => singleTargetCoeff(b) - singleTargetCoeff(a))
    .filter(s => !topIds.has(s.id))

  const skillsDiffer = bestST.id !== bestAoE.id

  return (
    <div className="border-t border-[rgba(255,255,255,0.06)] pt-3 mt-1 space-y-3">

      {/* Best Single-Target DPS */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-[#5C5B57] mb-2">Best Single-Target DPS</div>
        <div className="bg-[#1A1E2A] border border-[rgba(255,255,255,0.08)] rounded-xl p-3 flex items-center gap-3">
          <img
            src={bestST.thumbnail}
            alt={bestST.name}
            className="w-10 h-10 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#0E1018] object-contain shrink-0"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-[#5C5B57] leading-none mb-0.5">Best for bossing (if maxed)</div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-[#E85A5A]">{bestST.name}</span>
              {bestST.element && (
                <span className="text-[10px] text-[#8B8A85] border border-[rgba(255,255,255,0.08)] rounded px-1.5 py-0.5">
                  {bestST.element}
                </span>
              )}
              <TargetBadge targets={bestST.targets} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-[#8B8A85]">
                {(singleTargetCoeff(bestST) * 100).toFixed(0)}% per cast
              </span>
              {stAvg > 0 && (
                <span className="text-xs font-medium text-[#E8E6E1]">
                  ≈ {Math.floor(stAvg).toLocaleString()} avg dmg
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Best Training/Farming skill */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-[#5C5B57] mb-2">Best Training Skill</div>
        <div className="bg-[#1A1E2A] border border-[rgba(255,255,255,0.08)] rounded-xl p-3 flex items-center gap-3">
          <img
            src={bestAoE.thumbnail}
            alt={bestAoE.name}
            className="w-10 h-10 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#0E1018] object-contain shrink-0"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-[#5C5B57] leading-none mb-0.5">Best for farming maps (if maxed)</div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-[#5AC47E]">{bestAoE.name}</span>
              {bestAoE.element && (
                <span className="text-[10px] text-[#8B8A85] border border-[rgba(255,255,255,0.08)] rounded px-1.5 py-0.5">
                  {bestAoE.element}
                </span>
              )}
              <TargetBadge targets={bestAoE.targets} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-[#8B8A85]">
                {skillsDiffer
                  ? `${bestAoE.targets > 1 ? `${bestAoE.targets}-target AoE · ` : ''}${(trainingCoeff(bestAoE) * 100).toFixed(0)}% total clear`
                  : 'Same as single-target'
                }
              </span>
              {aoeAvg > 0 && (
                <span className="text-xs font-medium text-[#E8E6E1]">
                  ≈ {Math.floor(aoeAvg).toLocaleString()} avg dmg/cast
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Other skills comparison */}
      {others.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-widest text-[#5C5B57]">Other Skills</div>
          {others.map(skill => (
            <SkillRow
              key={skill.id}
              skill={skill}
              character={character}
              derived={derived}
              baseAvg={stAvg}
            />
          ))}
        </div>
      )}
    </div>
  )
}
