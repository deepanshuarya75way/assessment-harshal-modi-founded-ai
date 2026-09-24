import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function KPICard({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'brand', loading = false }) {
  const colors = {
    brand:  { bg: 'bg-brand-500/10',   text: 'text-brand-400',   border: 'border-brand-500/20'  },
    green:  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    amber:  { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20'  },
    red:    { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20'    },
    purple: { bg: 'bg-purple-500/10',  text: 'text-purple-400',  border: 'border-purple-500/20' },
    cyan:   { bg: 'bg-cyan-500/10',    text: 'text-cyan-400',    border: 'border-cyan-500/20'   },
  }
  const c = colors[color] || colors.brand

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-slate-400'

  return (
    <div className="kpi-card group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{title}</p>
          {loading ? (
            <div className="h-8 w-28 bg-dark-500 rounded-lg animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
          )}
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={`flex-shrink-0 w-11 h-11 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center`}>
            <Icon size={20} className={c.text} />
          </div>
        )}
      </div>

      {trendValue !== undefined && (
        <div className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${trendColor}`}>
          <TrendIcon size={13} />
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  )
}
