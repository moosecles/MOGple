import { useMemo } from 'react'
import type { CharacterState, DerivedStats } from '../../types'
import type { AppData } from '../../types'
import { rankMaps } from '../../engine/training'
import { ATTACK_SPEED_SECONDS } from '../../engine/damage'
import MapCard from './MapCard'

interface TrainingAdvisorProps {
  data: AppData
  character: CharacterState
  derived: DerivedStats
}

export default function TrainingAdvisor({ data, character, derived }: TrainingAdvisorProps) {
  // Determine attack speed from weapon
  const attackSpeedLabel = useMemo(() => {
    const weaponEquip = character.equipment.weapon
    if (!weaponEquip) return 'Normal'
    const item = data.equipById.get(weaponEquip.itemId)
    return item?.attack_speed_label ?? 'Normal'
  }, [character.equipment.weapon, data.equipById])

  const tiered = useMemo(
    () => rankMaps(data, character, derived, attackSpeedLabel),
    [data, character, derived, attackSpeedLabel]
  )

  const atkSec = ATTACK_SPEED_SECONDS[attackSpeedLabel] ?? 0.72

  return (
    <div className="space-y-6">
      {/* Context banner */}
      <div className="bg-[#13161F] border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
        <h2 className="text-xs uppercase tracking-widest text-[#5C5B57] mb-2">Based on your current build</h2>
        <p className="text-sm text-[#8B8A85]">
          Level {character.level} {character.className} · {' '}
          {derived.damageRange.min.toFixed(0)}–{derived.damageRange.max.toFixed(0)} avg dmg · {' '}
          {derived.weaponATK > 0 ? `${derived.weaponATK} W.ATK` : 'no weapon'} · {' '}
          {attackSpeedLabel} speed ({atkSec}s/atk) · {' '}
          {derived.accuracy} ACC
        </p>
        <p className="text-xs text-[#5C5B57] mt-1">
          Rankings update instantly when you change your gear or skills in the Character Builder.
        </p>
      </div>

      {/* Most Optimal */}
      {tiered.mostOptimal.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-[#5AC47E] mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#5AC47E] inline-block" />
            Most Optimal
          </h2>
          <div className="space-y-3">
            {tiered.mostOptimal.map((ms, i) => (
              <MapCard key={ms.mapId} mapScore={ms} rank={i + 1} highlight={i === 0} />
            ))}
          </div>
        </section>
      )}

      {/* Average Optimal */}
      {tiered.avgOptimal.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-[#E8913A] mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E8913A] inline-block" />
            Average Optimal
          </h2>
          <div className="space-y-3">
            {tiered.avgOptimal.map((ms, i) => (
              <MapCard key={ms.mapId} mapScore={ms} rank={tiered.mostOptimal.length + i + 1} />
            ))}
          </div>
        </section>
      )}

      {/* Less Optimal */}
      {tiered.lessOptimal.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-[#5C5B57] mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#5C5B57] inline-block" />
            Less Optimal
          </h2>
          <div className="space-y-3">
            {tiered.lessOptimal.map((ms, i) => (
              <MapCard key={ms.mapId} mapScore={ms} rank={tiered.mostOptimal.length + tiered.avgOptimal.length + i + 1} />
            ))}
          </div>
        </section>
      )}

      {/* Danger Zone */}
      {tiered.dangerous.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-[#E85A5A] mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E85A5A] inline-block" />
            Danger Zone
          </h2>
          <p className="text-xs text-[#5C5B57] mb-3">
            These maps have high EXP potential but mobs can one-shot or two-shot you. Gear up first.
          </p>
          <div className="space-y-3">
            {tiered.dangerous.map((ms) => (
              <MapCard key={ms.mapId} mapScore={ms} />
            ))}
          </div>
        </section>
      )}

      {tiered.mostOptimal.length === 0 && tiered.avgOptimal.length === 0 && (
        <div className="text-center py-16 text-[#5C5B57]">
          <p className="text-lg mb-2">No maps to show</p>
          <p className="text-sm">Set up your character in the Builder tab to see training recommendations.</p>
        </div>
      )}
    </div>
  )
}
