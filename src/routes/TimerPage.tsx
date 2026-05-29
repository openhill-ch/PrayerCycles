import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, RotateCcw, Dices, ChevronDown } from 'lucide-react'
import { FormattedText } from '../components/FormattedText'
import confetti from 'canvas-confetti'
import { useTimer, TODAY_ID } from '../context/TimerContext'
import { useT } from '../i18n'
import { isDevMode } from '../lib/devmode'

function EditableTime({
  seconds,
  onChangeSeconds,
  disabled,
}: {
  seconds: number
  onChangeSeconds: (s: number) => void
  disabled: boolean
}) {
  const [editingPart, setEditingPart] = useState<'min' | 'sec' | null>(null)
  const [editMin, setEditMin] = useState('')
  const [editSec, setEditSec] = useState('')
  const minRef = useRef<HTMLInputElement>(null)
  const secRef = useRef<HTMLInputElement>(null)

  const m = Math.floor(seconds / 60)
  const s = seconds % 60

  function startEdit(part: 'min' | 'sec') {
    if (disabled) return
    if (part === 'min') {
      setEditMin('')
      setEditSec(String(s))
    } else {
      setEditMin(String(m))
      setEditSec('')
    }
    setEditingPart(part)
    setTimeout(() => (part === 'min' ? minRef : secRef).current?.focus(), 0)
  }

  function commitEdit() {
    const mins = Math.max(0, Math.min(999, parseInt(editMin) || 0))
    const secs = Math.max(0, Math.min(59, parseInt(editSec) || 0))
    onChangeSeconds(mins * 60 + secs)
    setEditingPart(null)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditingPart(null)
    if (e.key === 'Tab' && editingPart === 'min') {
      e.preventDefault()
      // Save current min value, switch to editing seconds
      setEditMin(editMin || String(m))
      setEditingPart('sec')
      setEditSec('')
      setTimeout(() => secRef.current?.focus(), 0)
    }
  }

  const clickClass = disabled ? '' : 'cursor-pointer hover:text-accent-hover transition-colors'

  return (
    <div className="flex items-center gap-0.5 justify-center" onBlur={(e) => {
      if (editingPart && !e.currentTarget.contains(e.relatedTarget)) commitEdit()
    }}>
      {editingPart === 'min' ? (
        <input
          ref={minRef}
          type="text"
          inputMode="numeric"
          value={editMin}
          onChange={(e) => setEditMin(e.target.value.replace(/\D/g, ''))}
          onKeyDown={handleKeyDown}
          className="w-14 text-2xl font-mono font-bold rounded bg-input px-1 py-0.5 text-text text-center outline-none focus:ring-2 focus:ring-accent"
        />
      ) : (
        <span
          onClick={() => startEdit('min')}
          className={`text-3xl font-mono font-bold text-text tracking-wider ${clickClass}`}
          title={disabled ? undefined : 'Click to edit minutes'}
        >
          {m}
        </span>
      )}
      <span className="text-3xl font-mono font-bold text-text-muted">:</span>
      {editingPart === 'sec' ? (
        <input
          ref={secRef}
          type="text"
          inputMode="numeric"
          value={editSec}
          onChange={(e) => setEditSec(e.target.value.replace(/\D/g, ''))}
          onKeyDown={handleKeyDown}
          className="w-14 text-2xl font-mono font-bold rounded bg-input px-1 py-0.5 text-text text-center outline-none focus:ring-2 focus:ring-accent"
        />
      ) : (
        <span
          onClick={() => startEdit('sec')}
          className={`text-3xl font-mono font-bold text-text tracking-wider ${clickClass}`}
          title={disabled ? undefined : 'Click to edit seconds'}
        >
          {String(s).padStart(2, '0')}
        </span>
      )}
    </div>
  )
}

export function TimerPage() {
  const { t } = useT()
  const [localDropdown, setLocalDropdown] = useState(false)
  const {
    lists,
    selectedListId,
    prayers,
    prayerIncrement,
    timerMode,
    running,
    timeLeft,
    totalTime,
    currentIndex,
    incrementTimeLeft,
    setSelectedListId,
    setPrayerIncrement,
    setTimerMode,
    setCustomMinutes,
    setTimeLeft,
    handleStart,
    handlePause,
    handleReset,
    pickRandom,
    refreshLists,
  } = useTimer()

  const timeboxRef = useRef<HTMLDivElement>(null)
  const prevTimeLeftRef = useRef(timeLeft)
  const wasRunningRef = useRef(false)

  // Refresh lists when page is visited
  useEffect(() => { refreshLists() }, [refreshLists])

  // Confetti when timer completes
  const fireConfetti = useCallback(() => {
    const el = timeboxRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (rect.left + rect.width / 2) / window.innerWidth
    const y = (rect.top + rect.height / 2) / window.innerHeight

    const defaults = { origin: { x, y }, zIndex: 5, ticks: 160 }

    confetti({ ...defaults, particleCount: 150, spread: 360, startVelocity: 36, scalar: 1.3 })
    confetti({ ...defaults, particleCount: 100, spread: 180, startVelocity: 46, angle: 60 })
    confetti({ ...defaults, particleCount: 100, spread: 180, startVelocity: 46, angle: 120 })
  }, [])

  useEffect(() => {
    if (running) wasRunningRef.current = true
  }, [running])

  useEffect(() => {
    if (wasRunningRef.current && prevTimeLeftRef.current > 0 && timeLeft === 0 && !running && prayers.length > 0) {
      fireConfetti()
      wasRunningRef.current = false
    }
    prevTimeLeftRef.current = timeLeft
  }, [timeLeft, running, prayers.length, fireConfetti])

  // Dev Mode millisecond counter
  const devMode = isDevMode()
  const [millis, setMillis] = useState(0)
  const lastTickRef = useRef(performance.now())

  useEffect(() => {
    if (!devMode || !running) { setMillis(0); return }
    lastTickRef.current = performance.now()
    let rafId: number
    function tick() {
      const now = performance.now()
      const elapsed = now - lastTickRef.current
      // Reset every 1000ms (syncs with the 1s timer tick)
      setMillis(Math.floor(elapsed % 1000))
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [devMode, running])

  // Reset the millis base when timeLeft changes (a new second ticked)
  useEffect(() => {
    if (running) lastTickRef.current = performance.now()
  }, [timeLeft, running])

  const isToday = selectedListId === TODAY_ID
  const selectedList = isToday ? null : lists.find((l) => l.id === selectedListId)
  const displayName = isToday ? t.todaysPrayers : (selectedList?.name ?? t.selectAPrayerList)
  const hasSelection = isToday || !!selectedList
  const currentPrayer = prayers.length > 0 ? (prayers[currentIndex] ?? prayers[0]) : null
  const upcomingPrayers = currentPrayer
    ? prayers.slice((running || timeLeft < totalTime) ? currentIndex + 1 : 1)
    : []

  // Big timer: shows per-prayer countdown when running or paused mid-session
  const midSession = timeLeft > 0 && timeLeft < totalTime
  const bigTimerValue = (running || midSession) ? incrementTimeLeft : prayerIncrement
  // Total timer: shows total timebox countdown
  const totalTimerValue = timeLeft

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
      <div className="mx-auto max-w-2xl space-y-3">

        {/* List selector */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { if (!running) setLocalDropdown(!localDropdown) }}
              className={`flex-1 flex items-center justify-between rounded-lg bg-card px-4 py-3 text-left transition-colors border border-border hover:border-border-light ${running ? 'opacity-50' : ''}`}
            >
              <span className={`text-lg font-semibold ${hasSelection ? 'text-text' : 'text-text-muted'}`}>
                {displayName}
              </span>
              <ChevronDown size={18} className={`text-text-tertiary transition-transform ${localDropdown ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={pickRandom}
              className={`rounded-lg bg-card p-3 text-text-tertiary hover:text-text-secondary hover:bg-input transition-colors border border-border ${running ? 'opacity-50' : ''}`}
              title={t.pickRandomList}
            >
              <Dices size={20} />
            </button>
          </div>
          {localDropdown && !running && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setLocalDropdown(false)} />
              <div className="absolute z-50 mt-1 w-full rounded-lg bg-card border border-border shadow-lg overflow-y-auto max-h-72">
                <button
                  onClick={() => { setSelectedListId(TODAY_ID); setLocalDropdown(false) }}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-input transition-colors ${
                    isToday ? 'text-accent-text' : 'text-text-secondary'
                  }`}
                >
                  {t.todaysPrayers}
                </button>
                {lists.length > 0 && (
                  <div className="border-t border-border" />
                )}
                {lists.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => { setSelectedListId(list.id); setLocalDropdown(false) }}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-input transition-colors ${
                      selectedListId === list.id ? 'text-accent-text' : 'text-text-secondary'
                    }`}
                  >
                    {list.name}
                  </button>
                ))}
                {lists.length === 0 && (
                  <div className="px-4 py-3 text-sm text-text-muted italic">{t.noOtherLists}</div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Timebox */}
        <div ref={timeboxRef} className="relative z-10 rounded-lg bg-card border-2 border-accent-text/80 shadow-[0_0_14px_var(--color-accent-glow)] overflow-hidden">
          <div className="flex min-h-[240px]">

            {/* Left: current prayer with description */}
            <div className="flex-1 p-4 overflow-y-auto border-r border-border break-words">
              {currentPrayer ? (
                <div>
                  {running && (
                    <div className="text-xs text-accent-text uppercase tracking-wide mb-1">{t.nowPraying}</div>
                  )}
                  <h3 className="text-lg font-semibold text-text">{currentPrayer.title}</h3>
                  {currentPrayer.description && (
                    <FormattedText text={currentPrayer.description} className="mt-2 text-sm text-text-secondary" />
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-sm text-text-muted italic text-center">
                    {selectedListId ? t.noPrayersInThisList : t.selectAPrayerList}
                  </div>
                </div>
              )}
            </div>

            {/* Right: timers + controls */}
            <div className="relative w-56 flex flex-col items-center justify-center gap-3 p-4">

              {/* Auto-toggle — top right corner */}
              <button
                onClick={() => { if (!running) setTimerMode(timerMode === 'until-done' ? 'custom' : 'until-done') }}
                disabled={running}
                className={`absolute top-3 right-3 flex items-center gap-1.5 ${running ? 'opacity-50' : ''}`}
                title={timerMode === 'until-done' ? t.autoToggleOnTooltip : t.autoToggleOffTooltip}
              >
                <span className="text-[9px] text-text-muted whitespace-nowrap">{t.totalTimebox}</span>
                <div className={`relative w-7 h-[16px] rounded-full transition-colors duration-200 ${timerMode === 'until-done' ? 'bg-toggle' : 'bg-input'}`}>
                  <div className={`absolute top-[2px] h-[12px] w-[12px] rounded-full bg-white shadow transition-transform duration-200 ${timerMode === 'until-done' ? 'translate-x-[13px]' : 'translate-x-[2px]'}`} />
                </div>
              </button>

              {/* Timers — same size, separated by / */}
              <div className="flex items-end gap-1">
                <div className="text-center" title="Time per prayer — click to edit">
                  <div className="text-[10px] text-text-muted mb-1">{t.timePerPrayer}</div>
                  <EditableTime
                    seconds={bigTimerValue}
                    onChangeSeconds={setPrayerIncrement}
                    disabled={running}
                  />
                </div>
                <span className="text-2xl font-light text-border-light pb-[1px]">/</span>
                <div className="text-center" title="Total timebox — click to edit">
                  <div className="text-[10px] text-text-muted mb-1">{t.totalTimebox}</div>
                  <EditableTime
                    seconds={totalTimerValue}
                    onChangeSeconds={(s) => {
                      if (!running) {
                        setTimerMode('custom')
                        setCustomMinutes(Math.max(1, Math.ceil(s / 60)))
                        setTimeLeft(s)
                        // Auto-adjust time per prayer to fit evenly
                        if (prayers.length > 0) {
                          setPrayerIncrement(Math.max(1, Math.floor(s / prayers.length)))
                        }
                      }
                    }}
                    disabled={running}
                  />
                </div>
              </div>

              {/* Dev Mode milliseconds */}
              {devMode && (
                <div className="text-center -mt-1">
                  <span className="text-lg font-mono text-accent-text/70">
                    .{String(millis).padStart(3, '0')}
                  </span>
                </div>
              )}

              {/* Controls */}
              <div className="flex gap-2">
                {!running ? (
                  <button
                    onClick={handleStart}
                    disabled={!selectedListId || prayers.length === 0}
                    className="rounded-full bg-input p-2.5 text-text hover:bg-input-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label={t.startTimer}
                  >
                    <Play size={20} />
                  </button>
                ) : (
                  <button
                    onClick={handlePause}
                    className="rounded-full bg-input p-2.5 text-text hover:bg-input-hover transition-colors"
                    aria-label={t.pauseTimer}
                  >
                    <Pause size={20} />
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="rounded-full bg-input p-2.5 text-text-tertiary hover:bg-input-hover transition-colors"
                  aria-label={t.resetTimer}
                >
                  <RotateCcw size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Up next — below the timebox */}
        {upcomingPrayers.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-text-muted uppercase tracking-wide px-1">{t.upNext}</div>
            {upcomingPrayers.slice(0, 6).map((prayer, i) => (
              <div
                key={prayer.id}
                className="px-1"
                style={{ opacity: 1 - i * 0.15 }}
              >
                <div className="text-sm text-text-secondary">{prayer.title}</div>
              </div>
            ))}
            {upcomingPrayers.length > 6 && (
              <div className="px-1 text-xs text-border-light">
                {t.moreItems(upcomingPrayers.length - 6)}
              </div>
            )}
          </div>
        )}

        {selectedListId && prayers.length === 0 && (
          <p className="text-sm text-text-muted italic pt-2">{t.noPrayersInListYet}</p>
        )}
      </div>
    </div>
  )
}
