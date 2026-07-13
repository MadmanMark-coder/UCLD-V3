interface KPI {
  value: number
  trend: 'up' | 'down' | 'stable'
}

interface Props {
  avg_stability: KPI
  active_alerts: KPI
  bed_occupancy: KPI
  equip_utilization: KPI
  loading?: boolean
}

function KPICard({ label, value, trend, suffix, higherIsBetter }: {
  label: string
  value: number
  trend: 'up' | 'down' | 'stable'
  suffix?: string
  higherIsBetter?: boolean
}) {
  const trendColor = trend === 'stable'
    ? 'var(--text-muted)'
    : (trend === 'up') === (higherIsBetter ?? true)
      ? 'var(--status-stable)'
      : 'var(--status-critical)'

  return (
    <div style={{
      padding: 16, borderRadius: 12,
      border: '1px solid var(--border-default)',
      background: 'var(--bg-deepest)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{
        fontSize: 28, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
        color: 'var(--text-primary)',
      }}>
        {value}{suffix}
      </div>
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: trendColor, fontSize: 14 }}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {trend === 'stable' ? 'No significant change' : `${trend === 'up' ? 'Rising' : 'Falling'} trend`}
        </span>
      </div>
    </div>
  )
}

export function KPIGrid(props: Props) {
  if (props.loading) {
    return (
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12,
      }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            padding: 16, borderRadius: 12,
            border: '1px solid var(--border-default)',
            background: 'var(--bg-deepest)',
          }}>
            <div style={{ height: 12, width: '60%', background: 'var(--bg-hover)', borderRadius: 4, marginBottom: 12 }} />
            <div style={{ height: 28, width: '40%', background: 'var(--bg-hover)', borderRadius: 4, marginBottom: 8 }} />
            <div style={{ height: 12, width: '80%', background: 'var(--bg-hover)', borderRadius: 4 }} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12,
    }}>
      <KPICard
        label="Avg Stability"
        value={props.avg_stability.value}
        trend={props.avg_stability.trend}
        higherIsBetter={true}
      />
      <KPICard
        label="Active Alerts"
        value={props.active_alerts.value}
        trend={props.active_alerts.trend}
        suffix=""
        higherIsBetter={false}
      />
      <KPICard
        label="Bed Occupancy"
        value={props.bed_occupancy.value}
        trend={props.bed_occupancy.trend}
        suffix="%"
        higherIsBetter={false}
      />
      <KPICard
        label="Equipment Utilization"
        value={props.equip_utilization.value}
        trend={props.equip_utilization.trend}
        suffix="%"
        higherIsBetter={false}
      />
    </div>
  )
}
