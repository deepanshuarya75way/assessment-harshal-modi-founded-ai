import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingCart, Truck, FileText,
  TrendingUp, BarChart3, Bot, Bell, Settings, ChevronRight,
  Zap, LogOut
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV_SECTIONS = [
  {
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/inventory',       icon: Package,       label: 'Inventory'       },
      { to: '/sales',           icon: ShoppingCart,  label: 'Sales'           },
      { to: '/suppliers',       icon: Truck,         label: 'Suppliers'       },
      { to: '/purchase-orders', icon: FileText,       label: 'Purchase Orders' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/forecasts',  icon: TrendingUp,  label: 'Forecasts'       },
      { to: '/analytics',  icon: BarChart3,   label: 'Analytics'       },
      { to: '/copilot',    icon: Bot,         label: 'Founded Copilot' },
      { to: '/alerts',     icon: Bell,        label: 'Alerts'          },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
]

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
    >
      <Icon size={16} />
      <span className="flex-1">{label}</span>
      {to === '/copilot' && (
        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-brand-500/30 text-brand-300 border border-brand-500/30">
          AI
        </span>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuth()

  const roleColors = { ADMIN: 'badge-red', MANAGER: 'badge-amber', STAFF: 'badge-gray' }

  return (
    <aside className="flex flex-col w-64 shrink-0 bg-dark-800 border-r border-white/[0.05] h-screen sticky top-0 overflow-y-auto">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.05]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-purple flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Founded</h1>
            <p className="text-[10px] text-slate-500 font-medium">Predict. Analyze. Decide. Act.</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-6">
        {NAV_SECTIONS.map((section, idx) => (
          <div key={idx}>
            {section.label && (
              <p className="section-label">{section.label}</p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavItem {...item} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User profile */}
      {user && (
        <div className="px-3 py-4 border-t border-white/[0.05]">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-dark-700/50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-purple flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <span className={`${roleColors[user.role] || 'badge-gray'} text-[9px] mt-0.5`}>
                {user.role}
              </span>
            </div>
            <button
              onClick={logout}
              className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
