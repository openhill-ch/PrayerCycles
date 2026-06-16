import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, GripVertical, Timer } from 'lucide-react'
import type { PrayerList, Prayer, Cadence, PersistenceUnit } from '../db/types'
import { getList, updateList, deleteList, archiveList, reactivateList } from '../features/cycles/list-operations'
import { getPrayersByList, createPrayer, bulkCreatePrayers, reorderPrayers, resetPrayerOrder } from '../features/prayers/prayer-operations'
import { PrayerDetailModal } from '../components/PrayerDetailModal'
import { TagInput } from '../components/TagInput'
import { getAllTags } from '../features/tags/tag-operations'
import { useTimer } from '../context/TimerContext'
import { useT } from '../i18n'

export function ListDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useT()
  const { refreshLists: refreshTimerLists, setSelectedListId } = useTimer()
  const [list, setList] = useState<PrayerList | null>(null)
  const [prayers, setPrayers] = useState<Prayer[]>([])
  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showAddPrayer, setShowAddPrayer] = useState(false)
  const [newPrayerText, setNewPrayerText] = useState('')
  type SortMode = 'original' | 'custom' | 'az' | 'za' | 'most' | 'least'
  const storageKey = `prayercycles-sort-${id}`
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    return (localStorage.getItem(storageKey) as SortMode) || 'original'
  })
  const [sortTrail, setSortTrail] = useState<SortMode[]>(() => {
    const saved = localStorage.getItem(storageKey)
    return saved ? [saved as SortMode] : ['original']
  })

  // Drag-and-drop state
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const dragTouchY = useRef<number>(0)
  const listContainerRef = useRef<HTMLDivElement>(null)
  const [confirmResetOrder, setConfirmResetOrder] = useState(false)
  const [showFulfilled, setShowFulfilled] = useState(false)

  function handleSort(mode: SortMode) {
    setSortMode(mode)
    localStorage.setItem(storageKey, mode)
    setSortTrail((prev) => [...prev.slice(-2), mode])
  }

  function getTrailStyle(mode: SortMode): string {
    const lastIndex = sortTrail.lastIndexOf(mode)
    if (lastIndex === -1) return 'bg-card text-text-muted'

    const recency = sortTrail.length - 1 - lastIndex
    if (recency === 0) return 'bg-accent text-white'
    if (recency === 1) return 'bg-accent/40 text-text-secondary'
    if (recency === 2) return 'bg-accent/20 text-text-tertiary'
    return 'bg-card text-text-muted'
  }

  // Edit fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cadence, setCadence] = useState<Cadence>('daily')
  const [persistenceUnit, setPersistenceUnit] = useState<PersistenceUnit>('wake')
  const [persistenceEvery, setPersistenceEvery] = useState(1)
  const [lifecycleType, setLifecycleType] = useState<'indefinite' | 'finite'>('indefinite')
  const [retireAfter, setRetireAfter] = useState(1)
  const [editTags, setEditTags] = useState<string[]>([])
  const [existingTags, setExistingTags] = useState<string[]>([])

  const load = useCallback(async () => {
    if (!id) return
    const l = await getList(id)
    if (!l) return
    setList(l)
    setName(l.name)
    setDescription(l.description)
    setCadence(l.cycle.cadence)
    setPersistenceUnit(l.cycle.persistence.unit)
    setPersistenceEvery(l.cycle.persistence.every)
    setLifecycleType(l.cycle.lifecycle.type)
    setRetireAfter(l.cycle.lifecycle.retireAfter ?? 1)
    setEditTags(l.tags ?? [])
    const [p, tags] = await Promise.all([getPrayersByList(id), getAllTags()])
    setPrayers(p)
    setExistingTags(tags)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function handleSaveList() {
    if (!id || !name.trim()) return
    await updateList(id, {
      name: name.trim(),
      description: description.trim(),
      cycle: { cadence, persistence: { unit: persistenceUnit, every: persistenceEvery }, lifecycle: { type: lifecycleType, ...(lifecycleType === 'finite' ? { retireAfter } : {}) } },
      tags: editTags,
    })
    setEditing(false)
    load()
  }

  async function handleDeleteList() {
    if (!id) return
    await deleteList(id)
    refreshTimerLists()
    navigate('/lists')
  }

  async function handleToggleArchive() {
    if (!id || !list) return
    if (list.status === 'active') {
      await archiveList(id)
    } else {
      await reactivateList(id)
    }
    refreshTimerLists()
    load()
  }

  async function handleAddPrayers() {
    if (!id || !newPrayerText.trim()) return
    const lines = newPrayerText.split('\n').filter((t) => t.trim())
    if (lines.length === 0) return
    if (lines.length === 1) {
      await createPrayer(lines[0].trim(), [id])
    } else {
      await bulkCreatePrayers(lines, id)
    }
    setNewPrayerText('')
    setShowAddPrayer(false)
    load()
    window.dispatchEvent(new Event('prayercycles:refresh'))
  }

  if (!list) {
    return <div className="flex h-40 items-center justify-center text-text-muted">{t.loading}</div>
  }

  function allowedUnitsForCadence(c: Cadence): PersistenceUnit[] {
    if (c === 'daily') return ['wake']
    if (c === 'weekly') return ['wake', 'passage']
    if (c === 'monthly') return ['wake', 'passage', 'season']
    return ['wake', 'passage', 'season', 'orbit']
  }

  const persistenceLabels: Record<PersistenceUnit, string> = { wake: t.day, passage: t.week, season: t.month, orbit: t.year }
  const persistenceLabelPlural: Record<PersistenceUnit, string> = { wake: t.days, passage: t.weeks, season: t.months, orbit: t.years }
  const pUnit = list.cycle.persistence.unit
  const pEvery = list.cycle.persistence.every
  const freqLabel = pEvery === 1 ? `${t.every} ${persistenceLabels[pUnit]}` : `${t.every} ${pEvery} ${persistenceLabelPlural[pUnit]}`
  const lifecycleLabel = list.cycle.lifecycle.type === 'indefinite' ? 'x ∞' : `x ${list.cycle.lifecycle.retireAfter ?? 1}`


  function formatTime(seconds: number): string {
    return t.formatTimePrayed(seconds)
  }

  const hasCustomOrder = prayers.some((p) => p.sortOrder?.[id!] !== undefined)

  const fulfilledCount = prayers.filter((p) => p.fulfilled).length

  const sortedPrayers = [...prayers].sort((a, b) => {
    // Fulfilled prayers always sort to the bottom
    if (a.fulfilled !== b.fulfilled) return a.fulfilled ? 1 : -1

    if (sortMode === 'custom' || sortMode === 'original') {
      if (sortMode === 'custom') {
        const aOrder = a.sortOrder?.[id!]
        const bOrder = b.sortOrder?.[id!]
        if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder
        if (aOrder !== undefined) return -1
        if (bOrder !== undefined) return 1
      }
      return a.createdAt - b.createdAt
    }
    if (sortMode === 'az') return a.title.localeCompare(b.title) || a.createdAt - b.createdAt
    if (sortMode === 'za') return b.title.localeCompare(a.title) || a.createdAt - b.createdAt
    if (sortMode === 'most') return (b.prayerTally - a.prayerTally) || a.title.localeCompare(b.title) || a.createdAt - b.createdAt
    if (sortMode === 'least') return (a.prayerTally - b.prayerTally) || a.title.localeCompare(b.title) || a.createdAt - b.createdAt
    return a.createdAt - b.createdAt
  })

  // Filter out fulfilled unless toggle is on
  const visiblePrayers = showFulfilled ? sortedPrayers : sortedPrayers.filter((p) => !p.fulfilled)

  // Drag-and-drop handlers
  function handleDragStart(idx: number) {
    setDragIdx(idx)
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    setOverIdx(idx)
  }

  async function handleDrop(idx: number) {
    if (dragIdx === null || dragIdx === idx || !id) { setDragIdx(null); setOverIdx(null); return }
    const reordered = [...visiblePrayers]
    const [moved] = reordered.splice(dragIdx, 1)
    reordered.splice(idx, 0, moved)
    await reorderPrayers(id, reordered.map((p) => p.id))
    handleSort('custom')
    setDragIdx(null)
    setOverIdx(null)
    load()
  }

  // Touch drag handlers
  function handleTouchStart(idx: number, e: React.TouchEvent) {
    dragTouchY.current = e.touches[0].clientY
    setDragIdx(idx)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (dragIdx === null || !listContainerRef.current) return
    const touch = e.touches[0]
    const container = listContainerRef.current
    const children = Array.from(container.children) as HTMLElement[]
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect()
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        setOverIdx(i)
        break
      }
    }
  }

  async function handleTouchEnd() {
    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx && id) {
      await handleDrop(overIdx)
    } else {
      setDragIdx(null)
      setOverIdx(null)
    }
  }

  async function handleResetOrder() {
    if (!id) return
    await resetPrayerOrder(id)
    handleSort('original')
    setConfirmResetOrder(false)
    load()
  }

  // Calculate total time prayed for all prayers in this list
  const listTotalTimePrayed = prayers.reduce((sum, p) => sum + (p.totalTimePrayed ?? 0), 0)

  // Edit mode input style — consistent for all fields including TagInput
  const editInputClass = 'bg-white/10 outline-none focus:ring-2 focus:ring-white/30'

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <button
          onClick={() => navigate('/lists')}
          className="mb-4 flex items-center gap-1 text-sm text-text-tertiary hover:text-text-secondary"
        >
          <ArrowLeft size={16} />
          {t.backToPrayerLists}
        </button>

        {/* List info */}
        <div className="rounded-lg p-5 shadow-md bg-card">
          {editing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full rounded-lg px-3 py-2 text-text font-semibold text-lg ${editInputClass}`}
              />
              <textarea
                placeholder={t.descriptionOptional}
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                maxLength={500}
                rows={2}
                className={`w-full rounded-lg px-3 py-2 text-text-secondary text-sm resize-none ${editInputClass}`}
              />
              <div>
                <div className="mb-1 text-xs text-text-secondary">{t.tags}</div>
                <TagInput tags={editTags} onChange={setEditTags} placeholder={t.tagsPlaceholder} allTags={existingTags} className="bg-white/10" />
              </div>
              <div>
                <div className="mb-1 text-xs text-text-secondary">{t.cycle}</div>
                <div className="flex flex-wrap gap-1">
                  {(['daily', 'weekly', 'monthly', 'annually'] as Cadence[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setCadence(c)
                        if (c === 'daily') { setPersistenceUnit('wake'); setPersistenceEvery(1) }
                        else {
                          const allowed = allowedUnitsForCadence(c)
                          if (!allowed.includes(persistenceUnit)) setPersistenceUnit(allowed[0])
                        }
                      }}
                      className={`rounded px-2 py-0.5 text-xs capitalize ${cadence === c ? 'bg-input text-text' : 'bg-white/10 text-text-secondary'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs text-text-secondary">{t.frequency}</div>
                <div className="flex flex-wrap gap-1">
                  {([[('wake' as PersistenceUnit), t.wake], [('passage' as PersistenceUnit), t.passage], [('season' as PersistenceUnit), t.season], [('orbit' as PersistenceUnit), t.orbit]] as [PersistenceUnit, string][])
                    .filter(([unit]) => allowedUnitsForCadence(cadence).includes(unit))
                    .map(([unit, label]) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => { if (cadence !== 'daily') setPersistenceUnit(unit) }}
                      className={`rounded px-2 py-0.5 text-xs ${persistenceUnit === unit ? 'bg-input text-text' : 'bg-white/10 text-text-secondary'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-1 flex items-center gap-2 h-6">
                  <span className="text-xs text-text-tertiary">{t.every}</span>
                  {cadence === 'daily' ? (
                    <span className="w-14 text-xs text-text text-center">1</span>
                  ) : (
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={persistenceEvery}
                      onChange={(e) => setPersistenceEvery(Math.max(1, Math.min(99, Number(e.target.value))))}
                      className={`w-14 rounded px-2 py-0.5 text-xs text-text text-center ${editInputClass}`}
                    />
                  )}
                  <span className="text-xs text-text-tertiary">
                    {persistenceUnit === 'wake' ? (persistenceEvery === 1 ? t.day : t.days)
                      : persistenceUnit === 'passage' ? (persistenceEvery === 1 ? t.week : t.weeks)
                      : persistenceUnit === 'season' ? (persistenceEvery === 1 ? t.month : t.months)
                      : (persistenceEvery === 1 ? t.year : t.years)}
                  </span>
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs text-text-secondary">{t.lifecycle}</div>
                <div className="flex gap-1">
                  {([['indefinite', t.indefinite], ['finite', t.finite]] as const).map(([l, label]) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLifecycleType(l)}
                      className={`rounded px-2 py-0.5 text-xs capitalize ${lifecycleType === l ? 'bg-input text-text' : 'bg-white/10 text-text-secondary'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-1 flex items-center gap-2 h-6">
                  <span className="text-xs text-text-tertiary">{t.retiresAfter}</span>
                  {lifecycleType === 'indefinite' ? (
                    <span className="w-14 text-xs text-text text-center">∞</span>
                  ) : (
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={retireAfter}
                      onChange={(e) => setRetireAfter(Math.max(1, Math.min(999, Number(e.target.value))))}
                      className={`w-14 rounded px-2 py-0.5 text-xs text-text text-center ${editInputClass}`}
                    />
                  )}
                  <span className="text-xs text-text-tertiary">{lifecycleType === 'indefinite' ? t.completions : (retireAfter === 1 ? t.completion : t.completions)}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSaveList}
                  className="rounded-lg border border-border-light bg-input px-3 py-1 text-sm text-text-secondary hover:bg-input-hover transition-colors"
                >
                  {t.save}
                </button>
                <button
                  onClick={() => { setEditing(false); setName(list.name); setDescription(list.description); setEditTags(list.tags ?? []) }}
                  className="rounded-lg border border-border-light bg-input px-3 py-1 text-sm text-text-secondary hover:bg-input-hover transition-colors"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Active/Deactivated toggle — top right */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-text-tertiary leading-tight"><span className="capitalize">{list.cycle.cadence}</span> | {freqLabel} | {lifecycleLabel}</p>
                  <h2 className="text-xl font-semibold text-text -mt-0.5">{list.name}</h2>
                </div>
                <button
                  onClick={handleToggleArchive}
                  className="flex items-center gap-1.5 shrink-0 mt-1"
                  title={list.status === 'active' ? t.activeTapToDeactivate : t.deactivatedTapToReactivate}
                >
                  <span className="text-[10px] text-text-muted">{list.status === 'active' ? t.active : t.inactive}</span>
                  <div className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${list.status === 'active' ? 'bg-toggle' : 'bg-input-hover'}`}>
                    <div className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition-transform duration-200 ${list.status === 'active' ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
                  </div>
                </button>
              </div>
              {list.description && (
                <p className="mt-1 text-sm text-text-secondary">{list.description}</p>
              )}
              {(list.tags ?? []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {list.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-input px-2 py-0.5 text-xs text-text-tertiary">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(true)}
                    className="rounded-lg border border-border-light bg-input px-3 py-1 text-sm text-text-secondary hover:bg-input-hover transition-colors"
                  >
                    {t.edit}
                  </button>
                  <button
                    onClick={() => {
                      if (!id) return
                      setSelectedListId(id)
                      navigate('/timer')
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-accent/15 px-3 py-1 text-sm font-medium text-accent-text hover:bg-accent/25 transition-colors"
                  >
                    <Timer size={14} />
                    {t.prayNow}
                  </button>
                </div>
                <div>
                  {!confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-1 rounded-lg border border-danger-text/30 px-3 py-1 text-sm text-danger-text hover:bg-danger-text/10 transition-colors"
                    >
                      <Trash2 size={14} />
                      {t.delete}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-danger-text">{t.deleteConfirm}</span>
                      <button
                        onClick={handleDeleteList}
                        className="rounded-lg bg-danger px-2 py-1 text-xs text-white hover:bg-danger-hover transition-colors"
                      >
                        {t.yes}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="rounded-lg border border-border-light bg-input px-2 py-1 text-xs text-text-secondary hover:bg-input-hover transition-colors"
                      >
                        {t.no}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Add prayers inline */}
        <div className="mt-4">
          {!showAddPrayer ? (
            <button
              onClick={() => setShowAddPrayer(true)}
              className="text-sm text-accent-text hover:text-accent-hover transition-colors"
            >
              {t.addPrayersToList}
            </button>
          ) : (
            <div className="rounded-lg bg-card p-4 space-y-3">
              <textarea
                placeholder={`${t.addPrayersPlaceholder}\n${t.addPrayersExample}`}
                value={newPrayerText}
                onChange={(e) => setNewPrayerText(e.target.value)}
                rows={4}
                className={`w-full rounded-lg px-3 py-2 text-text placeholder-text-tertiary text-sm resize-none ${editInputClass}`}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddPrayers}
                  disabled={!newPrayerText.trim()}
                  className="rounded-lg bg-input px-3 py-1 text-sm text-text hover:bg-input-hover disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t.add}
                </button>
                <button
                  onClick={() => { setShowAddPrayer(false); setNewPrayerText('') }}
                  className="rounded-lg border border-border-light bg-input px-3 py-1 text-sm text-text-secondary hover:bg-input-hover transition-colors"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Total time prayed */}
        {listTotalTimePrayed > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
            <span>{t.totalTimePrayed}:</span>
            <span className="text-text-secondary">{formatTime(listTotalTimePrayed)}</span>
          </div>
        )}

        {/* Prayer list */}
        <div className="mt-4 space-y-1">
          <div className="flex flex-wrap gap-1 mb-2">
            {([['original', t.sortOriginal], ['custom', t.sortCustom], ['az', t.sortAZ], ['za', t.sortZA], ['most', t.sortMostPrayed], ['least', t.sortLeastPrayed]] as [SortMode, string][]).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => handleSort(mode)}
                className={`rounded px-3 py-1 text-xs transition-colors ${getTrailStyle(mode)}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Set Default Order button — only in custom/original mode when custom order exists */}
          {hasCustomOrder && (sortMode === 'custom' || sortMode === 'original') && (
            <div className="mb-2">
              {!confirmResetOrder ? (
                <button
                  onClick={() => setConfirmResetOrder(true)}
                  className="text-xs text-text-muted hover:text-text-secondary transition-colors"
                >
                  {t.setDefaultOrder}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-tertiary">{t.resetOrderConfirm}</span>
                  <button
                    onClick={handleResetOrder}
                    className="rounded bg-input px-2 py-0.5 text-xs text-text hover:bg-input-hover"
                  >
                    {t.yes}
                  </button>
                  <button
                    onClick={() => setConfirmResetOrder(false)}
                    className="rounded bg-card px-2 py-0.5 text-xs text-text-secondary hover:bg-input"
                  >
                    {t.no}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Show Fulfilled toggle */}
          {fulfilledCount > 0 && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-muted">{t.showFulfilled} ({t.fulfilledCount(fulfilledCount)})</span>
              <button
                onClick={() => setShowFulfilled(!showFulfilled)}
                className="flex items-center"
              >
                <div className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${showFulfilled ? 'bg-toggle' : 'bg-input-hover'}`}>
                  <div className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition-transform duration-200 ${showFulfilled ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
                </div>
              </button>
            </div>
          )}

          <div ref={listContainerRef} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
            {visiblePrayers.map((prayer, idx) => (
              <div
                key={prayer.id}
                draggable={sortMode === 'custom'}
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={() => handleDrop(idx)}
                onDragEnd={() => { setDragIdx(null); setOverIdx(null) }}
                onTouchStart={(e) => { if (sortMode === 'custom') handleTouchStart(idx, e) }}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-card transition-colors cursor-pointer ${
                  dragIdx === idx ? 'opacity-40' : ''
                } ${overIdx === idx && dragIdx !== null && dragIdx !== idx ? 'border-t-2 border-accent' : ''}`}
                onClick={() => { if (dragIdx === null) setSelectedPrayer(prayer) }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {sortMode === 'custom' && (
                    <GripVertical size={14} className="text-input-hover shrink-0 cursor-grab" />
                  )}
                  <span className={`truncate ${prayer.fulfilled ? 'line-through opacity-50' : ''}`}>{prayer.title}</span>
                  {prayer.fulfilled && (
                    <span className="text-[10px] text-accent-text/60 shrink-0">{t.fulfilled}</span>
                  )}
                </div>
                <span className="text-xs text-accent-text ml-2 shrink-0">{prayer.prayerTally}</span>
              </div>
            ))}
          </div>
          {visiblePrayers.length === 0 && prayers.length === 0 && (
            <p className="text-sm text-text-muted italic pt-2">{t.noPrayersInList}</p>
          )}
        </div>
      </div>

      {selectedPrayer && (
        <PrayerDetailModal
          prayer={selectedPrayer}
          onClose={() => setSelectedPrayer(null)}
          onUpdated={load}
        />
      )}
    </div>
  )
}
