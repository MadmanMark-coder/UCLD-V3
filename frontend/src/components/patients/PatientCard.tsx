import { useNavigate } from 'react-router-dom'
import { StabilityGauge } from './StabilityGauge'
import { RiskBadge } from './RiskBadge'
import type { Patient } from '../../types'

interface VitalRow {
  key: string
  label: string
  value: number | undefined
  unit: string
  color: string
}

function vitalColor(key: string, value: number | undefined): string {
  if (value == null) return 'var(--text-muted)'
  switch (key) {
    case 'heart_rate':
      if (value < 50 || value > 120) return 'var(--status-critical)'
      if (value < 60 || value > 100) return 'var(--status-elevated)'
      return 'var(--status-stable)'
    case 'sbp':
      if (value < 80 || value > 180) return 'var(--status-critical)'
      if (value < 90 || value > 160) return 'var(--status-elevated)'
      return 'var(--status-stable)'
    case 'dbp':
      if (value < 50 || value > 100) return 'var(--status-critical)'
      if (value < 60 || value > 90) return 'var(--status-elevated)'
      return 'var(--status-stable)'
    case 'spo2':
      if (value < 90) return 'var(--status-critical)'
      if (value < 95) return 'var(--status-elevated)'
      return 'var(--status-stable)'
    case 'resp_rate':
      if (value < 8 || value > 25) return 'var(--status-critical)'
      if (value < 12 || value > 20) return 'var(--status-elevated)'
      return 'var(--status-stable)'
    case 'temperature':
      if (value < 35 || value > 39) return 'var(--status-critical)'
      if (value < 36 || value > 38) return 'var(--status-elevated)'
      return 'var(--status-stable)'
    default:
      return 'var(--text-secondary)'
  }
}

interface Props {
  patient: Patient
}

export function PatientCard({ patient }: Props) {
  const navigate = useNavigate()
  const v = patient.latest_vitals || {}

  const rows: VitalRow[] = [
    { key: 'heart_rate', label: 'HR', value: v.heart_rate, unit: 'bpm', color: vitalColor('heart_rate', v.heart_rate) },
    { key: 'sbp', label: 'SBP', value: v.sbp, unit: 'mmHg', color: vitalColor('sbp', v.sbp) },
    { key: 'dbp', label: 'DBP', value: v.dbp, unit: 'mmHg', color: vitalColor('dbp', v.dbp) },
    { key: 'spo2', label: 'SpO₂', value: v.spo2, unit: '%', color: vitalColor('spo2', v.spo2) },
    { key: 'resp_rate', label: 'RR', value: v.resp_rate, unit: '/min', color: vitalColor('resp_rate', v.resp_rate) },
    { key: 'temperature', label: 'Temp', value: v.temperature, unit: '°C', color: vitalColor('temperature', v.temperature) },
  ]

  const isCritical = patient.stability_category === 'critical'

  return (
    <div
      onClick={() => navigate(`/patients/${patient.stay_id}`)}
      style={{
        position: 'relative',
        background: 'var(--bg-surface)',
        borderRadius: 14,
        border: `1px solid ${isCritical ? 'var(--status-critical)' : 'var(--border-default)'}`,
        padding: 16,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = isCritical ? 'var(--status-critical)' : 'var(--border-hover)'
        e.currentTarget.style.boxShadow = isCritical ? 'var(--glow-red)' : 'var(--glow-cyan)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = isCritical ? 'var(--status-critical)' : 'var(--border-default)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {isCritical && (
        <div style={{
          position: 'absolute',
          inset: -1,
          borderRadius: 14,
          border: '2px solid var(--status-critical)',
          animation: 'pulse 1.5s infinite',
          pointerEvents: 'none',
        }} />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            Patient #{patient.stay_id}
            <RiskBadge riskAnalysis={patient.risk_analysis} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {patient.gender === 'M' ? 'Male' : 'Female'}, {patient.age}y
          </div>
          {patient.admission_diagnosis && (
            <div style={{
              fontSize: 11, color: 'var(--text-secondary)',
              marginTop: 4, display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {patient.admission_diagnosis}
            </div>
          )}
        </div>
        <StabilityGauge score={patient.stability_score} size="small" />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 6,
      }}>
        {rows.map(r => (
          <div key={r.key} style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              {r.label}
            </div>
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              color: r.color,
              lineHeight: 1.3,
            }}>
              {r.value != null ? r.value : '--'}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>
              {r.unit}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
