import { useState, useEffect, useCallback } from 'react'
import { PatientGrid } from '../components/patients/PatientGrid'
import { useWebSocketContext } from '../contexts/WebSocketContext'
import type { Patient } from '../types'

export function PatientsPage() {
  const { vitals, patientCount } = useWebSocketContext()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch('/api/patients')
      const data = await res.json()
      setPatients(data)
    } catch {
      // keep existing data
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPatients()
  }, [fetchPatients, patientCount])

  useEffect(() => {
    setPatients(prev => prev.map(p => {
      const updateKey = String(p.stay_id)
      const updatedVitals = vitals[updateKey]
      if (!updatedVitals) return p
      return { ...p, latest_vitals: updatedVitals }
    }))
  }, [vitals])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 24 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Patient Monitoring
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            {patientCount} patients in current cohort
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{
          flex: 1,
          background: 'var(--bg-surface)',
          borderRadius: 14,
          border: '1px solid var(--border-default)',
          animation: 'pulse 1.5s infinite',
        }} />
      ) : (
        <div style={{ flex: 1, minHeight: 0 }}>
          <PatientGrid patients={patients} />
        </div>
      )}
    </div>
  )
}
