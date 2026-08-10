import { useState, useEffect, useCallback, useRef } from 'react'
import { Hash, Trash2, Plus, Circle, CheckCircle2 } from 'lucide-react'
import { useT } from '../i18n'
import { getAllTags, getTagCounts, renameTag, deleteTag, createStandaloneTag } from '../features/tags/tag-operations'

type TagEntry = {
  name: string
  listCount: number
  prayerCount: number
}

/**
 * Last load, kept outside the component. Committing a page swipe unmounts the
 * copy that slid in and mounts a fresh one, so without this the tags page
 * flashed its "no tags yet" state at the moment it arrived.
 */
let lastTags: TagEntry[] | null = null

export function TagsPage() {
  const { t } = useT()
  const [tags, setTags] = useState<TagEntry[]>(() => lastTags ?? [])
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [confirmDeleteTag, setConfirmDeleteTag] = useState<string | null>(null)
  const [newTagName, setNewTagName] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const editRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const [allTags, counts] = await Promise.all([getAllTags(), getTagCounts()])
    const next = allTags.map((name) => {
      const c = counts.get(name) ?? { lists: 0, prayers: 0 }
      return { name, listCount: c.lists, prayerCount: c.prayers }
    })
    lastTags = next
    setTags(next)
  }, [])

  useEffect(() => {
    load()
    window.addEventListener('prayercycles:refresh', load)
    return () => window.removeEventListener('prayercycles:refresh', load)
  }, [load])

  function handleCreateTag(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newTagName.trim()
    if (!trimmed) return
    const created = createStandaloneTag(trimmed)
    if (created) {
      setNewTagName('')
      load()
    }
  }

  function startEditing(tagName: string) {
    setEditingTag(tagName)
    setEditValue(tagName)
  }

  async function commitRename(oldName: string) {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== oldName) {
      await renameTag(oldName, trimmed)
      window.dispatchEvent(new Event('prayercycles:refresh'))
    }
    setEditingTag(null)
    setEditValue('')
    load()
  }

  function handleEditChange(e: React.ChangeEvent<HTMLInputElement>, oldName: string) {
    const val = e.target.value
    if (val.endsWith('  ')) {
      const trimmed = val.trimEnd()
      if (trimmed) {
        setEditValue(trimmed)
        setTimeout(() => commitRename(oldName), 0)
        return
      }
    }
    setEditValue(val)
  }

  function handleEditKeyDown(e: React.KeyboardEvent, oldName: string) {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      commitRename(oldName)
    }
    if (e.key === 'Escape') {
      setEditingTag(null)
      setEditValue('')
    }
  }

  function handleEditBlur(oldName: string) {
    commitRename(oldName)
  }

  async function handleDelete(tagName: string) {
    await deleteTag(tagName)
    setConfirmDeleteTag(null)
    window.dispatchEvent(new Event('prayercycles:refresh'))
    load()
  }

  function toggleSelect(tagName: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(tagName)) next.delete(tagName)
      else next.add(tagName)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === tags.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(tags.map((t) => t.name)))
    }
  }

  async function handleBulkDelete() {
    for (const tagName of selected) {
      await deleteTag(tagName)
    }
    setSelected(new Set())
    setConfirmBulkDelete(false)
    window.dispatchEvent(new Event('prayercycles:refresh'))
    load()
  }

  const allSelected = tags.length > 0 && selected.size === tags.length
  const someSelected = selected.size > 0

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-nav pt-4">
      <div className="mx-auto max-w-lg">
        <h2 className="text-xl font-semibold text-text mb-1">{t.prayerTags}</h2>
        <p className="text-xs text-text-muted mb-4">{t.prayerTagsDesc}</p>

        {/* Select all + Create/Search bar */}
        <div className="mb-4 flex items-center gap-2">
          {/* Select all circle — always visible */}
          {tags.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAll}
              className="shrink-0 text-text-muted hover:text-text-secondary transition-colors"
            >
              {allSelected ? (
                <CheckCircle2 size={20} className="text-accent" />
              ) : (
                <Circle size={20} />
              )}
            </button>
          )}

          {/* Input area — overlaid by bulk delete bar when selecting */}
          <div className="relative min-w-0 flex-1">
            <form onSubmit={handleCreateTag} className={`flex items-center gap-2 ${someSelected ? 'invisible' : ''}`}>
              {/* min-w-0 lets the field shrink instead of shoving the button
                  past the right edge on narrow screens */}
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-card border border-border px-3 py-2">
                <Hash size={16} className="text-text-muted shrink-0" />
                <input
                  type="text"
                  placeholder={t.newTagPlaceholder}
                  value={newTagName}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val.endsWith('  ')) {
                      const trimmed = val.trimEnd()
                      if (trimmed) {
                        const created = createStandaloneTag(trimmed)
                        if (created) load()
                        setNewTagName('')
                        return
                      }
                    }
                    setNewTagName(val)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab') {
                      e.preventDefault()
                      const trimmed = newTagName.trim()
                      if (trimmed) {
                        const created = createStandaloneTag(trimmed)
                        if (created) load()
                        setNewTagName('')
                      }
                    }
                  }}
                  className="flex-1 bg-transparent text-sm text-text placeholder-text-muted outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!newTagName.trim()}
                className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg bg-input px-3 py-2 text-sm text-text-secondary hover:bg-input-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Plus size={16} />
                {t.createTag}
              </button>
            </form>

            {someSelected && (
              <div className="absolute inset-0 flex items-center justify-between rounded-lg bg-card border border-danger-text/30 px-4">
                <span className="text-xs text-text-secondary">{selected.size} selected</span>
                {confirmBulkDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-danger-text">{t.deleteConfirm}</span>
                    <button
                      onClick={handleBulkDelete}
                      className="rounded bg-danger px-2 py-0.5 text-xs text-white hover:bg-danger-hover"
                    >
                      {t.yes}
                    </button>
                    <button
                      onClick={() => setConfirmBulkDelete(false)}
                      className="rounded bg-input px-2 py-0.5 text-xs text-text-secondary hover:bg-input-hover"
                    >
                      {t.no}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmBulkDelete(true)}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-danger-text hover:bg-input transition-colors"
                  >
                    <Trash2 size={14} />
                    {t.delete}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {tags.length === 0 ? (
          <p className="text-sm text-text-muted italic pt-4">{t.noTagsYet}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {tags.filter((tag) => !newTagName.trim() || tag.name.toLowerCase().includes(newTagName.trim().toLowerCase())).map((tag) => (
              <div
                key={tag.name}
                className="flex items-center gap-3 rounded-lg bg-card px-4 py-3"
              >
                {/* Selection circle */}
                <button
                  onClick={() => toggleSelect(tag.name)}
                  className="shrink-0 text-text-muted hover:text-text-secondary transition-colors"
                >
                  {selected.has(tag.name) ? (
                    <CheckCircle2 size={18} className="text-accent" />
                  ) : (
                    <Circle size={18} />
                  )}
                </button>

                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {editingTag === tag.name ? (
                    <div className="flex items-center gap-1 rounded-full bg-input px-2.5 py-1">
                      <Hash size={12} className="text-text-tertiary shrink-0" />
                      <input
                        ref={editRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => handleEditChange(e, tag.name)}
                        onKeyDown={(e) => handleEditKeyDown(e, tag.name)}
                        onBlur={() => handleEditBlur(tag.name)}
                        className="bg-transparent text-xs font-medium text-text outline-none w-24"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <span
                      onClick={() => startEditing(tag.name)}
                      className="inline-flex items-center gap-1 rounded-full bg-input px-2.5 py-1 text-xs text-text-secondary cursor-text hover:bg-input-hover"
                    >
                      <Hash size={12} className="shrink-0" />
                      {tag.name}
                    </span>
                  )}
                  <span className="text-xs text-text-muted shrink-0">({tag.prayerCount})</span>
                </div>

                <div className="flex items-center gap-1 ml-3">
                  {confirmDeleteTag === tag.name ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-danger-text">{t.deleteConfirm}</span>
                      <button
                        onClick={() => handleDelete(tag.name)}
                        className="rounded bg-danger px-2 py-0.5 text-xs text-white hover:bg-danger-hover"
                      >
                        {t.yes}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteTag(null)}
                        className="rounded bg-input px-2 py-0.5 text-xs text-text-secondary hover:bg-input-hover"
                      >
                        {t.no}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteTag(tag.name)}
                      className="rounded p-1.5 text-text-tertiary hover:bg-input hover:text-danger-text"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
