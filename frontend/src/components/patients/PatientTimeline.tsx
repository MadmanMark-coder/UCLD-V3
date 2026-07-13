import { useMemo } from 'react'
import type { VitalHistory, Alert } from '../../types'

interface TimelineEntry {
  time: string
  icon: string
  description: string
  type: 'vital' | 'alert' | 'lab' | 'medication'
}

interface Props {
  vitals: VitalHistory[]
  alerts: Alert[]
}

export function PatientTimeline({ vitals, alerts }: Props) {
  const entries: TimelineEntry[] = useMemo(() => {
    const result: TimelineEntry[] = []

    for (const v of vitals) {
      const abnormal: string[] = []
      if (v.heart_rate != null && (v.heart_rate < 60 || v.heart_rate > 100)) abnormal.push(`HR ${v.heart_rate}`)
      if (v.spo2 != null && v.spo2 < 95) abnormal.push(`SpO₂ ${v.spo2}%`)
      if (v.resp_rate != null && (v.resp_rate < 12 || v.resp_rate > 20)) abnormal.push(`RR ${v.resp_rate}`)
      if (abnormal.length > 0) {
        result.push({
          time: v.charttime,
          icon: '❤️',
          description: `Abnormal: ${abnormal.join(', ')}`,
          type: 'vital',
        })
      }
    }

    for (const a of alerts) {
      result.push({
        time: a.generated_at,
        icon: a.severity === 'critical' ? '🔴' : a.severity === 'warning' ? '🟡' : '🔵',
        description: a.title,
        type: 'alert',
      })
    }

    result.sort((a, b) => b.time.localeCompare(a.time))
    return result.slice(0, 50)
  }, [vitals, alerts])

  if (entries.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20, textAlign: 'center' }}>
        No timeline events yet.
      </div>
    )
  }

  return (
    <div style={{
      maxHeight: 400,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      {entries.map((e, i) => (
        <div key={i} style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: '8px 12px',
          borderRadius: 8,
          background: e.type === 'alert' ? 'var(--bg-hover)' : 'transparent',
          fontSize: 13,
        }}>
          <span style={{ flexShrink: 0, fontSize: 14 }}>{e.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-primary)' }}>{e.description}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
              {e.time ? e.time.slice(11, 19) : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
