import { useState, useEffect, useCallback } from 'react'
import { useWebSocketContext } from '../contexts/WebSocketContext'
import type { EmergencyIncident, EmergencyKit } from '../types'

export function useEmergency() {
  const { emergency: liveEmergency } = useWebSocketContext()
  const [incidents, setIncidents] = useState<EmergencyIncident[]>([])
  const [selectedIncident, setSelectedIncident] = useState<EmergencyIncident | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch('/api/emergency')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setIncidents(data)
    } catch {
      // keep existing
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIncidents()
  }, [fetchIncidents])

  useEffect(() => {
    if (liveEmergency) {
      setIncidents(prev => {
        const exists = prev.find(i => i.id === liveEmergency.id)
        if (exists) return prev
        return [liveEmergency as unknown as EmergencyIncident, ...prev]
      })
    }
  }, [liveEmergency])

  const selectIncident = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/emergency/${id}`)
      if (!res.ok) throw new Error('Not found')
      const data = await res.json()
      setSelectedIncident(data)
    } catch {
      setSelectedIncident(null)
    }
  }, [])

  const resolveIncident = useCallback(async (id: string) => {
    try {
      await fetch(`/api/emergency/${id}/resolve`, { method: 'POST' })
      setIncidents(prev => prev.filter(i => i.id !== id))
      setSelectedIncident(null)
    } catch {
      // keep existing
    }
  }, [])

  const fetchKit = useCallback(async (id: string): Promise<EmergencyKit | null> => {
    try {
      const res = await fetch(`/api/emergency/${id}/kit`)
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  }, [])

  return {
    incidents, selectedIncident, loading,
    fetchIncidents, selectIncident, resolveIncident, fetchKit,
    setSelectedIncident,
  }
}
