import { useNavigate } from 'react-router-dom'
import type { Patient } from '../../types'

interface Props {
  patients: Patient[]
}

function orbitDuration(score: number): number {
  if (score >= 80) return 60
  if (score >= 60) return 40
  if (score >= 40) return 25
  if (score >= 20) return 15
  return 8
}

const COLOR_MAP: Record<string, string> = {
  critical: 'var(--status-critical)',
  high_risk: 'var(--status-elevated)',
  elevated: 'var(--status-elevated)',
  observation: 'var(--alert-info)',
  stable: 'var(--status-stable)',
}

export function OrbitalRing({ patients }: Props) {
  const navigate = useNavigate()
  const radius = 120
  const center = 160

  if (patients.length === 0) {
    return (
      <div style={{
        width: 320, height: 320,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 12, border: '1px solid var(--border-default)',
        background: 'var(--bg-deepest)',
        color: 'var(--text-muted)', fontSize: 13,
      }}>
        No patients in cohort
      </div>
    )
  }

  return (
    <div style={{
      width: 320, height: 320,
      borderRadius: 12, border: '1px solid var(--border-default)',
      background: 'var(--bg-deepest)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <svg width="320" height="320" viewBox="0 0 320 320">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--border-default)" strokeWidth={0.5} opacity={0.3} />
        <circle cx={center} cy={center} r={radius * 0.7} fill="none" stroke="var(--border-default)" strokeWidth={0.5} opacity={0.2} />
        <circle cx={center} cy={center} r={radius * 0.4} fill="none" stroke="var(--border-default)" strokeWidth={0.5} opacity={0.1} />
        <text x={center} y={center + 2} fill="var(--text-muted)" fontSize={11} fontFamily="monospace" textAnchor="middle" opacity={0.5}>
          ICU
        </text>

        {patients.map((p, i) => {
          const angle = (i / patients.length) * 360
          const rad = (angle * Math.PI) / 180
          const px = center + radius * Math.cos(rad)
          const py = center + radius * Math.sin(rad)
          const color = COLOR_MAP[p.stability_category] || 'var(--text-muted)'
          const dur = orbitDuration(p.stability_score ?? 80)

          return (
            <g key={p.stay_id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/patients/${p.stay_id}`)}>
              <circle cx={px} cy={py} r={6} fill={color}>
                <animateMotion
                  dur={`${dur}s`}
                  repeatCount="indefinite"
                  path={`M${px},${py} A${radius},${radius} 0 1,1 ${px - 0.01},${py}`}
                />
              </circle>
              <circle cx={px} cy={py} r={6} fill={color} opacity={0.3}>
                <animateMotion
                  dur={`${dur}s`}
                  repeatCount="indefinite"
                  path={`M${px},${py} A${radius},${radius} 0 1,1 ${px - 0.01},${py}`}
                />
                <animate attributeName="r" values="6;14;6" dur={`${dur / 2}s`} repeatCount="indefinite" />
              </circle>
              <title>{`Patient ${p.subject_id} — Score: ${p.stability_score} (${p.stability_category})`}</title>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
