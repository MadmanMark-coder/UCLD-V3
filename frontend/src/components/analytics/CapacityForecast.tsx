import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

interface Props {
  current_occupancy: number
  projected_1h: number
  projected_2h: number
  projected_4h: number
  alert: string
  loading?: boolean
}

export function CapacityForecast(props: Props) {
  if (props.loading) {
    return (
      <div style={{
        padding: 16, borderRadius: 12,
        border: '1px solid var(--border-default)',
        background: 'var(--bg-deepest)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 260, color: 'var(--text-muted)', fontSize: 13,
      }}>
        Loading forecast...
      </div>
    )
  }

  const chartData = [
    { label: 'Now', pct: props.current_occupancy, fill: '#3b82f6' },
    { label: '+1h', pct: props.projected_1h, fill: props.projected_1h > 90 ? '#ef4444' : '#f59e0b' },
    { label: '+2h', pct: props.projected_2h, fill: props.projected_2h > 90 ? '#ef4444' : '#f59e0b' },
    { label: '+4h', pct: props.projected_4h, fill: props.projected_4h > 90 ? '#ef4444' : '#f59e0b' },
  ]

  const isCritical = props.projected_2h > 90 || props.projected_4h > 90

  return (
    <div style={{
      padding: 16, borderRadius: 12,
      border: '1px solid var(--border-default)',
      background: 'var(--bg-deepest)',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
        marginBottom: 16,
      }}>
        CAPACITY FORECAST
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" opacity={0.3} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} unit="%" />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-deepest)',
              border: '1px solid var(--border-default)',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number) => [`${value}%`, 'Occupancy']}
          />
          <Bar dataKey="pct" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      {props.alert && (
        <div style={{
          marginTop: 8, padding: '8px 12px', borderRadius: 8,
          background: isCritical ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
          border: `1px solid ${isCritical ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
          fontSize: 11, color: isCritical ? 'var(--status-critical)' : 'var(--status-elevated)',
        }}>
          {props.alert}
        </div>
      )}
    </div>
  )
}
