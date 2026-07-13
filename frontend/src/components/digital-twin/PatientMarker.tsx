interface Props {
  x: number
  y: number
  status: 'critical' | 'elevated' | 'stable' | 'empty'
  name: string
  score: number
  onClick?: () => void
}

const COLOR_MAP: Record<string, string> = {
  critical: 'var(--status-critical)',
  elevated: 'var(--status-elevated)',
  stable: 'var(--status-stable)',
  empty: 'var(--text-muted)',
}

export function PatientMarker({ x, y, status, name, score, onClick }: Props) {
  const color = COLOR_MAP[status] || 'var(--text-muted)'
  const size = status === 'empty' ? 8 : 12

  return (
    <g style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {status === 'critical' && (
        <circle cx={x} cy={y} r={18} fill="none" stroke={color} strokeWidth={1} opacity={0.3}>
          <animate attributeName="r" values="12;24;12" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
      <circle
        cx={x}
        cy={y}
        r={size}
        fill={color}
        opacity={status === 'empty' ? 0.4 : 1}
        onClick={onClick}
      />
      <title>{name} — Score: {score} ({status})</title>
    </g>
  )
}
