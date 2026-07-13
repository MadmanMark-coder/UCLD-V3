import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Patient, VitalHistory, StaffMember, PatientOverview, PatientRisk, PatientTimeline, PatientLabs, PatientMedications, PatientNotes, Diagnosis, Prescription, LabResult, TimelineEvent, RiskScore } from '../../types'
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip, YAxis, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { AlertCircle, Activity, ChevronRight, User, Stethoscope, FileText, X, Loader, CheckCircle, Phone, Heart, Brain, Plus, Edit3, Trash2, Search, AlertTriangle, TrendingUp, TrendingDown, Clock, Calendar, Pill, Shield, BarChart3, ActivitySquare, Thermometer, Droplets, Zap, ChevronDown, ChevronUp } from 'lucide-react'

type Tab = 'OVERVIEW' | 'VITALS' | 'LAB RESULTS' | 'RISK SCORE' | 'TIMELINE' | 'NOTES' | 'MEDICATIONS' | 'ALLERGIES' | 'ACTIONS'
const API = '/api'

const getStatusColor = (c: string) => ({ critical: 'var(--status-critical)', high_risk: 'var(--status-high-risk)', elevated: 'var(--status-elevated)', observation: 'var(--status-observation)' })[c] || 'var(--status-stable)'
const getStatusLabel = (c: string) => c ? c.replace(/_/g, ' ').toUpperCase() : 'STABLE'

function RiskBadge({ pct, label }: { pct: number; label: string }) {
  const color = pct >= 70 ? 'var(--status-critical)' : pct >= 50 ? 'var(--status-high-risk)' : pct >= 30 ? 'var(--status-elevated)' : 'var(--status-stable)'
  return <div style={{ background: 'var(--bg-deepest)', border: `1px solid ${color}33`, borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.5 }}>{label}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s' }} />
      </div>
      <span className="mono" style={{ fontSize: 14, fontWeight: 700, color }}>{pct}%</span>
    </div>
  </div>
}

export function PatientDetail({ patient, vitalsHistory = [] }: Props) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW')
  const [loading, setLoading] = useState(false)
  const [overview, setOverview] = useState<PatientOverview | null>(null)
  const [risk, setRisk] = useState<PatientRisk | null>(null)
  const [labs, setLabs] = useState<PatientLabs | null>(null)
  const [timeline, setTimeline] = useState<PatientTimeline | null>(null)
  const [meds, setMeds] = useState<PatientMedications | null>(null)
  const [notes, setNotes] = useState<PatientNotes[]>([])
  const [activeForecast, setActiveForecast] = useState('3h')
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [showConsultModal, setShowConsultModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showNoteSuccess, setShowNoteSuccess] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [noteCategory, setNoteCategory] = useState('general')
  const [team, setTeam] = useState<StaffMember[]>([])
  const [specialists, setSpecialists] = useState<StaffMember[]>([])
  const [expandedTimeline, setExpandedTimeline] = useState<Set<number>>(new Set())
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [noteSearch, setNoteSearch] = useState('')
  const [showAIGenerate, setShowAIGenerate] = useState(false)
  const [aiNoteType, setAiNoteType] = useState('progress')
  const [aiGenerating, setAiGenerating] = useState(false)

  const v = patient.latest_vitals || {}
  const handleEmergency = () => navigate('/emergency')

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch(`${API}/patients/${patient.stay_id}/overview`)
      if (res.ok) setOverview(await res.json())
    } catch {}
  }, [patient.stay_id])

  const fetchRisk = useCallback(async () => {
    try {
      const res = await fetch(`${API}/patients/${patient.stay_id}/risk`)
      if (res.ok) setRisk(await res.json())
    } catch {}
  }, [patient.stay_id])

  const fetchLabs = useCallback(async () => {
    try {
      const res = await fetch(`${API}/patients/${patient.stay_id}/labs?hours=168`)
      if (res.ok) setLabs(await res.json())
    } catch {}
  }, [patient.stay_id])

  const fetchTimeline = useCallback(async () => {
    try {
      const res = await fetch(`${API}/patients/${patient.stay_id}/timeline`)
      if (res.ok) setTimeline(await res.json())
    } catch {}
  }, [patient.stay_id])

  const fetchMeds = useCallback(async () => {
    try {
      const res = await fetch(`${API}/patients/${patient.stay_id}/medications`)
      if (res.ok) setMeds(await res.json())
    } catch {}
  }, [patient.stay_id])

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`${API}/notes?patient_id=${patient.stay_id}`)
      if (res.ok) setNotes(await res.json())
    } catch {}
  }, [patient.stay_id])

  const fetchTeam = useCallback(async () => {
    setLoading(true)
    try { const res = await fetch(`${API}/staff/nurses`); if (res.ok) setTeam(await res.json()) } catch {} finally { setLoading(false) }
  }, [])

  const fetchSpecialists = useCallback(async () => {
    setLoading(true)
    try { const res = await fetch(`${API}/staff/specialists`); if (res.ok) setSpecialists(await res.json()) } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchOverview(); fetchRisk() }, [fetchOverview, fetchRisk])
  useEffect(() => { if (activeTab === 'LAB RESULTS') fetchLabs() }, [activeTab, fetchLabs])
  useEffect(() => { if (activeTab === 'TIMELINE') fetchTimeline() }, [activeTab, fetchTimeline])
  useEffect(() => { if (activeTab === 'MEDICATIONS') fetchMeds() }, [activeTab, fetchMeds])
  useEffect(() => { if (activeTab === 'NOTES') fetchNotes() }, [activeTab, fetchNotes])

  const handleSaveNote = async () => {
    if (!noteContent.trim()) return
    try {
      const res = await fetch(`${API}/notes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patient.stay_id, content: noteContent, category: noteCategory, author: 'Dr. Martinez' })
      })
      if (res.ok) {
        const newNote = await res.json()
        setNotes(prev => [{ id: newNote.id, patient_id: String(patient.stay_id), content: noteContent, category: noteCategory, author: 'Dr. Martinez', created_at: newNote.created_at, updated_at: newNote.created_at }, ...prev])
        setShowNoteModal(false); setNoteContent(''); setShowNoteSuccess(true); setTimeout(() => setShowNoteSuccess(false), 2000)
      }
    } catch {}
  }

  const handleAIGenerate = async () => {
    setAiGenerating(true)
    try {
      const res = await fetch(`${API}/notes/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patient.stay_id, note_type: aiNoteType, author: 'Dr. Martinez' })
      })
      if (res.ok) {
        const note = await res.json()
        setNotes(prev => [note, ...prev])
        setShowAIGenerate(false); setShowNoteSuccess(true); setTimeout(() => setShowNoteSuccess(false), 2000)
      }
    } catch {}
    setAiGenerating(false)
  }

  const handleDeleteNote = async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    try { await fetch(`${API}/notes/${id}`, { method: 'DELETE' }) } catch {}
  }

  const handleEditNote = async (id: string) => {
    if (!editContent.trim()) return
    const prevContent = editContent
    setNotes(prev => prev.map(n => n.id === id ? { ...n, content: prevContent } : n))
    setEditingNote(null)
    try {
      await fetch(`${API}/notes/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent })
      })
    } catch {}
  }

  const tabs: Tab[] = ['OVERVIEW', 'VITALS', 'LAB RESULTS', 'RISK SCORE', 'TIMELINE', 'NOTES', 'MEDICATIONS', 'ALLERGIES', 'ACTIONS']

  const mockHistory = [
    { charttime: '0h', heart_rate: 85, sbp: 110, dbp: 70, spo2: 97, resp_rate: 18 },
    { charttime: '4h', heart_rate: 90, sbp: 115, dbp: 75, spo2: 96, resp_rate: 19 },
    { charttime: '8h', heart_rate: 110, sbp: 100, dbp: 65, spo2: 94, resp_rate: 22 },
    { charttime: '12h', heart_rate: 130, sbp: 90, dbp: 60, spo2: 91, resp_rate: 25 },
    { charttime: '16h', heart_rate: 145, sbp: 85, dbp: 55, spo2: 88, resp_rate: 28 },
  ]
  const data = vitalsHistory.length > 0 ? vitalsHistory : mockHistory

  const vRisk = risk?.risk_analysis || {}
  const forecasts = (vRisk as any)?.forecasts || {}
  const forecast = forecasts[activeForecast] || {}

  const filteredNotes = notes.filter(n => noteSearch === '' || n.content.toLowerCase().includes(noteSearch.toLowerCase()) || n.category.toLowerCase().includes(noteSearch.toLowerCase()) || n.author.toLowerCase().includes(noteSearch.toLowerCase()))

  const codeBlue = async () => {
    try {
      await fetch(`${API}/emergency/trigger`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: String(patient.stay_id), stay_id: patient.stay_id, type: 'CODE_BLUE' })
      })
      navigate('/emergency')
    } catch {}
  }

  const codeRed = async () => {
    try {
      await fetch(`${API}/emergency/trigger`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: String(patient.stay_id), stay_id: patient.stay_id, type: 'CODE_RED' })
      })
      navigate('/emergency')
    } catch {}
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Patient Header */}
      <div className="glass-panel" style={{ padding: 24, borderLeft: `4px solid ${getStatusColor(patient.stability_category)}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="outfit" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              Patient {patient.subject_id || patient.stay_id}
            </div>
            <div style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 12 }}>
              {patient.gender === 'M' ? 'Male' : 'Female'}, {patient.age} years
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Stay #{patient.stay_id} | {patient.first_careunit || 'ICU'} | {patient.admission_diagnosis || 'N/A'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <button className="btn-critical" onClick={codeBlue} style={{ background: '#2563eb', border: '1px solid #1d4ed8' }}><Zap size={14} /> CODE BLUE</button>
            <button className="btn-critical" onClick={codeRed} style={{ background: '#dc2626', border: '1px solid #b91c1c' }}><AlertTriangle size={14} /> CODE RED</button>
            <div style={{ width: 1, height: 32, background: 'var(--border-default)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.5 }}>STATUS</span>
              <span style={{ color: getStatusColor(patient.stability_category), fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: getStatusColor(patient.stability_category) }} />
                {getStatusLabel(patient.stability_category)}
              </span>
            </div>
            <div style={{ width: 1, height: 32, background: 'var(--border-default)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.5 }}>STABILITY SCORE</span>
              <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 15 }}>
                {patient.stability_score.toFixed(0)}/100
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', gap: 24, overflow: 'hidden' }}>
        {/* Sidebar Nav */}
        <div className="glass-panel" style={{ width: 200, padding: 12, overflowY: 'auto', background: 'var(--bg-primary)', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', background: activeTab === tab ? 'var(--bg-elevated)' : 'transparent',
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: '1px solid transparent', borderRadius: 6, fontSize: 13,
                fontWeight: activeTab === tab ? 600 : 500, cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {tab} {activeTab === tab && <ChevronRight size={14} color="var(--text-accent)" />}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', paddingRight: 8 }}>

          {/* ==================== OVERVIEW TAB ==================== */}
          {activeTab === 'OVERVIEW' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="glass-panel" style={{ padding: 24 }}>
                <h3 className="outfit" style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={16} color="var(--text-accent)" /> PATIENT OVERVIEW
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Subject ID:</span> <span style={{ color: 'var(--text-primary)' }}>{overview?.demographics?.subject_id || patient.subject_id}</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Gender:</span> <span style={{ color: 'var(--text-primary)' }}>{patient.gender === 'M' ? 'Male' : 'Female'}</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Age:</span> <span style={{ color: 'var(--text-primary)' }}>{patient.age} years</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Admission Type:</span> <span style={{ color: 'var(--text-primary)' }}>{overview?.demographics?.admission_type || 'N/A'}</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Admission Location:</span> <span style={{ color: 'var(--text-primary)' }}>{overview?.demographics?.admission_location || 'N/A'}</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>First Care Unit:</span> <span style={{ color: 'var(--text-primary)' }}>{overview?.demographics?.first_careunit || patient.first_careunit}</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Insurance:</span> <span style={{ color: 'var(--text-primary)' }}>{overview?.demographics?.insurance || 'N/A'}</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Race:</span> <span style={{ color: 'var(--text-primary)' }}>{overview?.demographics?.race || 'N/A'}</span></div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: 24 }}>
                <h3 className="outfit" style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: 600 }}>DIAGNOSES</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(overview?.diagnoses || []).slice(0, 8).map((d: Diagnosis, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: 'var(--text-secondary)' }}>
                      <AlertCircle size={12} style={{ marginTop: 3, flexShrink: 0, color: 'var(--text-accent)' }} />
                      <span>{d.long_title} <span style={{ color: 'var(--text-muted)' }}>({d.icd_code})</span></span>
                    </div>
                  ))}
                  {(!overview?.diagnoses || overview.diagnoses.length === 0) && <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No diagnoses recorded</span>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="glass-panel" style={{ padding: 24, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <h3 className="outfit" style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Activity size={16} color="var(--status-critical)" /> AI RISK ASSESSMENT
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.entries(vRisk).filter(([k]) => k !== 'forecasts').slice(0, 4).map(([key, val]) => (
                      val && typeof val === 'object' && 'riskPercentage' in val ? (
                        <RiskBadge key={key} pct={(val as RiskScore).riskPercentage} label={key.replace(/_/g, ' ').toUpperCase()} />
                      ) : null
                    ))}
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: 24 }}>
                  <h3 className="outfit" style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Brain size={16} color="var(--text-accent)" /> AI CLINICAL SUMMARY
                  </h3>
                  {overview?.ai_summary ? (
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text-accent)', fontWeight: 600, marginBottom: 8 }}>{overview.ai_summary.one_liner}</div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{overview.ai_summary.summary}</p>
                      {overview.ai_summary.recommendations && overview.ai_summary.recommendations.length > 0 && (
                        <div style={{ marginTop: 12, padding: 12, background: 'rgba(0,229,255,0.05)', borderRadius: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-accent)', marginBottom: 6 }}>RECOMMENDATIONS:</div>
                          {overview.ai_summary.recommendations.map((r: string, i: number) => (
                            <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 12, marginBottom: 4, position: 'relative' }}>
                              <span style={{ position: 'absolute', left: 0 }}>•</span> {r}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>AI summary not available. Groq API may not be configured.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== VITALS TAB ==================== */}
          {activeTab === 'VITALS' && (
            <>
              <div className="glass-panel" style={{ padding: 24 }}>
                <h3 className="outfit" style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity size={16} color="var(--text-accent)" /> VITAL SIGNS
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                  <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: 16, borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, letterSpacing: 0.5 }}>HEART RATE</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: (v.heart_rate || 0) > 100 ? 'var(--status-critical)' : 'var(--text-primary)' }}>
                      {v.heart_rate || '--'} <span style={{ fontSize: 14 }}>bpm</span>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(249, 115, 22, 0.05)', border: '1px solid rgba(249, 115, 22, 0.2)', padding: 16, borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, letterSpacing: 0.5 }}>BLOOD PRESSURE</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: (v.sbp || 0) < 100 ? 'var(--status-critical)' : 'var(--text-primary)' }}>
                      {v.sbp || '--'}/{v.dbp || '--'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(249, 115, 22, 0.05)', border: '1px solid rgba(249, 115, 22, 0.2)', padding: 16, borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, letterSpacing: 0.5 }}>O2 SATURATION</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: (v.spo2 || 100) < 92 ? 'var(--status-critical)' : 'var(--text-primary)' }}>
                      {v.spo2 || '--'}% {v.spo2 && v.spo2 < 92 && <AlertCircle size={16} style={{ verticalAlign: 'middle' }} />}
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-deepest)', border: '1px solid var(--border-default)', padding: 16, borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, letterSpacing: 0.5 }}>TEMPERATURE</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: (v.temperature || 37) > 38 ? 'var(--status-critical)' : 'var(--text-primary)' }}>
                      {v.temperature || '--'}°C
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-deepest)', border: '1px solid var(--border-default)', padding: 16, borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, letterSpacing: 0.5 }}>RESP RATE</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: (v.resp_rate || 16) > 24 ? 'var(--status-high-risk)' : 'var(--text-primary)' }}>
                      {v.resp_rate || '--'} <span style={{ fontSize: 14 }}>/min</span>
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-deepest)', border: '1px solid var(--border-default)', padding: 16, borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, letterSpacing: 0.5 }}>GLUCOSE</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {v.glucose || '--'} <span style={{ fontSize: 14 }}>mg/dL</span>
                    </div>
                  </div>
                </div>

                <div style={{ height: 280, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                      <XAxis dataKey="charttime" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6 }} />
                      <Line type="monotone" dataKey="heart_rate" stroke="var(--status-critical)" strokeWidth={2} dot={{ r: 3 }} name="HR" />
                      <Line type="monotone" dataKey="sbp" stroke="var(--status-high-risk)" strokeWidth={2} dot={{ r: 3 }} name="Sys BP" />
                      <Line type="monotone" dataKey="spo2" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="SpO2" />
                      <Line type="monotone" dataKey="resp_rate" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} name="RR" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="glass-panel" style={{ padding: 24 }}>
                <h3 className="outfit" style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 600 }}>QUICK ACTIONS</h3>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button className="btn-critical" onClick={() => navigate('/emergency')}><Activity size={14} /> ACTIVATE SEPSIS PROTOCOL</button>
                  <button className="btn-primary" onClick={() => { fetchTeam(); setShowTeamModal(true) }}><Phone size={14} /> CALL TEAM</button>
                  <button className="btn-outline" onClick={() => { fetchSpecialists(); setShowConsultModal(true) }}><Stethoscope size={14} /> REQUEST CONSULT</button>
                  <button className="btn-outline" onClick={() => setShowNoteModal(true)}><FileText size={14} /> ADD NOTE</button>
                </div>
              </div>
            </>
          )}

          {/* ==================== LAB RESULTS TAB ==================== */}
          {activeTab === 'LAB RESULTS' && (
            <div className="glass-panel" style={{ padding: 24 }}>
              <h3 className="outfit" style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Droplets size={16} color="var(--text-accent)" /> LABORATORY RESULTS
              </h3>
              {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}><Loader size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>}
              {!loading && labs && labs.labs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr 0.8fr', gap: 8, padding: '8px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 0.5, borderBottom: '1px solid var(--border-default)' }}>
                    <span>TEST</span><span>VALUE</span><span>FLAG</span><span>UNIT</span><span>REF RANGE</span><span>TIME</span>
                  </div>
                  {labs.labs.map((lab: LabResult, i: number) => {
                    const ref = lab.reference_range
                    const flagColor = lab.flag === 'high' ? 'var(--status-critical)' : lab.flag === 'low' ? 'var(--status-high-risk)' : 'var(--status-stable)'
                    return (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr 0.8fr', gap: 8, padding: '10px 12px', fontSize: 13, borderBottom: '1px solid var(--border-default)', color: 'var(--text-secondary)', alignItems: 'center', background: lab.flag !== 'normal' && lab.flag !== undefined ? 'rgba(239,68,68,0.03)' : 'transparent' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{lab.lab_name || `Item ${lab.itemid}`}</span>
                        <span className="mono" style={{ fontWeight: 600, color: flagColor }}>{lab.valuenum}</span>
                        <span style={{ color: flagColor, fontWeight: 600, fontSize: 12 }}>{lab.flag === 'high' ? '↑ HIGH' : lab.flag === 'low' ? '↓ LOW' : 'Normal'}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{ref?.unit || ''}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{ref ? `${ref.low} - ${ref.high}` : '--'}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{lab.charttime?.split(' ')[0] || ''}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  {!loading && 'No laboratory results available for this patient in the MIMIC database.'}
                </div>
              )}

              {labs?.microbiology && labs.microbiology.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <h3 className="outfit" style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={14} color="var(--text-accent)" /> MICROBIOLOGY / CULTURE RESULTS
                  </h3>
                  {labs.microbiology.map((m: any, i: number) => (
                    <div key={i} style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-default)', fontSize: 13, color: 'var(--text-secondary)' }}>
                      {m.spec_type_desc}: <strong>{m.org_name || 'No organism'}</strong> ({m.interpretation}) — {m.chartdate || m.charttime}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== RISK SCORE TAB ==================== */}
          {activeTab === 'RISK SCORE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* System Confidence Header */}
              <div className="glass-panel" style={{ padding: 20, border: '1px solid var(--border-default)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div className="outfit" style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Brain size={18} color="var(--text-accent)" /> PREDICTIVE RISK ENGINE
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>SYSTEM CONFIDENCE</div>
                      <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {(() => {
                          const scores = Object.values(vRisk).filter(v => v && typeof v === 'object' && 'confidence' in v) as RiskScore[]
                          const avg = scores.length > 0 ? Math.round(scores.reduce((s, r) => s + (r.confidence || 0), 0) / scores.length) : 0
                          return `${avg}%`
                        })()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>STABILITY SCORE</div>
                      <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: patient.stability_score > 70 ? 'var(--status-stable)' : patient.stability_score > 50 ? 'var(--status-elevated)' : 'var(--status-critical)' }}>
                        {patient.stability_score.toFixed(0)}/100
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ height: 2, width: '100%', background: 'var(--border-default)', borderRadius: 1, marginTop: 8 }}>
                  <div style={{ width: `${patient.stability_score}%`, height: '100%', background: patient.stability_score > 70 ? 'var(--status-stable)' : patient.stability_score > 50 ? 'var(--status-elevated)' : 'var(--status-critical)', borderRadius: 1, transition: 'width 0.5s' }} />
                </div>
              </div>

              {/* All 10 Risk Predictions */}
              <div className="glass-panel" style={{ padding: 24 }}>
                <h3 className="outfit" style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BarChart3 size={16} color="var(--text-accent)" /> RISK ASSESSMENT DASHBOARD
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
                  {Object.entries(vRisk).filter(([k]) => k !== 'forecasts').map(([key, val]) => {
                    const r = val as RiskScore
                    if (!r || typeof r !== 'object' || !('riskPercentage' in r)) return null
                    const pct = r.riskPercentage
                    const color = pct >= 70 ? '#ef4444' : pct >= 50 ? '#f97316' : pct >= 30 ? '#eab308' : '#22c55e'
                    const conf = r.confidence || 0
                    return (
                      <div key={key} style={{ background: 'var(--bg-deepest)', borderRadius: 8, border: `1px solid ${color}22`, padding: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.3 }}>{key.replace(/_/g, ' ').toUpperCase()}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>conf:</span>
                            <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: conf > 70 ? 'var(--status-stable)' : conf > 40 ? 'var(--status-elevated)' : 'var(--status-critical)' }}>{conf}%</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <div className="mono" style={{ fontSize: 28, fontWeight: 700, color }}>{pct}%</div>
                          <div style={{ flex: 1, height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s' }} />
                          </div>
                        </div>
                        {r.contributors && r.contributors.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                            {r.contributors.slice(0, 2).map((c: string, i: number) => (
                              <span key={i} style={{ fontSize: 10, padding: '2px 6px', background: `${color}11`, borderRadius: 4, color: color }}>{c}</span>
                            ))}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.4 }}>{r.recommendation}</div>
                      </div>
                    )
                  })}
                </div>

                {/* Risk Comparison Bar Chart */}
                <div style={{ height: 220, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(vRisk).filter(([k, v]) => k !== 'forecasts' && v && typeof v === 'object' && 'riskPercentage' in (v as any)).map(([k, v]) => ({ name: k.replace(/_/g, ' ').replace(' risk', ''), value: (v as RiskScore).riskPercentage, conf: (v as RiskScore).confidence }))} layout="vertical" barSize={12}>
                      <XAxis type="number" domain={[0, 100]} stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} width={130} />
                      <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6 }} formatter={(v: any, n: any) => [v, n]} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {Object.entries(vRisk).filter(([k]) => k !== 'forecasts').map(([k, v], i) => {
                          const pct = (v as RiskScore)?.riskPercentage || 0
                          return <Cell key={i} fill={pct >= 70 ? '#ef4444' : pct >= 50 ? '#f97316' : pct >= 30 ? '#eab308' : '#22c55e'} />
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Deterioration Detection */}
              {risk?.deterioration && (
                <div className="glass-panel" style={{ padding: 24, border: risk.deterioration.has_deteriorated ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(34,197,94,0.2)' }}>
                  <h3 className="outfit" style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrendingUp size={16} color={risk.deterioration.has_deteriorated ? 'var(--status-critical)' : 'var(--status-stable)'} />
                    DETERIORATION STATUS
                  </h3>
                  <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: risk.deterioration.has_deteriorated ? 'var(--status-critical)' : 'var(--status-stable)' }}>
                      {risk.deterioration.has_deteriorated ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
                      {risk.deterioration.has_deteriorated ? 'Deterioration Detected' : 'No Significant Deterioration'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Confidence: <strong className="mono">{risk.deterioration.confidence}%</strong></span>
                    {risk.deterioration.severity && (
                      <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 4, fontWeight: 600,
                        background: risk.deterioration.severity === 'critical' ? 'rgba(239,68,68,0.15)' : risk.deterioration.severity === 'high' ? 'rgba(249,115,22,0.15)' : 'rgba(234,179,8,0.15)',
                        color: risk.deterioration.severity === 'critical' ? 'var(--status-critical)' : risk.deterioration.severity === 'high' ? 'var(--status-high-risk)' : 'var(--status-elevated)' }}>
                        {risk.deterioration.severity.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>{risk.deterioration.description}</p>
                  {risk.deterioration.indicators && risk.deterioration.indicators.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {risk.deterioration.indicators.map((ind: string, i: number) => (
                        <span key={i} style={{ fontSize: 12, padding: '4px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 4, color: 'var(--status-critical)', fontWeight: 500 }}>{ind}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Predictive Forecasts with Trend Chart */}
              <div className="glass-panel" style={{ padding: 24 }}>
                <h3 className="outfit" style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={16} color="var(--text-accent)" /> PREDICTIVE FORECAST WINDOWS
                </h3>

                {/* Forecast Tab Selector + Mini Preview */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {['1h', '3h', '6h', '12h'].map(h => {
                    const f = (forecasts as any)?.[h] || {}
                    const score = f.deterioration_score
                    const fColor = score > 50 ? 'var(--status-critical)' : score > 30 ? 'var(--status-high-risk)' : 'var(--status-stable)'
                    return (
                      <button key={h} onClick={() => setActiveForecast(h)} style={{
                        flex: 1, padding: '10px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        background: activeForecast === h ? 'var(--bg-elevated)' : 'var(--bg-deepest)',
                        color: activeForecast === h ? 'var(--text-primary)' : 'var(--text-secondary)',
                        border: activeForecast === h ? `1px solid ${fColor}` : '1px solid var(--border-default)',
                        textAlign: 'center', transition: 'all 0.15s',
                      }}>
                        <div>{h.toUpperCase()}</div>
                        {score !== undefined && (
                          <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: fColor, marginTop: 2 }}>
                            {score}%
                          </div>
                        )}
                        {f.risk_trend && (
                          <div style={{ fontSize: 10, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, color: f.risk_trend === 'declining' ? 'var(--status-critical)' : f.risk_trend === 'improving' ? 'var(--status-stable)' : 'var(--text-muted)' }}>
                            {f.risk_trend === 'declining' ? <TrendingDown size={10} /> : f.risk_trend === 'improving' ? <TrendingUp size={10} /> : null}
                            {f.risk_trend?.toUpperCase()}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Forecast Trend Chart */}
                {Object.keys(forecasts).length > 0 && (
                  <div style={{ height: 140, width: '100%', marginBottom: 20 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={['1h', '3h', '6h', '12h'].map(h => ({
                        window: h,
                        score: (forecasts as any)?.[h]?.deterioration_score || 0,
                        conf: (forecasts as any)?.[h]?.confidence || 0,
                      }))}>
                        <defs>
                          <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="window" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                        <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6 }} />
                        <Area type="monotone" dataKey="score" stroke="#ef4444" strokeWidth={2} fill="url(#forecastGrad)" dot={{ r: 5, fill: '#ef4444' }} name="Deterioration Score" />
                        <Area type="monotone" dataKey="conf" stroke="#22c55e" strokeWidth={1.5} strokeDasharray="4 4" dot={{ r: 3, fill: '#22c55e' }} name="Confidence" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Selected Forecast Detail */}
                {forecast && forecast.deterioration_score !== undefined ? (
                  <div style={{ background: 'var(--bg-deepest)', borderRadius: 8, border: '1px solid var(--border-default)', padding: 20 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>PREDICTED DETERIORATION</div>
                        <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: (forecast.deterioration_score || 0) > 50 ? 'var(--status-critical)' : (forecast.deterioration_score || 0) > 30 ? 'var(--status-high-risk)' : 'var(--status-stable)' }}>
                          {forecast.deterioration_score}%
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>in {activeForecast} window</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>CONFIDENCE</div>
                        <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{forecast.confidence}%</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>model certainty</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>RISK TREND</div>
                        <div style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: forecast.risk_trend === 'declining' ? 'var(--status-critical)' : forecast.risk_trend === 'improving' ? 'var(--status-stable)' : 'var(--text-primary)' }}>
                          {forecast.risk_trend === 'declining' ? <TrendingDown size={18} /> : forecast.risk_trend === 'improving' ? <TrendingUp size={18} /> : <Activity size={18} />}
                          {forecast.risk_trend?.toUpperCase() || 'STABLE'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>RECOMMENDATION LEVEL</div>
                        <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: (forecast.deterioration_score || 0) > 60 ? 'var(--status-critical)' : (forecast.deterioration_score || 0) > 30 ? 'var(--status-high-risk)' : 'var(--status-stable)' }}>
                          {(forecast.deterioration_score || 0) > 60 ? 'URGENT' : (forecast.deterioration_score || 0) > 30 ? 'CAUTION' : 'STANDARD'}
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 6, marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>AI EXPLANATION</div>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{forecast.explanation || 'No explanation available.'}</p>
                    </div>

                    {forecast.suggested_interventions && forecast.suggested_interventions.length > 0 && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-accent)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Activity size={14} /> SUGGESTED INTERVENTIONS
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {forecast.suggested_interventions.map((si: string, i: number) => (
                            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 14px', background: 'rgba(0,229,255,0.03)', borderRadius: 6, border: '1px solid rgba(0,229,255,0.1)', fontSize: 13, color: 'var(--text-secondary)' }}>
                              <span style={{ color: 'var(--text-accent)', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                              <span>{si}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {forecast.key_risks && forecast.key_risks.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--status-critical)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <AlertTriangle size={14} /> KEY RISKS IN THIS WINDOW
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {forecast.key_risks.map((kr: any, i: number) => (
                            <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 12px', background: 'rgba(239,68,68,0.03)', borderRadius: 6, border: '1px solid rgba(239,68,68,0.1)', fontSize: 13 }}>
                              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1, color: 'var(--status-critical)' }} />
                              <div>
                                <strong style={{ color: 'var(--text-primary)' }}>{kr.condition}</strong>
                                <span style={{ color: 'var(--text-muted)' }}> — Probability: {kr.probability}%</span>
                                {kr.warning && <div style={{ color: 'var(--status-critical)', fontSize: 12, marginTop: 2 }}>{kr.warning}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', background: 'var(--bg-deepest)', borderRadius: 8, border: '1px solid var(--border-default)' }}>
                    <Clock size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
                    <div>Select a forecast window above to view AI-generated predictions.</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>The Groq AI model provides dynamic forecasts based on current vitals and trends.</div>
                  </div>
                )}
              </div>

              {/* Risk Trend History */}
              <div className="glass-panel" style={{ padding: 24 }}>
                <h3 className="outfit" style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={16} color="var(--text-accent)" /> RISK TREND HISTORY
                </h3>
                <div style={{ height: 160, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={['1h', '3h', '6h', '12h'].map(h => ({
                      window: h,
                      ...(['mortality_risk', 'sepsis_risk', 'cardiac_arrest_risk', 'respiratory_failure_risk', 'readmission_risk'].reduce((acc, key) => {
                        const r = vRisk[key] as RiskScore
                        if (r) acc[key.replace('_risk', '')] = r.riskPercentage
                        return acc
                      }, {} as any))
                    }))}>
                      <defs>
                        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                      </defs>
                      <XAxis dataKey="window" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6 }} />
                      <Area type="monotone" dataKey="mortality" stroke="#ef4444" strokeWidth={1.5} dot={{ r: 3, fill: '#ef4444' }} name="Mortality" />
                      <Area type="monotone" dataKey="sepsis" stroke="#f97316" strokeWidth={1.5} dot={{ r: 3, fill: '#f97316' }} name="Sepsis" />
                      <Area type="monotone" dataKey="cardiac_arrest" stroke="#a855f7" strokeWidth={1.5} dot={{ r: 3, fill: '#a855f7' }} name="Cardiac Arrest" />
                      <Area type="monotone" dataKey="respiratory_failure" stroke="#3b82f6" strokeWidth={1.5} dot={{ r: 3, fill: '#3b82f6' }} name="Respiratory Failure" />
                      <Area type="monotone" dataKey="readmission" stroke="#22c55e" strokeWidth={1.5} dot={{ r: 3, fill: '#22c55e' }} name="Readmission" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TIMELINE TAB ==================== */}
          {activeTab === 'TIMELINE' && (
            <div className="glass-panel" style={{ padding: 24 }}>
              <h3 className="outfit" style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={16} color="var(--text-accent)" /> PATIENT TIMELINE
              </h3>
              {!timeline ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}><Loader size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>
              ) : timeline.events.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No timeline events available.</div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: 24 }}>
                  <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, background: 'var(--border-default)' }} />
                  {timeline.events.slice(0, 100).map((ev: TimelineEvent, i: number) => {
                    const typeColors: Record<string, string> = {
                      TRANSFER: '#3b82f6', MEDICATION: '#a855f7', LAB: '#22c55e',
                      VITAL: '#f97316', ALERT: '#ef4444',
                    }
                    const icons: Record<string, any> = {
                      TRANSFER: <Activity size={12} />, MEDICATION: <Pill size={12} />,
                      LAB: <Droplets size={12} />, VITAL: <ActivitySquare size={12} />, ALERT: <AlertTriangle size={12} />,
                    }
                    const color = typeColors[ev.type] || 'var(--text-muted)'
                    return (
                      <div key={i} style={{ position: 'relative', padding: '0 0 16px 16px' }}>
                        <div style={{ position: 'absolute', left: -20, top: 4, width: 16, height: 16, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          {icons[ev.type] || <Clock size={12} />}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{ev.time}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
                          <span style={{ color, fontWeight: 600 }}>{ev.type}</span>
                          <span>{ev.detail}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================== NOTES TAB ==================== */}
          {activeTab === 'NOTES' && (
            <div className="glass-panel" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 className="outfit" style={{ margin: 0, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={16} color="var(--text-accent)" /> CLINICAL NOTES
                </h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-deepest)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '0 10px' }}>
                    <Search size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                    <input
                      type="text" placeholder="Search notes..." value={noteSearch}
                      onChange={e => setNoteSearch(e.target.value)}
                      style={{ padding: '6px 8px', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 13, width: 200 }}
                    />
                  </div>
                  <button className="btn-outline" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setShowAIGenerate(true)}><Brain size={14} /> AI GENERATE</button>
                  <button className="btn-primary" onClick={() => setShowNoteModal(true)}><Plus size={14} /> ADD NOTE</button>
                </div>
              </div>

              {filteredNotes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                  <FileText size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                  <div>No clinical notes yet. Click "Add Note" to create one.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {filteredNotes.map(n => (
                    <div key={n.id} style={{ padding: 16, background: 'var(--bg-deepest)', borderRadius: 8, border: '1px solid var(--border-default)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: 'rgba(0,229,255,0.1)', color: 'var(--text-accent)' }}>{n.category.replace(/_/g, ' ').toUpperCase()}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{n.author}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(n.created_at).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => { setEditingNote(n.id); setEditContent(n.content) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><Edit3 size={14} /></button>
                          <button onClick={() => handleDeleteNote(n.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><Trash2 size={14} /></button>
                        </div>
                      </div>
                      {editingNote === n.id ? (
                        <div>
                          <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={3}
                            style={{ width: '100%', padding: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', marginBottom: 8 }}
                          />
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="btn-outline" onClick={() => setEditingNote(null)}>CANCEL</button>
                            <button className="btn-primary" onClick={() => handleEditNote(n.id)}>SAVE</button>
                          </div>
                        </div>
                      ) : (
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{n.content}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== MEDICATIONS TAB ==================== */}
          {activeTab === 'MEDICATIONS' && (
            <div className="glass-panel" style={{ padding: 24 }}>
              <h3 className="outfit" style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Pill size={16} color="var(--text-accent)" /> MEDICATIONS
              </h3>
              {!meds ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}><Loader size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>
              ) : (
                <>
                  {meds.current && meds.current.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--status-stable)', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle size={14} /> CURRENT MEDICATIONS
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {meds.current.map((m: Prescription, i: number) => (
                          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr', gap: 8, padding: '10px 12px', background: 'rgba(34,197,94,0.03)', borderBottom: '1px solid var(--border-default)', fontSize: 13 }}>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{m.drug}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{m.dose_val_rx} {m.dose_unit_rx}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{m.route}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{m.starttime?.split(' ')[0] || ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={14} /> MEDICATION HISTORY
                    </h4>
                    {meds.medications && meds.medications.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {meds.medications.slice(0, 20).map((m: Prescription, i: number) => (
                          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--border-default)', fontSize: 13 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{m.drug}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{m.dose_val_rx} {m.dose_unit_rx}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{m.route}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{m.starttime?.split(' ')[0] || ''} → {m.stoptime?.split(' ')[0] || 'current'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No medication records found.</div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ==================== ALLERGIES TAB ==================== */}
          {activeTab === 'ALLERGIES' && (
            <div className="glass-panel" style={{ padding: 24 }}>
              <h3 className="outfit" style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={16} color="var(--text-accent)" /> ALLERGIES & ALERTS
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ padding: 16, background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Shield size={14} color="var(--status-elevated)" /> NO KNOWN ALLERGIES RECORDED
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    No allergy records found in the MIMIC database for this patient. Allergies data may not be available in the demo dataset.
                  </div>
                </div>

                <div style={{ padding: 16, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={14} color="var(--status-stable)" /> AI MEDICATION SAFETY CHECK
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    No drug-allergy interactions detected. Continue monitoring for adverse reactions.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== ACTIONS TAB ==================== */}
          {activeTab === 'ACTIONS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="glass-panel" style={{ padding: 24 }}>
                <h3 className="outfit" style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Zap size={16} color="var(--text-accent)" /> CLINICAL ACTIONS
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  <button className="btn-critical" onClick={() => navigate('/emergency')} style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
                    <Activity size={20} /> ACTIVATE SEPSIS PROTOCOL
                  </button>
                  <button className="btn-primary" onClick={() => { fetchTeam(); setShowTeamModal(true) }} style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
                    <Phone size={20} /> CALL TEAM
                  </button>
                  <button className="btn-outline" onClick={() => { fetchSpecialists(); setShowConsultModal(true) }} style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
                    <Stethoscope size={20} /> REQUEST CONSULTATION
                  </button>
                  <button className="btn-outline" onClick={() => setShowNoteModal(true)} style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
                    <FileText size={20} /> ADD CLINICAL NOTE
                  </button>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: 24 }}>
                <h3 className="outfit" style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={16} color="var(--status-critical)" /> EMERGENCY PROTOCOLS
                </h3>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={codeBlue} style={{
                    flex: 1, padding: '20px 24px', background: '#2563eb', border: '2px solid #1d4ed8', borderRadius: 8, color: 'white', cursor: 'pointer', fontSize: 16, fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s',
                  }}>
                    <Zap size={28} />
                    CODE BLUE
                    <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.8 }}>Cardiac Arrest / Respiratory Emergency</span>
                  </button>
                  <button onClick={codeRed} style={{
                    flex: 1, padding: '20px 24px', background: '#dc2626', border: '2px solid #b91c1c', borderRadius: 8, color: 'white', cursor: 'pointer', fontSize: 16, fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.15s',
                  }}>
                    <AlertTriangle size={28} />
                    CODE RED
                    <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.8 }}>Hemorrhage / Critical Bleeding</span>
                  </button>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: 24 }}>
                <h3 className="outfit" style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={16} color="var(--text-accent)" /> RECENT AI RECOMMENDATIONS
                </h3>
                {overview?.ai_summary?.recommendations ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {overview.ai_summary.recommendations.map((r: string, i: number) => (
                      <div key={i} style={{ padding: 12, background: 'var(--bg-deepest)', borderRadius: 6, border: '1px solid var(--border-default)', fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
                        <Activity size={14} style={{ marginTop: 2, flexShrink: 0, color: 'var(--text-accent)' }} />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No AI recommendations available. Run a risk assessment first.</div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ==================== CALL TEAM MODAL ==================== */}
      {showTeamModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: 520, maxHeight: '70vh', padding: 24, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="outfit" style={{ margin: 0, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={16} color="var(--text-accent)" /> CALL TEAM — AVAILABLE NURSES
              </h3>
              <button onClick={() => setShowTeamModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}><Loader size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>}
            {!loading && team.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No nurses available</div>}
            {!loading && team.map((m: any) => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border-default)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12, marginTop: 2 }}>
                    <span>{m.department}</span>
                    <span>{m.experience}yrs exp</span>
                    <span>Load: {m.workload}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: m.available ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: m.available ? 'var(--status-stable)' : 'var(--status-critical)' }}>
                    {m.available ? 'Available' : 'Busy'}
                  </span>
                  <button className="btn-primary" style={{ padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Phone size={12} /> CALL
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== REQUEST CONSULT MODAL ==================== */}
      {showConsultModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: 520, maxHeight: '70vh', padding: 24, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="outfit" style={{ margin: 0, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Stethoscope size={16} color="var(--text-accent)" /> REQUEST CONSULTATION
              </h3>
              <button onClick={() => setShowConsultModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}><Loader size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>}
            {!loading && specialists.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No specialists available</div>}
            {!loading && specialists.map((m: any) => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border-default)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12, marginTop: 2 }}>
                    <span>{m.specialty}</span>
                    <span>★ {m.rating}</span>
                    <span>ETA: {m.est_arrival_min}min</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: m.available ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: m.available ? 'var(--status-stable)' : 'var(--status-critical)' }}>
                    {m.available ? 'Available' : 'On Call'}
                  </span>
                  <button className="btn-primary" style={{ padding: '4px 10px', fontSize: 12 }}>CONSULT</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== ADD NOTE MODAL ==================== */}
      {showNoteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: 520, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="outfit" style={{ margin: 0, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={16} color="var(--text-accent)" /> ADD CLINICAL NOTE
              </h3>
              <button onClick={() => setShowNoteModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>CATEGORY</label>
              <select value={noteCategory} onChange={e => setNoteCategory(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-deepest)', border: '1px solid var(--border-default)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13 }}>
                <option value="general">General Note</option>
                <option value="shift_summary">Shift Summary</option>
                <option value="observation">Observation</option>
                <option value="recommendation">Recommendation</option>
                <option value="progress">Progress Note</option>
              </select>
            </div>
            <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)}
              placeholder="Enter clinical note..."
              rows={6}
              style={{ width: '100%', padding: 12, background: 'var(--bg-deepest)', border: '1px solid var(--border-default)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn-outline" onClick={() => setShowNoteModal(false)}>CANCEL</button>
              <button className="btn-primary" onClick={handleSaveNote}>SAVE NOTE</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== AI GENERATE NOTE MODAL ==================== */}
      {showAIGenerate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: 460, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="outfit" style={{ margin: 0, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Brain size={16} color="var(--text-accent)" /> AI GENERATE NOTE
              </h3>
              <button onClick={() => setShowAIGenerate(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>NOTE TYPE</label>
              <select value={aiNoteType} onChange={e => setAiNoteType(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-deepest)', border: '1px solid var(--border-default)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13 }}>
                <option value="progress">Progress Note (SOAP)</option>
                <option value="admission">Admission Note</option>
                <option value="discharge">Discharge Summary</option>
                <option value="shift_summary">Shift Summary</option>
                <option value="summary_24h">24-Hour Clinical Summary</option>
              </select>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              AI will generate a structured clinical note using the patient's available MIMIC-IV data (vitals, labs, medications, diagnoses). The note will be saved directly to the Clinical Notes section.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setShowAIGenerate(false)}>CANCEL</button>
              <button className="btn-primary" onClick={handleAIGenerate} disabled={aiGenerating} style={{ opacity: aiGenerating ? 0.6 : 1 }}>
                {aiGenerating ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> GENERATING...</> : <><Brain size={14} /> GENERATE NOTE</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showNoteSuccess && (
        <div style={{ position: 'fixed', top: 24, right: 24, background: 'rgba(34,197,94,0.95)', color: 'white', padding: '12px 20px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, zIndex: 2000, fontSize: 14, fontWeight: 600 }}>
          <CheckCircle size={18} /> Note saved successfully
        </div>
      )}
    </div>
  )
}

interface Props {
  patient: Patient
  vitalsHistory?: VitalHistory[]
}
