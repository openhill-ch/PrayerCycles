import { useState, useEffect, useCallback, useRef } from 'react'
import { useT } from '../i18n'
import { useTimer } from '../context/TimerContext'
import { PrayerCard } from '../components/PrayerCard'
import { completePrayer, type SurfacedPrayer } from '../lib/surfacing'
import { addTimePrayed } from '../features/prayers/prayer-operations'

import { MasonryColumns } from '../components/MasonryColumns'

/** The prayer currently being timed, and the wall clock it started on. */
type ActiveTap = { key: string; prayerId: string; listId: string; startedAt: number }

/** ~30fps, enough for the hundredths to read as running without churning renders. */
const TICK_MS = 33

export function TapPrayPage() {
  const { t } = useT()
  const { surfacedPrayers, selectedListId } = useTimer()
  // Recorded during this visit, so totals and counts move without a refetch.
  const [tallyBumps, setTallyBumps] = useState<Record<string, number>>({})
  const [timeBumps, setTimeBumps] = useState<Record<string, number>>({})
  const prevListRef = useRef(selectedListId)

  const [active, setActive] = useState<ActiveTap | null>(null)
  const [now, setNow] = useState(0)
  // Mirrors for the unmount flush, which can't read state after teardown.
  const activeRef = useRef<ActiveTap | null>(null)
  activeRef.current = active

  const elapsedMs = active ? Math.max(0, now - active.startedAt) : 0

  // Switching lists starts the visit over.
  useEffect(() => {
    if (prevListRef.current !== selectedListId) {
      setTallyBumps({})
      setTimeBumps({})
      prevListRef.current = selectedListId
    }
  }, [selectedListId])

  // Driven off the clock rather than a counter, so a throttled or delayed
  // interval can't make the displayed time drift from the time recorded.
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(id)
  }, [active])

  /** Record the running prayer's time. The card stays put; its total keeps climbing. */
  const stopActive = useCallback(() => {
    const a = activeRef.current
    if (!a) return
    const secs = Math.round(Math.max(0, Date.now() - a.startedAt) / 1000)
    activeRef.current = null
    setActive(null)
    if (secs > 0) {
      // completePrayer records the session for history; addTimePrayed keeps the
      // list's own total in step. They're separate stores, so both are needed.
      completePrayer(a.prayerId, a.listId, secs)
      addTimePrayed(a.prayerId, secs)
      setTallyBumps((prev) => ({ ...prev, [a.key]: (prev[a.key] ?? 0) + 1 }))
      setTimeBumps((prev) => ({ ...prev, [a.key]: (prev[a.key] ?? 0) + secs }))
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
      setActive({ key, prayerId: s.prayer.id, listId: s.listId, startedAt: Date.now() })
    },
    [stopActive],
  )

  // Leaving the page shouldn't silently discard time already counted.
  useEffect(
    () => () => {
      const a = activeRef.current
      if (!a) return
      const secs = Math.round(Math.max(0, Date.now() - a.startedAt) / 1000)
      if (secs > 0) {
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
              const isActive = active?.key === key
              const banked = (s.prayer.totalTimePrayed ?? 0) + (timeBumps[key] ?? 0)
              return (
                <div key={key}>
                  <PrayerCard
                    surfaced={s}
                    onTap={handleTap}
                    totalMs={banked * 1000 + (isActive ? elapsedMs : 0)}
                    running={isActive}
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
