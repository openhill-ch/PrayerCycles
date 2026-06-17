import { hasCryptoKey } from '../lib/crypto'
import type { db as DbType } from './db'

/**
 * One-time migration of any pre-existing plaintext records to encrypted form.
 *
 * Reads through the encryption middleware (which leaves already-plaintext
 * fields untouched) and writes each record straight back, where the middleware
 * encrypts it on the way out. Records that were already encrypted just make a
 * decrypt/re-encrypt round trip. This relies entirely on the middleware, so it
 * stays in sync with the field list and type definitions automatically.
 */
export async function migrateUnencryptedData(db: typeof DbType): Promise<void> {
  if (!hasCryptoKey()) return

  const MIGRATION_KEY = 'prayercycles-encrypted'
  if (localStorage.getItem(MIGRATION_KEY) === '1') return

  await db.transaction('rw', db.prayerLists, db.prayers, async () => {
    const lists = await db.prayerLists.toArray()
    for (const list of lists) {
      await db.prayerLists.put(list)
    }

    const prayers = await db.prayers.toArray()
    for (const prayer of prayers) {
      await db.prayers.put(prayer)
    }
  })

  localStorage.setItem(MIGRATION_KEY, '1')
}
