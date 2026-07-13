import { useState, useEffect, useCallback } from 'react'
import { useWebSocketContext } from '../contexts/WebSocketContext'
import type { RiskAnalysis } from '../types'

export function useRiskData(patientId: string | number) {
  const { vitals } = useWebSocketContext()
  const [riskData, setRiskData] = useState<RiskAnalysis | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchRiskData = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${patientId}`)
      if (!res.ok) throw new Error('Not found')
      const data = await res.json()
      if (data.risk_analysis) {
        setRiskData(data.risk_analysis)
      }
    } catch {
      // keep existing
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchRiskData()
  }, [fetchRiskData])

  useEffect(() => {
    if (!vitals[String(patientId)]) return
    fetchRiskData()
  }, [vitals, patientId, fetchRiskData])

  return { riskData, loading, refresh: fetchRiskData }
}
