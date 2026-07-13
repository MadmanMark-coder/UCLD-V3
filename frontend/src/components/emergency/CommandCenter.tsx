import { useState, useEffect } from 'react'
import { useWebSocketContext } from '../../contexts/WebSocketContext'
import { EmergencyTimeline } from './EmergencyTimeline'
import type { EmergencyIncident, EmergencyKit, Patient } from '../../types'

interface Props {
  incident: EmergencyIncident
  onResolve: (id: string) => void
  onClose: () => void
}

export function CommandCenter({ incident, onResolve, onClose }: Props) {
  const { vitals } = useWebSocketContext()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [kit, setKit] = useState<EmergencyKit | null>(null)
  const [resolving, setResolving] = useState(false)

  useEffect(() => {
    const pid = incident.stay_id || incident.patient_id
    fetch(`/api/patients/${pid}`)
      .then(r => r.json())
      .then(setPatient)
      .catch(() => {})
  }, [incident])

  useEffect(() => {
    fetch(`/api/emergency/${incident.id}/kit`)
      .then(r => r.json())
      .then(setKit)
      .catch(() => {})
  }, [incident.id])

  const latestVitals = patient
    ? (vitals[String(patient.stay_id)] || patient.latest_vitals || {})
    : {}

  const handleResolve = async () => {
    setResolving(true)
    try {
      await fetch(`/api/emergency/${incident.id}/resolve`, { method: 'POST' })
      onResolve(incident.id)
    } catch {
      setResolving(false)
    }
  }

  const vitalColor = (key: string, value: number | undefined, low: number, high: number) => {
    if (value == null) return 'var(--text-muted)'
    if (value < low * 0.85 || value > high * 1.15) return 'var(--status-critical)'
    if (value < low || value > high) return 'var(--status-elevated)'
    return 'var(--status-stable)'
  }

  const vitalsList = [
    { key: 'heart_rate', label: 'HR', value: latestVitals.heart_rate, unit: 'bpm', low: 60, high: 100 },
    { key: 'sbp', label: 'SBP', value: latestVitals.sbp, unit: 'mmHg', low: 90, high: 160 },
    { key: 'dbp', label: 'DBP', value: latestVitals.dbp, unit: 'mmHg', low: 60, high: 90 },
    { key: 'spo2', label: 'SpO₂', value: latestVitals.spo2, unit: '%', low: 95, high: 100 },
    { key: 'resp_rate', label: 'RR', value: latestVitals.resp_rate, unit: '/min', low: 12, high: 20 },
  ]

  const timelineEvents = (incident.timeline || []).map((t: string, i: number) => ({
    timestamp: new Date(incident.detected_at).toISOString(),
    description: t,
    icon: i === 0 ? '🚨' : '·',
  }))

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(5,5,8,0.95)',
      display: 'flex', flexDirection: 'column',
      backdropFilter: 'blur(20px)',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 24px',
        borderBottom: '1px solid var(--status-critical)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>🚨</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--status-critical)' }}>
            CODE BLUE — Patient {incident.patient_id}
          </span>
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 6,
            background: `${incident.status === 'resolved' ? 'var(--status-stable)' : 'var(--status-critical)'}30`,
            color: incident.status === 'resolved' ? 'var(--status-stable)' : 'var(--status-critical)',
            textTransform: 'uppercase',
          }}>
            {incident.status}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{
            background: 'transparent', border: '1px solid var(--border-default)',
            color: 'var(--text-muted)', padding: '6px 16px', borderRadius: 8,
            fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Minimize
          </button>
          <button onClick={handleResolve} disabled={resolving} style={{
            background: resolving ? 'var(--bg-hover)' : 'var(--status-stable)',
            border: 'none', color: '#000', padding: '6px 16px', borderRadius: 8,
            fontSize: 12, fontWeight: 600, cursor: resolving ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}>
            {resolving ? 'Resolving...' : 'Resolve'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, overflow: 'hidden' }}>
        <div style={{ padding: 24, overflow: 'auto', borderRight: '1px solid var(--border-default)' }}>
          {patient && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Patient {patient.stay_id} · {patient.gender === 'M' ? 'Male' : 'Female'}, {patient.age}y
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {patient.first_careunit} · {patient.admission_diagnosis || 'No diagnosis'}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
              Vital Signs
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {vitalsList.map(v => (
                <div key={v.key} style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 10, padding: 12, textAlign: 'center',
                  border: '1px solid var(--border-default)',
                }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {v.label}
                  </div>
                  <div style={{
                    fontSize: 28, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                    color: vitalColor(v.key, v.value, v.low, v.high),
                    lineHeight: 1.3,
                  }}>
                    {v.value != null ? v.value : '--'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{v.unit}</div>
                </div>
              ))}
            </div>
          </div>

          {patient?.risk_analysis && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                Risk Contributors
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                {Object.entries(patient.risk_analysis).map(([key, val]) => {
                  const pct = (val as { riskPercentage?: number }).riskPercentage ?? 0
                  if (pct < 30) return null
                  return (
                    <li key={key} style={{ marginBottom: 4 }}>
                      {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}: {pct}%
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        <div style={{ padding: 24, overflow: 'auto' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
              Response Timeline
            </div>
            <EmergencyTimeline events={timelineEvents} />
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
              Deployed Equipment
            </div>
            {kit ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['defibrillators', 'ventilators', 'oxygen_tanks'].map(cat => {
                  const items = kit[cat as keyof EmergencyKit] as Array<{ name: string; location: string; battery_level: number }> | undefined
                  if (!items || items.length === 0) return null
                  const label = cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                  return (
                    <div key={cat} style={{
                      background: 'var(--bg-surface)', borderRadius: 8, padding: 10,
                      border: '1px solid var(--border-default)',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {label}
                      </div>
                      {items.map((item, i) => (
                        <div key={i} style={{
                          display: 'flex', justifyContent: 'space-between',
                          fontSize: 12, color: 'var(--text-primary)',
                          padding: '3px 0',
                        }}>
                          <span>{item.name}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{item.location}</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
                {!Object.values(kit).some(v => Array.isArray(v) && v.length > 0) && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No equipment data available.</div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading equipment data...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
