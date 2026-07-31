import { useState, useEffect, useRef } from 'react'
import { X, ChevronRight } from 'lucide-react'
import { useT } from '../i18n'
import { useTimer } from '../context/TimerContext'
import { TagInput } from './TagInput'
import { DescriptionToolbar, useDescriptionKeyDown } from './DescriptionToolbar'
import type { PrayerList, Cadence, PersistenceUnit } from '../db/types'
import { createList, getAllLists, UNSCHEDULED_ID } from '../features/cycles/list-operations'
import { createPrayer } from '../features/prayers/prayer-operations'
import { getAllTags } from '../features/tags/tag-operations'

type AddModalProps = {
  open: boolean
  onClose: () => void
  onAdded: () => void
}

type Mode = 'create-list' | 'add-single'

/** Subtle disclosure row that expands the advanced fields. */
function MoreToggle({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-1.5 py-1 text-sm text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
    >
      <ChevronRight
        size={16}
        className={`transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
      />
      {label}
    </button>
  )
}

export function AddModal({ open, onClose, onAdded }: AddModalProps) {
  const { t } = useT()
  const { refreshLists: refreshTimerLists } = useTimer()
  const [mode, setMode] = useState<Mode>('create-list')
  const [lists, setLists] = useState<PrayerList[]>([])
  const [existingTags, setExistingTags] = useState<string[]>([])

  // Create list fields
  const [listName, setListName] = useState('')
  const [listDescription, setListDescription] = useState('')
  const [cadence, setCadence] = useState<Cadence>('daily')
  const [persistenceUnit, setPersistenceUnit] = useState<PersistenceUnit>('wake')
  const [persistenceEvery, setPersistenceEvery] = useState(1)
  const [lifecycleType, setLifecycleType] = useState<'indefinite' | 'finite'>('indefinite')
  const [retireAfter, setRetireAfter] = useState(1)
  const [initialPrayers, setInitialPrayers] = useState('')
  const [listTags, setListTags] = useState<string[]>([])
  const [showListMore, setShowListMore] = useState(false)

  // Add prayer fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedListId, setSelectedListId] = useState('')
  const addDescRef = useRef<HTMLTextAreaElement>(null)
  const handleDescKeyDown = useDescriptionKeyDown(addDescRef, description, setDescription, 2000)
  const [prayerTags, setPrayerTags] = useState<string[]>([])
  const [showPrayerMore, setShowPrayerMore] = useState(false)

  // Surfaces save failures (e.g. iOS Private Browsing blocking IndexedDB
  // writes) instead of letting the handler die silently.
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      getAllLists().then(setLists)
      getAllTags().then(setExistingTags)
      setMode('create-list')
    }
  }, [open])

  function reset() {
    setListName('')
    setListDescription('')
    setCadence('daily')
    setPersistenceUnit('wake')
    setPersistenceEvery(1)
    setLifecycleType('indefinite')
    setRetireAfter(1)
    setInitialPrayers('')
    setListTags([])
    setShowListMore(false)
    setTitle('')
    setDescription('')
    setSelectedListId('')
    setPrayerTags([])
    setShowPrayerMore(false)
    setMode('create-list')
    setSaveError(null)
    setSaving(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleCreateList(e: React.FormEvent) {
    e.preventDefault()
    if (!listName.trim()) return
    setSaveError(null)
    setSaving(true)
    try {
      const titles = initialPrayers.split('\n').filter((t) => t.trim())
      await createList(
        listName.trim(),
        { cadence, persistence: { unit: persistenceUnit, every: persistenceEvery }, lifecycle: { type: lifecycleType, ...(lifecycleType === 'finite' ? { retireAfter } : {}) } },
        listDescription.trim(),
        titles,
        listTags,
      )
      refreshTimerLists()
      reset()
      onAdded()
      onClose()
    } catch (err) {
      setSaving(false)
      setSaveError(err instanceof Error ? `${err.name}: ${err.message}` : String(err))
    }
  }

  async function handleAddPrayer(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaveError(null)
    setSaving(true)
    try {
      const listId = selectedListId || UNSCHEDULED_ID
      await createPrayer(title.trim(), [listId], description.trim(), prayerTags)
      reset()
      onAdded()
      onClose()
    } catch (err) {
      setSaving(false)
      setSaveError(err instanceof Error ? `${err.name}: ${err.message}` : String(err))
    }
  }

  const allUnits: [PersistenceUnit, string, string][] = [
    ['wake', t.wake, t.wakeTooltip],
    ['passage', t.passage, t.passageTooltip],
    ['season', t.season, t.seasonTooltip],
    ['orbit', t.orbit, t.orbitTooltip],
  ]

  function allowedUnits(c: Cadence): PersistenceUnit[] {
    if (c === 'daily') return ['wake']
    if (c === 'weekly') return ['wake', 'passage']
    if (c === 'monthly') return ['wake', 'passage', 'season']
    return ['wake', 'passage', 'season', 'orbit']
  }

  const visibleUnits = allUnits.filter(([unit]) => allowedUnits(cadence).includes(unit))

  // Filter out Unscheduled from dropdown display (it's auto-used when no list selected)
  const selectableLists = lists.filter((l) => l.status !== 'deleted' && l.id !== UNSCHEDULED_ID)

  if (!open) return null

  // Shared classes: the fields area scrolls, the submit footer stays pinned so
  // expanding "More options" can never push the button off-screen.
  const scrollAreaClass = 'min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4'
  const footerClass = 'shrink-0 space-y-3 border-t border-border bg-card px-6 pt-3'
  const footerStyle = { paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }
  const submitClass =
    'w-full rounded-lg bg-input-hover py-2.5 text-sm font-medium text-text transition-colors hover:bg-input cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay sm:items-center">
      {/* dvh keeps the panel inside the *visible* viewport on mobile (browser
          chrome / keyboard); the vh class is the fallback for older browsers. */}
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-card sm:rounded-2xl"
        style={{ maxHeight: '85dvh' }}
      >
        {/* Pinned header */}
        <div className="shrink-0 px-6 pt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">
              {mode === 'create-list' ? t.newPrayerList : t.newPrayer}
            </h2>
            <button
              onClick={handleClose}
              className="rounded-full p-1 text-text-tertiary hover:bg-input"
              aria-label={t.close}
            >
              <X size={20} />
            </button>
          </div>

          {/* Mode switcher */}
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setMode('create-list')}
              className={`rounded px-3 py-1 text-sm ${mode === 'create-list' ? 'bg-input-hover text-text' : 'bg-input text-text-tertiary'}`}
            >
              {t.newPrayerList}
            </button>
            <button
              type="button"
              onClick={() => setMode('add-single')}
              className={`rounded px-3 py-1 text-sm ${mode === 'add-single' ? 'bg-input-hover text-text' : 'bg-input text-text-tertiary'}`}
            >
              {t.newPrayer}
            </button>
          </div>
        </div>

        {/* Create List form — essentials: name, rhythm, people. */}
        {mode === 'create-list' && (
          <form onSubmit={handleCreateList} className="flex min-h-0 flex-1 flex-col">
            <div className={scrollAreaClass}>
              <input
                type="text"
                placeholder={t.listNameExample}
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                className="w-full rounded-lg bg-input px-3 py-2 text-text placeholder-text-tertiary outline-none focus:ring-2 focus:ring-text-muted"
                autoFocus
              />

              <div>
                <div className="mb-2 text-sm text-text-tertiary">{t.cycle}</div>
                <div className="flex flex-wrap gap-2">
                  {(['daily', 'weekly', 'monthly', 'annually'] as Cadence[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setCadence(c)
                        if (c === 'daily') { setPersistenceUnit('wake'); setPersistenceEvery(1) }
                        else {
                          const allowed = allowedUnits(c)
                          if (!allowed.includes(persistenceUnit)) setPersistenceUnit(allowed[0])
                        }
                      }}
                      className={`rounded px-3 py-1 text-sm capitalize ${cadence === c ? 'bg-input-hover text-text' : 'bg-input text-text-tertiary'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm text-text-tertiary">{t.prayersOnePerLine}</div>
                <textarea
                  placeholder={t.prayersPlaceholder}
                  value={initialPrayers}
                  onChange={(e) => setInitialPrayers(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg bg-input px-3 py-2 text-text placeholder-text-tertiary outline-none focus:ring-2 focus:ring-text-muted resize-none"
                />
              </div>

              <MoreToggle label={t.moreOptions} open={showListMore} onToggle={() => setShowListMore(!showListMore)} />

              {showListMore && (
                <div className="space-y-4 rounded-lg border border-border p-3">
                  <div>
                    <textarea
                      placeholder={t.descriptionOptional}
                      value={listDescription}
                      onChange={(e) => setListDescription(e.target.value.slice(0, 500))}
                      rows={2}
                      maxLength={500}
                      className="w-full rounded-lg bg-input px-3 py-2 text-text placeholder-text-tertiary outline-none focus:ring-2 focus:ring-text-muted resize-none"
                    />
                    <div className="text-right text-xs text-text-muted mt-1">{listDescription.length}/500</div>
                  </div>

                  <div>
                    <div className="mb-2 text-sm text-text-tertiary">{t.tags}</div>
                    <TagInput tags={listTags} onChange={setListTags} placeholder={t.tagsPlaceholder} allTags={existingTags} />
                  </div>

                  <div>
                    <div className="mb-2 text-sm text-text-tertiary">{t.frequency}</div>
                    <div className="flex flex-wrap gap-2">
                      {visibleUnits.map(([unit, label, tooltip]) => (
                        <button
                          key={unit}
                          type="button"
                          title={tooltip}
                          onClick={() => { if (cadence !== 'daily') setPersistenceUnit(unit) }}
                          className={`rounded px-3 py-1 text-sm ${persistenceUnit === unit ? 'bg-input-hover text-text' : 'bg-input text-text-tertiary'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-2 h-8">
                      <span className="text-sm text-text-tertiary">{t.every}</span>
                      {cadence === 'daily' ? (
                        <span className="w-16 text-sm text-text text-center">1</span>
                      ) : (
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={persistenceEvery}
                          onChange={(e) => setPersistenceEvery(Math.max(1, Math.min(99, Number(e.target.value))))}
                          className="w-16 rounded bg-input px-2 py-1 text-sm text-text text-center outline-none focus:ring-2 focus:ring-text-muted"
                        />
                      )}
                      <span className="text-sm text-text-tertiary">
                        {persistenceUnit === 'wake' ? (persistenceEvery === 1 ? t.day : t.days)
                          : persistenceUnit === 'passage' ? (persistenceEvery === 1 ? t.week : t.weeks)
                          : persistenceUnit === 'season' ? (persistenceEvery === 1 ? t.month : t.months)
                          : (persistenceEvery === 1 ? t.year : t.years)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-sm text-text-tertiary">{t.lifecycle}</div>
                    <div className="flex gap-2">
                      {(['indefinite', 'finite'] as const).map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => setLifecycleType(l)}
                          className={`rounded px-3 py-1 text-sm capitalize ${lifecycleType === l ? 'bg-input-hover text-text' : 'bg-input text-text-tertiary'}`}
                        >
                          {l === 'indefinite' ? t.indefinite : t.finite}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-2 h-8">
                      <span className="text-sm text-text-tertiary">{t.retiresAfter}</span>
                      {lifecycleType === 'indefinite' ? (
                        <span className="w-16 text-sm text-text text-center">∞</span>
                      ) : (
                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={retireAfter}
                          onChange={(e) => setRetireAfter(Math.max(1, Math.min(999, Number(e.target.value))))}
                          className="w-16 rounded bg-input px-2 py-1 text-sm text-text text-center outline-none focus:ring-2 focus:ring-text-muted"
                        />
                      )}
                      <span className="text-sm text-text-tertiary">{lifecycleType === 'indefinite' ? t.completions : (retireAfter === 1 ? t.completion : t.completions)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={footerClass} style={footerStyle}>
              {saveError && (
                <div className="rounded-lg bg-red-500/15 border border-red-500/40 px-3 py-2 text-xs text-red-300 break-words">
                  Couldn't save: {saveError}
                </div>
              )}
              <button type="submit" disabled={!listName.trim() || saving} className={submitClass}>
                {saving ? '…' : t.createList}
              </button>
            </div>
          </form>
        )}

        {/* Add single prayer form — essentials: who, which list. */}
        {mode === 'add-single' && (
          <form onSubmit={handleAddPrayer} className="flex min-h-0 flex-1 flex-col">
            <div className={scrollAreaClass}>
              <input
                type="text"
                placeholder={t.whoToPray}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg bg-input px-3 py-2 text-text placeholder-text-tertiary outline-none focus:ring-2 focus:ring-text-muted"
                autoFocus
              />

              <div>
                <div className="mb-2 text-sm text-text-tertiary">{t.addToList}</div>
                <select
                  value={selectedListId}
                  onChange={(e) => setSelectedListId(e.target.value)}
                  className="w-full rounded-lg bg-input px-3 py-2 text-sm text-text outline-none focus:ring-2 focus:ring-text-muted appearance-none cursor-pointer"
                >
                  <option value="">{t.unscheduled}</option>
                  {selectableLists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name}
                    </option>
                  ))}
                </select>
              </div>

              <MoreToggle label={t.addDetails} open={showPrayerMore} onToggle={() => setShowPrayerMore(!showPrayerMore)} />

              {showPrayerMore && (
                <div className="space-y-4 rounded-lg border border-border p-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <DescriptionToolbar
                        textareaRef={addDescRef}
                        value={description}
                        onChange={setDescription}
                        maxLength={2000}
                      />
                      <span className="text-xs text-text-muted">{description.length}/2000</span>
                    </div>
                    <textarea
                      ref={addDescRef}
                      placeholder={t.descriptionOptional}
                      value={description}
                      onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                      onKeyDown={handleDescKeyDown}
                      maxLength={2000}
                      rows={3}
                      className="w-full rounded-lg bg-input px-3 py-2 text-text placeholder-text-tertiary outline-none focus:ring-2 focus:ring-text-muted resize-none"
                    />
                  </div>

                  <div>
                    <div className="mb-2 text-sm text-text-tertiary">{t.tags}</div>
                    <TagInput tags={prayerTags} onChange={setPrayerTags} placeholder={t.tagsPlaceholder} allTags={existingTags} />
                  </div>
                </div>
              )}
            </div>

            <div className={footerClass} style={footerStyle}>
              {saveError && (
                <div className="rounded-lg bg-red-500/15 border border-red-500/40 px-3 py-2 text-xs text-red-300 break-words">
                  Couldn't save: {saveError}
                </div>
              )}
              <button type="submit" disabled={!title.trim() || saving} className={submitClass}>
                {saving ? '…' : t.addPrayer}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}
