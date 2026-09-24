import { useState, useEffect } from 'react'
import { TrendingUp, RefreshCw, Package } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart
} from 'recharts'
import api from '../api/client'
import { PageLoader } from '../components/LoadingSpinner'

export default function Forecasts() {
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(false)
  const [productsLoading, setProductsLoading] = useState(true)
  const [metrics, setMetrics] = useState(null)

  useEffect(() => {
    api.get('/api/products').then(res => {
      setProducts(res.data)
      if (res.data.length > 0) {
        setSelectedProduct(res.data[0])
      }
    }).finally(() => setProductsLoading(false))
  }, [])

  useEffect(() => {
    if (selectedProduct) {
      fetchForecast(selectedProduct.id)
    }
  }, [selectedProduct])

  const fetchForecast = async (productId) => {
    setLoading(true)
    setForecast(null)
    try {
      const res = await api.get(`/api/forecast/${productId}`)
      setForecast(res.data)
      setMetrics(res.data.model_metrics)
    } finally {
      setLoading(false)
    }
  }

  // Build chart data: last 30 historical + 14 forecasted
  const chartData = (() => {
    if (!forecast) return []
    const hist = (forecast.historical_demand || []).slice(-30).map(d => ({
      date: d.date,
      actual: d.quantity,
      predicted: null,
      type: 'historical',
    }))
    const fcast = (forecast.forecasts || []).map(f => ({
      date: f.forecast_date?.slice(0, 10) || '',
      actual: null,
      predicted: parseFloat(f.predicted_demand.toFixed(2)),
      confidence: f.confidence,
      type: 'forecast',
    }))
    return [...hist, ...fcast]
  })()

  const splitIdx = chartData.findIndex(d => d.type === 'forecast')

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Demand Forecasts</h1>
          <p className="page-subtitle">ML-powered demand prediction for the next 14 days</p>
        </div>
        {selectedProduct && (
          <button onClick={() => fetchForecast(selectedProduct.id)} className="btn-secondary">
            <RefreshCw size={14} /> Refresh
          </button>
        )}
      </div>

      {/* Model metrics */}
      {metrics?.evaluation && (
        <div className="glass p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="badge-blue text-xs">RandomForestRegressor</span>
            <span className="text-xs text-slate-500">Trained on 2 years synthetic data · {metrics.train_samples?.toLocaleString()} samples</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'MAE', value: metrics.evaluation.MAE, desc: 'Mean Absolute Error' },
              { label: 'RMSE', value: metrics.evaluation.RMSE, desc: 'Root Mean Square Error' },
              { label: 'R²', value: metrics.evaluation.R2, desc: 'Coefficient of Determination' },
            ].map(m => (
              <div key={m.label} className="text-center">
                <p className="text-2xl font-bold text-brand-400">{m.value}</p>
                <p className="text-sm font-semibold text-white mt-0.5">{m.label}</p>
                <p className="text-xs text-slate-500">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Product selector */}
        <div className="glass p-4 lg:col-span-1 h-fit">
          <p className="text-sm font-semibold text-slate-300 mb-3">Select Product</p>
          {productsLoading ? <PageLoader size="sm" /> : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {products.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                    selectedProduct?.id === p.id
                      ? 'bg-brand-500/20 text-white border border-brand-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <p className="font-medium truncate">{p.name}</p>
                  <p className="text-xs opacity-60 mt-0.5">{p.sku}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Forecast chart */}
        <div className="glass p-6 lg:col-span-3">
          {!selectedProduct ? (
            <div className="flex items-center justify-center h-48 text-slate-500">
              <p>Select a product to view forecast</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-48">
              <PageLoader text="Generating forecast..." />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-white">{selectedProduct.name}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Historical demand (blue) + 14-day AI forecast (purple dashed)
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-brand-400 inline-block" /> Actual</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-purple-400 inline-block border-dashed border" /> Forecast</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={v => v.slice(5)}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    width={35}
                  />
                  <Tooltip
                    contentStyle={{ background: '#161829', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '12px' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  {splitIdx >= 0 && (
                    <ReferenceLine
                      x={chartData[splitIdx]?.date}
                      stroke="rgba(255,255,255,0.15)"
                      strokeDasharray="4 4"
                      label={{ value: 'Today', position: 'insideTopLeft', fill: '#64748b', fontSize: 10 }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#5065f8"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    name="Actual Demand"
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={{ fill: '#8b5cf6', strokeWidth: 0, r: 3 }}
                    connectNulls={false}
                    name="Predicted Demand"
                  />
                </LineChart>
              </ResponsiveContainer>

              {/* Forecast table */}
              {forecast?.forecasts?.length > 0 && (
                <div className="mt-4 border-t border-white/[0.06] pt-4">
                  <p className="text-sm font-semibold text-slate-300 mb-3">14-Day Forecast</p>
                  <div className="grid grid-cols-7 gap-2">
                    {forecast.forecasts.slice(0, 14).map((f, i) => (
                      <div key={i} className="text-center glass-sm p-2">
                        <p className="text-[10px] text-slate-500">{f.forecast_date?.slice(5, 10)}</p>
                        <p className="text-sm font-bold text-purple-400 mt-0.5">{f.predicted_demand.toFixed(0)}</p>
                        <p className="text-[9px] text-slate-600">{(f.confidence * 100).toFixed(0)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
