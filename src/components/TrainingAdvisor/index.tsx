import { useMemo } from 'react'
import type { CharacterState, DerivedStats } from '../../types'
import type { AppData } from '../../types'
import { rankMaps } from '../../engine/training'
import { ATTACK_SPEED_SECONDS, calcDamage } from '../../engine/damage'
import { getRankedSkills } from '../../engine/skills'
import MapCard from './MapCard'

interface TrainingAdvisorProps {
  data: AppData
  character: CharacterState
  derived: DerivedStats
}

function MissingGearWarning({ character, derived }: { character: CharacterState; derived: DerivedStats }) {
  const issues: string[] = []
  if (!character.equipment.weapon) issues.push('No weapon equipped — damage is 0')
  if (derived.weaponATK === 0 && character.equipment.weapon) issues.push('Weapon has no ATK (or unrecognized type)')
  if (character.level < 10 && character.className !== 'Beginner') issues.push('Level too low for 1st job skills')
  if (derived.damageRange.avg < 1) issues.push('Damage range is 0 — check your stats and weapon')

  if (issues.length === 0) return null

  return (
    <div className="bg-[rgba(232,145,58,0.08)] border border-[rgba(232,145,58,0.2)] rounded-xl p-4 space-y-1.5">
      <div className="text-xs font-semibold text-[#E8913A] uppercase tracking-widest mb-2">
        Build Incomplete
      </div>
      {issues.map(issue => (
        <div key={issue} className="flex items-start gap-2 text-sm text-[#8B8A85]">
          <span className="text-[#E8913A] mt-0.5 shrink-0">⚠</span>
          <span>{issue}</span>
        </div>
      ))}
      <p className="text-xs text-[#5C5B57] mt-2 pt-2 border-t border-[rgba(255,255,255,0.05)]">
        Go to the <strong className="text-[#8B8A85]">Character Builder</strong> tab to equip a weapon and configure your build.
      </p>
    </div>
  )
}

export default function TrainingAdvisor({ data, character, derived }: TrainingAdvisorProps) {
  const attackSpeedLabel = useMemo(() => {
    const weaponEquip = character.equipment.weapon
    if (!weaponEquip) return 'Normal'
    const item = data.equipById.get(weaponEquip.itemId)
    return item?.attack_speed_label ?? 'Normal'
  }, [character.equipment.weapon, data.equipById])

  // Best skill for this class (at max level) — used for training map scoring
  const bestSkill = useMemo(() => getRankedSkills(character.className, 1)[0], [character.className])

  const tiered = useMemo(
    () => rankMaps(data, character, derived, attackSpeedLabel, bestSkill),
    [data, character, derived, attackSpeedLabel, bestSkill]
  )

  const atkSec = ATTACK_SPEED_SECONDS[attackSpeedLabel] ?? 0.72
  const isMage = ['Magician','F/P Wizard','I/L Wizard','Cleric'].includes(character.className)
  // Show results if any category has maps (including dangerous)
  const hasResults = tiered.mostOptimal.length > 0 || tiered.avgOptimal.length > 0 || tiered.dangerous.length > 0

  // Skill damage range (per cast, using best skill at max level)
  const skillDamageRange = useMemo(() => {
    if (!bestSkill) return null
    const result = calcDamage({
      className: character.className,
      stats: derived.totalStats,
      weaponType: derived.weaponType,
      weaponATK: derived.weaponATK,
      weaponMAD: derived.weaponMAD,
      flatAttackPower: derived.flatAttackPower,
      masteryLevel: derived.masteryLevel,
      skillPercent: bestSkill.skillPercent,
      isLucky7: bestSkill.isLucky7,
      animation: bestSkill.animation === 'stab' ? 'stab' : 'swing',
    })
    const totalMin = Math.floor(result.min * bestSkill.hits)
    const totalMax = Math.floor(result.max * bestSkill.hits)
    const totalAvg = Math.floor(result.avg * bestSkill.hits)
    return { min: totalMin, max: totalMax, avg: totalAvg }
  }, [bestSkill, character, derived])

  return (
    <div className="space-y-5">
      {/* Build context card */}
      <div className="bg-[#13161F] border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
        <div className="text-[10px] uppercase tracking-widest text-[#5C5B57] mb-2">Current Build</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <div className="text-[10px] text-[#5C5B57] mb-0.5">Character</div>
            <div className="text-sm font-semibold text-[#E8E6E1]">Lv.{character.level} {character.className}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#5C5B57] mb-0.5">
              {skillDamageRange && bestSkill ? `${bestSkill.name} dmg` : 'Damage'}
            </div>
            {skillDamageRange ? (
              <>
                <div className="text-sm font-semibold">
                  <span className="text-[#E8913A]">{skillDamageRange.min.toLocaleString()}</span>
                  <span className="text-[#5C5B57] mx-1">–</span>
                  <span className="text-[#5AC47E]">{skillDamageRange.max.toLocaleString()}</span>
                </div>
                <div className="text-[10px] text-[#5C5B57]">avg {skillDamageRange.avg.toLocaleString()}</div>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold">
                  <span className="text-[#E8913A]">{Math.floor(derived.damageRange.min).toLocaleString()}</span>
                  <span className="text-[#5C5B57] mx-1">–</span>
                  <span className="text-[#5AC47E]">{Math.floor(derived.damageRange.max).toLocaleString()}</span>
                </div>
                <div className="text-[10px] text-[#5C5B57]">avg {Math.floor(derived.damageRange.avg).toLocaleString()}</div>
              </>
            )}
          </div>
          <div>
            <div className="text-[10px] text-[#5C5B57] mb-0.5">{isMage ? 'M.ATK' : 'W.ATK'}</div>
            <div className="text-sm font-semibold text-[#E8E6E1]">
              {isMage ? derived.weaponMAD : derived.weaponATK}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#5C5B57] mb-0.5">Speed · ACC</div>
            <div className="text-sm font-semibold text-[#E8E6E1]">
              {attackSpeedLabel} <span className="text-[#5C5B57] text-xs">({atkSec}s)</span>
            </div>
            <div className="text-[10px] text-[#5C5B57]">{derived.accuracy} ACC</div>
          </div>
        </div>
        {bestSkill && (
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[rgba(255,255,255,0.05)]">
            <img
              src={bestSkill.thumbnail}
              alt={bestSkill.name}
              className="w-5 h-5 rounded border border-[rgba(255,255,255,0.06)] bg-[#0E1018] object-contain shrink-0"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
            <span className="text-[10px] text-[#5C5B57]">
              Ranking assumes <span className="text-[#E8913A] font-medium">{bestSkill.name}</span>
              {bestSkill.targets > 1 && <span className="text-[#5A9DE8]"> ({bestSkill.targets}-target AoE)</span>}
              {' '}at max level · scores update as you change gear
            </span>
          </div>
        )}
      </div>

      {/* Missing gear warning */}
      <MissingGearWarning character={character} derived={derived} />

      {!hasResults && derived.damageRange.avg > 0 && (
        <div className="bg-[#13161F] border border-[rgba(255,255,255,0.06)] rounded-xl p-8 text-center">
          <div className="text-[#E8913A] text-2xl mb-3">🗺</div>
          <h3 className="text-base font-semibold text-[#E8E6E1] mb-2">No suitable maps found</h3>
          <p className="text-sm text-[#8B8A85] max-w-sm mx-auto">
            No maps had mobs in a good level range for you. Try adjusting your level or the mobs in this
            CBT are all too low/high level for a Lv.{character.level} {character.className}.
          </p>
          <p className="text-xs text-[#5C5B57] mt-3">
            Damage avg: {Math.floor(derived.damageRange.avg)} · Accuracy: {derived.accuracy}
          </p>
        </div>
      )}

      {/* Top 3 recommendations */}
      {tiered.mostOptimal.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#5AC47E] shrink-0" />
            <h2 className="text-xs uppercase tracking-widest text-[#5AC47E] font-semibold">Recommended Spots</h2>
            <span className="text-[10px] text-[#5C5B57]">Best maps for your build right now</span>
          </div>
          <div className="space-y-3">
            {tiered.mostOptimal.slice(0, 3).map((ms, i) => (
              <MapCard key={ms.mapId} mapScore={ms} rank={i + 1} highlight={i === 0} charLevel={character.level} />
            ))}
          </div>
        </section>
      )}

      {/* Danger Zone */}
      {tiered.dangerous.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#E85A5A] shrink-0" />
            <h2 className="text-xs uppercase tracking-widest text-[#E85A5A] font-semibold">Danger Zone</h2>
          </div>
          <p className="text-xs text-[#5C5B57] mb-3">
            Good EXP but mobs can one-shot or two-shot you. Gear up first.
          </p>
          <div className="space-y-3">
            {tiered.dangerous.slice(0, 3).map(ms => (
              <MapCard key={ms.mapId} mapScore={ms} charLevel={character.level} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
