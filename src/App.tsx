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

  // Load data once on mount
  useEffect(() => {
    loadAppData()
      .then(setData)
      .catch(e => setError(String(e)))
  }, [])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0C0E14]">
        <div className="text-center p-8">
          <h2 className="text-lg font-semibold text-[#E85A5A] mb-2">Failed to load data</h2>
          <p className="text-sm text-[#5C5B57]">{error}</p>
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
  // We lift character state here so Training/Items tabs can read it
  const [char, setChar] = useState<CharacterState>(() => loadCharacter() ?? DEFAULT_CHARACTER)
  const derived = useMemo(() => computeDerived(char, data), [char, data])

  const tabs: { id: AppTab; label: string }[] = [
    { id: 'builder',  label: 'Character Builder' },
    { id: 'training', label: 'Training Advisor' },
    { id: 'items',    label: 'Item Progression' },
  ]

  return (
    <div className="min-h-screen bg-[#0C0E14] text-[#E8E6E1]">
      {/* Header */}
      <header className="border-b border-[rgba(255,255,255,0.06)] sticky top-0 z-40 bg-[#0C0E14]/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-serif text-xl text-[#E8913A]">
            MapleStory Classic Advisor
          </h1>
          <span className="text-xs text-[#5C5B57]">CBT v0.26–0.28</span>
        </div>
        {/* Tab nav */}
        <div className="max-w-6xl mx-auto px-4 flex gap-1 pb-0">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`
                px-4 py-2.5 text-sm font-medium transition-all relative
                ${tab === t.id
                  ? 'text-[#E8913A]'
                  : 'text-[#5C5B57] hover:text-[#8B8A85]'
                }
              `}
            >
              {t.label}
              {tab === t.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E8913A]" />
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === 'builder' && (
          <CharacterBuilderWrapper data={data} char={char} setChar={setChar} />
        )}
        {tab === 'training' && (
          <TrainingAdvisor data={data} character={char} derived={derived} />
        )}
        {tab === 'items' && (
          <ItemProgression data={data} character={char} derived={derived} />
        )}
      </main>
    </div>
  )
}

// Wrapper to keep character sync between builder and parent
function CharacterBuilderWrapper({
  data, char, setChar
}: {
  data: AppData
  char: CharacterState
  setChar: (c: CharacterState) => void
}) {
  return <CharacterBuilder data={data} char={char} setChar={setChar} />
}
