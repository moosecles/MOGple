import type { DerivedStats, CharacterState } from '../../types'

interface StatPanelProps {
  character: CharacterState
  derived: DerivedStats
}

function StatRow({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[rgba(255,255,255,0.04)] last:border-0">
      <span className="text-xs text-[#8B8A85]">{label}</span>
      <div className="text-right">
        <span className="text-sm font-medium text-[#E8E6E1]">{value}</span>
        {sub && <span className="text-xs text-[#5C5B57] ml-1">({sub})</span>}
      </div>
    </div>
  )
}

export default function StatPanel({ character, derived }: StatPanelProps) {
  const { level, className } = character
  const { totalStats, weaponATK, weaponMAD, damageRange, accuracy, avoid, critRate, mastery } = derived

  const isMage = ['Magician','F/P Wizard','I/L Wizard','Cleric'].includes(className)

  return (
    <div className="bg-[#13161F] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 space-y-1">
      <h3 className="text-xs uppercase tracking-widest text-[#5C5B57] mb-3">Character Stats</h3>

      <div className="space-y-0">
        <StatRow label="Level" value={level} />
        <StatRow label="Class" value={className} />

        <div className="h-px bg-[rgba(255,255,255,0.04)] my-2" />

        <StatRow label="STR" value={totalStats.STR}
          sub={totalStats.STR !== character.baseStats.STR ? `+${totalStats.STR - character.baseStats.STR} gear` : undefined} />
        <StatRow label="DEX" value={totalStats.DEX}
          sub={totalStats.DEX !== character.baseStats.DEX ? `+${totalStats.DEX - character.baseStats.DEX} gear` : undefined} />
        <StatRow label="INT" value={totalStats.INT}
          sub={totalStats.INT !== character.baseStats.INT ? `+${totalStats.INT - character.baseStats.INT} gear` : undefined} />
        <StatRow label="LUK" value={totalStats.LUK}
          sub={totalStats.LUK !== character.baseStats.LUK ? `+${totalStats.LUK - character.baseStats.LUK} gear` : undefined} />

        <div className="h-px bg-[rgba(255,255,255,0.04)] my-2" />

        <StatRow label="HP" value={totalStats.HP.toLocaleString()} />
        <StatRow label="MP" value={totalStats.MP.toLocaleString()} />

        <div className="h-px bg-[rgba(255,255,255,0.04)] my-2" />

        {isMage ? (
          <StatRow label="W.ATK (M)" value={weaponMAD} />
        ) : (
          <StatRow label="W.ATK" value={weaponATK} />
        )}
        <StatRow label="Mastery" value={`${Math.round(mastery * 100)}%`} />

        <div className="h-px bg-[rgba(255,255,255,0.04)] my-2" />

        <div className="py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#8B8A85]">Damage Range</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-semibold text-[#E8913A]">{Math.floor(damageRange.min).toLocaleString()}</span>
            <span className="text-[#5C5B57] text-sm">~</span>
            <span className="text-lg font-semibold text-[#5AC47E]">{Math.floor(damageRange.max).toLocaleString()}</span>
          </div>
          <div className="text-xs text-[#5C5B57]">avg {Math.floor(damageRange.avg).toLocaleString()}</div>
        </div>

        <div className="h-px bg-[rgba(255,255,255,0.04)] my-2" />

        <StatRow label="Accuracy" value={accuracy} />
        <StatRow label="Avoid" value={avoid} />
        {critRate > 0 && <StatRow label="Crit Rate" value={`${Math.round(critRate * 100)}%`} />}
      </div>
    </div>
  )
}
