import type { CharacterState } from '../../types'
import type { AppData } from '../../types'
import type { Skill } from '../../types'
import { spBudget1st, spBudget2nd } from '../../engine/character'

interface SkillBuilderProps {
  character: CharacterState
  data: AppData
  onChange: (skills: Record<string, number>) => void
}

function SkillRow({
  skill, level, maxLevel, onInc, onDec
}: { skill: Skill; level: number; maxLevel: number; onInc: () => void; onDec: () => void }) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-[rgba(255,255,255,0.04)] last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-[#E8E6E1] truncate">{skill.name}</div>
        {level > 0 && skill.all_level_stats[level - 1] && (
          <div className="text-[10px] text-[#5C5B57] truncate">{skill.all_level_stats[level - 1]}</div>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onDec}
          disabled={level === 0}
          className="w-6 h-6 rounded bg-[#1A1E2A] text-[#8B8A85] hover:text-[#E8E6E1] hover:bg-[#252A38] disabled:opacity-30 disabled:cursor-not-allowed text-sm leading-none transition-colors"
        >
          −
        </button>
        <span className="text-xs w-10 text-center text-[#E8E6E1]">
          {level} / {maxLevel}
        </span>
        <button
          onClick={onInc}
          disabled={level >= maxLevel}
          className="w-6 h-6 rounded bg-[#1A1E2A] text-[#8B8A85] hover:text-[#E8913A] hover:bg-[rgba(232,145,58,0.1)] disabled:opacity-30 disabled:cursor-not-allowed text-sm leading-none transition-colors"
        >
          +
        </button>
      </div>
    </div>
  )
}

export default function SkillBuilder({ character, data, onChange }: SkillBuilderProps) {
  const { className, level, skills } = character

  // Determine the 1st-job class name (e.g., Fighter → Warrior, Assassin → Rogue)
  const FIRST_JOB_CLASS: Record<string, string> = {
    Fighter: 'Warrior', Page: 'Warrior', Spearman: 'Warrior',
    'F/P Wizard': 'Magician', 'I/L Wizard': 'Magician', Cleric: 'Magician',
    Hunter: 'Archer', Crossbowman: 'Archer',
    Assassin: 'Rogue', Bandit: 'Rogue',
  }
  const firstJobClassName = FIRST_JOB_CLASS[className] ?? className

  // 1st job skills come from the base class (Warrior, Magician, etc.)
  const firstJobClassSkills = data.skillsByClass.get(firstJobClassName) ?? []
  const firstJobSkills = firstJobClassSkills.filter(s => s.job === '1st Job' || s.job === 'Beginner')

  // 2nd job skills come from the specific class (Fighter, Assassin, etc.)
  const secondJobClassSkills = data.skillsByClass.get(className) ?? []
  const secondJobSkills = secondJobClassSkills.filter(s => s.job === '2nd Job')

  // Beginner skills
  const beginnerSkills = (data.skillsByClass.get('Beginner') ?? [])
    .filter(s => s.job === 'Beginner')

  const allFirst = className === 'Beginner' ? beginnerSkills : firstJobSkills
  const allSecond = secondJobSkills

  // SP budgets
  const sp1 = spBudget1st(level)
  const sp2 = spBudget2nd(level)

  // Current SP spent
  const sp1Spent = allFirst.reduce((sum, sk) => sum + (skills[sk.id] ?? 0), 0)
  const sp2Spent = allSecond.reduce((sum, sk) => sum + (skills[sk.id] ?? 0), 0)

  function setSkillLevel(skillId: string, newLevel: number, isSecond: boolean) {
    const budget = isSecond ? sp2 : sp1
    const spent = isSecond ? sp2Spent : sp1Spent
    const current = skills[skillId] ?? 0
    const delta = newLevel - current
    if (delta > 0 && spent + delta > budget) return // not enough SP
    onChange({ ...skills, [skillId]: Math.max(0, newLevel) })
  }

  function maxSkill(skill: Skill, isSecond: boolean) {
    const budget = isSecond ? sp2 : sp1
    const spent = isSecond ? sp2Spent : sp1Spent
    const current = skills[skill.id] ?? 0
    const remaining = budget - spent
    const toMax = Math.min(skill.max_level - current, remaining)
    if (toMax <= 0) return
    onChange({ ...skills, [skill.id]: current + toMax })
  }

  function resetSkills() {
    onChange({})
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-widest text-[#5C5B57]">Skills</h3>
        <button onClick={resetSkills} className="text-xs text-[#5C5B57] hover:text-[#E85A5A] transition-colors">
          Reset all
        </button>
      </div>

      {/* 1st Job */}
      {allFirst.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#8B8A85]">
              {className === 'Beginner' ? 'Beginner' : '1st Job'}
            </span>
            <span className="text-xs text-[#5C5B57]">
              SP: {sp1Spent} / {sp1}
              {sp1Spent > sp1 && <span className="text-[#E85A5A] ml-1">over!</span>}
            </span>
          </div>
          {allFirst.map(skill => (
            <div key={skill.id} className="group">
              <SkillRow
                skill={skill}
                level={skills[skill.id] ?? 0}
                maxLevel={skill.max_level}
                onInc={() => setSkillLevel(skill.id, (skills[skill.id] ?? 0) + 1, false)}
                onDec={() => setSkillLevel(skill.id, (skills[skill.id] ?? 0) - 1, false)}
              />
              <button
                onClick={() => maxSkill(skill, false)}
                className="hidden group-hover:block text-[10px] text-[#5C5B57] hover:text-[#E8913A] ml-1 pb-1"
              >
                max
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 2nd Job */}
      {allSecond.length > 0 && level >= 30 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#8B8A85]">2nd Job</span>
            <span className="text-xs text-[#5C5B57]">
              SP: {sp2Spent} / {sp2}
              {sp2Spent > sp2 && <span className="text-[#E85A5A] ml-1">over!</span>}
            </span>
          </div>
          {allSecond.map(skill => (
            <div key={skill.id} className="group">
              <SkillRow
                skill={skill}
                level={skills[skill.id] ?? 0}
                maxLevel={skill.max_level}
                onInc={() => setSkillLevel(skill.id, (skills[skill.id] ?? 0) + 1, true)}
                onDec={() => setSkillLevel(skill.id, (skills[skill.id] ?? 0) - 1, true)}
              />
              <button
                onClick={() => maxSkill(skill, true)}
                className="hidden group-hover:block text-[10px] text-[#5C5B57] hover:text-[#E8913A] ml-1 pb-1"
              >
                max
              </button>
            </div>
          ))}
        </div>
      )}

      {allFirst.length === 0 && allSecond.length === 0 && (
        <p className="text-xs text-[#5C5B57]">No skills for this class</p>
      )}
    </div>
  )
}
