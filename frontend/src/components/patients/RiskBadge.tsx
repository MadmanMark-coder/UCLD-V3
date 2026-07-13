import type { RiskAnalysis } from '../../types'

interface Props {
  riskAnalysis?: RiskAnalysis | null
}

const CONDITION_LABELS: Record<string, string> = {
  sepsis_risk: 'Sepsis',
  respiratory_failure_risk: 'Resp Failure',
  cardiac_event_risk: 'Cardiac Event',
  fall_risk: 'Fall Risk',
  icu_escalation_risk: 'ICU Escalation',
}

export function RiskBadge({ riskAnalysis }: Props) {
  if (!riskAnalysis) {
    return (
      <span style={{
        fontSize: 10, padding: '2px 8px', borderRadius: 8,
        background: 'var(--bg-hover)', color: 'var(--text-muted)',
        whiteSpace: 'nowrap',
      }}>
        No risk data
      </span>
    )
  }

  const entries = Object.entries(riskAnalysis) as [string, { riskPercentage: number }][]
  const highest = entries.reduce((max, e) => (e[1]?.riskPercentage > (max?.[1]?.riskPercentage ?? -1) ? e : max), entries[0])
  if (!highest) return null

  const [key, score] = highest
  const pct = score?.riskPercentage ?? 0
  const color = pct >= 60 ? 'var(--status-critical)' : pct >= 30 ? 'var(--status-elevated)' : 'var(--status-stable)'
  const label = CONDITION_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <span
      title={entries.map(([k, s]) => `${CONDITION_LABELS[k] || k}: ${s?.riskPercentage ?? '?'}%`).join(' | ')}
      style={{
        fontSize: 10, padding: '2px 8px', borderRadius: 8,
        background: `${color}20`, color, border: `1px solid ${color}40`,
        whiteSpace: 'nowrap', cursor: 'default',
      }}
    >
      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: color, marginRight: 4, verticalAlign: 'middle' }} />
      {label} {pct}%
    </span>
  )
}
