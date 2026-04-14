# MapleStory Classic Advisor â Full Implementation Spec
> Hand this document to Opus with your CBT JSON data files. It contains everything needed to build the complete app.

---

## Project Overview

Build a **static React SPA** hosted on **GitHub Pages** that serves as a personalized progression advisor for MapleStory Classic (CBT v0.26â0.28, Victoria Island only). The app ingests pre-bundled JSON data (no server), stores character state in `localStorage` with JSON export/import, and produces three primary tools: a character builder, an optimal training map recommender, and an item progression advisor.

**Tech stack:** React 18 + Vite, TypeScript, TailwindCSS, Zustand for state, React Router for tabs. No backend. All JSON data bundled at build time via Vite's `import.meta.glob` or direct imports.

---

## Repository Structure

```
maple-advisor/
âââ public/
â   âââ data/                     â Copy all CBT JSON files here
â       âââ monsters.json
â       âââ maps.json
â       âââ items.json
â       âââ skills.json
â       âââ quests.json
â       âââ npcs.json
â       âââ lookups.json
âââ src/
â   âââ data/
â   â   âââ loaders.ts            â Typed JSON imports
â   â   âââ derived.ts            â Pre-computed cross-references at startup
â   âââ engine/
â   â   âââ damage.ts             â Damage formula engine
â   â   âââ training.ts           â EXP/hr scoring engine
â   â   âââ gear.ts               â Gear comparison + scroll EV engine
â   âââ store/
â   â   âââ character.ts          â Zustand store for character state
â   âââ components/
â   â   âââ CharacterBuilder/
â   â   âââ TrainingAdvisor/
â   â   âââ ItemProgression/
â   âââ App.tsx
â   âââ main.tsx
âââ vite.config.ts
âââ tailwind.config.ts
```

---

## Data Layer

### Source JSON Files (CBT)

All from `cbt/app_metadata/`. Do NOT use pre-cbt data.

**`monsters.json`** â structure:
```ts
{
  monsters: Array<{
    id: number;
    name: string;
    level: number;
    hp: number;
    mp: number;
    exp: number;
    PADamage: number;    // physical attack
    PDDamage: number;    // physical defense
    MADamage: number;    // magic attack
    MDDamage: number;    // magic defense
    acc: number;
    eva: number;
    speed: number;
    undead: number;      // 1 = undead, Holy skills deal bonus damage
    elements: Record<string, 'Weak' | 'Strong' | 'Immune'> | null;
    is_boss: boolean;
    maps: Array<{
      id: number;
      name: string;
      count: number;       // spawn count on that map
      mob_time: string;    // respawn time in seconds (parse to float)
    }>;
    thumbnail: string;
  }>;
  total: number;
}
```

**Element data present for 39 of 83 mobs.** Examples:
- Stump (Lv5): Fire Weak
- Slime (Lv6): Lightning Weak
- Fire Boar (Lv32): Fire Strong, Ice Weak
- Zombie Mushroom (Lv24): Holy Weak
- Jr. Wraith (Lv34): Holy Weak, Fire Weak

**`maps.json`** â structure:
```ts
{
  regions: Array<{
    region: string;       // "Victoria Island" | "Maple Island" | "Event" | "Other"
    count: number;
    maps: Array<{
      id: number;
      name: string;
      street_name: string;
      region: string;
      is_town: boolean;
      return_map_id: number | null;
      mob_rate: number | null;
      npcs: number[];
      thumbnail: string | null;
      minimap: string | null;
    }>;
  }>;
  total: number;
}
// Note: mobs per map come from monsters.json â monster.maps[], not from maps.json
```

**`items.json`** â structure:
```ts
{
  items: Array<{
    id: number;
    name: string;
    category: string;        // "Equipment" | "Consumable" | etc.
    sub_category: string;    // "Weapon" | "Hat" | "Top" | "Bottom" | etc.
    description: string;
    stats: {
      reqLevel: number;
      reqJob: number;        // bitmask: 1=Warrior, 2=Mage, 4=Bowman, 8=Thief, 0=All
      reqSTR: number; reqDEX: number; reqINT: number; reqLUK: number;
      incSTR?: number; incDEX?: number; incINT?: number; incLUK?: number;
      incPAD?: number;       // weapon attack bonus (from scrolls or base)
      incMAD?: number;       // magic attack bonus
      incPDD?: number;       // physical defense
      incMDD?: number;       // magic defense
      incACC?: number;       // accuracy
      incEVA?: number;       // evasion
      incMHP?: number;       // max HP
      incMMP?: number;       // max MP
      incSpeed?: number;
      incJump?: number;
      tuc: number;           // total upgrade count (scroll slots)
      attackSpeed?: number;  // 2=Fastest, 3=Faster, 4=Fast, 5=Normal, 6=Slow, 7=Slower
    };
    req_job_label: string;
    weapon_type?: string;    // "1H Sword" | "Claw" | "Staff" | etc.
    attack_speed_label?: string;
    thumbnail: string;
  }>;
  scrolls: Array<{
    id: number;
    name: string;
    equip_slot: string;      // "Weapon" | "Hat" | "Top" | etc.
    tier: string;            // "Lesser" | "Intermediate" | "Greater" | "Chaos"
    stat_type: string;       // "Attack" | "STR" | "DEX" | etc.
    description: string;
    thumbnail: string;
  }>;
  item_total: number;
  scroll_total: number;
  counts: { equipment: 969; consumables: 96; etc: 217; setup: 19; scrolls: 208 };
  equipment_meta: {
    job_filters: Array<{ label: string; value: number }>;
    weapon_type_order: string[];
    weapon_types_by_class: {
      "1": string[];   // Warrior weapons
      "2": string[];   // Mage weapons
      "4": string[];   // Bowman weapons
      "8": string[];   // Thief weapons
    };
  };
}
```

**`skills.json`** â structure:
```ts
{
  beginner: JobSkillGroup[];
  warrior: JobSkillGroup[];
  magician: JobSkillGroup[];
  archer: JobSkillGroup[];
  rogue: JobSkillGroup[];
  total: number;
}
type JobSkillGroup = {
  class_name: string;   // "Warrior" | "Fighter" | "Assassin" | etc.
  job: string;          // "1st Job" | "2nd Job"
  skills: Array<{
    id: string;
    name: string;
    description: string;
    class_name: string;
    job: string;
    max_level: number;
    required_skill: string;
    all_level_stats: string[];   // per-level text descriptions
    thumbnail: string;
  }>;
};
```

### Derived Data (`src/data/derived.ts`)

Pre-compute at app startup (once):

```ts
// Map of mapId â array of monsters on that map
export const mobsByMap: Map<number, MonsterOnMap[]>

// Map of class_name â all skills for that class (1st + 2nd job)
export const skillsByClass: Map<string, Skill[]>

// All equipment items indexed by id
export const equipById: Map<number, Item>

// Monsters indexed by id
export const mobById: Map<number, Monster>

// Scrolls grouped by slot + stat_type
export const scrollsBySlot: Map<string, Scroll[]>
```

---

## The Damage Formula Engine (`src/engine/damage.ts`)

Source: meowdb.com/msclassic/guides/explaining-the-damage-formula (CBT-specific, cross-referenced with classic v0.28 data)

### Weapon Multipliers

```ts
type WeaponMult = { swing: number; stab?: number };

const WEAPON_MULT: Record<string, WeaponMult> = {
  '1H Sword':          { swing: 4.0 },
  '1H Axe':            { swing: 4.4, stab: 3.2 },
  '1H Blunt Weapon':   { swing: 4.4, stab: 3.2 },
  '2H Sword':          { swing: 4.6 },
  '2H Axe':            { swing: 4.8, stab: 3.4 },
  '2H Blunt Weapon':   { swing: 4.8, stab: 3.4 },
  'Spear':             { swing: 3.0, stab: 5.0 },
  'Polearm':           { swing: 5.0, stab: 3.0 },
  'Claw':              { swing: 3.6 },           // uses Lucky Seven mult in practice
  'Dagger':            { swing: 3.6 },
  'Bow':               { swing: 3.4 },
  'Crossbow':          { swing: 3.6 },
  'Wand':              { swing: 4.4, stab: 3.2 },
  'Staff':             { swing: 4.4, stab: 3.2 },
};
```

### Stat Definitions by Class

```ts
type StatConfig = {
  primary: (stats: CharStats) => number;      // returns numeric value
  secondary: (stats: CharStats) => number;
  weaponMult: (weaponType: string) => number;
};

const CLASS_STAT_CONFIG: Record<string, StatConfig> = {
  // Warriors
  Warrior:  { primary: s => s.STR, secondary: s => s.DEX, weaponMult: wt => WEAPON_MULT[wt]?.swing ?? 4.0 },
  Fighter:  { primary: s => s.STR, secondary: s => s.DEX, weaponMult: wt => WEAPON_MULT[wt]?.swing ?? 4.0 },
  Page:     { primary: s => s.STR, secondary: s => s.DEX, weaponMult: wt => WEAPON_MULT[wt]?.swing ?? 4.0 },
  Spearman: { primary: s => s.STR, secondary: s => s.DEX, weaponMult: wt => WEAPON_MULT[wt]?.swing ?? 4.0 },
  // Mages (magic formula â see below)
  Magician:  { primary: s => s.INT, secondary: s => s.LUK, weaponMult: _ => 4.4 },
  'F/P Wizard': { primary: s => s.INT, secondary: s => s.LUK, weaponMult: _ => 4.4 },
  'I/L Wizard': { primary: s => s.INT, secondary: s => s.LUK, weaponMult: _ => 4.4 },
  Cleric:    { primary: s => s.INT, secondary: s => s.LUK, weaponMult: _ => 4.4 },
  // Bowmen
  Archer:      { primary: s => s.DEX, secondary: s => s.STR, weaponMult: wt => WEAPON_MULT[wt]?.swing ?? 3.4 },
  Hunter:      { primary: s => s.DEX, secondary: s => s.STR, weaponMult: wt => WEAPON_MULT[wt]?.swing ?? 3.4 },
  Crossbowman: { primary: s => s.DEX, secondary: s => s.STR, weaponMult: wt => WEAPON_MULT[wt]?.swing ?? 3.6 },
  // Thieves
  Rogue:    { primary: s => s.LUK, secondary: s => s.STR + s.DEX, weaponMult: _ => 3.6 },
  Assassin: { primary: s => s.LUK, secondary: s => s.STR + s.DEX, weaponMult: _ => 3.6 },
  Bandit:   { primary: s => s.LUK, secondary: s => s.STR + s.DEX, weaponMult: _ => 3.6 },
  // Beginner
  Beginner: { primary: s => s.STR, secondary: s => s.DEX, weaponMult: _ => 4.0 },
};
```

### Core Formula

```ts
interface DamageInput {
  className: string;
  stats: CharStats;            // { STR, DEX, INT, LUK, HP, MP }
  weaponType: string;
  weaponATK: number;           // base W.ATK from weapon (outer multiplier)
  flatAttackPower: number;     // incPAD from skills (Claw Mastery, Rage, etc.) â inside parens
  mastery: number;             // 0.0 to 1.0 (e.g., 0.60 at max 2nd job mastery)
  skillPercent: number;        // 1.0 = basic attack, 2.6 = max Power Strike, etc.
  critRate?: number;           // from Critical Throw, etc.
}

interface DamageResult {
  max: number;
  min: number;
  avg: number;
  critAvg?: number;
}

export function calcDamage(input: DamageInput): DamageResult {
  const config = CLASS_STAT_CONFIG[input.className];
  const mult = config.weaponMult(input.weaponType);
  const primary = config.primary(input.stats);
  const secondary = config.secondary(input.stats);

  const innerMax = primary * mult + secondary + input.flatAttackPower;
  const innerMin = primary * mult * 0.9 * input.mastery + secondary + input.flatAttackPower;

  const max = Math.floor((innerMax * input.weaponATK / 100) * input.skillPercent);
  const min = Math.floor((innerMin * input.weaponATK / 100) * input.skillPercent);
  const avg = (max + min) / 2;

  return { max, min, avg };
}
```

### Mastery Table

```ts
// Base mastery (before 2nd job skills)
const BASE_MASTERY: Record<string, number> = {
  melee: 0.20,   // Warriors, Bandits, Daggers
  ranged: 0.15,  // Bowmen, Assassins (throwing stars)
  magic: 0.25,   // Magicians
};

// 2nd job mastery skill adds up to +0.50 at max level (level/20 * 0.50)
// So maxed mastery = base + 0.50
// Example: Assassin base 0.15 + maxed Claw Mastery 0.50 = 0.65
export function computeMastery(className: string, masterySkillLevel: number): number {
  const base = ['Warrior','Fighter','Page','Spearman','Rogue','Bandit'].includes(className)
    ? 0.20
    : ['Assassin','Hunter','Crossbowman','Archer'].includes(className)
    ? 0.15
    : 0.25;
  const bonus = (masterySkillLevel / 20) * 0.50;
  return Math.min(base + bonus, 1.0);
}
```

### Accuracy Formula

```ts
export function computeAccuracy(stats: CharStats, accFromGear: number, className: string): number {
  // Warriors/Mages/Beginners use 0.8 DEX + 0.5 LUK
  // Others (thieves, bowmen) use 0.6 DEX + 0.3 LUK  [per classic formula docs]
  const isWarriorOrMage = ['Warrior','Fighter','Page','Spearman','Magician','F/P Wizard','I/L Wizard','Cleric','Beginner'].includes(className);
  const base = isWarriorOrMage
    ? stats.DEX * 0.8 + stats.LUK * 0.5
    : stats.DEX * 0.6 + stats.LUK * 0.3;
  return Math.floor(base + accFromGear);
}

export function accuracyRequired(playerLevel: number, mobLevel: number, mobEva: number): number {
  const levelGap = mobLevel - playerLevel;
  return Math.ceil((55 + 2 * Math.max(0, levelGap)) * mobEva / 15);
}

export function hitRate(playerAcc: number, required: number): number {
  if (required === 0) return 1.0;
  return Math.min(1.0, playerAcc / required);
}
```

### Element Multiplier

```ts
type ElementType = 'Fire' | 'Ice' | 'Lightning' | 'Holy' | 'Poison' | 'Dark' | 'Physical';

// Skills and their elements (parsed from skill descriptions)
const SKILL_ELEMENTS: Record<string, ElementType> = {
  '2101003': 'Fire',       // F/P Fire Arrow
  '2101004': 'Poison',     // F/P Poison Breath
  '2201003': 'Ice',        // I/L Cold Beam
  '2201004': 'Lightning',  // I/L Thunder Bolt
  '2301004': 'Holy',       // Cleric Holy Arrow
  // Note: most warrior/thief/bowman skills are 'Physical' (no element)
};

export function elementMultiplier(
  skillElement: ElementType | null,
  mobElements: Record<string, 'Weak' | 'Strong' | 'Immune'> | null,
  mobUndead: number
): number {
  if (!skillElement || !mobElements) return 1.0;
  if (skillElement === 'Holy' && mobUndead === 1) return 2.0; // undead bonus for holy
  const status = mobElements[skillElement];
  if (status === 'Weak') return 2.0;
  if (status === 'Strong') return 0.5;
  if (status === 'Immune') return 0.0;
  return 1.0;
}
```

### Flat Attack Power from Skills

Parse these from the character's skill build. Each skill at a given level provides a specific `incPAD` (flat attack power) bonus:

```ts
// Skills that grant flatAttackPower (incPAD) â extracted from all_level_stats strings
// Pattern: "Attack Power +N" in the skill description
const SKILL_ATTACK_POWER: Record<string, (level: number) => number> = {
  '4100000': level => level,       // Claw Mastery: +1 ATK per level (max 20)
  '4200000': level => 0,           // Dagger Mastery: no flat ATK
  '1100000': level => 0,           // Sword Mastery: no flat ATK
  '1200001': level => level,       // BW Mastery: +1 ATK per level
  // Rage buff for warriors: flat +35 ATK when active (handle as a toggle in builder)
};
```

---

## Character State Schema (`src/store/character.ts`)

```ts
interface ScrollApplication {
  tier: 'Lesser' | 'Intermediate' | 'Greater' | 'Chaos';
  stat: string;       // "Attack" | "STR" | "DEX" | etc.
  success: boolean;
  slotIndex: number;
}

interface EquippedItem {
  itemId: number;
  scrolls: ScrollApplication[];
  // Derived fields (computed):
  effectiveATK: number;        // base incPAD + successful scroll bonuses
  effectiveStats: Partial<CharStats>;
}

interface CharacterState {
  // Core identity
  name: string;
  className: string;    // "Assassin" | "Fighter" | etc.
  level: number;

  // Base stats (allocated AP only, not from gear)
  baseStats: { STR: number; DEX: number; INT: number; LUK: number; HP: number; MP: number };

  // Equipment slots
  equipment: {
    weapon?: EquippedItem;
    helmet?: EquippedItem;
    top?: EquippedItem;
    bottom?: EquippedItem;
    shoes?: EquippedItem;
    gloves?: EquippedItem;
    cape?: EquippedItem;
    earrings?: EquippedItem;
    ring?: EquippedItem;
  };

  // Skill levels (skillId â level)
  skills: Record<string, number>;

  // Active buffs (toggleable in UI)
  activeBuffs: {
    rage: boolean;          // Warrior: +35 ATK
    concentration: boolean; // Bowman: +20 ATK
    meditation: boolean;    // Mage: +20 MATK
  };

  // Derived stats (recomputed whenever anything changes)
  derived: {
    totalStats: CharStats;         // base + all gear bonuses
    weaponATK: number;             // weapon base + scrolled ATK bonuses
    flatAttackPower: number;       // from skills + active buffs
    mastery: number;               // 0.0 to 1.0
    accuracy: number;
    avoid: number;
    damageRange: { min: number; max: number; avg: number };
    critRate: number;
    critDamageBonus: number;       // e.g., 0.35 for +35% crit damage
    effectiveWeaponATK: number;    // for display = weaponATK (the outer multiplier)
  };
}

// Zustand actions:
// setClass(className) â resets skills, resets gear to compatible only
// equipItem(slot, itemId) â validates req stats/level, updates derived
// applyScroll(slot, scrollApplication) â updates effectiveATK, updates derived
// setSkillLevel(skillId, level) â validates SP budget, updates derived
// setBaseStats(stats) â validates AP budget (5 Ã level), updates derived
// exportJSON() â JSON.stringify(state) â download
// importJSON(json) â parse â validate â setState
```

### Scroll Value Calculation

```ts
const SCROLL_BONUSES: Record<string, Record<string, number>> = {
  // Format: tier â stat â bonus per success
  Lesser:       { Attack: 1, STR: 1, DEX: 1, INT: 1, LUK: 1, HP: 5, MP: 5, Accuracy: 1, Avoidability: 1 },
  Intermediate: { Attack: 2, STR: 2, DEX: 2, INT: 2, LUK: 2, HP: 10, MP: 10, Accuracy: 2, Avoidability: 2 },
  Greater:      { Attack: 3, STR: 3, DEX: 3, INT: 3, LUK: 3, HP: 15, MP: 15, Accuracy: 3, Avoidability: 3 },
  Chaos:        { Attack: 5, STR: 5, DEX: 5, INT: 5, LUK: 5, HP: 30, MP: 30, Accuracy: 5, Avoidability: 5 },
};

const SCROLL_RATES: Record<string, number> = {
  Lesser: 1.00, Intermediate: 0.60, Greater: 0.10, Chaos: 0.10
};

// Expected value of a scroll tier on a given stat
export function scrollEV(tier: string, stat: string, slots: number): number {
  return SCROLL_RATES[tier] * SCROLL_BONUSES[tier][stat] * slots;
}

// Expected total ATK for a weapon given a scroll strategy
export function expectedWeaponATK(
  baseATK: number,
  slots: number,
  strategy: 'all-lesser' | 'all-intermediate' | 'all-greater' | 'all-chaos' | 'mixed'
): { expected: number; min: number; max: number } {
  // For 'mixed': 2 Greater + rest Intermediate (common optimal strategy)
  if (strategy === 'all-lesser')
    return { expected: baseATK + slots * 1, min: baseATK + slots * 1, max: baseATK + slots * 1 };
  if (strategy === 'all-intermediate')
    return { expected: baseATK + slots * 0.6 * 2, min: baseATK, max: baseATK + slots * 2 };
  if (strategy === 'all-greater')
    return { expected: baseATK + slots * 0.1 * 3, min: baseATK, max: baseATK + slots * 3 };
  if (strategy === 'all-chaos')
    return { expected: baseATK + slots * 0.1 * 5, min: baseATK, max: baseATK + slots * 5 };
  // mixed: assume half intermediate, remainder lesser as fallback
  const intermediate = Math.ceil(slots / 2);
  const lesser = slots - intermediate;
  return {
    expected: baseATK + intermediate * 0.6 * 2 + lesser * 1,
    min: baseATK + lesser * 1,
    max: baseATK + slots * 2,
  };
}
```

---

## Tab 1: Character Builder

### UI Layout

Paper doll layout (equipment slots around a character silhouette) with a stat panel on the right.

**Equipment slots:**
- Helmet (top center)
- Top / Bottom (or Longcoat = top+bottom) (middle)
- Shoes (bottom center)
- Gloves (bottom left/right)
- Cape (back)
- Earrings (top left/right)
- Ring (bottom corner)
- Weapon (left)

**Stat panel shows (live, recomputing on any change):**
- Level, Class, Job
- STR / DEX / INT / LUK (base + gear total)
- HP / MP
- W.ATK (effective weapon attack)
- Damage Range: MIN ~ MAX
- Accuracy / Avoid
- Crit Rate (if applicable)

**Selecting equipment:**
- Click a slot â opens a filtered item picker modal
- Filter: only shows items that (1) match reqJob for this class, (2) are the right slot, (3) reqLevel â¤ player level, (4) reqSTR/DEX/INT/LUK all â¤ current total stats
- Sort by: level (default), ATK, total stat bonus

**Scroll modal:**
- Per slot, after equipping an item with `tuc > 0`
- Shows N scroll slot rows (N = tuc)
- Each row: select tier (Lesser/Intermediate/Greater/Chaos) + select stat type (filtered to what scrolls exist for that slot) + toggle success/fail
- Success = apply bonus; Fail = no change (Chaos fail = item destroyed = show warning)
- Live preview of effective stat changes

**Skill builder:**
- Shows 1st job skills (always available) and 2nd job skills (if level â¥ 30 and 2nd job selected)
- SP budget: 1st job gets 1 SP per level from 10â30 = 60 SP max; 2nd job gets 3 SP per level from 30âonward
- Each skill shows current level / max level with +/- buttons
- Skills that grant passive bonuses (mastery, flat ATK, crit) immediately update derived stats

**Buff toggles:**
- Rage (Warrior: +35 ATK), Concentration (Bowman: +20 ATK), Meditation (Mage: +20 MATK)
- Shown only when class has them and they're leveled in the skill build

**Save/Load:**
- "Export Build" button â downloads `[characterName]-build.json`
- "Import Build" button â file picker â validates + loads
- Auto-saves to `localStorage` under key `maplestory-advisor-character`

---

## Tab 2: Optimal Training Advisor

### Map Score Algorithm

For each non-town map that has at least one monster:

```ts
interface MapScore {
  mapId: number;
  mapName: string;
  region: string;
  mobs: MonsterOnMap[];
  score: number;
  expPerHour: number;
  tags: Tag[];
  breakdown: ScoreBreakdown;
}

interface ScoreBreakdown {
  avgAttacksToKill: number;
  avgTimeToKill: number;       // seconds
  totalMobCount: number;
  avgRespawnTime: number;      // seconds
  cycleExpPerHour: number;     // theoretical max cycling all mobs
  survivalRating: number;      // 0â1, based on mob damage vs player HP
  accuracyRating: number;      // 0â1, hit rate vs mobs on map
  elementalBonus: number;      // multiplier, 1.0 = no element bonus
  levelPenalty: number;        // multiplier for level gap
}
```

**Step-by-step scoring:**

```
1. For each mob on the map:
   a. attacksToKill = ceil(mob.hp / character.derived.damageRange.avg Ã elementMultiplier)
   b. timeToKill = attacksToKill Ã ATTACK_ANIMATION_TIME (approx 0.6s for most skills)
   c. respawnCycle = mob.mob_time (seconds from JSON)
   d. killsPerHour = 3600 / max(timeToKill, respawnCycle / mob.count)
   e. expPerHour_mob = killsPerHour Ã mob.exp Ã levelPenaltyMultiplier

2. Total map expPerHour = sum of expPerHour across all mobs weighted by spawn count

3. Survival check:
   - canSurvive = (mob.PADamage - character.derived.totalStats.totalPDD) < character.derived.totalStats.HP / 3
   - If mob attacks > 1/3 of max HP per hit: flagged as dangerous
   - If mob attacks > HP: flagged as lethal

4. Accuracy check:
   - hitRate = min(1.0, playerAccuracy / accuracyRequired(playerLvl, mobLvl, mob.eva))
   - Scale expPerHour by hitRate (missed hits = wasted time/mana)

5. Level penalty multiplier:
   - If (mobLevel - playerLevel) > 5: accuracy issues, cap effective expPerHour at 70%
   - If (playerLevel - mobLevel) > 10: reduced EXP, multiply by 0.7
   - If gap > 20: effectively 0 useful EXP

6. Final score = expPerHour Ã accuracyRating Ã survivalRating
```

**Attack animation time by weapon type (approximate):**
```ts
const ATTACK_SPEED_SECONDS: Record<string, number> = {
  Fastest: 0.48, Faster: 0.54, Fast: 0.60, Normal: 0.72, Slow: 0.90, Slower: 1.08
};
```

### Tier Classification

Sort all scoreable maps descending by `score`. Split into thirds:
- **Most Optimal** = top third (capped at 5 maps to show)
- **Average Optimal** = middle third (show 5)
- **Less Optimal** = bottom third (show 3, as reference/alternatives)

Maps where `canSurvive = false` are moved to a separate "Danger Zone" category regardless of EXP.

### Tag System

```ts
type Tag = {
  label: string;
  variant: 'success' | 'warning' | 'danger' | 'info' | 'purple';
  tooltip: string;
};

function computeTags(map: MapScore, character: CharacterState): Tag[] {
  const tags: Tag[] = [];

  // Elemental advantages
  const elementalMobs = mobs.filter(m => m.elements && character has elemental skills);
  if (elementalMobs.some(m => elementMultiplier(...) >= 2.0))
    tags.push({ label: 'â¡ ELEM WEAK', variant: 'success', tooltip: 'Your skills deal 2Ã damage to mobs here' });

  // Undead bonus for Clerics
  if (character.className === 'Cleric' && mobs.some(m => m.undead))
    tags.push({ label: 'â UNDEAD', variant: 'purple', tooltip: 'Holy Arrow deals bonus damage to undead mobs' });

  // High EXP/HP efficiency
  const avgExpPerHp = avg(mobs.map(m => m.exp / m.hp));
  if (avgExpPerHp > 0.05) tags.push({ label: 'ð HIGH EXP/HP', variant: 'success', tooltip: 'These mobs give a lot of EXP per HP â very efficient' });

  // Dense spawns
  const totalSpawns = sum(mobs.map(m => m.count));
  if (totalSpawns >= 20) tags.push({ label: 'ð¥ DENSE SPAWN', variant: 'info', tooltip: `${totalSpawns} total spawns â great for AoE classes` });
  if (totalSpawns < 8) tags.push({ label: 'ð´ FEW MOBS', variant: 'warning', tooltip: 'Low mob count limits EXP/hr potential' });

  // Mana efficiency
  const mpPerKill = character skill MP cost Ã avgAttacksToKill;
  if (mpPerKill Ã expectedKillsPerHour > character.derived.totalStats.MP Ã 20)
    tags.push({ label: 'ðµ MANA DRAIN', variant: 'warning', tooltip: 'You may run out of mana frequently here' });

  // Accuracy issues
  if (mapScore.accuracyRating < 0.85)
    tags.push({ label: 'â ï¸ ACC ISSUE', variant: 'warning', tooltip: `~${Math.round(mapScore.accuracyRating * 100)}% hit rate â you'll miss frequently` });

  // Survival
  if (!mapScore.survivalRating)
    tags.push({ label: 'ð LETHAL', variant: 'danger', tooltip: 'These mobs can one-shot or two-shot you' });
  else if (mapScore.survivalRating < 0.5)
    tags.push({ label: 'â ï¸ RISKY', variant: 'warning', tooltip: 'Mobs deal significant damage â bring potions' });

  // Skill synergy
  if (character has AoE skill && totalSpawns >= 15)
    tags.push({ label: 'ð¥ AoE SYNERGY', variant: 'success', tooltip: 'Your AoE skills shine here with this many mobs' });

  return tags;
}
```

### UI Layout

Three panel columns (Most/Avg/Less Optimal) or a ranked list with tier badges. Each map card shows:

```
[Map Name]                            [BEST EXP/HR] badge
Region: Victoria Island âº Dungeon
Mobs: Evil Eye (Lv27) Ã 18
EXP/hr: ~24,800   Hits to kill: 2.3   Mob HP: 960
Accuracy: 97%   Survival: Safe (mob deals 145 dmg, you have 2,340 HP)
Tags: [â¡ ELEM WEAK] [ð HIGH EXP/HP] [ð¥ DENSE SPAWN]

[Expand â¼] â shows full breakdown: damage range vs this mob, respawn math, MP cost estimate
```

**Explain section** at top of tab (collapsible):
> "Recommendations are based on your current stats (52 LUK, 25 DEX, 42 W.ATK) and your equipped Adamantium Igor with 3 Intermediate scrolls landed. Changing your gear or skills will update these rankings instantly."

---

## Tab 3: Item Progression

### Effective Damage Score (EDS)

For weapons, the score that matters is how much the item increases your damage output given your stats. We compute EDS for every weapon your class can use at or near your current level:

```ts
interface GearCandidate {
  item: Item;
  currentATK: number;          // base incPAD (0 if weapon has none)
  scrolledEV: ScrollScenario[];
  eds: { floor: number; ceiling: number; expected: number };
  meetsRequirements: boolean;  // can you equip it right now?
  levelToEquip: number;        // level at which you can equip it
  deltaFromCurrent: DeltaReport;
}

interface ScrollScenario {
  label: string;               // "All Lesser" | "All Intermediate" | "2 Greater + rest Lesser"
  expectedATK: number;
  expectedDamageAvg: number;   // from calcDamage() with this ATK
}

function computeEDS(item: Item, character: CharacterState): GearCandidate {
  const baseATK = item.stats.incPAD ?? 0;
  const slots = item.stats.tuc ?? 0;

  // For each scroll scenario, compute expected total ATK
  const scenarios: ScrollScenario[] = [
    { label: 'Clean (no scrolls)', expectedATK: baseATK },
    { label: 'All Lesser (safe)', expectedATK: baseATK + slots * 1 },
    { label: 'All Intermediate (avg)', expectedATK: baseATK + expectedSuccesses(slots, 0.60) * 2 },
    { label: '2 Greater + rest Intermediate', expectedATK: /* mixed calc */ },
  ].map(s => ({
    ...s,
    expectedDamageAvg: calcDamage({
      ...character.derived,
      weaponATK: s.expectedATK,
      weaponType: item.weapon_type ?? '',
    }).avg,
  }));

  return {
    item,
    currentATK: baseATK,
    scrolledEV: scenarios,
    eds: {
      floor: scenarios[0].expectedDamageAvg,
      expected: scenarios[2].expectedDamageAvg,
      ceiling: scenarios[3].expectedDamageAvg,
    },
    meetsRequirements: canEquip(item, character),
    levelToEquip: item.stats.reqLevel,
    deltaFromCurrent: computeDelta(character, scenarios[2].expectedDamageAvg),
  };
}
```

### Non-Weapon Gear Scoring

For non-weapon slots (hat, gloves, shoes, rings, etc.), score by **stat contribution to damage**:

```ts
function statToDamageValue(item: Item, character: CharacterState): number {
  // Each stat point's damage value depends on class
  // For assassin: 1 LUK = weaponMult Ã weaponATK / 100 = 3.6 Ã 47 / 100 â 1.69 damage
  // For warrior: 1 STR = weaponMult Ã weaponATK / 100
  // incPAD bonus on gloves/accessories = 1 point inside parens Ã weaponATK / 100
  const config = CLASS_STAT_CONFIG[character.className];
  const wATK = character.derived.weaponATK;
  const mult = config.weaponMult(character.derived.weaponType ?? '');

  let damageValue = 0;
  if (item.stats.incSTR) damageValue += item.stats.incSTR * (isPrimarySTR ? mult : 1) * wATK / 100;
  if (item.stats.incDEX) damageValue += item.stats.incDEX * (isPrimaryDEX ? mult : 1) * wATK / 100;
  if (item.stats.incINT) damageValue += item.stats.incINT * (isPrimaryINT ? mult : 1) * wATK / 100;
  if (item.stats.incLUK) damageValue += item.stats.incLUK * (isPrimaryLUK ? mult : 1) * wATK / 100;
  if (item.stats.incPAD) damageValue += item.stats.incPAD * wATK / 100;
  // Accuracy: score positively if player has accuracy issues
  if (item.stats.incACC) damageValue += item.stats.incACC * accuracyWeight(character);

  return damageValue;
}
```

### UI Layout

Sections: **Current Gear Summary** â **Weapon Upgrades** â **Armor Upgrades** â **Scroll Advice**

**Weapon Upgrades panel:**

```
Currently equipped: Adamantium Igor (Lv20, 27 ATK, 7 slots)
  With your scrolls (3 Intermediate successes): ~33 ATK effective
  Actual damage range: 412 â 687 avg 549

âââââââââââââââââââââââââââââââââââââââââââ
Upgrade candidates (ranked by expected damage at your stats):

1. â RECOMMENDED â  Steel Guards (Lv30, Claw)
   Base: 37 ATK | 7 slots
   Can equip at: Level 30 â (you're 37, ready now!)
   
   Scroll scenarios:
   â¢ Clean:           37 ATK â avg 603 dmg  (+54 vs current clean)
   â¢ All Lesser:      44 ATK â avg 718 dmg  (+169 vs your current)
   â¢ All Intermediate: 45.4 ATK expected â avg 740 dmg  (+191 vs your current)
   
   Why upgrade: Even with zero scrolls, the Steel Guards out-damage your 
   current +3 Intermediate Igor. 10 more base ATK is a massive jump.

2.  Meba (Lv25, Claw)
   Base: 29 ATK | 7 slots  [Faster speed]
   ...
```

**The scrolling comparison section:**

```
Is your current weapon still competitive?

Your Adamantium Igor: 3/7 Intermediate scrolls succeeded â +6 ATK â 33 ATK total
To beat a clean Steel Guards (37 ATK), you'd need... 5 more ATK from scrolls
That would require ~3.3 more Intermediate successes on average (4 slots left)
Probability of getting 3+ successes from 4 Intermediate scrolls: ~82%

Verdict: Your Igor is close to breakeven with a clean Guards.
Once you can land 1-2 more scrolls on the Igor, consider keeping it until 
you can fully scroll the Guards, unless you're sitting on scroll mats.
```

**Why it's good â plain English explanations:**

For each recommended item, the system generates a plain text explanation in the format:
> "This item is recommended because [primary reason]. With your [class] and [primary stat] LUK, every +1 W.ATK on your weapon is worth about [N] damage per hit. The [item name] has [X] more base ATK than your current weapon, which translates to [Y] more damage per hit before any scrolling. [If applicable: At your level, accuracy isn't a limiting factor / accuracy IS limiting you, and this item's +[N] accuracy would increase your hit rate from [X]% to [Y]%]."

---

## UI Design System

**Theme:** Dark, warm, Maple-adjacent. Orange (#E8913A) primary accent, dark navy/charcoal backgrounds.

**Color palette (Tailwind custom config):**
```js
colors: {
  maple: {
    bg:        '#0C0E14',
    card:      '#13161F',
    cardHover: '#191D28',
    accent:    '#1A1E2A',
    border:    'rgba(255,255,255,0.06)',
    orange:    '#E8913A',
    orangeDim: 'rgba(232,145,58,0.15)',
    green:     '#5AC47E',
    greenDim:  'rgba(90,196,126,0.12)',
    blue:      '#5A9DE8',
    red:       '#E85A5A',
    purple:    '#9C7AE8',
    text:      '#E8E6E1',
    muted:     '#8B8A85',
    faint:     '#5C5B57',
  }
}
```

**Typography:** DM Sans (body), Instrument Serif (headings/app name only).

**Component patterns:**
- Cards: `bg-maple-card border border-maple-border rounded-xl p-4`
- Section labels: `text-xs uppercase tracking-widest text-maple-faint`
- Tags/badges: `text-[10px] px-2 py-0.5 rounded font-medium`
- Input fields: `bg-maple-accent border border-maple-border rounded-lg text-maple-text`

**Responsive:** Mobile-first. Single column on mobile, sidebar layout on desktop (â¥768px).

---

## State Management

Use **Zustand** with `immer` middleware for immutable updates.

```ts
// Auto-recompute derived stats on any state change:
const computeDerived = (state: CharacterState): DerivedStats => {
  const totalStats = sumGearBonuses(state.baseStats, state.equipment);
  const weaponATK = computeWeaponATK(state.equipment.weapon);
  const flatAttackPower = computeFlatATK(state.skills, state.activeBuffs);
  const mastery = computeMastery(state.className, state.skills);
  const accuracy = computeAccuracy(totalStats, gearAccuracy, state.className);
  const damageRange = calcDamage({ className: state.className, stats: totalStats, weaponATK, flatAttackPower, mastery, skillPercent: 1.0 });
  const critRate = computeCritRate(state.skills);
  return { totalStats, weaponATK, flatAttackPower, mastery, accuracy, damageRange, critRate };
};
```

**Persistence:** `zustand/middleware/persist` with `localStorage` key `maple-advisor-v1`.

---

## GitHub Pages Deployment

```json
// package.json
{
  "homepage": "https://[username].github.io/maple-advisor",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

```ts
// vite.config.ts
export default defineConfig({
  base: '/maple-advisor/',
  build: { outDir: 'dist' }
})
```

All JSON data files go in `public/data/` and are fetched at startup via `fetch('/maple-advisor/data/monsters.json')`. Load all on app init, store in a non-reactive global cache (not Zustand â too large).

---

## Implementation Order for Opus

Build in this order to get a working app at each step:

1. **Project scaffold** â Vite + React + TypeScript + Tailwind + Zustand + React Router
2. **Data loader** â fetch + parse all JSON, build derived maps, expose via React context
3. **Damage engine** â `damage.ts` fully unit-tested with known values
4. **Character store** â Zustand store with all actions, derived stat computation, persist
5. **Character Builder UI** â Equipment slots, item picker modal, stat panel, scroll UI, skill builder
6. **Training Advisor** â scoring algorithm, map cards, tags, tier grouping
7. **Item Progression** â gear candidates list, scroll scenarios, delta explanations
8. **Polish** â transitions, loading states, export/import flow, mobile layout
9. **GitHub Pages deploy** â vite base config, gh-pages deploy script

---

## Known Gaps & Judgment Calls for Opus

- **Magic damage formula** is not fully reverse-engineered for this CBT. For mages, use the approximate formula: `MAX = ((MATKÂ² / 1000 + MATK) / 30 + INT / 200) Ã SkillAttack` with mastery applied to MIN. MATK here = weapon's incMAD + flat magic attack bonuses. Flag this as approximate in the UI with a tooltip.
- **Attack animation speed** â exact frame data not in JSON. Use the `attackSpeed` field from item stats (2=Fastest through 7=Slower) mapped to the approximate seconds table above. This affects training score accuracy by ~10â15% but is good enough for recommendations.
- **Skill hit counts** (e.g., Thunder Bolt hits 6 targets) â need to be hardcoded from skill descriptions since the JSON doesn't have a structured `mobCount` field. Parse from `all_level_stats` strings where possible; hardcode the few that matter for AoE tag generation.
- **Element data is null for 44 of 83 mobs** â treat null as Physical (no elemental interaction). Do not penalize maps for missing element data; simply don't show elemental tags for those mobs.
- **Maps don't have mob lists** â the mobâmap relationship is inverted in the JSON (mobs list which maps they appear on). Build the `mobsByMap` reverse index at startup from `monsters.json`.

---

## Files to Give Opus Along With This Spec

1. This spec document (`MAPLE_ADVISOR_SPEC.md`)
2. `cbt/app_metadata/monsters.json`
3. `cbt/app_metadata/maps.json`
4. `cbt/app_metadata/items.json`
5. `cbt/app_metadata/skills.json`
6. `cbt/app_metadata/lookups.json`

Opus does NOT need the raw_metadata files, pre-cbt data, beauty_coupons, cash_shop, crafting, npcs, quests, or tips for this build. Those can be added later for the quest integration / farming location features.
