import { useState, useEffect, useMemo } from 'react'

interface EquipmentItem {
  id: string
  name: string
  type: string
  status: string
  location: string
  department: string
  battery_level: number
  last_maintenance?: string
  next_maintenance?: string
}

const EQUIPMENT_TYPES = ['', 'ventilator', 'defibrillator', 'infusion_pump', 'wheelchair', 'ultrasound', 'ecg', 'oxygen']
const STATUS_FILTERS = ['', 'available', 'in_use', 'maintenance', 'fault']
const DEPARTMENTS = ['', 'MICU', 'SICU', 'CCU', 'STEPDOWN', 'ED']

const STATUS_COLORS: Record<string, string> = {
  available: 'var(--status-stable)',
  in_use: 'var(--status-elevated)',
  maintenance: 'var(--alert-info)',
  fault: 'var(--status-critical)',
}

const TYPE_ICONS: Record<string, string> = {
  ventilator: '🫁',
  defibrillator: '⚡',
  infusion_pump: '💉',
  wheelchair: '♿',
  ultrasound: '🔬',
  ecg: '📈',
  oxygen: '🫧',
}

export function EquipmentList() {
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDept, setFilterDept] = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (filterType) params.set('type', filterType)
    if (filterStatus) params.set('status', filterStatus)
    if (filterDept) params.set('department', filterDept)

    fetch(`/api/equipment?${params.toString()}`)
      .then(r => r.json())
      .then(setEquipment)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filterType, filterStatus, filterDept])

  const filtered = useMemo(() => {
    if (!search) return equipment
    const q = search.toLowerCase()
    return equipment.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.location.toLowerCase().includes(q)
    )
  }, [equipment, search])

  if (loading) {
    return <div style={{ color: 'var(--text-muted)', padding: 20 }}>Loading equipment...</div>
  }

  const batteryColor = (level: number) => {
    if (level >= 70) return 'var(--status-stable)'
    if (level >= 30) return 'var(--status-elevated)'
    return 'var(--status-critical)'
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
        Equipment Tracking
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 16px 0' }}>
        {equipment.length} items
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search name or location..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            padding: '6px 12px',
            color: 'var(--text-primary)',
            fontSize: 12,
            fontFamily: 'inherit',
            outline: 'none',
            flex: 1,
            minWidth: 160,
          }}
        />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selectStyle}>
          <option value="">All Types</option>
          {EQUIPMENT_TYPES.filter(Boolean).map(t => (
            <option key={t} value={t}>{t.replace('_', ' ')}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="">All Status</option>
          {STATUS_FILTERS.filter(Boolean).map(s => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={selectStyle}>
          <option value="">All Departments</option>
          {DEPARTMENTS.filter(Boolean).map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
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
          gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1.5fr',
          gap: 8,
          padding: '10px 14px',
          borderBottom: '1px solid var(--border-default)',
          fontSize: 11,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}>
          <span>Name</span>
          <span>Type</span>
          <span>Status</span>
          <span>Location</span>
          <span>Dept</span>
          <span>Battery</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No equipment matches the current filters.
          </div>
        ) : (
          filtered.slice(0, 50).map(item => (
            <div key={item.id} style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1.5fr',
              gap: 8,
              padding: '10px 14px',
              borderBottom: '1px solid var(--border-default)',
              fontSize: 13,
              color: 'var(--text-primary)',
              alignItems: 'center',
            }}>
              <span style={{ fontWeight: 500 }}>{item.name}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                {TYPE_ICONS[item.type] || '·'} {item.type.replace('_', ' ')}
              </span>
              <span style={{ color: STATUS_COLORS[item.status] || 'var(--text-muted)', fontSize: 12 }}>
                ● {item.status.replace('_', ' ')}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{item.location}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{item.department}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  flex: 1, height: 6, background: 'var(--bg-elevated)',
                  borderRadius: 3, overflow: 'hidden', maxWidth: 60,
                }}>
                  <div style={{
                    width: `${item.battery_level}%`, height: '100%',
                    background: batteryColor(item.battery_level),
                    borderRadius: 3,
                    transition: 'width 0.3s',
                  }} />
                </div>
                <span style={{
                  fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                  color: batteryColor(item.battery_level),
                }}>
                  {item.battery_level}%
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)',
  borderRadius: 8,
  padding: '6px 10px',
  color: 'var(--text-secondary)',
  fontSize: 12,
  fontFamily: 'inherit',
  outline: 'none',
}
