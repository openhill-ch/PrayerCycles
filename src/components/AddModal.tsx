import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useT } from '../i18n'
import { useTimer } from '../context/TimerContext'
import type { PrayerList, Cadence, PersistenceUnit } from '../db/types'
import { createList, getAllLists } from '../features/cycles/list-operations'
import { createPrayer } from '../features/prayers/prayer-operations'

type AddModalProps = {
  open: boolean
  onClose: () => void
  onAdded: () => void
}

type Mode = 'create-list' | 'add-single'

export function AddModal({ open, onClose, onAdded }: AddModalProps) {
  const { t } = useT()
  const { refreshLists: refreshTimerLists } = useTimer()
  const [mode, setMode] = useState<Mode>('create-list')
  const [lists, setLists] = useState<PrayerList[]>([])

  // Create list fields
  const [listName, setListName] = useState('')
  const [listDescription, setListDescription] = useState('')
  const [cadence, setCadence] = useState<Cadence>('daily')
  const [persistenceUnit, setPersistenceUnit] = useState<PersistenceUnit>('wake')
  const [persistenceEvery, setPersistenceEvery] = useState(1)
  const [lifecycleType, setLifecycleType] = useState<'indefinite' | 'finite'>('indefinite')
  const [retireAfter, setRetireAfter] = useState(1)
  const [initialPrayers, setInitialPrayers] = useState('')

  // Add prayer fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedLists, setSelectedLists] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      getAllLists().then(setLists)
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
    setTitle('')
    setDescription('')
    setSelectedLists([])
    setMode('create-list')
  }

  function handleClose() {
    reset()
    onClose()
  }

  function toggleList(id: string) {
    setSelectedLists((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id],
    )
  }

  async function handleCreateList(e: React.FormEvent) {
    e.preventDefault()
    if (!listName.trim()) return
    const titles = initialPrayers.split('\n').filter((t) => t.trim())
    await createList(
      listName.trim(),
      { cadence, persistence: { unit: persistenceUnit, every: persistenceEvery }, lifecycle: { type: lifecycleType, ...(lifecycleType === 'finite' ? { retireAfter } : {}) } },
      listDescription.trim(),
      titles,
    )
    refreshTimerLists()
    reset()
    onAdded()
    onClose()
  }

  async function handleAddPrayer(e: React.FormEvent) {
    e.preventDefault()
    if (selectedLists.length === 0 || !title.trim()) return
    await createPrayer(title.trim(), selectedLists, description.trim())
    reset()
    onAdded()
    onClose()
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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-slate-800 p-6 pb-24 sm:rounded-2xl sm:pb-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">
            {mode === 'create-list' ? t.newPrayerList : t.newPrayer}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-700"
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
            className={`rounded px-3 py-1 text-sm ${mode === 'create-list' ? 'bg-slate-600 text-white' : 'bg-slate-700 text-slate-400'}`}
          >
            {t.newPrayerList}
          </button>
          <button
            type="button"
            onClick={() => setMode('add-single')}
            className={`rounded px-3 py-1 text-sm ${mode === 'add-single' ? 'bg-slate-600 text-white' : 'bg-slate-700 text-slate-400'}`}
          >
            {t.newPrayer}
          </button>
        </div>

        {/* Create List form */}
        {mode === 'create-list' && (
          <form onSubmit={handleCreateList} className="space-y-4">
            <input
              type="text"
              placeholder={t.listName}
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              className="w-full rounded-lg bg-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-slate-500"
              autoFocus
            />

            <div>
              <textarea
                placeholder={t.descriptionOptional}
                value={listDescription}
                onChange={(e) => setListDescription(e.target.value.slice(0, 500))}
                rows={2}
                maxLength={500}
                className="w-full rounded-lg bg-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-slate-500 resize-none"
              />
              <div className="text-right text-xs text-slate-500 mt-1">{listDescription.length}/500</div>
            </div>

            <div>
              <div className="mb-2 text-sm text-slate-400">{t.cycle}</div>
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
                    className={`rounded px-3 py-1 text-sm capitalize ${cadence === c ? 'bg-slate-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm text-slate-400">{t.frequency}</div>
              <div className="flex flex-wrap gap-2">
                {visibleUnits.map(([unit, label, tooltip]) => (
                  <button
                    key={unit}
                    type="button"
                    title={tooltip}
                    onClick={() => { if (cadence !== 'daily') setPersistenceUnit(unit) }}
                    className={`rounded px-3 py-1 text-sm ${persistenceUnit === unit ? 'bg-slate-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2 h-8">
                <span className="text-sm text-slate-400">{t.every}</span>
                {cadence === 'daily' ? (
                  <span className="w-16 text-sm text-slate-100 text-center">1</span>
                ) : (
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={persistenceEvery}
                    onChange={(e) => setPersistenceEvery(Math.max(1, Math.min(99, Number(e.target.value))))}
                    className="w-16 rounded bg-slate-700 px-2 py-1 text-sm text-slate-100 text-center outline-none focus:ring-2 focus:ring-slate-500"
                  />
                )}
                <span className="text-sm text-slate-400">
                  {persistenceUnit === 'wake' ? (persistenceEvery === 1 ? t.day : t.days)
                    : persistenceUnit === 'passage' ? (persistenceEvery === 1 ? t.week : t.weeks)
                    : persistenceUnit === 'season' ? (persistenceEvery === 1 ? t.month : t.months)
                    : (persistenceEvery === 1 ? t.year : t.years)}
                </span>
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm text-slate-400">{t.lifecycle}</div>
              <div className="flex gap-2">
                {(['indefinite', 'finite'] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLifecycleType(l)}
                    className={`rounded px-3 py-1 text-sm capitalize ${lifecycleType === l ? 'bg-slate-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                  >
                    {l === 'indefinite' ? t.indefinite : t.finite}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2 h-8">
                <span className="text-sm text-slate-400">{t.retiresAfter}</span>
                {lifecycleType === 'indefinite' ? (
                  <span className="w-16 text-sm text-slate-100 text-center">∞</span>
                ) : (
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={retireAfter}
                    onChange={(e) => setRetireAfter(Math.max(1, Math.min(999, Number(e.target.value))))}
                    className="w-16 rounded bg-slate-700 px-2 py-1 text-sm text-slate-100 text-center outline-none focus:ring-2 focus:ring-slate-500"
                  />
                )}
                <span className="text-sm text-slate-400">{lifecycleType === 'indefinite' ? t.completions : (retireAfter === 1 ? t.completion : t.completions)}</span>
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm text-slate-400">{t.prayersOnePerLine}</div>
              <textarea
                placeholder={t.prayersPlaceholder}
                value={initialPrayers}
                onChange={(e) => setInitialPrayers(e.target.value)}
                rows={5}
                className="w-full rounded-lg bg-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-slate-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={!listName.trim()}
              className="w-full rounded-lg bg-slate-600 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t.createList}
            </button>
          </form>
        )}

        {/* Add single prayer form */}
        {mode === 'add-single' && (
          <form onSubmit={handleAddPrayer} className="space-y-4">
            <input
              type="text"
              placeholder={t.prayerTitle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg bg-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-slate-500"
              autoFocus
            />
            <textarea
              placeholder={t.descriptionOptional}
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
              maxLength={2000}
              rows={3}
              className="w-full rounded-lg bg-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-slate-500 resize-none"
            />
            <div className="text-right text-xs text-slate-500 -mt-3">{description.length}/2000</div>
            <ListPicker lists={lists} selected={selectedLists} onToggle={toggleList} />
            <button
              type="submit"
              disabled={selectedLists.length === 0 || !title.trim()}
              className="w-full rounded-lg bg-slate-600 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t.addPrayer}
            </button>
          </form>
        )}

      </div>
    </div>
  )
}

function ListPicker({
  lists,
  selected,
  onToggle,
}: {
  lists: PrayerList[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  const { t } = useT()
  if (lists.length === 0) {
    return <p className="text-sm text-slate-500 italic">{t.noListsCreateFirst}</p>
  }
  return (
    <div>
      <div className="mb-2 text-sm text-slate-400">{t.addToList}</div>
      <div className="flex flex-wrap gap-2">
        {lists.map((list) => (
          <button
            key={list.id}
            type="button"
            onClick={() => onToggle(list.id)}
            className={`rounded px-3 py-1 text-sm transition-colors ${
              selected.includes(list.id)
                ? 'bg-slate-500 text-white ring-2 ring-white'
                : 'bg-slate-700 text-slate-400'
            }`}
          >
            {list.name}
          </button>
        ))}
      </div>
    </div>
  )
}
