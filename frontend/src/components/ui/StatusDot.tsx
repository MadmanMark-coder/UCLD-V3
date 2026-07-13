interface Props {
  status: 'stable' | 'elevated' | 'critical' | 'warning' | 'info' | 'online' | 'offline'
  size?: 'small' | 'medium' | 'large'
  pulse?: boolean
  label?: string
}

const SIZE_MAP: Record<string, number> = { small: 8, medium: 12, large: 16 }

const COLOR_MAP: Record<string, string> = {
  stable:  'var(--status-stable)',
  elevated: 'var(--status-elevated)',
  critical: 'var(--status-critical)',
  warning:  'var(--alert-warning)',
  info:     'var(--alert-info)',
  online:   'var(--status-stable)',
  offline:  'var(--text-muted)',
}

export function StatusDot({ status, size = 'medium', pulse, label }: Props) {
  const dim = SIZE_MAP[size]
  const color = COLOR_MAP[status] || 'var(--text-muted)'

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, verticalAlign: 'middle' }}>
      <span
        className={pulse ? 'animate-pulse' : undefined}
        style={{
          width: dim,
          height: dim,
          borderRadius: '50%',
          background: color,
          boxShadow: pulse ? `0 0 8px ${color}` : 'none',
          flexShrink: 0,
          display: 'inline-block',
        }}
      />
      {label && (
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {label}
        </span>
      )}
    </span>
  )
}
