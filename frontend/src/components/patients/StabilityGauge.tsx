import { useMemo } from 'react'

interface Props {
  score: number
  size?: 'large' | 'small'
}

export function StabilityGauge({ score, size = 'large' }: Props) {
  const dim = size === 'large' ? 120 : 40
  const strokeWidth = size === 'large' ? 8 : 4
  const radius = (dim - strokeWidth) / 2
  const circ = 2 * Math.PI * radius
  const offset = circ * (1 - Math.max(0, Math.min(score, 100)) / 100)
  const fontSize = size === 'large' ? 28 : 12
  const labelSize = size === 'large' ? 8 : 5

  const color = useMemo(() => {
    if (score >= 80) return 'var(--status-stable)'
    if (score >= 60) return 'var(--status-observation)'
    if (score >= 40) return 'var(--status-elevated)'
    if (score >= 20) return 'var(--status-high-risk)'
    return 'var(--status-critical)'
  }, [score])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
    }}>
      <svg width={dim} height={dim} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-elevated)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s' }}
        />
      </svg>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
      }}>
        {size === 'large' && (
          <>
            <div style={{
              fontSize, fontWeight: 700, color: 'var(--text-primary)',
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1,
            }}>
              {score}
            </div>
            <div style={{
              fontSize: labelSize, color: 'var(--text-muted)',
              letterSpacing: 1, textTransform: 'uppercase',
              marginTop: 2,
            }}>
              Stability
            </div>
          </>
        )}
        {size === 'small' && (
          <div style={{
            fontSize, fontWeight: 700, color: 'var(--text-primary)',
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 1,
          }}>
            {score}
          </div>
        )}
      </div>
    </div>
  )
}
