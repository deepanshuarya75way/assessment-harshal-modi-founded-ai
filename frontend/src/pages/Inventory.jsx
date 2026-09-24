import { useState, useEffect } from 'react'
import { Package, Plus, Search, Edit2, Trash2, Filter, AlertTriangle, X, RefreshCw } from 'lucide-react'
import api from '../api/client'
import Modal from '../components/Modal'
import { PageLoader } from '../components/LoadingSpinner'

const EMPTY_FORM = {
  name: '', sku: '', category: '', price: '', cost_price: '',
  current_stock: '', minimum_stock: 10, supplier_id: '',
}

function StockBadge({ current, minimum }) {
  if (current === 0) return <span className="badge-red">Out of Stock</span>
  if (current <= minimum) return <span className="badge-amber">Low Stock</span>
  return <span className="badge-green">In Stock</span>
}

export default function Inventory() {
  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterLow, setFilterLow] = useState(false)
  const [categories, setCategories] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (filterCategory) params.category = filterCategory
      if (filterLow) params.low_stock_only = true
      const [prodRes, catRes, supRes] = await Promise.all([
        api.get('/api/products', { params }),
        api.get('/api/products/categories'),
        api.get('/api/suppliers'),
      ])
      setProducts(prodRes.data)
      setCategories(catRes.data)
      setSuppliers(supRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProducts() }, [search, filterCategory, filterLow])

  const openAdd = () => { setEditProduct(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true) }
  const openEdit = (p) => {
    setEditProduct(p)
    setForm({
      name: p.name, sku: p.sku, category: p.category || '',
      price: p.price, cost_price: p.cost_price,
      current_stock: p.current_stock, minimum_stock: p.minimum_stock,
      supplier_id: p.supplier_id || '',
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        cost_price: parseFloat(form.cost_price),
        current_stock: parseInt(form.current_stock),
        minimum_stock: parseInt(form.minimum_stock),
        supplier_id: form.supplier_id ? parseInt(form.supplier_id) : null,
      }
      if (editProduct) {
        await api.put(`/api/products/${editProduct.id}`, payload)
      } else {
        await api.post('/api/products', payload)
      }
      setModalOpen(false)
      fetchProducts()
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await api.delete(`/api/products/${deleteId}`)
      setDeleteId(null)
      fetchProducts()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete product')
    }
  }

  const fmtCurrency = (v) => `$${Number(v).toFixed(2)}`

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Manage products and stock levels</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="glass p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input pl-9"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-40"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={filterLow}
            onChange={e => setFilterLow(e.target.checked)}
            className="rounded accent-brand-500"
          />
          Low stock only
        </label>
        {(search || filterCategory || filterLow) && (
          <button onClick={() => { setSearch(''); setFilterCategory(''); setFilterLow(false) }} className="text-slate-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        )}
        <span className="ml-auto text-xs text-slate-500">{products.length} products</span>
      </div>

      {/* Table */}
      <div className="glass overflow-hidden">
        {loading ? (
          <div className="p-12"><PageLoader /></div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Package size={40} className="mb-3 opacity-40" />
            <p className="font-medium">No products found</p>
            <p className="text-sm mt-1">Add your first product to get started</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Cost</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Supplier</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                        <Package size={14} className="text-brand-400" />
                      </div>
                      <span className="font-medium text-white">{p.name}</span>
                    </div>
                  </td>
                  <td><span className="font-mono text-xs text-slate-400">{p.sku}</span></td>
                  <td><span className="badge-gray">{p.category || '—'}</span></td>
                  <td className="font-semibold text-white">{fmtCurrency(p.price)}</td>
                  <td className="text-slate-400">{fmtCurrency(p.cost_price)}</td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      {p.current_stock <= p.minimum_stock && p.current_stock > 0 && (
                        <AlertTriangle size={13} className="text-amber-400" />
                      )}
                      <span className={p.current_stock === 0 ? 'text-red-400' : 'text-white'}>
                        {p.current_stock}
                      </span>
                      <span className="text-slate-500 text-xs">/ {p.minimum_stock} min</span>
                    </div>
                  </td>
                  <td><StockBadge current={p.current_stock} minimum={p.minimum_stock} /></td>
                  <td className="text-slate-400 text-xs">{p.supplier?.name || '—'}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-white/[0.07] text-slate-400 hover:text-white transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editProduct ? 'Edit Product' : 'Add Product'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{formError}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Product Name *</label>
              <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Wireless Headphones" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">SKU *</label>
              <input className="input" required value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="e.g. ELEC-001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Category</label>
              <input className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Electronics" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Selling Price *</label>
              <input className="input" type="number" step="0.01" min="0" required value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Cost Price *</label>
              <input className="input" type="number" step="0.01" min="0" required value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Current Stock</label>
              <input className="input" type="number" min="0" value={form.current_stock} onChange={e => setForm(f => ({ ...f, current_stock: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Minimum Stock</label>
              <input className="input" type="number" min="0" value={form.minimum_stock} onChange={e => setForm(f => ({ ...f, minimum_stock: e.target.value }))} placeholder="10" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Supplier</label>
              <select className="input" value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
                <option value="">No supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Saving...' : editProduct ? 'Update Product' : 'Add Product'}
            </button>
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Product" size="sm">
        <p className="text-slate-300 mb-6">Are you sure you want to delete this product? This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={handleDelete} className="btn-danger flex-1 justify-center">Delete</button>
          <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
        </div>
      </Modal>
    </div>
  )
}
