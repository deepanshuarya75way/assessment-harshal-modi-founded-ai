import { useState, useEffect } from 'react'
import { BarChart2, RefreshCw } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts'
import api from '../api/client'
import { PageLoader } from '../components/LoadingSpinner'

const COLORS = ['#5065f8', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

export default function Analytics() {
  const [period, setPeriod] = useState(30)
  const [revenue, setRevenue] = useState([])
  const [categories, setCategories] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [anomalies, setAnomalies] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [revRes, catRes, topRes, anomRes] = await Promise.all([
        api.get(`/api/analytics/revenue?days=${period}`),
        api.get('/api/analytics/categories'),
        api.get('/api/analytics/top-products?limit=10'),
        api.get(`/api/analytics/anomalies?days=${period}`),
      ])
      setRevenue(revRes.data)
      setCategories(catRes.data)
      setTopProducts(topRes.data)
      setAnomalies(anomRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [period])

  if (loading) return <PageLoader text="Loading analytics..." />

  const totalRev = revenue.reduce((s, d) => s + d.revenue, 0)
  const totalUnits = revenue.reduce((s, d) => s + d.units_sold, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Business intelligence and performance insights</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl bg-dark-700 border border-white/[0.06] overflow-hidden">
            {[7, 30, 90, 365].map(d => (
              <button
                key={d}
                onClick={() => setPeriod(d)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === d ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {d === 365 ? '1Y' : `${d}D`}
              </button>
            ))}
          </div>
          <button onClick={fetchAll} className="btn-secondary"><RefreshCw size={14} /></button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Revenue', value: `$${totalRev.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, color: 'text-brand-400' },
          { label: 'Units Sold', value: totalUnits.toLocaleString(), color: 'text-purple-400' },
          { label: 'Avg Daily Revenue', value: `$${(totalRev / period).toFixed(0)}`, color: 'text-cyan-400' },
          { label: 'Anomalies Found', value: anomalies?.total_anomalies || 0, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="glass p-4">
            <p className="text-xs text-slate-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">Last {period} days</p>
          </div>
        ))}
      </div>

      {/* Revenue trend */}
      <div className="glass p-6">
        <h2 className="font-semibold text-white mb-1">Revenue Over Time</h2>
        <p className="text-xs text-slate-400 mb-5">Daily revenue for the last {period} days</p>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={revenue}>
            <defs>
              <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#5065f8" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#5065f8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tickFormatter={v => v.slice(5)} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={50} />
            <Tooltip contentStyle={{ background: '#161829', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '12px' }} />
            <Area type="monotone" dataKey="revenue" stroke="#5065f8" strokeWidth={2} fill="url(#revGrad2)" name="Revenue" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom two */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category breakdown */}
        <div className="glass p-6">
          <h2 className="font-semibold text-white mb-1">Revenue by Category</h2>
          <p className="text-xs text-slate-400 mb-5">Breakdown by product category</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={categories} dataKey="revenue" nameKey="category" cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={3}>
                {categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend formatter={(v) => <span className="text-xs text-slate-300">{v}</span>} />
              <Tooltip formatter={(v) => [`$${v.toFixed(2)}`, 'Revenue']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top products */}
        <div className="glass p-6">
          <h2 className="font-semibold text-white mb-1">Top Products by Revenue</h2>
          <p className="text-xs text-slate-400 mb-5">Best performing products</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topProducts.slice(0, 8)} layout="vertical" margin={{ left: 5, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="product_name" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={110} />
              <Tooltip formatter={(v) => [`$${v.toFixed(2)}`, 'Revenue']} />
              <Bar dataKey="total_revenue" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Anomalies */}
      {anomalies?.anomalies?.length > 0 && (
        <div className="glass p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-semibold text-white">Sales Anomalies</h2>
            <span className="badge-amber">{anomalies.total_anomalies} detected</span>
            <span className="text-xs text-slate-500">Method: {anomalies.method}</span>
          </div>
          <div className="space-y-2">
            {anomalies.anomalies.slice(0, 10).map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-dark-600/40 border border-white/[0.04]">
                <span className={`mt-0.5 badge ${a.z_score > 0 ? 'badge-amber' : 'badge-blue'}`}>
                  Z={a.z_score > 0 ? '+' : ''}{a.z_score}
                </span>
                <p className="text-sm text-slate-300">{a.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
