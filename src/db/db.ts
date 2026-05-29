import Dexie, { type EntityTable } from 'dexie'
import type { Prayer, PrayerList, PrayerLog } from './types'

const db = new Dexie('PrayerCyclesDB') as Dexie & {
  prayerLists: EntityTable<PrayerList, 'id'>
  prayers: EntityTable<Prayer, 'id'>
  prayerLogs: EntityTable<PrayerLog, 'id'>
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
    if (prayer.totalTimePrayed === undefined) prayer.totalTimePrayed = 0
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

db.version(5).stores({
  prayerLists: 'id, name, status, createdAt',
  prayers: 'id, title, *listIds, createdAt, lastPrayedAt',
  prayerLogs: 'id, prayerId, listId, prayedAt',
}).upgrade((tx) => {
  return tx.table('prayers').toCollection().modify((prayer) => {
    if (prayer.fulfilled === undefined) prayer.fulfilled = false
  })
})

export { db }
