import { useT } from '../i18n'

export function HistoryPage() {
  const { t } = useT()
  return (
    <div className="flex flex-1 items-center justify-center text-slate-500">
      <p>{t.historyComingSoon}</p>
    </div>
  )
}
