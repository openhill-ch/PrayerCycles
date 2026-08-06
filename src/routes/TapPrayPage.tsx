import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Undo2 } from 'lucide-react'
import { useT } from '../i18n'
import { useTimer } from '../context/TimerContext'
import { PrayerCard } from '../components/PrayerCard'
import { PrayerQuickView } from '../components/PrayerQuickView'
import { completePrayer, type SurfacedPrayer } from '../lib/surfacing'

import { db } from '../db/db'

/** Mirrors the old columns-2/3/4/5 breakpoints, but as a value we can use in JS. */
function useColumnCount(): number {
  const [count, setCount] = useState(2)
  useEffect(() => {
    const steps: [MediaQueryList, number][] = [
      [window.matchMedia('(min-width: 1024px)'), 5],
      [window.matchMedia('(min-width: 768px)'), 4],
      [window.matchMedia('(min-width: 640px)'), 3],
    ]
    const update = () => setCount(steps.find(([mq]) => mq.matches)?.[1] ?? 2)
    update()
    steps.forEach(([mq]) => mq.addEventListener('change', update))
    return () => steps.forEach(([mq]) => mq.removeEventListener('change', update))
  }, [])
  return count
}

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
  // Prayer currently open in the quick view, and the one whose check was tapped
  const [viewing, setViewing] = useState<SurfacedPrayer | null>(null)
  const [confirmedIds, setConfirmedIds] = useState<Record<string, true>>({})
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

  const columnCount = useColumnCount()
  const canUndo = completedStack.length > 0

  // Distribute the cards across columns ourselves (round-robin), so every
  // column's first card starts at the same y.
  const columns = useMemo(() => {
    const buckets: SurfacedPrayer[][] = Array.from({ length: columnCount }, () => [])
    surfacedPrayers.forEach((s, i) => buckets[i % columnCount].push(s))
    return buckets
  }, [surfacedPrayers, columnCount])

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-nav pt-4">
      {surfacedPrayers.length === 0 || allDone ? (
        <div className="flex flex-col items-center justify-center pt-20 text-center">
          <p className="text-text-tertiary">{t.noPrayersToShow}</p>
        </div>
      ) : (
        /* Explicit flex columns rather than CSS multi-column: WebKit offsets
           the top of later columns when break-inside-avoid is in play, so the
           first card in each column wouldn't line up. */
        <div className="mx-auto flex max-w-5xl items-start gap-3">
          {columns.map((column, colIdx) => (
            <div key={colIdx} className="flex min-w-0 flex-1 flex-col gap-3">
              {column.map((s) => {
                const key = `${s.prayer.id}-${s.listId}`
                const isHidden = !!hiddenIds[key]
                return (
                  <div key={key} className={isHidden ? 'invisible' : ''}>
                    <PrayerCard
                      surfaced={s}
                      onComplete={complete}
                      onOpen={setViewing}
                      confirmed={!!confirmedIds[key]}
                      autoFlip={!!autoFlipIds[key]}
                    />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {canUndo && (
        <button
          onClick={undo}
          className="fixed left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-input text-text-secondary shadow-lg hover:bg-input-hover"
          style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
          aria-label={t.undoLastCompletion}
        >
          <Undo2 size={20} />
        </button>
      )}

      {viewing && (
        <PrayerQuickView
          surfaced={viewing}
          onClose={() => setViewing(null)}
          onConfirm={() => {
            const key = `${viewing.prayer.id}-${viewing.listId}`
            setViewing(null)
            setConfirmedIds((prev) => ({ ...prev, [key]: true }))
          }}
        />
      )}
    </div>
  )
}
