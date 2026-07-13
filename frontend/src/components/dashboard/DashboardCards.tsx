import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ResponsiveContainer, AreaChart, Area, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Users, Radio, Bed, AlertTriangle, MessageSquare, Wrench, TrendingUp, Building2, AlertCircle, CheckCircle2, Brain, Activity, Heart, Wind, Bone, Pill, Clock, ShieldAlert } from 'lucide-react'
import type { Patient } from '../../types'
import React from 'react'

interface PatientStatusCardProps {
  patients: Patient[]
}

interface LiveMonitoringFeedCardProps {
  alerts: Array<{ id: string; severity: string; title: string; description: string; generated_at: string; acknowledged?: boolean }>
}

interface BedOccupancyCardProps {
  beds: { department: string; occupied: number; available: number }[]
}

interface EmergencyStatusCardProps {
  hasEmergency: boolean
  onCodeBlue: () => void
  onCodeRed?: () => void
  activeCodes?: string[]
  lastEmergency?: string | null
  equipReadiness?: number
  availableBeds?: number
  criticalCount?: number
}

interface AIChatCardProps {
  onSendMessage: (msg: string) => void
}

interface ResourceSummaryCardProps {
  equipment: { name: string; availability: number }[]
}

interface RiskTrendsCardProps {
  riskHistory: { time: string; risk: number }[]
}

interface DigitalTwinMiniCardProps {
  departmentStats: { name: string; alerting: number; stable: number }[]
}

export function PatientStatusCard({ patients }: PatientStatusCardProps) {
  const critical = patients.filter(p => p.stability_category === 'critical')
  const highRisk = patients.filter(p => p.stability_category === 'high_risk' || p.stability_category === 'elevated')
  const stable = patients.filter(p => p.stability_category === 'stable' || p.stability_category === 'observation')
  const navigate = useNavigate()

  return (
    <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 className="outfit" style={{ margin: 0, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={18} color="var(--text-accent)" /> PATIENT STATUS OVERVIEW
        </h3>
        <span style={{ fontSize: 12, color: 'var(--text-accent)', cursor: 'pointer' }} onClick={() => navigate('/patients')}>[View All]</span>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
        {critical.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: 'var(--status-critical)', fontSize: 12, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="critical-pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-critical)' }}/>
              CRITICAL ({critical.length} patients)
            </div>
            <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 6, padding: '8px 12px' }}>
              {critical.map(p => (
                <div key={p.stay_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 6, cursor: 'pointer' }} onClick={() => navigate(`/patients/${p.stay_id}`)}>
                  <span>{p.stay_id} • Subj {p.subject_id}</span><span style={{ color: 'var(--text-muted)' }}>{p.first_careunit?.split('(')[0]?.trim() || 'ICU'}</span><span style={{ color: 'var(--status-critical)' }}>{p.stability_score?.toFixed(0) || '?'}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {highRisk.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: 'var(--status-high-risk)', fontSize: 12, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-high-risk)' }}/>
              HIGH RISK ({highRisk.length} patients)
            </div>
            <div style={{ background: 'rgba(249, 115, 22, 0.05)', border: '1px solid rgba(249, 115, 22, 0.2)', borderRadius: 6, padding: '8px 12px' }}>
              {highRisk.slice(0, 3).map(p => (
                <div key={p.stay_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 6, cursor: 'pointer' }} onClick={() => navigate(`/patients/${p.stay_id}`)}>
                  <span>{p.stay_id} • Subj {p.subject_id}</span><span style={{ color: 'var(--text-muted)' }}>{p.first_careunit?.split('(')[0]?.trim() || 'ICU'}</span><span style={{ color: 'var(--status-high-risk)' }}>{p.stability_score?.toFixed(0) || '?'}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div style={{ color: 'var(--status-stable)', fontSize: 12, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-stable)' }}/>
            STABLE ({stable.length} patients)
          </div>
        </div>
      </div>
    </div>
  )
}

export function LiveMonitoringFeedCard({ alerts }: LiveMonitoringFeedCardProps) {
  const navigate = useNavigate()
  const recent = alerts.slice(0, 5)

  return (
    <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 className="outfit" style={{ margin: 0, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Radio size={18} color="var(--text-accent)" /> LIVE MONITORING FEED
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-accent)', cursor: 'pointer' }} onClick={() => navigate('/alerts')}>[VIEW ALL]</span>
        </div>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {recent.length === 0 && (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
            No recent alerts. Monitoring feed will appear here.
          </div>
        )}
        {recent.map((alert) => {
          const borderColor = alert.severity === 'critical' || alert.severity === 'emergency'
            ? 'var(--status-critical)'
            : alert.severity === 'warning'
            ? 'var(--status-high-risk)'
            : 'var(--status-observation)'
          const timeAgo = (() => {
            const t = new Date(alert.generated_at)
            const now = new Date()
            const diff = Math.floor((now.getTime() - t.getTime()) / 1000)
            if (diff < 60) return 'NOW'
            if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
            return `${Math.floor(diff / 3600)}h ago`
          })()
          return (
            <div key={alert.id} style={{ borderLeft: `3px solid ${borderColor}`, paddingLeft: 12, padding: '8px 12px', background: alert.severity === 'critical' || alert.severity === 'emergency' ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: borderColor, fontSize: 12, fontWeight: 700 }}>{timeAgo}</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{alert.title}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {alert.description}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function BedOccupancyCard({ beds }: BedOccupancyCardProps) {
  const navigate = useNavigate()
  const total = beds.reduce((s, b) => s + b.occupied + b.available, 0)
  const occupied = beds.reduce((s, b) => s + b.occupied, 0)
  const pct = total > 0 ? Math.round((occupied / total) * 100) : 0

  return (
    <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 className="outfit" style={{ margin: 0, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bed size={18} color="var(--text-accent)" /> BED OCCUPANCY
        </h3>
        <span style={{ fontSize: 12, color: 'var(--text-accent)', cursor: 'pointer' }} onClick={() => navigate('/beds')}>[DETAILS]</span>
      </div>
      
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
          <span>Total Capacity: {total} beds</span>
          <span className="mono" style={{ color: 'var(--text-accent)' }}>{pct}%</span>
        </div>
        <div style={{ width: '100%', height: 8, background: 'var(--border-default)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: pct > 90 ? 'var(--status-critical)' : 'var(--text-accent)', borderRadius: 4 }} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-default)' }}>
              <th style={{ padding: '8px 0', fontWeight: 500 }}>Dept</th>
              <th style={{ padding: '8px 0', fontWeight: 500 }}>Occ</th>
              <th style={{ padding: '8px 0', fontWeight: 500 }}>Avail</th>
            </tr>
          </thead>
          <tbody>
            {beds.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                <td style={{ padding: '8px 0' }}>{r.department}</td>
                <td style={{ padding: '8px 0', color: r.available <= 3 ? 'var(--status-high-risk)' : 'var(--text-primary)' }}>{r.occupied}</td>
                <td style={{ padding: '8px 0', color: r.available <= 3 ? 'var(--status-high-risk)' : 'var(--status-stable)' }}>{r.available}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function EmergencyStatusCard({ hasEmergency, onCodeBlue, onCodeRed, activeCodes, lastEmergency, equipReadiness, availableBeds, criticalCount }: EmergencyStatusCardProps) {
  const lastEmergStr = lastEmergency ? new Date(lastEmergency + 'Z').toLocaleString() : '--'
  const equipColor = (equipReadiness ?? 100) >= 80 ? 'var(--status-stable)' : (equipReadiness ?? 100) >= 50 ? 'var(--status-warning)' : 'var(--status-critical)'
  return (
    <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <h3 className="outfit" style={{ margin: 0, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={16} color="var(--status-critical)" /> EMERGENCY STATUS
        </h3>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div className={hasEmergency ? 'critical-pulse' : ''} style={{ width: 10, height: 10, borderRadius: '50%', background: hasEmergency ? 'var(--status-critical)' : 'var(--status-stable)' }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>STATUS: {hasEmergency ? 'ACTIVE EMERGENCY' : 'All clear'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last emergency: {lastEmergStr}</div>
        </div>
      </div>

      <div style={{ border: '1px solid var(--border-default)', borderRadius: 6, padding: '8px 10px', marginBottom: 10, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckCircle2 size={12} color="var(--status-stable)"/> Teams: Ready
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: equipColor, flexShrink: 0 }} />
          </div>
          Equip: {equipReadiness ?? 0}% available
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {availableBeds != null && availableBeds > 0
            ? <CheckCircle2 size={12} color="var(--status-stable)"/>
            : <AlertTriangle size={12} color="var(--status-critical)"/>}
          ICU: {availableBeds ?? 0} beds available
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckCircle2 size={12} color={criticalCount && criticalCount > 5 ? 'var(--status-critical)' : 'var(--status-stable)'}/>
          Critical: {criticalCount ?? 0} patients
        </div>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Quick Activation</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button style={{ padding: '6px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: '#2563eb', border: '1px solid #1d4ed8', borderRadius: 6, color: 'white' }} onClick={onCodeBlue}>CODE BLUE</button>
          <button style={{ padding: '6px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: '#dc2626', border: '1px solid #b91c1c', borderRadius: 6, color: 'white' }} onClick={onCodeRed || onCodeBlue}>CODE RED</button>
        </div>
      </div>
    </div>
  )
}

type AIChatMessage = { role: string; content: string; streaming?: boolean; id: string }

function AIChatBubble({ msg }: { msg: AIChatMessage }) {
  const isUser = msg.role === 'user'
  const [displayed, setDisplayed] = useState(msg.streaming ? '' : msg.content)

  useEffect(() => {
    if (!msg.streaming) {
      setDisplayed(msg.content)
      return
    }
    let idx = 0
    setDisplayed('')
    const iv = setInterval(() => {
      if (idx < msg.content.length) {
        setDisplayed(prev => prev + msg.content[idx])
        idx++
      } else {
        clearInterval(iv)
      }
    }, 12)
    return () => clearInterval(iv)
  }, [msg.content, msg.streaming])

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: 8,
      marginBottom: 10,
    }}>
      {/* Avatar */}
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: isUser
          ? 'linear-gradient(135deg, #0ea5e9, #6366f1)'
          : 'linear-gradient(135deg, #8b5cf6, #a855f7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: '#fff',
        boxShadow: isUser ? '0 2px 8px rgba(99,102,241,0.4)' : '0 2px 8px rgba(139,92,246,0.4)',
      }}>
        {isUser ? 'DR' : 'AI'}
      </div>
      {/* Bubble */}
      <div style={{
        maxWidth: '78%',
        padding: '9px 13px',
        borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
        background: isUser
          ? 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(14,165,233,0.15))'
          : 'rgba(255,255,255,0.04)',
        border: isUser
          ? '1px solid rgba(99,102,241,0.35)'
          : '1px solid rgba(139,92,246,0.2)',
        fontSize: 12.5,
        color: 'var(--text-primary)',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        boxShadow: isUser ? '0 2px 12px rgba(99,102,241,0.15)' : 'none',
      }}>
        {displayed}
        {msg.streaming && displayed.length < msg.content.length && (
          <span style={{
            display: 'inline-block', width: 2, height: 14,
            background: 'var(--ai-message)',
            marginLeft: 2, verticalAlign: 'middle',
            animation: 'pulse 0.7s infinite',
          }} />
        )}
      </div>
    </div>
  )
}

export function AIChatCard({ onSendMessage }: AIChatCardProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm your Clinical AI Assistant.\nAsk me anything about patients, vitals, risks, or ICU status.",
    }
  ])
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const handleSend = async () => {
    const userMsg = input.trim()
    if (!userMsg || loading) return
    setInput('')
    const userId = `u_${Date.now()}`
    setMessages(prev => [...prev, { id: userId, role: 'user', content: userMsg }])
    onSendMessage(userMsg)
    setLoading(true)

    // Build history for the backend (exclude streaming flag)
    const history = messages.map(m => ({ role: m.role, content: m.content }))
    history.push({ role: 'user', content: userMsg })

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMsg, messages: history }),
      })
      const data = res.ok ? await res.json() : null
      const reply = data?.response || (res.ok ? 'No response from AI.' : `Error ${res.status}`)
      const aiId = `a_${Date.now()}`
      setMessages(prev => [...prev, { id: aiId, role: 'assistant', content: reply, streaming: true }])
      // Turn off streaming flag after animation would finish
      setTimeout(() => {
        setMessages(prev => prev.map(m => m.id === aiId ? { ...m, streaming: false } : m))
      }, Math.min(reply.length * 12 + 500, 4000))
    } catch (e) {
      setMessages(prev => [...prev, {
        id: `err_${Date.now()}`, role: 'assistant',
        content: 'Connection error. Please check the backend is running.',
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleClear = () => {
    setMessages([{ id: 'welcome2', role: 'assistant', content: "Hello! I'm your Clinical AI Assistant.\nAsk me anything about patients, vitals, risks, or ICU status." }])
  }

  return (
    <div className="glass-panel" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 16px', borderBottom: '1px solid var(--border-default)',
        flexShrink: 0,
        background: 'linear-gradient(90deg, rgba(139,92,246,0.08), transparent)',
      }}>
        <h3 className="outfit" style={{ margin: 0, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#8b5cf6',
            boxShadow: '0 0 8px rgba(139,92,246,0.8)',
            display: 'inline-block',
          }} />
          CLINICAL ASSISTANT
        </h3>
        <button onClick={handleClear} style={{
          background: 'transparent', border: 'none',
          color: 'var(--text-muted)', fontSize: 11,
          cursor: 'pointer', padding: '3px 8px',
          borderRadius: 4, fontFamily: 'inherit',
          transition: 'color 0.15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >New chat</button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: '14px 12px',
        display: 'flex', flexDirection: 'column',
        scrollBehavior: 'smooth',
      }}>
        {messages.map(m => (
          <AIChatBubble key={m.id} msg={m} />
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff',
              boxShadow: '0 2px 8px rgba(139,92,246,0.4)',
            }}>AI</div>
            <div style={{
              padding: '10px 16px', borderRadius: '4px 16px 16px 16px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(139,92,246,0.2)',
              display: 'flex', gap: 5, alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'rgba(139,92,246,0.7)',
                  display: 'inline-block',
                  animation: `aiDot 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid var(--border-default)',
        background: 'var(--bg-surface)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          background: 'var(--bg-deepest)',
          border: `1px solid ${loading ? 'rgba(139,92,246,0.4)' : 'var(--border-default)'}`,
          borderRadius: 12,
          padding: '6px 6px 6px 14px',
          transition: 'border-color 0.2s',
        }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={loading ? 'Thinking...' : 'Ask a clinical question...'}
            disabled={loading}
            style={{
              flex: 1, background: 'transparent', border: 'none',
              color: 'var(--text-primary)', outline: 'none',
              fontSize: 12.5, fontFamily: 'inherit',
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            style={{
              width: 32, height: 32, borderRadius: 8, border: 'none',
              background: loading || !input.trim()
                ? 'rgba(139,92,246,0.15)'
                : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              color: loading || !input.trim() ? 'rgba(255,255,255,0.3)' : '#fff',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.2s',
              fontSize: 14,
            }}
            title="Send (Enter)"
          >
            ↑
          </button>
        </div>
      </div>

      <style>{`
        @keyframes aiDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export function ResourceSummaryCard({ equipment }: ResourceSummaryCardProps) {
  const navigate = useNavigate()
  return (
    <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
        <h3 className="outfit" style={{ margin: 0, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Wrench size={18} color="var(--text-accent)" /> RESOURCE SUMMARY
        </h3>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {equipment.map((res, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span>{res.name}</span>
              <span className="mono" style={{ color: res.availability < 75 ? 'var(--status-high-risk)' : 'var(--text-primary)' }}>{res.availability}% Avail</span>
            </div>
            <div style={{ width: '100%', height: 6, background: 'var(--border-default)', borderRadius: 3 }}>
              <div style={{ width: `${res.availability}%`, height: '100%', background: res.availability < 75 ? 'var(--status-high-risk)' : 'var(--status-observation)', borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--status-high-risk)', display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={14}/> {equipment.filter(e => e.availability < 75).length} items low avail.</span>
        <span style={{ fontSize: 12, color: 'var(--text-accent)', cursor: 'pointer' }} onClick={() => navigate('/equipment')}>[FIND]</span>
      </div>
    </div>
  )
}

const RISK_META: { key: string; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'mortality_risk', label: 'Mortality', icon: Activity, color: '#ef4444' },
  { key: 'sepsis_risk', label: 'Sepsis', icon: AlertTriangle, color: '#f97316' },
  { key: 'cardiac_arrest_risk', label: 'Cardiac Arrest', icon: Heart, color: '#dc2626' },
  { key: 'cardiac_event_risk', label: 'Cardiac Event', icon: Heart, color: '#eab308' },
  { key: 'respiratory_failure_risk', label: 'Respiratory', icon: Wind, color: '#a855f7' },
  { key: 'icu_transfer_risk', label: 'ICU Transfer', icon: TrendingUp, color: '#3b82f6' },
  { key: 'readmission_risk', label: 'Readmission', icon: Users, color: '#06b6d4' },
  { key: 'organ_failure_risk', label: 'Organ Failure', icon: Activity, color: '#f97316' },
  { key: 'fall_risk', label: 'Fall', icon: Bone, color: '#ec4899' },
  { key: 'medication_complication_risk', label: 'Med. Comp.', icon: Pill, color: '#14b8a6' },
]

function riskColor(pct: number): string {
  if (pct >= 70) return '#ef4444'
  if (pct >= 50) return '#f97316'
  if (pct >= 30) return '#eab308'
  return '#22c55e'
}

export function RiskTrendsCard({ riskHistory: _riskHistory }: RiskTrendsCardProps) {
  const [riskData, setRiskData] = useState<{
    risk_averages: Record<string, number>
    high_risk_counts: Record<string, number>
    forecasts: Record<string, Record<string, number>>
    patient_count: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics/patient-risks')
      .then(r => r.json())
      .then(d => { setRiskData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const forecastLabels = ['1h', '3h', '6h', '12h']
  const chartData = forecastLabels.map(lbl => {
    const entry: Record<string, any> = { time: lbl }
    if (riskData?.forecasts?.[lbl]) {
      for (const [k, v] of Object.entries(riskData.forecasts[lbl])) {
        entry[k] = v
      }
    }
    return entry
  })

  const topRisks = RISK_META.slice(0, 5)

  return (
    <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexShrink: 0 }}>
        <h3 className="outfit" style={{ margin: 0, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldAlert size={18} color="var(--status-high-risk)" /> PREDICTIVE RISK
        </h3>
      </div>

      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {loading ? (
          <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Loading risk data...
          </div>
        ) : riskData ? (
          <>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
              Hospital-wide Risk Averages across {riskData.patient_count} patients
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {topRisks.map(m => {
                const avg = riskData.risk_averages?.[m.key] ?? 0
                const highCount = riskData.high_risk_counts?.[m.key] ?? 0
                return (
                  <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    {React.createElement(m.icon, { size: 12, color: m.color })}
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', width: 68, flexShrink: 0 }}>{m.label}</span>
                    <div style={{ flex: 1, height: 6, background: 'var(--border-default)', borderRadius: 3, overflow: 'hidden', minWidth: 0 }}>
                      <div style={{ width: `${Math.min(avg, 100)}%`, height: '100%', background: m.color, borderRadius: 3, transition: 'width 0.5s' }} />
                    </div>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: riskColor(avg), width: 38, textAlign: 'right', flexShrink: 0 }}>{avg}%</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 48, textAlign: 'right', flexShrink: 0 }}>{highCount} ≥50%</span>
                  </div>
                )
              })}
            </div>

            {chartData.length > 0 && (
              <div style={{ height: 60, marginBottom: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="riskGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--status-high-risk)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--status-high-risk)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, fontSize: 12 }} />
                    <Area type="monotone" dataKey={topRisks[0].key} stroke={topRisks[0].color} strokeWidth={2} fillOpacity={1} fill="url(#riskGrad2)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {RISK_META.slice(5, 10).map(m => {
                const avg = riskData.risk_averages?.[m.key] ?? 0
                return (
                  <div key={m.key} style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    padding: '2px 5px', borderRadius: 4, fontSize: 10,
                    background: avg >= 15 ? 'rgba(239,68,68,0.05)' : 'transparent',
                    border: '1px solid rgba(255,255,255,0.05)',
                    whiteSpace: 'nowrap',
                  }}>
                    {React.createElement(m.icon, { size: 10, color: m.color })}
                    <span style={{ color: 'var(--text-secondary)' }}>{m.label}</span>
                    <span className="mono" style={{ color: riskColor(avg), fontWeight: 700 }}>{avg}%</span>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Risk data unavailable
          </div>
        )}
      </div>
    </div>
  )
}

export function DigitalTwinMiniCard({ departmentStats }: DigitalTwinMiniCardProps) {
  const navigate = useNavigate()
  return (
    <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
        <h3 className="outfit" style={{ margin: 0, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building2 size={18} color="var(--text-accent)" /> DIGITAL TWIN
        </h3>
        <span style={{ fontSize: 12, color: 'var(--text-accent)', cursor: 'pointer' }} onClick={() => navigate('/analytics')}>[EXPAND]</span>
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, height: '50%' }}>
          {departmentStats.slice(0, 2).map(d => (
            <div key={d.name} style={{ flex: 1, background: d.alerting > 0 ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-deepest)', border: d.alerting > 0 ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border-default)', borderRadius: 6, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate('/patients')}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{d.name}</div>
              <div style={{ fontSize: 12, color: d.alerting > 0 ? 'var(--status-critical)' : 'var(--status-stable)' }}>{d.alerting > 0 ? `${d.alerting} Alerting` : `${d.stable} Stable`}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, height: '50%' }}>
          {departmentStats.slice(2, 4).map(d => (
            <div key={d.name} style={{ flex: 1, background: d.alerting > 0 ? 'rgba(249, 115, 22, 0.05)' : 'var(--bg-deepest)', border: d.alerting > 0 ? '1px solid rgba(249, 115, 22, 0.2)' : '1px solid var(--border-default)', borderRadius: 6, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate('/patients')}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{d.name}</div>
              <div style={{ fontSize: 12, color: d.alerting > 0 ? 'var(--status-high-risk)' : 'var(--status-stable)' }}>{d.alerting > 0 ? `${d.alerting} Alerting` : `${d.stable} Stable`}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
