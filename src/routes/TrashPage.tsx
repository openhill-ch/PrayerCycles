import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'
import { useT } from '../i18n'
import { getDeletedLists, restoreList } from '../features/cycles/list-operations'
import { getPrayersByList } from '../features/prayers/prayer-operations'
import type { PrayerList, Prayer } from '../db/types'

const FIFTY_DAYS_MS = 50 * 24 * 60 * 60 * 1000

type DeletedListWithPrayers = {
  list: PrayerList
  prayers: Prayer[]
}

export function TrashPage() {
  const { t } = useT()
  const navigate = useNavigate()
  const [data, setData] = useState<DeletedListWithPrayers[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    const lists = await getDeletedLists()
    const withPrayers = await Promise.all(
      lists.map(async (list) => ({
        list,
        prayers: await getPrayersByList(list.id),
      })),
    )
    setData(withPrayers)
  }, [])

  useEffect(() => {
    load()
    window.addEventListener('prayercycles:refresh', load)
    return () => window.removeEventListener('prayercycles:refresh', load)
  }, [load])

  const handleRestore = async (id: string) => {
    await restoreList(id)
    load()
    window.dispatchEvent(new Event('prayercycles:refresh'))
  }

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const daysRemaining = (deletedAt: number | undefined) => {
    if (!deletedAt) return 50
    const elapsed = Date.now() - deletedAt
    const remaining = Math.ceil((FIFTY_DAYS_MS - elapsed) / (24 * 60 * 60 * 1000))
    return Math.max(1, remaining)
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
      <div className="mx-auto max-w-lg">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-1 text-sm text-text-tertiary hover:text-text-secondary"
        >
          <ArrowLeft size={16} />
          {t.back}
        </button>

        <h2 className="text-xl font-semibold text-text mb-2">{t.deletedListsTitle}</h2>
        <p className="text-xs text-text-muted mb-4">{t.deletedListsDesc}</p>

        {data.length === 0 ? (
          <p className="text-sm text-text-muted italic pt-4">{t.noDeletedLists}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {data.map(({ list, prayers }) => {
              const isExpanded = expanded.has(list.id)
              return (
                <div key={list.id} className="rounded-lg bg-card overflow-hidden">
                  <div className="flex items-center px-4 py-3">
                    <button
                      onClick={() => toggleExpanded(list.id)}
                      className="min-w-0 flex-1 flex items-center gap-2 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-secondary">{list.name}</p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {t.daysUntilDeletion(daysRemaining(list.deletedAt))} · {t.prayerCount(prayers.length)}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={16} className="text-text-muted shrink-0" />
                      ) : (
                        <ChevronDown size={16} className="text-text-muted shrink-0" />
                      )}
                    </button>
                    <button
                      onClick={() => handleRestore(list.id)}
                      className="ml-3 flex items-center gap-1.5 rounded-md bg-input px-3 py-1.5 text-xs text-text-secondary hover:bg-input-hover hover:text-text shrink-0"
                    >
                      <RotateCcw size={14} />
                      {t.restore}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border px-4 py-2 space-y-1">
                      {prayers.length === 0 ? (
                        <p className="text-xs text-text-muted italic py-1">{t.noPrayersYet}</p>
                      ) : (
                        prayers.map((prayer) => (
                          <div key={prayer.id} className="text-sm text-text-secondary py-0.5">
                            {prayer.title}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
