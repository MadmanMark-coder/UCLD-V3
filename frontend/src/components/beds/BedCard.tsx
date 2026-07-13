import type { Bed } from '../../types'

interface Props {
  bed: Bed
  onAssign?: (bed: Bed) => void
  onRelease?: (bed: Bed) => void
}

const STATUS_COLORS: Record<string, string> = {
  available: 'var(--status-stable)',
  occupied: 'var(--status-critical)',
  cleaning: 'var(--status-elevated)',
  reserved: 'var(--status-observation)',
}

const STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  occupied: 'Occupied',
  cleaning: 'Cleaning',
  reserved: 'Reserved',
}

export function BedCard({ bed, onAssign, onRelease }: Props) {
  const color = STATUS_COLORS[bed.status] || 'var(--text-muted)'

  return (
    <div
      onClick={() => {
        if (bed.status === 'available' && onAssign) onAssign(bed)
        else if (bed.status === 'occupied' && onRelease) onRelease(bed)
      }}
      style={{
        background: `var(--bg-surface)`,
        borderRadius: 12,
        border: `1px solid ${color}44`,
        borderLeft: `4px solid ${color}`,
        padding: 14,
        cursor: bed.status === 'available' || bed.status === 'occupied' ? 'pointer' : 'default',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = color
        e.currentTarget.style.boxShadow = `0 0 12px ${color}22`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = `${color}44`
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
            {bed.room_number}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {bed.bed_type}
          </div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600,
          color, textTransform: 'uppercase', letterSpacing: 0.5,
        }}>
          {STATUS_LABELS[bed.status] || bed.status}
        </span>
      </div>

      {bed.current_patient_id && (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
          Patient #{bed.current_patient_id}
        </div>
      )}

      {bed.isolation_type && (
        <div style={{
          fontSize: 10, color: 'var(--alert-warning)',
          marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5,
          background: 'rgba(245,158,11,0.1)',
          padding: '2px 8px', borderRadius: 4, display: 'inline-block',
        }}>
          Isolation: {bed.isolation_type}
        </div>
      )}
    </div>
  )
}
