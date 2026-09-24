import { useState, useEffect } from 'react'
import { FileText, Plus, Check, X, Eye, Trash2 } from 'lucide-react'
import api from '../api/client'
import Modal from '../components/Modal'
import { PageLoader } from '../components/LoadingSpinner'

function StatusBadge({ status }) {
  const badges = {
    PENDING: 'badge-amber', APPROVED: 'badge-green',
    REJECTED: 'badge-red', COMPLETED: 'badge-blue',
  }
  return <span className={badges[status] || 'badge-gray'}>{status}</span>
}

export default function PurchaseOrders() {
  const [orders, setOrders] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewOrder, setViewOrder] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ supplier_id: '', notes: '', items: [{ product_id: '', quantity: 1, unit_price: '' }] })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const [ordRes, supRes, prodRes] = await Promise.all([
        api.get('/api/purchase-orders'),
        api.get('/api/suppliers'),
        api.get('/api/products'),
      ])
      setOrders(ordRes.data)
      setSuppliers(supRes.data)
      setProducts(prodRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOrders() }, [])

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/api/purchase-orders/${id}/status`, { status })
      fetchOrders()
      if (viewOrder?.id === id) {
        const res = await api.get(`/api/purchase-orders/${id}`)
        setViewOrder(res.data)
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update status')
    }
  }

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { product_id: '', quantity: 1, unit_price: '' }] }))
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  const updateItem = (i, field, val) => setForm(f => {
    const items = [...f.items]
    items[i] = { ...items[i], [field]: val }
    if (field === 'product_id') {
      const p = products.find(p => p.id === parseInt(val))
      if (p) items[i].unit_price = p.cost_price
    }
    return { ...f, items }
  })

  const handleCreate = async (e) => {
    e.preventDefault()
    if (form.items.some(it => !it.product_id || !it.quantity || !it.unit_price)) {
      setFormError('All items must have a product, quantity, and price')
      return
    }
    setSaving(true)
    try {
      await api.post('/api/purchase-orders', {
        supplier_id: parseInt(form.supplier_id),
        notes: form.notes,
        items: form.items.map(it => ({
          product_id: parseInt(it.product_id),
          quantity: parseInt(it.quantity),
          unit_price: parseFloat(it.unit_price),
        })),
      })
      setCreateOpen(false)
      fetchOrders()
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to create order')
    } finally {
      setSaving(false)
    }
  }

  const orderTotal = form.items.reduce((sum, it) =>
    sum + (parseFloat(it.unit_price || 0) * parseInt(it.quantity || 0)), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Purchase Orders</h1>
          <p className="page-subtitle">Manage procurement and restocking</p>
        </div>
        <button onClick={() => { setForm({ supplier_id: '', notes: '', items: [{ product_id: '', quantity: 1, unit_price: '' }] }); setFormError(''); setCreateOpen(true) }} className="btn-primary">
          <Plus size={16} /> New Order
        </button>
      </div>

      <div className="glass overflow-hidden">
        {loading ? <div className="p-12"><PageLoader /></div> : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <FileText size={40} className="mb-3 opacity-40" />
            <p className="font-medium">No purchase orders yet</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>PO #</th><th>Supplier</th><th>Status</th><th>Items</th><th>Total</th><th>Date</th><th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td className="font-mono text-xs text-slate-400">#{String(o.id).padStart(4, '0')}</td>
                  <td className="font-medium text-white">{o.supplier?.name || '—'}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="text-slate-400">{o.items?.length || 0} items</td>
                  <td className="font-semibold text-white">${o.total_amount.toFixed(2)}</td>
                  <td className="text-slate-400 text-sm">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setViewOrder(o)} className="p-1.5 rounded-lg hover:bg-white/[0.07] text-slate-400 hover:text-white transition-colors">
                        <Eye size={14} />
                      </button>
                      {o.status === 'PENDING' && (
                        <>
                          <button onClick={() => updateStatus(o.id, 'APPROVED')} className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 transition-colors" title="Approve">
                            <Check size={14} />
                          </button>
                          <button onClick={() => updateStatus(o.id, 'REJECTED')} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors" title="Reject">
                            <X size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* View Order Modal */}
      {viewOrder && (
        <Modal isOpen={!!viewOrder} onClose={() => setViewOrder(null)} title={`Purchase Order #${String(viewOrder.id).padStart(4, '0')}`} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-400">Supplier</span><p className="text-white font-medium mt-0.5">{viewOrder.supplier?.name}</p></div>
              <div><span className="text-slate-400">Status</span><p className="mt-0.5"><StatusBadge status={viewOrder.status} /></p></div>
              <div><span className="text-slate-400">Date</span><p className="text-white mt-0.5">{new Date(viewOrder.created_at).toLocaleString()}</p></div>
              <div><span className="text-slate-400">Total</span><p className="text-white font-bold mt-0.5 text-lg">${viewOrder.total_amount.toFixed(2)}</p></div>
              {viewOrder.notes && <div className="col-span-2"><span className="text-slate-400">Notes</span><p className="text-white mt-0.5">{viewOrder.notes}</p></div>}
            </div>
            <div className="border-t border-white/[0.06] pt-4">
              <p className="text-sm font-semibold text-slate-300 mb-3">Items</p>
              <table className="data-table">
                <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
                <tbody>
                  {viewOrder.items?.map(it => (
                    <tr key={it.id}>
                      <td className="text-white">{it.product?.name || `Product #${it.product_id}`}</td>
                      <td>{it.quantity}</td>
                      <td>${it.unit_price.toFixed(2)}</td>
                      <td className="font-semibold">${(it.quantity * it.unit_price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {viewOrder.status === 'PENDING' && (
              <div className="flex gap-3 pt-2">
                <button onClick={() => { updateStatus(viewOrder.id, 'APPROVED'); setViewOrder(null) }} className="btn-success flex-1 justify-center">
                  <Check size={14} /> Approve
                </button>
                <button onClick={() => { updateStatus(viewOrder.id, 'REJECTED'); setViewOrder(null) }} className="btn-danger flex-1 justify-center">
                  <X size={14} /> Reject
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Create Order Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Purchase Order" size="xl">
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{formError}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Supplier *</label>
              <select className="input" required value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
                <option value="">Select supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Notes</label>
              <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-300">Items</p>
              <button type="button" onClick={addItem} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                <Plus size={12} /> Add item
              </button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <select className="input" value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)}>
                      <option value="">Product</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input className="input" type="number" min="1" placeholder="Qty" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <input className="input" type="number" step="0.01" min="0" placeholder="Price" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} />
                  </div>
                  <div className="col-span-1 text-sm text-slate-400 text-right">
                    ${((parseFloat(item.unit_price || 0)) * parseInt(item.quantity || 0)).toFixed(0)}
                  </div>
                  <div className="col-span-1">
                    {form.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-dark-600/50 border border-white/[0.06] flex justify-between">
            <span className="text-slate-400 text-sm">Order Total</span>
            <span className="font-bold text-white">${orderTotal.toFixed(2)}</span>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Creating...' : 'Create Order'}</button>
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
