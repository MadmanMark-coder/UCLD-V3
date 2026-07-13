import { useEffect, useState } from 'react'

interface Props {
  value: number
  size?: 'small' | 'medium' | 'large'
  strokeWidth?: number
  color?: string
  label?: string
  showValue?: boolean
}

const SIZE_MAP: Record<string, number> = { small: 40, medium: 80, large: 120 }
const STROKE_WIDTH: Record<string, number> = { small: 6, medium: 8, large: 10 }

function valueColor(value: number): string {
  if (value >= 80) return 'var(--status-stable)'
  if (value >= 60) return 'var(--status-elevated)'
  if (value >= 40) return 'var(--status-high-risk)'
  return 'var(--status-critical)'
}

export function Gauge({ value, size = 'medium', strokeWidth, color, label, showValue = true }: Props) {
  const [animatedValue, setAnimatedValue] = useState(0)
  const dim = SIZE_MAP[size]
  const sw = strokeWidth ?? STROKE_WIDTH[size]
  const radius = (dim - sw) / 2
  const circumference = 2 * Math.PI * radius
  const fillColor = color ?? valueColor(value)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimatedValue(value))
    return () => cancelAnimationFrame(raf)
  }, [value])

  const offset = circumference - (animatedValue / 100) * circumference

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      width: dim, fontFamily: "'JetBrains Mono', monospace",
    }}>
      <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`}>
        <circle
          cx={dim / 2} cy={dim / 2} r={radius}
          fill="none" stroke="var(--bg-elevated)" strokeWidth={sw}
        />
        <circle
          cx={dim / 2} cy={dim / 2} r={radius}
          fill="none" stroke={fillColor} strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${dim / 2} ${dim / 2})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
        />
        {showValue && (
          <text
            x={dim / 2} y={dim / 2 + 2}
            textAnchor="middle" dominantBaseline="central"
            fill="var(--text-primary)" fontSize={dim * 0.22} fontWeight={700}
          >
            {Math.round(animatedValue)}
          </text>
        )}
      </svg>
      {label && (
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, textAlign: 'center' }}>
          {label}
        </span>
      )}
    </div>
  )
}
