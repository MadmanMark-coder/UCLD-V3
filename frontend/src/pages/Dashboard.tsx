import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWebSocketContext } from '../contexts/WebSocketContext'
import {
  PatientStatusCard,
  LiveMonitoringFeedCard,
  BedOccupancyCard,
  EmergencyStatusCard,
  AIChatCard,
  ResourceSummaryCard,
  RiskTrendsCard,
  DigitalTwinMiniCard
} from '../components/dashboard/DashboardCards'
import type { Patient } from '../types'

export function Dashboard() {
  const navigate = useNavigate()
  const { patientCount, alerts: wsAlerts } = useWebSocketContext()
  const [patients, setPatients] = useState<Patient[]>([])
  const [stats, setStats] = useState<any>(null)
  const [feedEvents, setFeedEvents] = useState<any[]>([])
  const [equipmentList, setEquipmentList] = useState<any[]>([])
  const [emergencyStatus, setEmergencyStatus] = useState<any>(null)

  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch('/api/patients')
      const data = await res.json()
      setPatients(data)
    } catch {}
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/stats')
      const data = await res.json()
      setStats(data)
    } catch {}
  }, [])

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/feed')
      const data = await res.json()
      setFeedEvents(data)
    } catch {}
  }, [])

  const fetchEquipment = useCallback(async () => {
    try {
      const res = await fetch('/api/equipment')
      const data = await res.json()
      setEquipmentList(data)
    } catch {}
  }, [])

  const fetchEmergencyStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/emergency/status')
      const data = await res.json()
      setEmergencyStatus(data)
    } catch {}
  }, [])

  useEffect(() => {
    fetchPatients()
    fetchStats()
    fetchFeed()
    fetchEquipment()
    fetchEmergencyStatus()
    const interval = setInterval(() => { fetchFeed(); fetchStats(); fetchEmergencyStatus() }, 15000)
    return () => clearInterval(interval)
  }, [fetchPatients, fetchStats, fetchFeed, fetchEquipment, fetchEmergencyStatus, patientCount])

  const critical = patients.filter(p => p.stability_category === 'critical').length
  const highRisk = patients.filter(p => p.stability_category === 'high_risk' || p.stability_category === 'elevated').length
  const stable = patients.filter(p => p.stability_category === 'stable' || p.stability_category === 'observation').length

  // Compute department breakdown from real patients
  const deptMap = new Map<string, { alerting: number; stable: number }>()
  for (const p of patients) {
    const dept = p.first_careunit?.split('(')[0]?.trim() || 'Unknown'
    const entry = deptMap.get(dept) || { alerting: 0, stable: 0 }
    if (p.stability_category === 'critical' || p.stability_category === 'high_risk') {
      entry.alerting++
    } else {
      entry.stable++
    }
    deptMap.set(dept, entry)
  }
  const departmentStats = Array.from(deptMap.entries()).map(([name, s]) => ({ name, ...s }))
  while (departmentStats.length < 4) {
    departmentStats.push({ name: ['ICU','ER','MED','SURG'][departmentStats.length], alerting: 0, stable: 0 })
  }

  // Bed data from real stats
  const bedData = departmentStats.map(d => ({
    department: d.name,
    occupied: d.alerting + d.stable,
    available: Math.max(1, Math.round((d.alerting + d.stable) * 0.3)),
  }))

  // Equipment data from real API
  const equipTypes = ['ventilator', 'defibrillator', 'infusion_pump', 'wheelchair']
  const equipmentData = equipTypes.map(t => {
    const items = equipmentList.filter((e: any) => e.type === t)
    const available = items.filter((e: any) => e.status === 'available').length
    return { name: t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ') + 's', availability: items.length > 0 ? Math.round(available / items.length * 100) : 0 }
  })

  const handleCodeBlue = async () => {
    try {
      await fetch('/api/emergency/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stay_id: 0, code_type: 'blue' }),
      })
      fetchEmergencyStatus()
    } catch {}
    navigate('/emergency')
  }

  const handleCodeRed = async () => {
    try {
      await fetch('/api/emergency/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stay_id: 0, code_type: 'red' }),
      })
      fetchEmergencyStatus()
    } catch {}
    navigate('/emergency')
  }
  const handleAIMessage = (msg: string) => {}

  return (
    <div style={{ padding: '8px 8px 32px 8px', height: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 24 }}>
            <div className="glass-panel" style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 1 }}>TOTAL PATIENTS</span>
              <span className="outfit" style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)' }}>{stats?.current_cohort?.total || patients.length || patientCount}</span>
            </div>
            <div className="glass-panel" style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 4, background: 'linear-gradient(180deg, rgba(15,15,25,0.6), rgba(255,59,48,0.05))' }}>
              <span style={{ fontSize: 12, color: 'var(--status-critical)', fontWeight: 600, letterSpacing: 1 }}>CRITICAL</span>
              <span className="outfit" style={{ fontSize: 32, fontWeight: 700, color: 'var(--status-critical)' }}>{stats?.current_cohort?.critical ?? critical}</span>
            </div>
            <div className="glass-panel" style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 4, background: 'linear-gradient(180deg, rgba(15,15,25,0.6), rgba(255,149,0,0.05))' }}>
              <span style={{ fontSize: 12, color: 'var(--status-high-risk)', fontWeight: 600, letterSpacing: 1 }}>HIGH RISK</span>
              <span className="outfit" style={{ fontSize: 32, fontWeight: 700, color: 'var(--status-high-risk)' }}>{(stats?.current_cohort?.high_risk ?? 0) + (stats?.current_cohort?.elevated ?? 0) || highRisk}</span>
            </div>
            <div className="glass-panel" style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 4, background: 'linear-gradient(180deg, rgba(15,15,25,0.6), rgba(52,199,89,0.05))' }}>
              <span style={{ fontSize: 12, color: 'var(--status-stable)', fontWeight: 600, letterSpacing: 1 }}>STABLE</span>
              <span className="outfit" style={{ fontSize: 32, fontWeight: 700, color: 'var(--status-stable)' }}>{(stats?.current_cohort?.stable ?? 0) + (stats?.current_cohort?.observation ?? 0) || stable}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <span style={{ fontSize: 14, color: 'var(--text-accent)', fontWeight: 600, background: 'rgba(0,229,255,0.1)', padding: '6px 16px', borderRadius: 20 }}>
              Live Dashboard
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Replay: {patients.length} patients</span>
          </div>

          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>BED OCCUPANCY</span>
              <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{Math.round((bedData.reduce((s,b) => s + b.occupied, 0) / Math.max(1, bedData.reduce((s,b) => s + b.occupied + b.available, 0))) * 100)}%</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>ALERTS</span>
              <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-accent)' }}>{wsAlerts.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>EQUIPMENT READY</span>
              <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-accent)' }}>{equipmentData.length > 0 ? Math.round(equipmentData.reduce((s,e) => s + e.availability, 0) / equipmentData.length) : 0}%</span>
            </div>
          </div>
        </div>

      {/* Main Dashboard Grid */}
      <div style={{ 
        flex: 1, 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: 'repeat(2, minmax(300px, 1fr))',
        gap: 20,
        height: 'calc(100% - 100px)'
      }}>
        <div style={{ gridColumn: 'span 1' }}>
          <PatientStatusCard patients={patients} />
        </div>
        <div style={{ gridColumn: 'span 1' }}>
          <LiveMonitoringFeedCard alerts={feedEvents.length > 0
            ? feedEvents.map((e: any, i: number) => ({
                id: `feed-${i}`,
                severity: e.severity || 'info',
                generated_at: e.timestamp || new Date().toISOString(),
                title: e.type?.replace(/_/g, ' ') || '',
                description: e.message || '',
              }))
            : wsAlerts} />
        </div>
        <div style={{ gridColumn: 'span 1' }}>
          <BedOccupancyCard beds={bedData} />
        </div>
        <div style={{ gridColumn: 'span 1' }}>
          <EmergencyStatusCard hasEmergency={emergencyStatus?.has_active_emergency ?? false}
            onCodeBlue={handleCodeBlue} onCodeRed={handleCodeRed}
            activeCodes={emergencyStatus?.active_codes ?? []}
            lastEmergency={emergencyStatus?.last_emergency}
            equipReadiness={emergencyStatus?.equipment_readiness_pct ?? 0}
            availableBeds={emergencyStatus?.available_beds ?? 0}
            criticalCount={emergencyStatus?.critical_patients ?? 0} />
        </div>
        <div style={{ gridColumn: 'span 1' }}>
          <AIChatCard onSendMessage={handleAIMessage} />
        </div>
        <div style={{ gridColumn: 'span 1' }}>
          <ResourceSummaryCard equipment={equipmentData} />
        </div>
        <div style={{ gridColumn: 'span 1' }}>
          <RiskTrendsCard riskHistory={[]} />
        </div>
        <div style={{ gridColumn: 'span 1' }}>
          <DigitalTwinMiniCard departmentStats={departmentStats} />
        </div>
      </div>
    </div>
  )
}
