import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  DollarSign, Package, AlertTriangle, Zap, TrendingUp,
  ShoppingCart, RefreshCw, ArrowRight
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts'
import { Link } from 'react-router-dom'
import api from '../api/client'
import KPICard from '../components/KPICard'
import { PageLoader } from '../components/LoadingSpinner'

const COLORS = ['#5065f8', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="glass-sm px-3 py-2 text-xs">
        <p className="text-slate-300 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-semibold">
            {p.name === 'revenue' ? `$${p.value?.toFixed(2)}` : `${p.value} units`}
          </p>
        ))}
      </div>
    )
  }
  return null
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [revenue, setRevenue] = useState([])
  const [categories, setCategories] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [recentSales, setRecentSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchAll = async () => {
    setLoading(true)
    setError('')
    try {
      const [statsRes, revRes, catRes, topRes, salesRes] = await Promise.all([
        api.get('/api/analytics/dashboard'),
        api.get('/api/analytics/revenue?days=30'),
        api.get('/api/analytics/categories'),
        api.get('/api/analytics/top-products?limit=5'),
        api.get('/api/sales?limit=5'),
      ])
      setStats(statsRes.data)
      setRevenue(revRes.data)
      setCategories(catRes.data)
      setTopProducts(topRes.data)
      setRecentSales(salesRes.data)
    } catch {
      setError('Failed to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  if (loading) return <PageLoader text="Loading Founded Intelligence..." />
  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-red-400">{error}</p>
      <button onClick={fetchAll} className="btn-secondary"><RefreshCw size={14}/> Retry</button>
    </div>
  )

  const fmtCurrency = (v) => `$${(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Founded Intelligence
          </h1>
          <p className="mt-1 text-slate-400">Your business, understood.</p>
        </div>
        <button onClick={fetchAll} className="btn-secondary">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Greeting */}
      <div className="glass p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-purple flex items-center justify-center shrink-0">
          <Zap size={20} className="text-white" />
        </div>
        <div>
          <p className="text-white font-semibold">
            {getGreeting()}, {user?.name?.split(' ')[0]} 👋
          </p>
          <p className="text-sm text-slate-400">Here's what is happening across your business.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Revenue"
          value={fmtCurrency(stats?.total_revenue)}
          icon={DollarSign}
          color="brand"
          subtitle={`${stats?.total_sales?.toLocaleString() || 0} transactions`}
        />
        <KPICard
          title="Products"
          value={stats?.total_products || 0}
          icon={Package}
          color="purple"
          subtitle={`$${(stats?.total_inventory_value || 0).toLocaleString()} inventory value`}
        />
        <KPICard
          title="Low Stock"
          value={stats?.low_stock_count || 0}
          icon={AlertTriangle}
          color="amber"
          subtitle="Products below minimum"
        />
        <KPICard
          title="Stock-out Risk"
          value={stats?.high_risk_count || 0}
          icon={TrendingUp}
          color="red"
          subtitle="High-risk products"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 glass p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-white">Revenue Trend</h2>
              <p className="text-xs text-slate-400">Last 30 days</p>
            </div>
            <span className="badge-blue text-[10px]">Daily</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenue} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5065f8" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#5065f8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                tickFormatter={v => v.slice(5)}
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#5065f8"
                strokeWidth={2}
                fill="url(#revenueGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category pie */}
        <div className="glass p-6">
          <h2 className="font-semibold text-white mb-1">Category Revenue</h2>
          <p className="text-xs text-slate-400 mb-5">By product category</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={categories}
                dataKey="revenue"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
              >
                {categories.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`$${v.toFixed(0)}`, 'Revenue']} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="mt-2 space-y-1.5">
            {categories.slice(0, 5).map((cat, i) => (
              <li key={cat.category} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-slate-300 flex-1 truncate">{cat.category}</span>
                <span className="text-slate-400">${cat.revenue.toFixed(0)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="glass p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-white">Top Products</h2>
              <p className="text-xs text-slate-400">By revenue</p>
            </div>
            <Link to="/analytics" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topProducts} layout="vertical" margin={{ left: 5, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="product_name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={120} />
              <Tooltip formatter={(v) => [`$${v.toFixed(2)}`, 'Revenue']} />
              <Bar dataKey="total_revenue" fill="#5065f8" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Sales */}
        <div className="glass p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-white">Recent Sales</h2>
              <p className="text-xs text-slate-400">Latest transactions</p>
            </div>
            <Link to="/sales" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {recentSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-500">
              <ShoppingCart size={24} className="mb-2 opacity-50" />
              <p className="text-sm">No sales yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSales.map(sale => (
                <div key={sale.id} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                    <ShoppingCart size={14} className="text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{sale.product?.name || `Product #${sale.product_id}`}</p>
                    <p className="text-xs text-slate-500">{sale.quantity} units · {new Date(sale.sale_date).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-400">{fmtCurrency(sale.total_amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
