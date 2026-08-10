import Dexie, { type EntityTable } from 'dexie'
import type { Prayer, PrayerList } from './types'
import { encryptionMiddleware } from './encryption-middleware'

const db = new Dexie('PrayerCyclesDB') as Dexie & {
  prayerLists: EntityTable<PrayerList, 'id'>
  prayers: EntityTable<Prayer, 'id'>
}

db.version(1).stores({
  prayerLists: 'id, name, status, createdAt',
  prayers: 'id, title, *listIds, createdAt, lastPrayedAt',
  prayerLogs: 'id, prayerId, listId, prayedAt',
})

db.version(2).stores({
  prayerLists: 'id, name, status, createdAt',
  prayers: 'id, title, *listIds, createdAt, lastPrayedAt',
  prayerLogs: 'id, prayerId, listId, prayedAt',
}).upgrade((tx) => {
  return tx.table('prayers').toCollection().modify((prayer) => {
    if (prayer.sortOrder === undefined) prayer.sortOrder = {}
  })
})

db.version(3).stores({
  prayerLists: 'id, name, status, createdAt',
  prayers: 'id, title, *listIds, createdAt, lastPrayedAt',
  prayerLogs: 'id, prayerId, listId, prayedAt',
}).upgrade((tx) => {
  return tx.table('prayerLogs').toCollection().modify((log) => {
    if (log.duration === undefined) log.duration = 0
  })
})

db.version(4).stores({
  prayerLists: 'id, name, status, createdAt',
  prayers: 'id, title, *listIds, createdAt, lastPrayedAt',
  prayerLogs: 'id, prayerId, listId, prayedAt',
}).upgrade((tx) => {
  return Promise.all([
    tx.table('prayerLists').toCollection().modify((list) => {
      if (!list.tags) list.tags = []
    }),
    tx.table('prayers').toCollection().modify((prayer) => {
      if (!prayer.tags) prayer.tags = []
    }),
  ])
})

// The version stays even though its upgrade is gone: existing installs are
// already at 5, and dropping it would break the schema chain. It only ever
// seeded `fulfilled`, which no longer exists.
db.version(5).stores({
  prayerLists: 'id, name, status, createdAt',
  prayers: 'id, title, *listIds, createdAt, lastPrayedAt',
  prayerLogs: 'id, prayerId, listId, prayedAt',
})

// Prayer history is gone, so its table goes rather than sitting there quietly
// accumulating a timestamped record of every prayer. Dexie drops a store when
// its spec is null; tables not mentioned carry over untouched.
db.version(6).stores({
  prayerLogs: null,
})

db.use(encryptionMiddleware)

export { db }
