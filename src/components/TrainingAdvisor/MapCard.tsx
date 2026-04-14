import { useState } from 'react'
import type { MapScore } from '../../engine/training'
import Badge from '../common/Badge'

interface MapCardProps {
  mapScore: MapScore
  rank?: number
  highlight?: boolean
  charLevel?: number
}

export default function MapCard({ mapScore, rank, highlight, charLevel }: MapCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { mapName, region, mobs, tags, breakdown } = mapScore

  // Sort mobs by level descending so the most relevant mobs appear first
  const sortedMobs = [...mobs].sort((a, b) => b.level - a.level)

  const mobLevels = mobs.map(m => m.level)
  const minLvl = Math.min(...mobLevels)
  const maxLvl = Math.max(...mobLevels)
  const levelRange = minLvl === maxLvl ? `Lv.${minLvl}` : `Lv.${minLvl}–${maxLvl}`

  return (
    <div
      className={`
        bg-[#13161F] border rounded-xl p-4 transition-all
        ${highlight
          ? 'border-[rgba(232,145,58,0.4)] shadow-[0_0_20px_rgba(232,145,58,0.05)]'
          : mapScore.isDangerous
            ? 'border-[rgba(232,90,90,0.3)]'
            : 'border-[rgba(255,255,255,0.06)]'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {rank && (
              <span className="text-xs text-[#5C5B57] shrink-0">#{rank}</span>
            )}
            <h3 className="text-sm font-semibold text-[#E8E6E1] truncate">{mapName}</h3>
          </div>
          <div className="text-xs text-[#5C5B57] mt-0.5">{region}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-semibold text-[#5AC47E]">{levelRange}</div>
          <div className="text-[10px] text-[#5C5B57]">mob levels</div>
        </div>
      </div>

      {/* Mobs — sorted highest level first, all shown */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#8B8A85] mb-2">
        {sortedMobs.map(m => {
          const tooLow = charLevel !== undefined && charLevel - m.level > 10
          return (
            <span key={m.id} className={`inline-flex items-center gap-1 ${tooLow ? 'opacity-35' : ''}`}>
              <img
                src={`${import.meta.env.BASE_URL}${m.thumbnail}`}
                alt={m.name}
                className="w-5 h-5 object-contain flex-shrink-0"
                style={{ imageRendering: 'pixelated' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              {m.name} <span className="text-[#5C5B57]">Lv{m.level}</span> ×{m.count}
            </span>
          )
        })}
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-3 text-xs mb-3">
        <span>
          <span className="text-[#5C5B57]">Hits to kill: </span>
          <span className="text-[#E8E6E1]">{breakdown.avgAttacksToKill.toFixed(1)}</span>
        </span>
        <span>
          <span className="text-[#5C5B57]">Acc: </span>
          <span className={breakdown.accuracyRating < 0.85 ? 'text-[#E8913A]' : 'text-[#E8E6E1]'}>
            {Math.round(breakdown.accuracyRating * 100)}%
          </span>
        </span>
        <span>
          <span className="text-[#5C5B57]">Safety: </span>
          <span className={breakdown.survivalRating < 0.5 ? 'text-[#E85A5A]' : 'text-[#5AC47E]'}>
            {mapScore.isDangerous ? 'Dangerous' : breakdown.survivalRating >= 0.8 ? 'Safe' : 'Caution'}
          </span>
        </span>
        {breakdown.elementalBonus > 1.0 && (
          <span>
            <span className="text-[#5C5B57]">Elem: </span>
            <span className="text-[#5AC47E]">{breakdown.elementalBonus}×</span>
          </span>
        )}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.map(tag => (
            <Badge key={tag.label} label={tag.label} variant={tag.variant} tooltip={tag.tooltip} />
          ))}
        </div>
      )}

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-[#5C5B57] hover:text-[#8B8A85] transition-colors"
      >
        {expanded ? '▲ Less detail' : '▼ More detail'}
      </button>

      {/* Expanded breakdown */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)] space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[#5C5B57]">Total spawns: </span>
              <span className="text-[#E8E6E1]">{breakdown.totalMobCount}</span>
            </div>
            <div>
              <span className="text-[#5C5B57]">Avg respawn: </span>
              <span className="text-[#E8E6E1]">{breakdown.avgRespawnTime.toFixed(0)}s</span>
            </div>
            <div>
              <span className="text-[#5C5B57]">Avg TTK: </span>
              <span className="text-[#E8E6E1]">{breakdown.avgTimeToKill.toFixed(1)}s</span>
            </div>
            <div>
              <span className="text-[#5C5B57]">Level penalty: </span>
              <span className="text-[#E8E6E1]">{Math.round(breakdown.levelPenalty * 100)}%</span>
            </div>
          </div>

          {/* Per-mob breakdown */}
          <div className="space-y-1">
            {sortedMobs.map(mob => (
              <div key={mob.id} className="text-xs text-[#5C5B57] flex justify-between">
                <span>{mob.name} Lv{mob.level}</span>
                <span>{mob.hp.toLocaleString()} HP · {mob.exp} EXP · ×{mob.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
