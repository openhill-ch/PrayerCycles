import { useState } from 'react'
import { X, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { useT } from '../i18n'
import { themes, themeGroups, getSavedTheme, applyTheme, type ThemeId } from '../lib/themes'

type ThemeModalProps = {
  open: boolean
  onClose: () => void
}

export function ThemeModal({ open, onClose }: ThemeModalProps) {
  const { t } = useT()
  const [current, setCurrent] = useState<ThemeId>(getSavedTheme)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ mongolian: true, swiss: true })

  function select(id: ThemeId) {
    applyTheme(id)
    setCurrent(id)
  }

  function toggleGroup(groupId: string) {
    setCollapsed((prev) => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  if (!open) return null

  const tRecord = t as unknown as Record<string, string>

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-overlay sm:items-center">
      <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-card p-6 sm:rounded-2xl">
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

        <div className="space-y-3">
          {themeGroups.map((group) => {
            const groupThemes = themes.filter((th) => th.group === group.id)
            if (groupThemes.length === 0) return null
            const isCollapsed = !!collapsed[group.id]
            const hasLabel = !!group.labelKey

            return (
              <div key={group.id}>
                {/* Group header — only for labeled groups */}
                {hasLabel && (
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="flex w-full items-center gap-2 mb-2"
                  >
                    <span className="text-xs text-text-muted shrink-0">
                      {tRecord[group.labelKey] ?? group.labelKey}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                    {isCollapsed ? (
                      <ChevronDown size={14} className="text-text-muted shrink-0" />
                    ) : (
                      <ChevronUp size={14} className="text-text-muted shrink-0" />
                    )}
                  </button>
                )}

                {/* Theme buttons */}
                {!isCollapsed && (
                  <div className="space-y-2">
                    {groupThemes.map((theme) => {
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
                          {isActive && (
                            <Check size={18} className="text-accent-text shrink-0" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
