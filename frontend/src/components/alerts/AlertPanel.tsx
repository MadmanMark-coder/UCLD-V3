import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Alert } from '../../types'

interface Props {
  alerts: Alert[]
  onAcknowledge: (id: string) => void
  onAcknowledgeAll: () => void
  onRefresh: () => void
}

const SEVERITY_ORDER = ['emergency', 'critical', 'warning', 'info'] as const
const SEVERITY_COLORS: Record<string, string> = {
  info: 'var(--alert-info)',
  warning: 'var(--alert-warning)',
  critical: 'var(--alert-critical)',
  emergency: 'var(--alert-emergency)',
}
const SEVERITY_ICONS: Record<string, string> = {
  info: 'ⓘ',
  warning: '⚠',
  critical: '🔴',
  emergency: '🚨',
}

export function AlertPanel({ alerts, onAcknowledge, onAcknowledgeAll, onRefresh }: Props) {
  const navigate = useNavigate()
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterAcked, setFilterAcked] = useState<string>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    return alerts.filter(a => {
      if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false
      if (filterAcked === 'unacknowledged' && a.acknowledged) return false
      if (filterAcked === 'acknowledged' && !a.acknowledged) return false
      return true
    })
  }, [alerts, filterSeverity, filterAcked])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const sa = SEVERITY_ORDER.indexOf(a.severity as typeof SEVERITY_ORDER[number])
      const sb = SEVERITY_ORDER.indexOf(b.severity as typeof SEVERITY_ORDER[number])
      if (sa !== sb) return sa - sb
      return (b.priority_score || 0) - (a.priority_score || 0)
    })
  }, [filtered])

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const acknowledgeSelected = useCallback(() => {
    for (const id of selected) onAcknowledge(id)
    setSelected(new Set())
  }, [selected, onAcknowledge])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Alert History
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            {alerts.length} total · {alerts.filter(a => !a.acknowledged).length} unacknowledged
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={onRefresh} style={btnStyle}>Refresh</button>
          <button onClick={onAcknowledgeAll} style={btnStyle}>Acknowledge All</button>
          {selected.size > 0 && (
            <button onClick={acknowledgeSelected} style={{ ...btnStyle, background: 'var(--bg-hover)' }}>
              Ack Selected ({selected.size})
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <select
          value={filterSeverity}
          onChange={e => setFilterSeverity(e.target.value)}
          style={selectStyle}
        >
          <option value="all">All Severities</option>
          <option value="emergency">Emergency</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        <select
          value={filterAcked}
          onChange={e => setFilterAcked(e.target.value)}
          style={selectStyle}
        >
          <option value="all">All Status</option>
          <option value="unacknowledged">Unacknowledged</option>
          <option value="acknowledged">Acknowledged</option>
        </select>
      </div>

      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 14,
        border: '1px solid var(--border-default)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '40px 1fr 100px 80px 100px 80px',
          gap: 8,
          padding: '10px 16px',
          borderBottom: '1px solid var(--border-default)',
          fontSize: 11,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}>
          <span />
          <span>Title</span>
          <span>Patient</span>
          <span>Severity</span>
          <span>Score</span>
          <span>Status</span>
        </div>

        {sorted.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No alerts match the current filters.
          </div>
        ) : (
          sorted.slice(0, 100).map(alert => (
            <div
              key={alert.id}
              onClick={() => navigate(`/patients/${alert.stay_id}`)}
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr 100px 80px 100px 80px',
                gap: 8,
                padding: '10px 16px',
                borderBottom: '1px solid var(--border-default)',
                fontSize: 13,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'background 0.1s',
                background: selected.has(alert.id) ? 'var(--bg-hover)' : 'transparent',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = selected.has(alert.id) ? 'var(--bg-hover)' : 'var(--bg-elevated)' }}
              onMouseLeave={e => { e.currentTarget.style.background = selected.has(alert.id) ? 'var(--bg-hover)' : 'transparent' }}
            >
              <input
                type="checkbox"
                checked={selected.has(alert.id)}
                onChange={(e) => { e.stopPropagation(); toggleSelect(alert.id) }}
                style={{ accentColor: 'var(--text-accent)' }}
              />
              <div>
                <div style={{ fontWeight: 500 }}>{alert.title}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{alert.description}</div>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>#{alert.stay_id}</div>
              <div style={{ color: SEVERITY_COLORS[alert.severity] || 'var(--text-muted)' }}>
                {SEVERITY_ICONS[alert.severity] || '·'} {alert.severity}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--text-secondary)' }}>
                {alert.priority_score || 0}
              </div>
              <div>
                {alert.acknowledged
                  ? <span style={{ color: 'var(--status-stable)' }}>Acknowledged</span>
                  : (
                    <button
                      onClick={(e) => { e.stopPropagation(); onAcknowledge(alert.id) }}
                      style={{
                        background: 'var(--bg-hover)',
                        border: 'none',
                        color: 'var(--text-accent)',
                        fontSize: 12,
                        padding: '4px 10px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Ack
                    </button>
                  )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)',
  color: 'var(--text-secondary)',
  fontSize: 12,
  padding: '6px 14px',
  borderRadius: 8,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const selectStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)',
  color: 'var(--text-secondary)',
  fontSize: 12,
  padding: '6px 12px',
  borderRadius: 8,
  fontFamily: 'inherit',
  outline: 'none',
}
