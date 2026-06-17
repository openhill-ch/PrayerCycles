import type { DBCore, DBCoreTable, DBCoreMutateRequest, DBCoreGetRequest, DBCoreGetManyRequest, DBCoreQueryRequest } from 'dexie'
import { encryptString, decryptString, hasCryptoKey, isEncrypted } from '../lib/crypto'

const FIELDS_BY_TABLE: Record<string, string[]> = {
  prayerLists: ['name', 'description', 'tags'],
  prayers: ['title', 'description', 'tags'],
}

const ARRAY_FIELDS = new Set(['tags'])

function encryptRecord(tableName: string, obj: any): any {
  const fields = FIELDS_BY_TABLE[tableName]
  if (!fields || !hasCryptoKey() || !obj) return obj
  const copy = { ...obj }
  for (const field of fields) {
    const val = copy[field]
    if (val === null || val === undefined || val === '') continue
    try {
      if (Array.isArray(val) && val.length > 0) {
        copy[field] = encryptString(JSON.stringify(val))
      } else if (typeof val === 'string' && !isEncrypted(val)) {
        copy[field] = encryptString(val)
      }
    } catch {
      // If encryption fails for any reason, store the value as-is
      // rather than losing the write entirely.
    }
  }
  return copy
}

function decryptRecord(tableName: string, obj: any): any {
  const fields = FIELDS_BY_TABLE[tableName]
  if (!fields || !hasCryptoKey() || !obj) return obj
  const copy = { ...obj }
  for (const field of fields) {
    const val = copy[field]
    if (typeof val === 'string' && isEncrypted(val)) {
      // A record that fails to decrypt (key drift, corruption) must NEVER
      // kill the whole query — degrade per-field instead.
      try {
        const decrypted = decryptString(val)
        if (ARRAY_FIELDS.has(field)) {
          try { copy[field] = JSON.parse(decrypted) } catch { copy[field] = [] }
        } else {
          copy[field] = decrypted
        }
      } catch {
        copy[field] = ARRAY_FIELDS.has(field) ? [] : '⚠ unreadable'
      }
    }
  }
  return copy
}

export const encryptionMiddleware = {
  stack: 'dbcore' as const,
  name: 'encryption',
  create(downlevelDatabase: DBCore): DBCore {
    return {
      ...downlevelDatabase,
      table(tableName: string): DBCoreTable {
        const downTable = downlevelDatabase.table(tableName)
        const fields = FIELDS_BY_TABLE[tableName]
        if (!fields) return downTable

        return {
          ...downTable,

          mutate(req: DBCoreMutateRequest) {
            if (!hasCryptoKey()) return downTable.mutate(req)
            if (req.type === 'add' || req.type === 'put') {
              return downTable.mutate({
                ...req,
                values: req.values.map((v: any) => encryptRecord(tableName, v)),
              })
            }
            return downTable.mutate(req)
          },

          get(req: DBCoreGetRequest) {
            return downTable.get(req).then((res) => {
              if (!hasCryptoKey()) return res
              return decryptRecord(tableName, res)
            })
          },

          getMany(req: DBCoreGetManyRequest) {
            return downTable.getMany(req).then((results) => {
              if (!hasCryptoKey()) return results
              return results.map((r: any) => decryptRecord(tableName, r))
            })
          },

          query(req: DBCoreQueryRequest) {
            return downTable.query(req).then((res) => {
              if (!hasCryptoKey()) return res
              return {
                ...res,
                result: res.result.map((r: any) => decryptRecord(tableName, r)),
              }
            })
          },
        }
      },
    }
  },
}
