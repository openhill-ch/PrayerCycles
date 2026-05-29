import { db } from '../../db/db'
import { generateId } from '../../lib/id'
import { snapshotToLocalStorage } from '../backup/local-backup'
import type { Prayer } from '../../db/types'

export async function createPrayer(
  title: string,
  listIds: string[],
  description = '',
  tags: string[] = [],
): Promise<string> {
  const id = generateId()
  const prayer: Prayer = {
    id,
    title,
    description,
    listIds,
    createdAt: Date.now(),
    lastPrayedAt: null,
    prayerTally: 0,
    totalTimePrayed: 0,
    sortOrder: {},
    tags,
    fulfilled: false,
  }
  await db.prayers.add(prayer)

  for (const listId of listIds) {
    const list = await db.prayerLists.get(listId)
    if (list) {
      const queue = [...list.rotationState.queue, id]
      const offsets = { ...list.rotationState.tallyOffsets ?? {} }

      // Ghost offset: match the current least-prayed level
      if (list.rotationState.queue.length > 0) {
        const existing = await Promise.all(list.rotationState.queue.map((pid) => db.prayers.get(pid)))
        const valid = existing.filter((p): p is Prayer => p !== undefined)
        if (valid.length > 0) {
          const minEffective = Math.min(...valid.map((p) => p.prayerTally + (offsets[p.id] ?? 0)))
          offsets[id] = minEffective
        }
      }

      await db.prayerLists.update(listId, {
        rotationState: { ...list.rotationState, queue, tallyOffsets: offsets },
      })
    }
  }

  snapshotToLocalStorage()
  return id
}

export async function bulkCreatePrayers(
  titles: string[],
  listId: string,
): Promise<string[]> {
  const ids: string[] = []
  await db.transaction('rw', [db.prayers, db.prayerLists], async () => {
    const list = await db.prayerLists.get(listId)
    if (!list) throw new Error(`List ${listId} not found`)

    const newQueue = [...list.rotationState.queue]
    const offsets = { ...list.rotationState.tallyOffsets ?? {} }

    // Calculate ghost offset from existing prayers
    let ghostOffset = 0
    if (list.rotationState.queue.length > 0) {
      const existing = await Promise.all(list.rotationState.queue.map((pid) => db.prayers.get(pid)))
      const valid = existing.filter((p): p is Prayer => p !== undefined)
      if (valid.length > 0) {
        ghostOffset = Math.min(...valid.map((p) => p.prayerTally + (offsets[p.id] ?? 0)))
      }
    }

    for (let i = 0; i < titles.length; i++) {
      const trimmed = titles[i].trim()
      if (!trimmed) continue
      const id = generateId()
      ids.push(id)
      await db.prayers.add({
        id,
        title: trimmed,
        description: '',
        listIds: [listId],
        createdAt: Date.now() + i,
        lastPrayedAt: null,
        prayerTally: 0,
        totalTimePrayed: 0,
        sortOrder: {},
        tags: [],
        fulfilled: false,
      })
      newQueue.push(id)
      if (ghostOffset > 0) offsets[id] = ghostOffset
    }

    await db.prayerLists.update(listId, {
      rotationState: { ...list.rotationState, queue: newQueue, tallyOffsets: offsets },
    })
  })
  snapshotToLocalStorage()
  return ids
}

export async function getPrayer(id: string): Promise<Prayer | undefined> {
  return db.prayers.get(id)
}

export async function getPrayersByList(listId: string): Promise<Prayer[]> {
  const prayers = await db.prayers.where('listIds').equals(listId).toArray()
  return prayers.sort((a, b) => {
    const aOrder = a.sortOrder?.[listId]
    const bOrder = b.sortOrder?.[listId]
    // If both have custom sort order, use it
    if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder
    // If only one has sort order, it comes first
    if (aOrder !== undefined) return -1
    if (bOrder !== undefined) return 1
    // Fall back to creation order
    return a.createdAt - b.createdAt
  })
}

export async function getAllPrayers(): Promise<Prayer[]> {
  return db.prayers.orderBy('createdAt').toArray()
}

export async function updatePrayer(
  id: string,
  changes: Partial<Omit<Prayer, 'id' | 'createdAt'>>,
): Promise<void> {
  await db.prayers.update(id, changes)
  snapshotToLocalStorage()
}

export async function deletePrayer(id: string): Promise<void> {
  await db.transaction('rw', [db.prayers, db.prayerLists, db.prayerLogs], async () => {
    const prayer = await db.prayers.get(id)
    if (!prayer) return

    for (const listId of prayer.listIds) {
      const list = await db.prayerLists.get(listId)
      if (list) {
        const queue = list.rotationState.queue.filter((pid) => pid !== id)
        const pointer = Math.min(list.rotationState.pointer, Math.max(0, queue.length - 1))
        const offsets = { ...list.rotationState.tallyOffsets ?? {} }
        delete offsets[id]
        await db.prayerLists.update(listId, {
          rotationState: { ...list.rotationState, queue, pointer, tallyOffsets: offsets },
        })
      }
    }

    await db.prayerLogs.where('prayerId').equals(id).delete()
    await db.prayers.delete(id)
  })
  snapshotToLocalStorage()
}

export async function recordPrayed(prayerId: string, listId: string): Promise<void> {
  const now = Date.now()
  await db.transaction('rw', [db.prayers, db.prayerLogs], async () => {
    await db.prayerLogs.add({
      id: generateId(),
      prayerId,
      listId,
      prayedAt: now,
      duration: 0,
    })
    const prayer = await db.prayers.get(prayerId)
    if (prayer) {
      await db.prayers.update(prayerId, {
        lastPrayedAt: now,
        prayerTally: prayer.prayerTally + 1,
      })
    }
  })
  snapshotToLocalStorage()
}

export async function reorderPrayers(listId: string, orderedIds: string[]): Promise<void> {
  await db.transaction('rw', db.prayers, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      const prayer = await db.prayers.get(orderedIds[i])
      if (prayer) {
        const sortOrder = { ...(prayer.sortOrder ?? {}), [listId]: i }
        await db.prayers.update(orderedIds[i], { sortOrder })
      }
    }
  })
  snapshotToLocalStorage()
}

export async function resetPrayerOrder(listId: string): Promise<void> {
  const prayers = await db.prayers.where('listIds').equals(listId).toArray()
  await db.transaction('rw', db.prayers, async () => {
    for (const prayer of prayers) {
      const sortOrder = { ...(prayer.sortOrder ?? {}) }
      delete sortOrder[listId]
      await db.prayers.update(prayer.id, { sortOrder })
    }
  })
  snapshotToLocalStorage()
}

export async function addTimePrayed(prayerId: string, seconds: number): Promise<void> {
  const prayer = await db.prayers.get(prayerId)
  if (prayer) {
    await db.prayers.update(prayerId, {
      totalTimePrayed: (prayer.totalTimePrayed ?? 0) + seconds,
    })
  }
  snapshotToLocalStorage()
}

export async function fulfillPrayer(id: string): Promise<void> {
  await db.prayers.update(id, { fulfilled: true })
  snapshotToLocalStorage()
}

export async function unfulfillPrayer(id: string): Promise<void> {
  await db.prayers.update(id, { fulfilled: false })
  snapshotToLocalStorage()
}

export async function searchPrayers(query: string): Promise<Prayer[]> {
  const lower = query.toLowerCase()
  const all = await db.prayers.toArray()
  return all.filter(
    (p) =>
      p.title.toLowerCase().includes(lower) ||
      p.description.toLowerCase().includes(lower),
  )
}
