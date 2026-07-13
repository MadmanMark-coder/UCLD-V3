import type { VitalSigns } from '../../types'

interface VitalConfig {
  key: keyof VitalSigns
  label: string
  unit: string
  thresholds: { low: number; criticalLow: number; high: number; criticalHigh: number }
}

const VITAL_CONFIGS: VitalConfig[] = [
  { key: 'heart_rate', label: 'HR', unit: 'bpm', thresholds: { low: 60, criticalLow: 50, high: 100, criticalHigh: 120 } },
  { key: 'sbp', label: 'SBP', unit: 'mmHg', thresholds: { low: 90, criticalLow: 80, high: 160, criticalHigh: 180 } },
  { key: 'dbp', label: 'DBP', unit: 'mmHg', thresholds: { low: 60, criticalLow: 50, high: 90, criticalHigh: 100 } },
  { key: 'spo2', label: 'SpO₂', unit: '%', thresholds: { low: 95, criticalLow: 90, high: 100, criticalHigh: 100 } },
  { key: 'resp_rate', label: 'RR', unit: '/min', thresholds: { low: 12, criticalLow: 8, high: 20, criticalHigh: 25 } },
  { key: 'temperature', label: 'Temp', unit: '°C', thresholds: { low: 36, criticalLow: 35, high: 38, criticalHigh: 39 } },
]

function getVitalColor(value: number | undefined, cfg: VitalConfig): string {
  if (value == null) return 'var(--text-muted)'
  if (value <= cfg.thresholds.criticalLow || value >= cfg.thresholds.criticalHigh) return 'var(--status-critical)'
  if (value < cfg.thresholds.low || value > cfg.thresholds.high) return 'var(--status-elevated)'
  return 'var(--status-stable)'
}

interface Props {
  vitals: VitalSigns
}

export function VitalPanel({ vitals }: Props) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 8,
    }}>
      {VITAL_CONFIGS.map(cfg => {
        const value = vitals[cfg.key]
        const color = getVitalColor(value, cfg)
        return (
          <div key={cfg.key} style={{
            background: 'var(--bg-surface)',
            borderRadius: 10,
            padding: '12px 16px',
            border: `1px solid ${color}22`,
            borderLeft: `3px solid ${color}`,
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 2,
            }}>
              {cfg.label}
            </div>
            <div style={{
              fontSize: 28,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              color,
              lineHeight: 1.2,
              transition: 'color 0.3s',
            }}>
              {value != null ? value : '--'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {cfg.unit}
            </div>
          </div>
        )
      })}
    </div>
  )
}
