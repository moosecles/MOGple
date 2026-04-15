import { useState, useEffect } from 'react'
import type { MapScore } from '../../engine/training'
import Badge from '../common/Badge'

interface MapCardProps {
  mapScore: MapScore
  rank?: number
  highlight?: boolean
  charLevel?: number
  mesoMode?: boolean
}

export default function MapCard({ mapScore, rank, highlight, charLevel, mesoMode }: MapCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [minimapOpen, setMinimapOpen] = useState(false)
  const { mapName, region, mobs, tags, breakdown } = mapScore

  useEffect(() => {
    if (!minimapOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setMinimapOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [minimapOpen])

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
          {mesoMode && mapScore.minShotsForMeso < 999 ? (
            <>
              <div className="text-sm font-semibold text-[#E8913A]">
                {mapScore.minShotsForMeso === 1 ? 'ONE-SHOT' : `${mapScore.minShotsForMeso}-SHOT`}
              </div>
              <div className="text-[10px] text-[#5C5B57]">{levelRange}</div>
            </>
          ) : (
            <>
              <div className="text-sm font-semibold text-[#5AC47E]">{levelRange}</div>
              <div className="text-[10px] text-[#5C5B57]">mob levels</div>
            </>
          )}
        </div>
      </div>

      {/* Mobs — sorted highest level first */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#8B8A85] mb-2">
        {sortedMobs.map(m => {
          const tooLow = charLevel !== undefined && charLevel - m.level > 10
          const isUndead = m.undead === 1
          const shots = mapScore.mobShotCounts[m.id]
          return (
            <span key={m.id} className={`inline-flex items-center gap-1 ${tooLow ? 'opacity-35' : ''}`}>
              <img
                src={`${import.meta.env.BASE_URL}${m.thumbnail}`}
                alt={m.name}
                className="w-5 h-5 object-contain flex-shrink-0"
                style={{ imageRendering: 'pixelated' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              {isUndead && (
                <span title="Undead — Holy element deals bonus damage" className="text-[10px]">☠</span>
              )}
              {m.name}
              {isUndead && (
                <span className="text-[#8B6FD4] text-[9px] border border-[rgba(139,111,212,0.3)] rounded px-1">UNDEAD</span>
              )}
              <span className="text-[#5C5B57]">Lv{m.level}</span> ×{m.count}
              {shots !== undefined && (
                <span className={`text-[9px] rounded px-1 border ${
                  shots === 1
                    ? 'text-[#5AC47E] border-[rgba(90,196,126,0.35)]'
                    : shots <= 3
                      ? 'text-[#E8913A] border-[rgba(232,145,58,0.35)]'
                      : 'text-[#E85A5A] border-[rgba(232,90,90,0.35)]'
                }`}>
                  {shots === 1 ? '1-HIT' : `${shots}-HIT`}
                </span>
              )}
            </span>
          )
        })}
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-3 text-xs mb-3">
        <span title="Hits needed to kill the highest-level mob on this map with your current skill">
          <span className="text-[#5C5B57]">Hits to kill top mob: </span>
          <span className={breakdown.hitsToKillTop === 1 ? 'text-[#5AC47E] font-semibold' : 'text-[#E8E6E1]'}>
            {breakdown.hitsToKillTop}
            {breakdown.hitsToKillTop === 1 && <span className="text-[#5AC47E] ml-1 text-[10px]">ONE-SHOT</span>}
          </span>
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
        <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)] space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[#5C5B57]">Total spawns: </span>
              <span className="text-[#E8E6E1]">{breakdown.totalMobCount}</span>
              {breakdown.flyingMobCount > 0 && (
                <span className="text-[#E8913A] ml-1">({breakdown.flyingMobCount} flying)</span>
              )}
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
            {mapScore.minShotsForMeso < 999 && (
              <div className="col-span-2">
                <span className="text-[#5C5B57]">Min hits to kill any mob: </span>
                <span className="text-[#E8913A]">{mapScore.minShotsForMeso}</span>
                <span className="text-[#5C5B57] ml-1 text-[10px]">
                  {mapScore.minShotsForMeso === 1 ? '— you can one-shot here' : `— ${mapScore.minShotsForMeso}-shot required`}
                </span>
              </div>
            )}
          </div>

          {/* Per-mob breakdown */}
          <div className="space-y-1">
            {sortedMobs.map(mob => {
              const isFlying = !!(mob as typeof mob & { gifs?: { fly?: string } }).gifs?.fly
              const isUndead = mob.undead === 1
              return (
                <div key={mob.id} className="text-xs text-[#5C5B57] flex justify-between">
                  <span className="flex items-center gap-1">
                    {isFlying && <span title="Flying mob">🪽</span>}
                    {isUndead && <span title="Undead">☠</span>}
                    {mob.name} Lv{mob.level}
                    {isUndead && <span className="text-[#8B6FD4]">(undead)</span>}
                  </span>
                  <span>{mob.hp.toLocaleString()} HP · {mob.exp} EXP · ×{mob.count}</span>
                </div>
              )
            })}
          </div>

          {/* Map layout minimap */}
          {mapScore.minimap && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#5C5B57] mb-1.5">Map Layout</div>
              <button
                onClick={() => setMinimapOpen(true)}
                className="group relative block"
                title="Click to enlarge"
              >
                <img
                  src={`${import.meta.env.BASE_URL}${mapScore.minimap}`}
                  alt={`${mapName} minimap`}
                  className="rounded border border-[rgba(255,255,255,0.08)] bg-[#0E1018] max-w-full transition-opacity group-hover:opacity-75"
                  style={{ imageRendering: 'pixelated', maxHeight: '160px' }}
                  onError={e => { (e.currentTarget as HTMLImageElement).closest('button')!.style.display = 'none' }}
                />
                <span className="absolute bottom-1 right-1 text-[10px] text-[#5C5B57] bg-[#0E1018] bg-opacity-80 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  enlarge
                </span>
              </button>
            </div>
          )}

          {/* Minimap lightbox overlay */}
          {minimapOpen && mapScore.minimap && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
              onClick={() => setMinimapOpen(false)}
            >
              <div
                className="relative bg-[#0E1018] border border-[rgba(255,255,255,0.12)] rounded-xl p-4 max-w-[90vw] max-h-[90vh] flex flex-col gap-3"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-[#E8E6E1]">{mapName}</div>
                    <div className="text-xs text-[#5C5B57]">{region}</div>
                  </div>
                  <button
                    onClick={() => setMinimapOpen(false)}
                    className="text-[#5C5B57] hover:text-[#E8E6E1] transition-colors text-lg leading-none ml-6"
                  >
                    ✕
                  </button>
                </div>
                <img
                  src={`${import.meta.env.BASE_URL}${mapScore.minimap}`}
                  alt={`${mapName} minimap`}
                  className="rounded border border-[rgba(255,255,255,0.08)] bg-[#13161F] max-w-full max-h-[70vh] object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
                <p className="text-[10px] text-[#5C5B57] text-center">Press Esc or click outside to close</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
