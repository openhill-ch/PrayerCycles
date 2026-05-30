import { NavLink } from 'react-router-dom'
import { Square, ScrollText, Clock, Hash } from 'lucide-react'
import { useT } from '../i18n'

type BottomNavProps = {
  onNavigate?: () => void
}

export function BottomNav({ onNavigate }: BottomNavProps) {
  const { t } = useT()

  const tabs = [
    { to: '/', icon: Square, label: t.navTapPray },
    { to: '/lists', icon: ScrollText, label: t.navPrayerLists },
    { to: '/timer', icon: Clock, label: t.navTimebox },
    { to: '/tags', icon: Hash, label: t.navPrayerTags },
  ] as const

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-base">
      <div className="mx-auto flex max-w-lg">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 pt-3 pb-6 text-xs transition-colors ${
                isActive ? 'text-text' : 'text-text-muted hover:text-text-secondary'
              }`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
