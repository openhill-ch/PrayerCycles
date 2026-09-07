import { db } from '../db/db'
import type { Prayer } from '../db/types'

/**
 * Records that a prayer was prayed for.
 *
 * This is all that remains of the surfacing module. The Main List used to pick
 * one prayer from each list per cadence period and rotate through them; that
 * feature is gone, and with it the cadence boundaries, the least-prayed picker
 * and the remembered picks. The timebox now simply walks the list you chose.
 */
export async function completePrayer(prayerId: string, listId: string): Promise<void> {
  const list = await db.prayerLists.get(listId)
  if (!list) return

  const now = Date.now()

  const prayer = await db.prayers.get(prayerId)
  if (prayer) {
    await db.prayers.put({
      ...prayer,
      lastPrayedAt: now,
      prayerTally: prayer.prayerTally + 1,
    })
  }

  // Once every prayer in the list has been prayed the same number of times,
  // the list has been round once more.
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
