import { useState } from 'react'
import type { CharacterState } from '../../types'
import type { AppData } from '../../types'
import type { Skill } from '../../types'
import { spBudget1st, spBudget2nd, SECOND_JOB_CLASSES } from '../../engine/character'

interface SkillBuilderProps {
  character: CharacterState
  data: AppData
  onChange: (skills: Record<string, number>) => void
}

interface SkillRowProps {
  skill: Skill
  level: number
  maxLevel: number
  sp1Remaining: number
  sp2Remaining: number
  isSecond: boolean
  onSet: (level: number) => void
  // isSecond is used only for SP budget tracking in the parent
  _isSecond?: boolean
}

function SkillRow({ skill, level, maxLevel, sp1Remaining, sp2Remaining, isSecond, onSet }: SkillRowProps) {
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState(String(level))
  const remaining = isSecond ? sp2Remaining : sp1Remaining

  // Show level 1 stats if level = 0, otherwise show current level stats
  const displayStatIdx = level > 0 ? level - 1 : 0
  const statText = skill.all_level_stats[displayStatIdx] ?? skill.description ?? ''

  function commitInput() {
    const n = parseInt(inputVal)
    if (!isNaN(n)) {
      const clamped = Math.max(0, Math.min(maxLevel, n))
      // Check SP budget
      const delta = clamped - level
      if (delta > 0 && delta > remaining) {
        // Cap to what SP allows
        onSet(Math.min(maxLevel, level + remaining))
      } else {
        onSet(clamped)
      }
    } else {
      setInputVal(String(level))
    }
    setEditing(false)
  }

  const canInc = level < maxLevel && remaining > 0
  const canDec = level > 0

  return (
    <div className="py-2 border-b border-[rgba(255,255,255,0.04)] last:border-0">
      <div className="flex items-center gap-2">
        {/* Name + controls */}
        <div className="flex-1 min-w-0">
          <span className={`text-sm ${level > 0 ? 'text-[#E8E6E1]' : 'text-[#8B8A85]'}`}>
            {skill.name}
          </span>
        </div>
        {/* Level controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onSet(level - 1)}
            disabled={!canDec}
            className="w-6 h-6 rounded bg-[#1A1E2A] text-[#8B8A85] hover:text-[#E85A5A] disabled:opacity-30 text-sm leading-none transition-colors"
          >−</button>

          {editing ? (
            <input
              autoFocus
              type="number"
              min={0} max={maxLevel}
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onBlur={commitInput}
              onKeyDown={e => { if (e.key === 'Enter') commitInput(); if (e.key === 'Escape') { setEditing(false); setInputVal(String(level)) } }}
              className="w-14 text-center bg-[#1A1E2A] border border-[rgba(232,145,58,0.5)] rounded px-1 py-0.5 text-xs text-[#E8E6E1] outline-none"
            />
          ) : (
            <button
              onClick={() => { setInputVal(String(level)); setEditing(true) }}
              title="Click to type level"
              className="w-14 text-center text-xs text-[#E8E6E1] hover:text-[#E8913A] transition-colors"
            >
              {level} / {maxLevel}
            </button>
          )}

          <button
            onClick={() => onSet(level + 1)}
            disabled={!canInc}
            title={!canInc && level < maxLevel ? 'Not enough SP' : undefined}
            className="w-6 h-6 rounded bg-[#1A1E2A] text-[#8B8A85] hover:text-[#E8913A] disabled:opacity-30 text-sm leading-none transition-colors"
          >+</button>

          {/* Max button */}
          {level < maxLevel && (
            <button
              onClick={() => onSet(Math.min(maxLevel, level + remaining))}
              disabled={remaining === 0}
              className="text-[9px] text-[#5C5B57] hover:text-[#E8913A] disabled:opacity-30 transition-colors px-1"
            >
              max
            </button>
          )}
        </div>
      </div>

      {/* Skill description — always shown */}
      {statText && (
        <div className="mt-1 ml-0.5 text-[10px] text-[#5C5B57] leading-relaxed">
          {level === 0 ? (
            <span className="text-[#3C3C3A]">[Lv.1] {skill.all_level_stats[0] ?? skill.description}</span>
          ) : (
            statText
          )}
        </div>
      )}

    </div>
  )
}

export default function SkillBuilder({ character, data, onChange }: SkillBuilderProps) {
  const { className, level, skills } = character

  // 1st-job parent class mapping
  const FIRST_JOB_CLASS: Record<string, string> = {
    Fighter: 'Warrior', Page: 'Warrior', Spearman: 'Warrior',
    'F/P Wizard': 'Magician', 'I/L Wizard': 'Magician', Cleric: 'Magician',
    Hunter: 'Archer', Crossbowman: 'Archer',
    Assassin: 'Rogue', Bandit: 'Rogue',
  }

  const firstJobClassName = FIRST_JOB_CLASS[className] ?? className
  const firstJobClassSkills = data.skillsByClass.get(firstJobClassName) ?? []
  const firstJobSkills = firstJobClassSkills.filter(s => s.job === '1st Job' || s.job === 'Beginner')

  const secondJobClassSkills = data.skillsByClass.get(className) ?? []
  const secondJobSkills = secondJobClassSkills.filter(s => s.job === '2nd Job')

  const beginnerSkills = (data.skillsByClass.get('Beginner') ?? []).filter(s => s.job === 'Beginner')

  const allFirst = className === 'Beginner' ? beginnerSkills : firstJobSkills
  const allSecond = secondJobSkills

  const sp1 = spBudget1st(firstJobClassName, level)
  const sp2 = spBudget2nd(level)

  const sp1Spent = allFirst.reduce((sum, sk) => sum + (skills[sk.id] ?? 0), 0)
  const sp2Spent = allSecond.reduce((sum, sk) => sum + (skills[sk.id] ?? 0), 0)
  const sp1Remaining = Math.max(0, sp1 - sp1Spent)
  const sp2Remaining = Math.max(0, sp2 - sp2Spent)

  const isSecondJobClass = SECOND_JOB_CLASSES.has(className)

  function setSkillLevel(skillId: string, newLevel: number, _isSecond: boolean) {
    const clamped = Math.max(0, newLevel)
    onChange({ ...skills, [skillId]: clamped })
  }

  function resetSkills() {
    onChange({})
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-widest text-[#5C5B57]">Skill Build</h3>
        <button onClick={resetSkills} className="text-xs text-[#5C5B57] hover:text-[#E85A5A] transition-colors">
          Reset all
        </button>
      </div>

      {/* 1st Job */}
      {allFirst.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#8B8A85]">
              {className === 'Beginner' ? 'Beginner' : '1st Job'} Skills
            </span>
            <div className="text-xs flex gap-1 items-center">
              {sp1Spent > sp1 ? (
                <span className="text-[#E85A5A]">Over budget!</span>
              ) : (
                <>
                  <span className="text-[#5AC47E] font-medium">{sp1Remaining}</span>
                  <span className="text-[#5C5B57]">/ {sp1} SP remaining</span>
                </>
              )}
            </div>
          </div>
          {level < (className === 'Beginner' ? 1 : (className === 'Magician' ? 8 : 10)) && (
            <p className="text-[10px] text-[#E8913A] mb-2">
              Skills unlock at level {className === 'Magician' ? 8 : 10}
            </p>
          )}
          {allFirst.map(skill => (
            <SkillRow
              key={skill.id}
              skill={skill}
              level={skills[skill.id] ?? 0}
              maxLevel={skill.max_level}
              sp1Remaining={sp1Remaining}
              sp2Remaining={sp2Remaining}
              isSecond={false}
              onSet={l => setSkillLevel(skill.id, l, false)}
            />
          ))}
        </section>
      )}

      {/* 2nd Job — visible if this is a 2nd-job class, regardless of level */}
      {allSecond.length > 0 && isSecondJobClass && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#8B8A85]">2nd Job Skills</span>
            <div className="text-xs flex gap-1 items-center">
              {sp2Spent > sp2 ? (
                <span className="text-[#E85A5A]">Over budget!</span>
              ) : (
                <>
                  <span className="text-[#5AC47E] font-medium">{sp2Remaining}</span>
                  <span className="text-[#5C5B57]">/ {sp2} SP remaining</span>
                </>
              )}
            </div>
          </div>
          {level < 30 && (
            <p className="text-[10px] text-[#8B8A85] mb-2">
              2nd job SP unlocks at level 30. Showing skills in advance.
            </p>
          )}
          {allSecond.map(skill => (
            <SkillRow
              key={skill.id}
              skill={skill}
              level={skills[skill.id] ?? 0}
              maxLevel={skill.max_level}
              sp1Remaining={sp1Remaining}
              sp2Remaining={sp2Remaining}
              isSecond={true}
              onSet={l => setSkillLevel(skill.id, l, true)}
            />
          ))}
        </section>
      )}

      {allFirst.length === 0 && allSecond.length === 0 && (
        <p className="text-xs text-[#5C5B57]">No skills for this class</p>
      )}
    </div>
  )
}
