import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Alert } from '../../types'

interface Props {
  alerts: Alert[]
  onAcknowledge: (id: string) => void
  onClose: () => void
}

const SEVERITY_COLORS: Record<string, string> = {
  info: 'var(--alert-info)',
  warning: 'var(--alert-warning)',
  critical: 'var(--alert-critical)',
  emergency: 'var(--alert-emergency)',
}

export function AlertCenter({ alerts, onAcknowledge, onClose }: Props) {
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const unacked = alerts.filter(a => !a.acknowledged).slice(0, 10)

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: 8,
        width: 380,
        maxHeight: 480,
        background: 'var(--bg-elevated)',
        borderRadius: 14,
        border: '1px solid var(--border-default)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
      }}
    >
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          Alerts
          {unacked.length > 0 && (
            <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12, marginLeft: 6 }}>
              ({unacked.length} unacknowledged)
            </span>
          )}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 4 }}>
        {unacked.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            ✓ No alerts
          </div>
        ) : (
          unacked.map(alert => (
            <div
              key={alert.id}
              onClick={() => { navigate(`/patients/${alert.stay_id}`); onClose() }}
              style={{
                display: 'flex',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 10,
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: SEVERITY_COLORS[alert.severity] || 'var(--text-muted)',
                flexShrink: 0,
                marginTop: 5,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {alert.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Patient #{alert.stay_id} · {alert.generated_at ? alert.generated_at.slice(11, 19) : ''}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onAcknowledge(alert.id) }}
                style={{
                  background: 'var(--bg-hover)',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: 11,
                  padding: '4px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  flexShrink: 0,
                }}
              >
                Ack
              </button>
            </div>
          ))
        )}
      </div>

      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--border-default)',
        textAlign: 'center',
      }}>
        <button
          onClick={() => { navigate('/alerts'); onClose() }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-accent)',
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          View All
        </button>
      </div>
    </div>
  )
}
