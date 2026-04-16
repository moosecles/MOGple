import { useState, useMemo } from 'react'
import type { Monster } from '../../types'
import { hitRate, accuracyRequired, accForAnyHit, accForGuaranteedHit } from '../../engine/damage'

interface Props {
  monsters: Monster[]
  playerAcc: number
  playerLevel: number
  isMagic: boolean
}

function hitColor(pct: number): string {
  if (pct >= 95) return '#5AC47E'
  if (pct >= 70) return '#E8913A'
  if (pct >= 20) return '#E85A5A'
  return '#5C5B57'
}

export default function AccuracyChecker({ monsters, playerAcc, playerLevel, isMagic }: Props) {
  const [search, setSearch]     = useState('')
  const [open, setOpen]         = useState(false)
  const [selected, setSelected] = useState<Monster | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return monsters
      .filter(m => !m.is_boss)
      .filter(m => !q || m.name.toLowerCase().includes(q))
      .sort((a, b) => a.level - b.level)
  }, [monsters, search])

  function getMobStats(mob: Monster) {
    if (isMagic) return { pct: 100, toStart: 0, toGuarantee: 0 }
    const accReq      = accuracyRequired(playerLevel, mob.level, mob.eva)
    const pct         = Math.round(hitRate(playerAcc, accReq) * 100)
    const toStart     = Math.max(0, accForAnyHit(playerLevel, mob.level, mob.eva) + 1 - playerAcc)
    const toGuarantee = Math.max(0, accForGuaranteedHit(playerLevel, mob.level, mob.eva) - playerAcc)
    return { pct, toStart, toGuarantee }
  }

  const selStats = selected ? getMobStats(selected) : null

  return (
    <div className="border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden">
      {/* Header / toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#13161F] hover:bg-[#1A1E2A] transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#5A9DE8] shrink-0">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
          </svg>
          <span className="text-xs font-semibold text-[#E8E6E1]">Accuracy vs Mobs</span>
          <span className="text-[10px] text-[#5C5B57]">check your hit rate against any monster</span>
        </div>
        <span className="text-[#5C5B57] text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="bg-[#0F1119] p-4 space-y-4">

          {/* Search */}
          <input
            type="text"
            placeholder="Search monsters..."
            value={search}
            onChange={e => { setSearch(e.target.value); setSelected(null) }}
            className="w-full bg-[#1A1E2A] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#E8E6E1] placeholder:text-[#5C5B57] outline-none focus:border-[rgba(90,156,232,0.4)]"
          />

          {/* Mob grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-80 overflow-y-auto pr-0.5">
            {filtered.map(mob => {
              const { pct, toStart, toGuarantee } = getMobStats(mob)
              const isSelected = selected?.id === mob.id
              const color = hitColor(pct)

              return (
                <button
                  key={mob.id}
                  onClick={() => setSelected(isSelected ? null : mob)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all border ${
                    isSelected
                      ? 'bg-[#1A1E2A] border-[rgba(90,156,232,0.35)]'
                      : 'bg-[#13161F] border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.1)] hover:bg-[#15181F]'
                  }`}
                >
                  <img
                    src={`${import.meta.env.BASE_URL}${mob.thumbnail}`}
                    alt={mob.name}
                    className="w-8 h-8 object-contain shrink-0"
                    style={{ imageRendering: 'pixelated' }}
                    onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-[#E8E6E1] truncate">{mob.name}</span>
                      <span className="text-[10px] text-[#5C5B57] shrink-0">Lv.{mob.level}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {/* Mini progress bar */}
                      <div className="w-10 h-1 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden shrink-0">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold tabular-nums" style={{ color }}>
                        {isMagic ? '100%' : `~${pct}%`}
                      </span>
                      {!isMagic && toGuarantee === 0 && (
                        <span className="text-[10px] text-[#5AC47E]">guaranteed</span>
                      )}
                      {!isMagic && toGuarantee > 0 && (
                        <span className="text-[10px] text-[#5C5B57]">
                          {pct === 0 ? `+${toStart} to hit` : `+${toGuarantee} to cap`}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
            {filtered.length === 0 && (
              <div className="col-span-2 text-center py-8 text-sm text-[#5C5B57]">
                No monsters found{search ? ` for "${search}"` : ''}
              </div>
            )}
          </div>

          {/* Selected mob detail */}
          {selected && selStats && (
            <div className="bg-[#1A1E2A] border border-[rgba(255,255,255,0.08)] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={`${import.meta.env.BASE_URL}${selected.thumbnail}`}
                  alt={selected.name}
                  className="w-14 h-14 object-contain shrink-0"
                  style={{ imageRendering: 'pixelated' }}
                  onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#E8E6E1]">{selected.name}</div>
                  <div className="text-xs text-[#5C5B57] mt-0.5">
                    Lv.{selected.level} · {selected.eva} EVA · {selected.hp.toLocaleString()} HP
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className="text-3xl font-bold tabular-nums leading-none"
                    style={{ color: hitColor(selStats.pct) }}
                  >
                    {isMagic ? '100%' : `~${selStats.pct}%`}
                  </div>
                  <div className="text-[10px] text-[#5C5B57] mt-0.5">hit rate</div>
                </div>
              </div>

              {!isMagic && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#13161F] rounded-lg px-3 py-2">
                    <div className="text-[10px] text-[#5C5B57] mb-1">Your ACC</div>
                    <div className="text-sm font-semibold text-[#E8E6E1]">{playerAcc}</div>
                  </div>
                  <div className="bg-[#13161F] rounded-lg px-3 py-2">
                    <div className="text-[10px] text-[#5C5B57] mb-1">Mob EVA</div>
                    <div className="text-sm font-semibold text-[#E8E6E1]">{selected.eva}</div>
                  </div>
                  <div className="bg-[#13161F] rounded-lg px-3 py-2">
                    <div className="text-[10px] text-[#5C5B57] mb-1">ACC to start hitting</div>
                    {selStats.toStart === 0
                      ? <div className="text-sm font-semibold text-[#5AC47E]">Already hitting</div>
                      : <div className="text-sm font-semibold text-[#E85A5A]">+{selStats.toStart} more ACC</div>
                    }
                  </div>
                  <div className="bg-[#13161F] rounded-lg px-3 py-2">
                    <div className="text-[10px] text-[#5C5B57] mb-1">ACC to guarantee hits</div>
                    {selStats.toGuarantee === 0
                      ? <div className="text-sm font-semibold text-[#5AC47E]">Already guaranteed</div>
                      : <div className="text-sm font-semibold text-[#E8913A]">+{selStats.toGuarantee} more ACC</div>
                    }
                  </div>
                </div>
              )}

              {isMagic && (
                <p className="text-xs text-[#5C5B57]">
                  Magic attacks always hit regardless of your ACC or the mob's EVA.
                </p>
              )}

              <p className="text-[10px] text-[#5C5B57] border-t border-[rgba(255,255,255,0.05)] pt-2.5">
                Estimates are approximate (give or take ~5%). Shoutout to Littlefoot for the accuracy training data.
              </p>
            </div>
          )}

          {!isMagic && !selected && (
            <p className="text-[10px] text-[#5C5B57]">
              Showing hit rates based on your current ACC of {playerAcc}. Select a mob for a full breakdown.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
