import { useState, useEffect, useRef } from 'react'
import { useT } from '../i18n'
import type { SurfacedPrayer } from '../lib/surfacing'
import { FormattedText } from './FormattedText'

type PrayerCardProps = {
  surfaced: SurfacedPrayer
  onComplete: (prayerId: string, listId: string) => void
  /** Tapping opens a read-only view; completing is confirmed from there. */
  onOpen: (surfaced: SurfacedPrayer) => void
  /** Set once the quick view's check is tapped — flips the card and completes. */
  confirmed?: boolean
  autoFlip?: boolean
}

export function PrayerCard({ surfaced, onComplete, onOpen, confirmed, autoFlip }: PrayerCardProps) {
  const { t } = useT()
  const [flipping, setFlipping] = useState(false)
  const [fading, setFading] = useState(false)
  const hasAutoFlipped = useRef(false)
  const { prayer, listName } = surfaced

  const startDate = new Date(prayer.createdAt)
  const tallyLabel =
    prayer.prayerTally > 0
      ? t.prayedTally(prayer.prayerTally, startDate.toLocaleDateString())
      : null

  // Auto-flip when timer completes this prayer (visual only — counting handled by TimerContext)
  useEffect(() => {
    if (autoFlip && !hasAutoFlipped.current && !flipping) {
      hasAutoFlipped.current = true
      setFlipping(true)
      setTimeout(() => setFading(true), 400)
    }
  }, [autoFlip, flipping])

  /** Run the flip-and-fade, then report the completion. */
  function completeWithFlip() {
    if (flipping) return
    setFlipping(true)
    setTimeout(() => setFading(true), 400)
    setTimeout(() => {
      onComplete(prayer.id, surfaced.listId)
    }, 700)
  }

  const hasConfirmed = useRef(false)
  useEffect(() => {
    if (confirmed && !hasConfirmed.current) {
      hasConfirmed.current = true
      completeWithFlip()
    }
  }, [confirmed])

  function handleClick() {
    if (flipping) return
    onOpen(surfaced)
  }

  return (
    <div
      className={`perspective-[600px] cursor-pointer break-inside-avoid transition-opacity duration-300 ${fading ? 'opacity-0' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={prayer.title}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
    >
      <div
        className={`relative transition-all duration-500 transform-3d ${flipping ? 'rotate-y-180' : ''}`}
      >
        {/* Front */}
        <div className="rounded-lg bg-card p-4 shadow-md backface-hidden border-2 border-accent-text/80 shadow-[0_0_14px_var(--color-accent-glow)] overflow-hidden break-words">
          <div className="mb-1 text-xs font-medium text-text-tertiary uppercase tracking-wide">
            {listName}
          </div>
          <h3 className="text-lg font-semibold text-text">{prayer.title}</h3>
          {prayer.description && (
            <FormattedText text={prayer.description} className="mt-1 text-sm text-text-secondary" />
          )}
          {tallyLabel && (
            <div className="mt-3 text-xs text-accent-text">{tallyLabel}</div>
          )}
        </div>
        {/* Back — blank solid */}
        <div className="absolute inset-0 rounded-lg bg-card shadow-md backface-hidden rotate-y-180" />
      </div>
    </div>
  )
}
