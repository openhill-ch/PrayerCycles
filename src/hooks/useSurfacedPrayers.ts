import { useState, useEffect, useCallback } from 'react'
import { getSurfacedPrayers, completePrayer, type SurfacedPrayer } from '../lib/surfacing'
import { db } from '../db/db'

type CompletedEntry = {
  surfaced: SurfacedPrayer
  index: number
}

export function useSurfacedPrayers() {
  const [prayers, setPrayers] = useState<SurfacedPrayer[]>([])
  const [completedStack, setCompletedStack] = useState<CompletedEntry[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const result = await getSurfacedPrayers()
    setPrayers(result)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const complete = useCallback(
    async (prayerId: string, listId: string) => {
      const index = prayers.findIndex(
        (s) => s.prayer.id === prayerId && s.listId === listId,
      )
      if (index === -1) return

      const entry = prayers[index]
      setCompletedStack((prev) => [...prev, { surfaced: entry, index }])
      setPrayers((prev) => prev.filter((_, i) => i !== index))

      await completePrayer(prayerId, listId)
    },
    [prayers],
  )

  const undo = useCallback(async () => {
    if (completedStack.length === 0) return

    const last = completedStack[completedStack.length - 1]
    setCompletedStack((prev) => prev.slice(0, -1))

    setPrayers((prev) => {
      const next = [...prev]
      next.splice(last.index, 0, last.surfaced)
      return next
    })

    const { prayer } = last.surfaced
    const current = await db.prayers.get(prayer.id)
    if (current) {
      await db.prayers.put({
        ...current,
        lastPrayedAt: prayer.lastPrayedAt,
        prayerTally: prayer.prayerTally,
      })
    }

    const logs = await db.prayerLogs
      .where('prayerId')
      .equals(prayer.id)
      .reverse()
      .sortBy('prayedAt')
    if (logs.length > 0) {
      await db.prayerLogs.delete(logs[0].id)
    }
  }, [completedStack])

  const canUndo = completedStack.length > 0

  return { prayers, loading, complete, undo, canUndo, refresh }
}
