import type { CharacterState, DerivedStats } from '../../types'
import { calcDamage } from '../../engine/damage'
import { getRankedSkills, singleTargetCoeff } from '../../engine/skills'
import type { SkillDamageInfo } from '../../engine/skills'

interface Props {
  character: CharacterState
  derived: DerivedStats
}

/** Compute avg damage for one cast of a skill (single-target, ignoring AoE). */
function skillAvgDamage(skill: SkillDamageInfo, character: CharacterState, derived: DerivedStats): number {
  const result = calcDamage({
    className: character.className,
    stats: derived.totalStats,
    weaponType: derived.weaponType,
    weaponATK: derived.weaponATK,
    weaponMAD: derived.weaponMAD,
    flatAttackPower: derived.flatAttackPower,
    masteryLevel: derived.masteryLevel,
    skillPercent: skill.skillPercent,
    isLucky7: skill.isLucky7,
    animation: skill.animation === 'stab' ? 'stab' : 'swing',
  })
  return result.avg * skill.hits
}

function TargetBadge({ targets }: { targets: number }) {
  if (targets <= 1) return null
  return (
    <span className="ml-1 text-[10px] bg-[rgba(90,157,232,0.15)] text-[#5A9DE8] border border-[rgba(90,157,232,0.2)] rounded px-1.5 py-0.5">
      {targets} targets
    </span>
  )
}

export default function BestSkillPanel({ character, derived }: Props) {
  const ranked = getRankedSkills(character.className, 3)
  if (ranked.length === 0) return null

  const [best, ...rest] = ranked
  const bestAvg = skillAvgDamage(best, character, derived)

  return (
    <div className="border-t border-[rgba(255,255,255,0.06)] pt-3 mt-1">
      <div className="text-[10px] uppercase tracking-widest text-[#5C5B57] mb-2">Best Damage Skill</div>

      {/* Best skill card */}
      <div className="bg-[#1A1E2A] border border-[rgba(255,255,255,0.08)] rounded-xl p-3 flex items-center gap-3">
        <img
          src={best.thumbnail}
          alt={best.name}
          className="w-10 h-10 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#0E1018] object-contain shrink-0"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-[#5C5B57] leading-none mb-0.5">Your best skill (if maxed)</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-[#5AC47E]">{best.name}</span>
            {best.element && (
              <span className="text-[10px] text-[#8B8A85] border border-[rgba(255,255,255,0.08)] rounded px-1.5 py-0.5">
                {best.element}
              </span>
            )}
            <TargetBadge targets={best.targets} />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-[#8B8A85]">
              {(singleTargetCoeff(best) * 100).toFixed(0)}% per cast
            </span>
            {bestAvg > 0 && (
              <span className="text-xs font-medium text-[#E8E6E1]">
                ≈ {Math.floor(bestAvg).toLocaleString()} avg dmg
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Other skills comparison */}
      {rest.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {rest.map(skill => {
            const avg = skillAvgDamage(skill, character, derived)
            const pct = bestAvg > 0 ? Math.round((avg / bestAvg) * 100) : 0
            return (
              <div key={skill.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#13161F]">
                <img
                  src={skill.thumbnail}
                  alt={skill.name}
                  className="w-7 h-7 rounded border border-[rgba(255,255,255,0.05)] bg-[#0E1018] object-contain shrink-0"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-[#8B8A85]">{skill.name}</span>
                    <TargetBadge targets={skill.targets} />
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
          })}
        </div>
      )}
    </div>
  )
}
