interface Props {
  x: number
  y: number
  type: string
  status: 'available' | 'in_use' | 'maintenance' | 'fault'
  name: string
  onClick?: () => void
}

const COLOR_MAP: Record<string, string> = {
  available: 'var(--status-stable)',
  in_use: 'var(--status-elevated)',
  maintenance: 'var(--text-muted)',
  fault: 'var(--status-critical)',
}

const TYPE_LABEL: Record<string, string> = {
  ventilator: 'V',
  defibrillator: 'D',
  infusion_pump: 'P',
  wheelchair: 'W',
  ultrasound: 'U',
  ecg: 'E',
  oxygen: 'O',
}

export function EquipmentMarker({ x, y, type, status, name, onClick }: Props) {
  const color = COLOR_MAP[status] || 'var(--text-muted)'
  const label = TYPE_LABEL[type] || '?'

  return (
    <g style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <rect
        x={x - 5}
        y={y - 5}
        width={10}
        height={10}
        rx={2}
        fill={color}
        opacity={status === 'available' ? 1 : 0.6}
        onClick={onClick}
      />
      <text x={x} y={y + 1.5} fill="#000" fontSize={7} textAnchor="middle" fontWeight={700} fontFamily="monospace">
        {label}
      </text>
      <title>{name} — {type} ({status})</title>
    </g>
  )
}
