import { useState, useEffect, useMemo } from 'react'

interface EquipmentItem {
  id: string
  name: string
  type: string
  status: string
  location: string
  department: string
  battery_level: number
}

const STATUS_COLORS: Record<string, string> = {
  available: 'var(--status-stable)',
  in_use: 'var(--status-elevated)',
  maintenance: 'var(--alert-info)',
  fault: 'var(--status-critical)',
}

const ROOM_GRID: [string, number, number][] = [
  ['101A', 100, 180], ['101B', 100, 210],
  ['102A', 100, 250], ['102B', 100, 280],
  ['201A', 320, 60],  ['201B', 320, 100], ['201C', 320, 140],
  ['202A', 320, 190], ['202B', 320, 230], ['202C', 320, 270],
  ['203A', 540, 60],  ['203B', 540, 100], ['203C', 540, 140],
  ['204A', 540, 190], ['204B', 540, 230], ['204C', 540, 270],
  ['301A', 760, 60],  ['301B', 760, 100], ['301C', 760, 140],
  ['302A', 760, 190], ['302B', 760, 230], ['302C', 760, 270],
  ['401A', 980, 60],  ['401B', 980, 100],
  ['402A', 980, 190], ['402B', 980, 230],
  ['501A', 1100, 60], ['501B', 1100, 100],
]

const DEPARTMENT_ZONES: [string, number, number][] = [
  ['ED', 60, 260],
  ['MICU', 280, 170],
  ['SICU', 500, 170],
  ['CCU', 720, 170],
  ['STEPDOWN', 940, 170],
]

export function EquipmentMap() {
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [filterType, setFilterType] = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (filterType) params.set('type', filterType)
    fetch(`/api/equipment?${params.toString()}`)
      .then(r => r.json())
      .then(setEquipment)
      .catch(() => {})
  }, [filterType])

  const markers = useMemo(() => {
    const byLocation: Record<string, EquipmentItem[]> = {}
    for (const item of equipment) {
      if (item.status === 'available') {
        if (!byLocation[item.location]) byLocation[item.location] = []
        byLocation[item.location].push(item)
      }
    }
    return byLocation
  }, [equipment])

  const roomCount = useMemo(() => {
    const byRoom: Record<string, number> = {}
    for (const item of equipment) {
      byRoom[item.location] = (byRoom[item.location] || 0) + 1
    }
    return byRoom
  }, [equipment])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          Equipment Map
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            padding: '4px 10px',
            color: 'var(--text-secondary)',
            fontSize: 11,
            fontFamily: 'inherit',
            outline: 'none',
          }}
        >
          <option value="">All Types</option>
          <option value="ventilator">Ventilators</option>
          <option value="defibrillator">Defibrillators</option>
          <option value="infusion_pump">Infusion Pumps</option>
          <option value="wheelchair">Wheelchairs</option>
          <option value="ultrasound">Ultrasound</option>
          <option value="ecg">ECG</option>
          <option value="oxygen">Oxygen</option>
        </select>
      </div>

      <div style={{
        background: 'var(--bg-deepest)',
        borderRadius: 14,
        border: '1px solid var(--border-default)',
        padding: 16,
        overflow: 'auto',
      }}>
        <svg viewBox="0 0 1300 360" width="100%" height={280} style={{ display: 'block' }}>
          {DEPARTMENT_ZONES.map(([dept, x, y]) => (
            <text key={dept} x={x} y={y} fill="var(--text-muted)" fontSize={10} textAnchor="middle" opacity={0.5} fontFamily="JetBrains Mono, monospace">
              {dept}
            </text>
          ))}

          {ROOM_GRID.map(([room, x, y]) => {
            const count = roomCount[room] || 0
            const hasMarker = room in markers
            const markerCount = markers[room]?.length || 0
            return (
              <g key={room}>
                <rect
                  x={x} y={y} width={70} height={28} rx={6}
                  fill={hasMarker ? 'var(--bg-hover)' : 'var(--bg-surface)'}
                  stroke={hasMarker ? 'var(--border-active)' : 'var(--border-default)'}
                  strokeWidth={hasMarker ? 1.5 : 1}
                  style={{ transition: 'all 0.2s' }}
                />
                <text x={x + 35} y={y + 18} fill="var(--text-secondary)" fontSize={9} textAnchor="middle" fontFamily="JetBrains Mono, monospace">
                  {room}
                </text>
                {markerCount > 0 && (
                  <circle cx={x + 58} cy={y + 6} r={5} fill="var(--status-stable)" opacity={0.8} />
                )}
                {count > 0 && (
                  <text x={x + 58} y={y + 26} fill="var(--text-muted)" fontSize={7} textAnchor="middle">
                    {count}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        <div style={{ display: 'flex', gap: 16, marginTop: 8, justifyContent: 'center', fontSize: 10, color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--status-stable)', display: 'inline-block' }} /> Available Equipment
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', display: 'inline-block' }} /> Room
          </span>
        </div>
      </div>
    </div>
  )
}
