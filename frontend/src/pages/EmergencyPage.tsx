import { useEffect } from 'react'
import { useEmergency } from '../hooks/useEmergency'
import { CommandCenter } from '../components/emergency/CommandCenter'
import { useWebSocketContext } from '../contexts/WebSocketContext'

export function EmergencyPage() {
  const { incidents, loading, selectIncident, resolveIncident, selectedIncident, setSelectedIncident } = useEmergency()
  const { emergency: liveEmergency } = useWebSocketContext()

  useEffect(() => {
    if (liveEmergency) {
      setSelectedIncident(liveEmergency)
    }
  }, [liveEmergency, setSelectedIncident])

  if (selectedIncident) {
    return (
      <CommandCenter
        incident={selectedIncident}
        onResolve={resolveIncident}
        onClose={() => setSelectedIncident(null)}
      />
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading incidents...</div>
      </div>
    )
  }

  if (incidents.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--status-stable)20',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: 28,
        }}>
          ✓
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>
          No Active Emergencies
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
          All patients are stable. The emergency command center will activate automatically when a critical alert is triggered.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>
        Emergency Command Center
      </h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {incidents.map(inc => {
          const sevColor = inc.status === 'resolved' ? 'var(--status-stable)'
            : inc.type === 'pattern' ? 'var(--status-critical)'
            : 'var(--status-elevated)'
          return (
            <div
              key={inc.id}
              onClick={() => selectIncident(inc.id)}
              style={{
                background: 'var(--bg-surface)',
                borderRadius: 12,
                border: `1px solid ${sevColor}40`,
                padding: 16,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = sevColor; e.currentTarget.style.boxShadow = 'var(--glow-red)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = `${sevColor}40`; e.currentTarget.style.boxShadow = 'none' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Patient #{inc.patient_id}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {inc.type?.replace(/_/g, ' ')} · Detected {new Date(inc.detected_at).toLocaleTimeString()}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 6,
                    background: `${sevColor}20`, color: sevColor,
                    textTransform: 'capitalize',
                  }}>
                    {inc.status}
                  </span>
                  <span style={{ color: 'var(--text-accent)', fontSize: 16 }}>→</span>
                </div>
              </div>
              {inc.summary && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
                  {inc.summary}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
