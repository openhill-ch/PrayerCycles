import { db } from '../db/db'
import { generateId } from './id'
import type { Prayer, PrayerList } from '../db/types'

export type SurfacedPrayer = {
  prayer: Prayer
  listId: string
  listName: string
}

function getCadenceBoundary(cadence: string, now: Date): number {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  switch (cadence) {
    case 'daily':
      return start.getTime()
    case 'weekly': {
      const day = start.getDay()
      start.setDate(start.getDate() - day)
      return start.getTime()
    }
    case 'monthly': {
      start.setDate(1)
      return start.getTime()
    }
    default:
      return start.getTime()
  }
}

function advanceRotation(list: PrayerList, now: Date): PrayerList {
  const boundary = getCadenceBoundary(list.cycle.cadence, now)

  if (list.rotationState.lastCadenceBoundary >= boundary) {
    return list
  }

  const queue = list.rotationState.queue
  if (queue.length === 0) return list

  let pointer = list.rotationState.pointer

  if (list.cycle.lifecycle.type === 'finite' && pointer >= queue.length) {
    return { ...list, status: 'archived' }
  }

  if (pointer >= queue.length) {
    pointer = 0
  }

  return {
    ...list,
    rotationState: {
      ...list.rotationState,
      pointer,
      lastCadenceBoundary: boundary,
    },
  }
}

async function pickLeastPrayed(queue: string[], offsets: Record<string, number> = {}): Promise<Prayer | undefined> {
  if (queue.length === 0) return undefined

  const prayers = await Promise.all(queue.map((id) => db.prayers.get(id)))
  const valid = prayers.filter((p): p is Prayer => p !== undefined && !p.fulfilled)
  if (valid.length === 0) return undefined

  // Use effective tally (real + ghost offset) for comparison
  const effectiveTally = (p: Prayer) => p.prayerTally + (offsets[p.id] ?? 0)
  const minTally = Math.min(...valid.map(effectiveTally))
  const leastPrayed = valid.filter((p) => effectiveTally(p) === minTally)

  return leastPrayed[Math.floor(Math.random() * leastPrayed.length)]
}

export async function getSurfacedPrayers(): Promise<SurfacedPrayer[]> {
  const now = new Date()
  const lists = await db.prayerLists.where('status').equals('active').toArray()
  const surfaced: SurfacedPrayer[] = []

  for (const rawList of lists) {
    const list = advanceRotation(rawList, now)

    if (list.status === 'archived') {
      await db.prayerLists.put({ ...rawList, status: 'archived' })
      continue
    }

    if (list.rotationState !== rawList.rotationState) {
      await db.prayerLists.put({ ...rawList, rotationState: list.rotationState })
    }

    const queue = list.rotationState.queue
    if (queue.length === 0) continue

    const prayer = await pickLeastPrayed(queue, list.rotationState.tallyOffsets ?? {})

    if (prayer) {
      surfaced.push({
        prayer,
        listId: list.id,
        listName: list.name,
      })
    }
  }

  return surfaced
}

export async function completePrayer(
  prayerId: string,
  listId: string,
  duration = 0,
): Promise<void> {
  const list = await db.prayerLists.get(listId)
  if (!list) return

  const now = Date.now()

  await db.prayerLogs.add({
    id: generateId(),
    prayerId,
    listId,
    prayedAt: now,
    duration,
  })

  const prayer = await db.prayers.get(prayerId)
  if (prayer) {
    await db.prayers.put({
      ...prayer,
      lastPrayedAt: now,
      prayerTally: prayer.prayerTally + 1,
    })
  }

  // Check if all prayers in the list have been prayed — if so, bump completionTally
  const queue = list.rotationState.queue
  const offsets = list.rotationState.tallyOffsets ?? {}
  if (queue.length > 0) {
    const allPrayers = await Promise.all(queue.map((id) => db.prayers.get(id)))
    const valid = allPrayers.filter((p): p is Prayer => p !== undefined)
    if (valid.length > 0) {
      const effectiveTally = (p: Prayer) => (p.id === prayerId ? p.prayerTally + 1 : p.prayerTally) + (offsets[p.id] ?? 0)
      const minTally = Math.min(...valid.map(effectiveTally))
      if (minTally > (list.completionTally ?? 0)) {
        // Check if finite lifecycle reached its limit
        if (list.cycle.lifecycle.type === 'finite' && list.cycle.lifecycle.retireAfter && minTally >= list.cycle.lifecycle.retireAfter) {
          await db.prayerLists.put({ ...list, completionTally: minTally, status: 'archived' })
          return
        }
        await db.prayerLists.put({ ...list, completionTally: minTally })
      }
    }
  }
}
