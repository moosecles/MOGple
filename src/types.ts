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

export interface ScrollApplication {
  tier: ScrollTier;
  stat: string;
  success: boolean;
  slotIndex: number;
}

export interface EquippedItem {
  itemId: number;
  scrolls: ScrollApplication[];
}

export type EquipSlot = 'weapon' | 'helmet' | 'top' | 'bottom' | 'shoes' | 'gloves' | 'cape' | 'earrings' | 'ring';

export interface DerivedStats {
  totalStats: CharStats;
  weaponATK: number;
  weaponMAD: number;
  weaponType: string;
  flatAttackPower: number;
  mastery: number;
  accuracy: number;
  avoid: number;
  damageRange: { min: number; max: number; avg: number };
  critRate: number;
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
  // derived
  mobsByMap: Map<number, Array<Monster & { count: number; mob_time: number }>>;
  equipById: Map<number, Item>;
  mobById: Map<number, Monster>;
  scrollsBySlot: Map<string, Scroll[]>;
  skillsByClass: Map<string, Skill[]>;
}

export type AppTab = 'builder' | 'training' | 'items';
