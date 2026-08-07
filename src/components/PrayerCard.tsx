import { useT } from '../i18n'
import type { SurfacedPrayer } from '../lib/surfacing'
import { FormattedText } from './FormattedText'

type PrayerCardProps = {
  surfaced: SurfacedPrayer
  /** Tapping starts this prayer's timer, or stops it if it's already running. */
  onTap: (surfaced: SurfacedPrayer) => void
  /** Seconds counted so far, or null when this card isn't the one being timed. */
  activeSeconds?: number | null
  /** Times prayed this session — the surfaced data won't know about them yet. */
  tallyBonus?: number
}

/** m:ss, growing to h:mm:ss only once it needs to. */
function formatElapsed(total: number): string {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

export function PrayerCard({ surfaced, onTap, activeSeconds, tallyBonus = 0 }: PrayerCardProps) {
  const { t } = useT()
  const { prayer, listName } = surfaced

  const isTiming = activeSeconds != null
  const tally = prayer.prayerTally + tallyBonus
  const startDate = new Date(prayer.createdAt)
  // Kept as the accessible/long-form description behind the compact count.
  const tallyLabel = tally > 0 ? t.prayedTally(tally, startDate.toLocaleDateString()) : undefined

  return (
    <div
      className="cursor-pointer break-inside-avoid"
      onClick={() => onTap(surfaced)}
      role="button"
      tabIndex={0}
      aria-label={prayer.title}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onTap(surfaced)
        }
      }}
    >
      <div className="overflow-hidden break-words rounded-lg border-2 border-accent-text/80 bg-card p-4 shadow-md shadow-[0_0_14px_var(--color-accent-glow)]">
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-text-tertiary">
          {listName}
        </div>
        <h3 className="text-lg font-semibold text-text">{prayer.title}</h3>
        {prayer.description && (
          <FormattedText text={prayer.description} className="mt-1 text-sm text-text-secondary" />
        )}

        {/* Quiet footer: elapsed on the left while praying, times prayed on the right. */}
        {(isTiming || tally > 0) && (
          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-text-tertiary">
            <span className="tabular-nums">{isTiming ? formatElapsed(activeSeconds ?? 0) : ''}</span>
            {tally > 0 && (
              <span className="tabular-nums" title={tallyLabel} aria-label={tallyLabel}>
                &times;{tally}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
