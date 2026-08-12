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

  // Tracks the scheme the stored records are written in, not merely whether
  // they are encrypted. Records written by the old tweetnacl scheme decrypt on
  // read and come back out as AES-GCM, so the same read-then-put pass that
  // once encrypted plaintext now also upgrades them.
  const SCHEME_KEY = 'prayercycles-enc-scheme'
  const CURRENT_SCHEME = 'aes-gcm'
  if (localStorage.getItem(SCHEME_KEY) === CURRENT_SCHEME) return

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

  localStorage.setItem(SCHEME_KEY, CURRENT_SCHEME)
}
