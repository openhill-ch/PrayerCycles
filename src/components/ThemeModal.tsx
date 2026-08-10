import { useState } from 'react'
import { X, Check } from 'lucide-react'
import { useT } from '../i18n'
import { themes, getSavedTheme, applyTheme, type ThemeId } from '../lib/themes'

type ThemeModalProps = {
  open: boolean
  onClose: () => void
}

export function ThemeModal({ open, onClose }: ThemeModalProps) {
  const { t } = useT()
  const [current, setCurrent] = useState<ThemeId>(getSavedTheme)

  function select(id: ThemeId) {
    applyTheme(id)
    setCurrent(id)
  }

  if (!open) return null

  const tRecord = t as unknown as Record<string, string>

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-overlay p-4">
      <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">{t.themes}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-text-tertiary hover:bg-input"
            aria-label={t.close}
          >
            <X size={20} />
          </button>
        </div>

        {/* One flat list — no country groupings, no collapsing. */}
        <div className="space-y-2">
          {themes.map((theme) => {
            const isActive = current === theme.id
            const label = tRecord[theme.labelKey] ?? theme.labelKey
            return (
              <button
                key={theme.id}
                onClick={() => select(theme.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                  isActive ? 'bg-input-hover' : 'bg-input hover:bg-input-hover'
                }`}
              >
                <div className="flex gap-1">
                  {theme.swatches.map((color, i) => (
                    <div
                      key={i}
                      className="h-6 w-6 rounded-full border border-border-light"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className="flex-1 text-left text-sm text-text">{label}</span>
                {isActive && <Check size={18} className="text-accent-text shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
