import { useState } from 'react'
import { X, History, Download, Trash2, Globe, Code, Palette } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n'
import { isDevMode, setDevMode } from '../lib/devmode'

type SideMenuProps = {
  open: boolean
  onClose: () => void
  onExportImport: () => void
  onLanguages: () => void
  onThemes: () => void
  onResetData: () => void
}

export function SideMenu({ open, onClose, onExportImport, onLanguages, onThemes, onResetData }: SideMenuProps) {
  const navigate = useNavigate()
  const { t } = useT()
  const [devOn, setDevOn] = useState(isDevMode)

  function goTo(path: string) {
    navigate(path)
    onClose()
  }

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-overlay"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-card shadow-xl transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text">{t.appName}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-text-tertiary hover:bg-input"
            aria-label={t.close}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="p-2 space-y-1">
          <button
            onClick={() => goTo('/history')}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-text-secondary hover:bg-input transition-colors"
          >
            <History size={18} />
            {t.prayerHistory}
          </button>
          <button
            onClick={() => onExportImport()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-text-secondary hover:bg-input transition-colors"
          >
            <Download size={18} />
            {t.exportImport}
          </button>

          <button
            onClick={() => goTo('/trash')}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-text-secondary hover:bg-input transition-colors"
          >
            <Trash2 size={18} />
            {t.deletedLists}
          </button>

          <button
            onClick={() => onLanguages()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-text-secondary hover:bg-input transition-colors"
          >
            <Globe size={18} />
            {t.languages}
          </button>

          <button
            onClick={() => onThemes()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-text-secondary hover:bg-input transition-colors"
          >
            <Palette size={18} />
            {t.themes}
          </button>

          <div className="my-2 border-t border-border" />

          <button
            onClick={() => { const next = !devOn; setDevOn(next); setDevMode(next) }}
            className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-sm text-text-secondary hover:bg-input transition-colors"
          >
            <div className="flex items-center gap-3">
              <Code size={18} />
              {t.devMode}
            </div>
            <div className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${devOn ? 'bg-toggle' : 'bg-input-hover'}`}>
              <div className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition-transform duration-200 ${devOn ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
            </div>
          </button>

          <button
            onClick={() => onResetData()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-danger-text hover:bg-input transition-colors"
          >
            <Trash2 size={18} />
            {t.resetPrayerData}
          </button>
        </nav>
      </div>
    </>
  )
}
