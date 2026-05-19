import { useState, useRef } from 'react'
import { Menu, ChevronDown, Play, Pause, RotateCcw } from 'lucide-react'
import { useTimer, TODAY_ID } from '../context/TimerContext'
import { useT } from '../i18n'

function BarTimer({
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
  }

  const clickClass = disabled ? '' : 'cursor-pointer hover:text-sky-200 transition-colors'

  return (
    <div className="flex items-center gap-0.5" onBlur={(e) => {
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
          className="w-8 font-mono font-semibold rounded bg-slate-700 px-1 py-0.5 text-slate-100 text-center outline-none focus:ring-2 focus:ring-sky-400"
        />
      ) : (
        <span onClick={() => startEdit('min')} className={`text-xs font-mono font-semibold text-slate-100 ${clickClass}`}>{m}</span>
      )}
      <span className="text-xs text-slate-500">:</span>
      {editingPart === 'sec' ? (
        <input
          ref={secRef}
          type="text"
          inputMode="numeric"
          value={editSec}
          onChange={(e) => setEditSec(e.target.value.replace(/\D/g, ''))}
          onKeyDown={handleKeyDown}
          className="w-8 font-mono font-semibold rounded bg-slate-700 px-1 py-0.5 text-slate-100 text-center outline-none focus:ring-2 focus:ring-sky-400"
        />
      ) : (
        <span onClick={() => startEdit('sec')} className={`text-xs font-mono font-semibold text-slate-100 ${clickClass}`}>{String(s).padStart(2, '0')}</span>
      )}
    </div>
  )
}

type TimerBarProps = {
  onMenuOpen: () => void
}

export function TimerBar({ onMenuOpen }: TimerBarProps) {
  const { t } = useT()
  const {
    lists,
    selectedListId,
    prayerIncrement,
    timerMode,
    running,
    timeLeft,
    totalTime,
    currentIndex,
    incrementTimeLeft,
    setSelectedListId,
    dropdownOpen,
    setDropdownOpen,
    setPrayerIncrement,
    setTimerMode,
    setCustomMinutes,
    setTimeLeft,
    prayers,
    handleStart,
    handlePause,
    handleReset,
  } = useTimer()

  const isToday = selectedListId === TODAY_ID
  const selectedList = isToday ? null : lists.find((l) => l.id === selectedListId)
  const displayName = isToday ? t.todaysPrayers : (selectedList?.name ?? t.selectAList)
  const hasSelection = isToday || !!selectedList

  const midSession = timeLeft > 0 && timeLeft < totalTime
  const bigTimerValue = (running || midSession) ? incrementTimeLeft : prayerIncrement
  const totalTimerValue = timeLeft
  const currentPrayer = prayers.length > 0 ? (prayers[currentIndex] ?? prayers[0]) : null
  const showPrayerTitle = running || midSession

  return (
    <div className="sticky top-0 z-40 bg-slate-900 px-4 pb-2 pt-4">
      <div className="mx-auto flex max-w-lg items-center gap-2">
        {/* Hamburger */}
        <button
          onClick={onMenuOpen}
          className="rounded-full p-2 text-slate-400 hover:bg-slate-800"
          aria-label={t.openMenu}
        >
          <Menu size={20} />
        </button>

        {/* Main bar pill */}
        <div className="relative flex flex-1 min-w-0 items-center gap-2 rounded-full bg-slate-800 px-3 py-1.5">
          {/* List selector or current prayer title */}
          {showPrayerTitle && currentPrayer ? (
            <div className="flex items-center gap-1.5 min-w-0 shrink">
              <span className="text-xs text-slate-500 shrink-0">{t.praying}</span>
              <span className="text-xs font-normal text-slate-300 truncate border-2 border-slate-500 rounded px-1.5 -my-px leading-tight">{currentPrayer.title}</span>
            </div>
          ) : (
            <button
              onClick={() => { if (!running) setDropdownOpen(!dropdownOpen) }}
              className="flex items-center gap-1 min-w-0 shrink"
            >
              <span className={`text-xs font-semibold truncate ${hasSelection ? 'text-slate-100' : 'text-slate-500'}`}>
                {displayName}
              </span>
              <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
          )}

          <div className="ml-auto flex items-center gap-2 shrink-0">
            {/* Timers: per prayer / total */}
            <div className="flex items-center gap-1">
              <BarTimer
                seconds={bigTimerValue}
                onChangeSeconds={setPrayerIncrement}
                disabled={running}
              />
              <span className="text-xs text-slate-600">/</span>
              <BarTimer
                seconds={totalTimerValue}
                onChangeSeconds={(s) => {
                  if (!running) {
                    setTimerMode('custom')
                    setCustomMinutes(Math.max(1, Math.ceil(s / 60)))
                    setTimeLeft(s)
                  }
                }}
                disabled={running}
              />
            </div>

            {/* Auto-toggle */}
            <button
              onClick={() => { if (!running) setTimerMode(timerMode === 'until-done' ? 'custom' : 'until-done') }}
              disabled={running}
              className={`flex items-center ${running ? 'opacity-50' : ''}`}
              title={timerMode === 'until-done' ? t.autoToggleOnTooltip : t.autoToggleOffTooltip}
            >
              <div className={`relative w-6 h-[14px] rounded-full transition-colors duration-200 ${timerMode === 'until-done' ? 'bg-green-500' : 'bg-slate-600'}`}>
                <div className={`absolute top-[2px] h-[10px] w-[10px] rounded-full bg-white shadow transition-transform duration-200 ${timerMode === 'until-done' ? 'translate-x-[12px]' : 'translate-x-[2px]'}`} />
              </div>
            </button>
          </div>

          {/* Dropdown */}
          {dropdownOpen && !running && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 shadow-lg overflow-hidden">
                <button
                  onClick={() => { setSelectedListId(TODAY_ID); setDropdownOpen(false) }}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-700 transition-colors ${
                    isToday ? 'text-sky-300' : 'text-slate-200'
                  }`}
                >
                  {t.todaysPrayers}
                </button>
                {lists.length > 0 && (
                  <div className="border-t border-slate-700" />
                )}
                {lists.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => { setSelectedListId(list.id); setDropdownOpen(false) }}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-700 transition-colors ${
                      selectedListId === list.id ? 'text-sky-300' : 'text-slate-200'
                    }`}
                  >
                    {list.name}
                  </button>
                ))}
                {lists.length === 0 && (
                  <div className="px-4 py-3 text-sm text-slate-500 italic">{t.noOtherLists}</div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Play/Pause + Reset */}
        <div className="flex items-center gap-0.5">
          {!running ? (
            <button
              onClick={handleStart}
              disabled={!selectedListId || prayers.length === 0}
              className="rounded-full p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label={t.startTimer}
            >
              <Play size={16} />
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="rounded-full p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              aria-label={t.pauseTimer}
            >
              <Pause size={16} />
            </button>
          )}
          <button
            onClick={handleReset}
            className="rounded-full p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            aria-label={t.resetTimer}
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
