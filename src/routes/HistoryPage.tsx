import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useT } from '../i18n'
import { db } from '../db/db'
import type { Prayer, PrayerList } from '../db/types'
import { PrayerDetailModal } from '../components/PrayerDetailModal'

type PrayerEntry = {
  prayer: Prayer
  listName: string
  totalDuration: number
  count: number
}

type ListEntry = {
  list: PrayerList
  totalDuration: number
  completionCount: number
}

type DayGroup = {
  dateKey: string
  label: string
  entries: PrayerEntry[]
  listEntries: ListEntry[]
}

function getDateKey(timestamp: number, duration: number): string {
  const startTime = timestamp - duration * 1000
  const d = new Date(startTime)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return `${m}/${d}/${y} ${days[date.getDay()]}`
}

export function HistoryPage() {
  const { t } = useT()
  const navigate = useNavigate()
  const [dayGroups, setDayGroups] = useState<DayGroup[]>([])
  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null)
  const [listViewOnly, setListViewOnly] = useState(false)

  const load = useCallback(async () => {
    const logs = await db.prayerLogs.orderBy('prayedAt').reverse().toArray()
    if (logs.length === 0) { setDayGroups([]); return }

    const prayerIds = [...new Set(logs.map((l) => l.prayerId))]
    const listIds = [...new Set(logs.map((l) => l.listId))]
    const prayerMap = new Map<string, Prayer>()
    const listMap = new Map<string, PrayerList>()

    await Promise.all([
      ...prayerIds.map(async (id) => {
        const p = await db.prayers.get(id)
        if (p) prayerMap.set(id, p)
      }),
      ...listIds.map(async (id) => {
        const l = await db.prayerLists.get(id)
        if (l) listMap.set(id, l)
      }),
    ])

    // Group logs by date → prayer (for normal view)
    // and by date → list (for list view)
    const dayPrayerMap = new Map<string, Map<string, PrayerEntry>>()
    const dayListMap = new Map<string, Map<string, { list: PrayerList; totalDuration: number; prayerIds: Set<string> }>>()

    for (const log of logs) {
      const prayer = prayerMap.get(log.prayerId)
      if (!prayer) continue

      const dateKey = getDateKey(log.prayedAt, log.duration ?? 0)

      // Prayer view
      if (!dayPrayerMap.has(dateKey)) dayPrayerMap.set(dateKey, new Map())
      const prayerEntries = dayPrayerMap.get(dateKey)!
      if (prayerEntries.has(log.prayerId)) {
        const existing = prayerEntries.get(log.prayerId)!
        existing.totalDuration += log.duration ?? 0
        existing.count += 1
      } else {
        const list = listMap.get(log.listId)
        prayerEntries.set(log.prayerId, {
          prayer,
          listName: list?.name ?? '',
          totalDuration: log.duration ?? 0,
          count: 1,
        })
      }

      // List view — group by listId per day
      if (!dayListMap.has(dateKey)) dayListMap.set(dateKey, new Map())
      const listEntries = dayListMap.get(dateKey)!
      const list = listMap.get(log.listId)
      if (list) {
        if (listEntries.has(log.listId)) {
          const existing = listEntries.get(log.listId)!
          existing.totalDuration += log.duration ?? 0
          existing.prayerIds.add(log.prayerId)
        } else {
          listEntries.set(log.listId, {
            list,
            totalDuration: log.duration ?? 0,
            prayerIds: new Set([log.prayerId]),
          })
        }
      }
    }

    // Build list entries — count how many times ALL prayers in the list were completed that day
    const dayListEntries = new Map<string, ListEntry[]>()
    for (const [dateKey, listEntries] of dayListMap) {
      const entries: ListEntry[] = []
      for (const [, entry] of listEntries) {
        // Count completions: how many times every prayer in the queue was prayed
        // A "completion" = min times any prayer in the list was prayed that day
        const queue = entry.list.rotationState.queue
        if (queue.length === 0) continue

        // Get all logs for this list on this day
        const dayLogs = logs.filter((l) => {
          if (l.listId !== entry.list.id) return false
          return getDateKey(l.prayedAt, l.duration ?? 0) === dateKey
        })

        // Count per-prayer completions for this list
        const perPrayer = new Map<string, number>()
        for (const log of dayLogs) {
          perPrayer.set(log.prayerId, (perPrayer.get(log.prayerId) ?? 0) + 1)
        }

        // Min completions across all prayers in queue = full list completions
        const completionCount = queue.length > 0
          ? Math.min(...queue.map((pid) => perPrayer.get(pid) ?? 0))
          : 0

        if (completionCount > 0) {
          entries.push({
            list: entry.list,
            totalDuration: entry.totalDuration,
            completionCount,
          })
        }
      }
      dayListEntries.set(dateKey, entries)
    }

    const allKeys = new Set([...dayPrayerMap.keys(), ...dayListMap.keys()])
    const sortedKeys = [...allKeys].sort((a, b) => b.localeCompare(a))
    const result: DayGroup[] = sortedKeys.map((dateKey) => ({
      dateKey,
      label: formatDateLabel(dateKey),
      entries: [...(dayPrayerMap.get(dateKey)?.values() ?? [])],
      listEntries: dayListEntries.get(dateKey) ?? [],
    }))

    setDayGroups(result)
  }, [])

  useEffect(() => { load() }, [load])

  const filteredDays = listViewOnly
    ? dayGroups.filter((day) => day.listEntries.length > 0)
    : dayGroups

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-nav pt-4">
      <div className="mx-auto max-w-lg">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-1 text-sm text-text-tertiary hover:text-text-secondary"
        >
          <ArrowLeft size={16} />
          {t.back}
        </button>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-text">{t.prayerHistory}</h2>

          <button
            onClick={() => setListViewOnly(!listViewOnly)}
            className="flex items-center gap-2"
          >
            <span className="text-[10px] text-text-muted whitespace-nowrap">{t.prayerListView}</span>
            <div className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${listViewOnly ? 'bg-toggle' : 'bg-input'}`}>
              <div className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition-transform duration-200 ${listViewOnly ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
            </div>
          </button>
        </div>

        {filteredDays.length === 0 ? (
          <p className="text-sm text-text-muted italic pt-4">{t.noHistoryYet}</p>
        ) : (
          <div className="space-y-4">
            {filteredDays.map((day) => (
              <div key={day.dateKey}>
                <div className="border-b border-border pb-1 mb-2">
                  <span className="text-sm font-semibold text-text-secondary">{day.label}</span>
                </div>
                <div className="space-y-0.5">
                  {listViewOnly ? (
                    // List view: show completed prayer lists
                    day.listEntries.map((entry) => (
                      <div
                        key={entry.list.id}
                        className="w-full flex items-center rounded-lg px-3 py-2 text-sm"
                      >
                        <span className="flex-1 text-left text-text-secondary truncate">{entry.list.name}</span>
                        <span className="text-text-muted text-xs w-20 text-right shrink-0">{t.formatDuration(entry.totalDuration)}</span>
                        <span className="text-accent-text text-xs w-8 text-right shrink-0">{entry.completionCount}</span>
                      </div>
                    ))
                  ) : (
                    // Prayer view: show individual prayers
                    day.entries.map((entry) => (
                      <button
                        key={entry.prayer.id}
                        onClick={() => setSelectedPrayer(entry.prayer)}
                        className="w-full flex items-center rounded-lg px-3 py-2 text-sm hover:bg-card transition-colors"
                      >
                        <span className="flex-1 text-left text-text-secondary truncate">{entry.prayer.title}</span>
                        <span className="text-text-muted text-xs w-20 text-right shrink-0">{t.formatDuration(entry.totalDuration)}</span>
                        <span className="text-accent-text text-xs w-8 text-right shrink-0">{entry.count}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedPrayer && (
        <PrayerDetailModal
          prayer={selectedPrayer}
          onClose={() => setSelectedPrayer(null)}
          onUpdated={() => { setSelectedPrayer(null); load() }}
        />
      )}
    </div>
  )
}
