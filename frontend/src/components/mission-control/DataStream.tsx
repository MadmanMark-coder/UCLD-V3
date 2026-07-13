import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Patient, VitalSigns } from '../../types'

interface Props {
  patients: Patient[]
  vitals: Record<string, VitalSigns>
}

const VITAL_COLOR = (val: number | undefined, low: number, high: number): string => {
  if (val === undefined) return 'var(--text-muted)'
  if (val <= low || val >= high) return 'var(--status-critical)'
  if (val <= low + 5 || val >= high - 5) return 'var(--status-elevated)'
  return 'var(--status-stable)'
}

export function DataStream({ patients, vitals }: Props) {
  const navigate = useNavigate()
  const [paused, setPaused] = useState(false)
  const [prevVitals, setPrevVitals] = useState<Record<string, VitalSigns>>({})
  const [flashingRows, setFlashingRows] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const changed: string[] = []
    for (const sid of Object.keys(vitals)) {
      const prev = prevVitals[sid]
      const curr = vitals[sid]
      if (prev && curr) {
        for (const key of ['heart_rate', 'sbp', 'spo2', 'resp_rate'] as const) {
          if (prev[key] !== curr[key]) {
            changed.push(sid)
            break
          }
        }
      }
    }
    if (changed.length > 0) {
      setFlashingRows(new Set(changed))
      const timer = setTimeout(() => setFlashingRows(new Set()), 300)
      setPrevVitals(vitals)
      return () => clearTimeout(timer)
    }
    setPrevVitals(vitals)
  }, [vitals])

  useEffect(() => {
    if (paused) {
      if (scrollRef.current) clearInterval(scrollRef.current)
      return
    }
    scrollRef.current = setInterval(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop += 1
      }
    }, 100)
    return () => {
      if (scrollRef.current) clearInterval(scrollRef.current)
    }
  }, [paused])

  const sorted = [...patients].sort((a, b) => {
    const order = { critical: 0, high_risk: 1, elevated: 2, observation: 3, stable: 4 }
    return (order[a.stability_category] ?? 5) - (order[b.stability_category] ?? 5)
  })

  return (
    <div style={{
      flex: 1, minWidth: 280,
      display: 'flex', flexDirection: 'column',
      borderRadius: 12, border: '1px solid var(--border-default)',
      background: 'var(--bg-deepest)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 12px', borderBottom: '1px solid var(--border-default)',
        fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
      }}>
        <span>LIVE DATA STREAM</span>
        <button
          onClick={() => setPaused(p => !p)}
          style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
            borderRadius: 4, padding: '2px 8px', fontSize: 10,
            color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {paused ? '▶ Resume' : '❚❚ Pause'}
        </button>
      </div>

      <div
        ref={containerRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        style={{ flex: 1, overflow: 'hidden', position: 'relative' }}
      >
        {sorted.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            No patients in cohort
          </div>
        ) : (
          <div style={{ animation: paused ? 'none' : 'scroll-up 30s linear infinite' }}>
            {sorted.map(p => {
              const v = vitals[String(p.stay_id)] || {} as VitalSigns
              const flash = flashingRows.has(String(p.stay_id))
              return (
                <div
                  key={p.stay_id}
                  onClick={() => navigate(`/patients/${p.stay_id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 12px', cursor: 'pointer',
                    background: flash
                      ? p.stability_category === 'critical' || p.stability_category === 'high_risk'
                        ? 'rgba(239,68,68,0.08)'
                        : 'rgba(34,197,94,0.08)'
                      : 'transparent',
                    transition: 'background 0.3s ease',
                    borderBottom: '1px solid var(--border-default)',
                  }}
                >
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: COLOR_MAP[p.stability_category] || 'var(--text-muted)',
                  }} />
                  <span style={{
                    fontSize: 12, fontWeight: 600, color: 'var(--text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    width: 90, flexShrink: 0,
                  }}>
                    P{String(p.subject_id).slice(-4)}
                  </span>
                  <span style={{
                    fontSize: 11, fontFamily: "'JetBrains Mono', monospace", flex: 1,
                    display: 'flex', gap: 6, justifyContent: 'flex-end',
                  }}>
                    <span style={{ color: VITAL_COLOR(v.heart_rate, 45, 130) }}>HR {v.heart_rate ?? '—'}</span>
                    <span style={{ color: VITAL_COLOR(v.sbp, 80, 200) }}>BP {v.sbp ?? '—'}/{v.dbp ?? '—'}</span>
                    <span style={{ color: VITAL_COLOR(v.spo2, 90, 100) }}>SpO₂ {v.spo2 ?? '—'}</span>
                    <span style={{ color: VITAL_COLOR(v.resp_rate, 8, 30) }}>RR {v.resp_rate ?? '—'}</span>
                  </span>
                  <span style={{
                    fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                    color: COLOR_MAP[p.stability_category] || 'var(--text-muted)',
                    minWidth: 28, textAlign: 'right',
                  }}>
                    {p.stability_score ?? 80}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const COLOR_MAP: Record<string, string> = {
  critical: 'var(--status-critical)',
  high_risk: 'var(--status-elevated)',
  elevated: 'var(--status-elevated)',
  observation: 'var(--alert-info)',
  stable: 'var(--status-stable)',
}
