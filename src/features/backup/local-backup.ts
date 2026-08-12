import { db } from '../../db/db'
import { encryptBlob, decryptBlob, hasCryptoKey, isEncrypted } from '../../lib/crypto'

const STORAGE_KEY = 'prayercycles_backup'

let debounceTimer: ReturnType<typeof setTimeout> | null = null

export function snapshotToLocalStorage(): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    try {
      const [prayerLists, prayers] = await Promise.all([
        db.prayerLists.toArray(),
        db.prayers.toArray(),
      ])
      const snapshot = JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        prayerLists,
        prayers,
      })
      const stored = hasCryptoKey() ? await encryptBlob(snapshot) : snapshot
      localStorage.setItem(STORAGE_KEY, stored)
    } catch {
      // Silently fail — localStorage might be full or unavailable
    }
  }, 1000)
}

export async function checkAndRestoreFromLocalStorage(): Promise<boolean> {
  try {
    const listCount = await db.prayerLists.count()
    const prayerCount = await db.prayers.count()

    if (listCount > 0 || prayerCount > 0) return false

    let raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false

    if (hasCryptoKey() && isEncrypted(raw)) {
      raw = await decryptBlob(raw)
    }

    const data = JSON.parse(raw)
    if (!data.prayerLists?.length && !data.prayers?.length) return false

    await db.transaction('rw', [db.prayerLists, db.prayers], async () => {
      if (data.prayerLists?.length) await db.prayerLists.bulkAdd(data.prayerLists)
      if (data.prayers?.length) await db.prayers.bulkAdd(data.prayers)
    })

    console.log('[PrayerCycles] Restored data from localStorage backup')
    return true
  } catch {
    console.warn('[PrayerCycles] Failed to restore from localStorage')
    return false
  }
}
