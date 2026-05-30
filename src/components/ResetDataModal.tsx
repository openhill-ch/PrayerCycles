import { useState } from 'react'
import { X, Trash2, BarChart3, History, Hash, Check, AlertTriangle } from 'lucide-react'
import { useT } from '../i18n'
import { useTimer } from '../context/TimerContext'
import { db } from '../db/db'
import { snapshotToLocalStorage } from '../features/backup/local-backup'

type ResetDataModalProps = {
  open: boolean
  onClose: () => void
}

export function ResetDataModal({ open, onClose }: ResetDataModalProps) {
  const { t } = useT()
  const { refreshLists } = useTimer()
  const [confirming, setConfirming] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'success'>('idle')
  const [statusMsg, setStatusMsg] = useState('')

  function handleClose() {
    setConfirming(null)
    setStatus('idle')
    setStatusMsg('')
    onClose()
  }

  async function handleReset(type: string) {
    if (confirming !== type) {
      setConfirming(type)
      setStatus('idle')
      return
    }

    try {
      switch (type) {
        case 'all':
          await db.transaction('rw', [db.prayerLists, db.prayers, db.prayerLogs], async () => {
            await db.prayerLists.clear()
            await db.prayers.clear()
            await db.prayerLogs.clear()
          })
          localStorage.removeItem('prayercycles-theme')
          localStorage.removeItem('prayercycles-locale')
          break

        case 'stats':
          await db.transaction('rw', [db.prayers, db.prayerLists], async () => {
            await db.prayers.toCollection().modify({
              prayerTally: 0,
              totalTimePrayed: 0,
              lastPrayedAt: null,
            })
            await db.prayerLists.toCollection().modify((list) => {
              list.completionTally = 0
              list.rotationState.tallyOffsets = {}
            })
          })
          break

        case 'history':
          await db.prayerLogs.clear()
          break

        case 'tags':
          await db.transaction('rw', [db.prayers, db.prayerLists], async () => {
            await db.prayers.toCollection().modify({ tags: [] })
            await db.prayerLists.toCollection().modify({ tags: [] })
          })
          break
      }

      snapshotToLocalStorage()
      window.dispatchEvent(new Event('prayercycles:refresh'))
      refreshLists()
      setConfirming(null)
      setStatus('success')
      setStatusMsg(t.resetSuccess)
    } catch {
      setConfirming(null)
    }
  }

  if (!open) return null

  const options = [
    { id: 'all', icon: Trash2, label: t.resetAll, desc: t.resetAllDesc, danger: true },
    { id: 'stats', icon: BarChart3, label: t.resetStats, desc: t.resetStatsDesc, danger: false },
    { id: 'history', icon: History, label: t.resetHistory, desc: t.resetHistoryDesc, danger: false },
    { id: 'tags', icon: Hash, label: t.resetTags, desc: t.resetTagsDesc, danger: false },
  ]

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-overlay sm:items-center">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-card p-6 pb-24 sm:rounded-2xl sm:pb-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">{t.resetPrayerData}</h2>
          <button
            onClick={handleClose}
            className="rounded-full p-1 text-text-tertiary hover:bg-input"
            aria-label={t.close}
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2">
          {options.map(({ id, icon: Icon, label, desc, danger }) => (
            <div key={id}>
              <button
                onClick={() => handleReset(id)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
                  confirming === id
                    ? 'bg-danger-bg'
                    : 'bg-input hover:bg-input-hover'
                }`}
              >
                <Icon size={20} className={danger ? 'text-danger-text shrink-0' : 'text-text-tertiary shrink-0'} />
                <div className="flex-1 text-left min-w-0">
                  <div className={`text-sm font-medium ${danger ? 'text-danger-text' : 'text-text'}`}>
                    {confirming === id ? t.resetConfirmTap : label}
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">{desc}</div>
                </div>
                {confirming === id && (
                  <AlertTriangle size={18} className="text-danger-text shrink-0" />
                )}
              </button>
            </div>
          ))}
        </div>

        {status === 'success' && (
          <div className="mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-success-bg text-success-text">
            <Check size={16} />
            {statusMsg}
          </div>
        )}
      </div>
    </div>
  )
}
