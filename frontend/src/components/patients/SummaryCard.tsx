import { useState, useEffect, useCallback } from 'react'
import type { ClinicalSummary, Patient } from '../../types'

interface Props {
  patient: Patient
}

const SUMMARY_CACHE_TTL = 300_000

export function SummaryCard({ patient }: Props) {
  const [summary, setSummary] = useState<ClinicalSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchSummary = useCallback(async () => {
    const cacheKey = `summary_${patient.stay_id}`
    try {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Date.now() - parsed.ts < SUMMARY_CACHE_TTL) {
          setSummary(parsed.data)
          return
        }
        sessionStorage.removeItem(cacheKey)
      }
    } catch {
      /* ignore cache read errors */
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/ai/summarize/${patient.stay_id}`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setSummary(data)
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data }))
      } catch {
        /* quota exceeded, ignore */
      }
    } catch {
      setError('Unable to generate summary')
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [patient.stay_id])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ height: 14, width: '60%', background: 'var(--bg-hover)', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
        <div style={{ height: 10, width: '40%', background: 'var(--bg-hover)', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
        <div style={{ height: 40, width: '100%', background: 'var(--bg-hover)', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
        <div style={{ height: 10, width: '80%', background: 'var(--bg-hover)', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div style={{ textAlign: 'center', padding: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{error || 'No summary available'}</div>
        <button onClick={fetchSummary} style={{
          background: 'var(--bg-hover)', border: '1px solid var(--border-default)',
          color: 'var(--text-accent)', padding: '6px 16px', borderRadius: 8,
          fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Retry
        </button>
      </div>
    )
  }

  const statusColor = summary.status?.toLowerCase().includes('critical') ? 'var(--status-critical)'
    : summary.status?.toLowerCase().includes('high') ? 'var(--status-high-risk)'
    : summary.status?.toLowerCase().includes('elevat') ? 'var(--status-elevated)'
    : summary.status?.toLowerCase().includes('observ') ? 'var(--status-observation)'
    : 'var(--status-stable)'

  const trendIcon = summary.stability_trend === 'Improving' ? '↑' : summary.stability_trend === 'Declining' ? '↓' : '→'
  const trendColor = summary.stability_trend === 'Improving' ? 'var(--status-stable)'
    : summary.stability_trend === 'Declining' ? 'var(--status-critical)'
    : 'var(--text-muted)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>AI Clinical Summary</span>
        <button onClick={fetchSummary} style={{
          background: 'transparent', border: 'none', color: 'var(--text-accent)',
          fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', padding: 0,
        }}>
          Refresh
        </button>
      </div>

      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
        {summary.one_liner}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{
          fontSize: 11, padding: '2px 8px', borderRadius: 6,
          background: `${statusColor}20`, color: statusColor,
          border: `1px solid ${statusColor}40`,
        }}>
          {summary.status}
        </span>
        <span style={{ fontSize: 14, color: trendColor, fontWeight: 700 }}>{trendIcon}</span>
        <span style={{ fontSize: 10, color: trendColor }}>{summary.stability_trend}</span>
      </div>

      {summary.key_changes.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Key Changes</div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: 'var(--text-muted)' }}>
            {summary.key_changes.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      {summary.risks.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Risks</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {summary.risks.map((r, i) => {
              const rc = r.severity === 'critical' ? 'var(--status-critical)' : r.severity === 'high' ? 'var(--status-high-risk)' : r.severity === 'medium' ? 'var(--status-elevated)' : 'var(--status-stable)'
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '4px 0', borderBottom: '1px solid var(--border-default)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{r.condition}</span>
                  <span style={{ color: rc }}>{r.severity}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        {summary.summary}
      </div>

      {summary.recommendations.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Recommendations</div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: 'var(--text-accent)' }}>
            {summary.recommendations.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
