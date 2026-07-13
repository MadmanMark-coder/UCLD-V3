import { useState, useEffect, useMemo } from 'react'
import { BedCard } from './BedCard'
import type { Bed } from '../../types'

interface BedStats {
  total: number
  available: number
  occupied: number
  cleaning: number
  reserved: number
  by_department: Record<string, { total: number; available: number; occupied: number; cleaning: number; reserved: number }>
}

const DEPARTMENTS = ['ALL', 'MICU', 'SICU', 'CCU', 'STEPDOWN', 'ED']

export function BedBoard() {
  const [beds, setBeds] = useState<Bed[]>([])
  const [stats, setStats] = useState<BedStats | null>(null)
  const [activeDept, setActiveDept] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const handleBedAction = (bed: Bed) => {
    if (bed.status === 'available') {
      window.location.href = '/patients'
    } else if (bed.status === 'occupied') {
      alert('Release bed: ' + bed.room_number)
    }
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/beds').then(r => r.json()),
      fetch('/api/beds/stats').then(r => r.json()),
    ])
      .then(([bedsData, statsData]) => {
        setBeds(bedsData)
        setStats(statsData)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (activeDept === 'ALL') return beds
    return beds.filter(b => b.department === activeDept)
  }, [beds, activeDept])

  const deptStats = useMemo(() => {
    if (!stats) return null
    if (activeDept === 'ALL') return stats
    return stats.by_department[activeDept] || null
  }, [stats, activeDept])

  if (loading) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 10,
      }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ height: 100, background: 'var(--bg-surface)', borderRadius: 12, animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Bed Board</h2>
        </div>
      </div>

      {deptStats && (
        <div style={{
          display: 'flex', gap: 16, marginBottom: 16, fontSize: 12, color: 'var(--text-secondary)',
          flexWrap: 'wrap',
        }}>
          <span>Available: <span style={{ color: 'var(--status-stable)', fontWeight: 600 }}>{deptStats.available}</span></span>
          <span>Occupied: <span style={{ color: 'var(--status-critical)', fontWeight: 600 }}>{deptStats.occupied}</span></span>
          <span>Cleaning: <span style={{ color: 'var(--status-elevated)', fontWeight: 600 }}>{deptStats.cleaning}</span></span>
          <span>Total: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{deptStats.total}</span></span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {DEPARTMENTS.map(dept => (
          <button
            key={dept}
            onClick={() => setActiveDept(dept)}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: activeDept === dept ? 600 : 400,
              color: activeDept === dept ? 'var(--text-accent)' : 'var(--text-muted)',
              background: activeDept === dept ? 'var(--bg-hover)' : 'transparent',
              border: `1px solid ${activeDept === dept ? 'var(--border-active)' : 'var(--border-default)'}`,
              borderRadius: 8,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.1s',
            }}
          >
            {dept === 'ALL' ? 'All Departments' : dept}
          </button>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 10,
      }}>
        {filtered.map(bed => (
          <BedCard key={bed.id} bed={bed} onAssign={handleBedAction} onRelease={handleBedAction} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          No beds found for this department.
        </div>
      )}
    </div>
  )
}
