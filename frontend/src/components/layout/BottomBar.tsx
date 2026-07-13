import { useState, useEffect } from 'react'

interface BedStats {
  total: number
  available: number
  occupied: number
  by_department: Record<string, { total: number; occupied: number }>
}

export function BottomBar() {
  const [stats, setStats] = useState<BedStats | null>(null)

  useEffect(() => {
    fetch('/api/beds/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  const total = stats?.total ?? 32
  const occupied = stats?.occupied ?? 0
  const pct = total > 0 ? (occupied / total) * 100 : 0

  const barColor = pct > 85 ? 'var(--status-critical)' : pct > 70 ? 'var(--status-elevated)' : 'var(--status-stable)'

  const deptBreakdown = (dept: string) => {
    if (!stats?.by_department?.[dept]) return '0%'
    const d = stats.by_department[dept]
    const pct = d.total > 0 ? (d.occupied / d.total) * 100 : 0
    return `${dept} ${pct.toFixed(0)}%`
  }

  return (
    <footer style={{
      height: 36,
      background: 'var(--bg-deepest)',
      borderTop: '1px solid var(--border-default)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 16,
      fontSize: 12,
      color: 'var(--text-muted)',
      flexShrink: 0,
    }}>
      <span>Beds {occupied}/{total}</span>
      <div style={{
        flex: 1, maxWidth: 200, height: 6,
        background: 'var(--bg-elevated)',
        borderRadius: 3, overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: barColor,
          borderRadius: 3,
          transition: 'width 0.3s, background 0.3s',
        }} />
      </div>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: barColor }}>{pct.toFixed(0)}%</span>
      <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }}>
        {deptBreakdown('MICU')} | {deptBreakdown('SICU')} | {deptBreakdown('CCU')} | {deptBreakdown('ED')}
      </span>
    </footer>
  )
}
