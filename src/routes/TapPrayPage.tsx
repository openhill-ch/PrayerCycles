import { useState, useEffect, useCallback, useRef } from 'react'
import { useT } from '../i18n'
import { useTimer } from '../context/TimerContext'
import { PrayerCard } from '../components/PrayerCard'
import { PrayerQuickView } from '../components/PrayerQuickView'
import { completePrayer, type SurfacedPrayer } from '../lib/surfacing'

import { MasonryColumns } from '../components/MasonryColumns'

export function TapPrayPage() {
  const { t } = useT()
  const { surfacedPrayers, selectedListId, currentIndex, running, timeLeft } = useTimer()
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

      setHiddenIds((prev) => ({ ...prev, [key]: true }))

      await completePrayer(prayerId, listId)
    },
    [surfacedPrayers],
  )

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
                    onComplete={complete}
                    onOpen={setViewing}
                    confirmed={!!confirmedIds[key]}
                    autoFlip={!!autoFlipIds[key]}
                  />
                </div>
              )
            })}
          </MasonryColumns>
        </div>
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
