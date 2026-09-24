import { useState, useEffect } from 'react'
import { Bell, AlertTriangle, Info, Zap, RefreshCw, Package } from 'lucide-react'
import api from '../api/client'
import { PageLoader } from '../components/LoadingSpinner'

const SEVERITY_CONFIG = {
  critical: { icon: AlertTriangle, badge: 'badge-red', border: 'border-red-500/20', bg: 'bg-red-500/5' },
  warning:  { icon: AlertTriangle, badge: 'badge-amber', border: 'border-amber-500/20', bg: 'bg-amber-500/5' },
  info:     { icon: Info, badge: 'badge-blue', border: 'border-brand-500/20', bg: 'bg-brand-500/5' },
}

const TYPE_LABELS = {
  low_stock: 'Low Stock',
  stockout_risk: 'Stockout Risk',
  sales_anomaly: 'Sales Anomaly',
}

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/alerts')
      setAlerts(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAlerts() }, [])

  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.type === filter || a.severity === filter)
  const critical = alerts.filter(a => a.severity === 'critical').length
  const warnings = alerts.filter(a => a.severity === 'warning').length

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Alerts</h1>
          <p className="page-subtitle">Real-time business intelligence alerts</p>
        </div>
        <button onClick={fetchAlerts} className="btn-secondary">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass p-4 border-red-500/20">
          <p className="text-xs text-slate-400 mb-1">Critical</p>
          <p className="text-2xl font-bold text-red-400">{critical}</p>
        </div>
        <div className="glass p-4 border-amber-500/20">
          <p className="text-xs text-slate-400 mb-1">Warnings</p>
          <p className="text-2xl font-bold text-amber-400">{warnings}</p>
        </div>
        <div className="glass p-4">
          <p className="text-xs text-slate-400 mb-1">Total Alerts</p>
          <p className="text-2xl font-bold text-white">{alerts.length}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { value: 'all', label: 'All' },
          { value: 'critical', label: 'Critical' },
          { value: 'warning', label: 'Warning' },
          { value: 'low_stock', label: 'Low Stock' },
          { value: 'stockout_risk', label: 'Stockout Risk' },
          { value: 'sales_anomaly', label: 'Anomalies' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === tab.value
                ? 'bg-brand-500 text-white'
                : 'bg-dark-700 text-slate-400 hover:text-white border border-white/[0.06]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alerts list */}
      {loading ? (
        <div className="p-12"><PageLoader /></div>
      ) : filtered.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center py-16 text-slate-500">
          <Bell size={40} className="mb-3 opacity-40" />
          <p className="font-medium">No alerts</p>
          <p className="text-sm mt-1">Your business is running smoothly! ✅</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(alert => {
            const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info
            const Icon = cfg.icon
            return (
              <div
                key={alert.id}
                className={`glass p-4 border ${cfg.border} ${cfg.bg} flex items-start gap-4 animate-slide-up`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                  <Icon size={18} className={
                    alert.severity === 'critical' ? 'text-red-400'
                    : alert.severity === 'warning' ? 'text-amber-400'
                    : 'text-brand-400'
                  } />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cfg.badge}>{alert.severity.toUpperCase()}</span>
                    <span className="badge-gray text-xs">{TYPE_LABELS[alert.type] || alert.type}</span>
                    <h3 className="text-sm font-semibold text-white">{alert.title}</h3>
                  </div>
                  <p className="text-sm text-slate-300">{alert.message}</p>
                  {alert.product_name && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                      <Package size={11} />
                      <span>{alert.product_name}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
