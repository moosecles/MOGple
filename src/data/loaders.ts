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

  // Strip GM/test items — unrealistic stats that can't be obtained in normal play
  const equipment: Item[] = itemsJson.items.filter(i => {
    if (i.category !== 'Equipment') return false
    const s = i.stats
    if ((s.incSTR ?? 0) > 100) return false
    if ((s.incDEX ?? 0) > 100) return false
    if ((s.incINT ?? 0) > 100) return false
    if ((s.incLUK ?? 0) > 100) return false
    if ((s.incPAD ?? 0) > 150) return false
    if ((s.incMAD ?? 0) > 150) return false
    return true
  })
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
    // Skip scrolls with stat_type 'Other' (Crit Rate, Jump, DEF-other — not tracked in damage model)
    if (scroll.stat_type === 'Other') continue
    const arr = scrollsBySlot.get(scroll.equip_slot) ?? []
    arr.push(scroll)
    scrollsBySlot.set(scroll.equip_slot, arr)
  }
  // The JSON stores Hat/Topwear/Bottomwear scrolls all under 'Other' equip_slot.
  // Split them out by name prefix so each item type shows the right scrolls.
  const otherScrolls = scrollsBySlot.get('Other') ?? []
  const capScrolls   = otherScrolls.filter(s => s.name.startsWith('Hat'))
  const coatScrolls  = otherScrolls.filter(s => s.name.startsWith('Topwear'))
  const pantsScrolls = otherScrolls.filter(s => s.name.startsWith('Bottomwear'))
  if (capScrolls.length)   scrollsBySlot.set('Cap',   capScrolls)
  if (coatScrolls.length)  scrollsBySlot.set('Coat',  coatScrolls)
  if (pantsScrolls.length) scrollsBySlot.set('Pants', pantsScrolls)
  scrollsBySlot.delete('Other')  // clean up — remaining items are pet equip scrolls

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
    weaponTypesByClass: itemsJson.equipment_meta.weapon_types_by_class,
  }
}
