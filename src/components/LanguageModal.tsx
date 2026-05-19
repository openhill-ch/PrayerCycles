import { X, Check } from 'lucide-react'
import { useT, localeLabels, type Locale } from '../i18n'

type LanguageModalProps = {
  open: boolean
  onClose: () => void
}

const locales: Locale[] = ['en', 'ja', 'gsw', 'mn']

export function LanguageModal({ open, onClose }: LanguageModalProps) {
  const { locale, setLocale, t } = useT()

  function pick(l: Locale) {
    setLocale(l)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-slate-800 p-6 pb-24 sm:rounded-2xl sm:pb-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">{t.languages}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-700"
            aria-label={t.close}
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-1">
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => pick(l)}
              className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm transition-colors ${
                locale === l
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-200 hover:bg-slate-700'
              }`}
            >
              <span>{localeLabels[l]}</span>
              {locale === l && <Check size={16} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
