import { NavLink } from 'react-router-dom'
import { Square, ScrollText, Clock } from 'lucide-react'
import { useT } from '../i18n'

export function BottomNav() {
  const { t } = useT()

  const tabs = [
    { to: '/', icon: Square, label: t.navTapPray },
    { to: '/lists', icon: ScrollText, label: t.navPrayerLists },
    { to: '/timer', icon: Clock, label: t.navTimebox },
  ] as const

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-700 bg-slate-900">
      <div className="mx-auto flex max-w-lg">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 pt-3 pb-6 text-xs transition-colors ${
                isActive ? 'text-slate-100' : 'text-slate-500 hover:text-slate-300'
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
