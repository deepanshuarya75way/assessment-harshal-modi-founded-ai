import { useState, useEffect } from 'react'
import { ShoppingCart, Plus, Search, Calendar, Filter, X } from 'lucide-react'
import api from '../api/client'
import Modal from '../components/Modal'
import { PageLoader } from '../components/LoadingSpinner'

const EMPTY_FORM = { product_id: '', quantity: 1, unit_price: '', discount: 0, sale_date: '' }

export default function Sales() {
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchSales = async () => {
    setLoading(true)
    try {
      const params = {}
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate
      const [salesRes, prodRes] = await Promise.all([
        api.get('/api/sales', { params }),
        api.get('/api/products'),
      ])
      setSales(salesRes.data)
      setProducts(prodRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSales() }, [startDate, endDate])

  const selectedProduct = products.find(p => p.id === parseInt(form.product_id))

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setFormError('')
    setModalOpen(true)
  }

  const handleProductChange = (productId) => {
    const product = products.find(p => p.id === parseInt(productId))
    setForm(f => ({
      ...f,
      product_id: productId,
      unit_price: product ? product.price : '',
    }))
  }

  const totalAmount = form.unit_price && form.quantity
    ? (parseFloat(form.unit_price) * parseInt(form.quantity) * (1 - parseFloat(form.discount || 0) / 100)).toFixed(2)
    : '0.00'

  const handleSave = async (e) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      const payload = {
        product_id: parseInt(form.product_id),
        quantity: parseInt(form.quantity),
        unit_price: parseFloat(form.unit_price),
        discount: parseFloat(form.discount || 0),
        sale_date: form.sale_date || undefined,
      }
      await api.post('/api/sales', payload)
      setModalOpen(false)
      fetchSales()
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to record sale')
    } finally {
      setSaving(false)
    }
  }

  const filtered = sales.filter(s =>
    !search || s.product?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const totalRevenue = filtered.reduce((sum, s) => sum + s.total_amount, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Sales</h1>
          <p className="page-subtitle">Record and track all sales transactions</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={16} /> Record Sale
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Sales', value: filtered.length, suffix: 'transactions' },
          { label: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}`, suffix: 'this period' },
          { label: 'Avg. Order Value', value: filtered.length ? `$${(totalRevenue / filtered.length).toFixed(2)}` : '$0.00', suffix: 'per transaction' },
        ].map(s => (
          <div key={s.label} className="glass p-4">
            <p className="text-xs text-slate-400 mb-1">{s.label}</p>
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.suffix}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search by product..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-slate-400" />
          <input type="date" className="input w-40" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span className="text-slate-500 text-sm">to</span>
          <input type="date" className="input w-40" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        {(search || startDate || endDate) && (
          <button onClick={() => { setSearch(''); setStartDate(''); setEndDate('') }} className="text-slate-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        )}
        <span className="ml-auto text-xs text-slate-500">{filtered.length} records</span>
      </div>

      {/* Table */}
      <div className="glass overflow-hidden">
        {loading ? <div className="p-12"><PageLoader /></div> : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <ShoppingCart size={40} className="mb-3 opacity-40" />
            <p className="font-medium">No sales found</p>
            <p className="text-sm mt-1">Record your first sale to get started</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Discount</th>
                <th>Total</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <ShoppingCart size={14} className="text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{s.product?.name || `Product #${s.product_id}`}</p>
                        <p className="text-xs text-slate-500">{s.product?.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="font-semibold">{s.quantity}</td>
                  <td>${s.unit_price.toFixed(2)}</td>
                  <td>
                    {s.discount > 0
                      ? <span className="badge-amber">{s.discount}%</span>
                      : <span className="text-slate-500">—</span>
                    }
                  </td>
                  <td className="font-semibold text-emerald-400">${s.total_amount.toFixed(2)}</td>
                  <td className="text-slate-400 text-sm">{new Date(s.sale_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Record Sale Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record Sale">
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{formError}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Product *</label>
            <select
              className="input"
              required
              value={form.product_id}
              onChange={e => handleProductChange(e.target.value)}
            >
              <option value="">Select a product</option>
              {products.map(p => (
                <option key={p.id} value={p.id} disabled={p.current_stock === 0}>
                  {p.name} (Stock: {p.current_stock})
                </option>
              ))}
            </select>
            {selectedProduct && (
              <p className="text-xs text-slate-500 mt-1">
                Available: {selectedProduct.current_stock} units · Price: ${selectedProduct.price}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Quantity *</label>
              <input
                className="input"
                type="number"
                min="1"
                max={selectedProduct?.current_stock || 999}
                required
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Unit Price *</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0"
                required
                value={form.unit_price}
                onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Discount (%)</label>
              <input
                className="input"
                type="number"
                min="0"
                max="100"
                value={form.discount}
                onChange={e => setForm(f => ({ ...f, discount: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Sale Date</label>
              <input
                className="input"
                type="datetime-local"
                value={form.sale_date}
                onChange={e => setForm(f => ({ ...f, sale_date: e.target.value }))}
              />
            </div>
          </div>
          {/* Total preview */}
          <div className="p-3 rounded-xl bg-dark-600/50 border border-white/[0.06]">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Amount</span>
              <span className="font-bold text-emerald-400 text-lg">${totalAmount}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Recording...' : 'Record Sale'}
            </button>
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
