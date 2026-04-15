import { useState } from 'react'
import type { DerivedStats, CharacterState } from '../../types'

interface StatPanelProps {
  character: CharacterState
  derived: DerivedStats
}

function Tooltip({ text }: { text: string }) {
  return (
    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 pointer-events-none">
      <div className="bg-[#1A1E2A] border border-[rgba(255,255,255,0.12)] rounded-lg px-3 py-2 text-[11px] text-[#8B8A85] leading-relaxed shadow-xl">
        {text}
      </div>
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[rgba(255,255,255,0.12)]" />
    </div>
  )
}

function StatRow({
  label,
  value,
  sub,
  tooltip,
}: {
  label: string
  value: string | number
  sub?: string
  tooltip?: string
}) {
  const [show, setShow] = useState(false)

  return (
    <div
      className="flex items-center justify-between py-1.5 border-b border-[rgba(255,255,255,0.04)] last:border-0"
      onMouseEnter={() => tooltip && setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <div className="relative flex items-center gap-1">
        <span className="text-xs text-[#8B8A85]">{label}</span>
        {tooltip && (
          <>
            <span className="text-[10px] text-[#5C5B57] cursor-help select-none">?</span>
            {show && <Tooltip text={tooltip} />}
          </>
        )}
      </div>
      <div className="text-right">
        <span className="text-sm font-medium text-[#E8E6E1]">{value}</span>
        {sub && <span className="text-xs text-[#5C5B57] ml-1">({sub})</span>}
      </div>
    </div>
  )
}

export default function StatPanel({ character, derived }: StatPanelProps) {
  const { level, className } = character
  const { totalStats, weaponATK, weaponMAD, damageRange, accuracy, avoid, critRate, critDmg, mastery, masteryLevel } = derived

  const isMage = ['Magician','F/P Wizard','I/L Wizard','Cleric'].includes(className)

  const masteryTooltip = isMage
    ? 'Mages have fixed max mastery. Mastery sets how low your minimum damage can go relative to your max.'
    : `From your Mastery skill (level ${masteryLevel}/10). Formula: (0.1 + lvl/10) × 0.8. At max, min damage = 88% of max.`

  const damageTooltip = isMage
    ? 'Magic damage: (MATK² / 1000 + MATK + INT/100) × skill%. Min is scaled by mastery.'
    : `Physical damage: (1.0 + (primary × weapon_mult + secondary + AP) / 100) × W.ATK × skill%. Min is scaled by mastery.`

  const critTooltip = `Base 5% crit rate from class default. Boosted by skills like Critical Shot or Critical Throw. Crit deals +${critDmg}% extra damage.`

  const accuracyTooltip = `Accuracy = (DEX × 0.8 + LUK × 0.2) × 4 / 3 at your level. Hit rate depends on mob level and their AVOID stat.`

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
        <StatRow
          label="Mastery"
          value={`${Math.round(mastery * 100)}%`}
          tooltip={masteryTooltip}
        />

        <div className="h-px bg-[rgba(255,255,255,0.04)] my-2" />

        <div className="py-2 relative">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-xs text-[#8B8A85]">Damage Range</span>
            <DamageTooltip text={damageTooltip} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-semibold text-[#E8913A]">{Math.floor(damageRange.min).toLocaleString()}</span>
            <span className="text-[#5C5B57] text-sm">~</span>
            <span className="text-lg font-semibold text-[#5AC47E]">{Math.floor(damageRange.max).toLocaleString()}</span>
          </div>
          <div className="text-xs text-[#5C5B57]">avg {Math.floor(damageRange.avg).toLocaleString()}</div>
        </div>

        <div className="h-px bg-[rgba(255,255,255,0.04)] my-2" />

        <StatRow label="Accuracy" value={accuracy} tooltip={accuracyTooltip} />
        <StatRow label="Avoid" value={avoid} />
        {critRate > 0 && (
          <StatRow
            label="Crit Rate"
            value={`${critRate}%`}
            sub={critDmg > 0 ? `+${critDmg}% dmg` : undefined}
            tooltip={critTooltip}
          />
        )}
      </div>
    </div>
  )
}

/** Inline hover tooltip for the damage range row (non-StatRow layout) */
function DamageTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative inline-flex items-center">
      <span
        className="text-[10px] text-[#5C5B57] cursor-help select-none"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        ?
      </span>
      {show && <Tooltip text={text} />}
    </div>
  )
}
