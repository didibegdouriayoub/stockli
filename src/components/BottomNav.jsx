import { NavLink } from 'react-router-dom'
import { IconSell, IconStock, IconHistory, IconDashboard } from './icons'

const TABS = [
  { to: '/', label: 'البيع', Icon: IconSell, end: true },
  { to: '/stock', label: 'المخزون', Icon: IconStock },
  { to: '/history', label: 'السجل', Icon: IconHistory },
  { to: '/dashboard', label: 'لوحة التحكم', Icon: IconDashboard },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="التنقل الرئيسي">
      {TABS.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => 'bottom-nav-item' + (isActive ? ' active' : '')}
        >
          <Icon width={24} height={24} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
