import { Menu, Search } from 'lucide-react'
import { useT } from '../i18n'

type SearchBarProps = {
  onMenuOpen: () => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
}

export function SearchBar({ onMenuOpen, searchQuery = '', onSearchChange }: SearchBarProps) {
  const { t } = useT()
  return (
    <div className="sticky top-0 z-40 bg-slate-900 px-4 pb-2 pt-4">
      <div className="mx-auto flex max-w-lg items-center gap-2">
        <button
          onClick={onMenuOpen}
          className="rounded-full p-2 text-slate-400 hover:bg-slate-800"
          aria-label={t.openMenu}
        >
          <Menu size={20} />
        </button>
        <div className="flex flex-1 items-center gap-2 rounded-full bg-slate-800 px-4 py-2">
          <Search size={16} className="text-slate-500" />
          <input
            type="text"
            placeholder={t.searchPrayers}
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
          />
        </div>
      </div>
    </div>
  )
}
