import { useState, useEffect, useCallback, useRef } from 'react'
import { Undo2 } from 'lucide-react'
import { useT } from '../i18n'
import { useTimer } from '../context/TimerContext'
import { PrayerCard } from '../components/PrayerCard'
import { completePrayer, type SurfacedPrayer } from '../lib/surfacing'
import { db } from '../db/db'

type CompletedEntry = {
  surfaced: SurfacedPrayer
  index: number
}

export function TapPrayPage() {
  const { t } = useT()
  const { surfacedPrayers, selectedListId, refreshPrayers, currentIndex, running, timeLeft } = useTimer()
  const [completedStack, setCompletedStack] = useState<CompletedEntry[]>([])
  const [hiddenIds, setHiddenIds] = useState<Record<string, true>>({})
  const [autoFlipIds, setAutoFlipIds] = useState<Record<string, true>>({})
  const prevListRef = useRef(selectedListId)
  const prevIndexRef = useRef(currentIndex)
  const prevTimeLeftRef = useRef(timeLeft)
  const wasRunningRef = useRef(false)

  // Clear completed/hidden state when the selected list changes
  useEffect(() => {
    if (prevListRef.current !== selectedListId) {
      setCompletedStack([])
      setHiddenIds({})
      setAutoFlipIds({})
      prevListRef.current = selectedListId
    }
  }, [selectedListId])

  // Auto-flip prayer when timer advances to next prayer (visual only — counting is handled by TimerContext)
  useEffect(() => {
    if (running && currentIndex > prevIndexRef.current) {
      for (let i = prevIndexRef.current; i < currentIndex; i++) {
        const s = surfacedPrayers[i]
        if (s) {
          const key = `${s.prayer.id}-${s.listId}`
          setAutoFlipIds((prev) => ({ ...prev, [key]: true }))
          // Delay hiding so flip+fade animation plays first
          setTimeout(() => {
            setHiddenIds((prev) => ({ ...prev, [key]: true }))
          }, 800)
        }
      }
    }
    prevIndexRef.current = currentIndex
  }, [currentIndex, running, surfacedPrayers])

  // Track when timer was running so we can distinguish "timer finished" from "config changed timeLeft to 0"
  useEffect(() => {
    if (running) wasRunningRef.current = true
  }, [running])

  // Auto-flip last prayer when timer finishes (visual only) — only if the timer was actually running
  useEffect(() => {
    if (wasRunningRef.current && prevTimeLeftRef.current > 0 && timeLeft === 0 && !running && surfacedPrayers.length > 0) {
      const last = surfacedPrayers[surfacedPrayers.length - 1]
      if (last) {
        const key = `${last.prayer.id}-${last.listId}`
        setAutoFlipIds((prev) => ({ ...prev, [key]: true }))
        setTimeout(() => {
          setHiddenIds((prev) => ({ ...prev, [key]: true }))
        }, 800)
      }
      wasRunningRef.current = false
    }
    prevTimeLeftRef.current = timeLeft
  }, [timeLeft, running, surfacedPrayers])

  const allDone = surfacedPrayers.length > 0 && surfacedPrayers.every(
    (s) => hiddenIds[`${s.prayer.id}-${s.listId}`],
  )

  const complete = useCallback(
    async (prayerId: string, listId: string) => {
      const key = `${prayerId}-${listId}`
      const index = surfacedPrayers.findIndex(
        (s) => s.prayer.id === prayerId && s.listId === listId,
      )
      if (index === -1) return

      const entry = surfacedPrayers[index]
      setCompletedStack((prev) => [...prev, { surfaced: entry, index }])
      setHiddenIds((prev) => ({ ...prev, [key]: true }))

      await completePrayer(prayerId, listId)
    },
    [surfacedPrayers],
  )

  const undo = useCallback(async () => {
    if (completedStack.length === 0) return

    const last = completedStack[completedStack.length - 1]
    setCompletedStack((prev) => prev.slice(0, -1))

    const key = `${last.surfaced.prayer.id}-${last.surfaced.listId}`
    setHiddenIds((prev) => {
      const next = { ...prev }
      delete next[key]
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

    refreshPrayers()
  }, [completedStack, refreshPrayers])

  const canUndo = completedStack.length > 0

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
      {surfacedPrayers.length === 0 || allDone ? (
        <div className="flex flex-col items-center justify-center pt-20 text-center">
          <p className="text-text-tertiary">{t.noPrayersToShow}</p>
        </div>
      ) : (
        <div className="mx-auto columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3 max-w-5xl">
          {surfacedPrayers.map((s) => {
            const key = `${s.prayer.id}-${s.listId}`
            const isHidden = !!hiddenIds[key]
            return (
              <div key={key} className={`mb-3 break-inside-avoid ${isHidden ? 'invisible' : ''}`}>
                <PrayerCard
                  surfaced={s}
                  onComplete={complete}
                  autoFlip={!!autoFlipIds[key]}
                />
              </div>
            )
          })}
        </div>
      )}

      {canUndo && (
        <button
          onClick={undo}
          className="fixed bottom-20 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-input text-text-secondary shadow-lg hover:bg-input-hover"
          aria-label={t.undoLastCompletion}
        >
          <Undo2 size={20} />
        </button>
      )}
    </div>
  )
}
