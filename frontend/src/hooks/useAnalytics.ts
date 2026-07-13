import { useState, useEffect, useCallback } from 'react'

interface KPI {
  value: number
  trend: 'up' | 'down' | 'stable'
}

interface KPIData {
  avg_stability: KPI
  active_alerts: KPI
  bed_occupancy: KPI
  equip_utilization: KPI
}

interface TrendsData {
  timestamps: string[]
  avg_stability: number[]
  alert_count: number[]
  occupancy: number[]
  utilization: number[]
}

interface CapacityData {
  current_occupancy: number
  projected_1h: number
  projected_2h: number
  projected_4h: number
  alert: string
}

interface UseAnalyticsReturn {
  kpi: KPIData | null
  trends: TrendsData | null
  capacity: CapacityData | null
  loading: boolean
  error: string | null
  refresh: () => void
}

const BASE = '/api/analytics'

export function useAnalytics(refreshInterval = 30000): UseAnalyticsReturn {
  const [kpi, setKpi] = useState<KPIData | null>(null)
  const [trends, setTrends] = useState<TrendsData | null>(null)
  const [capacity, setCapacity] = useState<CapacityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [kpiRes, trendsRes, capRes] = await Promise.all([
        fetch(`${BASE}/kpi`),
        fetch(`${BASE}/trends?hours=24`),
        fetch(`${BASE}/capacity`),
      ])
      if (!kpiRes.ok || !trendsRes.ok || !capRes.ok) {
        throw new Error('Analytics API error')
      }
      setKpi(await kpiRes.json())
      setTrends(await trendsRes.json())
      setCapacity(await capRes.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll, tick])

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  const refresh = useCallback(() => {
    setTick(t => t + 1)
  }, [])

  return { kpi, trends, capacity, loading, error, refresh }
}
