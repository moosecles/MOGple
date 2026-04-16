import { useMemo, useState } from 'react'
import type { CharacterState, DerivedStats } from '../../types'
import type { AppData } from '../../types'
import { rankMaps } from '../../engine/training'
import { ATTACK_SPEED_SECONDS, calcDamage } from '../../engine/damage'
import { getBestTrainingSkill, getBestSTSkill } from '../../engine/skills'
import MapCard from './MapCard'
import AccuracyChecker from './AccuracyChecker'

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

type AdvisorMode = 'exp' | 'meso'

export default function TrainingAdvisor({ data, character, derived }: TrainingAdvisorProps) {
  const [partySize, setPartySize] = useState(1)
  const [mode, setMode] = useState<AdvisorMode>('exp')

  const attackSpeedLabel = useMemo(() => {
    const weaponEquip = character.equipment.weapon
    if (!weaponEquip) return 'Normal'
    const item = data.equipById.get(weaponEquip.itemId)
    return item?.attack_speed_label ?? 'Normal'
  }, [character.equipment.weapon, data.equipById])

  // Use derived.weaponType directly — it's already computed and always in sync with equipped weapon
  const weaponType = derived.weaponType || undefined

  const skillCtx = useMemo(() => ({
    className: character.className,
    stats: derived.totalStats,
    weaponType: derived.weaponType || 'Sword',
    weaponATK: derived.weaponATK,
    weaponMAD: derived.weaponMAD,
    flatAttackPower: derived.flatAttackPower,
    masteryLevel: derived.masteryLevel,
  }), [character.className, derived])

  // Best skill for training (AoE-weighted, weapon-compatible)
  const bestTrainingSkill = useMemo(
    () => getBestTrainingSkill(character.className, weaponType, skillCtx),
    [character.className, weaponType, skillCtx]
  )

  // Best single-target DPS skill for bossing (weapon-compatible)
  const bestSTSkill = useMemo(
    () => getBestSTSkill(character.className, weaponType, skillCtx),
    [character.className, weaponType, skillCtx]
  )

  const tiered = useMemo(
    () => rankMaps(data, character, derived, attackSpeedLabel, bestTrainingSkill, partySize),
    [data, character, derived, attackSpeedLabel, bestTrainingSkill, partySize]
  )

  const atkSec = ATTACK_SPEED_SECONDS[attackSpeedLabel] ?? 0.72
  const isMage = ['Magician','F/P Wizard','I/L Wizard','Cleric'].includes(character.className)
  const hasResults = tiered.mostOptimal.length > 0 || tiered.avgOptimal.length > 0 || tiered.dangerous.length > 0

  // Skill damage range for the training skill
  const trainingSkillDmg = useMemo(() => {
    if (!bestTrainingSkill) return null
    const result = calcDamage({
      className: character.className,
      stats: derived.totalStats,
      weaponType: derived.weaponType,
      weaponATK: derived.weaponATK,
      weaponMAD: derived.weaponMAD,
      flatAttackPower: derived.flatAttackPower,
      masteryLevel: derived.masteryLevel,
      skillPercent: bestTrainingSkill.skillPercent,
      isLucky7: bestTrainingSkill.isLucky7,
      animation: bestTrainingSkill.animation === 'stab' ? 'stab' : 'swing',
    })
    return {
      min: Math.floor(result.min * bestTrainingSkill.hits),
      max: Math.floor(result.max * bestTrainingSkill.hits),
      avg: Math.floor(result.avg * bestTrainingSkill.hits),
    }
  }, [bestTrainingSkill, character, derived])

  // Are training and ST skills different?
  const skillsDiffer = bestTrainingSkill?.id !== bestSTSkill?.id

  // Party display values (confirmed CBT formula)
  const bonusRate = 0.25 + 0.05 * Math.max(0, partySize - 2)
  const partyExpMult = 1 + bonusRate * (partySize - 1)

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode('exp')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            mode === 'exp'
              ? 'bg-[rgba(90,196,126,0.15)] text-[#5AC47E] border border-[rgba(90,196,126,0.35)]'
              : 'text-[#5C5B57] hover:text-[#8B8A85] border border-transparent'
          }`}
        >
          EXP Farming
        </button>
        <button
          onClick={() => setMode('meso')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            mode === 'meso'
              ? 'bg-[rgba(232,145,58,0.15)] text-[#E8913A] border border-[rgba(232,145,58,0.35)]'
              : 'text-[#5C5B57] hover:text-[#8B8A85] border border-transparent'
          }`}
        >
          Meso Farming
        </button>
      </div>

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
              {trainingSkillDmg && bestTrainingSkill ? `${bestTrainingSkill.name} dmg` : 'Damage'}
            </div>
            {trainingSkillDmg ? (
              <>
                <div className="text-sm font-semibold">
                  <span className="text-[#E8913A]">{trainingSkillDmg.min.toLocaleString()}</span>
                  <span className="text-[#5C5B57] mx-1">–</span>
                  <span className="text-[#5AC47E]">{trainingSkillDmg.max.toLocaleString()}</span>
                </div>
                <div className="text-[10px] text-[#5C5B57]">avg {trainingSkillDmg.avg.toLocaleString()}</div>
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

        {/* Training skill + Boss skill */}
        {bestTrainingSkill && (
          <div className="mt-3 pt-2 border-t border-[rgba(255,255,255,0.05)] space-y-1.5">
            {/* Training skill */}
            <div className="flex items-center gap-2">
              <img
                src={bestTrainingSkill.thumbnail}
                alt={bestTrainingSkill.name}
                className="w-5 h-5 rounded border border-[rgba(255,255,255,0.06)] bg-[#0E1018] object-contain shrink-0"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              />
              <span className="text-[10px] text-[#5C5B57]">
                <span className="text-[#5AC47E] font-medium">Training:</span>{' '}
                <span className="text-[#E8913A] font-medium">{bestTrainingSkill.name}</span>
                {bestTrainingSkill.targets > 1 && (
                  <span className="text-[#5A9DE8]"> ({bestTrainingSkill.targets}-target AoE)</span>
                )}
                {bestTrainingSkill.element && (
                  <span className="text-[#8B8A85]"> · {bestTrainingSkill.element}</span>
                )}
                {' '}at max level · scores update as you change gear
              </span>
            </div>
            {/* ST/Boss skill — only if different */}
            {skillsDiffer && bestSTSkill && (
              <div className="flex items-center gap-2">
                <img
                  src={bestSTSkill.thumbnail}
                  alt={bestSTSkill.name}
                  className="w-5 h-5 rounded border border-[rgba(255,255,255,0.06)] bg-[#0E1018] object-contain shrink-0"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
                <span className="text-[10px] text-[#5C5B57]">
                  <span className="text-[#E8913A] font-medium">Bossing:</span>{' '}
                  <span className="text-[#E8E6E1] font-medium">{bestSTSkill.name}</span>
                  <span className="text-[#5C5B57]"> (best single-target DPS)</span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Party toggle — only for EXP mode */}
      {mode === 'exp' && (
        <div className="bg-[#13161F] border border-[rgba(255,255,255,0.06)] rounded-xl p-3 flex items-center gap-3 flex-wrap">
          <div className="text-[10px] uppercase tracking-widest text-[#5C5B57] shrink-0">Party</div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPartySize(1)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                partySize === 1
                  ? 'bg-[rgba(90,156,232,0.2)] text-[#5A9DE8] border border-[rgba(90,156,232,0.4)]'
                  : 'text-[#5C5B57] hover:text-[#8B8A85] border border-transparent'
              }`}
            >
              Solo
            </button>
            {[2, 3, 4, 5, 6].map(n => (
              <button
                key={n}
                onClick={() => setPartySize(n)}
                className={`w-8 h-7 rounded-lg text-xs font-medium transition-colors ${
                  partySize === n
                    ? 'bg-[rgba(90,156,232,0.2)] text-[#5A9DE8] border border-[rgba(90,156,232,0.4)]'
                    : 'text-[#5C5B57] hover:text-[#8B8A85] border border-transparent'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          {partySize > 1 && (
            <span className="text-[10px] text-[#5C5B57]">
              <span className="text-[#5A9DE8]">+{Math.round(bonusRate * 100)}%</span> bonus per partner kill
              <span className="mx-1">·</span>
              <span className="text-[#5A9DE8]">{partyExpMult.toFixed(2)}×</span> EXP vs solo
            </span>
          )}
        </div>
      )}

      {/* Missing gear warning */}
      <MissingGearWarning character={character} derived={derived} />

      {/* ── EXP MODE ──────────────────────────────────────────────────────────── */}
      {mode === 'exp' && (
        <>
          {!hasResults && derived.damageRange.avg > 0 && (
            <div className="bg-[#13161F] border border-[rgba(255,255,255,0.06)] rounded-xl p-8 text-center">
              <div className="text-[#E8913A] text-2xl mb-3">🗺</div>
              <h3 className="text-base font-semibold text-[#E8E6E1] mb-2">No suitable maps found</h3>
              <p className="text-sm text-[#8B8A85] max-w-sm mx-auto">
                No maps had mobs in a good level range for you. Try adjusting your level or check back when
                more CBT map data is available.
              </p>
              <p className="text-xs text-[#5C5B57] mt-3">
                Damage avg: {Math.floor(derived.damageRange.avg)} · Accuracy: {derived.accuracy}
              </p>
            </div>
          )}

          {tiered.mostOptimal.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#5AC47E] shrink-0" />
                <h2 className="text-xs uppercase tracking-widest text-[#5AC47E] font-semibold">Recommended Spots</h2>
                <span className="text-[10px] text-[#5C5B57]">Best maps for your build right now</span>
              </div>
              <div className="space-y-3">
                {tiered.mostOptimal.slice(0, 3).map((ms, i) => (
                  <MapCard key={ms.mapId} mapScore={ms} rank={i + 1} highlight={i === 0} charLevel={character.level}
                    playerAcc={derived.accuracy} playerLevel={character.level} isMagic={isMage} />
                ))}
              </div>
            </section>
          )}

          {tiered.lowAccuracy.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-[#8B6FD4] shrink-0" />
                <h2 className="text-xs uppercase tracking-widest text-[#8B6FD4] font-semibold">Needs More ACC</h2>
                <span className="text-[10px] text-[#5C5B57]">Good EXP once you can hit them</span>
              </div>
              <p className="text-xs text-[#5C5B57] mb-3">
                You can't reliably hit the top mobs here yet. Worth keeping in mind as you gear up.
              </p>
              <div className="space-y-3">
                {tiered.lowAccuracy.map((ms, i) => (
                  <MapCard key={ms.mapId} mapScore={ms} rank={tiered.mostOptimal.length + i + 1} charLevel={character.level}
                    playerAcc={derived.accuracy} playerLevel={character.level} isMagic={isMage} />
                ))}
              </div>
            </section>
          )}

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
                  <MapCard key={ms.mapId} mapScore={ms} charLevel={character.level}
                    playerAcc={derived.accuracy} playerLevel={character.level} isMagic={isMage} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* ── MESO MODE ─────────────────────────────────────────────────────────── */}
      {mode === 'meso' && (
        <>
          <div className="bg-[rgba(232,145,58,0.06)] border border-[rgba(232,145,58,0.15)] rounded-xl p-3">
            <p className="text-[10px] text-[#8B8A85]">
              <span className="text-[#E8913A] font-semibold">Meso farming logic:</span>{' '}
              Maps are ranked by the fewest hits needed to kill a mob × kills/hr × mob level.
              Fewer shots = faster clears. Higher-level mobs drop more mesos, so a lv25 map
              beats a lv15 map at the same shot count. If you can't one-shot anything,
              the best 2-shot (or 3-shot, etc.) maps are shown instead.
              No drop data is assumed — ranking is relative only.
            </p>
          </div>

          {tiered.topMeso.length === 0 && (
            <div className="bg-[#13161F] border border-[rgba(255,255,255,0.06)] rounded-xl p-8 text-center">
              <div className="text-[#E8913A] text-2xl mb-3">💰</div>
              <h3 className="text-base font-semibold text-[#E8E6E1] mb-2">No maps in range</h3>
              <p className="text-sm text-[#8B8A85] max-w-sm mx-auto">
                No mobs are in a viable level range for your character. Check your level and build in the Character Builder.
              </p>
            </div>
          )}

          {tiered.topMeso.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#E8913A] shrink-0" />
                <h2 className="text-xs uppercase tracking-widest text-[#E8913A] font-semibold">Best Meso Maps</h2>
                <span className="text-[10px] text-[#5C5B57]">One-shot kills · ranked by est. meso/hr</span>
              </div>
              <div className="space-y-3">
                {tiered.topMeso.map((ms, i) => (
                  <MapCard key={ms.mapId} mapScore={ms} rank={i + 1} highlight={i === 0} charLevel={character.level} mesoMode
                    playerAcc={derived.accuracy} playerLevel={character.level} isMagic={isMage} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Accuracy checker — always visible regardless of mode */}
      <AccuracyChecker
        monsters={data.monsters}
        playerAcc={derived.accuracy}
        playerLevel={character.level}
        isMagic={isMage}
      />
    </div>
  )
}
