import { useState } from 'react'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts'
import type { RiskAnalysis } from '../../types'

interface Props {
  riskAnalysis?: RiskAnalysis | null
}

const CONDITION_LABELS: Record<string, string> = {
  sepsis_risk: 'Sepsis',
  respiratory_failure_risk: 'Resp Failure',
  cardiac_event_risk: 'Cardiac',
  fall_risk: 'Fall',
  icu_escalation_risk: 'ICU Esc',
}

export function RiskRadar({ riskAnalysis }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (!riskAnalysis) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
        No risk assessment available. Risk data will appear here once the AI analysis runs.
      </div>
    )
  }

  const chartData = Object.entries(riskAnalysis).map(([key, val]) => ({
    condition: CONDITION_LABELS[key] || key,
    risk: val?.riskPercentage ?? 0,
    fullKey: key,
  }))

  const details = Object.entries(riskAnalysis) as [string, { riskPercentage: number; confidence: number; contributors: string[]; recommendation: string }][]

  const pctColor = (pct: number) => pct >= 60 ? 'var(--status-critical)' : pct >= 30 ? 'var(--status-elevated)' : 'var(--status-stable)'

  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="var(--chart-grid)" />
          <PolarAngleAxis dataKey="condition" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
          <Radar name="Risk" dataKey="risk" stroke="var(--ai-message)" fill="var(--ai-message)" fillOpacity={0.3} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>

      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          background: 'transparent', border: 'none', color: 'var(--text-accent)',
          fontSize: 12, cursor: 'pointer', padding: '8px 0', fontFamily: 'inherit',
          width: '100%', textAlign: 'center',
        }}
      >
        {expanded ? 'Hide Details' : 'Show Details'}
      </button>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {details.map(([key, val]) => {
            const pct = val?.riskPercentage ?? 0
            const conf = val?.confidence ?? 0
            const contributors = val?.contributors ?? []
            const recommendation = val?.recommendation ?? ''
            return (
              <div key={key} style={{
                background: 'var(--bg-elevated)', borderRadius: 10, padding: 12,
                border: '1px solid var(--border-default)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {CONDITION_LABELS[key] || key.replace(/_/g, ' ')}
                  </span>
                  <span style={{
                    fontSize: 14, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                    color: pctColor(pct),
                  }}>
                    {pct}%
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                  Confidence: {conf}%
                </div>
                {contributors.length > 0 && (
                  <ul style={{ margin: '4px 0', paddingLeft: 16, fontSize: 11, color: 'var(--text-secondary)' }}>
                    {contributors.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                )}
                {recommendation && (
                  <div style={{ fontSize: 11, color: 'var(--text-accent)', marginTop: 4 }}>
                    {recommendation}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
