import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import type { PrayerList, Prayer, Cadence, PersistenceUnit } from '../db/types'
import { getList, updateList, deleteList, archiveList, reactivateList } from '../features/cycles/list-operations'
import { getPrayersByList, createPrayer, bulkCreatePrayers } from '../features/prayers/prayer-operations'
import { PrayerDetailModal } from '../components/PrayerDetailModal'
import { useT } from '../i18n'

export function ListDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useT()
  const [list, setList] = useState<PrayerList | null>(null)
  const [prayers, setPrayers] = useState<Prayer[]>([])
  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showAddPrayer, setShowAddPrayer] = useState(false)
  const [newPrayerText, setNewPrayerText] = useState('')
  type SortMode = 'original' | 'az' | 'za' | 'most' | 'least'
  const storageKey = `prayercycles-sort-${id}`
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    return (localStorage.getItem(storageKey) as SortMode) || 'original'
  })
  const [sortTrail, setSortTrail] = useState<SortMode[]>(() => {
    const saved = localStorage.getItem(storageKey)
    return saved ? [saved as SortMode] : ['original']
  })

  function handleSort(mode: SortMode) {
    setSortMode(mode)
    localStorage.setItem(storageKey, mode)
    setSortTrail((prev) => [...prev.slice(-2), mode])
  }

  function getTrailStyle(mode: SortMode): string {
    // Find the most recent index of this mode in the trail
    const lastIndex = sortTrail.lastIndexOf(mode)
    if (lastIndex === -1) return 'bg-slate-800 text-slate-500'

    const recency = sortTrail.length - 1 - lastIndex
    // If a more recent entry exists for this same mode, only show the latest
    if (recency === 0) return 'bg-sky-500 text-white'
    if (recency === 1) return 'bg-sky-500/40 text-slate-300'
    if (recency === 2) return 'bg-sky-500/20 text-slate-400'
    return 'bg-slate-800 text-slate-500'
  }

  // Edit fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cadence, setCadence] = useState<Cadence>('daily')
  const [persistenceUnit, setPersistenceUnit] = useState<PersistenceUnit>('wake')
  const [persistenceEvery, setPersistenceEvery] = useState(1)
  const [lifecycleType, setLifecycleType] = useState<'indefinite' | 'finite'>('indefinite')
  const [retireAfter, setRetireAfter] = useState(1)

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
    const p = await getPrayersByList(id)
    setPrayers(p)
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
    })
    setEditing(false)
    load()
  }

  async function handleDeleteList() {
    if (!id) return
    await deleteList(id)
    navigate('/lists')
  }

  async function handleToggleArchive() {
    if (!id || !list) return
    if (list.status === 'active') {
      await archiveList(id)
    } else {
      await reactivateList(id)
    }
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
    return <div className="flex h-40 items-center justify-center text-slate-500">{t.loading}</div>
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


  const sortedPrayers = [...prayers].sort((a, b) => {
    if (sortMode === 'az') return a.title.localeCompare(b.title) || a.createdAt - b.createdAt
    if (sortMode === 'za') return b.title.localeCompare(a.title) || a.createdAt - b.createdAt
    if (sortMode === 'most') return (b.prayerTally - a.prayerTally) || a.title.localeCompare(b.title) || a.createdAt - b.createdAt
    if (sortMode === 'least') return (a.prayerTally - b.prayerTally) || a.title.localeCompare(b.title) || a.createdAt - b.createdAt
    return a.createdAt - b.createdAt
  })

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <button
          onClick={() => navigate('/lists')}
          className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-300"
        >
          <ArrowLeft size={16} />
          {t.backToPrayerLists}
        </button>

        {/* List info */}
        <div className="rounded-lg p-5 shadow-md bg-slate-800">
          {editing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg bg-white/10 px-3 py-2 text-slate-100 font-semibold text-lg outline-none focus:ring-2 focus:ring-white/30"
              />
              <textarea
                placeholder={t.descriptionOptional}
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                maxLength={500}
                rows={2}
                className="w-full rounded-lg bg-white/10 px-3 py-2 text-slate-200 text-sm outline-none focus:ring-2 focus:ring-white/30 resize-none"
              />
              <div>
                <div className="mb-1 text-xs text-slate-300">{t.cycle}</div>
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
                      className={`rounded px-2 py-0.5 text-xs capitalize ${cadence === c ? 'bg-slate-700 text-white' : 'bg-white/10 text-slate-200'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs text-slate-300">{t.frequency}</div>
                <div className="flex flex-wrap gap-1">
                  {([[('wake' as PersistenceUnit), t.wake], [('passage' as PersistenceUnit), t.passage], [('season' as PersistenceUnit), t.season], [('orbit' as PersistenceUnit), t.orbit]] as [PersistenceUnit, string][])
                    .filter(([unit]) => allowedUnitsForCadence(cadence).includes(unit))
                    .map(([unit, label]) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => { if (cadence !== 'daily') setPersistenceUnit(unit) }}
                      className={`rounded px-2 py-0.5 text-xs ${persistenceUnit === unit ? 'bg-slate-700 text-white' : 'bg-white/10 text-slate-200'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-1 flex items-center gap-2 h-6">
                  <span className="text-xs text-slate-400">{t.every}</span>
                  {cadence === 'daily' ? (
                    <span className="w-14 text-xs text-slate-100 text-center">1</span>
                  ) : (
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={persistenceEvery}
                      onChange={(e) => setPersistenceEvery(Math.max(1, Math.min(99, Number(e.target.value))))}
                      className="w-14 rounded bg-white/10 px-2 py-0.5 text-xs text-slate-100 text-center outline-none focus:ring-2 focus:ring-white/30"
                    />
                  )}
                  <span className="text-xs text-slate-400">
                    {persistenceUnit === 'wake' ? (persistenceEvery === 1 ? t.day : t.days)
                      : persistenceUnit === 'passage' ? (persistenceEvery === 1 ? t.week : t.weeks)
                      : persistenceUnit === 'season' ? (persistenceEvery === 1 ? t.month : t.months)
                      : (persistenceEvery === 1 ? t.year : t.years)}
                  </span>
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs text-slate-300">{t.lifecycle}</div>
                <div className="flex gap-1">
                  {([['indefinite', t.indefinite], ['finite', t.finite]] as const).map(([l, label]) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLifecycleType(l)}
                      className={`rounded px-2 py-0.5 text-xs capitalize ${lifecycleType === l ? 'bg-slate-700 text-white' : 'bg-white/10 text-slate-200'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-1 flex items-center gap-2 h-6">
                  <span className="text-xs text-slate-400">{t.retiresAfter}</span>
                  {lifecycleType === 'indefinite' ? (
                    <span className="w-14 text-xs text-slate-100 text-center">∞</span>
                  ) : (
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={retireAfter}
                      onChange={(e) => setRetireAfter(Math.max(1, Math.min(999, Number(e.target.value))))}
                      className="w-14 rounded bg-white/10 px-2 py-0.5 text-xs text-slate-100 text-center outline-none focus:ring-2 focus:ring-white/30"
                    />
                  )}
                  <span className="text-xs text-slate-400">{lifecycleType === 'indefinite' ? t.completions : (retireAfter === 1 ? t.completion : t.completions)}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSaveList}
                  className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-1 text-sm text-slate-200 hover:bg-slate-600 transition-colors"
                >
                  {t.save}
                </button>
                <button
                  onClick={() => { setEditing(false); setName(list.name); setDescription(list.description) }}
                  className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-1 text-sm text-slate-200 hover:bg-slate-600 transition-colors"
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
                  <p className="text-xs text-slate-400 leading-tight"><span className="capitalize">{list.cycle.cadence}</span> | {freqLabel} | {lifecycleLabel}</p>
                  <h2 className="text-xl font-semibold text-slate-100 -mt-0.5">{list.name}</h2>
                </div>
                <button
                  onClick={handleToggleArchive}
                  className="flex items-center gap-1.5 shrink-0 mt-1"
                  title={list.status === 'active' ? t.activeTapToDeactivate : t.deactivatedTapToReactivate}
                >
                  <span className="text-[10px] text-slate-500">{list.status === 'active' ? t.active : t.inactive}</span>
                  <div className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${list.status === 'active' ? 'bg-green-500' : 'bg-slate-600'}`}>
                    <div className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition-transform duration-200 ${list.status === 'active' ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
                  </div>
                </button>
              </div>
              {list.description && (
                <p className="mt-1 text-sm text-slate-300">{list.description}</p>
              )}
              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => setEditing(true)}
                  className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-1 text-sm text-slate-200 hover:bg-slate-600 transition-colors"
                >
                  {t.edit}
                </button>
                <div>
                  {!confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-1 rounded-lg border border-red-500/30 px-3 py-1 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={14} />
                      {t.delete}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-red-400">{t.deleteConfirm}</span>
                      <button
                        onClick={handleDeleteList}
                        className="rounded-lg bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-500 transition-colors"
                      >
                        {t.yes}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="rounded-lg border border-slate-600 bg-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-600 transition-colors"
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
              className="text-sm text-sky-300 hover:text-sky-200 transition-colors"
            >
              {t.addPrayersToList}
            </button>
          ) : (
            <div className="rounded-lg bg-slate-800 p-4 space-y-3">
              <textarea
                placeholder={`${t.addPrayersPlaceholder}\n${t.addPrayersExample}`}
                value={newPrayerText}
                onChange={(e) => setNewPrayerText(e.target.value)}
                rows={4}
                className="w-full rounded-lg bg-white/10 px-3 py-2 text-slate-100 placeholder-slate-400 text-sm outline-none focus:ring-2 focus:ring-white/30 resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddPrayers}
                  disabled={!newPrayerText.trim()}
                  className="rounded-lg bg-slate-700 px-3 py-1 text-sm text-white hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t.add}
                </button>
                <button
                  onClick={() => { setShowAddPrayer(false); setNewPrayerText('') }}
                  className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-1 text-sm text-slate-200 hover:bg-slate-600 transition-colors"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Prayer list */}
        <div className="mt-4 space-y-1">
          <div className="flex gap-1 mb-2">
            {([['original', t.sortOriginal], ['az', t.sortAZ], ['za', t.sortZA], ['most', t.sortMostPrayed], ['least', t.sortLeastPrayed]] as [SortMode, string][]).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => handleSort(mode)}
                className={`rounded px-3 py-1 text-xs transition-colors ${getTrailStyle(mode)}`}
              >
                {label}
              </button>
            ))}
          </div>
          {sortedPrayers.map((prayer) => (
            <button
              key={prayer.id}
              onClick={() => setSelectedPrayer(prayer)}
              className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <span>{prayer.title}</span>
              <span className="text-xs text-sky-300 ml-2 shrink-0">{prayer.prayerTally}</span>
            </button>
          ))}
          {prayers.length === 0 && (
            <p className="text-sm text-slate-500 italic pt-2">{t.noPrayersInList}</p>
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
