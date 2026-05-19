import { X, History, Download, Trash2, Globe } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n'

type SideMenuProps = {
  open: boolean
  onClose: () => void
  onExportImport: () => void
  onLanguages: () => void
}

export function SideMenu({ open, onClose, onExportImport, onLanguages }: SideMenuProps) {
  const navigate = useNavigate()
  const { t } = useT()

  function goTo(path: string) {
    navigate(path)
    onClose()
  }

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-slate-800 shadow-xl transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100">{t.appName}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-700"
            aria-label={t.close}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="p-2 space-y-1">
          <button
            onClick={() => goTo('/history')}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <History size={18} />
            {t.prayerHistory}
          </button>
          <button
            onClick={() => { onClose(); onExportImport() }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <Download size={18} />
            {t.exportImport}
          </button>

          <button
            onClick={() => goTo('/trash')}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <Trash2 size={18} />
            {t.deletedLists}
          </button>

          <button
            onClick={() => { onClose(); onLanguages() }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <Globe size={18} />
            {t.languages}
          </button>

          <div className="my-2 border-t border-slate-700" />

          <button
            onClick={() => {/* TODO: wire up reset */}}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-red-400 hover:bg-slate-700 transition-colors"
          >
            <Trash2 size={18} />
            {t.resetPrayerData}
          </button>
        </nav>
      </div>
    </>
  )
}
