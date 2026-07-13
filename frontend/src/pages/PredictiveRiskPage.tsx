import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, TrendingUp, AlertTriangle, Search, Activity, Users, Brain, Heart, Wind, Bone, Pill, Stethoscope, ArrowRight, Clock, BarChart3 } from 'lucide-react'
import React from 'react'
import type { PatientRisksResponse, AggregatePatientRisk } from '../types'

const RISK_TYPE_CONFIG: { key: string; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'mortality_risk', label: 'Mortality', icon: Activity, color: '#ef4444' },
  { key: 'sepsis_risk', label: 'Sepsis', icon: AlertTriangle, color: '#f97316' },
  { key: 'cardiac_arrest_risk', label: 'Cardiac Arrest', icon: Heart, color: '#dc2626' },
  { key: 'cardiac_event_risk', label: 'Cardiac Event', icon: Heart, color: '#eab308' },
  { key: 'respiratory_failure_risk', label: 'Respiratory Failure', icon: Wind, color: '#a855f7' },
  { key: 'icu_transfer_risk', label: 'ICU Transfer', icon: TrendingUp, color: '#3b82f6' },
  { key: 'readmission_risk', label: 'Readmission', icon: Users, color: '#06b6d4' },
  { key: 'organ_failure_risk', label: 'Organ Failure', icon: Activity, color: '#f97316' },
  { key: 'length_of_stay_risk', label: 'Length of Stay', icon: Clock, color: '#8b5cf6' },
  { key: 'fall_risk', label: 'Fall', icon: Bone, color: '#ec4899' },
  { key: 'medication_complication_risk', label: 'Med. Complication', icon: Pill, color: '#14b8a6' },
]

const RISK_TYPE_ORDER = [
  'mortality_risk', 'sepsis_risk', 'cardiac_arrest_risk', 'cardiac_event_risk',
  'respiratory_failure_risk', 'icu_transfer_risk', 'readmission_risk',
  'organ_failure_risk', 'length_of_stay_risk', 'fall_risk', 'medication_complication_risk'
]

function riskColor(pct: number): string {
  if (pct >= 70) return '#ef4444'
  if (pct >= 50) return '#f97316'
  if (pct >= 30) return '#eab308'
  if (pct >= 15) return '#22c55e'
  return '#6b7280'
}

function riskLabel(pct: number): string {
  if (pct >= 70) return 'Critical'
  if (pct >= 50) return 'High'
  if (pct >= 30) return 'Elevated'
  if (pct >= 15) return 'Low'
  return 'Minimal'
}

function RiskBar({ pct, color, height = 6 }: { pct: number; color?: string; height?: number }) {
  const c = color || riskColor(pct)
  return (
    <div style={{ width: '100%', height, background: 'var(--border-default)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: c, borderRadius: 3, transition: 'width 0.5s ease' }} />
    </div>
  )
}

function RiskGauge({ pct, size = 80 }: { pct: number; size?: number }) {
  const c = riskColor(pct)
  const r = (size - 8) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (pct / 100) * circumference
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-default)" strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth={6}
        strokeDasharray={circumference} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        fill="var(--text-primary)" fontSize={size * 0.22} fontWeight={700} fontFamily="monospace">
        {Math.round(pct)}%
      </text>
    </svg>
  )
}

function ForecastChart({ forecasts, riskKey }: { forecasts: NonNullable<PatientRisksResponse['forecasts']>; riskKey: string }) {
  const labels = ['1h', '3h', '6h', '12h']
  const values = labels.map(l => forecasts[l]?.[riskKey] ?? 0)
  const maxVal = Math.max(...values, 10)
  const width = 200
  const height = 80
  const barWidth = Math.floor((width - 20) / 4)
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {values.map((v, i) => {
        const barH = (v / maxVal) * (height - 16)
        const x = 10 + i * (barWidth + 4)
        return (
          <g key={i}>
            <rect x={x} y={height - 8 - barH} width={barWidth - 2} height={barH}
              rx={3} fill={riskColor(v)} opacity={0.8} style={{ transition: 'height 0.5s ease' }} />
            <text x={x + (barWidth - 2) / 2} y={height - 2} textAnchor="middle"
              fill="var(--text-muted)" fontSize={9} fontFamily="monospace">
              {labels[i]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function PatientRiskCard({ patient, selected, onSelect }: {
  patient: AggregatePatientRisk
  selected: boolean
  onSelect: () => void
}) {
  const topRisk = RISK_TYPE_ORDER.reduce<{ key: string; pct: number }>(
    (best, k) => {
      const pct = patient.risks?.[k]?.riskPercentage ?? 0
      return pct > best.pct ? { key: k, pct } : best
    },
    { key: '', pct: 0 }
  )
  const categoryColor = patient.stability_category === 'critical' ? '#ef4444'
    : patient.stability_category === 'high_risk' ? '#f97316'
    : patient.stability_category === 'elevated' ? '#eab308'
    : patient.stability_category === 'observation' ? '#22c55e'
    : '#6b7280'

  return (
    <div
      onClick={onSelect}
      style={{
        padding: '10px 12px',
        borderRadius: 8,
        cursor: 'pointer',
        background: selected ? 'var(--bg-elevated)' : 'transparent',
        border: selected ? '1px solid var(--border-active)' : '1px solid transparent',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { if (!selected) { e.currentTarget.style.background = 'var(--bg-hover)' } }}
      onMouseLeave={e => { if (!selected) { e.currentTarget.style.background = 'transparent' } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: categoryColor, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            Stay {patient.stay_id}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            (ID {patient.subject_id})
          </span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: categoryColor }}>
          {patient.stability_category.replace('_', ' ').toUpperCase()}
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {patient.admission_diagnosis || 'No diagnosis'} — {patient.first_careunit?.split('(')[0]?.trim() || 'Unknown'}
      </div>
      {topRisk.key && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Top risk:</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: riskColor(topRisk.pct) }}>
            {RISK_TYPE_CONFIG.find(c => c.key === topRisk.key)?.label || topRisk.key}: {Math.round(topRisk.pct)}%
          </span>
        </div>
      )}
    </div>
  )
}

export function PredictiveRiskPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<PatientRisksResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPatient, setSelectedPatient] = useState<AggregatePatientRisk | null>(null)
  const [selectedForecast, setSelectedForecast] = useState('3h')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRiskType, setFilterRiskType] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/patient-risks')
      const json = await res.json()
      setData(json)
      if (json.patient_risks?.length > 0 && !selectedPatient) {
        setSelectedPatient(json.patient_risks[0])
      }
    } catch (err) {
      console.error('Failed to load patient risks', err)
    } finally {
      setLoading(false)
    }
  }, [selectedPatient])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredPatients = (data?.patient_risks || []).filter(p => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!String(p.stay_id).includes(q) && !String(p.subject_id).includes(q) && !(p.admission_diagnosis || '').toLowerCase().includes(q)) return false
    }
    if (filterRiskType) {
      const pct = p.risks?.[filterRiskType]?.riskPercentage ?? 0
      if (pct < 15) return false
    }
    return true
  })

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Brain size={40} color="var(--text-accent)" style={{ marginBottom: 16, opacity: 0.5 }} />
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading predictive risk models...</div>
        </div>
      </div>
    )
  }

  const selectedRisks = selectedPatient?.risks || {}
  const forecastLabels = ['1h', '3h', '6h', '12h']

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexShrink: 0 }}>
        <div>
          <h1 className="outfit" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0', letterSpacing: -0.3, display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldAlert size={22} color="var(--text-accent)" /> Predictive Risk Engine
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0, paddingLeft: 32 }}>
            AI-powered risk assessment across {data?.patient_count || 0} patients • {RISK_TYPE_ORDER.length} prediction models
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {forecastLabels.map(lbl => (
            <button key={lbl}
              onClick={() => setSelectedForecast(lbl)}
              style={{
                padding: '6px 14px',
                background: selectedForecast === lbl ? 'var(--bg-elevated)' : 'transparent',
                color: selectedForecast === lbl ? 'var(--text-primary)' : 'var(--text-muted)',
                border: selectedForecast === lbl ? '1px solid var(--border-active)' : '1px solid var(--border-default)',
                borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
              }}>
              {lbl.toUpperCase()} FORECAST
            </button>
          ))}
        </div>
      </div>

      {/* Global Averages Bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexShrink: 0, overflowX: 'auto', paddingBottom: 4 }}>
        {RISK_TYPE_CONFIG.map(cfg => {
          const avg = data?.risk_averages?.[cfg.key] ?? 0
          const highCount = data?.high_risk_counts?.[cfg.key] ?? 0
          return (
            <div key={cfg.key} onClick={() => setFilterRiskType(filterRiskType === cfg.key ? '' : cfg.key)}
              style={{
                flexShrink: 0, padding: '8px 12px', borderRadius: 8,
                background: filterRiskType === cfg.key ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                border: filterRiskType === cfg.key ? `1px solid ${cfg.color}40` : '1px solid var(--border-default)',
                cursor: 'pointer', transition: 'all 0.15s', minWidth: 100,
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                {React.createElement(cfg.icon, { size: 12, color: cfg.color })}
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{cfg.label}</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: riskColor(avg), fontFamily: 'monospace' }}>
                {avg}%
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                {highCount} patients ≥50%
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Patient List */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 12px 8px 12px', borderBottom: '1px solid var(--border-default)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search patient..."
                style={{
                  width: '100%', padding: '7px 10px 7px 30px', borderRadius: 6,
                  background: 'var(--bg-deepest)', border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)', fontSize: 12, outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              {filteredPatients.length} patients
              {filterRiskType ? ` • filtered by ${RISK_TYPE_CONFIG.find(c => c.key === filterRiskType)?.label}` : ''}
              {filterRiskType ? <span onClick={() => setFilterRiskType('')} style={{ color: 'var(--text-accent)', cursor: 'pointer', marginLeft: 6 }}>clear</span> : null}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
            {filteredPatients.map(p => (
              <PatientRiskCard key={p.stay_id} patient={p}
                selected={selectedPatient?.stay_id === p.stay_id}
                onSelect={() => setSelectedPatient(p)} />
            ))}
            {filteredPatients.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                No patients match your search
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', paddingRight: 4 }}>
          {selectedPatient ? (
            <>
              {/* Patient Header */}
              <div className="glass-panel" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <h2 className="outfit" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      Stay #{selectedPatient.stay_id}
                    </h2>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Subject #{selectedPatient.subject_id}</span>
                    <div style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                      background: selectedPatient.stability_category === 'critical' ? 'rgba(239,68,68,0.1)' :
                        selectedPatient.stability_category === 'high_risk' ? 'rgba(249,115,22,0.1)' :
                        selectedPatient.stability_category === 'elevated' ? 'rgba(234,179,8,0.1)' :
                        'rgba(34,197,94,0.1)',
                      color: riskColor(
                        selectedPatient.stability_category === 'critical' ? 80 :
                        selectedPatient.stability_category === 'high_risk' ? 60 :
                        selectedPatient.stability_category === 'elevated' ? 40 : 20
                      ),
                      border: '1px solid currentColor'
                    }}>
                      {selectedPatient.stability_category.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {selectedPatient.admission_diagnosis || 'No diagnosis'} — {selectedPatient.gender || '?'} — {selectedPatient.age || '?'}y
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {selectedPatient.first_careunit?.split('(')[0]?.trim() || 'Unknown unit'} • Stability Score: {selectedPatient.stability_score}
                  </div>
                </div>
                <button className="btn-primary" style={{ padding: '7px 16px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => navigate(`/patients/${selectedPatient.stay_id}`)}>
                  <ArrowRight size={14} /> Full Patient View
                </button>
              </div>

              {/* Risk Type Grid (5x2 + 1) */}
              <div className="glass-panel" style={{ padding: 16 }}>
                <h3 className="outfit" style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Brain size={16} color="var(--text-accent)" /> ALL RISK PREDICTIONS
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {RISK_TYPE_CONFIG.map(cfg => {
                    const risk = selectedRisks[cfg.key] as { riskPercentage?: number; confidence?: number; contributors?: string[]; recommendation?: string } | undefined
                    const pct = risk?.riskPercentage ?? 0
                    const conf = risk?.confidence ?? 0
                    const contribs = risk?.contributors ?? []
                    const rec = risk?.recommendation ?? ''
                    return (
                      <div key={cfg.key} style={{
                        padding: 12, borderRadius: 8,
                        background: pct >= 50 ? 'rgba(239,68,68,0.03)' : pct >= 30 ? 'rgba(234,179,8,0.03)' : 'transparent',
                        border: `1px solid ${pct >= 50 ? 'rgba(239,68,68,0.15)' : pct >= 30 ? 'rgba(234,179,8,0.12)' : 'var(--border-default)'}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          {React.createElement(cfg.icon, { size: 13, color: cfg.color })}
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{cfg.label}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{ fontSize: 22, fontWeight: 700, color: riskColor(pct), fontFamily: 'monospace' }}>
                            {Math.round(pct)}%
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            CI: {Math.round(conf)}%
                          </span>
                        </div>
                        <RiskBar pct={pct} />
                        <div style={{ fontSize: 10, color: riskLabel(pct) === 'Critical' || riskLabel(pct) === 'High' ? 'var(--status-critical)' : 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>
                          {riskLabel(pct)}
                        </div>
                        {contribs.length > 0 && (
                          <div style={{ marginTop: 6 }}>
                            {contribs.slice(0, 2).map((c: string, i: number) => (
                              <div key={i} style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4 }}>• {c}</div>
                            ))}
                          </div>
                        )}
                        {rec && (
                          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
                            {rec}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Forecasting Panel */}
              <div className="glass-panel" style={{ padding: 16 }}>
                <h3 className="outfit" style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={16} color="var(--text-accent)" /> FORECAST WINDOWS — {selectedForecast.toUpperCase()}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                  {forecastLabels.map(lbl => {
                    const fData = data?.forecasts?.[lbl] ?? {}
                    const values = RISK_TYPE_ORDER.map(k => (fData[k] as { value?: number })?.value ?? 0)
                    const avgScore = values.reduce((a, b) => a + b, 0) / values.length
                    const avgConf = RISK_TYPE_ORDER.reduce((sum, k) => sum + ((fData[k] as { confidence?: number })?.confidence ?? 50), 0) / RISK_TYPE_ORDER.length
                    const isSelected = selectedForecast === lbl
                    const dist = data?.forecast_meta?.[lbl]?.deterioration_distribution ?? {}
                    const totalDist = Object.values(dist).reduce((a: number, b: number) => a + b, 0)
                    return (
                      <div key={lbl} onClick={() => setSelectedForecast(lbl)}
                        style={{
                          padding: 12, borderRadius: 8, cursor: 'pointer',
                          background: isSelected ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                          border: isSelected ? '1px solid var(--border-active)' : '1px solid var(--border-default)',
                          transition: 'all 0.15s', textAlign: 'center',
                        }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{lbl.toUpperCase()}</div>
                        <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: riskColor(avgScore) }}>
                          {Math.round(avgScore)}%
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Avg predicted risk</div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 6, fontSize: 10, color: 'var(--text-muted)' }}>
                          <span>CI: {Math.round(avgConf)}%</span>
                          {totalDist > 0 && <span>• {dist.critical ?? 0}+{dist.high ?? 0} high risk</span>}
                        </div>
                        <RiskBar pct={avgScore} height={4} />
                      </div>
                    )
                  })}
                </div>

                {/* Per-risk forecast chart row */}
                <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
                  <div style={{ display: 'flex', gap: 12, minWidth: 'max-content' }}>
                    {RISK_TYPE_CONFIG.map(cfg => {
                      const forecasts = forecastLabels.map(l => {
                        const f = (data?.forecasts?.[l]?.[cfg.key] as { value?: number; confidence?: number; trend?: string }) ?? {}
                        return { value: f.value ?? 0, conf: f.confidence ?? 50, trend: f.trend ?? 'stable', label: l }
                      })
                      const maxV = Math.max(...forecasts.map(f => f.value), 10)
                      return (
                        <div key={cfg.key} style={{ flexShrink: 0, width: 170, padding: 10, borderRadius: 6, border: '1px solid var(--border-default)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                            {React.createElement(cfg.icon, { size: 11, color: cfg.color })}
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{cfg.label}</span>
                          </div>
                          {/* Current value row */}
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: riskColor(forecasts.find(f => f.label === selectedForecast)?.value ?? 0) }}>
                              {Math.round(forecasts.find(f => f.label === selectedForecast)?.value ?? 0)}%
                            </span>
                            {(() => {
                              const t = forecasts.find(f => f.label === selectedForecast)?.trend
                              const arrow = t === 'declining' ? '↑' : t === 'improving' ? '↓' : '→'
                              const color = t === 'declining' ? '#ef4444' : t === 'improving' ? '#22c55e' : '#6b7280'
                              return <span style={{ color, fontSize: 14, fontWeight: 700 }} title={t}>{arrow}</span>
                            })()}
                          </div>
                          {/* Sparkline mini bars */}
                          <svg width={150} height={55} viewBox="0 0 150 55">
                            {forecasts.map((f, i) => {
                              const barH = (f.value / maxV) * 34
                              const x = 10 + i * 35
                              return (
                                <g key={i}>
                                  <rect x={x} y={48 - barH} width={26} height={Math.max(barH, 2)}
                                    rx={3} fill={riskColor(f.value)} opacity={0.8} />
                                  <text x={x + 13} y={52} textAnchor="middle" fill="var(--text-muted)" fontSize={8} fontFamily="monospace">
                                    {f.label}
                                  </text>
                                  <text x={x + 13} y={48 - barH - 2} textAnchor="middle" fill={riskColor(f.value)} fontSize={8} fontFamily="monospace" fontWeight={600}>
                                    {Math.round(f.value)}%
                                  </text>
                                </g>
                              )
                            })}
                          </svg>
                          {/* Confidence row */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                            {forecasts.map((f, i) => (
                              <span key={i} style={{ width: 35, textAlign: 'center' }}>±{f.conf}%</span>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Deterioration Summary */}
              <div className="glass-panel" style={{ padding: 16 }}>
                <h3 className="outfit" style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BarChart3 size={16} color="var(--text-accent)" /> RISK DISTRIBUTION — ALL PATIENTS
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {RISK_TYPE_CONFIG.map(cfg => {
                    const avg = data?.risk_averages?.[cfg.key] ?? 0
                    const highCount = data?.high_risk_counts?.[cfg.key] ?? 0
                    const total = data?.patient_count || 1
                    return (
                      <div key={cfg.key} style={{ padding: 10, borderRadius: 6, border: '1px solid var(--border-default)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          {React.createElement(cfg.icon, { size: 12, color: cfg.color })}
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{cfg.label}</span>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: riskColor(avg), fontFamily: 'monospace' }}>
                          {avg}% avg
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          {highCount}/{total} patients ≥50%
                        </div>
                        <RiskBar pct={avg} height={4} />
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                <Users size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                <div style={{ fontSize: 14 }}>Select a patient to view detailed risk analysis</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>or wait for data to load</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
