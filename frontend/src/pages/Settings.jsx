import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Settings as SettingsIcon, User, Shield, Database, Bot, Check } from 'lucide-react'

export default function Settings() {
  const { user } = useAuth()
  const [saved, setSaved] = useState(false)

  const show = () => { setSaved(true); setTimeout(() => setSaved(false), 2500) }

  const roleColors = { ADMIN: 'text-red-400', MANAGER: 'text-amber-400', STAFF: 'text-slate-400' }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and platform configuration</p>
      </div>

      {/* Profile */}
      <div className="glass p-6">
        <div className="flex items-center gap-3 mb-5">
          <User size={18} className="text-brand-400" />
          <h2 className="font-semibold text-white">Profile</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-purple flex items-center justify-center text-xl font-bold text-white">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-white">{user?.name}</p>
              <p className="text-sm text-slate-400">{user?.email}</p>
              <p className={`text-xs font-semibold mt-0.5 ${roleColors[user?.role]}`}>{user?.role}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Display Name</label>
              <input className="input" defaultValue={user?.name} />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Email</label>
              <input className="input" defaultValue={user?.email} type="email" />
            </div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="glass p-6">
        <div className="flex items-center gap-3 mb-5">
          <Shield size={18} className="text-amber-400" />
          <h2 className="font-semibold text-white">Security</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">New Password</label>
            <input className="input" type="password" placeholder="Enter new password..." />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Confirm Password</label>
            <input className="input" type="password" placeholder="Confirm new password..." />
          </div>
        </div>
      </div>

      {/* AI Copilot config */}
      <div className="glass p-6">
        <div className="flex items-center gap-3 mb-5">
          <Bot size={18} className="text-purple-400" />
          <h2 className="font-semibold text-white">AI Copilot Configuration</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-brand-500/5 border border-brand-500/20">
            <Bot size={16} className="text-brand-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">OpenAI Integration</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure your <code className="text-brand-400 font-mono">OPENAI_API_KEY</code> in the
                <code className="text-brand-400 font-mono"> .env</code> file to enable full AI capabilities.
                Without a key, the Copilot uses intelligent rule-based responses.
              </p>
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">AI Model</label>
            <select className="input">
              <option>gpt-4o-mini (Recommended)</option>
              <option>gpt-4o</option>
              <option>gpt-3.5-turbo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Platform info */}
      <div className="glass p-6">
        <div className="flex items-center gap-3 mb-5">
          <Database size={18} className="text-cyan-400" />
          <h2 className="font-semibold text-white">Platform</h2>
        </div>
        <div className="space-y-3 text-sm">
          {[
            { label: 'Application', value: 'Founded AI v1.0.0' },
            { label: 'Tagline', value: 'Predict. Analyze. Decide. Act.' },
            { label: 'ML Model', value: 'RandomForestRegressor (trained on startup)' },
            { label: 'Anomaly Detection', value: 'Z-score method (|z| > 2.0)' },
            { label: 'Auth', value: 'JWT with bcrypt password hashing' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-2 border-b border-white/[0.04] last:border-0">
              <span className="text-slate-400">{label}</span>
              <span className="text-slate-200 text-right">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={show} className="btn-primary">
        {saved ? <><Check size={15} /> Saved!</> : 'Save Changes'}
      </button>
    </div>
  )
}
