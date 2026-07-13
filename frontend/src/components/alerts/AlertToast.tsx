import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Alert } from '../../types'

interface Props {
  alert: Alert
  onDismiss: (id: string) => void
}

const SEVERITY_CONFIG: Record<string, { icon: string; color: string; autoDismissMs: number | null }> = {
  info:      { icon: 'ⓘ', color: 'var(--alert-info)', autoDismissMs: 5000 },
  warning:   { icon: '⚠', color: 'var(--alert-warning)', autoDismissMs: 10000 },
  critical:  { icon: '🔴', color: 'var(--alert-critical)', autoDismissMs: null },
  emergency: { icon: '🚨', color: 'var(--alert-emergency)', autoDismissMs: null },
}

export function AlertToast({ alert, onDismiss }: Props) {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)
  const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  useEffect(() => {
    if (cfg.autoDismissMs == null) return
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDismiss(alert.id), 300)
    }, cfg.autoDismissMs)
    return () => clearTimeout(timer)
  }, [alert.id, cfg.autoDismissMs, onDismiss])

  const isCenter = alert.severity === 'critical' || alert.severity === 'emergency'

  return (
    <div
      onClick={() => navigate(`/patients/${alert.stay_id}`)}
      style={{
        position: 'fixed',
        [isCenter ? 'top' : 'right']: isCenter ? 72 : 16,
        left: isCenter ? '50%' : 'auto',
        transform: visible
          ? (isCenter ? 'translateX(-50%) translateY(0)' : 'translateX(0)')
          : (isCenter ? 'translateX(-50%) translateY(-20px)' : 'translateX(120%)'),
        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        zIndex: 10000,
        maxWidth: 420,
        width: '100%',
        background: 'var(--bg-elevated)',
        borderRadius: 12,
        border: `1px solid ${cfg.color}44`,
        borderLeft: `4px solid ${cfg.color}`,
        padding: '12px 16px',
        cursor: 'pointer',
        boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 12px ${cfg.color}22`,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      <span style={{ fontSize: 20, flexShrink: 0 }}>{cfg.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
          {alert.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {alert.description}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
          {alert.generated_at ? alert.generated_at.slice(11, 19) : ''}
        </div>
      </div>
      {cfg.autoDismissMs == null && (
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(alert.id) }}
          style={{
            background: 'var(--bg-hover)',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 11,
            padding: '4px 8px',
            borderRadius: 6,
            cursor: 'pointer',
            flexShrink: 0,
            fontFamily: 'inherit',
          }}
        >
          Ack
        </button>
      )}
    </div>
  )
}
