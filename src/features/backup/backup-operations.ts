import { db } from '../../db/db'
import { snapshotToLocalStorage } from './local-backup'
import type { Prayer, PrayerList } from '../../db/types'
import { encryptBlob, decryptBlob, hasCryptoKey, isEncrypted } from '../../lib/crypto'

const TAG_REGISTRY_KEY = 'prayercycles_tag_registry'

type BackupDataV1 = {
  version: 1
  exportedAt: number
  prayerLists: PrayerList[]
  prayers: Prayer[]
}

type BackupDataV2 = {
  version: 2
  exportedAt: number
  prayerLists: PrayerList[]
  prayers: Prayer[]
  tagRegistry: string[]
}

type BackupData = BackupDataV1 | BackupDataV2

export async function exportData(): Promise<string> {
  const [prayerLists, prayers] = await Promise.all([
    db.prayerLists.toArray(),
    db.prayers.toArray(),
  ])

  let tagRegistry: string[] = []
  try {
    let raw = localStorage.getItem(TAG_REGISTRY_KEY)
    if (raw && hasCryptoKey() && isEncrypted(raw)) raw = decryptBlob(raw)
    tagRegistry = raw ? JSON.parse(raw) : []
  } catch {
    tagRegistry = []
  }

  const data: BackupDataV2 = {
    version: 2,
    exportedAt: Date.now(),
    prayerLists,
    prayers,
    tagRegistry,
  }

  return JSON.stringify(data, null, 2)
}

export async function importData(json: string): Promise<void> {
  const data: BackupData = JSON.parse(json)

  // Normalize v1 backups (no tag registry)
  const tagRegistry = 'tagRegistry' in data ? data.tagRegistry : []

  await db.transaction('rw', [db.prayerLists, db.prayers], async () => {
    // Smart merge: upsert imported data, keep local items not in backup

    for (const list of data.prayerLists) {
      await db.prayerLists.put(list)
    }

    for (const prayer of data.prayers) {
      await db.prayers.put(prayer)
    }

  })

  let localRegistry: string[] = []
  try {
    let raw = localStorage.getItem(TAG_REGISTRY_KEY)
    if (raw && hasCryptoKey() && isEncrypted(raw)) raw = decryptBlob(raw)
    localRegistry = raw ? JSON.parse(raw) : []
  } catch {
    localRegistry = []
  }
  const mergedRegistry = [...new Set([...localRegistry, ...tagRegistry])]
  const registryJson = JSON.stringify(mergedRegistry)
  localStorage.setItem(TAG_REGISTRY_KEY, hasCryptoKey() ? encryptBlob(registryJson) : registryJson)

  snapshotToLocalStorage()
}
