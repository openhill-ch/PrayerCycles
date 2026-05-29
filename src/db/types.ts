export type Cadence = 'daily' | 'weekly' | 'monthly' | 'annually'
export type PersistenceUnit = 'wake' | 'passage' | 'season' | 'orbit'
export type Lifecycle = {
  type: 'indefinite' | 'finite'
  retireAfter?: number
}
export type ListStatus = 'active' | 'archived' | 'deleted'

export type Persistence = {
  unit: PersistenceUnit
  every: number
}

export type Cycle = {
  cadence: Cadence
  persistence: Persistence
  lifecycle: Lifecycle
}

export type RotationState = {
  queue: string[]
  pointer: number
  lastCadenceBoundary: number
  tallyOffsets: Record<string, number>
}

export type PrayerList = {
  id: string
  name: string
  description: string
  cycle: Cycle
  status: ListStatus
  rotationState: RotationState
  completionTally: number
  createdAt: number
  deletedAt?: number
  tags: string[]
}

export type Prayer = {
  id: string
  title: string
  description: string
  listIds: string[]
  createdAt: number
  lastPrayedAt: number | null
  prayerTally: number
  totalTimePrayed: number
  sortOrder?: Record<string, number>
  tags: string[]
  fulfilled: boolean
}

export type PrayerLog = {
  id: string
  prayerId: string
  listId: string
  prayedAt: number
  duration: number
}
