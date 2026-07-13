import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import type { VitalHistory } from '../../types'

interface Props {
  data: VitalHistory[]
  vitalKey: keyof VitalHistory
  color?: string
  unit?: string
  label?: string
  thresholdHigh?: number
  thresholdLow?: number
  height?: number
}

export function VitalChart({
  data, vitalKey, color = 'var(--chart-line)',
  unit = '', label, thresholdHigh, thresholdLow,
  height = 200,
}: Props) {
  const formatted = data.map(d => ({
    ...d,
    time: d.charttime ? d.charttime.slice(11, 16) : '',
  }))

  return (
    <div style={{
      background: 'var(--bg-surface)',
      borderRadius: 12,
      padding: 12,
      border: '1px solid var(--border-default)',
    }}>
      {label && (
        <div style={{
          fontSize: 12, color: 'var(--text-secondary)',
          marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase',
        }}>
          {label} {unit && <span style={{ color: 'var(--text-muted)' }}>({unit})</span>}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={formatted}>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            axisLine={{ stroke: 'var(--border-default)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--text-primary)',
            }}
            labelFormatter={(label) => `Time: ${label}`}
          />
          {thresholdHigh != null && (
            <ReferenceLine
              y={thresholdHigh}
              stroke="var(--status-critical)"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
          )}
          {thresholdLow != null && (
            <ReferenceLine
              y={thresholdLow}
              stroke="var(--status-critical)"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
          )}
          <Line
            type="monotone"
            dataKey={vitalKey as string}
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
