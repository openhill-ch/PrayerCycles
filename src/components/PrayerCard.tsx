import { useT } from '../i18n'
import type { SurfacedPrayer } from '../lib/surfacing'
import { FormattedText } from './FormattedText'

type PrayerCardProps = {
  surfaced: SurfacedPrayer
  /** Tapping starts this prayer's timer, or stops it if it's already running. */
  onTap: (surfaced: SurfacedPrayer) => void
  /** Everything prayed for this one, including any run in progress. */
  totalMs: number
  /** True while this card is the one being timed. */
  running?: boolean
  /** Times prayed this session — the surfaced data won't know about them yet. */
  tallyBonus?: number
}

/** m:ss.hh, growing to h:mm:ss.hh only once it needs to. */
function formatElapsed(totalMs: number): string {
  const total = Math.floor(totalMs / 10) // hundredths
  const hundredths = total % 100
  const secs = Math.floor(total / 100)
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  const base = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
  return `${base}.${pad(hundredths)}`
}

export function PrayerCard({ surfaced, onTap, totalMs, running, tallyBonus = 0 }: PrayerCardProps) {
  const { t } = useT()
  const { prayer, listName } = surfaced

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

        {/* Total time on the left, always shown; times prayed on the right. */}
        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          <span
            className={`tabular-nums transition-colors ${
              running ? 'text-accent-text' : 'text-text-tertiary'
            }`}
          >
            {formatElapsed(totalMs)}
          </span>
          {tally > 0 && (
            <span className="tabular-nums text-text-tertiary" title={tallyLabel} aria-label={tallyLabel}>
              {tally}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
