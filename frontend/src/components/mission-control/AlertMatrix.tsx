import { useNavigate } from 'react-router-dom'
import type { Alert } from '../../types'

interface Props {
  alerts: Alert[]
}

interface DeptAlert {
  name: string
  total: number
  highest: 'info' | 'warning' | 'critical' | 'emergency' | 'none'
}

const SEVERITY_ORDER: Record<string, number> = {
  emergency: 4,
  critical: 3,
  warning: 2,
  info: 1,
  none: 0,
}

const CELL_COLOR: Record<string, string> = {
  none: 'var(--status-stable)',
  info: 'var(--alert-info)',
  warning: 'var(--status-elevated)',
  critical: 'var(--status-critical)',
  emergency: 'var(--status-emergency)',
}

const DEPARTMENTS = ['MICU', 'SICU', 'CCU', 'STEPDOWN', 'ED', 'ICU', 'General', 'All']

export function AlertMatrix({ alerts }: Props) {
  const navigate = useNavigate()

  const deptMap = new Map<string, DeptAlert>()

  DEPARTMENTS.forEach(d => {
    deptMap.set(d, { name: d, total: 0, highest: 'none' })
  })

  alerts.forEach(a => {
    const dept = a.category === 'emergency' ? 'ED' : 'MICU'
    const entry = deptMap.get(dept) || deptMap.get('ICU')!
    entry.total += 1
    if (SEVERITY_ORDER[a.severity] > SEVERITY_ORDER[entry.highest]) {
      entry.highest = a.severity
    }
  })

  const list = Array.from(deptMap.values()).slice(0, 8)

  return (
    <div style={{
      borderRadius: 12, border: '1px solid var(--border-default)',
      background: 'var(--bg-deepest)', overflow: 'hidden',
    }}>
      <div style={{
        padding: '8px 12px', borderBottom: '1px solid var(--border-default)',
        fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
      }}>
        ALERT MATRIX
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, padding: 8,
      }}>
        {list.map(d => {
          const color = CELL_COLOR[d.highest] || 'var(--text-muted)'
          return (
            <div
              key={d.name}
              onClick={() => { if (d.total > 0) navigate('/alerts') }}
              style={{
                padding: '10px 6px', borderRadius: 8,
                border: `1px solid ${d.total > 0 ? color : 'var(--border-default)'}`,
                background: d.total > 0 ? `${color}08` : 'var(--bg-surface)',
                cursor: d.total > 0 ? 'pointer' : 'default',
                textAlign: 'center',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                {d.name}
              </div>
              <div style={{
                fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                color: d.total > 0 ? color : 'var(--text-muted)',
              }}>
                {d.total}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
