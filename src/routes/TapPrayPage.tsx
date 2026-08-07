import { useState, useEffect, useCallback, useRef } from 'react'
import { useT } from '../i18n'
import { useTimer } from '../context/TimerContext'
import { PrayerCard } from '../components/PrayerCard'
import { completePrayer, type SurfacedPrayer } from '../lib/surfacing'
import { addTimePrayed } from '../features/prayers/prayer-operations'

import { MasonryColumns } from '../components/MasonryColumns'

/** The prayer currently being timed by tapping its card. */
type ActiveTap = { key: string; prayerId: string; listId: string }

export function TapPrayPage() {
  const { t } = useT()
  const { surfacedPrayers, selectedListId, currentIndex, running, timeLeft } = useTimer()
  const [hiddenIds, setHiddenIds] = useState<Record<string, true>>({})
  const [autoFlipIds, setAutoFlipIds] = useState<Record<string, true>>({})
  const prevListRef = useRef(selectedListId)
  const prevIndexRef = useRef(currentIndex)
  const prevTimeLeftRef = useRef(timeLeft)
  const wasRunningRef = useRef(false)

  // Clear completed/hidden state when the selected list changes
  useEffect(() => {
    if (prevListRef.current !== selectedListId) {
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

  // ---- Tap to time a single prayer ------------------------------------
  const [active, setActive] = useState<ActiveTap | null>(null)
  const [elapsed, setElapsed] = useState(0)
  // Mirrors for the unmount flush, which can't read state after teardown.
  const activeRef = useRef<ActiveTap | null>(null)
  const elapsedRef = useRef(0)
  activeRef.current = active
  elapsedRef.current = elapsed

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [active])

  /** Log the running prayer's time and flip its card away. */
  const stopActive = useCallback(() => {
    const a = activeRef.current
    const secs = elapsedRef.current
    if (!a) return
    activeRef.current = null
    setActive(null)
    setElapsed(0)
    if (secs > 0) {
      // completePrayer records the session for history; addTimePrayed keeps the
      // list's own total in step. They're separate stores, so both are needed.
      completePrayer(a.prayerId, a.listId, secs)
      addTimePrayed(a.prayerId, secs)
      setAutoFlipIds((prev) => ({ ...prev, [a.key]: true }))
      setTimeout(() => setHiddenIds((prev) => ({ ...prev, [a.key]: true })), 800)
    }
  }, [])

  const handleTap = useCallback(
    (s: SurfacedPrayer) => {
      const key = `${s.prayer.id}-${s.listId}`
      // Tapping the running card stops it; tapping another hands the timer over.
      if (activeRef.current?.key === key) {
        stopActive()
        return
      }
      if (activeRef.current) stopActive()
      setActive({ key, prayerId: s.prayer.id, listId: s.listId })
      setElapsed(0)
    },
    [stopActive],
  )

  // Leaving the page shouldn't silently discard time already counted.
  useEffect(
    () => () => {
      const a = activeRef.current
      const secs = elapsedRef.current
      if (a && secs > 0) {
        completePrayer(a.prayerId, a.listId, secs)
        addTimePrayed(a.prayerId, secs)
      }
    },
    [],
  )
  // ---------------------------------------------------------------------

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-nav pt-4">
      {surfacedPrayers.length === 0 || allDone ? (
        <div className="flex flex-col items-center justify-center pt-20 text-center">
          <p className="text-text-tertiary">{t.noPrayersToShow}</p>
        </div>
      ) : (
        <div className="mx-auto max-w-5xl">
          <MasonryColumns>
            {surfacedPrayers.map((s) => {
              const key = `${s.prayer.id}-${s.listId}`
              const isHidden = !!hiddenIds[key]
              return (
                <div key={key} className={isHidden ? 'invisible' : ''}>
                  <PrayerCard
                    surfaced={s}
                    onTap={handleTap}
                    activeSeconds={active?.key === key ? elapsed : null}
                    autoFlip={!!autoFlipIds[key]}
                  />
                </div>
              )
            })}
          </MasonryColumns>
        </div>
      )}
    </div>
  )
}
