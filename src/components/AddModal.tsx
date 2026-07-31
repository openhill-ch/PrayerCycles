import { useState, useEffect, useRef } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
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

const LIST_STEPS = ['name', 'cycle', 'people', 'lifecycle', 'details'] as const
const PRAYER_STEPS = ['who', 'list', 'details'] as const
type StepKey = (typeof LIST_STEPS)[number] | (typeof PRAYER_STEPS)[number]

/** Steps that open the keyboard when you land on them. */
const TEXT_STEPS: StepKey[] = ['name', 'who', 'people']

/** Fraction of the card you must drag before it commits to the next step. */
const COMMIT_RATIO = 0.28
/** px/ms — a quick flick commits even if you didn't drag far. */
const FLICK_VELOCITY = 0.4

export function AddModal({ open, onClose, onAdded }: AddModalProps) {
  const { t } = useT()
  const { refreshLists: refreshTimerLists } = useTimer()
  const [mode, setMode] = useState<Mode>('create-list')
  const [step, setStep] = useState(0)
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

  // Add prayer fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedListId, setSelectedListId] = useState('')
  const addDescRef = useRef<HTMLTextAreaElement>(null)
  const handleDescKeyDown = useDescriptionKeyDown(addDescRef, description, setDescription, 2000)
  const [prayerTags, setPrayerTags] = useState<string[]>([])

  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Swipe/drag state
  const trackRef = useRef<HTMLDivElement>(null)
  const [dragX, setDragX] = useState(0)
  const [animating, setAnimating] = useState(false)
  const gestureStart = useRef<{ x: number; y: number; t: number } | null>(null)
  const axis = useRef<'h' | 'v' | null>(null)

  const steps: readonly StepKey[] = mode === 'create-list' ? LIST_STEPS : PRAYER_STEPS
  const total = steps.length
  const current = steps[step]
  const isLast = step === total - 1

  useEffect(() => {
    if (open) {
      getAllLists().then(setLists)
      getAllTags().then(setExistingTags)
      setMode('create-list')
      setStep(0)
      setDragX(0)
    }
  }, [open])

  // On open, focus immediately so the keyboard rises with the modal as a single
  // motion (a delay here reads as the window "glitching" a moment later). When
  // moving between steps, wait for the slide to settle first.
  const justOpened = useRef(true)
  useEffect(() => {
    if (!open) {
      justOpened.current = true
      return
    }
    if (!TEXT_STEPS.includes(current)) return
    const delay = justOpened.current ? 0 : 340
    justOpened.current = false
    const id = setTimeout(() => {
      const panel = trackRef.current?.querySelector(`[data-step="${current}"]`)
      panel?.querySelector<HTMLElement>('input[type="text"], textarea')?.focus()
    }, delay)
    return () => clearTimeout(id)
  }, [open, current])

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
    setTitle('')
    setDescription('')
    setSelectedListId('')
    setPrayerTags([])
    setMode('create-list')
    setStep(0)
    setDragX(0)
    setSaveError(null)
    setSaving(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function switchMode(m: Mode) {
    setMode(m)
    setStep(0)
    setDragX(0)
    setSaveError(null)
  }

  /** Steps that need an answer before you can move past them. */
  function canLeave(index: number): boolean {
    const key = steps[index]
    if (key === 'name') return !!listName.trim()
    if (key === 'who') return !!title.trim()
    return true
  }

  function goTo(next: number) {
    if (next < 0 || next > total - 1) return
    if (next > step && !canLeave(step)) return
    setAnimating(true)
    setStep(next)
  }

  // ---- Drag handling -------------------------------------------------
  // touch-action: pan-y on the track means vertical scrolling stays native
  // and horizontal gestures come to us, with no preventDefault needed.
  function onTouchStart(e: React.TouchEvent) {
    if (saving) return
    const p = e.touches[0]
    gestureStart.current = { x: p.clientX, y: p.clientY, t: Date.now() }
    axis.current = null
    setAnimating(false)
  }

  function onTouchMove(e: React.TouchEvent) {
    const start = gestureStart.current
    if (!start) return
    const p = e.touches[0]
    const dx = p.clientX - start.x
    const dy = p.clientY - start.y

    if (!axis.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      axis.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
    }
    if (axis.current !== 'h') return

    // Rubber-band when there's nowhere to go that way.
    const blocked =
      (dx < 0 && (isLast || !canLeave(step))) || (dx > 0 && step === 0)
    setDragX(blocked ? dx * 0.22 : dx)
  }

  function onTouchEnd() {
    const start = gestureStart.current
    gestureStart.current = null
    const wasHorizontal = axis.current === 'h'
    axis.current = null
    if (!start || !wasHorizontal) return

    const width = trackRef.current?.offsetWidth || 320
    const elapsed = Math.max(Date.now() - start.t, 1)
    const velocity = Math.abs(dragX) / elapsed
    const commit = Math.abs(dragX) > width * COMMIT_RATIO || velocity > FLICK_VELOCITY

    setAnimating(true)
    if (commit) {
      if (dragX < 0) goTo(step + 1)
      else goTo(step - 1)
    }
    setDragX(0)
  }
  // --------------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Enter on a non-final step just advances.
    if (!isLast) {
      goTo(step + 1)
      return
    }
    setSaveError(null)
    setSaving(true)
    try {
      if (mode === 'create-list') {
        const titles = initialPrayers.split('\n').filter((x) => x.trim())
        await createList(
          listName.trim(),
          {
            cadence,
            persistence: { unit: persistenceUnit, every: persistenceEvery },
            lifecycle: { type: lifecycleType, ...(lifecycleType === 'finite' ? { retireAfter } : {}) },
          },
          listDescription.trim(),
          titles,
          listTags,
        )
        refreshTimerLists()
      } else {
        await createPrayer(title.trim(), [selectedListId || UNSCHEDULED_ID], description.trim(), prayerTags)
      }
      reset()
      onAdded()
      onClose()
    } catch (err) {
      setSaving(false)
      setSaveError(err instanceof Error ? `${err.name}: ${err.message}` : String(err))
    }
  }

  const allUnits: [PersistenceUnit, string][] = [
    ['wake', t.wake],
    ['passage', t.passage],
    ['season', t.season],
    ['orbit', t.orbit],
  ]

  function allowedUnits(c: Cadence): PersistenceUnit[] {
    if (c === 'daily') return ['wake']
    if (c === 'weekly') return ['wake', 'passage']
    if (c === 'monthly') return ['wake', 'passage', 'season']
    return ['wake', 'passage', 'season', 'orbit']
  }

  const visibleUnits = allUnits.filter(([unit]) => allowedUnits(cadence).includes(unit))
  const selectableLists = lists.filter((l) => l.status !== 'deleted' && l.id !== UNSCHEDULED_ID)

  if (!open) return null

  const inputClass =
    'w-full rounded-lg bg-input px-3 py-3 text-text placeholder-text-tertiary outline-none focus:ring-2 focus:ring-text-muted'
  const pill = (active: boolean) =>
    `rounded-lg px-4 py-2 text-sm capitalize transition-colors ${active ? 'bg-input-hover text-text' : 'bg-input text-text-tertiary'}`
  const question = 'text-base font-medium text-text'
  const helpText = 'text-sm text-text-tertiary'

  function renderStep(key: StepKey) {
    switch (key) {
      case 'name':
        return (
          <>
            <p className={question}>{t.qListName}</p>
            <input
              type="text"
              placeholder={t.listNameExample}
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              className={inputClass}
            />
          </>
        )

      case 'cycle':
        return (
          <>
            <p className={question}>{t.qHowOften}</p>
            <div className="flex flex-wrap gap-2">
              {(['daily', 'weekly', 'monthly', 'annually'] as Cadence[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCadence(c)
                    if (c === 'daily') {
                      setPersistenceUnit('wake')
                      setPersistenceEvery(1)
                    } else {
                      const allowed = allowedUnits(c)
                      if (!allowed.includes(persistenceUnit)) setPersistenceUnit(allowed[0])
                    }
                  }}
                  className={pill(cadence === c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-text-tertiary">{t.every}</span>
                {cadence === 'daily' ? (
                  <span className="w-14 rounded bg-input px-2 py-1 text-center text-sm text-text">1</span>
                ) : (
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={persistenceEvery}
                    onChange={(e) => setPersistenceEvery(Math.max(1, Math.min(99, Number(e.target.value))))}
                    className="w-14 rounded bg-input px-2 py-1 text-center text-sm text-text outline-none focus:ring-2 focus:ring-text-muted"
                  />
                )}
                {visibleUnits.map(([unit, label]) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => { if (cadence !== 'daily') setPersistenceUnit(unit) }}
                    className={pill(persistenceUnit === unit)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <p className={helpText}>{t.cycleHelp}</p>
          </>
        )

      case 'people':
        return (
          <>
            <p className={question}>{t.qWhoInList}</p>
            <textarea
              placeholder={t.prayersPlaceholder}
              value={initialPrayers}
              onChange={(e) => setInitialPrayers(e.target.value)}
              rows={7}
              className={`${inputClass} resize-none`}
            />
            <p className={helpText}>{t.peopleHelp}</p>
          </>
        )

      case 'lifecycle':
        return (
          <>
            <p className={question}>{t.qHowLong}</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setLifecycleType('indefinite')}
                className={`rounded-lg px-4 py-3 text-left text-sm transition-colors ${lifecycleType === 'indefinite' ? 'bg-input-hover text-text' : 'bg-input text-text-tertiary'}`}
              >
                {t.runsForever}
              </button>
              <button
                type="button"
                onClick={() => setLifecycleType('finite')}
                className={`rounded-lg px-4 py-3 text-left text-sm transition-colors ${lifecycleType === 'finite' ? 'bg-input-hover text-text' : 'bg-input text-text-tertiary'}`}
              >
                {t.endsAfterCycles}
              </button>
            </div>
            {lifecycleType === 'finite' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-tertiary">{t.retiresAfter}</span>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={retireAfter}
                  onChange={(e) => setRetireAfter(Math.max(1, Math.min(999, Number(e.target.value))))}
                  className="w-16 rounded bg-input px-2 py-1 text-center text-sm text-text outline-none focus:ring-2 focus:ring-text-muted"
                />
                <span className="text-sm text-text-tertiary">
                  {retireAfter === 1 ? t.completion : t.completions}
                </span>
              </div>
            )}
            <p className={helpText}>{t.lifecycleHelp}</p>
          </>
        )

      case 'who':
        return (
          <>
            <p className={question}>{t.whoToPray}</p>
            <input
              type="text"
              placeholder={t.prayerTitle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
            />
          </>
        )

      case 'list':
        return (
          <>
            <p className={question}>{t.qWhichList}</p>
            <select
              value={selectedListId}
              onChange={(e) => setSelectedListId(e.target.value)}
              className={`${inputClass} cursor-pointer appearance-none text-sm`}
            >
              <option value="">{t.unscheduled}</option>
              {selectableLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </>
        )

      case 'details':
        return (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <p className={question}>{t.qAnythingElse}</p>
              <span className="shrink-0 text-xs text-text-muted">{t.optionalStep}</span>
            </div>

            {mode === 'add-single' ? (
              <div>
                <div className="mb-1 flex items-center justify-between">
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
                  rows={4}
                  className={`${inputClass} resize-none`}
                />
              </div>
            ) : (
              <div>
                <textarea
                  placeholder={t.descriptionOptional}
                  value={listDescription}
                  onChange={(e) => setListDescription(e.target.value.slice(0, 500))}
                  rows={3}
                  maxLength={500}
                  className={`${inputClass} resize-none`}
                />
                <div className="mt-1 text-right text-xs text-text-muted">{listDescription.length}/500</div>
              </div>
            )}

            <div>
              <div className="mb-2 text-sm text-text-tertiary">{t.tags}</div>
              <TagInput
                tags={mode === 'add-single' ? prayerTags : listTags}
                onChange={mode === 'add-single' ? setPrayerTags : setListTags}
                placeholder={t.tagsPlaceholder}
                allTags={existingTags}
              />
            </div>

            {saveError && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2 text-xs text-red-300 break-words">
                Couldn't save: {saveError}
              </div>
            )}

            {/* The only action button in the wizard — everything else is a swipe. */}
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-input-hover py-3 text-sm font-medium text-text transition-colors hover:bg-input cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? '…' : mode === 'create-list' ? t.createList : t.addPrayer}
            </button>
          </>
        )
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-stretch justify-center bg-overlay p-3 sm:items-center"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      <div className="sheet-height flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-card shadow-xl">
        {/* Pinned header: back / progress / close */}
        <div className="shrink-0 px-5 pt-5">
          <div className="flex items-center justify-between">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => goTo(step - 1)}
                className="flex items-center gap-1 rounded-lg py-1 pr-2 text-sm text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer"
              >
                <ChevronLeft size={18} />
                {t.back}
              </button>
            ) : (
              <span className="text-sm font-semibold text-text">
                {mode === 'create-list' ? t.newPrayerList : t.newPrayer}
              </span>
            )}
            <div className="flex items-center gap-1">
              {/* Swiping is the main way through; this keeps it usable with a
                  mouse (and for anyone who can't swipe). */}
              {!isLast && (
                <button
                  type="button"
                  onClick={() => goTo(step + 1)}
                  disabled={!canLeave(step)}
                  aria-label={t.next}
                  className="rounded-full p-1 text-text-tertiary hover:bg-input hover:text-text-secondary transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={20} />
                </button>
              )}
              <button
                onClick={handleClose}
                className="rounded-full p-1 text-text-tertiary hover:bg-input"
                aria-label={t.close}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="mt-3 flex gap-1.5" aria-label={t.stepOf(step + 1, total)}>
            {steps.map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-accent' : 'bg-input'}`}
              />
            ))}
          </div>

          {step === 0 && (
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => switchMode('create-list')} className={pill(mode === 'create-list')}>
                {t.newPrayerList}
              </button>
              <button type="button" onClick={() => switchMode('add-single')} className={pill(mode === 'add-single')}>
                {t.newPrayer}
              </button>
            </div>
          )}
        </div>

        {/* Swipeable track — the card follows your finger and settles on release */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div
            ref={trackRef}
            className="min-h-0 flex-1 overflow-hidden"
            style={{ touchAction: 'pan-y' }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchEnd}
          >
            <div
              className="flex h-full"
              style={{
                width: `${total * 100}%`,
                transform: `translateX(calc(${(-step * 100) / total}% + ${dragX}px))`,
                transition: animating ? 'transform 320ms cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none',
              }}
              onTransitionEnd={() => setAnimating(false)}
            >
              {steps.map((s) => (
                <div
                  key={s}
                  data-step={s}
                  className="h-full shrink-0 space-y-4 overflow-y-auto px-5 py-5"
                  style={{ width: `${100 / total}%` }}
                >
                  {renderStep(s)}
                </div>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
