import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useT } from '../i18n'

export function TrashPage() {
  const { t } = useT()
  const navigate = useNavigate()

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
      <div className="mx-auto max-w-lg">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-300"
        >
          <ArrowLeft size={16} />
          {t.back}
        </button>

        <h2 className="text-xl font-semibold text-slate-100 mb-4">{t.deletedListsTitle}</h2>
        <p className="text-sm text-slate-500 italic pt-4">{t.noDeletedLists}</p>
      </div>
    </div>
  )
}
