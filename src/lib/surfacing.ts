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

/* Which prayer each list surfaced, and for which cadence period. Without this,
 * pickLeastPrayed re-rolls its random tie-break on every call, so simply
 * navigating between pages swapped out today's prayers. The pick now holds
 * until the list's next cadence boundary (midnight for a daily list) or until
 * that prayer is actually prayed. */
const SURFACED_KEY = 'prayercycles_surfaced'

type SurfacedPick = { boundary: number; prayerId: string }

function readPicks(): Record<string, SurfacedPick> {
  try {
    return JSON.parse(localStorage.getItem(SURFACED_KEY) || '{}')
  } catch {
    return {}
  }
}

function writePicks(picks: Record<string, SurfacedPick>): void {
  try {
    localStorage.setItem(SURFACED_KEY, JSON.stringify(picks))
  } catch {
    // storage unavailable — fall back to re-picking each time
  }
}

/** Drop a list's remembered pick so the next surface advances to a new prayer. */
export function clearSurfacedPick(listId: string): void {
  const picks = readPicks()
  if (picks[listId]) {
    delete picks[listId]
    writePicks(picks)
  }
}

export async function getSurfacedPrayers(): Promise<SurfacedPrayer[]> {
  const now = new Date()
  const lists = await db.prayerLists.where('status').equals('active').toArray()
  const surfaced: SurfacedPrayer[] = []
  const picks = readPicks()
  let picksChanged = false

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

    const boundary = getCadenceBoundary(list.cycle.cadence, now)
    let prayer: Prayer | undefined

    // Reuse this period's pick while it's still a valid choice.
    const remembered = picks[list.id]
    if (remembered && remembered.boundary === boundary && queue.includes(remembered.prayerId)) {
      const p = await db.prayers.get(remembered.prayerId)
      if (p && !p.fulfilled) prayer = p
    }

    if (!prayer) {
      prayer = await pickLeastPrayed(queue, list.rotationState.tallyOffsets ?? {})
      if (prayer) {
        picks[list.id] = { boundary, prayerId: prayer.id }
        picksChanged = true
      }
    }

    if (prayer) {
      surfaced.push({
        prayer,
        listId: list.id,
        listName: list.name,
      })
    }
  }

  if (picksChanged) writePicks(picks)

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

  // This one's been prayed, so let the list surface the next one.
  clearSurfacedPick(listId)

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
        await db.prayerLists.put({ ...list, completionTally: minTally })
      }
    }
  }
}
