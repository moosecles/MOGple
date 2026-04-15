import { useState, useEffect, useMemo } from 'react'
import { loadAppData } from './data/loaders'
import type { AppData, AppTab, CharacterState } from './types'
import { loadCharacter, DEFAULT_CHARACTER, computeDerived } from './engine/character'
import CharacterBuilder from './components/CharacterBuilder'
import TrainingAdvisor from './components/TrainingAdvisor'
import ItemProgression from './components/ItemProgression'

export default function App() {
  const [data, setData] = useState<AppData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<AppTab>('builder')

  useEffect(() => {
    loadAppData()
      .then(setData)
      .catch(e => setError(String(e)))
  }, [])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0C0E14]">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-lg font-semibold text-[#E85A5A] mb-2">Failed to load game data</h2>
          <p className="text-sm text-[#5C5B57]">{error}</p>
          <p className="text-xs text-[#3C3C3A] mt-3">
            Make sure the JSON files are in <code className="text-[#5C5B57]">public/data/</code>
          </p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0C0E14]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#E8913A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#5C5B57]">Loading game data…</p>
        </div>
      </div>
    )
  }

  return <AppInner data={data} tab={tab} setTab={setTab} />
}

function AppInner({
  data, tab, setTab
}: {
  data: AppData
  tab: AppTab
  setTab: (t: AppTab) => void
}) {
  const [char, setChar] = useState<CharacterState>(() => loadCharacter() ?? DEFAULT_CHARACTER)
  const derived = useMemo(() => computeDerived(char, data), [char, data])

  const tabs: { id: AppTab; label: string }[] = [
    { id: 'builder',  label: 'Character Builder' },
    { id: 'training', label: 'Training Advisor'  },
    { id: 'items',    label: 'Item Progression'  },
  ]

  return (
    <div className="min-h-screen bg-[#0C0E14] text-[#E8E6E1] flex flex-col">
      {/* Discord banner */}
      <div className="bg-[rgba(88,101,242,0.1)] border-b border-[rgba(88,101,242,0.25)]">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-center">
          <a
            href="https://discord.gg/stMSs74W"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-[#9BA8F5] hover:text-[#C4CBF8] transition-colors font-semibold"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.015.043.033.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Join the MapleStory Classic Discord
          </a>
        </div>
      </div>

      {/* Disclaimer banner */}
      <div className="bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.05)]">
        <div className="max-w-6xl mx-auto px-4 py-1.5">
          <p className="text-[10px] text-[#4A4A48] text-center leading-relaxed">
            <span className="font-semibold text-[#5C5B57]">Disclaimer:</span> This is an unofficial fan-made tool. Not affiliated with, endorsed by, or associated with Nexon Co., Ltd. or Wizet. All MapleStory content, assets, names, and trademarks are property of their respective owners. All data and features are subject to change.
          </p>
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-[rgba(255,255,255,0.06)] sticky top-0 z-40 bg-[#0C0E14]/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              {/* Animated rotten mushroom logo */}
              <img
                src={`${import.meta.env.BASE_URL}images/monsters/0000062.move.webp`}
                alt="Rotten Mushroom"
                className="w-10 h-10 object-contain flex-shrink-0"
                style={{ imageRendering: 'pixelated' }}
              />
              <div>
                <h1
                  className="text-2xl text-[#E8913A] tracking-tight leading-none"
                  style={{ fontFamily: "'Sekuya', serif" }}
                >
                  MOG-PLE
                </h1>
                <span className="text-[11px] text-[#5C5B57]">'Maple Optimizations Generator'</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-[#3C3C3A] hidden sm:inline">CBT v0.26–0.28 · Victoria Island</span>
              <a
                href="https://linktr.ee/OSMSTools"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[rgba(90,156,232,0.3)] bg-[rgba(90,156,232,0.07)] text-[#5A9DE8] text-[11px] font-medium hover:bg-[rgba(90,156,232,0.14)] hover:border-[rgba(90,156,232,0.5)] transition-colors"
                title="More MapleStory Classic tools"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                More Maplestory Tools
              </a>
            </div>
          </div>
          {/* Tab nav */}
          <div className="flex gap-0.5">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`
                  px-4 py-2.5 text-sm font-medium transition-all relative whitespace-nowrap
                  ${tab === t.id ? 'text-[#E8913A]' : 'text-[#5C5B57] hover:text-[#8B8A85]'}
                `}
              >
                {t.label}
                {tab === t.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E8913A] rounded-t" />
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {tab === 'builder' && (
          <CharacterBuilder data={data} char={char} setChar={setChar} />
        )}
        {tab === 'training' && (
          <TrainingAdvisor data={data} character={char} derived={derived} />
        )}
        {tab === 'items' && (
          <ItemProgression data={data} character={char} derived={derived} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[rgba(255,255,255,0.04)] py-4 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <span className="text-sm font-medium text-[#5C5B57]">
            built by uncle moose 🍄
          </span>
          <span className="text-[10px] text-[#3C3C3A] text-right">
            CBT v0.26–0.28 data · Victoria Island only<br />
            <span className="text-[9px]">MapleStory is property of Nexon Co., Ltd. This tool is unofficial and fan-made. No ownership claimed.</span>
          </span>
        </div>
      </footer>
    </div>
  )
}
