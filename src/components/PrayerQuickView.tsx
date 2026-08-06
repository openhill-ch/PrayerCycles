import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { useT } from '../i18n'
import type { SurfacedPrayer } from '../lib/surfacing'
import { FormattedText } from './FormattedText'

type PrayerQuickViewProps = {
  surfaced: SurfacedPrayer
  onClose: () => void
  /** Fired after the check finishes filling, so the card can flip away. */
  onConfirm: () => void
}

/**
 * Read-only look at a surfaced prayer. Tapping a prayer opens this rather than
 * completing it outright — marking it prayed is the deliberate check top-right,
 * which fills in before the card flips.
 */
export function PrayerQuickView({ surfaced, onClose, onConfirm }: PrayerQuickViewProps) {
  const { t } = useT()
  const [checked, setChecked] = useState(false)
  const { prayer, listName } = surfaced

  const startDate = new Date(prayer.createdAt)
  const tallyLabel =
    prayer.prayerTally > 0 ? t.prayedTally(prayer.prayerTally, startDate.toLocaleDateString()) : null

  function handleCheck() {
    if (checked) return
    setChecked(true)
    // Let the fill animate before handing back to the card's flip.
    setTimeout(onConfirm, 360)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-overlay p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border-2 border-accent-text/80 bg-card p-5 shadow-[0_0_14px_var(--color-accent-glow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-text-tertiary">
              {listName}
            </div>
            <h3 className="text-lg font-semibold text-text break-words">{prayer.title}</h3>
          </div>

          {/* Hollow until tapped, then fills in with the accent colour */}
          <button
            onClick={handleCheck}
            aria-label={t.markAsPrayed(prayer.title)}
            className={`shrink-0 rounded-full border-2 p-1.5 transition-all duration-300 ease-out cursor-pointer ${
              checked
                ? 'border-accent bg-accent text-white scale-110'
                : 'border-text-muted/40 bg-transparent text-text-muted/50 hover:border-text-muted/70 hover:text-text-muted'
            }`}
          >
            <Check size={18} strokeWidth={3} />
          </button>
        </div>

        {prayer.description && (
          <FormattedText
            text={prayer.description}
            className="mt-3 max-h-[45vh] overflow-y-auto text-sm text-text-secondary"
          />
        )}

        {(prayer.tags ?? []).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {(prayer.tags ?? []).map((tag) => (
              <span key={tag} className="rounded-full bg-input px-2 py-0.5 text-[10px] text-text-muted">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          {tallyLabel ? (
            <span className="text-xs text-accent-text">{tallyLabel}</span>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-text-tertiary hover:bg-input hover:text-text-secondary transition-colors cursor-pointer"
          >
            <X size={14} />
            {t.close}
          </button>
        </div>
      </div>
    </div>
  )
}
