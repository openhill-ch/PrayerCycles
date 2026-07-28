import { useState, useEffect, useRef } from 'react'
import { X, Trash2, Check, Undo2 } from 'lucide-react'
import { useT } from '../i18n'
import { db } from '../db/db'
import type { Prayer } from '../db/types'
import { updatePrayer, deletePrayer, fulfillPrayer, unfulfillPrayer } from '../features/prayers/prayer-operations'
import { DescriptionToolbar, useDescriptionKeyDown } from './DescriptionToolbar'

type PrayerDetailModalProps = {
  prayer: Prayer
  onClose: () => void
  onUpdated: () => void
}

export function PrayerDetailModal({ prayer, onClose, onUpdated }: PrayerDetailModalProps) {
  const { t } = useT()
  const [title, setTitle] = useState(prayer.title)
  const [description, setDescription] = useState(prayer.description)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const descRef = useRef<HTMLTextAreaElement>(null)
  const handleDescKeyDown = useDescriptionKeyDown(descRef, description, setDescription, 2000)

  const [todayCount, setTodayCount] = useState(0)
  const [todayDuration, setTodayDuration] = useState(0)

  useEffect(() => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayMs = todayStart.getTime()

    db.prayerLogs
      .where('prayerId')
      .equals(prayer.id)
      .toArray()
      .then((logs) => {
        const todayLogs = logs.filter((log) => {
          const startTime = log.prayedAt - (log.duration ?? 0) * 1000
          return startTime >= todayMs
        })
        setTodayCount(todayLogs.length)
        setTodayDuration(todayLogs.reduce((sum, log) => sum + (log.duration ?? 0), 0))
      })
  }, [prayer.id])

  const startDate = new Date(prayer.createdAt)
  const tallyLabel =
    prayer.prayerTally > 0
      ? `${prayer.prayerTally} · since ${startDate.toLocaleDateString()}`
      : null
  const totalSeconds = prayer.totalTimePrayed ?? 0
  const timeLabel = totalSeconds > 0 ? t.formatTimePrayed(totalSeconds) : null

  async function handleSave() {
    const changes: Partial<Prayer> = {}
    if (title.trim() && title.trim() !== prayer.title) changes.title = title.trim()
    if (description.trim() !== prayer.description) changes.description = description.trim()
    if (Object.keys(changes).length > 0) {
      await updatePrayer(prayer.id, changes)
    }
    onUpdated()
    onClose()
  }

  async function handleFulfill() {
    if (prayer.fulfilled) {
      await unfulfillPrayer(prayer.id)
    } else {
      await fulfillPrayer(prayer.id)
    }
    onUpdated()
    onClose()
  }

  async function handleDelete() {
    await deletePrayer(prayer.id)
    onUpdated()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay sm:items-center">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-card p-6 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">{t.prayer}</h2>
          <button
            onClick={() => { handleSave() }}
            className="rounded-full p-1 text-text-tertiary hover:bg-input"
            aria-label={t.close}
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg bg-input px-3 py-2 text-text outline-none focus:ring-2 focus:ring-text-muted text-lg font-semibold"
          />

          <div>
            <div className="flex items-center justify-between mb-1">
              <DescriptionToolbar
                textareaRef={descRef}
                value={description}
                onChange={setDescription}
                maxLength={2000}
              />
              <span className="text-xs text-text-muted">{description.length}/2000</span>
            </div>
            <textarea
              ref={descRef}
              placeholder={t.addDescription}
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
              onKeyDown={handleDescKeyDown}
              maxLength={2000}
              rows={4}
              className="w-full rounded-lg bg-input px-3 py-2 text-text placeholder-text-tertiary outline-none focus:ring-2 focus:ring-text-muted resize-none"
            />
          </div>

          {(tallyLabel || timeLabel || todayCount > 0) && (
            <div className="space-y-1">
              {tallyLabel && <div className="text-xs text-text-muted">{tallyLabel}</div>}
              {timeLabel && <div className="text-xs text-text-muted">{t.totalTimePrayed}: {timeLabel}</div>}
              {todayCount > 0 && (
                <div className="flex gap-4 pt-1">
                  <div className="text-xs text-text-muted">{t.timesPrayedToday}: <span className="text-accent-text">{todayCount}</span></div>
                  {todayDuration > 0 && (
                    <div className="text-xs text-text-muted">{t.timePrayedToday}: <span className="text-accent-text">{t.formatDuration(todayDuration)}</span></div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Fulfill / Unfulfill */}
          <button
            onClick={handleFulfill}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
              prayer.fulfilled
                ? 'bg-input text-text-secondary hover:bg-input-hover'
                : 'bg-accent/15 text-accent-text hover:bg-accent/25'
            }`}
          >
            {prayer.fulfilled ? <Undo2 size={14} /> : <Check size={14} />}
            {prayer.fulfilled ? t.unfulfill : t.markAsFulfilled}
          </button>

          <div className="flex items-center justify-between pt-2">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1 text-sm text-danger-text hover:text-danger-hover"
              >
                <Trash2 size={14} />
                {t.delete}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-danger-text">{t.deletePrayerConfirm}</span>
                <button
                  onClick={handleDelete}
                  className="rounded-lg bg-danger px-3 py-1 text-sm text-white hover:bg-danger-hover"
                >
                  {t.yes}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg bg-input px-3 py-1 text-sm text-text-secondary hover:bg-input-hover"
                >
                  {t.no}
                </button>
              </div>
            )}

            <button
              onClick={handleSave}
              className="rounded-lg bg-input-hover px-4 py-2 text-sm font-medium text-text hover:bg-input"
            >
              {t.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
