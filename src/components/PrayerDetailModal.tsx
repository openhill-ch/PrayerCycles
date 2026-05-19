import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { useT } from '../i18n'
import type { Prayer } from '../db/types'
import { updatePrayer, deletePrayer } from '../features/prayers/prayer-operations'

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

  const startDate = new Date(prayer.createdAt)
  const tallyLabel =
    prayer.prayerTally > 0
      ? `${prayer.prayerTally} · since ${startDate.toLocaleDateString()}`
      : null

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

  async function handleDelete() {
    await deletePrayer(prayer.id)
    onUpdated()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-slate-800 p-6 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">{t.prayer}</h2>
          <button
            onClick={() => { handleSave() }}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-700"
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
            className="w-full rounded-lg bg-slate-700 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-slate-500 text-lg font-semibold"
          />

          <textarea
            placeholder={t.addDescription}
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
            maxLength={2000}
            rows={4}
            className="w-full rounded-lg bg-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-slate-500 resize-none"
          />
          <div className="text-right text-xs text-slate-500 -mt-3">{description.length}/2000</div>

          {tallyLabel && (
            <div className="text-xs text-slate-500">{tallyLabel}</div>
          )}

          <div className="flex items-center justify-between pt-2">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300"
              >
                <Trash2 size={14} />
                {t.delete}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-400">{t.deletePrayerConfirm}</span>
                <button
                  onClick={handleDelete}
                  className="rounded-lg bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-500"
                >
                  {t.yes}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg bg-slate-700 px-3 py-1 text-sm text-slate-300 hover:bg-slate-600"
                >
                  {t.no}
                </button>
              </div>
            )}

            <button
              onClick={handleSave}
              className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-500"
            >
              {t.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
