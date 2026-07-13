import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Patient, StabilityCategory } from '../../types'

interface Props {
  patients: Patient[]
}

const PRIORITY: Record<StabilityCategory, number> = {
  critical: 0,
  high_risk: 1,
  elevated: 2,
  observation: 3,
  stable: 4,
}

const getStatusColor = (category: string) => {
  switch(category) {
    case 'critical': return 'var(--status-critical)'
    case 'high_risk': return 'var(--status-high-risk)'
    case 'elevated': return 'var(--status-elevated)'
    case 'observation': return 'var(--status-observation)'
    default: return 'var(--status-stable)'
  }
}

const getStatusLabel = (category: string) => {
  switch(category) {
    case 'critical': return 'CRITICAL'
    case 'high_risk': return 'HIGH RISK'
    case 'elevated': return 'ELEVATED'
    case 'observation': return 'OBSERVATION'
    default: return 'STABLE'
  }
}

export function PatientGrid({ patients }: Props) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const departmentFilter = useMemo(() => {
    const map: Record<string, string> = {
      'ALL': '',
      'ICU': 'Intensive Care Unit',
      'ER': 'Emergency',
      'CARDIOLOGY': 'Cardiac',
      'PEDIATRICS': 'Neuro',
      'GENERAL': 'Surgical',
      'MY PATIENTS': '',
    }
    return map[filter] || ''
  }, [filter])

  const sortedAndFiltered = useMemo(() => {
    return patients
      .filter(p => {
        if (search !== '' && !String(p.stay_id).includes(search) && !p.first_careunit.toLowerCase().includes(search.toLowerCase())) {
          return false
        }
        if (departmentFilter && !p.first_careunit.includes(departmentFilter)) {
          return false
        }
        return true
      })
      .sort((a, b) => {
        const pa = PRIORITY[a.stability_category] ?? 5
        const pb = PRIORITY[b.stability_category] ?? 5
        return pa - pb
      })
  }, [patients, search, departmentFilter])

  if (patients.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
        No patients in the current cohort.
      </div>
    )
  }

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, padding: '20px 24px', borderBottom: '1px solid var(--border-default)', overflowX: 'auto' }}>
        {['ALL', 'ICU', 'ER', 'CARDIOLOGY', 'PEDIATRICS', 'GENERAL', 'MY PATIENTS'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              background: filter === f ? 'var(--text-accent)' : 'rgba(255,255,255,0.05)',
              color: filter === f ? '#000' : 'var(--text-primary)',
              border: filter === f ? 'none' : '1px solid var(--border-default)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-default)' }}>
        <div style={{ position: 'relative', maxWidth: 600 }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by patient ID, name, or room..."
            style={{
              width: '100%',
              background: 'var(--bg-deepest)',
              border: '1px solid var(--border-default)',
              borderRadius: 6,
              padding: '8px 16px',
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
              transition: 'all 0.15s'
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-surface)', backdropFilter: 'blur(12px)', zIndex: 1 }}>
            <tr style={{ color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-default)' }}>
              <th style={{ padding: '16px 24px', fontWeight: 600, width: '10%' }}>ID</th>
              <th style={{ padding: '16px 24px', fontWeight: 600, width: '20%' }}>Patient</th>
              <th style={{ padding: '16px 24px', fontWeight: 600, width: '10%' }}>Dept</th>
              <th style={{ padding: '16px 24px', fontWeight: 600, width: '10%' }}>Diagnosis</th>
              <th style={{ padding: '16px 24px', fontWeight: 600, width: '10%' }}>Status</th>
              <th style={{ padding: '16px 24px', fontWeight: 600, width: '15%' }}>Vitals</th>
              <th style={{ padding: '16px 24px', fontWeight: 600, width: '25%' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFiltered.map(p => (
              <tr 
                key={p.stay_id} 
                style={{ 
                  borderBottom: '1px solid rgba(255,255,255,0.02)',
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <td className="mono" style={{ padding: '16px 24px' }}>{p.subject_id}</td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4, cursor: 'pointer' }} onClick={() => navigate(`/patients/${p.stay_id}`)}>
                    Patient {p.subject_id}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.age}y {p.gender} • Stay #{p.stay_id}</div>
                </td>
                <td style={{ padding: '16px 24px', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {(p.first_careunit || '').replace('Intensive Care Unit', 'ICU').replace('Surgical', 'Surg').replace('Medical', 'Med').split('(')[0].trim()}
                </td>
                <td style={{ padding: '16px 24px', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.admission_diagnosis || '—'}
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <span style={{ 
                    color: getStatusColor(p.stability_category),
                    fontWeight: 700,
                    background: `rgba(${p.stability_category === 'critical' ? '255,59,48' : p.stability_category === 'high_risk' ? '255,149,0' : '52,199,89'}, 0.1)`,
                    padding: '4px 8px',
                    borderRadius: 8,
                    fontSize: 12
                  }}>
                    {getStatusLabel(p.stability_category)}
                  </span>
                </td>
                <td style={{ padding: '16px 24px', fontSize: 13, lineHeight: '1.4' }}>
                  <span style={{ color: (p.latest_vitals?.heart_rate ?? 0) > 100 ? 'var(--status-critical)' : 'inherit' }}>
                    HR: {p.latest_vitals?.heart_rate != null ? p.latest_vitals.heart_rate : '--'}
                  </span><br/>
                  BP: {p.latest_vitals?.sbp != null ? p.latest_vitals.sbp : '--'}/{p.latest_vitals?.dbp != null ? p.latest_vitals.dbp : '--'}<br/>
                  O2: {p.latest_vitals?.spo2 != null ? p.latest_vitals.spo2 : '--'}%
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => navigate(`/patients/${p.stay_id}`)} className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>VIEW</button>
                    <button onClick={() => { fetch('/api/emergency/trigger', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({patient_id: String(p.stay_id), stay_id: p.stay_id, type: 'CODE_BLUE'}) }).then(() => navigate('/emergency')); }} style={{ padding: '6px 12px', fontSize: 12, background: '#2563eb', border: '1px solid #1d4ed8', color: 'white', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>CODE BLUE</button>
                    <button onClick={() => { fetch('/api/emergency/trigger', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({patient_id: String(p.stay_id), stay_id: p.stay_id, type: 'CODE_RED'}) }).then(() => navigate('/emergency')); }} style={{ padding: '6px 12px', fontSize: 12, background: '#dc2626', border: '1px solid #b91c1c', color: 'white', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>CODE RED</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border-default)', fontSize: 12, color: 'var(--text-muted)' }}>
        Showing {sortedAndFiltered.length} patients
      </div>
    </div>
  )
}
