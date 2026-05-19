import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useT } from '../i18n'
import type { PrayerList, Prayer } from '../db/types'
import { getAllLists } from '../features/cycles/list-operations'
import { getPrayersByList } from '../features/prayers/prayer-operations'
import { getSurfacedPrayers, type SurfacedPrayer } from '../lib/surfacing'
import { useTimer, TODAY_ID } from '../context/TimerContext'

function Highlight({ text, query }: { text: string; query: string }): ReactNode {
  if (!query) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-yellow-400/40 text-inherit rounded-sm px-0.5">{part}</mark>
      : part
  )
}

type ListWithPrayers = {
  list: PrayerList
  prayers: Prayer[]
}

export function ListsPage() {
  const { t } = useT()
  const [data, setData] = useState<ListWithPrayers[]>([])
  const [todayPrayers, setTodayPrayers] = useState<SurfacedPrayer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const { setSelectedListId } = useTimer()

  const load = useCallback(async () => {
    const [lists, surfaced] = await Promise.all([
      getAllLists(),
      getSurfacedPrayers(),
    ])
    const withPrayers = await Promise.all(
      lists.map(async (list) => ({
        list,
        prayers: await getPrayersByList(list.id),
      })),
    )
    setData(withPrayers)
    setTodayPrayers(surfaced)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const handler = () => load()
    window.addEventListener('prayercycles:refresh', handler)
    return () => window.removeEventListener('prayercycles:refresh', handler)
  }, [load])

  if (loading) {
    return <div className="flex h-40 items-center justify-center text-slate-500">{t.loading}</div>
  }

  const lower = searchQuery.toLowerCase()
  const filtered = lower
    ? data.filter((d) =>
        d.list.name.toLowerCase().includes(lower) ||
        d.list.description.toLowerCase().includes(lower) ||
        d.prayers.some((p) => p.title.toLowerCase().includes(lower) || p.description.toLowerCase().includes(lower))
      )
    : data
  const active = filtered.filter((d) => d.list.status === 'active')
  const archived = filtered.filter((d) => d.list.status === 'archived')

  // Filter today's prayers for search
  const todayFiltered = lower
    ? todayPrayers.filter((s) =>
        'today\'s prayers'.includes(lower) ||
        s.prayer.title.toLowerCase().includes(lower) ||
        s.prayer.description.toLowerCase().includes(lower)
      )
    : todayPrayers
  const showTodayCard = !lower || todayFiltered.length > 0 || 'today\'s prayers'.includes(lower)

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
      <div className="mx-auto max-w-2xl">
        {/* Inline search bar */}
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2">
          <Search size={16} className="text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder={t.searchPrayers}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
          />
        </div>

        <div className="columns-2 gap-3 md:columns-3 [&>*]:mb-3">
          {/* Today's Prayers virtual card */}
          {showTodayCard && (
            <TodayCard prayers={todayPrayers} onSelect={() => setSelectedListId(TODAY_ID)} query={searchQuery} />
          )}

          {active.length === 0 && archived.length === 0 && !showTodayCard && (
            <p className="pt-20 text-center text-slate-400">{t.noListsYet}</p>
          )}

          {active.map(({ list, prayers }) => (
            <ListCard key={list.id} list={list} prayers={prayers} query={searchQuery} />
          ))}

          {archived.length > 0 && (
            <>
              <div className="pt-4 text-xs font-medium uppercase tracking-wide text-slate-500 break-inside-avoid">
                {t.deactivated}
              </div>
              {archived.map(({ list, prayers }) => (
                <ListCard key={list.id} list={list} prayers={prayers} query={searchQuery} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function TodayCard({ prayers, onSelect, query }: { prayers: SurfacedPrayer[]; onSelect: () => void; query: string }) {
  const { t } = useT()
  const navigate = useNavigate()
  const MAX_VISIBLE = 30
  const visible = prayers.slice(0, MAX_VISIBLE)
  const overflow = prayers.length - MAX_VISIBLE

  return (
    <div
      className="rounded-lg pt-2 px-4 pb-4 shadow-md break-inside-avoid cursor-pointer bg-slate-800 hover:bg-slate-750 transition border-2 border-emerald-400/80 shadow-[0_0_14px_rgba(52,211,153,0.35)]"
      onClick={() => { onSelect(); navigate('/') }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') { onSelect(); navigate('/') } }}
    >
      <p className="text-xs text-emerald-400 leading-tight">{t.surfacedLabel}</p>
      <h3 className="text-lg font-semibold text-slate-100 -mt-0.5">{t.todaysPrayers}</h3>
      <p className="text-sm text-slate-300 mt-1">{t.todaysPrayersDesc}</p>

      <div className="mt-2 space-y-1">
        {visible.map((s) => (
          <div key={`${s.prayer.id}-${s.listId}`} className="text-sm text-slate-200">
            <Highlight text={s.prayer.title} query={query} />
          </div>
        ))}
        {overflow > 0 && (
          <div className="text-xs text-slate-400">{t.expand}</div>
        )}
        {prayers.length === 0 && (
          <div className="text-xs text-slate-400 italic">{t.noPrayersSurfaced}</div>
        )}
      </div>

      <div className="mt-3 text-xs text-emerald-300 text-right">
        {t.prayerCount(prayers.length)}
      </div>
    </div>
  )
}

const MAX_VISIBLE = 30

function ListCard({ list, prayers, query }: { list: PrayerList; prayers: Prayer[]; query: string }) {
  const { t } = useT()
  const navigate = useNavigate()
  const descRef = useRef<HTMLParagraphElement>(null)
  const [isClamped, setIsClamped] = useState(false)
  const isArchived = list.status === 'archived'

  useEffect(() => {
    const el = descRef.current
    if (el) setIsClamped(el.scrollHeight > el.clientHeight)
  }, [list.description])
  const pUnit = list.cycle.persistence.unit
  const pEvery = list.cycle.persistence.every
  const unitLabels: Record<string, [string, string]> = { wake: [t.day, t.days], passage: [t.week, t.weeks], season: [t.month, t.months], orbit: [t.year, t.years] }
  const [singular, plural] = unitLabels[pUnit] || [t.day, t.days]
  const freqLabel = t.everyUnit(pEvery, singular, plural)
  const lifecycleLabel = list.cycle.lifecycle.type === 'indefinite' ? t.timesInfinite : t.timesCount(list.cycle.lifecycle.retireAfter ?? 1)
  const visible = prayers.slice(0, MAX_VISIBLE)
  const overflow = prayers.length - MAX_VISIBLE

  return (
    <div
      className={`rounded-lg pt-2 px-4 pb-4 shadow-md break-inside-avoid cursor-pointer bg-slate-800 hover:bg-slate-750 transition border-2 border-sky-300/80 shadow-[0_0_14px_rgba(125,211,252,0.35)] ${isArchived ? 'opacity-50' : ''}`}
      onClick={() => navigate(`/lists/${list.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/lists/${list.id}`) }}
    >
      <p className="text-xs text-slate-400 leading-tight"><span className="capitalize">{list.cycle.cadence}</span> | {freqLabel} | {lifecycleLabel}</p>
      <h3 className="text-lg font-semibold text-slate-100 -mt-0.5"><Highlight text={list.name} query={query} /></h3>
      {list.description && (
        <div className="relative mt-1">
          <p ref={descRef} className="text-sm text-slate-300 line-clamp-5"><Highlight text={list.description} query={query} /></p>
          {isClamped && (
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-slate-800 to-transparent" />
          )}
        </div>
      )}

      <div className="mt-2 space-y-1">
        {visible.map((prayer) => (
          <div key={prayer.id} className="text-sm text-slate-200">
            <Highlight text={prayer.title} query={query} />
          </div>
        ))}
        {overflow > 0 && (
          <div className="text-xs text-slate-400">{t.expand}</div>
        )}
        {prayers.length === 0 && (
          <div className="text-xs text-slate-400 italic">{t.noPrayersYet}</div>
        )}
      </div>

      <div className="mt-3 text-xs text-sky-300 text-right">
        {list.completionTally}
      </div>
    </div>
  )
}
