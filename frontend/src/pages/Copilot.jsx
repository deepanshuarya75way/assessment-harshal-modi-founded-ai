import { useState, useRef, useEffect } from 'react'
import { Bot, Send, User, Zap, Loader2, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react'
import api from '../api/client'

const SUGGESTED_PROMPTS = [
  'Which products should I reorder?',
  'Show me my best-selling products.',
  'What is my revenue this month?',
  'Which products are at risk of running out?',
  'Analyze my inventory.',
  'What products are low in stock?',
]

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex items-start gap-3 animate-slide-up ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
        isUser
          ? 'bg-brand-500'
          : 'bg-gradient-to-br from-brand-500/30 to-accent-purple/30 border border-brand-500/20'
      }`}>
        {isUser ? <User size={15} className="text-white" /> : <Bot size={15} className="text-brand-300" />}
      </div>
      <div className={`flex-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {msg.tool_used && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-0.5">
            <Zap size={10} className="text-brand-400" />
            <span>Used tool: <span className="text-brand-400 font-mono">{msg.tool_used}</span></span>
          </div>
        )}
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-brand-500 text-white rounded-tr-sm'
            : 'bg-dark-600/80 border border-white/[0.07] text-slate-200 rounded-tl-sm'
        }`}
          dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }}
        />
        <span className="text-[10px] text-slate-600">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500/30 to-accent-purple/30 border border-brand-500/20 flex items-center justify-center shrink-0">
        <Bot size={15} className="text-brand-300" />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-dark-600/80 border border-white/[0.07] flex items-center gap-1.5">
        {[0, 150, 300].map(d => (
          <span key={d} className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
        ))}
        <span className="text-xs text-slate-400 ml-2">Founded Copilot is thinking...</span>
      </div>
    </div>
  )
}

export default function Copilot() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm **Founded Copilot** — your AI-powered business intelligence assistant.\n\nI can help you analyze inventory, track sales, identify risks, and generate insights from your business data. Ask me anything about your business.",
      timestamp: Date.now(),
      tool_used: null,
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [agentLoading, setAgentLoading] = useState(false)
  const [agentResult, setAgentResult] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    const msgText = text || input.trim()
    if (!msgText || loading) return

    const userMsg = { role: 'user', content: msgText, timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setError('')
    setLoading(true)

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
      const res = await api.post('/api/copilot/chat', { message: msgText, history })
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.message,
        tool_used: res.data.tool_used,
        timestamp: Date.now(),
      }])
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to get response. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const runAgent = async () => {
    setAgentLoading(true)
    setAgentResult(null)
    setError('')
    try {
      const res = await api.post('/api/copilot/analyze-inventory')
      setAgentResult(res.data)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `🔍 **Inventory Analysis Complete**\n\n${res.data.summary}\n\n⚠️ ${res.data.approval_message}`,
        tool_used: 'inventory_analysis_agent',
        timestamp: Date.now(),
      }])
    } catch (err) {
      setError(err.response?.data?.detail || 'Agent failed')
    } finally {
      setAgentLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-purple flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Founded Copilot</h1>
            <p className="text-xs text-slate-400">Your AI-powered business intelligence assistant.</p>
          </div>
        </div>
        <button
          onClick={runAgent}
          disabled={agentLoading}
          className="btn-secondary text-xs"
        >
          {agentLoading ? (
            <><Loader2 size={13} className="animate-spin" /> Analyzing...</>
          ) : (
            <><Zap size={13} /> Run Inventory Agent</>
          )}
        </button>
      </div>

      {/* Agent result banner */}
      {agentResult && (
        <div className="glass p-4 mb-4 border-brand-500/30 shrink-0 animate-slide-up">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} className="text-brand-400" />
            <span className="text-sm font-semibold text-white">Inventory Agent Report</span>
            <span className="badge-amber text-xs">Awaiting Approval</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="text-center p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-2xl font-bold text-red-400">{agentResult.analysis?.high_risk_products?.length || 0}</p>
              <p className="text-xs text-slate-400 mt-0.5">High Risk</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-2xl font-bold text-amber-400">{agentResult.analysis?.medium_risk_products?.length || 0}</p>
              <p className="text-xs text-slate-400 mt-0.5">Medium Risk</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-brand-500/10 border border-brand-500/20">
              <p className="text-2xl font-bold text-brand-400">{agentResult.analysis?.reorder_recommendations?.length || 0}</p>
              <p className="text-xs text-slate-400 mt-0.5">Need Reorder</p>
            </div>
          </div>
          <p className="text-xs text-amber-400 mt-3 flex items-center gap-1.5">
            <AlertCircle size={12} />
            Go to Purchase Orders to create a PO after reviewing recommendations above
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 glass p-5 overflow-y-auto space-y-4 mb-4">
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        {loading && <TypingIndicator />}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle size={14} /> {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mb-4 shrink-0">
          {SUGGESTED_PROMPTS.map(prompt => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              className="px-3 py-1.5 text-xs rounded-xl bg-dark-700 border border-white/[0.07] text-slate-300 hover:text-white hover:border-brand-500/30 transition-all duration-200 flex items-center gap-1.5"
            >
              <ChevronRight size={11} className="text-brand-400" />
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="glass p-3 flex items-end gap-3 shrink-0">
        <textarea
          className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 resize-none outline-none min-h-[40px] max-h-32 py-1.5"
          placeholder="Ask your business anything... (e.g. 'What should I reorder?')"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
          rows={1}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          className="w-9 h-9 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 flex items-center justify-center transition-all duration-200 shrink-0"
        >
          {loading ? <Loader2 size={16} className="text-white animate-spin" /> : <Send size={16} className="text-white" />}
        </button>
      </div>
    </div>
  )
}
