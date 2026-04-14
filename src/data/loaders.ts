import type {
  AppData, Monster, MapEntry, Item, Scroll, SkillsJson,
  MonstersJson, MapsJson, ItemsJson, Skill
} from '../types'

const BASE = import.meta.env.BASE_URL

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}data/${path}`)
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`)
  return res.json() as Promise<T>
}

export async function loadAppData(): Promise<AppData> {
  const [monstersJson, mapsJson, itemsJson, skillsJson] = await Promise.all([
    fetchJson<MonstersJson>('monsters.json'),
    fetchJson<MapsJson>('maps.json'),
    fetchJson<ItemsJson>('items.json'),
    fetchJson<SkillsJson>('skills.json'),
  ])

  const monsters: Monster[] = monstersJson.monsters

  const maps: MapEntry[] = mapsJson.regions.flatMap(r => r.maps)

  const equipment: Item[] = itemsJson.items.filter(i => i.category === 'Equipment')
  const scrolls: Scroll[] = itemsJson.scrolls

  // ── Derived: mobsByMap ─────────────────────────────────────────────────────
  const mobsByMap = new Map<number, Array<Monster & { count: number; mob_time: number }>>()
  for (const mob of monsters) {
    for (const mapRef of mob.maps) {
      const entry = { ...mob, count: mapRef.count, mob_time: parseFloat(mapRef.mob_time) }
      const arr = mobsByMap.get(mapRef.id) ?? []
      arr.push(entry)
      mobsByMap.set(mapRef.id, arr)
    }
  }

  // ── Derived: equipById ─────────────────────────────────────────────────────
  const equipById = new Map<number, Item>()
  for (const item of equipment) equipById.set(item.id, item)

  // ── Derived: mobById ───────────────────────────────────────────────────────
  const mobById = new Map<number, Monster>()
  for (const mob of monsters) mobById.set(mob.id, mob)

  // ── Derived: scrollsBySlot ─────────────────────────────────────────────────
  const scrollsBySlot = new Map<string, Scroll[]>()
  for (const scroll of scrolls) {
    const arr = scrollsBySlot.get(scroll.equip_slot) ?? []
    arr.push(scroll)
    scrollsBySlot.set(scroll.equip_slot, arr)
  }

  // ── Derived: skillsByClass ─────────────────────────────────────────────────
  const skillsByClass = new Map<string, Skill[]>()
  const allGroups = [
    ...skillsJson.beginner,
    ...skillsJson.warrior,
    ...skillsJson.magician,
    ...skillsJson.archer,
    ...skillsJson.rogue,
  ]
  for (const group of allGroups) {
    const arr = skillsByClass.get(group.class_name) ?? []
    for (const sk of group.skills) arr.push(sk)
    skillsByClass.set(group.class_name, arr)
  }

  return {
    monsters,
    maps,
    items: equipment,
    scrolls,
    skills: skillsJson,
    mobsByMap,
    equipById,
    mobById,
    scrollsBySlot,
    skillsByClass,
  }
}
