import { db } from '../../db/db'
import { snapshotToLocalStorage } from '../backup/local-backup'
import { encryptBlob, decryptBlob, hasCryptoKey, isEncrypted } from '../../lib/crypto'

const TAG_REGISTRY_KEY = 'prayercycles_tag_registry'

function getRegistryTags(): string[] {
  try {
    let raw = localStorage.getItem(TAG_REGISTRY_KEY)
    if (!raw) return []
    if (hasCryptoKey() && isEncrypted(raw)) raw = decryptBlob(raw)
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveRegistryTags(tags: string[]): void {
  const json = JSON.stringify(tags)
  localStorage.setItem(TAG_REGISTRY_KEY, hasCryptoKey() ? encryptBlob(json) : json)
}

/** Create a standalone tag (stored in registry until assigned to a list/prayer) */
export function createStandaloneTag(name: string): boolean {
  const trimmed = name.trim()
  if (!trimmed) return false
  const registry = getRegistryTags()
  if (registry.includes(trimmed)) return false
  registry.push(trimmed)
  saveRegistryTags(registry)
  return true
}

/** Collect every unique tag from all prayer lists, prayers, and the registry */
export async function getAllTags(): Promise<string[]> {
  const [lists, prayers] = await Promise.all([
    db.prayerLists.toArray(),
    db.prayers.toArray(),
  ])
  const set = new Set<string>()
  // Include registry tags
  for (const t of getRegistryTags()) set.add(t)
  for (const l of lists) {
    for (const t of l.tags ?? []) set.add(t)
  }
  for (const p of prayers) {
    for (const t of p.tags ?? []) set.add(t)
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

/** Rename a tag everywhere it appears (lists + prayers + registry) */
export async function renameTag(oldName: string, newName: string): Promise<void> {
  const trimmed = newName.trim()
  if (!trimmed || oldName === trimmed) return

  // Update registry
  const registry = getRegistryTags()
  const regIdx = registry.indexOf(oldName)
  if (regIdx !== -1) {
    registry[regIdx] = trimmed
    saveRegistryTags([...new Set(registry)])
  }

  await db.transaction('rw', [db.prayerLists, db.prayers], async () => {
    const lists = await db.prayerLists.toArray()
    for (const list of lists) {
      if ((list.tags ?? []).includes(oldName)) {
        const updated = (list.tags ?? []).map((t) => (t === oldName ? trimmed : t))
        await db.prayerLists.put({ ...list, tags: [...new Set(updated)] })
      }
    }

    const prayers = await db.prayers.toArray()
    for (const prayer of prayers) {
      if ((prayer.tags ?? []).includes(oldName)) {
        const updated = (prayer.tags ?? []).map((t) => (t === oldName ? trimmed : t))
        await db.prayers.put({ ...prayer, tags: [...new Set(updated)] })
      }
    }
  })
  snapshotToLocalStorage()
}

/** Remove a tag from every list, prayer, and registry */
export async function deleteTag(tagName: string): Promise<void> {
  const registry = getRegistryTags()
  saveRegistryTags(registry.filter((t) => t !== tagName))

  await db.transaction('rw', [db.prayerLists, db.prayers], async () => {
    const lists = await db.prayerLists.toArray()
    for (const list of lists) {
      if ((list.tags ?? []).includes(tagName)) {
        await db.prayerLists.put({ ...list, tags: (list.tags ?? []).filter((t) => t !== tagName) })
      }
    }

    const prayers = await db.prayers.toArray()
    for (const prayer of prayers) {
      if ((prayer.tags ?? []).includes(tagName)) {
        await db.prayers.put({ ...prayer, tags: (prayer.tags ?? []).filter((t) => t !== tagName) })
      }
    }
  })
  snapshotToLocalStorage()
}

/** Get counts: how many lists and prayers use each tag.
 *  Prayers inherit their lists' tags for counting purposes. */
export async function getTagCounts(): Promise<Map<string, { lists: number; prayers: number }>> {
  const [lists, prayers] = await Promise.all([
    db.prayerLists.toArray(),
    db.prayers.toArray(),
  ])
  const counts = new Map<string, { lists: number; prayers: number }>()

  // Build a map of listId -> tags for inheritance lookup
  const listTagsMap = new Map<string, string[]>()
  for (const l of lists) {
    listTagsMap.set(l.id, l.tags ?? [])
    for (const t of l.tags ?? []) {
      const c = counts.get(t) ?? { lists: 0, prayers: 0 }
      c.lists++
      counts.set(t, c)
    }
  }

  // For each prayer, combine its own tags with inherited tags from all its lists
  for (const p of prayers) {
    const effectiveTags = new Set<string>(p.tags ?? [])
    for (const listId of p.listIds) {
      for (const t of listTagsMap.get(listId) ?? []) {
        effectiveTags.add(t)
      }
    }
    for (const t of effectiveTags) {
      const c = counts.get(t) ?? { lists: 0, prayers: 0 }
      c.prayers++
      counts.set(t, c)
    }
  }
  return counts
}
