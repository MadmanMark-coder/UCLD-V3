import { useState, useEffect, useCallback, useRef } from 'react'
import { useWebSocketContext } from '../contexts/WebSocketContext'
import type { Alert } from '../types'

export function useAlerts() {
  const { alerts: liveAlerts, acknowledgeAlert: wsAck } = useWebSocketContext()
  const [alertList, setAlertList] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const seenIds = useRef(new Set<string>())

  const fetchAlerts = useCallback(async (filters?: { patient_id?: string; severity?: string; acknowledged?: boolean; limit?: number }) => {
    try {
      const params = new URLSearchParams()
      if (filters?.patient_id) params.set('patient_id', filters.patient_id)
      if (filters?.severity) params.set('severity', filters.severity)
      if (filters?.acknowledged != null) params.set('acknowledged', String(filters.acknowledged))
      if (filters?.limit) params.set('limit', String(filters.limit))

      const url = `/api/alerts${params.toString() ? '?' + params.toString() : ''}`
      const res = await fetch(url)
      const data = await res.json()
      for (const a of data) seenIds.current.add(a.id)
      setAlertList(data)
    } catch {
      // keep existing
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  useEffect(() => {
    if (liveAlerts.length === 0) return
    setAlertList(prev => {
      const existing = new Set(prev.map(a => a.id))
      const newOnes = liveAlerts.filter(a => !existing.has(a.id) && !seenIds.current.has(a.id))
      if (newOnes.length === 0) return prev
      for (const a of newOnes) seenIds.current.add(a.id)
      return [...newOnes, ...prev].slice(0, 200)
    })
  }, [liveAlerts])

  const acknowledgeAlert = useCallback(async (id: string) => {
    try {
      await fetch(`/api/alerts/${id}/acknowledge`, { method: 'POST' })
      setAlertList(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a))
    } catch {
      wsAck(id)
    }
  }, [wsAck])

  const acknowledgeAll = useCallback(async () => {
    const unacked = alertList.filter(a => !a.acknowledged).map(a => a.id)
    if (unacked.length === 0) return
    try {
      await fetch('/api/alerts/acknowledge/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: unacked }),
      })
      setAlertList(prev => prev.map(a => a.acknowledged ? a : { ...a, acknowledged: true }))
    } catch {
      for (const id of unacked) wsAck(id)
    }
  }, [alertList, wsAck])

  const unacknowledgedCount = alertList.filter(a => !a.acknowledged).length

  return {
    alerts: alertList,
    unacknowledgedCount,
    loading,
    fetchAlerts,
    acknowledgeAlert,
    acknowledgeAll,
  }
}
