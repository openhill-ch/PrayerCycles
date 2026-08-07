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
  const { surfacedPrayers, selectedListId } = useTimer()
  // Times prayed during this visit, so the count moves without a refetch.
  const [tallyBumps, setTallyBumps] = useState<Record<string, number>>({})
  const prevListRef = useRef(selectedListId)

  const [active, setActive] = useState<ActiveTap | null>(null)
  const [elapsed, setElapsed] = useState(0)
  // Mirrors for the unmount flush, which can't read state after teardown.
  const activeRef = useRef<ActiveTap | null>(null)
  const elapsedRef = useRef(0)
  activeRef.current = active
  elapsedRef.current = elapsed

  // Switching lists starts the visit over.
  useEffect(() => {
    if (prevListRef.current !== selectedListId) {
      setTallyBumps({})
      prevListRef.current = selectedListId
    }
  }, [selectedListId])

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [active])

  /** Record the running prayer's time. The card stays put; only its count moves. */
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
      setTallyBumps((prev) => ({ ...prev, [a.key]: (prev[a.key] ?? 0) + 1 }))
    }
  }, [])

  const handleTap = useCallback(
    (s: SurfacedPrayer) => {
      const key = `${s.prayer.id}-${s.listId}`
      // Tapping the running card stops it; tapping another hands the timer over,
      // so only one prayer on this page is ever being timed.
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

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-nav pt-4">
      {surfacedPrayers.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-20 text-center">
          <p className="text-text-tertiary">{t.noPrayersToShow}</p>
        </div>
      ) : (
        <div className="mx-auto max-w-5xl">
          <MasonryColumns>
            {surfacedPrayers.map((s) => {
              const key = `${s.prayer.id}-${s.listId}`
              return (
                <div key={key}>
                  <PrayerCard
                    surfaced={s}
                    onTap={handleTap}
                    activeSeconds={active?.key === key ? elapsed : null}
                    tallyBonus={tallyBumps[key] ?? 0}
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
