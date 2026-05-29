import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import type { PrayerList, Prayer } from '../db/types'
import { getAllLists } from '../features/cycles/list-operations'
import { getPrayersByList, addTimePrayed } from '../features/prayers/prayer-operations'
import { getSurfacedPrayers, completePrayer, type SurfacedPrayer } from '../lib/surfacing'

type TimerMode = 'custom' | 'until-done'

export const TODAY_ID = '__today__'

type TimerState = {
  lists: PrayerList[]
  selectedListId: string | null
  prayers: Prayer[]
  surfacedPrayers: SurfacedPrayer[]
  dropdownOpen: boolean
  prayerIncrement: number
  timerMode: TimerMode
  customMinutes: number
  running: boolean
  timeLeft: number
  totalTime: number
  currentIndex: number
  incrementTimeLeft: number
  setSelectedListId: (id: string | null) => void
  setDropdownOpen: (open: boolean) => void
  setPrayerIncrement: (val: number) => void
  setTimerMode: (mode: TimerMode) => void
  setCustomMinutes: (val: number) => void
  setTimeLeft: (val: number) => void
  handleStart: () => void
  handlePause: () => void
  handleReset: () => void
  pickRandom: () => void
  refreshLists: () => void
  refreshPrayers: () => void
}

const TimerContext = createContext<TimerState | null>(null)

export function TimerProvider({ children }: { children: ReactNode }) {
  const [lists, setLists] = useState<PrayerList[]>([])
  const [selectedListId, setSelectedListId] = useState<string | null>(TODAY_ID)
  const [prayers, setPrayers] = useState<Prayer[]>([])
  const [surfacedPrayers, setSurfacedPrayers] = useState<SurfacedPrayer[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const [prayerIncrement, setPrayerIncrement] = useState(60)
  const [timerMode, setTimerMode] = useState<TimerMode>('custom')
  const [customMinutes, setCustomMinutes] = useState(20)
  const hasAutoSwitched = useRef(false)

  const [running, setRunning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const completedIndicesRef = useRef<Set<number>>(new Set())
  const timeAccumRef = useRef<Record<string, number>>({})
  const durationAccumRef = useRef<Record<string, number>>({})

  const refreshLists = useCallback(() => {
    getAllLists().then((all) => setLists(all.filter((l) => l.status === 'active')))
  }, [])

  useEffect(() => {
    refreshLists()
  }, [refreshLists])

  const loadPrayers = useCallback(() => {
    if (!selectedListId) { setPrayers([]); setSurfacedPrayers([]); return }
    if (selectedListId === TODAY_ID) {
      getSurfacedPrayers().then((surfaced) => {
        setSurfacedPrayers(surfaced)
        setPrayers(surfaced.map((s) => s.prayer))
      })
    } else {
      getPrayersByList(selectedListId).then((p) => {
        const active = p.filter((prayer) => !prayer.fulfilled)
        setPrayers(active)
        const list = lists.find((l) => l.id === selectedListId)
        const listName = list?.name ?? ''
        setSurfacedPrayers(active.map((prayer) => ({ prayer, listId: selectedListId, listName })))
      })
    }
  }, [selectedListId, lists])

  // Load prayers when list changes
  useEffect(() => {
    loadPrayers()
  }, [loadPrayers])

  const refreshPrayers = useCallback(() => {
    loadPrayers()
  }, [loadPrayers])

  // Auto-switch to until-done once prayers exist (avoids goofy 1:00/0:00 on first launch)
  useEffect(() => {
    if (!hasAutoSwitched.current && prayers.length > 0) {
      hasAutoSwitched.current = true
      setTimerMode('until-done')
    }
  }, [prayers.length])

  const totalTime = timerMode === 'until-done'
    ? prayers.length * prayerIncrement
    : customMinutes * 60

  // Derive currentIndex and per-prayer countdown from timeLeft
  const elapsed = totalTime - timeLeft
  const currentIndex = prayerIncrement > 0
    ? Math.min(Math.floor(elapsed / prayerIncrement), Math.max(0, prayers.length - 1))
    : 0
  const incrementTimeLeft = prayerIncrement > 0
    ? prayerIncrement - (elapsed % prayerIncrement)
    : 0

  const prevTotalTimeRef = useRef(totalTime)
  useEffect(() => {
    // Only reset timeLeft when totalTime actually changes (config change),
    // not when pausing/resuming
    if (prevTotalTimeRef.current !== totalTime && !running) {
      setTimeLeft(totalTime)
    }
    prevTotalTimeRef.current = totalTime
  }, [totalTime, running])

  // Track time per prayer and record completions when timer advances
  const prayersRef = useRef(prayers)
  const surfacedPrayersRef = useRef(surfacedPrayers)
  const selectedListIdRef = useRef(selectedListId)
  const prayerIncrementRef = useRef(prayerIncrement)
  const totalTimeRef = useRef(totalTime)
  useEffect(() => { prayersRef.current = prayers }, [prayers])
  useEffect(() => { surfacedPrayersRef.current = surfacedPrayers }, [surfacedPrayers])
  useEffect(() => { selectedListIdRef.current = selectedListId }, [selectedListId])
  useEffect(() => { prayerIncrementRef.current = prayerIncrement }, [prayerIncrement])
  useEffect(() => { totalTimeRef.current = totalTime }, [totalTime])

  // Get the correct listId for a prayer at an index (handles Today's Prayers which has mixed listIds)
  function getListIdForIndex(idx: number): string | null {
    const sp = surfacedPrayersRef.current
    if (sp[idx]) return sp[idx].listId
    const listId = selectedListIdRef.current
    return listId === TODAY_ID ? null : listId
  }

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Timer finished — complete the last prayer
            const pp = prayersRef.current
            const inc = prayerIncrementRef.current
            const tt = totalTimeRef.current
            if (pp.length > 0 && inc > 0) {
              // Count this last second for the current prayer
              const lastElapsed = tt - 1
              const lastActiveIdx = Math.min(Math.floor(lastElapsed / inc), Math.max(0, pp.length - 1))
              const lastActivePrayer = pp[lastActiveIdx]
              if (lastActivePrayer) {
                durationAccumRef.current[lastActivePrayer.id] = (durationAccumRef.current[lastActivePrayer.id] ?? 0) + 1
                timeAccumRef.current[lastActivePrayer.id] = (timeAccumRef.current[lastActivePrayer.id] ?? 0) + 1
              }

              const lastIdx = pp.length - 1
              if (!completedIndicesRef.current.has(lastIdx)) {
                completedIndicesRef.current.add(lastIdx)
                const lastPrayer = pp[lastIdx]
                const listId = getListIdForIndex(lastIdx)
                if (listId) {
                  const dur = durationAccumRef.current[lastPrayer.id] ?? 0
                  completePrayer(lastPrayer.id, listId, dur)
                }
              }
              // Flush accumulated time
              const accum = timeAccumRef.current
              for (const [pid, secs] of Object.entries(accum)) {
                if (secs > 0) addTimePrayed(pid, secs)
              }
              timeAccumRef.current = {}
              durationAccumRef.current = {}
            }
            setRunning(false)
            return 0
          }

          const pp = prayersRef.current
          const inc = prayerIncrementRef.current
          const tt = totalTimeRef.current

          if (pp.length > 0 && inc > 0) {
            const newTimeLeft = prev - 1
            const elapsed = tt - newTimeLeft
            const newIdx = Math.min(Math.floor(elapsed / inc), Math.max(0, pp.length - 1))
            const prevElapsed = tt - prev
            const prevIdx = Math.min(Math.floor(prevElapsed / inc), Math.max(0, pp.length - 1))

            // Track time for current prayer
            const currentPrayer = pp[prevIdx]
            if (currentPrayer) {
              timeAccumRef.current[currentPrayer.id] = (timeAccumRef.current[currentPrayer.id] ?? 0) + 1
              durationAccumRef.current[currentPrayer.id] = (durationAccumRef.current[currentPrayer.id] ?? 0) + 1
              // Flush totalTimePrayed every 10 seconds to avoid losing data
              if ((timeAccumRef.current[currentPrayer.id] ?? 0) >= 10) {
                addTimePrayed(currentPrayer.id, timeAccumRef.current[currentPrayer.id])
                timeAccumRef.current[currentPrayer.id] = 0
              }
            }

            // Timer advanced — complete the prayer we just moved past
            if (newIdx > prevIdx) {
              for (let i = prevIdx; i < newIdx; i++) {
                if (!completedIndicesRef.current.has(i)) {
                  completedIndicesRef.current.add(i)
                  const prayer = pp[i]
                  const listId = getListIdForIndex(i)
                  if (prayer && listId) {
                    const dur = durationAccumRef.current[prayer.id] ?? 0
                    completePrayer(prayer.id, listId, dur)
                    delete durationAccumRef.current[prayer.id]
                  }
                }
              }
            }
          }

          return prev - 1
        })
      }, 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      // Flush any remaining accumulated time when pausing
      const accum = timeAccumRef.current
      for (const [pid, secs] of Object.entries(accum)) {
        if (secs > 0) addTimePrayed(pid, secs)
      }
      timeAccumRef.current = {}
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  function handleStart() {
    if (selectedListId && prayers.length === 0) return
    if (totalTime === 0) return
    if (timeLeft === 0) {
      setTimeLeft(totalTime)
      completedIndicesRef.current = new Set()
      timeAccumRef.current = {}
      durationAccumRef.current = {}
    }
    setRunning(true)
  }

  function handlePause() { setRunning(false) }

  function handleReset() {
    setRunning(false)
    setTimeLeft(totalTime)
    completedIndicesRef.current = new Set()
    timeAccumRef.current = {}
    durationAccumRef.current = {}
  }

  function pickRandom() {
    if (running || lists.length === 0) return
    const random = lists[Math.floor(Math.random() * lists.length)]
    setSelectedListId(random.id)
  }

  return (
    <TimerContext.Provider value={{
      lists,
      selectedListId,
      prayers,
      surfacedPrayers,
      dropdownOpen,
      prayerIncrement,
      timerMode,
      customMinutes,
      running,
      timeLeft,
      totalTime,
      currentIndex,
      incrementTimeLeft,
      setSelectedListId,
      setDropdownOpen,
      setPrayerIncrement,
      setTimerMode,
      setCustomMinutes,
      setTimeLeft,
      handleStart,
      handlePause,
      handleReset,
      pickRandom,
      refreshLists,
      refreshPrayers,
    }}>
      {children}
    </TimerContext.Provider>
  )
}

export function useTimer() {
  const ctx = useContext(TimerContext)
  if (!ctx) throw new Error('useTimer must be used within TimerProvider')
  return ctx
}
