import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PatientDetail } from '../components/patients/PatientDetail'
import { useWebSocketContext } from '../contexts/WebSocketContext'
import type { Patient, VitalHistory } from '../types'

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { vitals } = useWebSocketContext()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [vitalsHistory, setVitalsHistory] = useState<VitalHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)

    Promise.all([
      fetch(`/api/patients/${id}`).then(r => r.json()),
      fetch(`/api/patients/${id}/vitals?hours=24`).then(r => r.json()),
    ])
      .then(([patientData, historyData]) => {
        setPatient(patientData)
        setVitalsHistory(historyData)
      })
      .catch(() => {
        navigate('/patients')
      })
      .finally(() => setLoading(false))
  }, [id, navigate])

  useEffect(() => {
    if (!id || !patient) return
    const updateKey = String(id)
    const updatedVitals = vitals[updateKey]
    if (!updatedVitals) return
    setPatient(prev => prev ? { ...prev, latest_vitals: updatedVitals } : prev)
  }, [vitals, id, patient])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading patient data...</div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
        Patient not found.
      </div>
    )
  }

  return (
    <PatientDetail patient={patient} vitalsHistory={vitalsHistory} />
  )
}
