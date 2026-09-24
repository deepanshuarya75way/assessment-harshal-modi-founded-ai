import { useState, useEffect } from 'react'
import { Truck, Plus, Edit2, Trash2, Mail, Phone, MapPin } from 'lucide-react'
import api from '../api/client'
import Modal from '../components/Modal'
import { PageLoader } from '../components/LoadingSpinner'

const EMPTY_FORM = { name: '', email: '', phone: '', address: '' }

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editSupplier, setEditSupplier] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const fetchSuppliers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/suppliers')
      setSuppliers(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSuppliers() }, [])

  const openAdd = () => { setEditSupplier(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true) }
  const openEdit = (s) => { setEditSupplier(s); setForm({ name: s.name, email: s.email || '', phone: s.phone || '', address: s.address || '' }); setFormError(''); setModalOpen(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      if (editSupplier) {
        await api.put(`/api/suppliers/${editSupplier.id}`, form)
      } else {
        await api.post('/api/suppliers', form)
      }
      setModalOpen(false)
      fetchSuppliers()
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to save supplier')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/api/suppliers/${deleteId}`)
      setDeleteId(null)
      fetchSuppliers()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete supplier')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="page-subtitle">Manage your supplier network</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus size={16} /> Add Supplier</button>
      </div>

      {loading ? <div className="p-12"><PageLoader /></div> : suppliers.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center py-20 text-slate-500">
          <Truck size={40} className="mb-3 opacity-40" />
          <p className="font-medium">No suppliers yet</p>
          <p className="text-sm mt-1">Add your first supplier to start managing procurement</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map(s => (
            <div key={s.id} className="glass p-5 hover:border-brand-500/20 transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
                    <Truck size={18} className="text-brand-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{s.name}</h3>
                    <p className="text-xs text-slate-500">Supplier #{s.id}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-white/[0.07] text-slate-400 hover:text-white transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {s.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Mail size={13} className="shrink-0" />
                    <span className="truncate">{s.email}</span>
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Phone size={13} className="shrink-0" />
                    <span>{s.phone}</span>
                  </div>
                )}
                {s.address && (
                  <div className="flex items-start gap-2 text-sm text-slate-400">
                    <MapPin size={13} className="shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{s.address}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editSupplier ? 'Edit Supplier' : 'Add Supplier'}>
        <form onSubmit={handleSave} className="space-y-4">
          {formError && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{formError}</div>}
          {[
            { label: 'Supplier Name *', field: 'name', type: 'text', placeholder: 'TechCore Distributors', required: true },
            { label: 'Email', field: 'email', type: 'email', placeholder: 'orders@supplier.com' },
            { label: 'Phone', field: 'phone', type: 'text', placeholder: '+1-555-0100' },
            { label: 'Address', field: 'address', type: 'text', placeholder: '123 Supply St, City, State' },
          ].map(({ label, field, type, placeholder, required }) => (
            <div key={field}>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
              <input
                className="input"
                type={type}
                placeholder={placeholder}
                required={required}
                value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Saving...' : editSupplier ? 'Update Supplier' : 'Add Supplier'}
            </button>
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Supplier" size="sm">
        <p className="text-slate-300 mb-6">Delete this supplier? This won't affect existing products.</p>
        <div className="flex gap-3">
          <button onClick={handleDelete} className="btn-danger flex-1 justify-center">Delete</button>
          <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
        </div>
      </Modal>
    </div>
  )
}
