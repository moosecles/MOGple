// ─── Raw JSON types ────────────────────────────────────────────────────────────

export interface MonsterMap {
  id: number;
  name: string;
  count: number;
  mob_time: string;
}

export interface Monster {
  id: number;
  name: string;
  level: number;
  hp: number;
  mp: number;
  exp: number;
  PADamage: number;
  PDDamage: number;
  MADamage: number;
  MDDamage: number;
  acc: number;
  eva: number;
  speed: number;
  undead: number;
  elements: Record<string, 'Weak' | 'Strong' | 'Immune'> | null;
  is_boss: boolean;
  maps: MonsterMap[];
  thumbnail: string;
  gifs?: { fly?: string; hit1?: string; die1?: string };
}

export interface MonstersJson {
  monsters: Monster[];
  total: number;
}

export interface MapEntry {
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
}

export interface MapRegion {
  region: string;
  count: number;
  maps: MapEntry[];
}

export interface MapsJson {
  regions: MapRegion[];
  total: number;
}

export interface ItemStats {
  reqLevel: number;
  reqJob: number;
  reqSTR: number;
  reqDEX: number;
  reqINT: number;
  reqLUK: number;
  incSTR?: number;
  incDEX?: number;
  incINT?: number;
  incLUK?: number;
  incPAD?: number;
  incMAD?: number;
  incPDD?: number;
  incMDD?: number;
  incACC?: number;
  incEVA?: number;
  incMHP?: number;
  incMMP?: number;
  incSpeed?: number;
  incJump?: number;
  tuc: number;
  attackSpeed?: number;
}

export interface Item {
  id: number;
  name: string;
  category: string;
  sub_category: string;
  description: string;
  stats: ItemStats;
  req_job_label: string;
  weapon_type?: string;
  attack_speed_label?: string;
  thumbnail: string;
}

export interface Scroll {
  id: number;
  name: string;
  equip_slot: string;
  tier: string;
  stat_type: string;
  description: string;
  thumbnail: string;
}

export interface ItemsJson {
  items: Item[];
  scrolls: Scroll[];
  item_total: number;
  scroll_total: number;
  equipment_meta: {
    job_filters: Array<{ label: string; value: number }>;
    weapon_type_order: string[];
    weapon_types_by_class: Record<string, string[]>;
  };
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  class_name: string;
  job: string;
  max_level: number;
  required_skill: string;
  all_level_stats: string[];
  thumbnail: string;
}

export interface JobSkillGroup {
  class_name: string;
  job: string;
  skills: Skill[];
}

export interface SkillsJson {
  beginner: JobSkillGroup[];
  warrior: JobSkillGroup[];
  magician: JobSkillGroup[];
  archer: JobSkillGroup[];
  rogue: JobSkillGroup[];
  total: number;
}

// ─── App types ─────────────────────────────────────────────────────────────────

export interface CharStats {
  STR: number;
  DEX: number;
  INT: number;
  LUK: number;
  HP: number;
  MP: number;
}

export type ScrollTier = 'Lesser' | 'Intermediate' | 'Greater' | 'Chaos';

export interface ScrollBundle {
  stat: string;       // 'Attack', 'STR', 'DEX', 'INT', 'LUK', 'HP', 'MP', 'Accuracy', 'Avoidability', 'Defense'
  tier: ScrollTier;
  hits: number;       // successful scroll applications (grants bonus)
  attempts: number;   // total slot uses including failures (hits ≤ attempts ≤ tuc)
  scrollId?: number;  // identifies which specific scroll is selected (scroll.id)
}

export interface EquippedItem {
  itemId: number;
  scrolls: ScrollBundle[];
}

export type EquipSlot = 'weapon' | 'helmet' | 'top' | 'bottom' | 'shoes' | 'gloves' | 'cape' | 'earrings' | 'shield';

export interface DerivedStats {
  totalStats: CharStats;
  weaponATK: number;
  weaponMAD: number;
  weaponType: string;
  flatAttackPower: number;
  /** Display ratio 0–1 (e.g. 0.88 = 88% MIN/MAX). Derived from masteryLevel. */
  mastery: number;
  /** Raw mastery level 0–10 passed to the damage formula. */
  masteryLevel: number;
  accuracy: number;
  avoid: number;
  damageRange: { min: number; max: number; avg: number };
  /** Base crit rate % (5 base + skill bonuses). */
  critRate: number;
  /** Total crit damage bonus % (20 base + skill bonuses). */
  critDmg: number;
  totalPDD: number;
}

export interface CharacterState {
  name: string;
  className: string;
  level: number;
  baseStats: CharStats;
  equipment: Partial<Record<EquipSlot, EquippedItem>>;
  skills: Record<string, number>;
  activeBuffs: {
    rage: boolean;
    concentration: boolean;
    meditation: boolean;
  };
}

// ─── App data context ──────────────────────────────────────────────────────────

export interface AppData {
  monsters: Monster[];
  maps: MapEntry[];
  items: Item[];
  scrolls: Scroll[];
  skills: SkillsJson;
  mobsByMap: Map<number, Array<Monster & { count: number; mob_time: number }>>;
  equipById: Map<number, Item>;
  mobById: Map<number, Monster>;
  scrollsBySlot: Map<string, Scroll[]>;
  skillsByClass: Map<string, Skill[]>;
  weaponTypesByClass: Record<string, string[]>;
}

export type AppTab = 'builder' | 'training' | 'items';
