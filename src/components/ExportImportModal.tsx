import { useState, useRef } from 'react'
import { X, Download, Upload, Check, AlertCircle } from 'lucide-react'
import { useT } from '../i18n'
import { useTimer } from '../context/TimerContext'
import { exportData, importData } from '../features/backup/backup-operations'

type ExportImportModalProps = {
  open: boolean
  onClose: () => void
}

export function ExportImportModal({ open, onClose }: ExportImportModalProps) {
  const { t } = useT()
  const { refreshLists: refreshTimerLists } = useTimer()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [statusMsg, setStatusMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleClose() {
    setStatus('idle')
    setStatusMsg('')
    onClose()
  }

  async function handleExport() {
    try {
      const json = await exportData()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `prayercycles-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      localStorage.setItem('prayercycles_last_export', String(Date.now()))
      setStatus('success')
      setStatusMsg(t.backupDownloaded)
    } catch {
      setStatus('error')
      setStatusMsg(t.exportFailed)
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      await importData(text)
      setStatus('success')
      setStatusMsg(t.dataRestored)
      window.dispatchEvent(new Event('prayercycles:refresh'))
      refreshTimerLists()
    } catch {
      setStatus('error')
      setStatusMsg(t.importFailed)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-overlay p-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">{t.exportImportTitle}</h2>
          <button
            onClick={handleClose}
            className="rounded-full p-1 text-text-tertiary hover:bg-input"
            aria-label={t.close}
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-text-tertiary">
            {t.exportImportDesc}
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl bg-input-hover aspect-square text-sm font-medium text-text transition-colors hover:bg-input"
            >
              <Download size={28} />
              {t.exportBtn}
            </button>

            <label className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-border-light bg-input aspect-square text-sm font-medium text-text-secondary transition-colors hover:bg-input-hover">
              <Upload size={28} />
              {t.importBtn}
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>

          {status !== 'idle' && (
            <div
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                status === 'success'
                  ? 'bg-success-bg text-success-text'
                  : 'bg-danger-bg text-danger-text'
              }`}
            >
              {status === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
              {statusMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
