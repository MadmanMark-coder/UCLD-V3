import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area,
} from 'recharts'

interface TrendsData {
  timestamps: string[]
  avg_stability: number[]
  alert_count: number[]
  occupancy: number[]
  utilization: number[]
}

interface Props {
  data: TrendsData | null
  loading?: boolean
}

type MetricKey = 'avg_stability' | 'alert_count' | 'occupancy' | 'utilization'

const METRICS: { key: MetricKey; label: string; color: string }[] = [
  { key: 'avg_stability', label: 'Avg Stability', color: '#22c55e' },
  { key: 'alert_count', label: 'Alert Count', color: '#ef4444' },
  { key: 'occupancy', label: 'Bed Occupancy %', color: '#3b82f6' },
  { key: 'utilization', label: 'Equipment Utilization %', color: '#f59e0b' },
]

export function TrendChart({ data, loading }: Props) {
  const [metric, setMetric] = useState<MetricKey>('avg_stability')

  if (loading) {
    return (
      <div style={{
        padding: 16, borderRadius: 12,
        border: '1px solid var(--border-default)',
        background: 'var(--bg-deepest)', height: 280,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', fontSize: 13,
      }}>
        Loading chart...
      </div>
    )
  }

  if (!data || data.timestamps.length === 0) {
    return (
      <div style={{
        padding: 16, borderRadius: 12,
        border: '1px solid var(--border-default)',
        background: 'var(--bg-deepest)', height: 280,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', fontSize: 13,
      }}>
        No trend data available yet
      </div>
    )
  }

  const chartData = data.timestamps.map((t, i) => {
    const date = new Date(t)
    return {
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      [metric]: data[metric][i],
    }
  })

  const meta = METRICS.find(m => m.key === metric)!

  return (
    <div style={{
      padding: 16, borderRadius: 12,
      border: '1px solid var(--border-default)',
      background: 'var(--bg-deepest)',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
          TREND — {meta.label.toUpperCase()}
        </div>
        <select
          value={metric}
          onChange={e => setMetric(e.target.value as MetricKey)}
          style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
            borderRadius: 6, padding: '4px 8px', fontSize: 11,
            color: 'var(--text-primary)', fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          {METRICS.map(m => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
        </select>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" opacity={0.3} />
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-deepest)',
              border: '1px solid var(--border-default)',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Area type="monotone" dataKey={metric} fill={meta.color} fillOpacity={0.1} />
          <Line type="monotone" dataKey={metric} stroke={meta.color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
