import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  intensity?: 'light' | 'medium' | 'heavy'
  hover?: boolean
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
}

export function GlassPanel({ children, intensity = 'medium', hover, onClick, className = '', style }: Props) {
  const intensityStyles: Record<string, React.CSSProperties> = {
    light: {
      background: 'rgba(17,17,24,0.5)',
      backdropFilter: 'blur(8px)',
    },
    medium: {
      background: 'rgba(17,17,24,0.8)',
      backdropFilter: 'blur(12px)',
    },
    heavy: {
      background: 'rgba(17,17,24,0.92)',
      backdropFilter: 'blur(16px)',
    },
  }

  return (
    <div
      onClick={onClick}
      className={`glass-panel ${className}`}
      style={{
        ...intensityStyles[intensity],
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        transition: 'all 0.15s ease',
        cursor: onClick ? 'pointer' : undefined,
        ...(hover ? {
          ':hover': {
            borderColor: 'rgba(255,255,255,0.1)',
            boxShadow: '0 6px 32px rgba(0,0,0,0.5)',
          },
        } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  )
}
